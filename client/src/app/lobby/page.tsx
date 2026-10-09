"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken, getUsername, logout } from "@/lib/auth";

const LobbyPhaserGame = dynamic(() => import("@/game/LobbyPhaserGame"), { ssr: false });

export default function LobbyPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }
    setUsername(getUsername());
    setReady(true);
  }, [router]);

  if (!ready) return null;

  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "68px 20px 24px",
        minHeight: "100vh",
        background: "#0a0918",
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
          marginBottom: 14,
          padding: "12px 18px",
          borderBottom: "2px solid #4fd8e0",
        }}
      >
        <div>
          <h1 className="pixel-header" style={{ margin: "0 0 6px 0", fontSize: "12px", lineHeight: 1.4 }}>
            🛸 CENTRAL HOTEL LOBBY
          </h1>
          <span style={{ fontSize: "12px", color: "#8fe8ee" }}>
            Logged in as <strong style={{ color: "#4fd8e0" }}>{username}</strong>
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={() => router.push("/world")}
            className="btn-primary"
            style={{ fontSize: "10px", padding: "7px 14px" }}
          >
            🌍 OVERWORLD
          </button>

          <button
            onClick={() => router.push("/houses")}
            className="btn-secondary"
            style={{ fontSize: "10px", padding: "6px 12px" }}
          >
            HOUSES
          </button>

          <button
            onClick={() => {
              logout();
              router.push("/login");
            }}
            className="btn-secondary"
            style={{
              fontSize: "10px",
              padding: "6px 10px",
              borderColor: "#1f7a82",
              color: "#8fe8ee",
            }}
          >
            LOG OUT
          </button>
        </div>
      </header>

      <LobbyPhaserGame />
    </main>
  );
}
