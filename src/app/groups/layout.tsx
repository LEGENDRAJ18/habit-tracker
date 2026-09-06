import type { Metadata } from "next";
import { requireAuth } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Groups",
  description: "Track a shared habit streak with friends or family.",
  robots: { index: false, follow: false },
};

export default async function GroupsLayout({ children }: { children: React.ReactNode }) {
  await requireAuth();
  return <>{children}</>;
}
