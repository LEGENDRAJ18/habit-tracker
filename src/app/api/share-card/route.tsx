import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type  = searchParams.get("type") ?? "streak"; // streak | level
  const value = parseInt(searchParams.get("value") ?? "7", 10);
  const tier  = searchParams.get("tier") ?? "";

  const isStreak = type === "streak";
  const isDaily  = type === "daily";
  const emoji    = isStreak ? "🔥" : isDaily ? "🎯" : "⚡";
  const headline = isStreak
    ? `${value}-Day Streak`
    : isDaily
    ? "All Done!"
    : `Level ${value}`;
  const sub = isStreak
    ? "Consistency is my superpower"
    : isDaily
    ? "Crushed every habit today"
    : tier ? `${tier} — Leveling up daily` : "Leveling up daily";

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #09090f 0%, #180836 50%, #09090f 100%)",
          fontFamily: "system-ui, -apple-system, sans-serif",
          position: "relative",
        }}
      >
        {/* Glow blob */}
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 520,
          height: 520,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(139,92,246,0.25) 0%, transparent 70%)",
        }} />

        {/* Card */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(15,15,26,0.9)",
          border: "1.5px solid rgba(109,40,217,0.4)",
          borderRadius: 32,
          padding: "56px 72px",
          gap: 0,
          boxShadow: "0 0 80px rgba(139,92,246,0.3), inset 0 1px 0 rgba(255,255,255,0.05)",
          minWidth: 740,
        }}>
          {/* HabitAI logo */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 40,
          }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: "linear-gradient(135deg, #7c3aed, #9333ea)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
            }}>
              ✨
            </div>
            <span style={{ fontSize: 28, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px" }}>
              habit<span style={{ color: "#a78bfa" }}>AI</span>
            </span>
          </div>

          {/* Emoji */}
          <div style={{ fontSize: 100, lineHeight: 1, marginBottom: 16 }}>{emoji}</div>

          {/* Headline */}
          <p style={{
            fontSize: 68,
            fontWeight: 900,
            color: "#fff",
            letterSpacing: "-2px",
            lineHeight: 1.05,
            margin: 0,
            textAlign: "center",
          }}>
            {headline}
          </p>

          {/* Gradient line */}
          <div style={{
            width: 120,
            height: 4,
            borderRadius: 99,
            background: "linear-gradient(90deg, #7c3aed, #e879f9)",
            margin: "24px 0 20px",
          }} />

          {/* Sub */}
          <p style={{
            fontSize: 26,
            color: "#a78bfa",
            fontWeight: 600,
            letterSpacing: "-0.3px",
            margin: 0,
            textAlign: "center",
          }}>
            {sub}
          </p>

          {/* Footer */}
          <p style={{
            fontSize: 18,
            color: "rgba(255,255,255,0.25)",
            marginTop: 36,
            letterSpacing: "0.05em",
          }}>
            habitai.app
          </p>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1080,
    }
  );
}
