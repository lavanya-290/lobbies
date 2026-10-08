const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const executablePath = fs.existsSync(CHROME_PATH) ? CHROME_PATH : EDGE_PATH;
const ARTIFACT_DIR = "C:\\Users\\lavanya.singh\\.gemini\\antigravity-ide\\brain\\929ea65a-5f6d-4485-9f7e-0d60723dd9fe";

async function run() {
  const username = "furn_tester_" + Date.now().toString().slice(-4);
  const regRes = await fetch("http://localhost:2567/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password: "password123", character: "FEMALE" }),
  });
  const { token, user } = await regRes.json();
  const houseRes = await fetch("http://localhost:2567/houses", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
  });
  const house = await houseRes.json();
  const roomId = house.sharedRoom.id;
  const houseId = house.id;

  // Fetch available assets
  const assetsRes = await fetch("http://localhost:2567/rooms/" + roomId + "/objects", {
    headers: { Authorization: "Bearer " + token },
  });
  const allAssetsRes = await fetch("http://localhost:2567/assets", {
    headers: { Authorization: "Bearer " + token },
  });
  const assets = await allAssetsRes.json();
  console.log("Total assets in DB:", assets.length);
  const newAssets = assets.filter(a => a.id.startsWith("sofa-") || a.id.startsWith("chair-yellow") || a.id.startsWith("carpet-"));
  console.log("New assets found:", newAssets.map(a => a.id));


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
    }, { token, houseId, roomId, username });

    await page.goto("http://localhost:3000/");
    await page.waitForSelector("canvas", { timeout: 20000 });
    await page.waitForFunction(() => {
      const s = window.__PHASER_GAME__?.scene?.getScene("MainScene");
      return s && s.room && s.room.connection && s.room.connection.isOpen;
    }, { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1000));

    // Place sofa-se, chair-yellow-pretty-se, and carpet-tiger-se via Colyseus
    await page.evaluate(() => {
      const s = window.__PHASER_GAME__?.scene?.getScene("MainScene");
      s.placeObject("carpet-tiger-se", 400, 320);
      s.placeObject("sofa-se", 320, 260);
      s.placeObject("chair-yellow-pretty-se", 480, 260);
    });

    console.log("Waiting for objects to sync to room state...");
    await page.waitForFunction(() => {
      const s = window.__PHASER_GAME__?.scene?.getScene("MainScene");
      return (s?.room?.state?.objects?.size || 0) >= 3;
    }, { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1000));

    const shotPath = path.join(ARTIFACT_DIR, "room_new_furniture_placed.png");
    await page.screenshot({ path: shotPath });
    console.log("Saved placed furniture screenshot:", shotPath);

    // Test rotation on sofa (swapping to sofa-sw)
    const objects = await page.evaluate(() => {
      const s = window.__PHASER_GAME__?.scene?.getScene("MainScene");
      const list = [];
      s?.room?.state?.objects?.forEach((obj, id) => list.push({ id, assetId: obj.assetId }));
      return list;
    });
    console.log("Room objects in scene:", objects);

    const sofaObj = objects.find(o => o.assetId.includes("sofa"));
    if (sofaObj) {
      console.log("Testing rotation on sofa:", sofaObj.id);
      await page.evaluate((id) => {
        const s = window.__PHASER_GAME__?.scene?.getScene("MainScene");
        s.rotateObject(id);
      }, sofaObj.id);
      await page.waitForFunction((id) => {
        const s = window.__PHASER_GAME__?.scene?.getScene("MainScene");
        return s?.room?.state?.objects?.get(id)?.assetId === "sofa-sw";
      }, { timeout: 10000 }, sofaObj.id);

      const updatedSofa = await page.evaluate((id) => {
        const s = window.__PHASER_GAME__?.scene?.getScene("MainScene");
        return s.room.state.objects.get(id)?.assetId;
      }, sofaObj.id);
      console.log("Updated sofa variant after rotate:", updatedSofa);

      const rotatedShotPath = path.join(ARTIFACT_DIR, "room_sofa_rotated_sw.png");
      await page.screenshot({ path: rotatedShotPath });
      console.log("Saved rotated sofa screenshot:", rotatedShotPath);
    }
  } finally {
    await browser.close();
  }
}

run().catch(console.error);
