"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function SplashScreen() {
  const router = useRouter();
  const [phase, setPhase] = useState<"pre" | "in" | "pulse" | "out" | "gone">("pre");

  useEffect(() => {
    // sessionStorage is empty on every cold PWA launch and new browser tab
    if (sessionStorage.getItem("habitai_splash")) {
      setPhase("gone");
      return;
    }
    sessionStorage.setItem("habitai_splash", "1");

    // Prefetch dashboard so it's instant when splash finishes
    router.prefetch("/dashboard");

    const t0 = setTimeout(() => setPhase("in"),    50);   // logo flies in
    const t1 = setTimeout(() => setPhase("pulse"),  600);  // settle into pulse
    const t2 = setTimeout(() => setPhase("out"),   1500);  // fade-out at 1.5 s
    const t3 = setTimeout(() => setPhase("gone"),  2150);  // unmount after fade
    return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (phase === "gone") return null;

  const isIn      = phase === "in" || phase === "pulse";
  const isPulsing = phase === "pulse";

  return (
    <div
      aria-hidden="true"
      style={{
        position:       "fixed",
        inset:          0,
        zIndex:         9999,
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        justifyContent: "center",
        /* Deep purple → black radial gradient — same as Life360 style */
        background:     "radial-gradient(ellipse 80% 60% at 50% 35%, #1e0b3e 0%, #0f0520 40%, #09090f 100%)",
        transition:     "opacity 0.65s cubic-bezier(0.4, 0, 0.2, 1)",
        opacity:        phase === "out" ? 0 : 1,
        pointerEvents:  phase === "out" ? "none" : "all",
        userSelect:     "none",
      }}
    >
      {/* Ambient glow layer behind icon */}
      <div
        style={{
          position:     "absolute",
          width:        "280px",
          height:       "280px",
          borderRadius: "50%",
          background:   "radial-gradient(circle, rgba(124,58,237,0.28) 0%, transparent 70%)",
          filter:       "blur(40px)",
          animation:    isPulsing ? "splashGlow 2.4s ease-in-out infinite" : "none",
          opacity:      isIn ? 1 : 0,
          transition:   "opacity 0.5s ease",
        }}
      />

      {/* Logo + text group */}
      <div
        style={{
          display:        "flex",
          flexDirection:  "column",
          alignItems:     "center",
          gap:            "22px",
          transform:      isIn ? "scale(1) translateY(0)" : "scale(0.78) translateY(18px)",
          opacity:        isIn ? 1 : 0,
          transition:     "transform 0.55s cubic-bezier(0.34,1.56,0.64,1), opacity 0.45s ease",
          position:       "relative",
        }}
      >
        {/* Icon */}
        <div
          style={{
            position:  "relative",
            animation: isPulsing ? "splashLogoPulse 2.4s ease-in-out infinite" : "none",
          }}
        >
          {/* Ring glow */}
          <div
            style={{
              position:     "absolute",
              inset:        "-14px",
              borderRadius: "34px",
              background:   "rgba(124,58,237,0.18)",
              filter:       "blur(18px)",
              animation:    isPulsing ? "splashRingGlow 2.4s ease-in-out infinite" : "none",
            }}
          />
          {/* Icon container */}
          <div
            style={{
              position:     "relative",
              width:        "96px",
              height:       "96px",
              borderRadius: "26px",
              overflow:     "hidden",
              boxShadow:    "0 10px 60px rgba(124,58,237,0.65), 0 0 0 1px rgba(139,92,246,0.3), 0 2px 8px rgba(0,0,0,0.6)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/icon-192.png"
              alt="HabitAI"
              width={96}
              height={96}
              style={{ display: "block", width: "100%", height: "100%" }}
            />
          </div>
        </div>

        {/* Brand name */}
        <p
          style={{
            margin:      0,
            fontSize:    "38px",
            fontWeight:  900,
            color:       "#ffffff",
            letterSpacing: "-0.6px",
            lineHeight:  1,
            fontFamily:  "var(--font-geist-sans, -apple-system, system-ui, sans-serif)",
          }}
        >
          habit<span style={{ color: "#a78bfa" }}>AI</span>
        </p>
      </div>

      {/* Bouncing dots */}
      <div
        style={{
          display:    "flex",
          gap:        "8px",
          marginTop:  "52px",
          opacity:    isIn ? 1 : 0,
          transition: "opacity 0.4s ease 0.3s",
          position:   "relative",
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width:        "7px",
              height:       "7px",
              borderRadius: "50%",
              background:   "#7c3aed",
              animation:    `splashDot 1.3s ease-in-out ${i * 0.22}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
