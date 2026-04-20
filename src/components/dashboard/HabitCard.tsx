"use client";

import { useState } from "react";
import { Trash2, Check, Flame } from "lucide-react";
import type { Habit } from "@/types";

interface Props {
  habit: Habit;
  completed: boolean;
  onToggle: () => void;
  onDelete: () => void;
}

export default function HabitCard({ habit, completed, onToggle, onDelete }: Props) {
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleToggle = async () => {
    setToggling(true);
    await onToggle();
    setToggling(false);
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    setDeleting(true);
    await onDelete();
  };

  return (
    <div
      className={`group flex items-center gap-4 px-4 py-3.5 rounded-xl border transition-all duration-200 ${
        completed
          ? "bg-violet-600/8 border-violet-600/20"
          : "bg-[#0f0f1a] border-violet-900/20 hover:border-violet-800/30"
      } ${deleting ? "opacity-50 pointer-events-none" : ""}`}
    >
      {/* Checkbox */}
      <button
        onClick={handleToggle}
        disabled={toggling}
        className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center border-2 transition-all duration-200 ${
          completed
            ? "bg-violet-500 border-violet-500 shadow-lg shadow-violet-500/30"
            : "border-violet-700/50 hover:border-violet-500"
        } ${toggling ? "opacity-60" : ""}`}
      >
        {completed && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium truncate transition-all ${
            completed ? "text-slate-400 line-through" : "text-slate-100"
          }`}
        >
          {habit.name}
        </p>
        {habit.description && (
          <p className="text-xs text-slate-600 truncate mt-0.5">{habit.description}</p>
        )}
      </div>

      {/* Frequency badge */}
      <span
        className={`hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs border flex-shrink-0 ${
          habit.frequency === "daily"
            ? "bg-violet-950/50 border-violet-800/30 text-violet-400"
            : "bg-blue-950/50 border-blue-800/30 text-blue-400"
        }`}
      >
        {habit.frequency}
      </span>

      {/* Streak (placeholder — would need history query for real streak) */}
      <div className="flex items-center gap-1 text-xs text-orange-400/70 flex-shrink-0">
        <Flame className="w-3.5 h-3.5" />
        <span>—</span>
      </div>

      {/* Delete */}
      <button
        onClick={handleDelete}
        className={`flex-shrink-0 transition-all p-1 rounded-lg ${
          confirmDelete
            ? "text-red-400 bg-red-950/40"
            : "text-slate-700 hover:text-red-400 opacity-0 group-hover:opacity-100"
        }`}
        title={confirmDelete ? "Click again to confirm" : "Delete habit"}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
