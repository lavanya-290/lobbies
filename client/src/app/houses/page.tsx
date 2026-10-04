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

  if (error) return <main style={{ padding: 24, color: "#f66" }}>{error}</main>;

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: 20, padding: 24, maxWidth: 680, margin: "0 auto", fontFamily: "system-ui, sans-serif" }}>
      {/* Overworld Entry Hero Card */}
      <section
        style={{
          background: "linear-gradient(135deg, #1e3a8a 0%, #065f46 100%)",
          padding: "20px 24px",
          borderRadius: "12px",
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.4)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
          color: "#ffffff",
          border: "1px solid rgba(255, 255, 255, 0.15)",
        }}
      >
        <div>
          <h2 style={{ margin: "0 0 6px 0", fontSize: "22px", display: "flex", alignItems: "center", gap: "8px" }}>
            <span>🌍</span> Town Overworld
          </h2>
          <p style={{ margin: 0, fontSize: "14px", color: "rgba(255, 255, 255, 0.85)", maxWidth: 380 }}>
            Roam together in the shared town square! Explore depth-sorted trees, berry bushes, and ambient fluttering butterflies with everyone online.
          </p>
        </div>
        <button
          id="enter-overworld-btn"
          onClick={() => router.push("/world")}
          style={{
            padding: "12px 24px",
            backgroundColor: "#10b981",
            color: "#ffffff",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "700",
            fontSize: "15px",
            boxShadow: "0 4px 14px rgba(16, 185, 129, 0.4)",
            transition: "all 0.15s ease",
          }}
        >
          Enter Overworld →
        </button>
      </section>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0, fontSize: "24px", color: "#f8fafc" }}>Your Houses</h1>
      </div>

      {houses.map((house) => {
        const floorDef = getHouseFloorTile(house.sharedRoom?.id || house.id);
        return (
          <section
            key={house.id}
            style={{
              background: "#1e2235",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "12px",
              padding: 20,
              display: "flex",
              flexDirection: "column",
              gap: 12,
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <h2 style={{ margin: 0, fontSize: "18px", color: "#f8fafc" }}>House #{house.id.slice(0, 6)}</h2>
              <span
                style={{
                  fontSize: "12px",
                  padding: "4px 10px",
                  borderRadius: "20px",
                  background: "rgba(56, 189, 248, 0.15)",
                  color: "#38bdf8",
                  border: "1px solid rgba(56, 189, 248, 0.3)",
                  fontWeight: "600",
                }}
              >
                Unique Floor: {floorDef.name}
              </span>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                disabled={!house.sharedRoom}
                onClick={() => house.sharedRoom && enterRoom(house, house.sharedRoom.id, "SHARED")}
                style={{
                  padding: "10px 18px",
                  backgroundColor: "#3b82f6",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Enter Shared Room
              </button>
              <button
                disabled={busy === house.id}
                onClick={() => void enterPersonalRoom(house)}
                style={{
                  padding: "10px 18px",
                  backgroundColor: "#475569",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                {busy === house.id ? "Opening..." : "My Personal Room"}
              </button>
            </div>

            {house.isOwner && house.inviteCode && (
              <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#94a3b8" }}>
                Invite code: <strong style={{ color: "#f8fafc" }}>{house.inviteCode}</strong>{" "}
                <button
                  onClick={() => void navigator.clipboard.writeText(house.inviteCode!)}
                  style={{
                    marginLeft: 6,
                    padding: "2px 8px",
                    background: "rgba(255, 255, 255, 0.1)",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    borderRadius: "4px",
                    color: "#f8fafc",
                    fontSize: "12px",
                    cursor: "pointer",
                  }}
                >
                  Copy
                </button>
              </p>
            )}
          </section>
        );
      })}

      <section
        style={{
          background: "#181b29",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "12px",
          padding: 20,
        }}
      >
        <h2 style={{ marginTop: 0, fontSize: "18px", color: "#f8fafc" }}>Join Another House</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input
            value={inviteCode}
            onChange={(event) => setInviteCode(event.target.value)}
            placeholder="Enter invite code"
            style={{
              padding: "10px 14px",
              background: "#0f111a",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: "6px",
              color: "#f8fafc",
              fontSize: "14px",
              flex: "1 1 200px",
            }}
          />
          <button
            disabled={!inviteCode.trim()}
            onClick={() => void previewInvite()}
            style={{
              padding: "10px 18px",
              background: "#3b82f6",
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            Preview
          </button>
        </div>
        {invitePreview && (
          <div style={{ marginTop: 14, padding: 12, background: "rgba(59, 130, 246, 0.1)", borderRadius: 8, border: "1px solid rgba(59, 130, 246, 0.2)" }}>
            <p style={{ margin: "0 0 10px 0", color: "#93c5fd" }}>
              Join <strong>{invitePreview.ownerUsername}</strong>&apos;s house ({invitePreview.roomCount} rooms)?
            </p>
            <button
              disabled={busy === "join"}
              onClick={() => void confirmJoin()}
              style={{
                padding: "8px 16px",
                background: "#10b981",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              {busy === "join" ? "Joining..." : "Confirm & Join House"}
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

