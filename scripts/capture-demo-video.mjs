/**
 * scripts/capture-demo-video.mjs
 *
 * Playwright guided manual capture helper for the WatchTree demo video.
 *
 * Usage:
 *   WATCHTREE_DEMO_URL="https://base44-resonance-40117c91.base44.app" \
 *     node scripts/capture-demo-video.mjs
 *
 * Environment:
 *   WATCHTREE_DEMO_URL  (required)  HTTPS production URL to capture
 *
 * Options:
 *   --output-dir <path>  Output directory for video (default: .video-work/)
 *   --width <px>         Viewport width  (default: 1920)
 *   --height <px>        Viewport height (default: 1080)
 *   --headed             Run browser in headed mode (default: true)
 *   --scene-labels       Print scene labels during capture (default: true)
 *   --allow-localhost    Allow localhost URLs (for development/testing)
 *   --dry-run            Validate configuration without launching browser
 *
 * Behavior:
 *   - Opens the production URL in a headed Chromium browser.
 *   - Prompts the user to log in manually (no credentials handled by script).
 *   - Walks through each scene; user presses Enter to advance markers.
 *   - Records video via Playwright recordVideo.
 *   - After browser close, prints the safe video output path.
 *   - Exits non-zero on error.
 *   - Does NOT save cookies, storageState, or passwords.
 *   - Does NOT auto-handle CAPTCHA.
 *   - Does NOT simulate the tutorial DOM.
 */

