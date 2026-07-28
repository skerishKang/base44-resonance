/**
 * scripts/render-demo-video.mjs
 *
 * FFmpeg render helper for the WatchTree demo video.
 *
 * Usage:
 *   node scripts/render-demo-video.mjs \
 *     --input .video-work/combined.mp4 \
 *     --narration .video-work/narration.wav \
 *     --srt docs/submission/watchtree-demo.en.srt \
 *     --output video-output/watchtree-demo.mp4 \
 *     [--force] [--dry-run]
 *
 * Requirements:
 *   - ffmpeg must be installed locally (not downloaded by this script)
 *   - Node.js built-in modules only (no npm dependencies)
 *
 * Behaviour:
 *   - Validates all input files exist
 *   - Refuses to overwrite existing output without --force
 *   - Uses argument array (no shell string) to prevent injection
 *   - Passes through ffmpeg exit code
 *   - Output: H.264, AAC, 1920×1080, 30fps, faststart
 *   - Dry-run mode prints the command without executing
 */

import { execFileSync, execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const __dirname = resolve(fileURLToPath(import.meta.url), "..");

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function fail(message) {
  console.error(`[render-demo-video] ERROR: ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const args = {
    input: null,
    narration: null,
    srt: null,
    output: null,
    force: false,
    dryRun: false,
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "--input":
        args.input = resolve(process.cwd(), argv[++i]);
        break;
      case "--narration":
        args.narration = resolve(process.cwd(), argv[++i]);
        break;
      case "--srt":
        args.srt = resolve(process.cwd(), argv[++i]);
        break;
      case "--output":
        args.output = resolve(process.cwd(), argv[++i]);
        break;
      case "--force":
        args.force = true;
        break;
      case "--dry-run":
        args.dryRun = true;
        break;
      default:
        if (arg.startsWith("--")) fail(`Unknown option: ${arg}`);
        break;
    }
  }

  return args;
}

function checkFfmpeg() {
  try {
    execSync("ffmpeg -version", { stdio: "ignore", timeout: 10000 });
  } catch {
    fail(
      "ffmpeg not found. Install it from https://ffmpeg.org/download.html " +
      "or via your package manager. " +
      "This script does NOT download ffmpeg automatically."
    );
  }
}

/**
 * Build the FFmpeg argument array.
 * Uses an array (not a shell string) to prevent injection.
 */
function buildCommand(args) {
  const cmd = ["ffmpeg"];

  // Overwrite guard: -n = never overwrite, -y = allow overwrite
  cmd.push(args.force ? "-y" : "-n");

  // Input(s)
  cmd.push("-i", args.input);
  if (args.narration) {
    cmd.push("-i", args.narration);
  }

  // Build video filter
  const filterParts = [];

  // Burn subtitles if SRT provided
  if (args.srt) {
    // Escape special characters for FFmpeg subtitles filter
    const escaped = args.srt
      .replace(/\\/g, "\\\\")
      .replace(/'/g, "\\\\'")
      .replace(/:/g, "\\:");
    filterParts.push(`subtitles='${escaped}'`);
  }

  // Scale and frame rate
  filterParts.push("scale=1920:1080,fps=30");

  cmd.push("-vf", filterParts.join(","));

  // Video codec
  cmd.push("-c:v", "libx264");
  cmd.push("-preset", "medium");
  cmd.push("-crf", "20");

  // Audio codec
  cmd.push("-c:a", "aac");
  cmd.push("-b:a", "192k");

  // Web optimization
  cmd.push("-movflags", "+faststart");

  // Frame rate output
  cmd.push("-r", "30");

  // Output
  cmd.push(args.output);

  return cmd;
}

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */

function main() {
  const args = parseArgs(process.argv);

  // --- Input validation ---
  if (!args.input) fail("--input <mp4> is required.");
  if (!args.output) fail("--output <mp4> is required.");

  if (!existsSync(args.input)) fail(`Input file not found: ${args.input}`);
  if (args.narration && !existsSync(args.narration)) {
    fail(`Narration file not found: ${args.narration}`);
  }
  if (args.srt && !existsSync(args.srt)) {
    fail(`SRT file not found: ${args.srt}`);
  }

  // Overwrite guard
  if (existsSync(args.output) && !args.force) {
    fail(
      `Output file already exists: ${args.output}. ` +
      "Pass --force to overwrite it."
    );
  }

  // Check ffmpeg is available
  if (!args.dryRun) {
    checkFfmpeg();
  }

  // Build command array (no shell string — prevents injection)
  const cmd = buildCommand(args);

  // --- Dry run ---
  if (args.dryRun) {
    console.log("[render-demo-video] DRY RUN — command that would be executed:");
    console.log("  " + cmd.join(" "));
    console.log("[render-demo-video] DRY RUN complete. No file written.");
    process.exit(0);
  }

  // --- Execute ---
  console.log("[render-demo-video] Rendering...");
  console.log("  Input:      " + args.input);
  console.log("  Narration:  " + (args.narration || "(none)"));
  console.log("  SRT:        " + (args.srt || "(none)"));
  console.log("  Output:     " + args.output);
  console.log("  Overwrite:  " + (args.force ? "yes" : "no"));

  try {
    execFileSync(cmd[0], cmd.slice(1), { stdio: "inherit", timeout: 600000 });
  } catch (err) {
    // Pass through ffmpeg exit code
    const code = err.status !== undefined && err.status !== null ? err.status : 1;
    fail(`ffmpeg exited with code ${code}`);
  }

  console.log("[render-demo-video] Render complete: " + args.output);
}

main();
