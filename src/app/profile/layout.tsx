import type { Metadata } from "next";
import { requireAuth } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Profile",
  description: "Your HabitAI profile, badges and achievements.",
  robots: { index: false, follow: false },
};

export default async function ProfileLayout({ children }: { children: React.ReactNode }) {
  await requireAuth();
  return <>{children}</>;
}
