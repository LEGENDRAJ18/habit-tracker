import type { Metadata } from "next";
import { requireAuth } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "AI Goal Program",
  description: "A personalized, phased habit plan built around your biggest goal.",
  robots: { index: false, follow: false },
};

export default async function GoalProgramLayout({ children }: { children: React.ReactNode }) {
  await requireAuth();
  return <>{children}</>;
}
