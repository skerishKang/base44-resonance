import { execFileSync, execSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function fail(msg) {
  console.error(`[render-demo-video] ERROR: ${msg}`);
  process.exit(1);
}

function parseArgs(argv) {
  const args = {
    input: null,
    narration: null,
    srt: null,
    output: null,
    overwrite: false,
    dryRun: false,
  };
  for (let i = 2; i < argv.length; i++) {
    switch (argv[i]) {
      case "--input":
        args.input = argv[++i];
        break;
      case "--narration":
        args.narration = argv[++i];
        break;
      case "--srt":
        args.srt = argv[++i];
        break;
      case "--output":
        args.output = argv[++i];
        break;
      case "--overwrite":
        args.overwrite = true;
        break;
      case "--dry-run":
        args.dryRun = true;
        break;
      default:
        fail(`Unknown argument: ${argv[i]}`);
    }
  }
  return args;
}

function checkFfmpeg() {
  try {
    execSync("ffmpeg -version", { stdio: "ignore" });
  } catch {
    fail(
      "ffmpeg not found. Install it from https://ffmpeg.org/download.html " +
      "or via your package manager (e.g. 'brew install ffmpeg' or 'apt install ffmpeg'). " +
      "This script does not download ffmpeg automatically."
    );
  }
}

function buildCommand(args) {
  const cmd = ["ffmpeg"];

  if (!args.overwrite) {
    cmd.push("-n");
  } else {
    cmd.push("-y");
  }

  cmd.push("-i", args.input);

  if (args.narration) {
    cmd.push("-i", args.narration);
  }

  const videoFilter = [];
  if (args.srt) {
    const srtEscaped = args.srt.replace(/\\/g, "\\\\").replace(/:/g, "\\:");
    videoFilter.push(`subtitles='${srtEscaped}'`);
  }

  cmd.push(
    "-vf",
    videoFilter.length > 0
      ? videoFilter.join(",") + ",scale=1920:1080,fps=30"
      : "scale=1920:1080,fps=30",
    "-c:v", "libx264",
    "-preset", "medium",
    "-crf", "20",
    "-c:a", "aac",
    "-b:a", "192k",
    "-movflags", "+faststart",
    "-r", "30",
    args.output
  );

  return cmd;
}

function main() {
  const args = parseArgs(process.argv);

  if (!args.input) {
    fail("--input <mp4> is required.");
  }
  if (!args.output) {
    fail("--output <mp4> is required.");
  }
  if (!existsSync(args.input)) {
    fail(`Input file not found: ${args.input}`);
  }
  if (args.narration && !existsSync(args.narration)) {
    fail(`Narration file not found: ${args.narration}`);
  }
  if (args.srt && !existsSync(args.srt)) {
    fail(`SRT file not found: ${args.srt}`);
  }
  if (existsSync(args.output) && !args.overwrite) {
    fail(
      `Output file already exists: ${args.output}. ` +
      "Pass --overwrite to replace it."
    );
  }

  checkFfmpeg();

  const cmd = buildCommand(args);

  if (args.dryRun) {
    console.log("[render-demo-video] DRY RUN — command that would be executed:");
    console.log("  " + cmd.join(" "));
    console.log("[render-demo-video] DRY RUN complete. No file written.");
    process.exit(0);
  }

  console.log("[render-demo-video] Rendering...");
  console.log("  Input:     " + args.input);
  console.log("  Narration: " + (args.narration || "(none)"));
  console.log("  SRT:       " + (args.srt || "(none)"));
  console.log("  Output:    " + args.output);

  try {
    execFileSync(cmd[0], cmd.slice(1), { stdio: "inherit" });
  } catch (err) {
    fail(`ffmpeg exited with code ${err.status ?? "unknown"}`);
  }

  console.log("[render-demo-video] Render complete: " + args.output);
}

main();
