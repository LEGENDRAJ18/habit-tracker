"use client";

import { usePathname } from "next/navigation";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { APP_ROUTES } from "@/components/layout/ConditionalAppShell";

export default function OfflineIndicator() {
  const online = useOnlineStatus();
  const pathname = usePathname();
  const isApp = APP_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"));
  if (online || !isApp) return null;

  return (
    <div
      className="fixed bottom-24 left-1/2 z-[200] flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold text-slate-200 shadow-lg"
      style={{
        transform: "translateX(-50%)",
        background: "rgba(15,15,26,0.9)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(100,116,139,0.25)",
        animation: "toastSlideUp 0.25s cubic-bezier(0.34,1.56,0.64,1) both",
        bottom: "calc(5rem + env(safe-area-inset-bottom, 0px))",
      }}
    >
      <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" style={{ boxShadow: "0 0 6px #f59e0b" }} />
      Offline — showing cached habits
    </div>
  );
}
