#!/usr/bin/env node

import {readFile, stat} from "node:fs/promises";
import {createReadStream} from "node:fs";
import {createHash} from "node:crypto";
import {spawnSync} from "node:child_process";
import {dirname, isAbsolute, relative, resolve, sep} from "node:path";
import {fileURLToPath} from "node:url";
import process from "node:process";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const videoRoot = resolve(repoRoot, "video");
const publicRoot = resolve(videoRoot, "public");
const allowedStatuses = new Set([
  "VERIFIED_PRODUCTION",
  "MERGED_NOT_DEPLOYED",
  "SOURCE_TARGET",
  "OPTIONAL_IF_VERIFIED",
]);

function parseArgs(argv) {
  const result = {mode: "preview", json: false};
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--json") result.json = true;
    else if (arg === "--mode") result.mode = argv[++index];
    else if (arg.startsWith("--mode=")) result.mode = arg.slice("--mode=".length);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!new Set(["preview", "final"]).has(result.mode)) {
    throw new Error(`--mode must be preview or final, received: ${result.mode}`);
  }
  return result;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function exists(path) {
  try {
    const info = await stat(path);
    return info.isFile() && info.size > 0;
  } catch {
    return false;
  }
}

function sha256(path) {
  return new Promise((resolvePromise, rejectPromise) => {
    const hash = createHash("sha256");
    const stream = createReadStream(path);
    stream.on("error", rejectPromise);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolvePromise(hash.digest("hex")));
  });
}

function safePublicPath(filename) {
  if (isAbsolute(filename)) throw new Error(`Asset filename must be relative: ${filename}`);
  const absolute = resolve(publicRoot, filename);
  if (absolute !== publicRoot && !absolute.startsWith(`${publicRoot}${sep}`)) {
    throw new Error(`Asset escapes video/public: ${filename}`);
  }
  return absolute;
}

function parseTimecode(raw) {
  const match = raw.match(/^(\d{2}):(\d{2}):(\d{2}),(\d{3})$/);
  if (!match) throw new Error(`Invalid SRT timecode: ${raw}`);
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]) + Number(match[4]) / 1000;
}

function parseSrt(source) {
  return source
    .trim()
    .split(/\r?\n\r?\n/)
    .map((block, index) => {
      const lines = block.split(/\r?\n/);
      if (Number(lines[0]) !== index + 1) throw new Error(`SRT cue numbering mismatch at cue ${index + 1}`);
      const range = lines[1]?.match(/^(.+) --> (.+)$/);
      if (!range) throw new Error(`SRT cue ${index + 1} has no valid range`);
      return {start: parseTimecode(range[1]), end: parseTimecode(range[2]), text: lines.slice(2).join(" ").replace(/\s+/g, " ").trim()};
    });
}

function probeMedia(path) {
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
  if (probe.error?.code === "ENOENT") return {error: "ffprobe is not available"};
  if (probe.status !== 0) return {error: probe.stderr.trim() || "ffprobe failed"};
  try {
    const data = JSON.parse(probe.stdout);
    return {duration: Number(data.format.duration), streams: data.streams || []};
  } catch {
    return {error: "ffprobe returned invalid JSON"};
  }
}

function validateAssetSchema(assets, errors) {
  const ids = new Set();
  const filenames = new Set();
  for (const asset of assets) {
    for (const key of ["id", "filename", "type", "required", "expectedDuration", "truthStatus", "description", "fallbackAllowed"]) {
      if (!(key in asset)) errors.push(`Asset ${asset.id || "<unknown>"} is missing field: ${key}`);
    }
    if (ids.has(asset.id)) errors.push(`Duplicate asset id: ${asset.id}`);
    if (filenames.has(asset.filename)) errors.push(`Duplicate asset filename: ${asset.filename}`);
    ids.add(asset.id);
    filenames.add(asset.filename);
    if (!allowedStatuses.has(asset.truthStatus)) errors.push(`Asset ${asset.id} has unsupported truth status: ${asset.truthStatus}`);
    if (asset.truthStatus === "DO_NOT_SHOW") errors.push(`DO_NOT_SHOW asset must not be in the composition: ${asset.id}`);
    if (!new Set(["video", "audio", "image"]).has(asset.type)) errors.push(`Asset ${asset.id} has unsupported type: ${asset.type}`);
    if (asset.type === "video" && !asset.filename.endsWith(".webm")) errors.push(`Video asset must use .webm input: ${asset.filename}`);
    if (asset.type === "audio" && !asset.filename.endsWith(".wav")) errors.push(`Audio asset must use .wav input: ${asset.filename}`);
    if (!(Number.isFinite(asset.expectedDuration) && asset.expectedDuration > 0)) errors.push(`Asset ${asset.id} expectedDuration must be positive`);
  }
}

