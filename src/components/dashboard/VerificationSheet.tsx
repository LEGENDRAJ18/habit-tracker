"use client";

import { useRef, useState } from "react";
import { Camera, Check, Loader2, Pause, Play, X } from "lucide-react";
import type { Habit, CompletionQuality } from "@/types";
import BottomSheet from "@/components/ui/BottomSheet";
import { scoreCounterCompletion } from "@/lib/habitVerification";
import { createClient } from "@/lib/supabase/client";
import { resolveUser } from "@/lib/supabase/resolve-user";
import { toast } from "@/components/ui/Toast";

export interface VerificationResult {
  actualValue?: number | null;
  completionQuality: CompletionQuality;
  reflectionText?: string | null;
  photoUrl?: string | null;
  timerUsed?: boolean;
  xpMultiplier: number;
  photoBonus: boolean;
}

interface Props {
  habit: Habit;
  onClose: () => void;
  onConfirm: (result: VerificationResult) => void | Promise<void>;
}

function counterUnit(name: string): string {
  const n = name.toLowerCase();
  const known = ["glasses", "cups", "steps", "pages", "reps", "pushups", "situps", "litres", "times"];
  return known.find((k) => n.includes(k)) ?? "reps";
}

function durationMinutes(habit: Habit): number {
  if (habit.duration_minutes) return habit.duration_minutes;
  const m = habit.how_long?.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 20;
}

const MOOD_EMOJIS = ["😞", "😐", "🙂", "😄", "🤩"];

export default function VerificationSheet({ habit, onClose, onConfirm }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const type = habit.verification_type ?? "standard";

  const header = (
    <div className="flex items-center justify-between px-5 pt-1 pb-3">
      <p className="text-sm font-semibold text-white truncate pr-2">{habit.name}</p>
      <button onClick={onClose} className="flex-shrink-0 p-1 text-slate-500 hover:text-slate-300 transition-colors" aria-label="Close">
        <X className="w-4 h-4" />
      </button>
    </div>
  );

  const confirm = async (result: VerificationResult) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onConfirm(result);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BottomSheet onClose={onClose}>
      {header}
      <div className="px-5 pb-6">
        {type === "counter" && <CounterVerification habit={habit} submitting={submitting} onConfirm={confirm} onClose={onClose} />}
        {type === "duration" && <DurationVerification habit={habit} submitting={submitting} onConfirm={confirm} onClose={onClose} />}
        {type === "photo" && <PhotoVerification habit={habit} submitting={submitting} onConfirm={confirm} />}
        {type === "reflection" && <ReflectionVerification habit={habit} submitting={submitting} onConfirm={confirm} onClose={onClose} />}
        {type === "standard" && <StandardVerification submitting={submitting} onConfirm={confirm} onClose={onClose} />}
      </div>
    </BottomSheet>
  );
}

// ─── Standard ───────────────────────────────────────────────────────────────

function StandardVerification({ submitting, onConfirm, onClose }: {
  submitting: boolean;
  onConfirm: (r: VerificationResult) => void;
  onClose: () => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">Mark this habit done for today?</p>
      <div className="flex gap-2">
        <button
          onClick={onClose}
          className="flex-1 py-3 rounded-2xl text-sm font-semibold text-slate-400 border border-white/10 hover:bg-white/5 transition-colors"
        >
          Cancel
        </button>
        <button
          disabled={submitting}
          onClick={() => onConfirm({ completionQuality: "full", xpMultiplier: 1, photoBonus: false })}
          className="flex-1 py-3 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:brightness-110 transition-all disabled:opacity-60 flex items-center justify-center gap-1.5"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Done
        </button>
      </div>
    </div>
  );
}

// ─── Counter ────────────────────────────────────────────────────────────────

