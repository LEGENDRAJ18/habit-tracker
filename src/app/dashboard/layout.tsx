import type { Metadata } from "next";
import { requireAuth } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Track your daily habits, monitor streaks and review your progress.",
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAuth();
  return <>{children}</>;
}
