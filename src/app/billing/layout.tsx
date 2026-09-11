import { requireAuth } from "@/lib/supabase/server";

export default async function BillingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAuth();
  return <>{children}</>;
}
