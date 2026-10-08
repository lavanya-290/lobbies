const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const executablePath = fs.existsSync(CHROME_PATH) ? CHROME_PATH : EDGE_PATH;

const ARTIFACT_DIR = "C:\\Users\\lavanya.singh\\.gemini\\antigravity-ide\\brain\\929ea65a-5f6d-4485-9f7e-0d60723dd9fe";

async function run() {
  console.log("=== Comprehensive Lobbies UI Chrome Validation ===");
  const browser = await puppeteer.launch({
    executablePath,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1280,900"],
    defaultViewport: { width: 1280, height: 900 },
  });

  try {
    const page = await browser.newPage();

    // 1. Visit Login
    console.log("1. Visiting /login...");
    await page.goto("http://localhost:3000/login", { waitUntil: "networkidle2" });
    await page.waitForSelector("#brand-logo-badge");
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "ui_chrome_login.png") });

    // 2. Register new test user
    const user = `uichrome_${Date.now().toString().slice(-4)}`;
    console.log(`2. Registering ${user}...`);
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const r = btns.find((b) => b.textContent.includes("REGISTER"));
      if (r) r.click();
    });
    await new Promise((r) => setTimeout(r, 400));
    await page.type("#username-input", user);
    await page.type("#password-input", "password123");
    await page.click("#auth-submit-btn");

    // Wait until we reach /houses
    console.log("Waiting for /houses...");
    await page.waitForFunction(() => window.location.pathname.includes("/houses"), { timeout: 10000 });
    // Wait for the house card to render
    await page.waitForFunction(
      () => Array.from(document.querySelectorAll("button")).some((b) => b.textContent.includes("ENTER SHARED ROOM")),
      { timeout: 10000 }
    );
    console.log("House card ready on /houses!");
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "ui_chrome_houses.png") });

    // 3. Click Enter Shared Room
    console.log("3. Entering Shared Room...");
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll("button")).find((b) =>
        b.textContent.includes("ENTER SHARED ROOM")
      );
      if (btn) btn.click();
    });

    // Wait until URL is '/' and phaser canvas is present
    await page.waitForFunction(() => window.location.pathname === "/", { timeout: 10000 });
    console.log("In room view!");
    await page.waitForSelector("#phaser-container canvas", { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 2000)); // wait for Phaser to render scene
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "ui_chrome_room.png") });

    // 4. Open Room Customization Modal
    console.log("4. Opening Customization Modal...");
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll("button")).find((b) =>
        b.textContent.includes("CUSTOMIZE")
      );
      if (btn) btn.click();
    });
    await page.waitForSelector("[id^='floor-tile-']", { timeout: 8000 });
    await new Promise((r) => setTimeout(r, 800));

    const floorList = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("[id^='floor-tile-']")).map((el) => el.id);
    });
    console.log("Floor tiles present in modal:", floorList);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "ui_chrome_modal_floors.png") });

    // 5. Click "DONE"
    console.log("5. Closing modal...");
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll("button")).find((b) =>
        b.textContent.includes("DONE")
      );
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 500));

    // 6. Open Wardrobe Overlay
    console.log("6. Opening Wardrobe...");
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll("button")).find((b) =>
        b.textContent.includes("WARDROBE")
      );
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 800));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "ui_chrome_wardrobe.png") });

    // Close Wardrobe
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll("button")).find((b) =>
        b.textContent.includes("CLOSE")
      );
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 500));

    // 7. Click Overworld button in Header Bar
    console.log("7. Going to Overworld from room header...");
    await page.click("#nav-overworld-btn");
    await page.waitForFunction(() => window.location.pathname.includes("/world"), { timeout: 10000 });
    await page.waitForSelector("#brand-logo-badge");
    await new Promise((r) => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "ui_chrome_overworld.png") });

    console.log("✓ All UI Chrome flows successfully tested and captured!");
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
