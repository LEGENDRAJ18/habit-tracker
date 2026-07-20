import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ALLOWED = ["active", "paused", "abandoned"] as const;

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json() as { status?: string };
    const { status } = body;
    if (!status || !ALLOWED.includes(status as (typeof ALLOWED)[number])) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const { data: program } = await supabase
      .from("goal_programs")
      .select("id")
      .eq("user_id", user.id)
      .in("status", ["active", "paused"])
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!program) return NextResponse.json({ error: "No program to update" }, { status: 404 });

    const { data: updated, error } = await supabase
      .from("goal_programs")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", program.id)
      .select()
      .single();

    if (error || !updated) return NextResponse.json({ error: error?.message ?? "Couldn't update status" }, { status: 500 });
    return NextResponse.json({ program: updated });
  } catch (err) {
    console.error("[goal-program/status]", err);
    return NextResponse.json({ error: (err as Error).message ?? "Couldn't update status" }, { status: 500 });
  }
}
