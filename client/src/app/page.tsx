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

  if (error) {
    return (
      <main style={{ padding: "80px 24px", color: "#fca5a5", fontFamily: "var(--font-pixel)", fontSize: 12 }}>
        ⚠️ {error}
      </main>
    );
  }
  if (!ready || !room) return null;

  function returnToSharedRoom() {
    if (!room || room.roomType !== "PERSONAL") return;
    setSelectedRoom(room.houseId, room.sharedRoomId, "SHARED", room.sharedRoomId);
    setRoom({ ...room, roomId: room.sharedRoomId, roomType: "SHARED" });
  }

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
            🏡 {room.roomType === "PERSONAL" ? "PERSONAL ROOM" : "SHARED LIVING ROOM"}
          </h1>
          <span style={{ fontSize: "12px", color: "#8fe8ee" }}>
            Logged in as <strong style={{ color: "#4fd8e0" }}>{username}</strong>
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {room.roomType === "PERSONAL" && (
            <button
              onClick={returnToSharedRoom}
              className="btn-secondary"
              style={{ fontSize: "10px", padding: "6px 12px" }}
            >
              LIVING ROOM
            </button>
          )}

          <button
            id="nav-overworld-btn"
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

      <PhaserGame houseId={room.houseId} roomId={room.roomId} />
    </main>
  );
}
