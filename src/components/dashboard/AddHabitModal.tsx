"use client";

import { useState } from "react";
import { X, Loader2, Plus } from "lucide-react";

interface Props {
  onClose: () => void;
  onAdd: (
    name: string,
    description: string,
    frequency: "daily" | "weekly"
  ) => Promise<{ error: string | null }>;
}

export default function AddHabitModal({ onClose, onAdd }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [frequency, setFrequency] = useState<"daily" | "weekly">("daily");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);

    const { error } = await onAdd(name.trim(), description.trim(), frequency);

    if (error) {
      setError(error);
      setLoading(false);
    } else {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md bg-[#0f0f1a] border border-violet-800/30 rounded-2xl shadow-2xl shadow-violet-950/50 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-violet-900/20">
          <h2 className="text-base font-semibold text-white">Add New Habit</h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-violet-950/50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <p className="text-sm text-red-400 bg-red-950/30 border border-red-800/30 rounded-xl px-3.5 py-2.5">
              {error}
            </p>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Habit name <span className="text-violet-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Morning Meditation"
              required
              maxLength={80}
              autoFocus
              className="w-full bg-violet-950/30 border border-violet-900/30 focus:border-violet-600/60 focus:outline-none focus:ring-2 focus:ring-violet-600/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Description{" "}
              <span className="text-slate-600 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. 10 minutes of mindfulness"
              maxLength={200}
              className="w-full bg-violet-950/30 border border-violet-900/30 focus:border-violet-600/60 focus:outline-none focus:ring-2 focus:ring-violet-600/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">
              Frequency
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(["daily", "weekly"] as const).map((freq) => (
                <button
                  key={freq}
                  type="button"
                  onClick={() => setFrequency(freq)}
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

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-violet-900/30 text-slate-400 hover:text-white rounded-xl text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl text-sm transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Add Habit
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
