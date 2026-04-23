"use client";

import { useState } from "react";
import { Bell, BellOff, Check, Loader2 } from "lucide-react";

interface Props {
  enabled: boolean;
  hour: number;
  minute: number;
  onSave: (enabled: boolean, hour: number, minute: number) => Promise<void>;
}

function toTimeString(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function fromTimeString(value: string): { hour: number; minute: number } {
  const [h, m] = value.split(":").map(Number);
  return { hour: h ?? 8, minute: m ?? 0 };
}

function formatDisplay(hour: number, minute: number): string {
  const suffix = hour < 12 ? "AM" : "PM";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${String(minute).padStart(2, "0")} ${suffix}`;
}

export default function ReminderSettings({ enabled, hour, minute, onSave }: Props) {
  const [localEnabled, setLocalEnabled] = useState(enabled);
  const [localTime, setLocalTime]       = useState(toTimeString(hour, minute));
  const [saving, setSaving]             = useState(false);
  const [saved, setSaved]               = useState(false);

  const { hour: initHour, minute: initMinute } = fromTimeString(toTimeString(hour, minute));
  const { hour: localHour, minute: localMinute } = fromTimeString(localTime);

  const hasChanges =
    localEnabled !== enabled || localHour !== initHour || localMinute !== initMinute;

  const handleSave = async () => {
    setSaving(true);
    await onSave(localEnabled, localHour, localMinute);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
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

      {/* Time picker */}
      {localEnabled && (
        <div className="mb-4">
          <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider">Reminder time</p>
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <input
                type="time"
                value={localTime}
                onChange={(e) => setLocalTime(e.target.value || "08:00")}
                className="w-full bg-slate-900/60 border border-slate-700/60 hover:border-violet-700/50 focus:border-violet-500/70 focus:outline-none text-white text-sm rounded-xl px-3.5 py-2.5 transition-colors appearance-none"
                style={{ colorScheme: "dark" }}
              />
            </div>
            <div className="flex-shrink-0 text-sm font-semibold text-violet-300 bg-violet-900/25 border border-violet-700/30 px-3 py-2.5 rounded-xl min-w-[90px] text-center">
              {formatDisplay(localHour, localMinute)}
            </div>
          </div>
          <p className="text-[11px] text-slate-600 mt-2">
            We&apos;ll send your reminder at approximately this time each day.
          </p>
        </div>
      )}

      {/* Disabled hint */}
      {!localEnabled && (
        <div className="flex items-center gap-2 text-xs text-slate-600 mb-4">
          <BellOff className="w-3.5 h-3.5" />
          Reminders are off — you won&apos;t receive any emails
        </div>
      )}

      {/* Save */}
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
          <><Check className="w-3.5 h-3.5" />Saved</>
        ) : (
          "Save preferences"
        )}
      </button>
    </div>
  );
}
