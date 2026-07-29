#!/usr/bin/env node

/**
 * Guided Playwright capture for WatchTree submission footage.
 *
 * This script never accepts credentials. Authentication is performed manually on a
 * disposable page. That page's transient Playwright video is deleted before a
 * separate authenticated capture page is opened in the same in-memory context.
 * No storageState, cookies, browser profile, password, OTP, or token is saved.
 */

import {mkdir, writeFile} from "node:fs/promises";
import {createInterface} from "node:readline";
import {dirname, isAbsolute, relative, resolve, sep} from "node:path";
import {fileURLToPath} from "node:url";
import {performance} from "node:perf_hooks";
import process from "node:process";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");

const LANDING_SCENE = {
  id: "S01",
  label: "Final Production landing with both truthful product choices",
  output: "01-landing.webm",
  expectedDuration: 12,
};

const AUTHENTICATED_SCENES = [
  {id: "S02", label: "Verified URL entry or visibly synthetic fallback", output: "02-url-entry.webm", expectedDuration: 24},
  {id: "S03", label: "Private tree: count, repeat, rhythm, sequence", output: "03-private-tree.webm", expectedDuration: 24},
  {id: "S04", label: "Synthetic archetype with inspectable evidence", output: "04-synthetic-match.webm", expectedDuration: 25},
  {id: "S05", label: "Evidence consent and simulated mutual disclosures", output: "05-consent-mutual.webm", expectedDuration: 23},
  {id: "S06", label: "Exclusion, matching toggle, delete all, empty state", output: "06-delete.webm", expectedDuration: 18},
  {id: "S07", label: "Sanitized exact-release Base44 proof", output: "07-base44-proof.webm", expectedDuration: 22},
];

function fail(message) {
  throw new Error(message);
}

function nextValue(argv, index, option) {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) fail(`${option} requires a value`);
  return value;
}

function parseArgs(argv) {
  const result = {
    outputDir: resolve(repoRoot, ".video-work"),
    width: 1920,
    height: 1080,
    allowLocalhost: false,
    landingOnly: false,
    dryRun: false,
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (/password|token|secret|cookie|otp|hmac|api[_-]?key/i.test(arg)) {
      fail(`Credential-like CLI input is forbidden: ${arg.split("=")[0]}`);
    }
    if (arg === "--output-dir") {
      result.outputDir = resolve(process.cwd(), nextValue(argv, index, arg));
      index += 1;
    } else if (arg === "--width") {
      result.width = Number(nextValue(argv, index, arg));
      index += 1;
    } else if (arg === "--height") {
      result.height = Number(nextValue(argv, index, arg));
      index += 1;
    } else if (arg === "--allow-localhost") result.allowLocalhost = true;
    else if (arg === "--landing-only") result.landingOnly = true;
    else if (arg === "--dry-run") result.dryRun = true;
    else fail(`Unknown option: ${arg}`);
  }

  if (!Number.isInteger(result.width) || result.width < 320 || result.width > 7680) fail(`Invalid width: ${result.width}`);
  if (!Number.isInteger(result.height) || result.height < 240 || result.height > 4320) fail(`Invalid height: ${result.height}`);
  if (!isAbsolute(result.outputDir)) fail("Output directory must resolve to an absolute path");
  const lowered = result.outputDir.toLowerCase();
  if (lowered.includes(`${sep}.git`) || lowered.includes(`${sep}node_modules`) || lowered.includes(`${sep}video${sep}public`)) {
    fail("Output directory must not be inside .git, node_modules, or video/public");
  }
  return result;
}

function validateUrl(raw, allowLocalhost) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    fail("WATCHTREE_DEMO_URL must be a valid URL");
  }
  const localHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);
  const isLocal = localHosts.has(url.hostname);
  if (url.protocol !== "https:" && !(allowLocalhost && isLocal && url.protocol === "http:")) {
    fail("WATCHTREE_DEMO_URL must use HTTPS; HTTP localhost requires --allow-localhost");
  }
  if (isLocal && !allowLocalhost) fail("Localhost capture requires --allow-localhost");
  if (url.username || url.password || url.search || url.hash) {
    fail("WATCHTREE_DEMO_URL must not contain credentials, query parameters, or fragments");
  }
  return url;
}

