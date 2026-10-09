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
        padding: "68px 20px 24px",
        minHeight: "100vh",
        backgroundColor: "#0a0918",
        color: "#dffcff",
      }}
    >
      <header
        className="chrome-panel"
        style={{
          width: "100%",
          maxWidth: "800px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: "14px",
          padding: "12px 18px",
          borderBottom: "2px solid #4fd8e0",
        }}
      >
        <div>
          <h1 className="pixel-header" style={{ fontSize: "12px", margin: "0 0 6px 0", lineHeight: 1.4 }}>
            🌍 TOWN OVERWORLD
          </h1>
          <p style={{ margin: 0, fontSize: "12px", color: "#8fe8ee" }}>
            Depth-sorted trees, berry bushes, and ambient fluttering butterflies.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Link
            href="/lobby"
            className="btn-secondary"
            style={{ fontSize: "10px", padding: "6px 14px" }}
          >
            🛸 LOBBY
          </Link>
          <Link
            href="/houses"
            className="btn-secondary"
            style={{ fontSize: "10px", padding: "6px 14px" }}
          >
            ← HOUSES
          </Link>
        </div>
      </header>

      <WorldPhaserGame />
    </main>
  );
}
