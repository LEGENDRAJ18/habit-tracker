import { redirect } from "next/navigation";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan } = await searchParams;
  redirect(plan ? `/auth/login?plan=${encodeURIComponent(plan)}` : "/auth/login");
}
