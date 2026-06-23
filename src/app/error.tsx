"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#0A0F1A", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
            <span style={{ fontSize: 28 }}>⚠️</span>
          </div>
          <h1 style={{ color: "#ffffff", fontWeight: 800, fontSize: 28, margin: "0 0 12px" }}>Something went wrong</h1>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 16, margin: "0 0 32px", maxWidth: 400, lineHeight: 1.6 }}>
            We hit an unexpected error. Our team has been notified.
          </p>
          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={reset}
              style={{ background: "linear-gradient(135deg,#F5A623,#FF7B2E)", color: "#0A0F1A", border: "none", borderRadius: 100, padding: "12px 24px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
            >
              Try again
            </button>
            <a href="/" style={{ background: "transparent", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 100, padding: "12px 24px", fontWeight: 600, fontSize: 14, textDecoration: "none" }}>
              Go home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