function validateTimeline(timeline, captions, errors) {
  if (timeline.width !== 1920 || timeline.height !== 1080) errors.push("Composition must be 1920x1080");
  if (timeline.fps !== 30) errors.push("Composition must be 30fps");
  if (timeline.durationSeconds < 120 || timeline.durationSeconds > 165) errors.push("Duration must be within 2:00-2:45");
  if (timeline.durationSeconds > 180) errors.push("Duration must never exceed 3:00");
  let cursor = 0;
  const sceneIds = new Set();
  for (const scene of timeline.scenes) {
    if (sceneIds.has(scene.id)) errors.push(`Duplicate scene id: ${scene.id}`);
    sceneIds.add(scene.id);
    if (!Number.isInteger(scene.start) || !Number.isInteger(scene.duration) || scene.duration <= 0) {
      errors.push(`Scene ${scene.id} must use positive whole-second timing`);
    }
    if (scene.start !== cursor) errors.push(`Timeline gap or overlap before scene ${scene.id}: expected ${cursor}, got ${scene.start}`);
    if (!allowedStatuses.has(scene.truthStatus)) errors.push(`Scene ${scene.id} has unsupported truth status: ${scene.truthStatus}`);
    cursor = scene.start + scene.duration;
  }
  if (cursor !== timeline.durationSeconds) errors.push(`Scene total ${cursor}s does not equal duration ${timeline.durationSeconds}s`);
  let captionCursor = 0;
  captions.forEach((cue, index) => {
    if (Math.abs(cue.start - captionCursor) > 0.001) errors.push(`Caption gap or overlap before cue ${index + 1}`);
    if (!(Number.isFinite(cue.start) && Number.isFinite(cue.end) && cue.end > cue.start)) errors.push(`Caption cue ${index + 1} has invalid timing`);
    if (!cue.text?.trim()) errors.push(`Caption cue ${index + 1} is empty`);
    captionCursor = cue.end;
  });
  if (Math.abs(captionCursor - timeline.durationSeconds) > 0.001) errors.push(`Captions end at ${captionCursor}s, expected ${timeline.durationSeconds}s`);
  for (const scene of timeline.scenes) {
    const sceneEnd = scene.start + scene.duration;
    const sceneCues = captions.filter((cue) => cue.start >= scene.start && cue.end <= sceneEnd);
    if (sceneCues.length === 0) {
      errors.push(`Scene ${scene.id} has no caption cues`);
      continue;
    }
    if (Math.abs(sceneCues[0].start - scene.start) > 0.001 || Math.abs(sceneCues.at(-1).end - sceneEnd) > 0.001) {
      errors.push(`Caption coverage does not align to scene ${scene.id}`);
    }
    const crossing = captions.some((cue) => cue.start < sceneEnd && cue.end > sceneEnd);
    if (crossing) errors.push(`A caption cue crosses the end of scene ${scene.id}`);
  }
}

