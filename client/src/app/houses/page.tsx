"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";
import { createHouse, getHouses, getHouseByInvite, getOrCreatePersonalRoom, joinHouse, House, InvitePreview } from "@/lib/houses";
import { setSelectedRoom } from "@/lib/session";
import { getHouseFloorTile } from "@/lib/floors";

export default function HousesPage() {
  const router = useRouter();
  const [houses, setHouses] = useState<House[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState("");
  const [invitePreview, setInvitePreview] = useState<InvitePreview | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }
    void loadHouses();
  }, [router]);

  async function loadHouses() {
    try {
      let loaded = await getHouses();
      if (loaded.length === 0) loaded = [await createHouse()];
      setHouses(loaded);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load houses.");
    }
  }

  function enterRoom(house: House, roomId: string, roomType: "SHARED" | "PERSONAL") {
    if (!house.sharedRoom) return;
    setSelectedRoom(house.id, roomId, roomType, house.sharedRoom.id);
    router.push("/");
  }

  async function enterPersonalRoom(house: House) {
    setBusy(house.id);
    setError(null);
    try {
      const room = await getOrCreatePersonalRoom(house.id);
      enterRoom(house, room.id, "PERSONAL");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open your room.");
    } finally {
      setBusy(null);
    }
  }

  async function previewInvite() {
    setError(null);
    try {
      setInvitePreview(await getHouseByInvite(inviteCode));
    } catch (err) {
      setInvitePreview(null);
      setError(err instanceof Error ? err.message : "Could not find that invite.");
    }
  }

  async function confirmJoin() {
    if (!invitePreview) return;
    setBusy("join");
    setError(null);
    try {
      await joinHouse(invitePreview.id, inviteCode);
      const joinedHouse = (await getHouses()).find((house) => house.id === invitePreview.id);
      if (!joinedHouse?.sharedRoom) throw new Error("Joined house has no shared room.");
      enterRoom(joinedHouse, joinedHouse.sharedRoom.id, "SHARED");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join that house.");
    } finally {
      setBusy(null);
    }
  }

  if (error) {
    return (
      <main style={{ padding: "80px 24px", color: "#fca5a5", fontFamily: "var(--font-pixel)", fontSize: 12 }}>
        ⚠️ {error}
      </main>
    );
  }

  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 24,
        padding: "80px 24px 48px",
        maxWidth: 760,
        margin: "0 auto",
        minHeight: "100vh",
        background: "#0a0918",
      }}
    >
      {/* Overworld Entry Hero Card */}
      <section
        className="chrome-panel"
        style={{
          padding: "24px 28px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div style={{ maxWidth: 440 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 20 }}>🌍</span>
            <h2 className="pixel-header" style={{ margin: 0, fontSize: 14 }}>
              TOWN OVERWORLD
            </h2>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: "#8fe8ee", lineHeight: 1.5 }}>
            Step outside into the shared town square! Explore lush flora, berry bushes, and fluttering butterflies with other players.
          </p>
        </div>
        <button
          id="enter-overworld-btn"
          onClick={() => router.push("/world")}
          className="btn-primary"
          style={{ fontSize: 11, padding: "12px 20px" }}
        >
          ENTER OVERWORLD →
        </button>
      </section>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 className="pixel-header" style={{ margin: 0, fontSize: 16 }}>
          YOUR HOUSES
        </h1>
      </div>

      {houses.map((house) => {
        const floorDef = getHouseFloorTile(house.sharedRoom?.id || house.id);
        return (
          <section
            key={house.id}
            className="chrome-panel"
            style={{
              padding: "20px 24px",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <h2 className="pixel-header" style={{ margin: 0, fontSize: 13 }}>
                HOUSE #{house.id.slice(0, 6).toUpperCase()}
              </h2>
              <span
                style={{
                  fontSize: 10,
                  fontFamily: "var(--font-pixel)",
                  padding: "4px 8px",
                  borderRadius: 2,
                  background: "rgba(10, 16, 22, 0.9)",
                  color: "#4fd8e0",
                  border: "2px solid #1f7a82",
                }}
              >
                FLOOR: {floorDef.name.toUpperCase()}
              </span>
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button
                disabled={!house.sharedRoom}
                onClick={() => house.sharedRoom && enterRoom(house, house.sharedRoom.id, "SHARED")}
                className="btn-primary"
                style={{ fontSize: 10, padding: "10px 16px" }}
              >
                ENTER SHARED ROOM
              </button>
              <button
                disabled={busy === house.id}
                onClick={() => void enterPersonalRoom(house)}
                className="btn-secondary"
                style={{ fontSize: 10, padding: "10px 16px" }}
              >
                {busy === house.id ? "OPENING..." : "MY PERSONAL ROOM"}
              </button>
            </div>

            {house.isOwner && house.inviteCode && (
              <div
                style={{
                  fontSize: 12,
                  color: "#8fe8ee",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  paddingTop: 4,
                  borderTop: "1px solid rgba(79, 216, 224, 0.2)",
                }}
              >
                <span>Invite code:</span>
                <span
                  style={{
                    fontFamily: "var(--font-pixel)",
                    fontSize: 10,
                    color: "#dffcff",
                    letterSpacing: 1,
                  }}
                >
                  {house.inviteCode}
                </span>
                <button
                  onClick={() => void navigator.clipboard.writeText(house.inviteCode!)}
                  className="btn-secondary"
                  style={{
                    padding: "3px 8px",
                    fontSize: 9,
                  }}
                >
                  COPY
                </button>
              </div>
            )}
          </section>
        );
      })}

      {/* Join Another House */}
      <section
        className="chrome-panel"
        style={{
          padding: "20px 24px",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <h2 className="pixel-header" style={{ margin: 0, fontSize: 13 }}>
          JOIN ANOTHER HOUSE
        </h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input
            value={inviteCode}
            onChange={(event) => setInviteCode(event.target.value)}
            placeholder="Enter invite code"
            className="input-chrome"
            style={{ flex: "1 1 220px" }}
          />
          <button
            disabled={!inviteCode.trim()}
            onClick={() => void previewInvite()}
            className="btn-primary"
            style={{ fontSize: 10, padding: "10px 18px" }}
          >
            PREVIEW
          </button>
        </div>

        {invitePreview && (
          <div
            style={{
              padding: 14,
              background: "rgba(10, 16, 22, 0.95)",
              border: "2px solid #4fd8e0",
              borderRadius: 2,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <p style={{ margin: 0, color: "#dffcff", fontSize: 13 }}>
              Join <strong>{invitePreview.ownerUsername}</strong>&apos;s house ({invitePreview.roomCount} rooms)?
            </p>
            <div>
              <button
                disabled={busy === "join"}
                onClick={() => void confirmJoin()}
                className="btn-primary"
                style={{ fontSize: 10, padding: "8px 16px" }}
              >
                {busy === "join" ? "JOINING..." : "CONFIRM & JOIN HOUSE"}
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
