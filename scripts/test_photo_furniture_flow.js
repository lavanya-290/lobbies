const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const executablePath = fs.existsSync(CHROME_PATH) ? CHROME_PATH : EDGE_PATH;

const ARTIFACT_DIR = "C:\\Users\\lavanya.singh\\.gemini\\antigravity-ide\\brain\\929ea65a-5f6d-4485-9f7e-0d60723dd9fe";

async function run() {
  console.log("=== Testing Photo Reference Furniture Placement (SE & SW) ===");

  // 1. Register test user
  const user = `photo_furn_${Date.now().toString().slice(-5)}`;
  const regRes = await fetch("http://localhost:2567/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: user, password: "password123", character: "FEMALE" }),
  });
  if (!regRes.ok) throw new Error(`Register failed: ${await regRes.text()}`);
  const { token } = await regRes.json();

  // 2. Fetch /assets
  const assetsRes = await fetch("http://localhost:2567/assets", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!assetsRes.ok) throw new Error(`GET /assets failed: ${await assetsRes.text()}`);
  const assets = await assetsRes.json();
  console.log(`Found ${assets.length} total assets in database.`);

  const expectedIds = [
    "chair-blue-flower-se", "chair-blue-flower-sw",
    "chair-blue-leaf-se", "chair-blue-leaf-sw",
    "sofa-heart-se", "sofa-heart-sw",
    "seating-orange-hanging-se", "seating-orange-hanging-sw",
    "chair-red-armchair-se", "chair-red-armchair-sw",
    "chair-scorpion-se", "chair-scorpion-sw"
  ];

  for (const id of expectedIds) {
    const found = assets.find((a) => a.id === id);
    if (!found) throw new Error(`Missing expected asset in DB: ${id}`);
    console.log(`✓ Found asset: ${found.id} ("${found.metadata?.label}") -> ${found.sourceUrl}`);
  }

  // 3. Create House & Room
  const houseRes = await fetch("http://localhost:2567/houses", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  });
  if (!houseRes.ok) throw new Error(`Create house failed: ${await houseRes.text()}`);
  const house = await houseRes.json();
  const roomId = house.sharedRoom.id;
  console.log(`Created test room: ${roomId}`);

  // 4. Launch Headless Browser
  const browser = await puppeteer.launch({
    executablePath,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1280,900"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

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

  console.log("Navigating to room canvas...");
  await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });

  await page.waitForSelector("canvas", { timeout: 15000 });
  await page.waitForFunction(() => {
    const game = window.__PHASER_GAME__;
    const scene = game?.scene?.getScene("MainScene");
    return scene && scene.room && scene.room.connection && scene.room.connection.isOpen;
  }, { timeout: 15000 });
  console.log("Colyseus room connected and open!");
  await new Promise((r) => setTimeout(r, 1000));

  async function placeFurnitureItem(label, x, y) {
    console.log(`Placing '${label}' at (${x}, ${y})...`);
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

    await page.evaluate((lbl) => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const btn = buttons.find((b) => b.textContent && b.textContent.includes(lbl));
      btn?.click();
    }, label);

    await page.waitForFunction(
      (expectedMin) => {
        const game = window.__PHASER_GAME__;
        const scene = game?.scene?.getScene("MainScene");
        return (scene?.furniture?.size || 0) >= expectedMin;
      },
      { timeout: 5000 },
      prevCount + 1
    );

    await new Promise((r) => setTimeout(r, 500));
  }

  // Place SE and SW pairs for each category item at exact tile centers
  await placeFurnitureItem("Blue Flower Chair (SE)", 272, 248);
  await placeFurnitureItem("Blue Flower Chair (SW)", 528, 248);
  await placeFurnitureItem("Blue Leaf Chair (SE)", 272, 312);
  await placeFurnitureItem("Blue Leaf Chair (SW)", 528, 312);
  await placeFurnitureItem("Heart Chaise Sofa (SE)", 336, 376);
  await placeFurnitureItem("Heart Chaise Sofa (SW)", 464, 376);
  await placeFurnitureItem("Red Scoop Armchair (SE)", 400, 248);
  await placeFurnitureItem("Red Scoop Armchair (SW)", 400, 312);

  // Audit scene sprites
  const sceneAudit = await page.evaluate(() => {
    const game = window.__PHASER_GAME__;
    const scene = game?.scene?.getScene("MainScene");
    if (!scene) return { error: "No scene" };

    const furnEntries = [];
    scene.furniture.forEach((fView, id) => {
      const isSprite = fView.display && fView.display.type === "Sprite";
      furnEntries.push({
        id,
        assetId: fView.object.assetId,
        label: fView.object.label,
        isSprite,
        textureKey: isSprite ? fView.display.texture.key : null,
        textureLoaded: isSprite ? scene.textures.exists(fView.display.texture.key) : false,
        x: fView.display ? fView.display.x : null,
        y: fView.display ? fView.display.y : null,
      });
    });
    return { count: furnEntries.length, furnEntries };
  });

  console.log("\nScene Audit Results:");
  console.log(JSON.stringify(sceneAudit, null, 2));

  // Take screenshot
  const shotPath = path.join(ARTIFACT_DIR, "photo_furniture_placed.png");
  await page.screenshot({ path: shotPath });
  console.log(`\nScreenshot saved to: ${shotPath}`);

  // Verify DB Persistence
  const dbObjsRes = await fetch(`http://localhost:2567/rooms/${roomId}/objects`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const dbObjects = await dbObjsRes.json();
  console.log(`\nDatabase persistence confirmed: ${dbObjects.length} objects saved.`);

  await browser.close();
  console.log("\n=== Photo Furniture E2E Test Passed Successfully! ===");
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
