const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const executablePath = fs.existsSync(CHROME_PATH) ? CHROME_PATH : EDGE_PATH;

const ARTIFACT_DIR = "C:\\Users\\lavanya.singh\\.gemini\\antigravity-ide\\brain\\929ea65a-5f6d-4485-9f7e-0d60723dd9fe";

async function run() {
  console.log("=== Testing 3D Thick Floor Tiles & Isometric Boundary Containment ===");

  const username = `tile_tester_${Date.now().toString().slice(-5)}`;
  console.log(`1. Registering user: ${username}...`);

  const regRes = await fetch("http://localhost:2567/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password: "password123", character: "FEMALE" }),
  });
  if (!regRes.ok) throw new Error(`Register failed: ${await regRes.text()}`);
  const { token, user } = await regRes.json();

  console.log("2. Creating house...");
  const houseRes = await fetch("http://localhost:2567/houses", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  });
  if (!houseRes.ok) throw new Error(`Create house failed: ${await houseRes.text()}`);
  const house = await houseRes.json();
  const roomId = house.sharedRoom.id;
  const houseId = house.id;
  console.log(`House created: ${houseId}, Room: ${roomId}`);

  console.log("3. Launching browser...");
  const browser = await puppeteer.launch({
    executablePath,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--window-size=1200,900"],
    defaultViewport: { width: 1200, height: 900 },
  });

  try {
    const page = await browser.newPage();
    page.on("console", (msg) => {
      const text = msg.text();
      if (!text.includes("Download the React DevTools") && !text.includes("[DOM]")) {
        console.log("BROWSER LOG:", text);
      }
    });
    page.on("pageerror", (err) => console.log("BROWSER ERROR:", err.message));

    console.log("4. Setting session in browser...");
    await page.goto("http://localhost:3000/login", { waitUntil: "domcontentloaded" });
    await page.evaluate(
      ({ token, username, houseId, roomId, character }) => {
        localStorage.setItem("habbo_token", token);
        localStorage.setItem("habbo_username", username);
        localStorage.setItem("habbo_gender", character);
        localStorage.setItem("habbo_character", character);
        localStorage.setItem("habbo_selected_house_id", houseId);
        localStorage.setItem("habbo_selected_room_id", roomId);
        localStorage.setItem("habbo_selected_room_type", "SHARED");
        localStorage.setItem("habbo_selected_shared_room_id", roomId);
      },
      { token, username, houseId, roomId, character: "FEMALE" }
    );

    console.log("5. Navigating to room at http://localhost:3000/...");
    await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("canvas", { timeout: 20000 });
    console.log("Phaser canvas loaded! Waiting for connection...");
    await new Promise((r) => setTimeout(r, 3500));

    // 6. Inspect Phaser scene floor tiles and origin
    console.log("6. Inspecting floor tile configuration in Phaser scene...");
    const floorInfo = await page.evaluate(() => {
      const game = window.__PHASER_GAME__;
      const scene = game?.scene?.getScene("MainScene");
      if (!scene) return { error: "MainScene not found" };

      const tiles = scene.floorTiles || [];
      const firstTile = tiles[0];
      return {
        currentFloorTile: scene.currentFloorTile,
        tileCount: tiles.length,
        firstTileOrigin: firstTile ? { originX: firstTile.originX, originY: firstTile.originY } : null,
        firstTileTexture: firstTile ? firstTile.texture.key : null,
        firstTileDepth: firstTile ? firstTile.depth : null,
        lastTileDepth: tiles[tiles.length - 1] ? tiles[tiles.length - 1].depth : null,
        avatarPos: scene.localAvatar ? { x: scene.localAvatar.x, y: scene.localAvatar.y } : null,
      };
    });
    console.log("Floor Info:", JSON.stringify(floorInfo, null, 2));

    // Capture screenshot of the house with default thick tiles
    const initialScreenshotPath = path.join(ARTIFACT_DIR, "house_thick_tiles_default.png");
    await page.screenshot({ path: initialScreenshotPath });
    console.log("Saved initial screenshot:", initialScreenshotPath);

    // 7. Test Movement & Isometric Boundary Clamping
    console.log("7. Testing movement boundaries: attempting to walk out of the designated tile area...");

    // Click canvas to focus input
    await page.click("canvas");

    // Test holding UP/W (towards top corner / NE/NW walls)
    console.log("   Walking North / Up for 3.0s...");
    await page.keyboard.down("KeyW");
    await new Promise((r) => setTimeout(r, 3000));
    await page.keyboard.up("KeyW");

    let posNorth = await page.evaluate(() => {
      const scene = window.__PHASER_GAME__?.scene?.getScene("MainScene");
      const av = scene?.localAvatar;
      if (!av) return null;
      const originX = 400, originY = 120;
      const dX = av.x - originX, dY = av.y - originY;
      const c = dY / 64 + dX / 128;
      const r = dY / 64 - dX / 128;
      return { x: av.x, y: av.y, r: parseFloat(r.toFixed(3)), c: parseFloat(c.toFixed(3)) };
    });
    console.log("   North position reached:", posNorth);

    // Test holding LEFT/A (towards West corner / SW edge)
    console.log("   Walking West / Left for 4.0s...");
    await page.keyboard.down("KeyA");
    await new Promise((r) => setTimeout(r, 4000));
    await page.keyboard.up("KeyA");

    let posWest = await page.evaluate(() => {
      const scene = window.__PHASER_GAME__?.scene?.getScene("MainScene");
      const av = scene?.localAvatar;
      if (!av) return null;
      const originX = 400, originY = 120;
      const dX = av.x - originX, dY = av.y - originY;
      const c = dY / 64 + dX / 128;
      const r = dY / 64 - dX / 128;
      return { x: av.x, y: av.y, r: parseFloat(r.toFixed(3)), c: parseFloat(c.toFixed(3)) };
    });
    console.log("   West position reached:", posWest);

    // Test holding DOWN/S (towards South corner / front edge)
    console.log("   Walking South / Down for 4.0s...");
    await page.keyboard.down("KeyS");
    await new Promise((r) => setTimeout(r, 4000));
    await page.keyboard.up("KeyS");

    let posSouth = await page.evaluate(() => {
      const scene = window.__PHASER_GAME__?.scene?.getScene("MainScene");
      const av = scene?.localAvatar;
      if (!av) return null;
      const originX = 400, originY = 120;
      const dX = av.x - originX, dY = av.y - originY;
      const c = dY / 64 + dX / 128;
      const r = dY / 64 - dX / 128;
      return { x: av.x, y: av.y, r: parseFloat(r.toFixed(3)), c: parseFloat(c.toFixed(3)) };
    });
    console.log("   South position reached:", posSouth);

    // Test holding RIGHT/D (towards East corner / SE edge)
    console.log("   Walking East / Right for 4.0s...");
    await page.keyboard.down("KeyD");
    await new Promise((r) => setTimeout(r, 4000));
    await page.keyboard.up("KeyD");

    let posEast = await page.evaluate(() => {
      const scene = window.__PHASER_GAME__?.scene?.getScene("MainScene");
      const av = scene?.localAvatar;
      if (!av) return null;
      const originX = 400, originY = 120;
      const dX = av.x - originX, dY = av.y - originY;
      const c = dY / 64 + dX / 128;
      const r = dY / 64 - dX / 128;
      return { x: av.x, y: av.y, r: parseFloat(r.toFixed(3)), c: parseFloat(c.toFixed(3)) };
    });
    console.log("   East position reached:", posEast);

    // Check boundary assertion: all positions must have r in [0.20, 6.45] and c in [0.20, 6.45]
    const allPositions = [posNorth, posWest, posSouth, posEast];
    let allBounded = true;
    for (const p of allPositions) {
      if (!p) {
        allBounded = false;
        continue;
      }
      if (p.r < 0.19 || p.r > 6.46 || p.c < 0.19 || p.c > 6.46) {
        console.error("BOUNDARY BREACH DETECTED!", p);
        allBounded = false;
      }
    }
    console.log(">>> Strict Boundary Containment Verified? <<<:", allBounded);
    if (!allBounded) {
      throw new Error("Boundary containment test failed: character walked out of designated area!");
    }

    // Capture screenshot at boundary position
    const boundaryScreenshotPath = path.join(ARTIFACT_DIR, "character_boundary_containment.png");
    await page.screenshot({ path: boundaryScreenshotPath });
    console.log("Saved boundary screenshot:", boundaryScreenshotPath);

    // 8. Test Room Customization Modal with Thick Tiles
    console.log("8. Opening Room Customization Modal...");
    const customizeBtn = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      return buttons.find((b) => b.textContent && b.textContent.includes("Customize Room"));
    });
    if (!customizeBtn) throw new Error("Customize Room button not found!");
    await customizeBtn.click();
    await new Promise((r) => setTimeout(r, 1200));

    const modalScreenshotPath = path.join(ARTIFACT_DIR, "room_customization_thick_tiles_modal.png");
    await page.screenshot({ path: modalScreenshotPath });
    console.log("Saved modal screenshot:", modalScreenshotPath);

    // Verify modal lists thick tiles
    const modalTileList = await page.evaluate(() => {
      const spans = Array.from(document.querySelectorAll("span"));
      const names = [
        "Rich Timber Planks",
        "Warm Oak Parquet",
        "White Marble Slab",
        "Slate Grey Flagstone",
        "Castle Cobblestone",
        "Lush Garden Lawn",
      ];
      return names.map((n) => ({ name: n, visible: spans.some((s) => s.textContent?.includes(n)) }));
    });
    console.log("Modal thick tiles visible in catalog:", modalTileList);

    // Select White Marble Slab thick tile
    console.log("9. Selecting White Marble Slab thick tile...");
    await page.waitForSelector("#floor-tile-floor_thick_marble_white", { timeout: 5000 });
    await page.click("#floor-tile-floor_thick_marble_white");
    await new Promise((r) => setTimeout(r, 1500));

    // Close modal
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const close = btns.find((b) => b.textContent?.trim() === "✕");
      close?.click();
    });
    await new Promise((r) => setTimeout(r, 1500));

    // Verify new floor tile in scene
    const updatedFloor = await page.evaluate(() => {
      const scene = window.__PHASER_GAME__?.scene?.getScene("MainScene");
      return {
        currentFloorTile: scene?.currentFloorTile,
        firstTileTexture: scene?.floorTiles?.[0]?.texture?.key,
        firstTileOrigin: scene?.floorTiles?.[0] ? {
          originX: scene.floorTiles[0].originX,
          originY: scene.floorTiles[0].originY,
        } : null,
      };
    });
    console.log("Updated Floor in Scene:", updatedFloor);

    if (updatedFloor.currentFloorTile !== "floor_thick_marble_white") {
      throw new Error(`Expected floor_thick_marble_white, got ${updatedFloor.currentFloorTile}`);
    }

    const marbleRoomScreenshotPath = path.join(ARTIFACT_DIR, "house_thick_tiles_marble.png");
    await page.screenshot({ path: marbleRoomScreenshotPath });
    console.log("Saved marble room screenshot:", marbleRoomScreenshotPath);

    console.log("=== ALL TESTS COMPLETED SUCCESSFULLY ===");
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
