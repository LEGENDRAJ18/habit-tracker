// 1st of month: mark monthly_wrapped_ready for all Pro users.
// The dashboard client checks this flag and auto-shows the Wrapped modal.
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAuthorizedCron as isAuthorized } from "@/lib/cronAuth";

async function runMonthlyWrapped() {
  const supabase = createAdminClient();
  const now      = new Date();

  // Only run on the 1st of the month (UTC)
  if (now.getUTCDate() !== 1) {
    return { skipped: true, reason: "not 1st of month", timestamp: now.toISOString() };
  }

  const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

  // Collect stats for each Pro user from the previous month
  const prevMonthStart = new Date(now.getUTCFullYear(), now.getUTCMonth() - 1, 1).toISOString().split("T")[0];
  const thisMonthStart = new Date(now.getUTCFullYear(), now.getUTCMonth(), 1).toISOString().split("T")[0];

  const { data: proProfiles, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("subscription_tier", "pro");

  if (error) throw new Error(error.message);
  if (!proProfiles || proProfiles.length === 0) return { marked: 0, month, timestamp: now.toISOString() };

  let marked = 0;

  for (const profile of proProfiles) {
    try {
      // Count last month's completions
      const { count } = await supabase
        .from("habit_logs")
        .select("*", { count: "exact", head: true })
        .eq("user_id", profile.id)
        .gte("completed_at", prevMonthStart)
        .lt("completed_at", thisMonthStart);

      if ((count ?? 0) === 0) continue; // nothing to wrap

      // Write a monthly_wrapped record — the dashboard component reads these
      try {
        await supabase
          .from("monthly_wraps")
          .upsert(
            {
              user_id:    profile.id,
              month,
              ready:      true,
              created_at: now.toISOString(),
            },
            { onConflict: "user_id,month", ignoreDuplicates: true },
          );
      } catch {
        // table may not exist — MonthlyWrapped component works without it
      }

      marked++;
    } catch {
      // continue
    }
  }

  return { marked, month, timestamp: now.toISOString() };
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await runMonthlyWrapped());
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await runMonthlyWrapped());
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
