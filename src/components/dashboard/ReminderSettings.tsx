"use client";

import { useState } from "react";
import { Bell, BellOff, Check, Loader2 } from "lucide-react";

const TIMES = [
  { label: "Morning",   hour: 8,  desc: "8:00 AM" },
  { label: "Afternoon", hour: 12, desc: "12:00 PM" },
  { label: "Evening",   hour: 19, desc: "7:00 PM" },
] as const;

interface Props {
  enabled: boolean;
  hour: number;
  onSave: (enabled: boolean, hour: number) => Promise<void>;
}

export default function ReminderSettings({ enabled, hour, onSave }: Props) {
  const [localEnabled, setLocalEnabled] = useState(enabled);
  const [localHour, setLocalHour]       = useState(hour);
  const [saving, setSaving]             = useState(false);
  const [saved, setSaved]               = useState(false);

  const hasChanges = localEnabled !== enabled || localHour !== hour;

  const handleSave = async () => {
    setSaving(true);
    await onSave(localEnabled, localHour);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="bg-[#0f0f1a] border border-violet-900/25 rounded-2xl p-5 mt-8">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-lg bg-violet-900/40 border border-violet-700/30 flex items-center justify-center">
          <Bell className="w-4 h-4 text-violet-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white leading-none">Email Reminders</p>
          <p className="text-xs text-slate-500 mt-0.5">Daily nudge to complete your habits</p>
        </div>
      </div>

      {/* Toggle row */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-slate-300">Send daily reminder</span>
        <button
          onClick={() => setLocalEnabled((v) => !v)}
          className={`relative w-11 h-6 rounded-full transition-colors ${
            localEnabled ? "bg-violet-600" : "bg-slate-700/60"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
              localEnabled ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* Time picker — only shown when enabled */}
      {localEnabled && (
        <div className="mb-4">
          <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider">Reminder time</p>
          <div className="grid grid-cols-3 gap-2">
            {TIMES.map((t) => (
              <button
                key={t.hour}
                onClick={() => setLocalHour(t.hour)}
                className={`flex flex-col items-center py-2.5 px-2 rounded-xl border text-xs font-medium transition-all ${
                  localHour === t.hour
                    ? "bg-violet-600/20 border-violet-500/50 text-violet-300"
                    : "bg-slate-900/40 border-slate-800/60 text-slate-500 hover:border-violet-800/50 hover:text-slate-300"
                }`}
              >
                <span className="font-semibold">{t.label}</span>
                <span className="text-[10px] mt-0.5 opacity-70">{t.desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Disabled state hint */}
      {!localEnabled && (
        <div className="flex items-center gap-2 text-xs text-slate-600 mb-4">
          <BellOff className="w-3.5 h-3.5" />
          Reminders are off — you won&apos;t receive any emails
        </div>
      )}

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={!hasChanges || saving}
        className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
          hasChanges && !saving
            ? "bg-violet-600 hover:bg-violet-500 text-white"
            : "bg-slate-800/50 text-slate-600 cursor-not-allowed"
        }`}
      >
        {saving ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : saved ? (
          <>
            <Check className="w-3.5 h-3.5" />
            Saved
          </>
        ) : (
          "Save preferences"
        )}
      </button>
    </div>
  );
}
