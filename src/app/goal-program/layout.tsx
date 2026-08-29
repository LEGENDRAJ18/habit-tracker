import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "AI Goal Program",
  description: "A personalized, phased habit plan built around your biggest goal.",
  robots: { index: false, follow: false },
};

export default async function GoalProgramLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  return <>{children}</>;
}
