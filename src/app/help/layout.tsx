import type { Metadata } from "next";
import { requireAuth } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Help",
  description: "Get help using HabitAI, browse FAQs, and contact support.",
  robots: { index: false, follow: false },
};

export default async function HelpLayout({ children }: { children: React.ReactNode }) {
  await requireAuth();
  return <>{children}</>;
}