function validateManifestTimelineContract(assets, timeline, errors) {
  const byId = new Map(assets.map((asset) => [asset.id, asset]));
  for (const scene of timeline.scenes) {
    if (scene.id === "close") {
      if (scene.assetId !== null) errors.push("Close scene must not declare a product clip");
      continue;
    }
    const asset = byId.get(scene.assetId);
    if (!asset) {
      errors.push(`Scene ${scene.id} references unknown asset: ${scene.assetId}`);
      continue;
    }
    if (asset.type !== "video") errors.push(`Scene ${scene.id} asset must be video: ${asset.id}`);
    if (asset.expectedDuration !== scene.duration) {
      errors.push(`Scene ${scene.id} duration ${scene.duration}s does not match ${asset.id} expectedDuration ${asset.expectedDuration}s`);
    }
  }
  const narration = byId.get("narration-main");
  if (!narration || narration.type !== "audio") errors.push("Manifest requires narration-main audio asset");
  else if (narration.expectedDuration !== timeline.durationSeconds) {
    errors.push(`Narration duration ${narration.expectedDuration}s does not match timeline ${timeline.durationSeconds}s`);
  }
}

async function validateFinalVerification(assets, errors) {
  const path = resolve(videoRoot, "final-verification.json");
  if (!(await exists(path))) {
    errors.push("Missing video/final-verification.json (copy and complete final-verification.example.json after deployed UAT)");
    return null;
  }
  let record;
  try {
    record = await readJson(path);
  } catch (error) {
    errors.push(`Invalid final-verification.json: ${error.message}`);
    return null;
  }
  if (!/^https:\/\/[^\s]+$/.test(record.productionUrl || "")) errors.push("Final verification requires an HTTPS productionUrl");
  if (!/^[0-9a-f]{40}$/.test(record.deployedSha || "")) errors.push("Final verification requires a full 40-character deployedSha");
  if (!/^[a-f0-9]{24}$/.test(record.appId || "")) errors.push("Final verification requires the public 24-character Base44 appId");
  for (const gate of ["authenticatedUat", "privacyReviewComplete", "narrationReviewComplete"]) {
    if (record[gate] !== true) errors.push(`Final verification gate must be true: ${gate}`);
  }
  const expectedComposition = {id: "WatchTreeDemoMain", width: 1920, height: 1080, fps: 30, durationSeconds: 158, durationInFrames: 4740};
  for (const [key, value] of Object.entries(expectedComposition)) {
    if (record.composition?.[key] !== value) errors.push(`Final verification composition.${key} must equal ${value}`);
  }
  if (!Number.isInteger(record.deployedFunctionCount) || record.deployedFunctionCount < 1) errors.push("Final verification requires deployedFunctionCount from exact UAT");
  if (!new Set(["VERIFIED_PRODUCTION", "MERGED_NOT_DEPLOYED", "OMITTED"]).has(record.realtimeStatus)) errors.push("Final verification requires an explicit realtimeStatus");
  if (!new Set(["VERIFIED_PRODUCTION", "SOURCE_TARGET", "OMITTED"]).has(record.tutorialStatus)) errors.push("Final verification requires an explicit tutorialStatus");
  if (record.koreanReferenceReviewed !== true) errors.push("Final verification requires koreanReferenceReviewed=true");
  for (const label of ["syntheticArchetype", "simulatedMutual", "noRealUserContacted", "sourceVsProduction"]) {
    if (record.labelVisibility?.[label] !== true) errors.push(`Final verification label visibility must be true: ${label}`);
  }
  if (typeof record.reviewer !== "string" || record.reviewer.trim().length < 2) errors.push("Final verification requires a named reviewer");
  if (!Number.isFinite(Date.parse(record.reviewDate || ""))) errors.push("Final verification requires an ISO reviewDate");
  for (const asset of assets.filter((candidate) => candidate.type === "video")) {
    const resolution = record.sceneTruth?.[asset.id];
    if (resolution === "VERIFIED_PRODUCTION") continue;
    if (resolution === "SYNTHETIC_FALLBACK" && asset.fallbackAllowed) continue;
    if (resolution === "SOURCE_EVIDENCE" && asset.id === "clip-base44-proof") continue;
    const alternatives = asset.id === "clip-base44-proof"
      ? " or SOURCE_EVIDENCE"
      : asset.fallbackAllowed
        ? " or SYNTHETIC_FALLBACK"
        : "";
    errors.push(`Final verification must resolve ${asset.id} to VERIFIED_PRODUCTION${alternatives}`);
  }
  for (const asset of assets) {
    const assetPath = safePublicPath(asset.filename);
    if (!(await exists(assetPath))) continue;
    const expected = record.assetChecksums?.[asset.id];
    if (!/^[0-9a-f]{64}$/.test(expected || "")) {
      errors.push(`Final verification requires SHA-256 for ${asset.id}`);
      continue;
    }
    const actual = await sha256(assetPath);
    if (actual !== expected) errors.push(`Final verification checksum mismatch for ${asset.id}`);
  }
  const srtPath = resolve(repoRoot, "docs/submission/watchtree-demo.en.srt");
  if (!/^[0-9a-f]{64}$/.test(record.srtSha256 || "")) errors.push("Final verification requires srtSha256");
  else if ((await sha256(srtPath)) !== record.srtSha256) errors.push("Final verification checksum mismatch for English SRT");
  return record;
}

