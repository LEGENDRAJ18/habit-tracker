"use client";

import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export default function OfflineIndicator() {
  const online = useOnlineStatus();
  if (online) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[200] flex items-center justify-center gap-2 py-1.5 text-xs font-semibold text-slate-300"
      style={{ background: "rgba(15,15,26,0.92)", backdropFilter: "blur(8px)", borderBottom: "1px solid rgba(100,116,139,0.2)" }}
    >
      <span className="w-2 h-2 rounded-full bg-slate-500 flex-shrink-0" />
      Offline — habits sync automatically when you reconnect
    </div>
  );
}
