import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callOpenAIJSON } from "@/lib/openai";

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
{ "response": "2-3 sentences: acknowledge their rating, respond to what they shared, give one specific, encouraging suggestion for next week" }`;
    const userPrompt = `Self-rating this week: ${rating}/5
What went well: ${whatWentWell || "(not shared)"}
What was hard: ${whatWasHard || "(not shared)"}`;

    let aiResponse = "";
    try {
      const result = await callOpenAIJSON(systemPrompt, userPrompt) as { response?: string };
      aiResponse = result.response ?? "";
    } catch (err) {
      console.error("[goal-program/checkin] AI failed", err);
      aiResponse = "Thanks for checking in — keep going, one week at a time.";
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
        ai_response: aiResponse,
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
