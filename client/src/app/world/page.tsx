"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

const WorldPhaserGame = dynamic(() => import("@/game/WorldPhaserGame"), { ssr: false });

export default function WorldPreviewPage() {
  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "24px",
        minHeight: "100vh",
        backgroundColor: "#0f172a",
        color: "#f8fafc",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <header
        style={{
          width: "100%",
          maxWidth: "960px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: "700", margin: "0 0 4px 0" }}>
            Town Ground Map & Overworld Preview
          </h1>
          <p style={{ margin: 0, fontSize: "14px", color: "#94a3b8" }}>
            Exported TileWeaver ground map with depth-sorted trees, bushes, and ambient fluttering butterflies.
          </p>
        </div>
        <Link
          href="/houses"
          style={{
            padding: "8px 16px",
            backgroundColor: "#334155",
            color: "#f8fafc",
            borderRadius: "6px",
            textDecoration: "none",
            fontSize: "14px",
            fontWeight: "500",
            border: "1px solid #475569",
          }}
        >
          ← Back to Houses
        </Link>
      </header>

      <WorldPhaserGame />
    </main>
  );
}
