import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function getAchievementMeta(
  type: string,
  value: number,
  tier?: string
): { emoji: string; name: string; description: string } {
  if (type === "streak") {
    const emoji = value >= 30 ? "💎" : "🔥";
    return {
      emoji,
      name:        `${value}-Day Streak`,
      description: value >= 30
        ? `${value} consecutive days of habit completion. Diamond-level consistency.`
        : `${value} days in a row without breaking the chain.`,
    };
  }
  if (type === "level") {
    return {
      emoji:       "⚡",
      name:        tier ? `${tier} Tier Reached` : `Level ${value} Reached`,
      description: tier
        ? `Reached the "${tier}" tier on HabitAI by staying relentlessly consistent.`
        : `Climbed to level ${value} on HabitAI through daily habit completion.`,
    };
  }
  // daily
  return {
    emoji:       "🎯",
    name:        "Perfect Day",
    description: "Completed every single habit today without exception. Flawless.",
  };
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const {
    type        = "daily",
    value       = 0,
    tier,
    userStreak  = 0,
    userLevel   = 1,
    userXp      = 0,
  } = body;

  // Derive first-name display from metadata or email
  const raw = (user.user_metadata?.full_name as string | undefined) ?? user.email ?? "";
  const displayName =
    raw.split(/[\s_\-+@]/)[0]?.trim() ||
    "Habit Builder";

  const meta  = getAchievementMeta(type, value, tier);
  const token = crypto.randomUUID().replace(/-/g, ""); // 32-char hex, URL-safe

  const { error } = await supabase.from("share_tokens").insert({
    user_id:                 user.id,
    achievement_type:        type,
    achievement_value:       value,
    achievement_emoji:       meta.emoji,
    achievement_name:        meta.name,
    achievement_description: meta.description,
    user_display_name:       displayName,
    user_streak:             userStreak,
    user_level:              userLevel,
    user_xp:                 userXp,
    token,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ token });
}
