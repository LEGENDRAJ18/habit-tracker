import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ exists: false });
    }

    const normalized = email.toLowerCase().trim();

    // Query GoTrue admin endpoint with filter — exact match verified on response
    const url = new URL(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users`);
    url.searchParams.set("filter", normalized);
    url.searchParams.set("per_page", "5");

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      },
      cache: "no-store",
    });

    if (!res.ok) return NextResponse.json({ exists: false });

    const data = await res.json();
    const exists =
      Array.isArray(data.users) &&
      data.users.some(
        (u: { email?: string }) => u.email?.toLowerCase() === normalized
      );

    return NextResponse.json({ exists });
  } catch {
    return NextResponse.json({ exists: false });
  }
}
