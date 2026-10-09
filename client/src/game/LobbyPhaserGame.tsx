"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getHouses, createHouse, House } from "@/lib/houses";
import { setSelectedRoom } from "@/lib/session";
import { LobbyScene } from "./scenes/LobbyScene";
import LobbyDestinationModal from "./LobbyDestinationModal";

export default function LobbyPhaserGame() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<import("phaser").Game | null>(null);

  const [destinationOpen, setDestinationOpen] = useState(false);
  const [busyRouting, setBusyRouting] = useState(false);

  // Fast direct warp to player's house (Door interaction)
  async function handleEnterHouse() {
    if (busyRouting) return;
    setBusyRouting(true);
    try {
      let houses = await getHouses();
      if (houses.length === 0) {
        houses = [await createHouse()];
      }
      const primaryHouse = houses[0];
      if (primaryHouse?.sharedRoom) {
        setSelectedRoom(
          primaryHouse.id,
          primaryHouse.sharedRoom.id,
          "SHARED",
          primaryHouse.sharedRoom.id
        );
        router.push("/");
      } else {
        router.push("/houses");
      }
    } catch (err) {
      console.error("[Lobby] Failed to enter house directly:", err);
      router.push("/houses");
    } finally {
      setBusyRouting(false);
    }
  }

  useEffect(() => {
    let destroyed = false;

    import("./lobbyMain").then(({ createLobbyGame }) => {
      if (destroyed || !containerRef.current) return;

      gameRef.current = createLobbyGame(containerRef.current, {
        onKioskClick: () => {
          setDestinationOpen(true);
        },
        onDoorClick: () => {
          void handleEnterHouse();
        },
      });

      if (typeof window !== "undefined") {
        (window as any).__PHASER_LOBBY_GAME__ = gameRef.current;
      }
    });

    return () => {
      destroyed = true;
      if (gameRef.current) {
        try {
          const scene = gameRef.current.scene.getScene("LobbyScene") as LobbyScene | undefined;
          scene?.leaveRoom();
        } catch (e) {
          console.warn("[LobbyPhaserGame] Error leaving room on unmount:", e);
        }
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  return (
    <div
      style={{
        position: "relative",
        width: 800,
        height: 600,
        overflow: "hidden",
        borderRadius: 2,
        border: "2px solid #4fd8e0",
        boxShadow: "0 16px 40px rgba(0,0,0,0.8), 2px 2px 0px #1f7a82",
      }}
    >
      <div ref={containerRef} id="lobby-phaser-container" />

      {/* Top Overlay HUD Bar */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "rgba(10, 16, 22, 0.9)",
          borderBottom: "2px solid #4fd8e0",
          zIndex: 10,
          pointerEvents: "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, pointerEvents: "auto" }}>
          <div
            style={{
              backgroundColor: "rgba(10, 16, 22, 0.95)",
              border: "2px solid #4fd8e0",
              borderRadius: 2,
              padding: "5px 10px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              boxShadow: "2px 2px 0px #1f7a82",
            }}
          >
            <span style={{ fontSize: 14 }}>🛸</span>
            <span
              style={{
                fontFamily: "var(--font-pixel)",
                fontSize: 10,
                color: "#dffcff",
              }}
            >
              CENTRAL HOTEL LOBBY
            </span>
          </div>

          <div
            style={{
              backgroundColor: "rgba(10, 16, 22, 0.9)",
              border: "2px solid #1f7a82",
              borderRadius: 2,
              padding: "4px 8px",
              fontSize: 9,
              fontFamily: "var(--font-pixel)",
              color: "#4fd8e0",
              textTransform: "uppercase",
            }}
          >
            SHARED HUB
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, pointerEvents: "auto" }}>
          <button
            onClick={() => setDestinationOpen(true)}
            className="btn-primary"
            style={{ fontSize: 9, padding: "6px 12px" }}
          >
            <span>🖥️</span>
            <span>DESTINATIONS</span>
          </button>

          <button
            onClick={() => void handleEnterHouse()}
            disabled={busyRouting}
            className="btn-secondary"
            style={{ fontSize: 9, padding: "6px 12px" }}
          >
            <span>🚪</span>
            <span>{busyRouting ? "WARPING..." : "MY HOUSE"}</span>
          </button>
        </div>
      </div>

      {/* Destination Modal (opened via Kiosk hotspot or button) */}
      {destinationOpen && (
        <LobbyDestinationModal
          onClose={() => setDestinationOpen(false)}
          onEnterHouse={() => void handleEnterHouse()}
        />
      )}
    </div>
  );
}
