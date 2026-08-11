"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { resolveUser } from "@/lib/supabase/resolve-user";

interface Props {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  maxLength?: number;
}

// "Pick one of my existing habits, or type something else" — used anywhere a
// habit name needs picking (Habit Battles, Group creation) instead of typing
// a name that's usually already one of the user's tracked habits. Does its
// own lightweight habits fetch (id, name only) rather than pulling in the
// full useHabits() hook, which neither caller otherwise needs.
export default function HabitChipPicker({ label, value, onChange, placeholder, maxLength = 80 }: Props) {
  const [habits, setHabits] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [customMode, setCustomMode] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const user = await resolveUser();
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from("habits")
        .select("id, name")
        .eq("user_id", user.id)
        .order("created_at");
      const fetched = data ?? [];
      setHabits(fetched);
      // No habits to pick from — skip straight to free text, no lonely single chip.
      if (fetched.length === 0) setCustomMode(true);
      setLoading(false);
    })();
  }, []);

  return (
    <div>
      <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block mb-1.5">{label}</label>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-slate-600 py-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />Loading your habits…
        </div>
      ) : !customMode ? (
        <div className="flex flex-wrap gap-2">
          {habits.map((h) => (
            <button
              key={h.id}
              type="button"
              onClick={() => onChange(h.name)}
              className={`px-3 py-2 rounded-full text-xs font-medium border transition-all ${
                value === h.name
                  ? "border-violet-500/60 bg-violet-600/15 ring-1 ring-violet-500/25 text-violet-100"
                  : "border-violet-900/30 bg-[#0f0f1a] text-slate-300 hover:border-violet-700/50 hover:bg-violet-950/30"
              }`}
            >
              {h.name}
            </button>
          ))}
          <button
            type="button"
            onClick={() => { setCustomMode(true); onChange(""); }}
            className="px-3 py-2 rounded-full text-xs font-medium border border-dashed border-violet-800/40 text-slate-500 hover:text-slate-300 hover:border-violet-700/50 transition-all"
          >
            Something else…
          </button>
        </div>
      ) : (
        <div className="space-y-1.5">
          <input
            type="text"
            autoFocus
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            maxLength={maxLength}
            spellCheck="true" autoCorrect="on"
            className="w-full bg-violet-950/30 border border-violet-900/30 focus:border-violet-600/60 focus:outline-none rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 transition-all"
          />
          {habits.length > 0 && (
            <button
              type="button"
              onClick={() => { setCustomMode(false); onChange(""); }}
              className="text-[11px] text-violet-500 hover:text-violet-400 transition-colors"
            >
              ← Pick from my habits instead
            </button>
          )}
        </div>
      )}
    </div>
  );
}
