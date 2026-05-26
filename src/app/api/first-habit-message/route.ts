import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { habitName, goals } = await req.json() as { habitName: string; goals: string[] };
  if (!habitName) return new Response("Missing habitName", { status: 400 });

  const goalsStr = goals?.length > 0 ? goals.join(" and ") : "personal growth";

  const prompt = `You are a personal AI habit coach — warm, direct, and genuinely invested. A new user just added their very first habit.

Their goals: ${goalsStr}
Their first habit: "${habitName}"

Write a SHORT personal coach message — exactly 3 sentences, under 90 words total.
Sentence 1: Open with "Hey!" and acknowledge their specific habit and goal like you've been waiting for them. Sound genuinely excited, not corporate.
Sentence 2: Share one surprising, specific insight about why THIS habit works for their goal. Sound like you've coached hundreds of people on exactly this.
Sentence 3: Name the one thing that kills this habit in week 1 (specific, not generic) and give them a concrete 5-to-8-word action to prevent it.

Rules: Start with "Hey!". Sound human and personal, like a real coach texting them. No "great choice" clichés. No bullet points. Address them directly as "you".`;

  const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      stream: true,
      max_tokens: 170,
      temperature: 0.75,
      messages: [
        { role: "system", content: "You are a direct, insightful habit coach. Be specific. Be brief. Sound human, not like a chatbot." },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!openaiRes.ok || !openaiRes.body) {
    return new Response("AI unavailable", { status: 503 });
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let buffer = "";

  const readable = new ReadableStream({
    async start(controller) {
      const reader = openaiRes.body!.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;
            try {
              const token = (JSON.parse(data) as { choices: [{ delta: { content?: string } }] })
                .choices[0]?.delta?.content ?? "";
              if (token) controller.enqueue(encoder.encode(token));
            } catch { /* skip malformed chunk */ }
          }
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
