import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * PATCH /api/habits/[id]/reminder
 * Body: { reminder_time: "HH:MM" | null }
 * Sets or clears the preferred_reminder_time for a habit.
 * No tier gate — available to all users.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing habit id" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { reminder_time: string | null };
  const reminderTime = body.reminder_time?.trim() || null;

  const { error } = await supabase
    .from("habits")
    .update({ preferred_reminder_time: reminderTime })
    .eq("id", id)
    .eq("user_id", user.id); // RLS-equivalent safety check

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, reminder_time: reminderTime });
}
