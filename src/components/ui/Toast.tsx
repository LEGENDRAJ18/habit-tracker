"use client";

import { useState, useEffect, useCallback } from "react";
import { X } from "lucide-react";

// ─── Module-level store (no Context needed) ───────────────────────────────────

export type ToastType = "success" | "error" | "warning";

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastEntry {
  id: string;
  message: string;
  type: ToastType;
  action?: ToastAction;
}

const store: ToastEntry[] = [];
const listeners = new Set<() => void>();

function notify() { listeners.forEach((l) => l()); }

export function toast(
  message: string,
  type: ToastType = "success",
  action?: ToastAction,
  durationMs = 3500,
) {
  const id = Math.random().toString(36).slice(2, 9);
  store.push({ id, message, type, action });
  notify();
  const timer = setTimeout(() => dismissToast(id), durationMs);
  return () => { clearTimeout(timer); dismissToast(id); };
}

export function dismissToast(id: string) {
  const idx = store.findIndex((t) => t.id === id);
  if (idx !== -1) { store.splice(idx, 1); notify(); }
}

// ─── Styling maps ─────────────────────────────────────────────────────────────

const ICONS: Record<ToastType, string> = {
  success: "✅",
  error:   "❌",
  warning: "⚠️",
};

const BG: Record<ToastType, string> = {
  success: "bg-[#040e09]/92 border-emerald-500/25 text-emerald-50",
  error:   "bg-[#100404]/92 border-red-500/25 text-red-50",
  warning: "bg-[#0e0a02]/92 border-amber-500/25 text-amber-50",
};

const ACTION_BTN: Record<ToastType, string> = {
  success: "text-emerald-300 hover:text-emerald-200 bg-emerald-900/30 hover:bg-emerald-800/40",
  error:   "text-red-300 hover:text-red-200 bg-red-900/30 hover:bg-red-800/40",
  warning: "text-amber-300 hover:text-amber-200 bg-amber-900/30 hover:bg-amber-800/40",
};

// ─── Container ────────────────────────────────────────────────────────────────

export default function ToastContainer() {
  const [list, setList]     = useState<ToastEntry[]>([]);
  const [fading, setFading] = useState<Set<string>>(new Set());

  useEffect(() => {
    const update = () => setList([...store]);
    listeners.add(update);
    return () => { listeners.delete(update); };
  }, []);

  const handleDismiss = useCallback((id: string) => {
    setFading((prev) => new Set([...prev, id]));
    setTimeout(() => {
      dismissToast(id);
      setFading((prev) => {
        const s = new Set(prev);
        s.delete(id);
        return s;
      });
    }, 250);
  }, []);

  if (list.length === 0) return null;

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 items-center pointer-events-none">
      {list.map((t) => (
        <div
          key={t.id}
          role="alert"
          className={`
            pointer-events-auto
            flex items-center gap-3
            px-5 py-3
            rounded-full border
            shadow-[0_8px_32px_rgba(0,0,0,0.5)]
            text-sm font-medium
            w-max max-w-[400px]
            backdrop-blur-md
            ${BG[t.type]}
          `}
          style={{
            animation: fading.has(t.id)
              ? "toastFadeOut 0.25s ease-in both"
              : "toastSlideUp 0.38s cubic-bezier(0.34,1.56,0.64,1) both",
          }}
        >
          <span className="text-base leading-none flex-shrink-0" aria-hidden>
            {ICONS[t.type]}
          </span>

          <span className="flex-1 leading-snug">{t.message}</span>

          {t.action && (
            <button
              onClick={() => { t.action!.onClick(); handleDismiss(t.id); }}
              className={`flex-shrink-0 text-xs font-bold px-2.5 py-1 rounded-full transition-colors ${ACTION_BTN[t.type]}`}
            >
              {t.action.label}
            </button>
          )}

          <button
            onClick={() => handleDismiss(t.id)}
            aria-label="Dismiss"
            className="flex-shrink-0 ml-0.5 text-white/40 hover:text-white/80 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
