"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";

// ─── Module-level store (no Context needed) ───────────────────────────────────

export type ToastType = "success" | "error";

interface ToastEntry {
  id: string;
  message: string;
  type: ToastType;
}

const store: ToastEntry[] = [];
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

export function toast(message: string, type: ToastType = "success") {
  const id = Math.random().toString(36).slice(2, 9);
  store.push({ id, message, type });
  notify();
  setTimeout(() => {
    const idx = store.findIndex((t) => t.id === id);
    if (idx !== -1) { store.splice(idx, 1); notify(); }
  }, 3500);
}

// ─── Container ────────────────────────────────────────────────────────────────

export default function ToastContainer() {
  const [list, setList] = useState<ToastEntry[]>([]);

  useEffect(() => {
    const update = () => setList([...store]);
    listeners.add(update);
    return () => { listeners.delete(update); };
  }, []);

  if (list.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none sm:top-5 sm:right-5">
      {list.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border text-sm font-medium min-w-[240px] max-w-[340px]"
          style={{ animation: "toastSlideIn 0.35s cubic-bezier(0.34,1.56,0.64,1) both" }}
          role="alert"
        >
          {t.type === "success" ? (
            <>
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="flex-1 text-emerald-100" style={{ background: "transparent" }}>
                {t.message}
              </span>
            </>
          ) : (
            <>
              <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-4 h-4 text-red-400" />
              </div>
              <span className="flex-1 text-red-100">{t.message}</span>
            </>
          )}
          <button
            onClick={() => {
              const idx = store.findIndex((x) => x.id === t.id);
              if (idx !== -1) { store.splice(idx, 1); notify(); }
            }}
            className="text-slate-500 hover:text-white transition-colors flex-shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