import { chromium } from "playwright";
import { mkdir, access } from "node:fs/promises";
import { createInterface } from "node:readline";
import { resolve, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { constants } from "node:fs";
import process from "node:process";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const __dirname = resolve(fileURLToPath(import.meta.url), "..");

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

function fail(message) {
  console.error(`[capture-demo-video] ERROR: ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const args = {
    outputDir: resolve(__dirname, "..", ".video-work"),
    width: 1920,
    height: 1080,
    headed: true,
    sceneLabels: true,
    allowLocalhost: false,
    dryRun: false,
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "--output-dir":   args.outputDir = resolve(process.cwd(), argv[++i]); break;
      case "--width":        args.width = parseInt(argv[++i], 10); break;
      case "--height":       args.height = parseInt(argv[++i], 10); break;
      case "--headed":       args.headed = true; break;
      case "--scene-labels": args.sceneLabels = true; break;
      case "--allow-localhost": args.allowLocalhost = true; break;
      case "--dry-run":      args.dryRun = true; break;
      default:
        if (arg.startsWith("--")) fail(`Unknown option: ${arg}`);
        break;
    }
  }

  return args;
}

function validateUrl(raw, allowLocalhost) {
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    fail(`Invalid URL: ${raw}`);
  }

  if (parsed.protocol !== "https:") {
    if (parsed.protocol === "http:" && parsed.hostname === "localhost" && allowLocalhost) {
      // allowed for development
    } else {
      fail(`Only HTTPS URLs are allowed. Received protocol: ${parsed.protocol} — ${raw}`);
    }
  }

  return parsed.href;
}

function validateDimensions(width, height) {
  if (!Number.isFinite(width) || width < 320 || width > 7680) fail(`Invalid --width: ${width}`);
  if (!Number.isFinite(height) || height < 240 || height > 4320) fail(`Invalid --height: ${height}`);
}

function validateOutputDir(dirPath) {
  if (!isAbsolute(dirPath)) fail(`Output directory must be an absolute path: ${dirPath}`);
  // Ensure it does not point inside sensitive locations
  const lower = dirPath.toLowerCase();
  if (lower.includes("node_modules") || lower.includes(".git")) {
    fail(`Output directory must not be inside node_modules or .git: ${dirPath}`);
  }
}

function isSecretLike(value) {
  // Reject CLI arguments that look like secrets, tokens, passwords
  const lower = (value || "").toLowerCase();
  return (
    lower.includes("password") ||
    lower.includes("token") ||
    lower.includes("secret") ||
    lower.includes("otp") ||
    lower.includes("cookie") ||
    lower.includes("hmac") ||
    lower.includes("api_key") ||
    lower.includes("apikey")
  );
}

async function checkPlaywright() {
  try {
    await access(resolve(__dirname, "..", "node_modules", "playwright"), constants.F_OK);
  } catch {
    fail(
      "Playwright not found in node_modules. " +
      "Run 'npm install' in the project root, or ensure Playwright is installed."
    );
  }
}

/* ------------------------------------------------------------------ */
/*  Prompt                                                             */
/* ------------------------------------------------------------------ */

function waitForEnter(promptText) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(promptText, () => {
      rl.close();
      resolve();
    });
  });
}

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */

async function main() {
  const args = parseArgs(process.argv);
  const demoUrl = process.env.WATCHTREE_DEMO_URL;

  // --- Input validation ---
  if (!demoUrl) {
    fail("WATCHTREE_DEMO_URL environment variable is required. Set it to the HTTPS Production URL.");
  }

  // Reject secret-like env vars being passed as WATCHTREE_DEMO_URL
  if (isSecretLike(demoUrl)) {
    fail("WATCHTREE_DEMO_URL appears to contain a secret or credential. Aborting.");
  }

  const url = validateUrl(demoUrl, args.allowLocalhost);
  validateDimensions(args.width, args.height);
  validateOutputDir(args.outputDir);

  // --- Dry run ---
  if (args.dryRun) {
    console.log("[capture-demo-video] DRY RUN");
    console.log(`  URL:            ${url}`);
    console.log(`  Output directory: ${args.outputDir}`);
    console.log(`  Viewport:       ${args.width}x${args.height}`);
    console.log(`  Headed:         ${args.headed}`);
    console.log(`  Scene count:    ${SCENES.length}`);
    console.log(`  Scene labels:   ${args.sceneLabels}`);
    console.log("[capture-demo-video] DRY RUN complete. No browser launched.");
    process.exit(0);
  }

  // --- Check Playwright availability ---
  await checkPlaywright();

  // --- Create output directory ---
  await mkdir(args.outputDir, { recursive: true });

  console.log("[capture-demo-video] Guided manual capture mode");
  console.log(`  Production URL: ${url}`);
  console.log(`  Video output:   ${args.outputDir}`);
  console.log(`  Viewport:       ${args.width}x${args.height}`);
  console.log("");
  console.log("  You will perform login and scene navigation manually.");
  console.log("  No credentials are read by this script.");
  console.log("  Press Enter at each prompt to mark a scene boundary.");
  console.log("");

  // --- Launch browser ---
  const browser = await chromium.launch({
    headless: !args.headed,
    args: [`--window-size=${args.width},${args.height}`],
  });

  const context = await browser.newContext({
    viewport: { width: args.width, height: args.height },
    recordVideo: {
      dir: args.outputDir,
      size: { width: args.width, height: args.height },
    },
  });

  const page = await context.newPage();

  // --- Navigate to production URL ---
  console.log(`[capture-demo-video] Opening ${url}`);
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

  // --- Wait for login ---
  console.log("");
  console.log("[capture-demo-video] Log in with your sanitized test account now.");
  console.log("[capture-demo-video] Do NOT enter credentials in the terminal.");
  await waitForEnter("[capture-demo-video] Press Enter after login is complete... ");

  // --- Scene markers ---
  for (const scene of SCENES) {
    console.log("");
    const label = args.sceneLabels
      ? `Scene ${scene.id}: ${scene.label}`
      : `Scene ${scene.id}`;
    console.log(`[capture-demo-video] ${label}`);
    console.log("[capture-demo-video] Navigate to the required state, then press Enter.");
    await waitForEnter(`[capture-demo-video] Press Enter when ${scene.id} is complete... `);
    console.log(`[capture-demo-video] Scene ${scene.id} marked.`);
  }

  // --- Close ---
  console.log("");
  console.log("[capture-demo-video] All scenes complete. Closing browser...");

  await page.close();
  await context.close();
  await browser.close();

  // --- Report video path ---
  const video = page.video();
  if (video) {
    const videoPath = await video.path();
    // Print only the path, never the video binary content
    console.log(`[capture-demo-video] Video saved: ${videoPath}`);
    console.log(`[capture-demo-video] Use scripts/render-demo-video.mjs to process.`);
  } else {
    console.log(`[capture-demo-video] Video files are in: ${args.outputDir}`);
  }

  console.log("[capture-demo-video] Capture complete.");
}

main().catch((err) => {
  fail(err.message || String(err));
});
