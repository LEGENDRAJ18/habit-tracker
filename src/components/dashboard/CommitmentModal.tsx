"use client";

import { useState } from "react";
import { X, Globe, Lock, Users, Loader2, AlertCircle } from "lucide-react";
import type { Plan } from "@/types";
import { createClient } from "@/lib/supabase/client";
import FeatureUpgradeGate from "./FeatureUpgradeGate";
import CenteredModal from "@/components/ui/CenteredModal";

interface Props {
  habitId: string;
  habitName: string;
  isPublic: boolean;
  commitmentText: string | null;
  tier: Plan;
  onSave: (isPublic: boolean, commitmentText: string | null) => void;
  onClose: () => void;
  onUpgrade: () => void;
}

export default function CommitmentModal({
  habitId, habitName, isPublic: initialPublic, commitmentText: initialText,
  tier, onSave, onClose, onUpgrade,
}: Props) {
  const isPaid = tier === "plus" || tier === "pro";

  const [isPublic, setIsPublic]       = useState(initialPublic);
  const [text, setText]               = useState(initialText ?? "");
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: dbErr } = await supabase
        .from("habits")
        .update({
          is_public:        isPublic,
          commitment_text:  isPublic && text.trim() ? text.trim() : null,
        })
        .eq("id", habitId);
      if (dbErr) throw dbErr;
      onSave(isPublic, isPublic && text.trim() ? text.trim() : null);
      onClose();
    } catch (e) {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <CenteredModal onClose={onClose} backdrop="bg-black/70 backdrop-blur-sm">
      <div className="modal-center-enter w-full max-w-sm bg-[#0d0d1a] border border-violet-700/30 rounded-3xl shadow-2xl shadow-violet-950/60 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="relative px-6 pt-5 pb-4 border-b border-violet-900/20">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-600/8 to-transparent pointer-events-none" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-violet-600/25 border border-violet-500/30 flex items-center justify-center">
                <Globe className="w-3.5 h-3.5 text-violet-300" />
              </div>
              <h2 className="text-sm font-bold text-white">Public Commitment</h2>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-white p-1 rounded-lg hover:bg-violet-950/40 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-5">
          {!isPaid ? (
            <FeatureUpgradeGate
              requiredTier="plus"
              featureName="Public Commitment Contracts"
              description="Make habits public with a commitment message. Friends can witness your commitment and keep you accountable."
              onUpgrade={onUpgrade}
            />
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-slate-400 mb-1">Habit</p>
                <p className="text-sm font-semibold text-white truncate">{habitName}</p>
              </div>

              {/* Toggle */}
              <div className="flex items-center justify-between p-3 bg-[#0f0f1a] border border-violet-900/20 rounded-xl">
                <div className="flex items-center gap-2.5">
                  {isPublic ? <Globe className="w-4 h-4 text-violet-400" /> : <Lock className="w-4 h-4 text-slate-500" />}
                  <div>
                    <p className="text-sm font-semibold text-white">{isPublic ? "Public" : "Private"}</p>
                    <p className="text-[11px] text-slate-500">{isPublic ? "Friends can see this habit" : "Only you can see this"}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsPublic((v) => !v)}
                  className={`relative w-10 h-5.5 rounded-full transition-colors duration-200 flex-shrink-0 ${isPublic ? "bg-violet-600" : "bg-slate-700"}`}
                >
                  <span className={`absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow transition-transform duration-200 ${isPublic ? "translate-x-4.5" : "translate-x-0.5"}`} />
                </button>
              </div>

              {isPublic && (
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block mb-1.5">Commitment message <span className="normal-case text-slate-600">(optional)</span></label>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={"I will wake up at 6am for 30 days. Hold me accountable. 💪"}
                    maxLength={200}
                    rows={3}
                    spellCheck="true" autoCorrect="on"
                    className="w-full bg-[#0f0f1a] border border-violet-800/40 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-violet-500/70 resize-none"
                  />
                  <p className="text-[10px] text-slate-600 text-right mt-1">{text.length}/200</p>
                </div>
              )}

              {isPublic && (
                <div className="bg-violet-950/30 border border-violet-800/20 rounded-xl px-3 py-2.5 space-y-2">
                  <div className="flex items-start gap-2.5">
                    <Users className="w-3.5 h-3.5 text-violet-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-400 leading-relaxed">Your friends will be able to see this habit on your profile.</p>
                  </div>
                  <div className="flex items-center gap-2 bg-[#0f0f1a] border border-violet-900/30 rounded-lg px-2.5 py-1.5">
                    <span className="text-[10px] text-slate-500 truncate flex-1 font-mono">
                      {typeof window !== "undefined" ? window.location.origin : "https://habitaiapp.com"}/share/{habitId}
                    </span>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(`${typeof window !== "undefined" ? window.location.origin : "https://habitaiapp.com"}/share/${habitId}`)}
                      className="text-[10px] text-violet-400 hover:text-violet-300 font-semibold flex-shrink-0 transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 text-xs text-red-400 bg-red-950/30 border border-red-800/30 rounded-xl px-3 py-2">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />{error}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save
                </button>
                <button onClick={onClose} className="px-4 py-2.5 border border-slate-700/40 text-slate-400 hover:text-white rounded-xl text-sm transition-all">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </CenteredModal>
  );
}
