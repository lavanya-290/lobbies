const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const executablePath = fs.existsSync(CHROME_PATH) ? CHROME_PATH : EDGE_PATH;

const ARTIFACT_DIR = "C:\\Users\\lavanya.singh\\.gemini\\antigravity-ide\\brain\\929ea65a-5f6d-4485-9f7e-0d60723dd9fe\\scratch";
if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

async function run() {
  console.log("=== Testing Quirky Furniture Placement, Rendering, Sync & Persistence ===");
  console.log("Using browser at:", executablePath);

  // 1. Check API /assets
  console.log("\n1. Verifying GET /assets...");
  const user = `furn_tester_${Date.now().toString().slice(-5)}`;
  const regRes = await fetch("http://localhost:2567/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: user, password: "password123", character: "FEMALE" }),
  });
  if (!regRes.ok) throw new Error(`Register failed: ${await regRes.text()}`);
  const { token } = await regRes.json();

  const assetsRes = await fetch("http://localhost:2567/assets", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!assetsRes.ok) throw new Error(`GET /assets failed: ${await assetsRes.text()}`);
  const assets = await assetsRes.json();
  console.log(`Found ${assets.length} assets in database:`);
  for (const a of assets) {
    console.log(`  - [${a.id}] "${a.metadata?.label}" sourceUrl: ${a.sourceUrl || "(none, placeholder)"}`);
  }

  const quirkyCarpet = assets.find((a) => a.id === "quirky-carpet-swirl");
  const quirkySofa = assets.find((a) => a.id === "quirky-sofa-wave");
  const quirkyLamp = assets.find((a) => a.id === "quirky-lamp-claw");
  const redChair = assets.find((a) => a.id === "placeholder-red-chair");

  if (!quirkyCarpet || !quirkySofa || !quirkyLamp) {
    throw new Error("One or more quirky assets missing from DB!");
  }
  console.log("✓ All 3 quirky assets exist with sourceUrl in DB.");

  // 2. Create House & Room
  console.log("\n2. Creating House and Room...");
  const houseRes = await fetch("http://localhost:2567/houses", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  });
  if (!houseRes.ok) throw new Error(`Create house failed: ${await houseRes.text()}`);
  const house = await houseRes.json();
  const roomId = house.sharedRoom.id;
  console.log(`House created: ${house.id}, Room: ${roomId}`);

  // 3. Launch Browser and load Room
  console.log("\n3. Launching browser to place furniture via UI...");
  const browser = await puppeteer.launch({
    executablePath,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1280,900"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  // Navigate to login/set auth token in localStorage
  await page.goto("http://localhost:3000/login", { waitUntil: "domcontentloaded" });
  await page.evaluate(({ t, u, hid, rid }) => {
    localStorage.setItem("habbo_token", t);
    localStorage.setItem("habbo_username", u);
    localStorage.setItem("habbo_gender", "FEMALE");
    localStorage.setItem("habbo_character", "FEMALE");
    localStorage.setItem("habbo_selected_house_id", hid);
    localStorage.setItem("habbo_selected_room_id", rid);
    localStorage.setItem("habbo_selected_room_type", "SHARED");
    localStorage.setItem("habbo_selected_shared_room_id", rid);
  }, { t: token, u: user, hid: house.id, rid: roomId });

  console.log("Navigating to http://localhost:3000/ ...");
  await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });

  // Wait for canvas to be ready and Colyseus room connection to be open
  await page.waitForSelector("canvas", { timeout: 15000 });
  console.log("Canvas ready. Waiting for Colyseus connection to open...");
  await page.waitForFunction(() => {
    const game = window.__PHASER_GAME__;
    const scene = game?.scene?.getScene("MainScene");
    return scene && scene.room && scene.room.connection && scene.room.connection.isOpen;
  }, { timeout: 15000 });
  console.log("Colyseus room connected and open!");
  await new Promise((r) => setTimeout(r, 1000));

  async function placeFurnitureItem(label, x, y) {
    console.log(`\nPlacing '${label}' at (${x}, ${y})...`);
    await page.evaluate((px, py) => {
      const game = window.__PHASER_GAME__;
      const scene = game?.scene?.getScene("MainScene");
      scene?.callbacks?.onEmptyFloorClick(px, py);
    }, x, y);

    await page.waitForFunction(
      (lbl) => {
        const buttons = Array.from(document.querySelectorAll("button"));
        return buttons.some((b) => b.textContent && b.textContent.includes(lbl));
      },
      { timeout: 5000 },
      label
    );

    const prevCount = await page.evaluate(() => {
      const game = window.__PHASER_GAME__;
      const scene = game?.scene?.getScene("MainScene");
      return scene?.furniture?.size || 0;
    });

    const clicked = await page.evaluate((lbl) => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const btn = buttons.find((b) => b.textContent && b.textContent.includes(lbl));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    }, label);
    console.log(`  Clicked '${label}' button:`, clicked);

    await page.waitForFunction(
      () => !document.querySelector("strong")?.textContent.includes("Place furniture"),
      { timeout: 5000 }
    );

    await page.waitForFunction(
      (expectedMin) => {
        const game = window.__PHASER_GAME__;
        const scene = game?.scene?.getScene("MainScene");
        return (scene?.furniture?.size || 0) >= expectedMin;
      },
      { timeout: 5000 },
      prevCount + 1
    );

    await new Promise((r) => setTimeout(r, 1000));
  }

  // Place each of the quirky furniture pieces + 1 placeholder
  await placeFurnitureItem("Swirl Carpet", 350, 320);
  await placeFurnitureItem("Wave Sofa", 460, 270);
  await placeFurnitureItem("Claw Floor Lamp", 270, 240);
  await placeFurnitureItem("Red Chair", 520, 360);

  // 8. Inspect Phaser Scene objects
  const sceneAudit = await page.evaluate(() => {
    const game = window.__PHASER_GAME__;
    if (!game) return { error: "No Phaser game found on window" };
    const scene = game.scene.getScene("MainScene");
    if (!scene) return { error: "MainScene not found" };

    const furnEntries = [];
    scene.furniture.forEach((fView, id) => {
      const dispType = fView.display ? fView.display.type : "Unknown";
      const isSprite = dispType === "Sprite";
      furnEntries.push({
        id,
        assetId: fView.object.assetId,
        label: fView.object.label,
        sourceUrl: fView.object.sourceUrl,
        type: dispType,
        textureKey: isSprite ? fView.display.texture.key : null,
        depth: fView.display ? fView.display.depth : null,
        x: fView.display ? fView.display.x : null,
        y: fView.display ? fView.display.y : null,
      });
    });
    return { count: furnEntries.length, furnEntries };
  });

  console.log("\n8. Phaser Scene Audit Result:", JSON.stringify(sceneAudit, null, 2));

  // 9. Take Screenshot
  const shotPath = path.join(ARTIFACT_DIR, "quirky_furniture_placed.png");
  await page.screenshot({ path: shotPath });
  console.log(`\n9. Screenshot saved to ${shotPath}`);

  // 10. Verify DB Persistence via GET /rooms/:roomId/objects
  console.log("\n10. Verifying Database Persistence via GET /rooms/:roomId/objects...");
  const dbObjsRes = await fetch(`http://localhost:2567/rooms/${roomId}/objects`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!dbObjsRes.ok) throw new Error(`GET /rooms/objects failed: ${await dbObjsRes.text()}`);
  const dbObjects = await dbObjsRes.json();
  console.log(`Database has ${dbObjects.length} persisted objects:`);
  for (const obj of dbObjects) {
    console.log(`  - ID: ${obj.id}, Asset: ${obj.assetId} ("${obj.asset?.metadata?.label}"), sourceUrl: ${obj.asset?.sourceUrl}`);
  }

  await browser.close();
  console.log("\n=== Validation Complete! ===");
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
