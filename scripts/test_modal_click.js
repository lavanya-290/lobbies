const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const executablePath = fs.existsSync(CHROME_PATH) ? CHROME_PATH : EDGE_PATH;
const ARTIFACT_DIR = "C:\\Users\\lavanya.singh\\.gemini\\antigravity-ide\\brain\\929ea65a-5f6d-4485-9f7e-0d60723dd9fe";

async function run() {
  const username = "modal_test_" + Date.now().toString().slice(-4);
  const regRes = await fetch("http://localhost:2567/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password: "password123", character: "FEMALE" }),
  });
  const { token } = await regRes.json();
  const houseRes = await fetch("http://localhost:2567/houses", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
  });
  const house = await houseRes.json();

  const browser = await puppeteer.launch({ executablePath, headless: "new" });
  try {
    const page = await browser.newPage();
    await page.goto("http://localhost:3000/login");
    await page.evaluate(({ token, houseId, roomId, username }) => {
      localStorage.setItem("habbo_token", token);
      localStorage.setItem("habbo_username", username);
      localStorage.setItem("habbo_gender", "FEMALE");
      localStorage.setItem("habbo_character", "FEMALE");
      localStorage.setItem("habbo_selected_house_id", houseId);
      localStorage.setItem("habbo_selected_room_id", roomId);
      localStorage.setItem("habbo_selected_room_type", "SHARED");
      localStorage.setItem("habbo_selected_shared_room_id", roomId);
    }, { token, houseId: house.id, roomId: house.sharedRoom.id, username });

    await page.goto("http://localhost:3000/");
    await page.waitForSelector("canvas", { timeout: 20000 });
    await new Promise((r) => setTimeout(r, 2500));

    // Open Customize Room Modal
    console.log("Opening Customize Room Modal...");
    const customizeBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      return btns.find((b) => b.textContent && b.textContent.includes("Customize Room"));
    });
    await customizeBtn.click();
    await new Promise((r) => setTimeout(r, 1000));

    // Wait for the tile card and click it using page.click
    console.log("Clicking #floor-tile-floor_thick_marble_white...");
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

    const sceneFloor = await page.evaluate(() => {
      const s = window.__PHASER_GAME__?.scene?.getScene("MainScene");
      return {
        currentFloorTile: s?.currentFloorTile,
        tile0Tex: s?.floorTiles?.[0]?.texture?.key,
      };
    });
    console.log("Scene floor after marble selection:", sceneFloor);

    const shotPath = path.join(ARTIFACT_DIR, "house_thick_tiles_white_marble.png");
    await page.screenshot({ path: shotPath });
    console.log("Saved screenshot:", shotPath);
  } finally {
    await browser.close();
  }
}

run().catch(console.error);
