import type { Metadata } from "next";
import { requireAuth } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Organisations",
  description: "Create an organisation, invite members, and track everyone's progress.",
  robots: { index: false, follow: false },
};

export default async function OrganisationsLayout({ children }: { children: React.ReactNode }) {
  await requireAuth();
  return <>{children}</>;
}
