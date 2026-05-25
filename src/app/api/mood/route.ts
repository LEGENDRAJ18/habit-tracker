import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("mood_logs")
      .select("id, mood, note, logged_at")
      .eq("user_id", user.id)
      .order("logged_at", { ascending: false })
      .limit(90);

    if (error) throw error;
    return NextResponse.json({ moods: data ?? [] });
  } catch (err) {
    console.error("[mood GET]", err);
    return NextResponse.json({ error: "Failed to load moods" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { mood, note } = await request.json() as { mood: number; note?: string };
    if (!mood || mood < 1 || mood > 5) {
      return NextResponse.json({ error: "mood must be 1–5" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("mood_logs")
      .insert({ user_id: user.id, mood, note: note?.trim() || null })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ mood: data });
  } catch (err) {
    console.error("[mood POST]", err);
    return NextResponse.json({ error: "Failed to save mood" }, { status: 500 });
  }
}
