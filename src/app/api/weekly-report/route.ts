import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function buildWeeklyHtml(
  name: string,
  consistency: number,
  bestHabit: string,
  weakHabit: string | null,
  tip: string,
  completions: number,
): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="background:#09090f;margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <div style="background:linear-gradient(135deg,#1a0a2e,#0f0f1a);border:1px solid rgba(139,92,246,0.25);border-radius:20px;padding:32px;text-align:center;margin-bottom:20px;">
      <div style="font-size:48px;margin-bottom:12px;">📊</div>
      <h1 style="color:#fff;font-size:24px;font-weight:800;margin:0 0 8px;">Your Weekly Wrap</h1>
      <p style="color:#a78bfa;font-size:14px;margin:0;">Week ending ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
    </div>

    <div style="background:#0f0f1a;border:1px solid rgba(109,40,217,0.2);border-radius:16px;padding:24px;margin-bottom:16px;">
      <p style="color:#e2e8f0;font-size:15px;line-height:1.7;margin:0 0 16px;">
        Hey <strong style="color:#a78bfa;">${esc(name)}</strong> 👋
      </p>
      <p style="color:#94a3b8;font-size:14px;line-height:1.7;margin:0 0 16px;">
        This week you were <strong style="color:#fff;">${consistency}% consistent</strong> — that's ${completions} habit completions. ${consistency >= 80 ? "Incredible work, you're building something real." : consistency >= 60 ? "Solid week. One more push and you'll be in the 80%+ club." : "Tough week — but showing up even imperfectly is what separates you from people who never start."}
      </p>
      ${bestHabit ? `<p style="color:#94a3b8;font-size:14px;line-height:1.7;margin:0 0 16px;">Your biggest win was <strong style="color:#34d399;">${esc(bestHabit)}</strong> — keep that momentum going.</p>` : ""}
      ${weakHabit ? `<p style="color:#94a3b8;font-size:14px;line-height:1.7;margin:0;">Your weak spot this week was <strong style="color:#f87171;">${esc(weakHabit)}</strong>. That's the one to focus on.</p>` : ""}
    </div>

    <div style="background:linear-gradient(135deg,rgba(139,92,246,0.1),rgba(168,85,247,0.05));border:1px solid rgba(139,92,246,0.2);border-radius:16px;padding:20px;margin-bottom:16px;">
      <p style="color:#a78bfa;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 8px;">💡 Your tip for next week</p>
      <p style="color:#e2e8f0;font-size:14px;line-height:1.6;margin:0;">${esc(tip)}</p>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;">
      <div style="background:#0f0f1a;border:1px solid rgba(109,40,217,0.15);border-radius:12px;padding:16px;text-align:center;">
        <p style="color:#a78bfa;font-size:24px;font-weight:800;margin:0 0 4px;">${consistency}%</p>
        <p style="color:#64748b;font-size:11px;margin:0;">Consistency</p>
      </div>
      <div style="background:#0f0f1a;border:1px solid rgba(109,40,217,0.15);border-radius:12px;padding:16px;text-align:center;">
        <p style="color:#fb923c;font-size:24px;font-weight:800;margin:0 0 4px;">${completions}</p>
        <p style="color:#64748b;font-size:11px;margin:0;">Completions</p>
      </div>
    </div>

    <div style="text-align:center;margin-bottom:24px;">
      <a href="https://habitaiapp.com/dashboard" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;font-weight:700;font-size:14px;padding:14px 32px;border-radius:12px;text-decoration:none;">
        Open Dashboard →
      </a>
    </div>

    <p style="color:#334155;font-size:11px;text-align:center;margin:0;">
      You're receiving this because you have weekly reports enabled.<br>
      <a href="https://habitaiapp.com/settings" style="color:#4c1d95;">Manage email settings</a>
    </p>
  </div>
</body>
</html>`;
}

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret or user auth
    const authHeader = request.headers.get("authorization");
    const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;

    const admin = createAdminClient();

    if (isCron) {
      const thisWeekSunday = new Date().toISOString().split("T")[0];
      // Send to all users with weekly_email_enabled = true who haven't received it this Sunday
      const { data: users } = await admin
        .from("profiles")
        .select("id, full_name, username, subscription_tier")
        .eq("weekly_email_enabled", true)
        .in("subscription_tier", ["plus", "pro"])
        .or(`weekly_report_sent_date.is.null,weekly_report_sent_date.lt.${thisWeekSunday}`);

      let sent = 0;
      for (const profile of users ?? []) {
        const { data: authUser } = await admin.auth.admin.getUserById(profile.id);
        const email = authUser?.user?.email;
        if (!email) continue;

        const { stats, report } = await buildUserReport(admin, profile.id);
        if (!stats) continue;

        const name = profile.full_name ?? profile.username ?? "there";
        await resend.emails.send({
          from:    "HabitAI <hello@habitaiapp.com>",
          to:      email,
          subject: `Your weekly habit report 📊`,
          html:    buildWeeklyHtml(name, stats.consistency, stats.bestHabit, stats.weakHabit, report.tip, stats.completions),
        });
        // Mark sent so we don't double-send this Sunday
        await admin.from("profiles")
          .update({ weekly_report_sent_date: thisWeekSunday })
          .eq("id", profile.id);
        sent++;
      }
      return NextResponse.json({ sent });
    }

    // Manual send for individual user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await admin.from("profiles").select("full_name, username, subscription_tier").eq("id", user.id).single();
    if (!profile || profile.subscription_tier === "free") {
      return NextResponse.json({ error: "Weekly email report requires Plus or Pro." }, { status: 403 });
    }

    const { stats, report } = await buildUserReport(admin, user.id);
    if (!stats) return NextResponse.json({ error: "Not enough data" }, { status: 400 });

    const name = profile?.full_name ?? profile?.username ?? "there";
    await resend.emails.send({
      from:    "HabitAI <hello@habitaiapp.com>",
      to:      user.email!,
      subject: `Your weekly habit report 📊`,
      html:    buildWeeklyHtml(name, stats.consistency, stats.bestHabit, stats.weakHabit, report.tip, stats.completions),
    });

    return NextResponse.json({ sent: true });
  } catch (err) {
    console.error("[weekly-report POST]", err);
    return NextResponse.json({ error: "Failed to send report" }, { status: 500 });
  }
}

async function buildUserReport(admin: ReturnType<typeof createAdminClient>, userId: string) {
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

  const [{ data: habits }, { data: logs }] = await Promise.all([
    admin.from("habits").select("id, name").eq("user_id", userId),
    admin.from("habit_logs").select("habit_id, completed_at").eq("user_id", userId).gte("completed_at", weekAgo),
  ]);

  if (!habits || habits.length === 0) return { stats: null, report: { tip: "" } };

  const completions = (logs ?? []).length;
  const possible = habits.length * 7;
  const consistency = Math.round((completions / Math.max(possible, 1)) * 100);

  // Find best and worst habit
  const countByHabit = new Map<string, number>();
  for (const log of logs ?? []) {
    countByHabit.set(log.habit_id, (countByHabit.get(log.habit_id) ?? 0) + 1);
  }

  const habitMap = new Map(habits.map((h) => [h.id, h.name]));
  let bestHabit = "";
  let weakHabit: string | null = null;
  let bestCount = 0;
  let worstCount = Infinity;
  let worstId: string | null = null;

  for (const habit of habits) {
    const count = countByHabit.get(habit.id) ?? 0;
    if (count > bestCount) { bestCount = count; bestHabit = habit.name; }
    if (count < worstCount) { worstCount = count; worstId = habit.id; }
  }
  if (worstId && worstId !== habits.find((h) => h.name === bestHabit)?.id) {
    weakHabit = habitMap.get(worstId) ?? null;
  }

  const tips = [
    `Try habit stacking — link ${bestHabit} to something you already do every day to make it automatic.`,
    "Set a non-negotiable 2-minute version for any habit you're struggling with. Two minutes always wins over zero.",
    "Track your best time-of-day for each habit and schedule them there — consistency beats willpower every time.",
    "Share a commitment with a friend this week. Public accountability doubles your follow-through rate.",
  ];
  const tip = tips[new Date().getDate() % tips.length];

  return { stats: { consistency, bestHabit, weakHabit, completions }, report: { tip } };
}
