import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "HabitAI - AI Habit Coaching That Actually Works";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
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
          fontFamily: "system-ui, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background glow blobs */}
        <div
          style={{
            position: "absolute",
            top: "10%",
            left: "20%",
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: "rgba(124,58,237,0.18)",
            filter: "blur(100px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "10%",
            right: "20%",
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: "rgba(109,40,217,0.15)",
            filter: "blur(90px)",
          }}
        />

        {/* Logo mark */}
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 18,
            background: "linear-gradient(135deg, #7c3aed, #9333ea)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 28,
            boxShadow: "0 0 40px rgba(124,58,237,0.5)",
          }}
        >
          <span style={{ fontSize: 38, lineHeight: 1 }}>✨</span>
        </div>

        {/* Wordmark */}
        <div
          style={{
            fontSize: 64,
            fontWeight: 800,
            color: "#ffffff",
            letterSpacing: "-1px",
            marginBottom: 16,
            display: "flex",
          }}
        >
          habit
          <span style={{ color: "#a78bfa" }}>AI</span>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 26,
            color: "#94a3b8",
            textAlign: "center",
            maxWidth: 700,
            lineHeight: 1.4,
            marginBottom: 40,
          }}
        >
          AI habit coaching that actually works
        </div>

        {/* Pills */}
        <div style={{ display: "flex", gap: 12 }}>
          {["Streak Protection", "AI Coaching", "Weekly Insights"].map((label) => (
            <div
              key={label}
              style={{
                background: "rgba(124,58,237,0.18)",
                border: "1px solid rgba(124,58,237,0.4)",
                borderRadius: 999,
                padding: "8px 20px",
                fontSize: 16,
                color: "#c4b5fd",
                fontWeight: 600,
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
