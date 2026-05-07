import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { goals, habitCount, completionCount } = await req.json() as {
    goals: string[];
    habitCount: number;
    completionCount: number;
  };

  const goalsStr = goals?.length > 0 ? goals.join(" and ") : "personal growth";
  const avgPerDay = completionCount > 0 ? (completionCount / 3).toFixed(1) : "0";

  const prompt = `A user is 3 days into their habit journey. You are their coach and you've been watching their data.

Their goals: ${goalsStr}
Number of habits they're tracking: ${habitCount}
Total completions in 3 days: ${completionCount} (~${avgPerDay}/day average)

Write exactly 2 sentences (under 70 words):
Sentence 1: One specific, non-obvious observation about what their completion pattern reveals. Start with "You've been..." or "Your ${completionCount} completions..." — reference the actual number to make it feel real.
Sentence 2: "Most people quit on day 4 because [one specific psychological reason]. You won't because [one specific reason grounded in their actual numbers and goals]."

Do not use generic praise. Sound like you analyzed their actual data. Be direct and specific.`;

  const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      stream: true,
      max_tokens: 130,
      temperature: 0.7,
      messages: [
        { role: "system", content: "You are a precise habit coach. Observe, analyze, and predict. Be specific to their data." },
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
            } catch { /* skip */ }
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
