#!/usr/bin/env node

import {access, copyFile, mkdir, rename, stat, unlink} from "node:fs/promises";
import {constants as fsConstants} from "node:fs";
import {spawnSync} from "node:child_process";
import {dirname, resolve, sep} from "node:path";
import {fileURLToPath} from "node:url";
import process from "node:process";

const videoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(videoRoot, "..");
const outRoot = resolve(videoRoot, "out");

function fail(message) {
  throw new Error(message);
}

function parseArgs(argv) {
  const mode = argv[2];
  if (!new Set(["preview", "final"]).has(mode)) fail("Usage: node scripts/render.mjs <preview|final> [--output path] [--overwrite]");
  const result = {mode, overwrite: false, output: resolve(outRoot, mode === "final" ? "watchtree-demo-final.mp4" : "watchtree-demo-preview.mp4")};
  for (let index = 3; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--overwrite") result.overwrite = true;
    else if (arg === "--output") {
      const value = argv[++index];
      if (!value || value.startsWith("--")) fail("--output requires a path");
      result.output = resolve(videoRoot, value);
    }
    else fail(`Unknown argument: ${arg}`);
  }
  if (result.output !== outRoot && !result.output.startsWith(`${outRoot}${sep}`)) fail("Output must stay inside video/out/");
  if (!result.output.endsWith(".mp4")) fail("Output filename must end in .mp4");
  return result;
}

async function fileExists(path) {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

async function findBrowser() {
  const candidates = [process.env.REMOTION_BROWSER_EXECUTABLE, "/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/google-chrome"].filter(Boolean);
  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Continue to the next known browser. No download or install is attempted here.
    }
  }
  return null;
}

function runPreflight(mode) {
  const result = spawnSync(
    process.execPath,
    [resolve(repoRoot, "scripts/validate-demo-assets.mjs"), "--mode", mode, "--json"],
    {cwd: repoRoot, encoding: "utf8"},
  );
  let report;
  try {
    report = JSON.parse(result.stdout.trim());
  } catch {
    fail(`Asset validator returned invalid output: ${result.stderr.trim() || result.stdout.trim()}`);
  }
  if (result.status !== 0 || !report.ok) {
    report.errors.forEach((error) => console.error(`[render-demo] PREFLIGHT: ${error}`));
    fail(`${mode} preflight failed`);
  }
  return report;
}

function verifyOutput(path, expectedDuration) {
  const probe = spawnSync(
    "ffprobe",
    [
      "-v", "error",
      "-show_entries", "format=duration:stream=codec_name,codec_type,width,height,avg_frame_rate",
      "-of", "json",
      path,
    ],
    {encoding: "utf8"},
  );
  if (probe.status !== 0) fail(`ffprobe failed for rendered output: ${probe.stderr.trim()}`);
  const data = JSON.parse(probe.stdout);
  const duration = Number(data.format.duration);
  const video = data.streams.find((stream) => stream.codec_type === "video");
  const audio = data.streams.find((stream) => stream.codec_type === "audio");
  const failures = [];
  if (Math.abs(duration - expectedDuration) > 0.15) failures.push(`duration ${duration}s (expected ${expectedDuration}s)`);
  if (video?.codec_name !== "h264") failures.push(`video codec ${video?.codec_name || "missing"} (expected h264)`);
  if (video?.width !== 1920 || video?.height !== 1080) failures.push(`resolution ${video?.width}x${video?.height} (expected 1920x1080)`);
  if (video?.avg_frame_rate !== "30/1") failures.push(`frame rate ${video?.avg_frame_rate || "missing"} (expected 30/1)`);
  if (audio?.codec_name !== "aac") failures.push(`audio codec ${audio?.codec_name || "missing"} (expected aac)`);
  if (failures.length > 0) fail(`Rendered output validation failed: ${failures.join("; ")}`);
  console.log(`[render-demo] Verified ${duration.toFixed(3)}s · 1920x1080 · 30fps · H.264/AAC`);
}

async function main() {
  const args = parseArgs(process.argv);
  const report = runPreflight(args.mode);
  if ((await fileExists(args.output)) && !args.overwrite) fail(`Output exists. Re-run with --overwrite to replace: ${args.output}`);
  await mkdir(outRoot, {recursive: true});
  let temporaryOutput = resolve(outRoot, `.watchtree-${args.mode}-${process.pid}-${Date.now()}.mp4`);

  try {

    const remotionBinary = resolve(videoRoot, "node_modules", ".bin", process.platform === "win32" ? "remotion.cmd" : "remotion");
    if (!(await fileExists(remotionBinary))) fail("Remotion CLI is not installed. Run npm ci inside video/.");
    const browser = await findBrowser();
    if (!browser) fail("No approved Chromium executable found. Set REMOTION_BROWSER_EXECUTABLE; automatic browser download is disabled.");
    const props = JSON.stringify({
      renderMode: args.mode,
      availableAssetIds: report.assets.availableAssetIds,
      sceneTruth: report.verification?.sceneTruth || {},
    });
    const renderArgs = [
      "render",
      "src/index.ts",
      report.composition.id,
      temporaryOutput,
      "--codec=h264",
      "--audio-codec=aac",
      "--pixel-format=yuv420p",
      "--enforce-audio-track",
      "--overwrite=false",
      "--concurrency=1",
      `--props=${props}`,
      "--log=info",
      `--browser-executable=${browser}`,
    ];

    console.log(`[render-demo] Rendering ${args.mode} composition to video/out/${args.output.split(sep).at(-1)}`);
    const render = spawnSync(remotionBinary, renderArgs, {cwd: videoRoot, stdio: "inherit"});
    if (render.status !== 0) fail(`Remotion exited with status ${render.status}`);
    verifyOutput(temporaryOutput, report.composition.durationSeconds);

    if (args.overwrite) {
      await rename(temporaryOutput, args.output);
    } else {
      try {
        await copyFile(temporaryOutput, args.output, fsConstants.COPYFILE_EXCL);
      } catch (error) {
        if (error.code === "EEXIST") fail(`Output appeared during render and was preserved: ${args.output}`);
        throw error;
      }
      await unlink(temporaryOutput);
    }
    temporaryOutput = null;
    console.log(`[render-demo] Promoted verified render to video/out/${args.output.split(sep).at(-1)}`);
  } finally {
    if (temporaryOutput) await unlink(temporaryOutput).catch(() => {});
  }
}

main().catch((error) => {
  console.error(`[render-demo] ERROR: ${error.message}`);
  process.exitCode = 1;
});
