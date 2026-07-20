import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: program, error } = await supabase
      .from("goal_programs")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!program) return NextResponse.json({ program: null, checkins: [] });

    const { data: checkins } = await supabase
      .from("program_checkins")
      .select("*")
      .eq("program_id", program.id)
      .order("week_number", { ascending: false });

    return NextResponse.json({ program, checkins: checkins ?? [] });
  } catch (err) {
    console.error("[goal-program/active]", err);
    return NextResponse.json({ error: (err as Error).message ?? "Couldn't load program" }, { status: 500 });
  }
}