function CounterVerification({ habit, submitting, onConfirm, onClose }: {
  habit: Habit;
  submitting: boolean;
  onConfirm: (r: VerificationResult) => void;
  onClose: () => void;
}) {
  const target = habit.target_value ?? null;
  const unit = counterUnit(habit.name);
  const [value, setValue] = useState<number>(target ? Math.round(target) : 1);

  const quickAmounts = target
    ? Array.from(new Set([Math.round(target * 0.5), Math.round(target * 0.75), Math.round(target), Math.round(target * 1.25)])).filter((n) => n > 0)
    : [1, 2, 5, 10];

  const submit = () => {
    const scored = scoreCounterCompletion(value, target);
    if (!scored) {
      toast("0 logged — no completion recorded for today.", "warning", undefined, 3000);
      onClose();
      return;
    }
    onConfirm({ actualValue: value, completionQuality: scored.quality, xpMultiplier: scored.xpMultiplier, photoBonus: false });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-300">
        How many {unit} did you do{target ? ` (goal: ${target})` : ""}?
      </p>

      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => setValue((v) => Math.max(0, v - 1))}
          className="w-9 h-9 rounded-full border border-violet-700/40 text-violet-300 text-lg font-bold hover:bg-violet-950/40 transition-colors"
        >−</button>
        <span className="text-3xl font-bold text-white w-16 text-center tabular-nums">{value}</span>
        <button
          onClick={() => setValue((v) => v + 1)}
          className="w-9 h-9 rounded-full border border-violet-700/40 text-violet-300 text-lg font-bold hover:bg-violet-950/40 transition-colors"
        >+</button>
      </div>

      <div className="flex flex-wrap gap-2 justify-center">
        {quickAmounts.map((n) => (
          <button
            key={n}
            onClick={() => setValue(n)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              value === n ? "bg-violet-600 border-violet-500 text-white" : "border-violet-800/40 text-violet-300 hover:bg-violet-950/40"
            }`}
          >
            {n}
          </button>
        ))}
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={onClose}
          className="flex-1 py-3 rounded-2xl text-sm font-semibold text-slate-400 border border-white/10 hover:bg-white/5 transition-colors"
        >
          Cancel
        </button>
        <button
          disabled={submitting}
          onClick={submit}
          className="flex-1 py-3 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:brightness-110 transition-all disabled:opacity-60 flex items-center justify-center gap-1.5"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Log it
        </button>
      </div>
    </div>
  );
}

// ─── Duration ───────────────────────────────────────────────────────────────

function DurationVerification({ habit, submitting, onConfirm, onClose }: {
  habit: Habit;
  submitting: boolean;
  onConfirm: (r: VerificationResult) => void;
  onClose: () => void;
}) {
  const minutes = durationMinutes(habit);
  const [phase, setPhase] = useState<"ask" | "timer" | "mood">("ask");
  const [secondsLeft, setSecondsLeft] = useState(minutes * 60);
  const [running, setRunning] = useState(false);
  const [timerUsed, setTimerUsed] = useState(false);
  const [mood, setMood] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = () => {
    setPhase("timer");
    setRunning(true);
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setRunning(false);
          setTimerUsed(true);
          setPhase("mood");
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  const togglePause = () => {
    if (running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setRunning(false);
    } else {
      setRunning(true);
      intervalRef.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            setRunning(false);
            setTimerUsed(true);
            setPhase("mood");
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }
  };

  const finishNow = (usedTimer: boolean) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setTimerUsed(usedTimer);
    setPhase("mood");
  };

  const submit = () => {
    onConfirm({
      completionQuality: "full",
      xpMultiplier: 1,
      photoBonus: false,
      timerUsed,
      reflectionText: mood != null ? MOOD_EMOJIS[mood] : null,
    });
  };

  if (phase === "ask") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-300">Did you complete your {minutes} minutes?</p>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => finishNow(false)}
            className="w-full py-3 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:brightness-110 transition-all flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4" /> Yes I did it
          </button>
          <button
            onClick={startTimer}
            className="w-full py-3 rounded-2xl text-sm font-semibold text-violet-300 border border-violet-700/40 hover:bg-violet-950/30 transition-all flex items-center justify-center gap-1.5"
          >
            <Play className="w-4 h-4" /> Start timer ({minutes} min)
          </button>
          <button onClick={onClose} className="w-full py-2 text-xs text-slate-500 hover:text-slate-300 transition-colors">
            Not yet
          </button>
        </div>
      </div>
    );
  }

  if (phase === "timer") {
    const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
    const ss = String(secondsLeft % 60).padStart(2, "0");
    return (
      <div className="space-y-4 text-center">
        <p className="text-5xl font-bold text-white tabular-nums tracking-tight">{mm}:{ss}</p>
        <p className="text-xs text-slate-500">Auto-completes when the timer ends</p>
        <div className="flex gap-2">
          <button
            onClick={togglePause}
            className="flex-1 py-3 rounded-2xl text-sm font-semibold text-violet-300 border border-violet-700/40 hover:bg-violet-950/30 transition-all flex items-center justify-center gap-1.5"
          >
            {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {running ? "Pause" : "Resume"}
          </button>
          <button
            onClick={() => finishNow(true)}
            className="flex-1 py-3 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:brightness-110 transition-all"
          >
            Finish now
          </button>
        </div>
      </div>
    );
  }

  // mood
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-300">How do you feel?</p>
      <div className="flex justify-between px-1">
        {MOOD_EMOJIS.map((emoji, i) => (
          <button
            key={i}
            onClick={() => setMood(i)}
            className={`text-2xl w-11 h-11 rounded-full flex items-center justify-center transition-all ${
              mood === i ? "bg-violet-600/30 scale-110 ring-2 ring-violet-500" : "hover:bg-white/5"
            }`}
          >
            {emoji}
          </button>
        ))}
      </div>
      <button
        disabled={submitting}
        onClick={submit}
        className="w-full py-3 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:brightness-110 transition-all disabled:opacity-60 flex items-center justify-center gap-1.5"
      >
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
        Done
      </button>
    </div>
  );
}

// ─── Photo ──────────────────────────────────────────────────────────────────

function PhotoVerification({ habit, submitting, onConfirm }: {
  habit: Habit;
  submitting: boolean;
  onConfirm: (r: VerificationResult) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    setPreview(URL.createObjectURL(file));
    try {
      const user = await resolveUser();
      if (!user) { toast("Not signed in — couldn't upload photo.", "error"); return; }
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${habit.id}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("habit-photos").upload(path, file, { upsert: false });
      if (error) { toast("Photo upload failed — you can still mark this done.", "error"); return; }
      // Bucket is private (RLS-scoped per user folder) — store the object path;
      // a signed URL is generated wherever the photo is displayed.
      setPhotoUrl(path);
    } finally {
      setUploading(false);
    }
  };

  const submit = (withPhoto: boolean) => {
    onConfirm({
      completionQuality: "full",
      xpMultiplier: 1,
      photoBonus: withPhoto && !!photoUrl,
      photoUrl: withPhoto ? photoUrl : null,
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-300">Take a quick photo as proof</p>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); }}
      />

      {preview ? (
        <div className="relative w-full h-40 rounded-2xl overflow-hidden border border-violet-800/40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Proof preview" className="w-full h-full object-cover" />
          {uploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full py-8 rounded-2xl border-2 border-dashed border-violet-800/40 text-violet-400 flex flex-col items-center gap-2 hover:bg-violet-950/20 transition-colors"
        >
          <Camera className="w-6 h-6" />
          <span className="text-xs font-medium">Tap to take a photo</span>
        </button>
      )}

      {photoUrl && !uploading && (
        <p className="text-xs text-emerald-400 text-center">📸 Photo attached — +10 bonus XP</p>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => submit(false)}
          className="flex-1 py-3 rounded-2xl text-sm font-semibold text-slate-400 border border-white/10 hover:bg-white/5 transition-colors"
        >
          Skip photo
        </button>
        <button
          disabled={submitting || uploading}
          onClick={() => submit(true)}
          className="flex-1 py-3 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:brightness-110 transition-all disabled:opacity-60 flex items-center justify-center gap-1.5"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {photoUrl ? "Done" : "Mark done"}
        </button>
      </div>
    </div>
  );
}

// ─── Reflection ─────────────────────────────────────────────────────────────

function reflectionQuestion(name: string): { question: string; useEmoji: boolean } {
  const n = name.toLowerCase();
  if (n.includes("grateful") || n.includes("gratitude")) return { question: "What are you grateful for today?", useEmoji: false };
  if (n.includes("affirmation")) return { question: "How did saying your affirmation feel?", useEmoji: true };
  if (n.includes("breathe")) return { question: "How do you feel after breathing?", useEmoji: true };
  return { question: "How did it go?", useEmoji: true };
}

function ReflectionVerification({ habit, submitting, onConfirm, onClose }: {
  habit: Habit;
  submitting: boolean;
  onConfirm: (r: VerificationResult) => void;
  onClose: () => void;
}) {
  const { question, useEmoji } = reflectionQuestion(habit.name);
  const [text, setText] = useState("");
  const [mood, setMood] = useState<number | null>(null);

  const submit = () => {
    const reflectionText = useEmoji ? (mood != null ? MOOD_EMOJIS[mood] : null) : (text.trim() || null);
    onConfirm({ completionQuality: "full", xpMultiplier: 1, photoBonus: false, reflectionText });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-300">{question}</p>

      {useEmoji ? (
        <div className="flex justify-between px-1">
          {MOOD_EMOJIS.map((emoji, i) => (
            <button
              key={i}
              onClick={() => setMood(i)}
              className={`text-2xl w-11 h-11 rounded-full flex items-center justify-center transition-all ${
                mood === i ? "bg-violet-600/30 scale-110 ring-2 ring-violet-500" : "hover:bg-white/5"
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
      ) : (
        <textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={280}
          rows={3}
          placeholder="A sentence or two…"
          className="w-full bg-violet-950/30 border border-violet-700/40 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-violet-500/70 resize-none"
        />
      )}

      <div className="flex gap-2">
        <button
          onClick={onClose}
          className="flex-1 py-3 rounded-2xl text-sm font-semibold text-slate-400 border border-white/10 hover:bg-white/5 transition-colors"
        >
          Cancel
        </button>
        <button
          disabled={submitting}
          onClick={submit}
          className="flex-1 py-3 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:brightness-110 transition-all disabled:opacity-60 flex items-center justify-center gap-1.5"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Done
        </button>
      </div>
    </div>
  );
}
