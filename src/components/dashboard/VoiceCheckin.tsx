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
  // Ref to avoid stale closure in onend callback
  const transcriptRef               = useRef("");

  const startRecording = useCallback(() => {
    const SR = (typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition));
    if (!SR) { setStage("unsupported"); return; }

    const recognition = new SR();
    recognition.continuous    = false;
    recognition.interimResults = true;
    recognition.lang          = "en-US";
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let final = "";
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) final += event.results[i][0].transcript + " ";
      }
      if (final.trim()) {
        setTranscript(final.trim());
        transcriptRef.current = final.trim();
      }
    };

    recognition.onerror = () => setStage("error");

    recognition.onend = async () => {
      // Read from ref to avoid stale React state closure
      const text = transcriptRef.current;
      if (!text.trim()) { setStage("idle"); setExpanded(false); return; }
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
    transcriptRef.current  = "";
    setStage("recording");
    setTranscript("");
    setCoaching(null);

    recognition.start();
    // Auto-stop after 30 seconds
    setTimeout(() => { try { recognition.stop(); } catch { /* already stopped */ } }, 30000);
  }, [habitId, habitLogId, habitName, onCoachingReceived]);

  const stopRecording = useCallback(() => {
    try { recognitionRef.current?.stop(); } catch { /* ignore */ }
  }, []);

  if (!isPro && stage === "idle") return (
    <button
      onClick={() => {}}
      className="flex items-center gap-1.5 text-[11px] text-slate-600 hover:text-slate-500 transition-colors mt-1.5 touch-manipulation cursor-default"
      title="Voice check-ins — Pro feature"
    >
      <Mic className="w-3 h-3" />
      <span>Voice note <span className="text-[10px] text-violet-700/70 font-semibold ml-0.5">Pro</span></span>
    </button>
  );

  if (stage === "unsupported") {
    return (
      <p className="text-[10px] text-slate-600 mt-1.5">
        Voice check-ins require Chrome or Edge — not supported in this browser.
      </p>
    );
  }

  if (!expanded && stage === "idle") {
    return (
      <button
        onClick={() => { if (isPro) { setExpanded(true); startRecording(); } }}
        className="flex items-center gap-1.5 text-[11px] text-violet-400/60 hover:text-violet-300 transition-colors mt-1.5 touch-manipulation"
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
            {stage === "recording"  ? "Recording… tap Stop when done" :
             stage === "processing" ? "Analysing…" :
             stage === "done"       ? "Check-in saved" :
             stage === "error"      ? "Something went wrong" : "Voice note"}
          </span>
        </div>
        <button
          onClick={() => { stopRecording(); setStage("idle"); setExpanded(false); transcriptRef.current = ""; }}
          className="text-slate-600 hover:text-slate-400 p-1 touch-manipulation"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {stage === "recording" && (
        <div className="space-y-2">
          {transcript && <p className="text-xs text-slate-400 italic leading-relaxed">&ldquo;{transcript}&rdquo;</p>}
          {/* Animated waveform */}
          <div className="flex items-center gap-0.5 h-7 py-1 px-1">
            {Array.from({ length: 16 }).map((_, i) => (
              <div
                key={i}
                className="w-1 bg-red-400/80 rounded-full flex-1"
                style={{ animation: `voiceWave ${0.4 + (i % 5) * 0.08}s ease-in-out ${(i * 0.04).toFixed(2)}s infinite alternate` }}
              />
            ))}
          </div>
          <button
            onClick={stopRecording}
            className="w-full py-2.5 bg-red-500/20 border border-red-500/30 text-red-300 text-xs font-semibold rounded-xl hover:bg-red-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 touch-manipulation min-h-[44px]"
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
          <p className="text-xs text-red-400">Recording failed — make sure microphone access is allowed.</p>
          <button
            onClick={() => { setStage("idle"); transcriptRef.current = ""; startRecording(); }}
            className="text-xs text-violet-400 hover:text-violet-300 transition-colors touch-manipulation"
          >
            Try again →
          </button>
        </div>
      )}

      <style>{`
        @keyframes voiceWave {
          0%   { height: 4px;  opacity: 0.5; }
          100% { height: 20px; opacity: 1;   }
        }
      `}</style>
    </div>
  );
}
