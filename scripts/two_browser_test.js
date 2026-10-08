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
  console.log("=== Running Two-Browser Shared Room Visibility Test ===");
  console.log("Using browser at:", executablePath);

  const userAlice = `alice_${Date.now().toString().slice(-5)}`;
  const userBob = `bob_${Date.now().toString().slice(-5)}`;

  // 1. Setup Alice via API
  console.log(`1. Registering Alice (${userAlice}) via API...`);
  const regARes = await fetch("http://localhost:2567/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: userAlice, password: "password123", character: "FEMALE" }),
  });
  if (!regARes.ok) throw new Error(`Alice register failed: ${await regARes.text()}`);
  const { token: aliceToken } = await regARes.json();

  console.log("Creating house for Alice via API...");
  const createHouseRes = await fetch("http://localhost:2567/houses", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${aliceToken}` },
  });
  if (!createHouseRes.ok) throw new Error(`Alice create house failed: ${await createHouseRes.text()}`);
  const house = await createHouseRes.json();
  const inviteCode = house.inviteCode;
  const sharedRoomId = house.sharedRoom.id;
  console.log(`House created: ${house.id}, Shared Room: ${sharedRoomId}, Invite: ${inviteCode}`);

  // 2. Setup Bob via API
  console.log(`2. Registering Bob (${userBob}) via API...`);
  const regBRes = await fetch("http://localhost:2567/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: userBob, password: "password123", character: "MALE" }),
  });
  if (!regBRes.ok) throw new Error(`Bob register failed: ${await regBRes.text()}`);
  const { token: bobToken } = await regBRes.json();

  console.log(`Bob joining Alice's house with invite code ${inviteCode}...`);
  const joinRes = await fetch(`http://localhost:2567/houses/${house.id}/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${bobToken}` },
    body: JSON.stringify({ inviteCode }),
  });
  if (!joinRes.ok) throw new Error(`Bob join failed: ${await joinRes.text()}`);
  console.log("Bob successfully joined house in database.");

  // 3. Launch Browser with Two Separate Contexts (Alice & Bob)
  const browser = await puppeteer.launch({
    executablePath,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--window-size=1000,800"],
  });

  try {
    // Context A (Alice)
    const contextA = await browser.createBrowserContext();
    const pageA = await contextA.newPage();
    await pageA.setViewport({ width: 1000, height: 800 });

    // Context B (Bob)
    const contextB = await browser.createBrowserContext();
    const pageB = await contextB.newPage();
    await pageB.setViewport({ width: 1000, height: 800 });

    // Inject Alice Session & Enter Room
    console.log("\n3. Loading Alice in Tab A...");
    await pageA.goto("http://localhost:3000/login", { waitUntil: "domcontentloaded" });
    await pageA.evaluate(({ token, username, houseId, sharedRoomId }) => {
      localStorage.setItem("habbo_token", token);
      localStorage.setItem("habbo_username", username);
      localStorage.setItem("habbo_gender", "FEMALE");
      localStorage.setItem("habbo_character", "FEMALE");
      localStorage.setItem("habbo_selected_house_id", houseId);
      localStorage.setItem("habbo_selected_room_id", sharedRoomId);
      localStorage.setItem("habbo_selected_room_type", "SHARED");
      localStorage.setItem("habbo_selected_shared_room_id", sharedRoomId);
    }, { token: aliceToken, username: userAlice, houseId: house.id, sharedRoomId });

    await pageA.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });
    await pageA.waitForSelector("canvas", { timeout: 15000 });
    console.log("Tab A (Alice) entered room:", pageA.url());
    console.log("Tab A canvas mounted.");

    // Inject Bob Session & Enter Room
    console.log("\n4. Loading Bob in Tab B...");
    await pageB.goto("http://localhost:3000/login", { waitUntil: "domcontentloaded" });
    await pageB.evaluate(({ token, username, houseId, sharedRoomId }) => {
      localStorage.setItem("habbo_token", token);
      localStorage.setItem("habbo_username", username);
      localStorage.setItem("habbo_gender", "MALE");
      localStorage.setItem("habbo_character", "MALE");
      localStorage.setItem("habbo_selected_house_id", houseId);
      localStorage.setItem("habbo_selected_room_id", sharedRoomId);
      localStorage.setItem("habbo_selected_room_type", "SHARED");
      localStorage.setItem("habbo_selected_shared_room_id", sharedRoomId);
    }, { token: bobToken, username: userBob, houseId: house.id, sharedRoomId });

    await pageB.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });
    await pageB.waitForSelector("canvas", { timeout: 15000 });
    console.log("Tab B (Bob) entered room:", pageB.url());
    console.log("Tab B canvas mounted.");

    // Wait for state sync
    console.log("\nWaiting 2 seconds for initial sync...");
    await new Promise((r) => setTimeout(r, 2000));

    // Have Bob focus canvas (at offset 200, 450 to avoid clicking avatar at 400, 300) and walk to the left
    console.log("Having Bob focus canvas and walk to the left...");
    await pageB.click("canvas", { offset: { x: 200, y: 450 } });
    await pageB.keyboard.down("ArrowLeft");
    await new Promise((r) => setTimeout(r, 1200));
    await pageB.keyboard.up("ArrowLeft");
    await new Promise((r) => setTimeout(r, 1000));

    // Capture Screenshots of rendered canvases
    const screenshotAPath = path.join(ARTIFACT_DIR, "tab_a_alice.png");
    const screenshotBPath = path.join(ARTIFACT_DIR, "tab_b_bob.png");
    await pageA.screenshot({ path: screenshotAPath });
    await pageB.screenshot({ path: screenshotBPath });
    console.log("\nScreenshot Tab A saved to:", screenshotAPath);
    console.log("Screenshot Tab B saved to:", screenshotBPath);
    console.log("Test completed successfully!");

  } catch (err) {
    console.error("Test error:", err);
  } finally {
    await browser.close();
  }
}

run();
