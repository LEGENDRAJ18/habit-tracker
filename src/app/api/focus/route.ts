import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/focus — return focus stats for the authenticated user
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const sevenAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];

    const { data: sessions, error } = await supabase
      .from("focus_sessions")
      .select("actual_minutes, completed_at, was_completed")
      .eq("user_id", user.id)
      .gte("completed_at", `${sevenAgo}T00:00:00`)
      .order("completed_at", { ascending: false });

    if (error) throw error;

    const rows = sessions ?? [];
    const today    = new Date().toISOString().split("T")[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

    // Daily total (today)
    const dailyTotal = rows
      .filter((r) => {
        const d = r.completed_at.split("T")[0];
        return d >= today && d < tomorrow;
      })
      .reduce((s, r) => s + r.actual_minutes, 0);

    // Weekly data — 7 buckets [6 days ago … today]
    const weeklyData: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStr  = new Date(Date.now() - i * 86400000).toISOString().split("T")[0];
      const nextDay = new Date(Date.now() - (i - 1) * 86400000).toISOString().split("T")[0];
      weeklyData.push(
        rows
          .filter((r) => {
            const d = r.completed_at.split("T")[0];
            return d >= dayStr && d < nextDay;
          })
          .reduce((s, r) => s + r.actual_minutes, 0),
      );
    }

    // Personal best — max daily total in the 7-day window
    const byDay = new Map<string, number>();
    for (const r of rows) {
      const d = r.completed_at.split("T")[0];
      byDay.set(d, (byDay.get(d) ?? 0) + r.actual_minutes);
    }
    const personalBest   = byDay.size > 0 ? Math.max(...Array.from(byDay.values())) : 0;
    const totalSessions  = rows.filter((r) => r.was_completed).length;

    return NextResponse.json({ dailyTotal, weeklyData, personalBest, totalSessions });
  } catch (err) {
    console.error("[focus GET]", err);
    return NextResponse.json({ error: "Failed to load stats" }, { status: 500 });
  }
}

// POST /api/focus — log a completed focus session
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json() as {
      habit_id?: string | null;
      habit_name?: string | null;
      duration_minutes: number;
      actual_minutes: number;
      was_completed: boolean;
    };

    const { data, error } = await supabase
      .from("focus_sessions")
      .insert({
        user_id:          user.id,
        habit_id:         body.habit_id         ?? null,
        habit_name:       body.habit_name        ?? null,
        duration_minutes: body.duration_minutes,
        actual_minutes:   body.actual_minutes,
        was_completed:    body.was_completed,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ session: data });
  } catch (err) {
    console.error("[focus POST]", err);
    return NextResponse.json({ error: "Failed to save session" }, { status: 500 });
  }
}
