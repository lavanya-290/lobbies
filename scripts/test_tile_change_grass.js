const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const executablePath = fs.existsSync(CHROME_PATH) ? CHROME_PATH : EDGE_PATH;
const ARTIFACT_DIR = "C:\\Users\\lavanya.singh\\.gemini\\antigravity-ide\\brain\\929ea65a-5f6d-4485-9f7e-0d60723dd9fe";

async function run() {
  const username = `tile_switch_${Date.now().toString().slice(-5)}`;
  const regRes = await fetch("http://localhost:2567/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password: "password123", character: "FEMALE" }),
  });
  const { token } = await regRes.json();

  const houseRes = await fetch("http://localhost:2567/houses", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  });
  const house = await houseRes.json();
  const roomId = house.sharedRoom.id;
  const houseId = house.id;

  const browser = await puppeteer.launch({
    executablePath,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--window-size=1200,900"],
    defaultViewport: { width: 1200, height: 900 },
  });

  try {
    const page = await browser.newPage();
    await page.goto("http://localhost:3000/login", { waitUntil: "domcontentloaded" });
    await page.evaluate(
      ({ token, username, houseId, roomId }) => {
        localStorage.setItem("habbo_token", token);
        localStorage.setItem("habbo_username", username);
        localStorage.setItem("habbo_gender", "FEMALE");
        localStorage.setItem("habbo_character", "FEMALE");
        localStorage.setItem("habbo_selected_house_id", houseId);
        localStorage.setItem("habbo_selected_room_id", roomId);
        localStorage.setItem("habbo_selected_room_type", "SHARED");
        localStorage.setItem("habbo_selected_shared_room_id", roomId);
      },
      { token, username, houseId, roomId }
    );

    await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("canvas", { timeout: 20000 });
    await new Promise((r) => setTimeout(r, 3000));

    // Customize floor to Lush Garden Lawn (thick 3D grass block)
    console.log("Switching floor to Lush Garden Lawn (floor_thick_nature_grass)...");
    await page.evaluate(() => {
      const scene = window.__PHASER_GAME__?.scene?.getScene("MainScene");
      scene?.customizeRoom({ floorTile: "floor_thick_nature_grass" });
    });
    await new Promise((r) => setTimeout(r, 1500));

    const lawnScreenshot = path.join(ARTIFACT_DIR, "house_thick_tiles_lawn.png");
    await page.screenshot({ path: lawnScreenshot });
    console.log("Saved thick lawn screenshot:", lawnScreenshot);

    // Customize floor to White Marble Slab (thick 3D marble block)
    console.log("Switching floor to White Marble Slab (floor_thick_marble_white)...");
    await page.evaluate(() => {
      const scene = window.__PHASER_GAME__?.scene?.getScene("MainScene");
      scene?.customizeRoom({ floorTile: "floor_thick_marble_white" });
    });
    await new Promise((r) => setTimeout(r, 1500));

    const marbleScreenshot = path.join(ARTIFACT_DIR, "house_thick_tiles_marble_active.png");
    await page.screenshot({ path: marbleScreenshot });
    console.log("Saved thick marble screenshot:", marbleScreenshot);

  } finally {
    await browser.close();
  }
}

run().catch(console.error);
