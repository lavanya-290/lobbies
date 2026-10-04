"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken, getUsername, logout } from "@/lib/auth";
import { getSelectedRoom, setSelectedRoom } from "@/lib/session";

// Phaser touches `window`, so it must never be server-rendered.
const PhaserGame = dynamic(() => import("@/game/PhaserGame"), { ssr: false });

export default function HomePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [room, setRoom] = useState<ReturnType<typeof getSelectedRoom>>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }
    setUsername(getUsername());
    const selectedRoom = getSelectedRoom();
    if (!selectedRoom) {
      router.push("/houses");
      return;
    }
    setRoom(selectedRoom);
    setReady(true);
  }, [router]);

  if (error) return <main style={{ padding: 24, color: "#f66" }}>{error}</main>;
  if (!ready || !room) return null; // brief flash while we load the user's house

  function returnToSharedRoom() {
    if (!room || room.roomType !== "PERSONAL") return;
    setSelectedRoom(room.houseId, room.sharedRoomId, "SHARED", room.sharedRoomId);
    setRoom({ ...room, roomId: room.sharedRoomId, roomType: "SHARED" });
  }

  return (
    <main style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "16px 24px", minHeight: "100vh", background: "#0d0e15", color: "#f8fafc", fontFamily: "system-ui, sans-serif" }}>
      <header
        style={{
          width: "100%",
          maxWidth: "800px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 12,
          padding: "10px 16px",
          background: "#181a26",
          borderRadius: "10px",
          border: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <div>
          <h1 style={{ margin: "0 0 2px 0", fontSize: "18px", fontWeight: "700" }}>
            🏡 Your House {room.roomType === "PERSONAL" ? "(Personal Room)" : "(Shared Living Room)"}
          </h1>
          <span style={{ fontSize: "12px", color: "#94a3b8" }}>
            Logged in as <strong style={{ color: "#38bdf8" }}>{username}</strong>
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {room.roomType === "PERSONAL" && (
            <button
              onClick={returnToSharedRoom}
              style={{
                padding: "6px 12px",
                background: "#334155",
                color: "#f8fafc",
                border: "none",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Living Room
            </button>
          )}

          <button
            id="nav-overworld-btn"
            onClick={() => router.push("/world")}
            style={{
              padding: "7px 14px",
              background: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              fontSize: "13px",
              fontWeight: "700",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(16, 185, 129, 0.3)",
            }}
          >
            🌍 Enter Overworld
          </button>

          <button
            onClick={() => router.push("/houses")}
            style={{
              padding: "7px 14px",
              background: "#1e293b",
              color: "#cbd5e1",
              border: "1px solid #334155",
              borderRadius: "6px",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            Houses List
          </button>

          <button
            onClick={() => {
              logout();
              router.push("/login");
            }}
            style={{
              padding: "7px 12px",
              background: "none",
              border: "none",
              color: "#ef4444",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            Log out
          </button>
        </div>
      </header>

      <PhaserGame houseId={room.houseId} roomId={room.roomId} />
    </main>
  );
}

