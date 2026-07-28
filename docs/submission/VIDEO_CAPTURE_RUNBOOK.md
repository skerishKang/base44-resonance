# WatchTree Demo Video — Capture Runbook

**Status:** NOT_CAPTURED
**Do not begin capture until all prerequisites in Section 1 are confirmed.**

---

## 1. Exact release prerequisites

Before any recording:

- [ ] Final release PR merged to `main`
- [ ] `origin/main` SHA recorded: `_______________`
- [ ] All submission documents reviewed and approved
- [ ] `add-watch-url-event` deployed to Production (or synthetic-demo fallback confirmed)
- [ ] Issue #41 Realtime review complete (OPTIONAL_IF_VERIFIED — record result)
- [ ] No open P0 issues blocking submission

## 2. Final deployed SHA verification

```bash
git fetch origin --prune
git rev-parse origin/main
```

Record the exact SHA. This SHA must match the deployed release.

- Final deployed SHA: `_______________`
- Verified by: `_______________`
- Date: `_______________`

## 3. Production App ID check

- Production URL: `https://base44-resonance-40117c91.base44.app`
- Production App ID: `6a6538c71a8e3e1640117c91`

Verify the app loads and authenticates before recording.

- [ ] App loads without console errors
- [ ] Authentication works with sanitized test account
- [ ] No 404 or 500 responses on primary routes

## 4. Sanitized test account rules

- Use a dedicated synthetic test account created only for this capture.
- Email must be sanitized (e.g., `watchtree.demo.test@example.com`).
- No personal email, no personal YouTube URLs, no personal browsing history.
- Do not reuse a personal account.
- Do not store the account password in any committed file.
- Do not commit browser storage state, cookies, or session files.

## 5. Browser resolution

- Resolution: 1920×1080
- Frame rate target: 30 fps
- Browser: Chromium (via Playwright headed mode or clean Chrome profile)
- Disable all browser extensions
- Disable notifications
- Disable autofill
- Use a clean browser profile (no personal bookmarks, history, or saved passwords)
- Hide or minimize OS taskbar/dock if visible

## 6. Recording sequence

Follow `VIDEO_SHOT_LIST.md` shot order. For each shot:

1. Navigate to the required page/state before starting the recording segment.
2. Confirm the expected visual is present.
3. Record the user action slowly and deliberately.
4. Pause between shots to allow clean editing cuts.
5. Do not rush. One primary action visible per scene.

If using `scripts/capture-demo-video.mjs`:

```bash
WATCHTREE_DEMO_URL="https://base44-resonance-40117c91.base44.app" \
  node scripts/capture-demo-video.mjs
```

Follow the guided prompts. Press Enter to advance scene markers.

If using OBS or OS screen recorder (manual fallback):

- Record each scene as a separate file.
- Name files: `scene-01-hook.mp4`, `scene-02-collection.mp4`, etc.
- Store in `.video-work/` (gitignored).

## 7. Audio recording

- Record narration separately in a quiet environment.
- Format: WAV, 44.1 kHz or 48 kHz, mono or stereo.
- Normalize loudness to -16 LUFS ± 1.
- Remove background noise.
- Store narration WAV in `.video-work/` (gitignored).
- Do not commit audio files to Git.

## 8. Subtitle check

- Provisional captions: `docs/submission/watchtree-demo.en.srt`
- After final narration is recorded, re-sync SRT timecodes to actual audio.
- Verify captions are readable at 1080p (minimum 24px equivalent).
- Verify no caption overlaps with critical on-screen text.
- Burn captions into MP4 or upload as YouTube caption track.

## 9. FFmpeg / renderer process

Use `scripts/render-demo-video.mjs` or equivalent FFmpeg commands.

Dry-run first:

```bash
node scripts/render-demo-video.mjs \
  --input .video-work/combined.mp4 \
  --narration .video-work/narration.wav \
  --srt docs/submission/watchtree-demo.en.srt \
  --output video-output/watchtree-demo.mp4 \
  --dry-run
```

Final render:

```bash
node scripts/render-demo-video.mjs \
  --input .video-work/combined.mp4 \
  --narration .video-work/narration.wav \
  --srt docs/submission/watchtree-demo.en.srt \
  --output video-output/watchtree-demo.mp4 \
  --overwrite
```

Target output:
- Container: MP4
- Video: H.264, 1920×1080, 30 fps
- Audio: AAC
- Web optimized: `-movflags +faststart`

## 10. Final MP4 validation

```bash
ffprobe -v error -show_entries format=duration,size \
  -show_entries stream=codec_name,width,height,r_frame_rate \
  video-output/watchtree-demo.mp4
```

- [ ] Duration: 2:15–2:45 (never exceed 3:00)
- [ ] Resolution: 1920×1080
- [ ] Video codec: h264
- [ ] Audio codec: aac
- [ ] File plays correctly in a local player

## 11. YouTube upload

- Visibility: Unlisted or Public (not Private)
- Title: `WatchTree by Resonance — Base44 Dev Build-Off Demo`
- Description: Include product URL, GitHub repository, and Base44 Dev Build-Off label
- Upload captions: `docs/submission/watchtree-demo.en.srt` (re-synced)
- Wait for 1080p processing to complete before verifying

- YouTube URL: `_______________`
- Visibility: `_______________`
- Upload date: `_______________`

## 12. Signed-out playback verification

- Open the YouTube URL in a signed-out browser (incognito or clean profile).
- [ ] Video plays without sign-in prompt
- [ ] 1080p quality available
- [ ] Captions display correctly
- [ ] Duration within 2:15–2:45

## 13. Submission portal URL verification

- Paste the YouTube URL into the Base44 Dev Build-Off submission portal `Demo video URL` field.
- [ ] Portal accepts the URL
- [ ] Save a private screenshot of the saved portal field
- [ ] Copy final URL into Issue #39 and `DEV_BUILD_OFF_SUBMISSION.md` (when created)

## 14. Rollback / re-record conditions

Re-record if any of the following are true:

- Final deployed SHA changes after capture
- A product claim in the video no longer matches Production behavior
- A privacy checklist item fails frame-by-frame review
- Console errors or page errors appear in any recorded frame
- Duration exceeds 3:00
- YouTube processing fails at 1080p
- Captions are out of sync by more than 1 second

Do not patch a published video silently. Re-record, re-upload, and update the portal URL.

---

## Credential rules (absolute)

- No password, token, OTP, or cookie value printed to terminal
- No browser storage state committed to Git
- No browser profile committed to Git
- No secret recorded in terminal history
- No full email address visible in video frames
- No DevTools Application/Cookies panel shown in any frame
- No `WATCHTREE_HMAC_KEY` or any environment variable value visible
