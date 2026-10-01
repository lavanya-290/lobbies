import { Client } from "colyseus.js";

const SERVER_URL = "http://localhost:2567";
const WS_URL = "ws://localhost:2567";

async function runTests() {
  console.log("=== Testing Outfit Endpoints & Colyseus Sync ===");

  const id = Date.now().toString().slice(-6);
  const userA = `user_a_${id}`;
  const userB = `user_b_${id}`;
  const password = "password123";

  // 1. Register User A
  console.log(`1. Registering ${userA}...`);
  const regARes = await fetch(`${SERVER_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: userA, password, character: "FEMALE" }),
  });
  if (!regARes.ok) throw new Error(`Failed to register ${userA}: ${await regARes.text()}`);
  const regA = await regARes.json();
  const tokenA = regA.token;

  // 2. Register User B
  console.log(`2. Registering ${userB}...`);
  const regBRes = await fetch(`${SERVER_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: userB, password, character: "MALE" }),
  });
  if (!regBRes.ok) throw new Error(`Failed to register ${userB}: ${await regBRes.text()}`);
  const regB = await regBRes.json();
  const tokenB = regB.token;

  // 3. User A creates a house
  console.log("3. User A creates a house...");
  const houseRes = await fetch(`${SERVER_URL}/houses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenA}`,
    },
  });
  if (!houseRes.ok) throw new Error(`Failed to create house: ${await houseRes.text()}`);
  const houseData = await houseRes.json();
  const houseId = houseData.id;
  const roomId = houseData.sharedRoom.id;
  console.log(`House created: ${houseId}, Room: ${roomId}`);

  // 4. Test GET /me/outfit initial state (empty)
  console.log("4. Testing initial GET /me/outfit...");
  const initGetRes = await fetch(`${SERVER_URL}/me/outfit`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  const initGetData = await initGetRes.json();
  console.log("Initial outfit:", initGetData.outfit);
  if (Object.keys(initGetData.outfit || {}).length !== 0) {
    throw new Error("Expected initial outfit to be empty");
  }

  // 5. Test PUT /me/outfit with multi-layer outfit
  console.log("5. Testing PUT /me/outfit with crop_top + culottes + conical_hat...");
  const outfit1 = { top: "crop_top", bottom: "culottes", headwear: "conical_hat" };
  const putRes1 = await fetch(`${SERVER_URL}/me/outfit`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({ outfit: outfit1 }),
  });
  const putData1 = await putRes1.json();
  console.log("Updated outfit response:", putData1.outfit);
  if (putData1.outfit.top !== "crop_top" || putData1.outfit.bottom !== "culottes") {
    throw new Error("PUT /me/outfit failed to persist outfit");
  }

  // 6. Test GET /me/outfit persistence
  console.log("6. Testing GET /me/outfit persistence verification...");
  const getRes2 = await fetch(`${SERVER_URL}/me/outfit`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  const getData2 = await getRes2.json();
  console.log("Persisted outfit read from DB:", getData2.outfit);
  if (getData2.outfit.headwear !== "conical_hat") {
    throw new Error("GET /me/outfit did not match saved data");
  }

  // 7. Test Colyseus multiplayer room join & sync
  console.log("7. Connecting User A to Colyseus room...");
  const colyseusA = new Client(WS_URL);
  const roomA = await colyseusA.joinOrCreate("house", {
    token: tokenA,
    houseId,
    dbRoomId: roomId,
  });

  // Verify User A's initial outfit in room state matches persisted DB outfit
  await new Promise<void>((resolve) => roomA.onStateChange(() => resolve()));
  const playerAInA = roomA.state.players.get(roomA.sessionId);
  console.log(`User A in room state has equippedOutfit: ${playerAInA.equippedOutfit}`);
  const parsedAOutfit = JSON.parse(playerAInA.equippedOutfit);
  if (parsedAOutfit.top !== "crop_top" || parsedAOutfit.bottom !== "culottes") {
    throw new Error("Room player onJoin did not initialize with persisted outfit from DB!");
  }

  // 8. Connect User B to the same room
  console.log("8. User B joining the same house room...");
  // User B joins User A's house via invite code
  await fetch(`${SERVER_URL}/houses/${houseId}/join`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenB}`,
    },
    body: JSON.stringify({ inviteCode: houseData.inviteCode }),
  });

  const colyseusB = new Client(WS_URL);
  const roomB = await colyseusB.joinOrCreate("house", {
    token: tokenB,
    houseId,
    dbRoomId: roomId,
  });

  await new Promise<void>((resolve) => roomB.onStateChange(() => resolve()));
  const userAInBView = roomB.state.players.get(roomA.sessionId);
  console.log(`User B sees User A's outfit as: ${userAInBView.equippedOutfit}`);
  if (!userAInBView.equippedOutfit.includes("crop_top")) {
    throw new Error("User B does not see User A's initial outfit!");
  }

  // 9. User A equips a full-body dress (replacing top + bottom) in real-time
  console.log("9. User A equips full-body item 'kimono_casual'...");
  const dressOutfit = { dress: "kimono_casual", headwear: "conical_hat" };
  roomA.send("equip_outfit", { outfit: dressOutfit });

  // Wait for state sync to propagate to User B
  await new Promise<void>((resolve) => {
    const unsub = roomB.onStateChange((state) => {
      const p = state.players.get(roomA.sessionId);
      if (p && p.equippedOutfit && p.equippedOutfit.includes("kimono_casual")) {
        resolve();
      }
    });
    setTimeout(resolve, 2000);
  });

  const updatedAInB = roomB.state.players.get(roomA.sessionId);
  console.log(`User B now sees User A's updated outfit as: ${updatedAInB?.equippedOutfit}`);
  if (!updatedAInB || !updatedAInB.equippedOutfit.includes("kimono_casual") || updatedAInB.equippedOutfit.includes("crop_top")) {
    throw new Error("User B did not receive the full-body outfit override correctly!");
  }

  // 10. Verify DB persistence after room equip_outfit message
  console.log("10. Verifying DB persistence after equip_outfit message...");
  const dbCheckRes = await fetch(`${SERVER_URL}/me/outfit`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  const dbCheck = await dbCheckRes.json();
  console.log("Final DB state for User A:", dbCheck.outfit);
  if (dbCheck.outfit.dress !== "kimono_casual") {
    throw new Error("equip_outfit message did not persist to database!");
  }

  roomA.leave();
  roomB.leave();
  console.log("=== ALL OUTFIT & MULTIPLAYER SYNC TESTS PASSED! ===");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
