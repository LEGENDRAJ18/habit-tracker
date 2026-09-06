import type { Metadata } from "next";
import { requireAuth } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Admin",
  description: "HabitAI internal admin dashboard.",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAuth();
  return <>{children}</>;
}
