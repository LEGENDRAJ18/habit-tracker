import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { pushNotify } from "@/lib/pushNotify";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const { data: battles, error } = await admin
      .from("battles")
      .select("*")
      .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Enrich with profile names
    const userIds = new Set<string>();
    for (const b of battles ?? []) {
      userIds.add(b.challenger_id);
      userIds.add(b.opponent_id);
    }

    const { data: profiles } = await admin
      .from("profiles")
      .select("id, username")
      .in("id", Array.from(userIds));

    const nameMap = new Map<string, string>();
    for (const p of profiles ?? []) {
      nameMap.set(p.id, p.username ?? "Unknown");
    }

    const enriched = (battles ?? []).map((b) => ({
      ...b,
      challenger_name: nameMap.get(b.challenger_id) ?? "Unknown",
      opponent_name:   nameMap.get(b.opponent_id)   ?? "Unknown",
      is_challenger:   b.challenger_id === user.id,
    }));

    return NextResponse.json({ battles: enriched });
  } catch (err) {
    console.error("[battles GET]", err);
    return NextResponse.json({ error: "Failed to load battles" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Tier gate — Plus/Pro only
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("subscription_tier")
      .eq("id", user.id)
      .single();
    if (!profile || profile.subscription_tier === "free") {
      return NextResponse.json({ error: "Habit Battles require Plus or Pro." }, { status: 403 });
    }

    const body = await request.json() as { opponent_id: string; habit_name: string; duration_days?: number };
    const { opponent_id, habit_name, duration_days = 7 } = body;

    if (!opponent_id || !habit_name?.trim()) {
      return NextResponse.json({ error: "opponent_id and habit_name are required" }, { status: 400 });
    }
    if (opponent_id === user.id) {
      return NextResponse.json({ error: "You can't battle yourself!" }, { status: 400 });
    }

    const { data: battle, error } = await admin
      .from("battles")
      .insert({
        challenger_id: user.id,
        opponent_id,
        habit_name: habit_name.trim(),
        duration_days,
        status: "pending",
        challenger_completions: 0,
        opponent_completions: 0,
      })
      .select()
      .single();

    if (error) throw error;

    // Push to opponent: you've been challenged
    const { data: challengerProfile } = await admin
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .single();
    const challengerName = challengerProfile?.username ?? "Someone";

    void pushNotify(admin, opponent_id, {
      title: "⚔️ You've been challenged!",
      body:  `${challengerName} challenged you to a ${duration_days}-day Habit Battle: "${habit_name}". Accept or decline?`,
      tag:   `battle-invite-${battle?.id}`,
      url:   "/friends",
    }, "battle");

    return NextResponse.json({ battle });
  } catch (err) {
    console.error("[battles POST]", err);
    return NextResponse.json({ error: "Failed to create battle" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json() as {
      battle_id: string;
      action: "accept" | "decline" | "log_completion" | "complete";
    };
    const { battle_id, action } = body;

    const admin = createAdminClient();
    const { data: battle, error: fetchErr } = await admin
      .from("battles")
      .select("*")
      .eq("id", battle_id)
      .single();

    if (fetchErr || !battle) return NextResponse.json({ error: "Battle not found" }, { status: 404 });

    // Security: only participants can update
    if (battle.challenger_id !== user.id && battle.opponent_id !== user.id) {
      return NextResponse.json({ error: "Not a participant" }, { status: 403 });
    }

    if (action === "accept" && battle.opponent_id === user.id) {
      const { data: updated, error } = await admin
        .from("battles")
        .update({ status: "active", start_date: new Date().toISOString().split("T")[0] })
        .eq("id", battle_id)
        .select()
        .single();
      if (error) throw error;

      // Push challenger: battle accepted
      const { data: opponentProfile } = await admin
        .from("profiles").select("username").eq("id", user.id).single();
      const opponentName = opponentProfile?.username ?? "Your opponent";
      void pushNotify(admin, battle.challenger_id, {
        title: "🤝 Battle accepted!",
        body:  `${opponentName} accepted your Habit Battle: "${battle.habit_name}". It's on! 💪`,
        tag:   `battle-accepted-${battle_id}`,
        url:   "/friends",
      }, "battle");

      return NextResponse.json({ battle: updated });
    }

    if (action === "decline" && battle.opponent_id === user.id) {
      const { data: updated, error } = await admin
        .from("battles")
        .update({ status: "declined" })
        .eq("id", battle_id)
        .select()
        .single();
      if (error) throw error;

      // Push challenger: battle declined
      const { data: opProfile } = await admin
        .from("profiles").select("username").eq("id", user.id).single();
      const opName = opProfile?.username ?? "Your opponent";
      void pushNotify(admin, battle.challenger_id, {
        title: "❌ Battle declined",
        body:  `${opName} declined your Habit Battle. Challenge someone else?`,
        tag:   `battle-declined-${battle_id}`,
        url:   "/friends",
      }, "battle");

      return NextResponse.json({ battle: updated });
    }

    if (action === "log_completion" && battle.status === "active") {
      const isChallenger = battle.challenger_id === user.id;
      const field = isChallenger ? "challenger_completions" : "opponent_completions";
      const current = (isChallenger ? battle.challenger_completions : battle.opponent_completions) ?? 0;

      const updates: Record<string, unknown> = { [field]: current + 1 };

      // Check if battle duration is over → determine winner
      if (battle.start_date) {
        const started = new Date(battle.start_date);
        const elapsed = Math.round((Date.now() - started.getTime()) / 86400000);
        if (elapsed >= battle.duration_days) {
          const newChallenger = isChallenger ? current + 1 : battle.challenger_completions;
          const newOpponent   = isChallenger ? battle.opponent_completions : current + 1;
          updates.status    = "completed";
          updates.winner_id = newChallenger >= newOpponent ? battle.challenger_id : battle.opponent_id;
        }
      }

      const { data: updated, error } = await admin
        .from("battles")
        .update(updates)
        .eq("id", battle_id)
        .select()
        .single();
      if (error) throw error;

      // Push both participants if battle just completed
      if (updates.status === "completed" && updates.winner_id) {
        const winnerId  = updates.winner_id as string;
        const loserId   = winnerId === battle.challenger_id ? battle.opponent_id : battle.challenger_id;
        const habitName = battle.habit_name as string;

        void pushNotify(admin, winnerId, {
          title: "🏆 You won the battle!",
          body:  `Congratulations! You beat your opponent in the "${habitName}" Habit Battle. Keep it up!`,
          tag:   `battle-win-${battle_id}`,
          url:   "/friends",
        }, "battle");
        void pushNotify(admin, loserId, {
          title: "😤 Battle over",
          body:  `The "${habitName}" battle is done. You fought hard — challenge them again?`,
          tag:   `battle-lose-${battle_id}`,
          url:   "/friends",
        }, "battle");
      }

      // Push opponent if challenger is pulling ahead mid-battle
      if (!updates.status && isChallenger) {
        const newCount   = current + 1;
        const opCount    = battle.opponent_completions ?? 0;
        const gap        = newCount - opCount;
        if (gap === 3 || gap === 5) {
          void pushNotify(admin, battle.opponent_id, {
            title: "😤 Your opponent is pulling ahead!",
            body:  `They're ${gap} completions ahead in your "${battle.habit_name}" battle. Time to catch up!`,
            tag:   `battle-update-${battle_id}`,
            url:   "/friends",
          }, "battle");
        }
      }

      return NextResponse.json({ battle: updated });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("[battles PATCH]", err);
    return NextResponse.json({ error: "Failed to update battle" }, { status: 500 });
  }
}
