import { Client } from "colyseus.js";

const SERVER_URL = "http://localhost:2567";
const WS_URL = "ws://localhost:2567";

async function main() {
  console.log("=== Diagnosing Shared Room Matchmaking ===");

  // 1. User A
  const userA = `diag_a_${Date.now().toString().slice(-6)}`;
  console.log(`Registering User A: ${userA}...`);
  const regARes = await fetch(`${SERVER_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: userA, password: "password123", character: "FEMALE" }),
  });
  if (!regARes.ok) throw new Error(`User A register failed: ${await regARes.text()}`);
  const { token: tokenA } = await regARes.json();

  // Create house
  console.log("User A creating house...");
  const houseRes = await fetch(`${SERVER_URL}/houses`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenA}` },
  });
  if (!houseRes.ok) throw new Error(`House create failed: ${await houseRes.text()}`);
  const houseData = await houseRes.json();
  const houseId = houseData.id;
  const sharedRoomId = houseData.sharedRoom.id;
  const inviteCode = houseData.inviteCode;
  console.log(`House created: ${houseId}, Shared Room DB ID: ${sharedRoomId}, Invite: ${inviteCode}`);

  // 2. User B
  const userB = `diag_b_${Date.now().toString().slice(-6)}`;
  console.log(`Registering User B: ${userB}...`);
  const regBRes = await fetch(`${SERVER_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: userB, password: "password123", character: "MALE" }),
  });
  if (!regBRes.ok) throw new Error(`User B register failed: ${await regBRes.text()}`);
  const { token: tokenB } = await regBRes.json();

  // User B joins house
  console.log(`User B joining house with code ${inviteCode}...`);
  const joinRes = await fetch(`${SERVER_URL}/houses/${houseId}/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenB}` },
    body: JSON.stringify({ inviteCode }),
  });
  if (!joinRes.ok) throw new Error(`User B join house failed: ${await joinRes.text()}`);
  console.log("User B joined house successfully in database.");

  // 3. Connect both clients to Colyseus
  console.log("\nConnecting Client A to Colyseus with dbRoomId:", sharedRoomId);
  const clientA = new Client(WS_URL);
  const roomA = await clientA.joinOrCreate("house", {
    token: tokenA,
    houseId,
    dbRoomId: sharedRoomId,
  });
  console.log(`Client A joined room! Colyseus Room ID (instance): ${roomA.roomId}, Session ID: ${roomA.sessionId}`);

  console.log("\nConnecting Client B to Colyseus with dbRoomId:", sharedRoomId);
  const clientB = new Client(WS_URL);
  const roomB = await clientB.joinOrCreate("house", {
    token: tokenB,
    houseId,
    dbRoomId: sharedRoomId,
  });
  console.log(`Client B joined room! Colyseus Room ID (instance): ${roomB.roomId}, Session ID: ${roomB.sessionId}`);

  // 4. Verification
  console.log("\n--- RESULTS ---");
  console.log(`Client A Colyseus Room Instance ID: ${roomA.roomId}`);
  console.log(`Client B Colyseus Room Instance ID: ${roomB.roomId}`);
  const matchedSameInstance = roomA.roomId === roomB.roomId;
  console.log(`Are they in the EXACT SAME Colyseus instance? ${matchedSameInstance ? "YES ✅" : "NO ❌"}`);

  // Wait for state sync
  await new Promise((r) => setTimeout(r, 1000));
  console.log(`Players visible to Client A: ${roomA.state.players.size}`);
  roomA.state.players.forEach((p: any, s: string) => {
    console.log(`  - Session ${s}: ${p.username} (${p.character})`);
  });

  console.log(`Players visible to Client B: ${roomB.state.players.size}`);
  roomB.state.players.forEach((p: any, s: string) => {
    console.log(`  - Session ${s}: ${p.username} (${p.character})`);
  });

  // Clean up
  await roomA.leave();
  await roomB.leave();
  console.log("Test finished cleanly.");
}

main().catch((err) => {
  console.error("Diagnosis script failed:", err);
  process.exit(1);
});
