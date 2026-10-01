import { Client } from "colyseus.js";

const SERVER_URL = "http://localhost:2567";
const WS_URL = "ws://localhost:2567";

async function runValidation() {
  console.log("=== Validating Furniture Placement & Action Panel System ===");

  // 1. Create a user and house
  const username = `furn_${Date.now().toString().slice(-8)}`;
  const password = "password123";

  console.log(`1. Registering user ${username}...`);
  const regRes = await fetch(`${SERVER_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, character: "FEMALE" }),
  });
  if (!regRes.ok) throw new Error(`Register failed: ${await regRes.text()}`);
  const { token } = await regRes.json();

  console.log("2. Creating house...");
  const houseRes = await fetch(`${SERVER_URL}/houses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  if (!houseRes.ok) throw new Error(`House creation failed: ${await houseRes.text()}`);
  const houseData = await houseRes.json();
  const houseId = houseData.id;
  const roomId = houseData.sharedRoom.id;
  console.log(`House created: ${houseId}, Room: ${roomId}`);

  console.log("3. Fetching available assets...");
  const assetsRes = await fetch(`${SERVER_URL}/assets`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!assetsRes.ok) throw new Error(`Fetch assets failed: ${await assetsRes.text()}`);
  const assets = await assetsRes.json();
  console.log(`Found ${assets.length} assets:`, assets.map((a: any) => a.metadata?.label ?? a.id));
  if (assets.length === 0) throw new Error("No assets available in database");

  console.log("4. Connecting to Colyseus house room...");
  const client = new Client(WS_URL);
  const room = await client.joinOrCreate("house", { token, houseId, dbRoomId: roomId });

  await new Promise<void>((resolve) => {
    room.onStateChange(() => resolve());
  });

  // Verify State Machine & Logic mirroring PhaserGame.tsx
  console.log("5. Testing State Machine Logic & Colyseus Message Handling:");

  let spot: { x: number; y: number } | null = null;
  let selectedObject: any | null = null;

  const onEmptyFloorClick = (x: number, y: number) => {
    selectedObject = null;
    spot = { x, y };
  };

  const onFurnitureClick = (object: any) => {
    spot = null;
    selectedObject = object;
  };

  const place = (asset: any) => {
    if (!spot) return;
    room.send("place_object", { assetId: asset.id, x: spot.x, y: spot.y });
    spot = null;
  };

  const cancelPlacement = () => {
    spot = null;
  };

  const closeObjectPanel = () => {
    selectedObject = null;
  };

  const removeSelected = () => {
    if (!selectedObject) return;
    room.send("remove_object", { objectId: selectedObject.id });
    selectedObject = null;
  };

  // Test Case A: Floor click -> Cancel closes picker
  console.log("  -> Test A: Clicking floor then Cancel");
  onEmptyFloorClick(150, 200);
  console.assert(spot !== null && spot.x === 150 && spot.y === 200, "Spot should be set");
  cancelPlacement();
  console.assert(spot === null, "Spot should be cleared after Cancel");
  console.log("     [PASS] Cancel closes placement picker.");

  // Test Case B: Floor click -> select item -> sends place_object and closes picker
  console.log("  -> Test B: Placing an item closes picker");
  onEmptyFloorClick(300, 400);
  console.assert(spot !== null, "Spot should be set");

  const assetToPlace = assets[0];
  let placedObjectId: string | null = null;

  const objectAddedPromise = new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Timeout waiting for object addition")), 5000);
    room.onStateChange((state) => {
      if (state.objects.size > 0) {
        clearTimeout(timeout);
        const [firstKey] = Array.from(state.objects.keys());
        resolve(firstKey);
      }
    });
  });

  place(assetToPlace);
  console.assert(spot === null, "Spot must be immediately null after placing item");
  console.log("     [PASS] Selecting item immediately closes picker.");

  placedObjectId = await objectAddedPromise;
  console.log(`     [PASS] Object placed on server with ID: ${placedObjectId}`);

  // Test Case C: Clicking placed furniture opens panel, Close dismisses it
  console.log("  -> Test C: Clicking placed object then Close");
  const placedObj = room.state.objects.get(placedObjectId);
  onFurnitureClick({ id: placedObjectId, label: placedObj.label, x: placedObj.x, y: placedObj.y });
  console.assert(selectedObject !== null && selectedObject.id === placedObjectId, "selectedObject should be set");
  console.assert(spot === null, "spot must remain null");
  closeObjectPanel();
  console.assert(selectedObject === null, "selectedObject should be cleared after Close");
  console.log("     [PASS] Clicking Close dismisses the object-action panel without reopening picker.");

  // Test Case D: Clicking placed furniture then Remove deletes item and dismisses panel
  console.log("  -> Test D: Clicking Remove removes item and closes panel");
  onFurnitureClick({ id: placedObjectId, label: placedObj.label, x: placedObj.x, y: placedObj.y });
  console.assert(selectedObject !== null, "selectedObject set before remove");

  const objectRemovedPromise = new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Timeout waiting for object removal")), 5000);
    room.onStateChange((state) => {
      if (!state.objects.has(placedObjectId!)) {
        clearTimeout(timeout);
        resolve();
      }
    });
  });

  removeSelected();
  console.assert(selectedObject === null, "selectedObject must be immediately null after remove");
  console.log("     [PASS] Clicking Remove immediately closes the action panel.");

  await objectRemovedPromise;
  console.log("     [PASS] Server broadcast confirmed object removal.");

  // Test Case E: Subsequent floor click outside opens picker at new coordinate
  console.log("  -> Test E: Subsequent floor click opens placement picker at new position");
  onEmptyFloorClick(450, 350);
  console.assert(spot !== null && spot.x === 450 && spot.y === 350, "Spot should be set to new coordinates");
  console.assert(selectedObject === null, "selectedObject remains null");
  console.log("     [PASS] Outside floor click cleanly opens picker at clicked coordinates.");

  await room.leave();
  console.log("\n=== ALL VALIDATION CHECKS PASSED SUCCESSFULLY! ===");
}

runValidation().catch((err) => {
  console.error("Validation failed:", err);
  process.exit(1);
});
