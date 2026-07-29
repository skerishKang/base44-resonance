# WatchTree submission-video workspace

This directory is an isolated Remotion pre-production project for Issue #40. It does not modify or ship with the product runtime. The composition is an editorial shell for exact Production recordings, not a substitute for them.

## Fixed master

- Composition: `WatchTreeDemoMain`
- 1920×1080, 30 fps
- 158 seconds / 4,740 frames
- H.264 video, AAC audio, MP4 container
- Eight contiguous scenes from `src/data/timeline.json`
- English captions from `src/data/captions.json`, mirrored exactly in `docs/submission/watchtree-demo.en.srt`

The user-specified exact scene ranges total 158 seconds. This resolves the approximate 145-second planning target while remaining inside the 2:00–2:45 allowed window and the 2:20–2:40 narration window.

## Install

Dependencies are pinned in this independent workspace. Remotion `4.0.495` was published more than seven days before this package was prepared. Repository npm policy keeps lifecycle scripts ignored.

```bash
cd video
npm ci
```

No root dependency is added.

## Commands

```bash
npm run studio
npm run validate
npm run build
npm run render:preview
npm run render:final
```

`render:preview` succeeds without media and shows explicit `PREVIEW PLACEHOLDER` slates. These slates say they are not product evidence. `render:final` requires all seven clips, the 158-second narration WAV, zero placeholders, and a completed local `final-verification.json` copied from the example.

Outputs go only to `video/out/`. Existing output is never overwritten unless `--overwrite` is passed explicitly to the wrapper:

```bash
node scripts/render.mjs preview --overwrite
node scripts/render.mjs final --overwrite
```

The wrapper uses one Remotion render tab to avoid multi-tab final-frame deadlocks, then validates the rendered duration, resolution, frame rate, H.264 video, and AAC audio with FFprobe. Use the FFmpeg fallback in the runbook when the submission buffer is more important than Remotion render time.

## Replace placeholders after final deployment

1. Complete deployment provenance and authenticated UAT outside this pre-production PR.
2. Follow `docs/submission/VIDEO_CAPTURE_RUNBOOK.md` and the clip contract in `public/clips/README.md`.
3. Copy privacy-reviewed clips to their exact ignored filenames.
4. Record the exact English narration as `public/audio/watchtree-narration.wav`.
5. Copy `final-verification.example.json` to ignored `final-verification.json` and resolve every gate truthfully.
6. Run `npm run validate`, then `npm run render:final`.
7. Complete the privacy checklist and upload record before any upload.

Never use this composition to fabricate product state. If a requested feature is not verified in exact Production, use the documented truthful synthetic fallback or remove the shot.
