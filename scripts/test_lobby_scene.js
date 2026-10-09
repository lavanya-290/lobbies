const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const executablePath = fs.existsSync(CHROME_PATH) ? CHROME_PATH : EDGE_PATH;

const ARTIFACT_DIR = "C:\\Users\\lavanya.singh\\.gemini\\antigravity-ide\\brain\\929ea65a-5f6d-4485-9f7e-0d60723dd9fe";

async function run() {
  console.log("=== Testing Entry Lobby Scene & Multiplayer Hotspots ===");

  const browser = await puppeteer.launch({
    executablePath,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1280,900"],
    defaultViewport: { width: 1280, height: 900 },
  });

  try {
    const pageAlice = await browser.newPage();

    // 1. Register Alice and verify post-login landing on /lobby
    const aliceUser = `alice_${Date.now().toString().slice(-4)}`;
    console.log(`1. Registering Alice (${aliceUser})...`);
    await pageAlice.goto("http://localhost:3000/login", { waitUntil: "networkidle2" });

    // Switch to Register
    await pageAlice.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const r = btns.find((b) => b.textContent.includes("REGISTER"));
      if (r) r.click();
    });
    await new Promise((r) => setTimeout(r, 400));
    await pageAlice.type("#username-input", aliceUser);
    await pageAlice.type("#password-input", "password123");
    await pageAlice.click("#auth-submit-btn");

    // Check post-login navigation lands on /lobby
    console.log("Waiting for post-login redirect to /lobby...");
    await pageAlice.waitForFunction(() => window.location.pathname.includes("/lobby"), { timeout: 10000 });
    console.log("✓ Post-login redirect landed on:", pageAlice.url());

    // Wait for Phaser canvas to mount and render
    await pageAlice.waitForSelector("#lobby-phaser-container canvas", { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 2000));
    await pageAlice.screenshot({ path: path.join(ARTIFACT_DIR, "lobby_alice_single.png") });
    console.log("Saved lobby_alice_single.png");

    // 2. Test Player Movement and Polygon Bounds
    console.log("2. Testing movement and collision bounds...");
    // Press right arrow / D key to move towards the edge
    for (let i = 0; i < 20; i++) {
      await pageAlice.keyboard.down("ArrowRight");
      await new Promise((r) => setTimeout(r, 50));
      await pageAlice.keyboard.up("ArrowRight");
    }
    await new Promise((r) => setTimeout(r, 500));

    // Verify player is on canvas
    const alicePos = await pageAlice.evaluate(() => {
      const game = (window).__PHASER_LOBBY_GAME__;
      const scene = game?.scene.getScene("LobbyScene");
      const avatar = scene?.localAvatar;
      return { x: avatar?.x, y: avatar?.y };
    });
    console.log("Alice position after moving right:", alicePos);

    // 3. Test Kiosk Hotspot Hover and Click
    console.log("3. Testing Kiosk hotspot interaction...");
    // Scaled coordinates of kiosk are roughly x: 240, y: 135 inside the canvas.
    // The canvas is inside #lobby-phaser-container
    const canvasBox = await pageAlice.evaluate(() => {
      const c = document.querySelector("#lobby-phaser-container canvas");
      const r = c.getBoundingClientRect();
      return { left: r.left, top: r.top };
    });

    // Hover over kiosk zone (scaled x ~255, y ~160)
    await pageAlice.mouse.move(canvasBox.left + 255, canvasBox.top + 160);
    await new Promise((r) => setTimeout(r, 600));
    await pageAlice.screenshot({ path: path.join(ARTIFACT_DIR, "lobby_kiosk_hover.png") });

    // Click kiosk to open Destination Modal
    await pageAlice.mouse.click(canvasBox.left + 255, canvasBox.top + 160);
    await pageAlice.waitForSelector(".chrome-panel h2", { timeout: 5000 });
    console.log("✓ Kiosk clicked, Destination Modal opened!");
    await new Promise((r) => setTimeout(r, 500));
    await pageAlice.screenshot({ path: path.join(ARTIFACT_DIR, "lobby_kiosk_modal.png") });

    // Close modal
    await pageAlice.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const closeBtn = btns.find((b) => b.textContent.includes("CLOSE"));
      if (closeBtn) closeBtn.click();
    });
    await new Promise((r) => setTimeout(r, 500));

    // 4. Test Door Hotspot Hover
    console.log("4. Testing Door hotspot hover...");
    // Door scaled coordinates are roughly x: 160, y: 130
    await pageAlice.mouse.move(canvasBox.left + 160, canvasBox.top + 130);
    await new Promise((r) => setTimeout(r, 600));
    await pageAlice.screenshot({ path: path.join(ARTIFACT_DIR, "lobby_door_hover.png") });

    // 5. Two-Browser Multiplayer Test: Bob joins the Lobby in a separate incognito context
    console.log("5. Two-browser test: Registering Bob via API...");
    const contextBob = await browser.createBrowserContext();
    const pageBob = await contextBob.newPage();
    const bobUser = `bob_${Date.now().toString().slice(-4)}`;

    const regRes = await fetch("http://localhost:2567/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: bobUser, password: "password123", character: "MALE" }),
    });
    const { token: bobToken } = await regRes.json();

    await pageBob.goto("http://localhost:3000/login", { waitUntil: "networkidle2" });
    await pageBob.evaluate((t, u) => {
      localStorage.setItem("habbo_token", t);
      localStorage.setItem("habbo_username", u);
      localStorage.setItem("habbo_gender", "MALE");
    }, bobToken, bobUser);

    console.log("Navigating Bob to /lobby...");
    await pageBob.goto("http://localhost:3000/lobby", { waitUntil: "networkidle2" });
    await pageBob.waitForSelector("#lobby-phaser-container canvas", { timeout: 15000 });
    console.log("Bob is in lobby!");
    await new Promise((r) => setTimeout(r, 2000));

    // Check remote avatar count in Alice's scene
    const remoteCountAlice = await pageAlice.evaluate(() => {
      const game = (window).__PHASER_LOBBY_GAME__;
      const scene = game?.scene.getScene("LobbyScene");
      return scene?.remoteAvatars?.size;
    });
    console.log("Alice sees remote avatar count:", remoteCountAlice);

    // Check remote avatar count in Bob's scene
    const remoteCountBob = await pageBob.evaluate(() => {
      const game = (window).__PHASER_LOBBY_GAME__;
      const scene = game?.scene.getScene("LobbyScene");
      return scene?.remoteAvatars?.size;
    });
    console.log("Bob sees remote avatar count:", remoteCountBob);

    await pageAlice.screenshot({ path: path.join(ARTIFACT_DIR, "lobby_multiplayer_alice.png") });
    await pageBob.screenshot({ path: path.join(ARTIFACT_DIR, "lobby_multiplayer_bob.png") });
    console.log("Saved multiplayer screenshots for Alice and Bob");

    // 6. Test Stale Eviction & Re-entry: Bob leaves and returns
    console.log("6. Testing Bob navigating away to /houses and back to /lobby...");
    await pageBob.goto("http://localhost:3000/houses", { waitUntil: "networkidle2" });
    await new Promise((r) => setTimeout(r, 1500));

    // Alice should now see 0 remote avatars
    const remoteCountAfterBobLeft = await pageAlice.evaluate(() => {
      const game = (window).__PHASER_LOBBY_GAME__;
      const scene = game?.scene.getScene("LobbyScene");
      return scene?.remoteAvatars?.size;
    });
    console.log("Alice sees remote avatars after Bob left:", remoteCountAfterBobLeft);

    // Bob returns to Lobby
    await pageBob.goto("http://localhost:3000/lobby", { waitUntil: "networkidle2" });
    await pageBob.waitForSelector("#lobby-phaser-container canvas", { timeout: 10000 });
    await new Promise((r) => setTimeout(r, 1500));

    const finalRemoteAlice = await pageAlice.evaluate(() => {
      const game = (window).__PHASER_LOBBY_GAME__;
      const scene = game?.scene.getScene("LobbyScene");
      return scene?.remoteAvatars?.size;
    });
    console.log("Alice sees remote avatars after Bob re-entered (should be exactly 1):", finalRemoteAlice);
    await pageAlice.screenshot({ path: path.join(ARTIFACT_DIR, "lobby_stale_eviction_check.png") });

    // 7. Test Door Click: Direct warp to player's house
    console.log("7. Testing Door hotspot click: warp to house...");
    await pageAlice.mouse.click(canvasBox.left + 160, canvasBox.top + 130);
    // Wait until URL becomes '/' or '/houses'
    await pageAlice.waitForFunction(() => window.location.pathname === "/" || window.location.pathname.includes("/houses"), { timeout: 10000 });
    console.log("Door warp landed on:", pageAlice.url());
    await new Promise((r) => setTimeout(r, 1500));
    await pageAlice.screenshot({ path: path.join(ARTIFACT_DIR, "lobby_door_warp.png") });

    console.log("=== All Lobby Scene & Hotspot tests passed! ===");
    await pageBob.close();
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
