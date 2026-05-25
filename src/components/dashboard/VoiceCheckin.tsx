"use client";

import { useState, useRef, useCallback } from "react";
import { Mic, MicOff, Loader2, X, Sparkles, Check } from "lucide-react";
import type { Plan } from "@/types";

interface Props {
  habitId: string;
  habitName: string;
  habitLogId: string | null;
  tier: Plan;
  onCoachingReceived?: (text: string) => void;
}

type Stage = "idle" | "recording" | "processing" | "done" | "error" | "unsupported";

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((event: { results: { isFinal: boolean; [n: number]: { transcript: string } }[] }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void | Promise<void>) | null;
  start: () => void;
  stop: () => void;
};

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionLike;
    webkitSpeechRecognition: new () => SpeechRecognitionLike;
  }
}

export default function VoiceCheckin({ habitId, habitName, habitLogId, tier, onCoachingReceived }: Props) {
  const isPro = tier === "pro";

  const [stage, setStage]           = useState<Stage>("idle");
  const [transcript, setTranscript] = useState("");
  const [coaching, setCoaching]     = useState<string | null>(null);
  const [expanded, setExpanded]     = useState(false);
  const recognitionRef              = useRef<SpeechRecognitionLike | null>(null);

  const startRecording = useCallback(() => {
    const SR = (typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition));
    if (!SR) { setStage("unsupported"); return; }

    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let final = "";
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) final += event.results[i][0].transcript + " ";
      }
      if (final.trim()) setTranscript(final.trim());
    };

    recognition.onerror = () => setStage("error");

    recognition.onend = async () => {
      const text = transcript || "";
      if (!text.trim()) { setStage("idle"); return; }
      setStage("processing");
      try {
        const res = await fetch("/api/voice-checkin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ habitId, habitLogId, habitName, transcript: text }),
        });
        const data = await res.json();
        if (res.ok && data.coaching) {
          setCoaching(data.coaching);
          onCoachingReceived?.(data.coaching);
        }
        setStage("done");
      } catch {
        setStage("error");
      }
    };

    recognitionRef.current = recognition;
    setStage("recording");
    setTranscript("");
    setCoaching(null);

    // Auto-stop after 30 seconds
    recognition.start();
    setTimeout(() => { try { recognition.stop(); } catch { /* already stopped */ } }, 30000);
  }, [habitId, habitLogId, habitName, transcript, onCoachingReceived]);

  const stopRecording = () => {
    try { recognitionRef.current?.stop(); } catch { /* ignore */ }
  };

  if (!isPro && stage === "idle") {
    return null; // Only show for Pro users
  }

  if (stage === "unsupported") {
    return (
      <p className="text-[10px] text-slate-600 mt-1.5">Voice check-ins not supported in this browser.</p>
    );
  }

  if (!expanded && stage === "idle") {
    return (
      <button
        onClick={() => { if (isPro) { setExpanded(true); startRecording(); } }}
        className="flex items-center gap-1.5 text-[11px] text-violet-400/60 hover:text-violet-300 transition-colors mt-1"
        title="Voice check-in (Pro)"
      >
        <Mic className="w-3 h-3" />
        <span>Voice note</span>
      </button>
    );
  }

  return (
    <div className="mt-2 bg-violet-950/30 border border-violet-800/25 rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Mic className={`w-3.5 h-3.5 ${stage === "recording" ? "text-red-400 animate-pulse" : "text-violet-400"}`} />
          <span className="text-[11px] font-semibold text-violet-300">
            {stage === "recording"  ? "Recording… (tap stop when done)" :
             stage === "processing" ? "Analysing…" :
             stage === "done"       ? "Check-in saved" :
             stage === "error"      ? "Something went wrong" : "Voice note"}
          </span>
        </div>
        <button onClick={() => { stopRecording(); setStage("idle"); setExpanded(false); }} className="text-slate-600 hover:text-slate-400">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {stage === "recording" && (
        <div className="space-y-2">
          {transcript && <p className="text-xs text-slate-400 italic leading-relaxed">&ldquo;{transcript}&rdquo;</p>}
          <div className="flex items-center gap-1 py-1">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="w-1 bg-red-400 rounded-full flex-1"
                style={{ height: `${8 + Math.sin(i * 0.7 + Date.now() / 200) * 6}px`, animation: `pulse ${0.5 + i * 0.05}s ease-in-out infinite alternate` }}
              />
            ))}
          </div>
          <button
            onClick={stopRecording}
            className="w-full py-2 bg-red-500/20 border border-red-500/30 text-red-300 text-xs font-semibold rounded-xl hover:bg-red-500/30 transition-all flex items-center justify-center gap-1.5"
          >
            <MicOff className="w-3.5 h-3.5" /> Stop recording
          </button>
        </div>
      )}

      {stage === "processing" && (
        <div className="flex items-center justify-center gap-2 py-3">
          <Loader2 className="w-4 h-4 text-violet-500 animate-spin" />
          <span className="text-xs text-slate-500">Getting AI coaching…</span>
        </div>
      )}

      {stage === "done" && (
        <div className="space-y-2">
          {transcript && (
            <p className="text-[11px] text-slate-500 italic leading-relaxed border-l-2 border-violet-800/40 pl-2">&ldquo;{transcript}&rdquo;</p>
          )}
          {coaching && (
            <div className="bg-violet-950/40 border border-violet-700/20 rounded-xl p-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <Sparkles className="w-3 h-3 text-violet-400" />
                <span className="text-[10px] font-bold text-violet-400 uppercase tracking-wider">AI Coach</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{coaching}</p>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-[10px] text-emerald-400">
            <Check className="w-3 h-3" /><span>Voice note saved</span>
          </div>
        </div>
      )}

      {stage === "error" && (
        <div className="space-y-2">
          <p className="text-xs text-red-400">Recording failed. Please try again.</p>
          <button onClick={() => { setStage("idle"); startRecording(); }}
            className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
