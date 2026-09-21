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
    <main style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: 24 }}>
      <h1>Habbo Clone — Your House</h1>
      <p style={{ opacity: 0.7, maxWidth: 480, textAlign: "center" }}>
        Logged in as <strong>{username}</strong>. Use arrow keys / WASD to move.{" "}
        <button
          onClick={() => {
            logout();
            router.push("/login");
          }}
          style={{ background: "none", border: "none", color: "#5ac8fa", cursor: "pointer", textDecoration: "underline" }}
        >
          Log out
        </button>
      </p>
      {room.roomType === "PERSONAL" && (
        <button onClick={returnToSharedRoom}>Back to shared room</button>
      )}
      <PhaserGame houseId={room.houseId} roomId={room.roomId} />
    </main>
  );
}