function waitForEnter(message) {
  const input = createInterface({input: process.stdin, output: process.stdout});
  return new Promise((resolvePromise) => {
    input.question(message, () => {
      input.close();
      resolvePromise();
    });
  });
}

function sessionStamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function loadChromium() {
  try {
    const playwright = await import("playwright");
    return playwright.chromium;
  } catch {
    fail("Playwright is unavailable. Use the existing project/browser runtime; do not add a root dependency for this helper.");
  }
}

async function deleteTransientVideo(video) {
  if (!video) return;
  try {
    await video.delete();
  } catch {
    fail("Could not delete the transient manual-login recording. Stop and remove it before continuing.");
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const rawUrl = process.env.WATCHTREE_DEMO_URL;
  if (!rawUrl) fail("WATCHTREE_DEMO_URL is required");
  if (/password|token|secret|cookie|otp|hmac|api[_-]?key/i.test(rawUrl)) fail("WATCHTREE_DEMO_URL appears credential-like");
  const url = validateUrl(rawUrl, args.allowLocalhost);
  const scenes = args.landingOnly ? [LANDING_SCENE] : AUTHENTICATED_SCENES;
  const deployedSha = process.env.WATCHTREE_DEPLOYED_SHA || "";
  const urlSceneResolution = process.env.WATCHTREE_URL_SCENE || "";
  if (!args.dryRun && !/^[0-9a-f]{40}$/.test(deployedSha)) {
    fail("WATCHTREE_DEPLOYED_SHA must be the exact 40-character deployed SHA for a real capture");
  }
  if (!args.dryRun && !args.landingOnly && !new Set(["VERIFIED_PRODUCTION", "SYNTHETIC_FALLBACK"]).has(urlSceneResolution)) {
    fail("WATCHTREE_URL_SCENE must be VERIFIED_PRODUCTION or SYNTHETIC_FALLBACK for authenticated capture");
  }

  if (args.dryRun) {
    console.log("[capture-demo-video] DRY RUN PASS");
    console.log(`  Origin: ${url.origin}`);
    console.log(`  Mode: ${args.landingOnly ? "signed-out landing" : "authenticated scenes"}`);
    console.log(`  Viewport: ${args.width}x${args.height}`);
    console.log(`  Scene markers: ${scenes.map((scene) => scene.id).join(", ")}`);
    console.log(`  Deployed SHA supplied: ${deployedSha ? "yes" : "no (required for real capture)"}`);
    if (!args.landingOnly) console.log(`  URL scene resolution: ${urlSceneResolution || "not supplied (required for real capture)"}`);
    return;
  }

  const chromium = await loadChromium();
  const sessionDir = resolve(args.outputDir, `${args.landingOnly ? "landing" : "authenticated"}-${sessionStamp()}`);
  const rawDir = resolve(sessionDir, "raw");
  await mkdir(rawDir, {recursive: true});

  let browser;
  let context;
  let loginPage;
  let loginVideo;
  let capturePage;
  let captureVideo;
  let completed = false;

  try {
    browser = await chromium.launch({
      headless: false,
      args: [`--window-size=${args.width},${args.height}`],
    });
    context = await browser.newContext({
      viewport: {width: args.width, height: args.height},
      recordVideo: {dir: rawDir, size: {width: args.width, height: args.height}},
    });

    if (!args.landingOnly) {
      loginPage = await context.newPage();
      loginVideo = loginPage.video();
      await loginPage.goto(url.href, {waitUntil: "domcontentloaded", timeout: 45_000});
      console.log("[capture-demo-video] Authenticate manually in the browser with the dedicated synthetic account.");
      console.log("[capture-demo-video] Never type a password, OTP, or token in this terminal.");
      await waitForEnter("[capture-demo-video] Press Enter only after authenticated UAT state is ready... ");
      await loginPage.close();
      loginPage = null;
      await deleteTransientVideo(loginVideo);
      loginVideo = null;
      console.log("[capture-demo-video] Transient manual-login recording deleted; no login footage retained.");
    }

    const captureStartedAt = performance.now();
    capturePage = await context.newPage();
    captureVideo = capturePage.video();
    let pageErrors = 0;
    let consoleErrors = 0;
    capturePage.on("pageerror", () => { pageErrors += 1; });
    capturePage.on("console", (message) => { if (message.type() === "error") consoleErrors += 1; });
    await capturePage.goto(url.href, {waitUntil: "domcontentloaded", timeout: 45_000});

    const markers = [];
    for (const scene of scenes) {
      console.log(`\n[capture-demo-video] Prepare ${scene.id}: ${scene.label}`);
      console.log(`[capture-demo-video] Target retained clip: ${scene.output} (at least ${scene.expectedDuration}s)`);
      await waitForEnter(`[capture-demo-video] Press Enter when ${scene.id} is settled and ready to begin... `);
      const startSeconds = (performance.now() - captureStartedAt) / 1000;
      console.log(`[capture-demo-video] ${scene.id} START — perform only the planned action.`);
      await waitForEnter(`[capture-demo-video] Press Enter when ${scene.id} is complete... `);
      const endSeconds = (performance.now() - captureStartedAt) / 1000;
      markers.push({
        id: scene.id,
        label: scene.label,
        output: scene.output,
        expectedDuration: scene.expectedDuration,
        startSeconds: Number(startSeconds.toFixed(3)),
        endSeconds: Number(endSeconds.toFixed(3)),
        capturedDuration: Number((endSeconds - startSeconds).toFixed(3)),
      });
      if (endSeconds - startSeconds < scene.expectedDuration) {
        fail(`${scene.id} captured only ${(endSeconds - startSeconds).toFixed(3)}s; required ${scene.expectedDuration}s. Re-record without freeze-frame padding.`);
      }
      console.log(`[capture-demo-video] ${scene.id} END marker saved.`);
    }

    await capturePage.close();
    capturePage = null;
    await context.close();
    context = null;
    await browser.close();
    browser = null;

    if (!captureVideo) fail("Playwright did not create a capture video");
    const retainedName = args.landingOnly ? "landing-session.raw.webm" : "authenticated-scenes.raw.webm";
    const retainedPath = resolve(sessionDir, retainedName);
    await captureVideo.saveAs(retainedPath);
    await captureVideo.delete();
    captureVideo = null;

    const markerPath = resolve(sessionDir, "scene-markers.json");
    await writeFile(
      markerPath,
      `${JSON.stringify({
        status: "RAW_CAPTURE_ONLY",
        productionOrigin: url.origin,
        deployedSha,
        urlSceneResolution: args.landingOnly ? "NOT_APPLICABLE" : urlSceneResolution,
        viewport: {width: args.width, height: args.height},
        loginFootageRetained: false,
        storageStateSaved: false,
        cookiesSaved: false,
        pageErrors,
        consoleErrors,
        markers,
      }, null, 2)}\n`,
      {encoding: "utf8", flag: "wx"},
    );
    completed = true;

    console.log("\n[capture-demo-video] Raw capture finalized after context close.");
    console.log(`  Video: ${relative(process.cwd(), retainedPath)}`);
    console.log(`  Markers: ${relative(process.cwd(), markerPath)}`);
    console.log(`  Page errors: ${pageErrors}; console errors: ${consoleErrors}`);
    console.log("  Next: privacy review, then FFmpeg trim into the ignored video/public/clips filenames.");
  } finally {
    if (capturePage) await capturePage.close().catch(() => {});
    if (loginPage) await loginPage.close().catch(() => {});
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
    if (loginVideo) await deleteTransientVideo(loginVideo);
    if (!completed && captureVideo) await captureVideo.delete().catch(() => {});
  }
}

main().catch((error) => {
  console.error(`[capture-demo-video] ERROR: ${error.message}`);
  process.exitCode = 1;
});
