import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { createInterface } from "node:readline";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SCENES = [
  { id: "S01", label: "Hook — hero / private tree visual" },
  { id: "S02a", label: "Authenticated entry" },
  { id: "S02b", label: "Deliberate URL collection (or synthetic fallback)" },
  { id: "S03", label: "Private WatchTree — tree view" },
  { id: "S04", label: "Synthetic archetype matching" },
  { id: "S05a", label: "Evidence selection" },
  { id: "S05b", label: "Consent + simulated mutual" },
  { id: "S06a", label: "Privacy controls — matching off / exclusion" },
  { id: "S06b", label: "Delete all — empty restored state" },
  { id: "S07", label: "Base44 technical proof" },
  { id: "S08", label: "Ending card" },
];

function fail(msg) {
  console.error(`[capture-demo-video] ERROR: ${msg}`);
  process.exit(1);
}

function safeUrl(raw) {
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    fail(`Invalid URL: ${raw}`);
  }
  if (parsed.protocol !== "https:") {
    fail(`Only HTTPS URLs are allowed. Received protocol: ${parsed.protocol}`);
  }
  return parsed.href;
}

function safeOutputDir() {
  const dir = path.resolve(__dirname, "..", ".video-work");
  return dir;
}

async function waitForEnter(prompt) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(prompt, () => {
      rl.close();
      resolve();
    });
  });
}

async function main() {
  const demoUrl = process.env.WATCHTREE_DEMO_URL;
  if (!demoUrl) {
    fail("WATCHTREE_DEMO_URL environment variable is required. Set it to the HTTPS Production URL.");
  }

  const url = safeUrl(demoUrl);
  const outputDir = safeOutputDir();

  const dryRun = process.argv.includes("--dry-run");
  if (dryRun) {
    console.log("[capture-demo-video] DRY RUN");
    console.log(`  URL: ${url}`);
    console.log(`  Output directory: ${outputDir}`);
    console.log(`  Scenes: ${SCENES.length}`);
    console.log("[capture-demo-video] DRY RUN complete. No browser launched.");
    process.exit(0);
  }

  await mkdir(outputDir, { recursive: true });

  console.log("[capture-demo-video] Guided manual capture mode");
  console.log(`  Production URL: ${url}`);
  console.log(`  Video output directory: ${outputDir}`);
  console.log("  You will perform login and scene navigation manually.");
  console.log("  Press Enter at each prompt to mark a scene boundary.");
  console.log("");

  const browser = await chromium.launch({
    headless: false,
    args: ["--window-size=1920,1080"],
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: outputDir,
      size: { width: 1920, height: 1080 },
    },
  });

  const page = await context.newPage();

  console.log(`[capture-demo-video] Opening ${url}`);
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

  console.log("");
  console.log("[capture-demo-video] Log in with your sanitized test account now.");
  console.log("[capture-demo-video] Do NOT enter credentials in the terminal.");
  await waitForEnter("[capture-demo-video] Press Enter after login is complete... ");

  for (const scene of SCENES) {
    console.log("");
    console.log(`[capture-demo-video] Scene ${scene.id}: ${scene.label}`);
    console.log("[capture-demo-video] Navigate to the required state, then press Enter.");
    await waitForEnter(`[capture-demo-video] Press Enter when scene ${scene.id} is complete... `);
    console.log(`[capture-demo-video] Scene ${scene.id} marked.`);
  }

  console.log("");
  console.log("[capture-demo-video] All scenes complete. Closing browser...");

  await page.close();
  await context.close();
  await browser.close();

  const video = page.video();
  if (video) {
    const videoPath = await video.path();
    console.log(`[capture-demo-video] Video saved: ${videoPath}`);
  } else {
    console.log(`[capture-demo-video] Video files are in: ${outputDir}`);
  }

  console.log("[capture-demo-video] Capture complete.");
}

main().catch((err) => {
  fail(err.message);
});
