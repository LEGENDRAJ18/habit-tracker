"use client";
import { useEffect, useState } from "react";

export default function SplashScreen() {
  const [phase, setPhase] = useState<"pre" | "in" | "out" | "gone">("pre");

  useEffect(() => {
    if (sessionStorage.getItem("habitai_splash")) {
      setPhase("gone");
      return;
    }
    sessionStorage.setItem("habitai_splash", "1");
    const t0 = setTimeout(() => setPhase("in"),  50);
    const t1 = setTimeout(() => setPhase("out"), 1800);
    const t2 = setTimeout(() => setPhase("gone"), 2400);
    return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (phase === "gone") return null;

  const visible = phase === "in";

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center select-none"
      style={{
        backgroundColor: "#09090f",
        transition: "opacity 0.55s ease-out",
        opacity: phase === "out" ? 0 : 1,
        pointerEvents: phase === "out" ? "none" : "all",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "18px",
          transform: visible ? "scale(1) translateY(0)" : "scale(0.82) translateY(14px)",
          opacity: visible ? 1 : 0,
          transition: "transform 0.55s cubic-bezier(0.34,1.56,0.64,1), opacity 0.4s ease",
        }}
      >
        {/* Logo icon */}
        <div style={{ position: "relative" }}>
          <div style={{
            position: "absolute",
            inset: "-20px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(124,58,237,0.25) 0%, transparent 70%)",
            filter: "blur(12px)",
          }} />
          <div style={{
            position: "relative",
            width: "84px",
            height: "84px",
            borderRadius: "24px",
            background: "linear-gradient(135deg, #7c3aed 0%, #9333ea 60%, #6d28d9 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 8px 48px rgba(124,58,237,0.55), 0 0 0 1px rgba(139,92,246,0.3)",
          }}>
            <span style={{ fontSize: "40px", lineHeight: 1 }}>✨</span>
          </div>
        </div>

        {/* Text */}
        <div style={{ textAlign: "center" }}>
          <p style={{
            margin: 0,
            fontSize: "34px",
            fontWeight: 900,
            color: "#ffffff",
            letterSpacing: "-0.5px",
            fontFamily: "var(--font-geist-sans, system-ui)",
            lineHeight: 1,
          }}>
            habit<span style={{ color: "#a78bfa" }}>AI</span>
          </p>
          <p style={{
            margin: "6px 0 0",
            fontSize: "13px",
            color: "#7c3aed",
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}>
            your AI habit coach
          </p>
        </div>

        {/* Loading dots */}
        <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "#7c3aed",
                animation: `splashDot 1.2s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
