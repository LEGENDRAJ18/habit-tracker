import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("subscription_tier, goal, goals")
      .eq("id", user.id)
      .single();

    if (!profile || profile.subscription_tier !== "pro") {
      return NextResponse.json({ error: "Voice check-ins are a Pro feature." }, { status: 403 });
    }

    const body = await request.json() as {
      habitId: string;
      habitLogId: string | null;
      habitName: string;
      transcript: string;
    };
    const { habitId, habitLogId, habitName, transcript } = body;

    if (!transcript?.trim()) {
      return NextResponse.json({ error: "No transcript provided" }, { status: 400 });
    }

    // Store transcript in habit_logs
    if (habitLogId) {
      await admin
        .from("habit_logs")
        .update({ voice_transcription: transcript.trim(), has_voice_note: true })
        .eq("id", habitLogId);
    } else if (habitId) {
      // Log if no habitLogId provided
      await admin
        .from("habit_logs")
        .insert({
          habit_id: habitId,
          user_id: user.id,
          voice_transcription: transcript.trim(),
          has_voice_note: true,
        });
    }

    // Get AI coaching from transcript
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ coaching: "Great job checking in! Keep up the momentum." });
    }

    const userGoals: string[] =
      Array.isArray(profile.goals) ? profile.goals as string[]
      : profile.goal ? [profile.goal as string]
      : [];

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a warm, insightful habit coach. The user has completed a habit and left a voice note about it. Respond with a brief, personalized coaching response (2-3 sentences max). Acknowledge what they said, offer one specific insight or encouragement, and end with a forward-looking motivational note. Be conversational, warm, and specific to what they said.

Respond ONLY with valid JSON: { "coaching": "your 2-3 sentence response" }`,
          },
          {
            role: "user",
            content: `Habit: "${habitName}"
User goals: ${userGoals.join(", ") || "not set"}
Voice note transcript: "${transcript}"

Give a personalized coaching response to this voice note.`,
          },
        ],
        max_tokens: 200,
        temperature: 0.8,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ coaching: "Great job checking in! Your reflection shows real commitment to your habit." });
    }

    const data   = await res.json();
    const parsed = JSON.parse(data.choices[0].message.content) as { coaching: string };
    return NextResponse.json({ coaching: parsed.coaching });
  } catch (err) {
    console.error("[voice-checkin]", err);
    return NextResponse.json({ coaching: "Voice note saved! Keep up the great work." });
  }
}
