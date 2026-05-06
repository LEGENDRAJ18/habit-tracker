"use client";

import { usePathname } from "next/navigation";
import AppShell from "./AppShell";

const APP_ROUTES = ["/dashboard", "/analytics", "/calendar", "/friends", "/profile", "/settings"];

export default function ConditionalAppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isApp = APP_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"));
  if (!isApp) return <>{children}</>;
  return <AppShell>{children}</AppShell>;
}
