"use client";

import { useState } from "react";
import { X, Loader2, Plus, ArrowRight, Link2, ChevronDown, CheckCircle2, AlertTriangle, XCircle, Sparkles } from "lucide-react";
import type { Habit } from "@/types";
import { useHabitValidation } from "@/hooks/useHabitValidation";

const WHERE_OPTIONS    = ["Bedroom", "Gym", "Office", "Kitchen", "Living room", "Outdoors", "On commute"];
const HOW_LONG_OPTIONS = ["5 min", "10 min", "20 min", "30 min", "45 min", "1 hour", "2+ hours"];


interface Props {
  onClose: () => void;
  existingHabits: Habit[];
  onAdd: (
    name: string,
    description: string,
    frequency: "daily" | "weekly",
    stackAfterId?: string | null,
    whenTime?: string | null,
    whereLocation?: string | null,
    howLong?: string | null,
    validityScore?: "valid" | "partial" | "invalid",
  ) => Promise<{ error: string | null }>;
}

function isDuplicate(name: string, existingHabits: Habit[]): boolean {
  const normalized = name.trim().toLowerCase();
  return existingHabits.some((h) => h.name.trim().toLowerCase() === normalized);
}

export default function AddHabitModal({ onClose, existingHabits, onAdd }: Props) {
  const [name, setName]               = useState("");
  const [description, setDescription] = useState("");
  const [frequency, setFrequency]     = useState<"daily" | "weekly">("daily");
  const [stackAfterId, setStackAfterId]   = useState<string>("");
  const [whenTime, setWhenTime]           = useState("");
  const [whereLocation, setWhereLocation] = useState("");
  const [howLong, setHowLong]             = useState("");
  const [showIntentions, setShowIntentions] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const aiValidation = useHabitValidation(name);
  const duplicate    = name.trim().length > 2 && isDuplicate(name, existingHabits);
  const stackParent  = existingHabits.find((h) => h.id === stackAfterId);

  const isBlocked = duplicate || aiValidation.status === "blocked";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isBlocked) return;

    setLoading(true);
    setError(null);

    const validityScore: "valid" | "partial" | "invalid" =
      aiValidation.status === "warning" ? "partial" : "valid";

    const { error } = await onAdd(
      name.trim(),
      description.trim(),
      frequency,
      stackAfterId  || null,
      whenTime      || null,
      whereLocation || null,
      howLong       || null,
      validityScore,
    );

    if (error) {
      setError(error);
      setLoading(false);
    } else {
      onClose();
    }
  };

  const inputCls =
    "w-full bg-violet-950/30 border border-violet-900/30 focus:border-violet-600/60 focus:outline-none focus:ring-2 focus:ring-violet-600/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 transition-all";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md bg-[#0f0f1a] border border-violet-800/30 rounded-2xl shadow-2xl shadow-violet-950/50 overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-violet-900/20 sticky top-0 bg-[#0f0f1a] z-10">
          <h2 className="text-base font-semibold text-white">Add New Habit</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-violet-950/50">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <p className="text-sm text-red-400 bg-red-950/30 border border-red-800/30 rounded-xl px-3.5 py-2.5">{error}</p>
          )}

          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Habit name <span className="text-violet-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(null); }}
              placeholder="e.g. Meditate for 10 minutes"
              required
              maxLength={100}
              autoFocus
              className={`${inputCls} ${
                duplicate
                  ? "border-amber-600/50 focus:border-amber-500/60"
                  : aiValidation.status === "blocked"
                  ? "border-red-600/50 focus:border-red-500/60"
                  : aiValidation.status === "warning"
                  ? "border-amber-600/50 focus:border-amber-500/60"
                  : aiValidation.status === "good"
                  ? "border-emerald-600/40 focus:border-emerald-500/50"
                  : ""
              }`}
            />

            {/* Char counter */}
            <div className="flex justify-end mt-1">
              <span className={`text-[10px] ${name.length > 90 ? "text-amber-400" : "text-slate-700"}`}>
                {name.length}/100
              </span>
            </div>

            {/* Feedback cards */}
            {duplicate && (
              <div className="mt-2 flex items-start gap-2.5 bg-amber-950/40 border border-amber-600/30 rounded-xl px-3.5 py-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-300 leading-snug">You already have a habit with this name.</p>
              </div>
            )}

            {!duplicate && aiValidation.status === "validating" && (
              <div className="mt-2 flex items-center gap-2 px-3.5 py-2">
                <Sparkles className="w-3.5 h-3.5 animate-pulse text-violet-500 flex-shrink-0" />
                <span className="text-[11px] text-slate-500">Checking your habit…</span>
              </div>
            )}

            {!duplicate && aiValidation.status === "good" && (
              <div className="mt-2 flex items-start gap-2.5 bg-emerald-950/40 border border-emerald-600/30 rounded-xl px-3.5 py-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-emerald-300">Great habit!</p>
                  <p className="text-[11px] text-emerald-500 mt-0.5">You&apos;ll earn full XP for this.</p>
                </div>
              </div>
            )}

            {!duplicate && aiValidation.status === "warning" && (
              <div className="mt-2 bg-amber-950/40 border border-amber-600/30 rounded-xl px-3.5 py-2.5">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-amber-300">This habit is a bit vague</p>
                    <p className="text-[11px] text-amber-500 mt-0.5">You&apos;ll earn 50% XP. Edit to earn full points.</p>
                  </div>
                </div>
                {aiValidation.suggestion && (
                  <button
                    type="button"
                    onClick={() => setName(aiValidation.suggestion!)}
                    className="mt-2 ml-6 text-[11px] text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors"
                  >
                    <ArrowRight className="w-3 h-3" />
                    Try: &ldquo;{aiValidation.suggestion}&rdquo;
                  </button>
                )}
              </div>
            )}

            {!duplicate && aiValidation.status === "blocked" && (
              <div className="mt-2 flex items-start gap-2.5 bg-red-950/40 border border-red-600/30 rounded-xl px-3.5 py-2.5">
                <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-red-300">This doesn&apos;t look like a valid habit</p>
                  <p className="text-[11px] text-red-500 mt-0.5">No XP will be earned. Try making it more specific.</p>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Description <span className="text-slate-600 font-normal">(optional)</span>
            </label>
            <input
              type="text" value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. 10 minutes of mindfulness" maxLength={200}
              className={inputCls}
            />
          </div>

          {/* Frequency */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Frequency</label>
            <div className="grid grid-cols-2 gap-2">
              {(["daily", "weekly"] as const).map((freq) => (
                <button key={freq} type="button" onClick={() => setFrequency(freq)}
                  className={`py-2.5 rounded-xl text-sm font-medium border transition-all capitalize ${
                    frequency === freq
                      ? "bg-violet-600/20 border-violet-600/50 text-violet-300"
                      : "bg-violet-950/20 border-violet-900/20 text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {freq}
                </button>
              ))}
            </div>
          </div>

          {/* Habit stacking */}
          {existingHabits.length > 0 && (
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-400 mb-1.5">
                <Link2 className="w-3.5 h-3.5 text-violet-500" />
                Stack with existing habit{" "}
                <span className="text-slate-600 font-normal">(optional)</span>
              </label>
              <select
                value={stackAfterId}
                onChange={(e) => setStackAfterId(e.target.value)}
                className={`${inputCls} appearance-none`}
                style={{ colorScheme: "dark" }}
              >
                <option value="">— None —</option>
                {existingHabits.map((h) => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>

              {stackParent && name.trim() && (
                <div className="flex items-center gap-2 mt-2.5 px-3 py-2 bg-violet-950/30 border border-violet-800/25 rounded-lg">
                  <span className="text-xs text-slate-400 truncate max-w-[120px]">{stackParent.name}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" />
                  <span className="text-xs text-violet-300 font-medium truncate">{name.trim()}</span>
                </div>
              )}
              {stackParent && !name.trim() && (
                <p className="text-[10px] text-slate-600 mt-1.5 ml-1">
                  This habit will trigger after:{" "}
                  <span className="text-slate-500">{stackParent.name}</span>
                </p>
              )}
            </div>
          )}

          {/* Implementation Intentions */}
          <div className="border border-violet-900/25 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowIntentions((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-violet-950/30 transition-colors"
            >
              <div>
                <span className="text-xs font-medium text-slate-300">Implementation Intentions</span>
                <span className="ml-2 text-[10px] text-slate-600">(optional)</span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-600 transition-transform duration-200 ${showIntentions ? "rotate-180" : ""}`}
              />
            </button>

            {showIntentions && (
              <div className="px-4 pb-4 pt-1 space-y-3 border-t border-violet-900/20">
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Specifying when, where, and how long makes habits 2× more likely to stick.
                </p>

                {/* When */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1.5">
                    ⏰ When will you do this?
                  </label>
                  <input
                    type="time"
                    value={whenTime}
                    onChange={(e) => setWhenTime(e.target.value)}
                    className={`${inputCls} [color-scheme:dark]`}
                  />
                </div>

                {/* Where */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1.5">
                    📍 Where?
                  </label>
                  <select
                    value={whereLocation}
                    onChange={(e) => setWhereLocation(e.target.value)}
                    className={`${inputCls} appearance-none`}
                    style={{ colorScheme: "dark" }}
                  >
                    <option value="">e.g. Bedroom, Gym, Office…</option>
                    {WHERE_OPTIONS.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>

                {/* How long */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1.5">
                    ⏱ How long?
                  </label>
                  <select
                    value={howLong}
                    onChange={(e) => setHowLong(e.target.value)}
                    className={`${inputCls} appearance-none`}
                    style={{ colorScheme: "dark" }}
                  >
                    <option value="">Select duration…</option>
                    {HOW_LONG_OPTIONS.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>

                {/* Preview pill */}
                {(whenTime || whereLocation || howLong) && (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {whereLocation && (
                      <span className="text-[11px] text-slate-400 bg-slate-800/50 border border-slate-700/40 px-2 py-0.5 rounded-full">
                        📍 {whereLocation}
                      </span>
                    )}
                    {whenTime && (
                      <span className="text-[11px] text-slate-400 bg-slate-800/50 border border-slate-700/40 px-2 py-0.5 rounded-full">
                        ⏰ {whenTime}
                      </span>
                    )}
                    {howLong && (
                      <span className="text-[11px] text-slate-400 bg-slate-800/50 border border-slate-700/40 px-2 py-0.5 rounded-full">
                        ⏱ {howLong}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-violet-900/30 text-slate-400 hover:text-white rounded-xl text-sm transition-colors"
            >
              Cancel
            </button>
            <button type="submit" disabled={loading || !name.trim() || isBlocked}
              className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl text-sm transition-all flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" /> Add Habit</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
