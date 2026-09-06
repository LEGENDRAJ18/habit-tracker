import type { Metadata } from "next";
import { requireAuth } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Friends" };

export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireAuth();
  return <>{children}</>;
}
