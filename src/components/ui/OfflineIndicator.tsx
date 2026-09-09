"use client";

import { useOnlineStatus } from "@/hooks/useOnlineStatus";

// Rendered in-flow inside AppShell (alongside TrialBanner/CancellationBanner)
// rather than as a fixed-position toast — a viewport-fixed toast has no way
// to avoid whatever card content the user happens to be scrolled to, and was
// confirmed overlapping the AI Check-in card's text. Being part of normal
// layout flow pushes content down instead of floating over it.
export default function OfflineIndicator() {
  const online = useOnlineStatus();
  if (online) return null;

  return (
    <div className="w-full bg-slate-800/50 border-b border-slate-700/40 px-4 py-2.5 flex items-center justify-center gap-2">
      <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" style={{ boxShadow: "0 0 6px #f59e0b" }} />
      <p className="text-xs font-semibold text-slate-200">Offline — showing cached habits</p>
    </div>
  );
}
