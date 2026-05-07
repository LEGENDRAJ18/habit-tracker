import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { habitName, goals } = await req.json() as { habitName: string; goals: string[] };
  if (!habitName) return new Response("Missing habitName", { status: 400 });

  const goalsStr = goals?.length > 0 ? goals.join(" and ") : "personal growth";

  const prompt = `You are a world-class habit coach. A new user just added their very first habit.

Their goals: ${goalsStr}
Their first habit: "${habitName}"

Write a SHORT coach message in exactly 3 sentences (under 90 words total):
Sentence 1: Validate their specific choice and connect it directly to their stated goal(s). Be non-generic — mention the goal and habit specifically.
Sentence 2: Share one data-driven insight about why this SPECIFIC habit works for this goal. Make it sound like you have real behavioral research data.
Sentence 3: Name their single biggest risk in week 1 (specific to this habit), then give one concrete 5-to-8-word tactic to beat it.

Rules: No bullet points. Don't start with "I". No "great choice" or "well done" clichés. Sound like a coach who has worked with thousands of people doing exactly this habit. Address them directly.`;

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
