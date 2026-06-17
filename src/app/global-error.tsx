"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalErrorBoundary] caught:", error.message, error.stack);
    try {
      posthog.capture("global_error_boundary", {
        error_message: error.message,
        error_stack:   error.stack?.slice(0, 1000),
        digest:        error.digest,
        url:           typeof window !== "undefined" ? window.location.href : "",
      });
    } catch {}
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#09090f", color: "#e2e8f0", fontFamily: "system-ui, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100dvh", textAlign: "center", padding: "2rem" }}>
        <div>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⚡</div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#fff", marginBottom: "0.5rem" }}>Something went wrong</h1>
          <p style={{ color: "#64748b", fontSize: "0.9rem", marginBottom: "1.5rem", lineHeight: 1.6 }}>
            An unexpected error occurred. Refreshing usually fixes it.
          </p>
          <button
            onClick={reset}
            style={{ padding: "0.75rem 2rem", background: "#7c3aed", color: "#fff", border: "none", borderRadius: "12px", fontSize: "0.95rem", fontWeight: 600, cursor: "pointer" }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
