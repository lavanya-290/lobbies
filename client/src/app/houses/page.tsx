"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";
import { createHouse, getHouses, getHouseByInvite, getOrCreatePersonalRoom, joinHouse, House, InvitePreview } from "@/lib/houses";
import { setSelectedRoom } from "@/lib/session";

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
    <main style={{ display: "flex", flexDirection: "column", gap: 16, padding: 24, maxWidth: 640, margin: "0 auto" }}>
      <h1>Houses</h1>
      {houses.map((house) => (
        <section key={house.id} style={{ border: "1px solid #444", padding: 16 }}>
          <h2 style={{ marginTop: 0 }}>House</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              disabled={!house.sharedRoom}
              onClick={() => house.sharedRoom && enterRoom(house, house.sharedRoom.id, "SHARED")}
            >
              Enter shared room
            </button>
            <button disabled={busy === house.id} onClick={() => void enterPersonalRoom(house)}>
              {busy === house.id ? "Opening..." : "My Room"}
            </button>
          </div>
          {house.isOwner && house.inviteCode && (
            <p>
              Invite code: <strong>{house.inviteCode}</strong>{" "}
              <button onClick={() => void navigator.clipboard.writeText(house.inviteCode!)}>Copy</button>
            </p>
          )}
        </section>
      ))}
      <section style={{ borderTop: "1px solid #444", paddingTop: 16 }}>
        <h2>Join a house</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input value={inviteCode} onChange={(event) => setInviteCode(event.target.value)} placeholder="Invite code" />
          <button disabled={!inviteCode.trim()} onClick={() => void previewInvite()}>Preview</button>
        </div>
        {invitePreview && (
          <div>
            <p>Join {invitePreview.ownerUsername}&apos;s house? ({invitePreview.roomCount} rooms)</p>
            <button disabled={busy === "join"} onClick={() => void confirmJoin()}>
              {busy === "join" ? "Joining..." : "Join house"}
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
