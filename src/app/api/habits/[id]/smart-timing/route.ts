import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: habitId } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { enabled } = await req.json() as { enabled: boolean };

  if (!enabled) {
    await supabase
      .from("habits")
      .update({ smart_timing: false, preferred_reminder_time: null })
      .eq("id", habitId)
      .eq("user_id", user.id);
    return NextResponse.json({ smart_timing: false, preferred_reminder_time: null });
  }

  // Tier gate — Pro only. Use the user-authenticated client (not admin) so the
  // lookup works via RLS without needing SUPABASE_SERVICE_ROLE_KEY.
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("id", user.id)
    .single();
  if (!profile || profile.subscription_tier !== "pro") {
    return NextResponse.json({ error: "Smart timing is a Pro feature." }, { status: 403 });
  }

  // Compute median completion hour from last 30 logs for this habit
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const { data: logs } = await supabase
    .from("habit_logs")
    .select("completed_at")
    .eq("habit_id", habitId)
    .eq("user_id", user.id)
    .gte("completed_at", thirtyDaysAgo)
    .order("completed_at", { ascending: false });

  let preferredTime: string | null = null;

  if (logs && logs.length >= 3) {
    const hours = logs
      .map((l) => new Date(l.completed_at).getHours())
      .sort((a, b) => a - b);
    const medianHour = hours[Math.floor(hours.length / 2)];
    preferredTime = `${String(medianHour).padStart(2, "0")}:00:00`;
  }

  await supabase
    .from("habits")
    .update({ smart_timing: true, preferred_reminder_time: preferredTime })
    .eq("id", habitId)
    .eq("user_id", user.id);

  return NextResponse.json({ smart_timing: true, preferred_reminder_time: preferredTime });
}