async function main() {
  const args = parseArgs(process.argv);
  const errors = [];
  const warnings = [];
  const manifestPath = resolve(videoRoot, "src/data/assets.json");
  const timelinePath = resolve(videoRoot, "src/data/timeline.json");
  const captionsPath = resolve(videoRoot, "src/data/captions.json");
  const srtPath = resolve(repoRoot, "docs/submission/watchtree-demo.en.srt");
  const scriptPath = resolve(repoRoot, "docs/submission/VIDEO_SCRIPT.md");

  const [assets, timeline, captions, srtSource, scriptSource] = await Promise.all([
    readJson(manifestPath),
    readJson(timelinePath),
    readJson(captionsPath),
    readFile(srtPath, "utf8"),
    readFile(scriptPath, "utf8"),
  ]);

  validateAssetSchema(assets, errors);
  validateTimeline(timeline, captions, errors);
  validateManifestTimelineContract(assets, timeline, errors);

  let srtCues = [];
  try {
    srtCues = parseSrt(srtSource);
  } catch (error) {
    errors.push(error.message);
  }
  if (srtCues.length !== captions.length) errors.push(`SRT cue count ${srtCues.length} does not match caption source ${captions.length}`);
  captions.forEach((cue, index) => {
    const srtCue = srtCues[index];
    if (!srtCue) return;
    if (srtCue.start !== cue.start || srtCue.end !== cue.end) errors.push(`SRT timing mismatch at cue ${index + 1}`);
    if (srtCue.text !== cue.text.replace(/\s+/g, " ").trim()) errors.push(`SRT text mismatch at cue ${index + 1}`);
    if (!scriptSource.includes(cue.text)) errors.push(`VIDEO_SCRIPT.md does not contain exact narration cue ${index + 1}`);
  });
  for (const scene of timeline.scenes) {
    const sceneEnd = scene.start + scene.duration;
    const sceneNarration = captions
      .filter((cue) => cue.start >= scene.start && cue.end <= sceneEnd)
      .map((cue) => cue.text)
      .join(" ");
    if (!scriptSource.includes(sceneNarration)) errors.push(`VIDEO_SCRIPT.md does not contain the exact joined narration for scene ${scene.id}`);
  }
  if (srtCues.at(-1)?.end > timeline.durationSeconds) errors.push("Last SRT cue exceeds composition duration");

  const availableAssetIds = [];
  const missingRequired = [];
  const media = [];
  for (const asset of assets) {
    let path;
    try {
      path = safePublicPath(asset.filename);
    } catch (error) {
      errors.push(error.message);
      continue;
    }
    if (!(await exists(path))) {
      if (asset.required) missingRequired.push(asset.filename);
      continue;
    }
    availableAssetIds.push(asset.id);
    const probe = probeMedia(path);
    const relativePath = relative(videoRoot, path);
    if (probe.error) {
      const message = `${relativePath}: ${probe.error}`;
      if (args.mode === "final") errors.push(message);
      else warnings.push(message);
    } else {
      if (!Number.isFinite(probe.duration) || probe.duration <= 0) {
        errors.push(`${asset.filename} has no finite positive duration`);
        continue;
      }
      const videoStream = probe.streams.find((stream) => stream.codec_type === "video");
      const audioStream = probe.streams.find((stream) => stream.codec_type === "audio");
      if (asset.type === "video") {
        if (!videoStream) errors.push(`${asset.filename} has no video stream`);
        if (videoStream && (videoStream.width !== 1920 || videoStream.height !== 1080)) {
          errors.push(`${asset.filename} must be 1920x1080 (found ${videoStream.width}x${videoStream.height})`);
        }
        if (videoStream) {
          const [numerator, denominator] = String(videoStream.avg_frame_rate || "0/1").split("/").map(Number);
          const fps = denominator ? numerator / denominator : 0;
          if (Math.abs(fps - 30) > 0.01) errors.push(`${asset.filename} must be 30fps (found ${videoStream.avg_frame_rate || "unknown"})`);
        }
      }
      if (asset.type === "audio" && !audioStream) errors.push(`${asset.filename} has no audio stream`);
      media.push({
        id: asset.id,
        filename: asset.filename,
        duration: probe.duration,
        video: videoStream ? {codec: videoStream.codec_name, width: videoStream.width, height: videoStream.height, frameRate: videoStream.avg_frame_rate} : null,
        audio: audioStream ? {codec: audioStream.codec_name} : null,
      });
      const tolerance = asset.type === "audio" ? 1 : 0.25;
      if (probe.duration + tolerance < asset.expectedDuration) errors.push(`${asset.filename} is ${probe.duration.toFixed(3)}s; expected at least ${asset.expectedDuration}s`);
      if (asset.type === "audio" && Math.abs(probe.duration - asset.expectedDuration) > tolerance) errors.push(`${asset.filename} must align to ${asset.expectedDuration}s (found ${probe.duration.toFixed(3)}s)`);
    }
  }

  const placeholderCount = assets.filter((asset) => asset.type === "video" && !availableAssetIds.includes(asset.id)).length;
  let finalVerification = null;
  if (args.mode === "final") {
    if (missingRequired.length > 0) errors.push(`Missing required final assets: ${missingRequired.join(", ")}`);
    if (placeholderCount !== 0) errors.push(`Final render requires placeholder count 0; found ${placeholderCount}`);
    finalVerification = await validateFinalVerification(assets, errors);
  } else if (missingRequired.length > 0) {
    warnings.push(`Preview will use ${placeholderCount} clip placeholder(s); missing required media is expected during pre-production`);
  }

  const report = {
    ok: errors.length === 0,
    mode: args.mode,
    composition: {
      id: timeline.compositionId,
      width: timeline.width,
      height: timeline.height,
      fps: timeline.fps,
      durationSeconds: timeline.durationSeconds,
      durationInFrames: timeline.durationSeconds * timeline.fps,
      sceneCount: timeline.scenes.length,
    },
    assets: {total: assets.length, present: availableAssetIds.length, missingRequired, availableAssetIds, placeholderCount, media},
    captions: {cueCount: srtCues.length, lastCueEnd: srtCues.at(-1)?.end ?? null, exactTextMatch: !errors.some((error) => error.includes("text mismatch"))},
    verification: finalVerification
      ? {sceneTruth: finalVerification.sceneTruth, deployedSha: finalVerification.deployedSha}
      : null,
    warnings,
    errors,
  };

  if (args.json) {
    process.stdout.write(`${JSON.stringify(report)}\n`);
  } else {
    console.log(`[validate-demo-assets] ${report.ok ? "PASS" : "FAIL"} (${args.mode})`);
    console.log(`  Composition: ${timeline.width}x${timeline.height} @ ${timeline.fps}fps · ${timeline.durationSeconds}s · ${timeline.durationSeconds * timeline.fps} frames`);
    console.log(`  Assets: ${availableAssetIds.length}/${assets.length} present · placeholders ${placeholderCount}`);
    console.log(`  Captions: ${srtCues.length} cues · last cue ${report.captions.lastCueEnd}s`);
    warnings.forEach((warning) => console.log(`  WARNING: ${warning}`));
    errors.forEach((error) => console.error(`  ERROR: ${error}`));
  }
  process.exitCode = report.ok ? 0 : 1;
}

main().catch((error) => {
  console.error(`[validate-demo-assets] ERROR: ${error.message}`);
  process.exitCode = 1;
});
