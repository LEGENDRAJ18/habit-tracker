import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const SIZE = { width: 1200, height: 630 };

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data } = await admin
    .from("share_tokens")
    .select("achievement_emoji, achievement_name, achievement_description, user_display_name, user_streak, user_level")
    .eq("token", id)
    .maybeSingle();

  const emoji       = data?.achievement_emoji       ?? "🏆";
  const name        = data?.achievement_name        ?? "Achievement Unlocked";
  const description = data?.achievement_description ?? "Building great habits on HabitAI";
  const displayName = data?.user_display_name       ?? "HabitAI User";
  const streak      = data?.user_streak             ?? 0;
  const level       = data?.user_level              ?? 1;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#09090f",
          fontFamily: "system-ui, -apple-system, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background glows */}
        <div style={{ position: "absolute", top: "-10%", left: "10%", width: 600, height: 600, borderRadius: "50%", background: "rgba(109,40,217,0.2)", filter: "blur(120px)" }} />
        <div style={{ position: "absolute", bottom: "-10%", right: "10%", width: 400, height: 400, borderRadius: "50%", background: "rgba(147,51,234,0.15)", filter: "blur(100px)" }} />

        {/* Card */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            background: "linear-gradient(135deg, rgba(109,40,217,0.25) 0%, rgba(15,15,26,0.95) 60%, rgba(10,10,24,0.98) 100%)",
            border: "1px solid rgba(139,92,246,0.35)",
            borderRadius: 32,
            padding: "52px 72px",
            maxWidth: 880,
            width: "100%",
            boxShadow: "0 0 0 1px rgba(139,92,246,0.1), 0 40px 100px rgba(0,0,0,0.7), 0 0 120px rgba(109,40,217,0.12)",
            position: "relative",
          }}
        >
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 36 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg, #7c3aed, #9333ea)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 24px rgba(124,58,237,0.5)" }}>
              <span style={{ fontSize: 24, lineHeight: 1 }}>✨</span>
            </div>
            <span style={{ fontSize: 28, fontWeight: 800, color: "#ffffff", letterSpacing: "-0.5px" }}>
              habit<span style={{ color: "#a78bfa" }}>AI</span>
            </span>
          </div>

          {/* Achievement emoji */}
          <div style={{ fontSize: 96, lineHeight: 1, marginBottom: 24 }}>{emoji}</div>

          {/* Achievement name */}
          <div style={{ fontSize: 42, fontWeight: 800, color: "#ffffff", textAlign: "center", letterSpacing: "-0.5px", marginBottom: 12, lineHeight: 1.1 }}>
            {name}
          </div>

          {/* Description */}
          <div style={{ fontSize: 20, color: "#94a3b8", textAlign: "center", maxWidth: 620, lineHeight: 1.4, marginBottom: 36 }}>
            {description}
          </div>

          {/* Divider */}
          <div style={{ width: "100%", height: 1, background: "linear-gradient(90deg, transparent, rgba(139,92,246,0.3), transparent)", marginBottom: 32 }} />

          {/* User + stats row */}
          <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
            {/* User */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: "linear-gradient(135deg, #7c3aed, #a855f7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: "#ffffff", boxShadow: "0 0 16px rgba(124,58,237,0.4)" }}>
                {displayName.slice(0, 2).toUpperCase()}
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: "#ffffff" }}>{displayName}</span>
                <span style={{ fontSize: 14, color: "#64748b" }}>just earned this</span>
              </div>
            </div>

            {/* Divider */}
            <div style={{ width: 1, height: 40, background: "rgba(139,92,246,0.2)" }} />

            {/* Streak */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <span style={{ fontSize: 24, fontWeight: 800, color: "#fb923c" }}>🔥 {streak}</span>
              <span style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>day streak</span>
            </div>

            {/* Divider */}
            <div style={{ width: 1, height: 40, background: "rgba(139,92,246,0.2)" }} />

            {/* Level */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <span style={{ fontSize: 24, fontWeight: 800, color: "#a78bfa" }}>⚡ {level}</span>
              <span style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>level</span>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...SIZE },
  );
}
