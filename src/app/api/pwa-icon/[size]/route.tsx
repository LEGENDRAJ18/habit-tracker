import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ size: string }> },
) {
  const { size: sizeStr } = await params;
  const size = sizeStr === "512" ? 512 : 192;
  const pad  = Math.round(size * 0.18);
  const star = Math.round(size * 0.42);

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(145deg, #6d28d9 0%, #7c3aed 45%, #9333ea 100%)",
          position: "relative",
        }}
      >
        {/* Subtle inner glow */}
        <div
          style={{
            position: "absolute",
            top: "10%",
            left: "10%",
            right: "10%",
            bottom: "10%",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(167,139,250,0.35) 0%, transparent 70%)",
          }}
        />
        {/* Sparkle — four-pointed star made from two overlapping rounded rects */}
        <div
          style={{
            position: "relative",
            width: star,
            height: star,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Vertical arm */}
          <div
            style={{
              position: "absolute",
              width: Math.round(star * 0.28),
              height: star,
              background: "rgba(255,255,255,0.96)",
              borderRadius: star,
            }}
          />
          {/* Horizontal arm */}
          <div
            style={{
              position: "absolute",
              width: star,
              height: Math.round(star * 0.28),
              background: "rgba(255,255,255,0.96)",
              borderRadius: star,
            }}
          />
          {/* Diagonal arms (rotated) */}
          <div
            style={{
              position: "absolute",
              width: Math.round(star * 0.18),
              height: Math.round(star * 0.72),
              background: "rgba(255,255,255,0.55)",
              borderRadius: star,
              transform: "rotate(45deg)",
            }}
          />
          <div
            style={{
              position: "absolute",
              width: Math.round(star * 0.18),
              height: Math.round(star * 0.72),
              background: "rgba(255,255,255,0.55)",
              borderRadius: star,
              transform: "rotate(-45deg)",
            }}
          />
          {/* Center dot */}
          <div
            style={{
              position: "absolute",
              width: Math.round(star * 0.22),
              height: Math.round(star * 0.22),
              background: "white",
              borderRadius: "50%",
            }}
          />
        </div>

        {/* "AI" label at bottom — only on 512 size */}
        {size === 512 && (
          <div
            style={{
              position: "absolute",
              bottom: pad,
              fontSize: Math.round(size * 0.1),
              fontWeight: 800,
              color: "rgba(255,255,255,0.75)",
              letterSpacing: "0.12em",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            AI
          </div>
        )}
      </div>
    ),
    { width: size, height: size },
  );
}
