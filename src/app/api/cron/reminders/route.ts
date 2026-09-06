import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { pushNotify } from "@/lib/pushNotify";
import { isAuthorizedCron as isAuthorized } from "@/lib/cronAuth";

// Delivers "I'll do it later" reminders queued in `later_reminders`
// (see supabase/migrations/011_habit_verification.sql). That table already
// has a `sent boolean default false` column with a partial index on due,
// unsent rows — this route reuses it as the "delivered" flag rather than
// adding a redundant duplicate column.

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

interface LaterReminder {
  id: string;
  user_id: string;
  habit_id: string;
  habit_name: string;
  remind_at: string;
}

async function run() {
  const admin = createAdminClient();
  const now = new Date();
  const nowIso = now.toISOString();

  const { data: due, error } = await admin
    .from("later_reminders")
    .select("id, user_id, habit_id, habit_name, remind_at")
    .eq("sent", false)
    .lte("remind_at", nowIso);

  if (error) throw new Error(`later_reminders query failed: ${error.message}`);

  const reminders = (due ?? []) as LaterReminder[];

  let delivered = 0;
  let skippedCompleted = 0;
  let skippedStale = 0;
  let failed = 0;

  for (const reminder of reminders) {
    try {
      const remindAt = new Date(reminder.remind_at);

      // More than 6 hours overdue — don't fire a burst of stale reminders
      // after a backlog; just mark it handled.
      if (now.getTime() - remindAt.getTime() > SIX_HOURS_MS) {
        await admin.from("later_reminders").update({ sent: true }).eq("id", reminder.id);
        skippedStale++;
        continue;
      }

      // Already completed today — don't nag.
      const today    = new Date().toISOString().split("T")[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
      const { count } = await admin
        .from("habit_logs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", reminder.user_id)
        .eq("habit_id", reminder.habit_id)
        .gte("completed_at", `${today}T00:00:00.000Z`)
        .lt("completed_at", `${tomorrow}T00:00:00.000Z`);

      if ((count ?? 0) > 0) {
        await admin.from("later_reminders").update({ sent: true }).eq("id", reminder.id);
        skippedCompleted++;
        continue;
      }

      await pushNotify(
        admin,
        reminder.user_id,
        {
          title: `Ready for ${reminder.habit_name}?`,
          body: "You asked us to remind you — tap to mark it done and keep your streak.",
          tag: `later-${reminder.id}`,
          url: "/dashboard",
        },
        "habit",
      );
      await admin.from("later_reminders").update({ sent: true }).eq("id", reminder.id);
      delivered++;
    } catch {
      // Leave `sent` false so a genuinely transient failure (e.g. push
      // provider hiccup) gets retried on the next run instead of being lost.
      failed++;
    }
  }

  return {
    checked: reminders.length,
    delivered,
    skippedCompleted,
    skippedStale,
    failed,
    timestamp: nowIso,
  };
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try   { return NextResponse.json(await run()); }
  catch (err) { return NextResponse.json({ error: (err as Error).message }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try   { return NextResponse.json(await run()); }
  catch (err) { return NextResponse.json({ error: (err as Error).message }, { status: 500 }); }
}
