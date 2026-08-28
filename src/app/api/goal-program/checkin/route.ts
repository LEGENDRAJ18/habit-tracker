import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callOpenAIJSON } from "@/lib/openai";
import type { CheckinSuggestion } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json() as {
      rating?: number;
      whatWentWell?: string;
      whatWasHard?: string;
    };
    const { rating, whatWentWell = "", whatWasHard = "" } = body;
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 });
    }

    const { data: program } = await supabase
      .from("goal_programs")
      .select("id, program_name, current_week, goal_description")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (!program) return NextResponse.json({ error: "No active program" }, { status: 404 });

    const systemPrompt = `You are a warm, practical accountability coach checking in with someone on week ${program.current_week} of their program "${program.program_name}" (goal: ${program.goal_description}). Respond with valid JSON:
{
  "message": "2-3 sentences: acknowledge their rating and respond to what they shared — no suggestions here, those go in 'suggestions'",
  "suggestions": ["1-2 short, concrete, checkable actions for next week — a single specific thing to do, not vague encouragement"]
}`;
    const userPrompt = `Self-rating this week: ${rating}/5
What went well: ${whatWentWell || "(not shared)"}
What was hard: ${whatWasHard || "(not shared)"}`;

    let aiMessage = "";
    let aiSuggestions: CheckinSuggestion[] = [];
    try {
      const result = await callOpenAIJSON(systemPrompt, userPrompt) as { message?: string; suggestions?: string[] };
      aiMessage = result.message ?? "";
      aiSuggestions = (result.suggestions ?? [])
        .map((s) => s?.trim())
        .filter((s): s is string => !!s)
        .slice(0, 2)
        .map((text) => ({ text, done: false }));
    } catch (err) {
      console.error("[goal-program/checkin] AI failed", err);
      aiMessage = "Thanks for checking in — keep going, one week at a time.";
    }

    const { data: checkin, error } = await supabase
      .from("program_checkins")
      .insert({
        user_id: user.id,
        program_id: program.id,
        week_number: program.current_week,
        rating,
        what_went_well: whatWentWell || null,
        what_was_hard: whatWasHard || null,
        ai_response: aiMessage,
        ai_suggestions: aiSuggestions.length > 0 ? aiSuggestions : null,
      })
      .select()
      .single();

    if (error || !checkin) return NextResponse.json({ error: error?.message ?? "Couldn't save check-in" }, { status: 500 });
    return NextResponse.json({ checkin });
  } catch (err) {
    console.error("[goal-program/checkin]", err);
    return NextResponse.json({ error: (err as Error).message ?? "Check-in failed" }, { status: 500 });
  }
}

// Toggles one suggestion's done state on an existing check-in — persists
// immediately so it survives a refresh, unlike a purely client-side toggle.
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json() as { checkinId?: string; suggestionIndex?: number; done?: boolean };
    const { checkinId, suggestionIndex, done } = body;
    if (!checkinId || suggestionIndex == null || typeof done !== "boolean") {
      return NextResponse.json({ error: "Missing checkinId, suggestionIndex, or done" }, { status: 400 });
    }

    const { data: checkin } = await supabase
      .from("program_checkins")
      .select("id, ai_suggestions")
      .eq("id", checkinId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!checkin) return NextResponse.json({ error: "Check-in not found" }, { status: 404 });

    const suggestions = (checkin.ai_suggestions as CheckinSuggestion[] | null) ?? [];
    if (!suggestions[suggestionIndex]) {
      return NextResponse.json({ error: "Suggestion not found" }, { status: 404 });
    }

    const updatedSuggestions = suggestions.map((s, i) => (i === suggestionIndex ? { ...s, done } : s));

    const { data: updated, error } = await supabase
      .from("program_checkins")
      .update({ ai_suggestions: updatedSuggestions })
      .eq("id", checkinId)
      .select()
      .single();

    if (error || !updated) return NextResponse.json({ error: error?.message ?? "Couldn't update suggestion" }, { status: 500 });
    return NextResponse.json({ checkin: updated });
  } catch (err) {
    console.error("[goal-program/checkin PATCH]", err);
    return NextResponse.json({ error: (err as Error).message ?? "Couldn't update suggestion" }, { status: 500 });
  }
}
