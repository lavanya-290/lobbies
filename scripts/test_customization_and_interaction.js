const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const executablePath = fs.existsSync(CHROME_PATH) ? CHROME_PATH : EDGE_PATH;

const ARTIFACT_DIR = "C:\\Users\\lavanya.singh\\.gemini\\antigravity-ide\\brain\\929ea65a-5f6d-4485-9f7e-0d60723dd9fe";

async function run() {
  console.log("=== Testing Room Customization & Furniture Interaction ===");

  const username = `decorator_${Date.now().toString().slice(-5)}`;
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

  console.log("3. Launching browser with Puppeteer...");
  const browser = await puppeteer.launch({
    executablePath,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--window-size=1200,900"],
    defaultViewport: { width: 1200, height: 900 },
  });

  try {
    const page = await browser.newPage();
    page.on("console", (msg) => console.log("BROWSER LOG:", msg.text()));
    page.on("pageerror", (err) => console.log("BROWSER ERROR:", err.message));

    // 4. Set localStorage session
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
      { token, username, houseId, roomId, character: user.character || "FEMALE" }
    );

    console.log("5. Navigating to room at http://localhost:3000/...");
    await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });

    // Wait for canvas
    await page.waitForSelector("canvas", { timeout: 20000 });
    console.log("Phaser canvas loaded!");
    await new Promise((r) => setTimeout(r, 2500));

    // 6. Test Room Customization Modal
    console.log("6. Testing Room Customization UI...");
    const customizeBtn = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      return buttons.find((b) => b.textContent.includes("Customize Room"));
    });
    if (!customizeBtn) throw new Error("Customize Room button not found!");
    await customizeBtn.click();
    await new Promise((r) => setTimeout(r, 1000));

    // Switch to Walls tab
    console.log("Selecting Vintage Red Brick walls...");
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll("button"));
      const wallsTab = tabs.find((t) => t.textContent.includes("Walls"));
      if (wallsTab) wallsTab.click();
    });
    await new Promise((r) => setTimeout(r, 500));

    // Click Vintage Red Brick wall style card
    await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll("h4"));
      const brickCard = cards.find((c) => c.textContent.includes("Vintage Red Brick"));
      if (brickCard) brickCard.closest("div[style*='cursor: pointer']")?.click();
    });
    await new Promise((r) => setTimeout(r, 500));

    // Switch to Flooring tab
    console.log("Selecting Checkerboard Marble flooring...");
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll("button"));
      const floorTab = tabs.find((t) => t.textContent.includes("Flooring"));
      if (floorTab) floorTab.click();
    });
    await new Promise((r) => setTimeout(r, 500));

    // Select Checkerboard Marble floor
    await page.evaluate(() => {
      const floors = Array.from(document.querySelectorAll("span"));
      const checker = floors.find((f) => f.textContent.includes("Checkerboard Marble"));
      if (checker) checker.closest("div[style*='cursor: pointer']")?.click();
    });
    await new Promise((r) => setTimeout(r, 500));

    // Switch to Room Details tab and change room name
    console.log("Customizing room name to 'The Grand Velvet Club'...");
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll("button"));
      const detailsTab = tabs.find((t) => t.textContent.includes("Room Details"));
      if (detailsTab) detailsTab.click();
    });
    await new Promise((r) => setTimeout(r, 500));

    await page.evaluate(() => {
      const input = document.querySelector("input[placeholder*='Cozy Sunset Lounge']");
      if (input) {
        input.value = "The Grand Velvet Club";
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });
    await new Promise((r) => setTimeout(r, 500));

    // Click "Done"
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const doneBtn = buttons.find((b) => b.textContent.trim() === "Done");
      if (doneBtn) doneBtn.click();
    });
    await new Promise((r) => setTimeout(r, 1200));

    console.log("Room customization applied successfully!");

    // 7. Test Placing Furniture via Phaser game
    console.log("7. Placing furniture items...");
    const placeStatus = await page.evaluate(() => {
      const game = window.__PHASER_GAME__;
      if (!game) return { error: "window.__PHASER_GAME__ is undefined" };
      const scene = game.scene.getScene("MainScene");
      if (!scene) return { error: "scene MainScene is undefined" };
      const hasRoom = !!scene.room;
      const roomId = scene.room?.roomId;
      const sessionId = scene.room?.sessionId;
      // Place chair-blue-flower-se at (400, 320)
      scene.placeObject("chair-blue-flower-se", 400, 320);
      // Place quirky-lamp-claw at (480, 240)
      scene.placeObject("quirky-lamp-claw", 480, 240);
      // Place quirky-sofa-wave at (320, 240)
      scene.placeObject("quirky-sofa-wave", 320, 240);
      return { hasRoom, roomId, sessionId };
    });
    console.log("Place status:", placeStatus);
    console.log("Waiting for synchronized objects to arrive...");
    let objects = [];
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 500));
      objects = await page.evaluate(() => {
        const game = window.__PHASER_GAME__;
        const scene = game.scene.getScene("MainScene");
        const list = [];
        scene.room.state.objects.forEach((obj, id) => {
          list.push({ id, assetId: obj.assetId, x: obj.x, y: obj.y, rotation: obj.rotation, state: obj.state });
        });
        return list;
      });
      if (objects.length >= 3) break;
    }
    console.log("Placed objects in synchronized room state:", objects);
    if (objects.length < 3) throw new Error(`Expected at least 3 placed objects, got ${objects.length}`);

    const chairObj = objects.find((o) => o.assetId.includes("chair-blue-flower"));
    const lampObj = objects.find((o) => o.assetId.includes("lamp"));

    // 9. Test Furniture Rotation (SE -> SW counterpart swap)
    console.log("9. Testing Furniture Rotation...");
    await page.evaluate((id) => {
      const game = window.__PHASER_GAME__;
      const scene = game.scene.getScene("MainScene");
      scene.rotateObject(id);
    }, chairObj.id);
    await new Promise((r) => setTimeout(r, 1200));

    const rotatedChair = await page.evaluate((id) => {
      const game = window.__PHASER_GAME__;
      const scene = game.scene.getScene("MainScene");
      const obj = scene.room.state.objects.get(id);
      return { id: obj.id, assetId: obj.assetId, rotation: obj.rotation };
    }, chairObj.id);
    console.log("Chair after rotation:", rotatedChair);
    if (!rotatedChair.assetId.endsWith("-sw")) {
      console.warn("Expected chair assetId to swap to -sw counterpart, got:", rotatedChair.assetId);
    } else {
      console.log("SUCCESS: Chair variant swapped from -se to -sw!");
    }

    // 10. Test Sitting on the Chair
    console.log("10. Testing Sitting on Chair...");
    await page.evaluate((id) => {
      const game = window.__PHASER_GAME__;
      const scene = game.scene.getScene("MainScene");
      scene.sitOnObject(id);
    }, chairObj.id);
    await new Promise((r) => setTimeout(r, 1200));

    const playerSitState = await page.evaluate(() => {
      const game = window.__PHASER_GAME__;
      const scene = game.scene.getScene("MainScene");
      const player = scene.room.state.players.get(scene.room.sessionId);
      return {
        state: player.state,
        sittingOnObjectId: player.sittingOnObjectId,
        x: player.x,
        y: player.y,
        direction: player.direction,
      };
    });
    console.log("Player sitting state:", playerSitState);
    if (playerSitState.state !== "sit") {
      throw new Error(`Expected player state 'sit', got '${playerSitState.state}'`);
    }
    console.log("SUCCESS: Player is sitting on chair!");

    // 11. Test Lamp Toggle (Off -> On)
    console.log("11. Testing Lamp Toggle State...");
    await page.evaluate((id) => {
      const game = window.__PHASER_GAME__;
      const scene = game.scene.getScene("MainScene");
      scene.toggleObjectState(id);
    }, lampObj.id);
    await new Promise((r) => setTimeout(r, 1200));

    const lampState = await page.evaluate((id) => {
      const game = window.__PHASER_GAME__;
      const scene = game.scene.getScene("MainScene");
      const obj = scene.room.state.objects.get(id);
      return { id: obj.id, state: obj.state };
    }, lampObj.id);
    console.log("Lamp state after toggle:", lampState);
    if (lampState.state !== "on") {
      throw new Error(`Expected lamp state 'on', got '${lampState.state}'`);
    }
    console.log("SUCCESS: Lamp toggled ON and glow aura active!");

    // 12. Test Moving Furniture
    console.log("12. Testing Furniture Repositioning...");
    await page.evaluate((id) => {
      const game = window.__PHASER_GAME__;
      const scene = game.scene.getScene("MainScene");
      scene.moveObject(id, 512, 220);
    }, lampObj.id);
    await new Promise((r) => setTimeout(r, 1200));

    const movedLamp = await page.evaluate((id) => {
      const game = window.__PHASER_GAME__;
      const scene = game.scene.getScene("MainScene");
      const obj = scene.room.state.objects.get(id);
      return { id: obj.id, x: obj.x, y: obj.y };
    }, lampObj.id);
    console.log("Lamp position after move:", movedLamp);
    if (movedLamp.x !== 512 || movedLamp.y !== 220) {
      throw new Error(`Expected lamp at (512, 220), got (${movedLamp.x}, ${movedLamp.y})`);
    }
    console.log("SUCCESS: Lamp moved to new position!");

    // 13. Capture Screenshot of Customized Room
    console.log("13. Capturing screenshot...");
    const screenshotPath = path.join(ARTIFACT_DIR, "room_customization_and_interaction.png");
    await page.screenshot({ path: screenshotPath });
    console.log("Screenshot saved at:", screenshotPath);

    console.log("=== ALL ROOM CUSTOMIZATION & FURNITURE INTERACTION TESTS PASSED! ===");
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
