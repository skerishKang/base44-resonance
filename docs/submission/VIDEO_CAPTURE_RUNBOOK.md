# WatchTree Demo Video — Capture Runbook

**Status:** NOT_CAPTURED
**Do not begin capture until all prerequisites in Section 1 are confirmed.**

---

## 1. Final release prerequisites

Before any recording:

- [ ] Final release PR merged to `main`
- [ ] `origin/main` SHA recorded: `_______________`
- [ ] All submission documents reviewed and approved
- [ ] `add-watch-url-event` deployed to Production (or synthetic-demo fallback confirmed)
- [ ] Issue #41 Realtime review complete (OPTIONAL_IF_VERIFIED — record result)
- [ ] PR #47 Tutorial deployment status recorded (OPTIONAL_IF_VERIFIED)
- [ ] No open P0 issues blocking submission

## 2. Exact deployed SHA verification

```bash
git fetch origin --prune
git rev-parse origin/main
```

Record the exact SHA. This SHA must match the deployed release.

- Final deployed SHA: `_______________`
- Verified by: `_______________`
- Date: `_______________`

## 3. Production App ID confirmation

- Production URL: `https://base44-resonance-40117c91.base44.app`
- Production App ID: `6a6538c71a8e3e1640117c91`

- [ ] App loads without console errors
- [ ] Authentication works with sanitized test account
- [ ] No 404 or 500 responses on primary routes

## 4. Entity / Function inventory check

Record the exact counts from the deployed release:

- Entity count (schemas): `_______________` (source: 13)
- Function count (deployed): `_______________` (source: 13)
- Function count (baseline): `_______________` (previous baseline: 12)
- Realtime verified: YES / NO / OPTIONAL_IF_VERIFIED
- Tutorial verified (PR #47): YES / NO / OPTIONAL_IF_VERIFIED

## 5. Sanitized test account

- Create a dedicated synthetic test account for this capture only.
- Email: must be sanitized (e.g., `watchtree-demo-test@example.com` — do not show full email in video).
- Password: do not record or commit anywhere.
- Do not reuse a personal account.
- Do not commit browser storage state, cookies, or session files.

## 6. Browser preparation

- Resolution: 1920×1080
- Browser: Chromium (headed) — via Playwright or clean Chrome profile
- Frame rate target: 30 fps
- Disable all browser extensions
- Disable notifications
- Disable autofill / saved passwords
- Clear bookmarks bar
- Use a clean browser profile (no personal bookmarks, history, or saved passwords)
- Hide or minimize OS taskbar/dock if visible in capture area
- Close all other applications and browser tabs

## 7. Scene-by-scene capture

Follow `VIDEO_SHOT_LIST.md` shot order. For each shot:

1. Navigate to the required page/state before starting the recording segment.
2. Confirm the expected visual is present.
3. Record the user action slowly and deliberately.
4. Pause between shots to allow clean editing cuts.
5. Do not rush. One primary action visible per scene.

If using `scripts/capture-demo-video.mjs`:

```bash
WATCHTREE_DEMO_URL="https://base44-resonance-40117c91.base44.app" \
  node scripts/capture-demo-video.mjs --headed --scene-labels
```

Follow the guided prompts. Press Enter to advance scene markers.

If using OBS or OS screen recorder (manual fallback):

- Record each scene as a separate file.
- Name files: `scene-01-hook.mp4`, `scene-02-collection.mp4`, etc.
- Store in `.video-work/` (gitignored).

## 8. Narration recording

- Record narration separately in a quiet environment.
- Format: WAV, 44.1 kHz or 48 kHz, mono or stereo.
- Normalize loudness to -16 LUFS ± 1.
- Remove background noise.
- Store narration WAV in `.video-work/` (gitignored).
- Do not commit audio files to Git.
- Speak clearly at consistent pace matching the 2:20 (main) or 2:40 (extended) timeline.

## 9. SRT synchronization

- Provisional captions: `docs/submission/watchtree-demo.en.srt`
- After final narration recording, re-sync SRT timecodes to actual audio timing.
- Verify captions are readable at 1080p (minimum 24px equivalent).
- Verify no caption overlaps with critical on-screen text.
- Burn captions into MP4 or upload as YouTube caption track.

## 10. FFmpeg render

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
  --force
```

Target output:
- Container: MP4
- Video: H.264, 1920×1080, 30 fps
- Audio: AAC, 192 kbps
- Web optimized: `-movflags +faststart`

## 11. Codec verification

```bash
ffprobe -v error -show_entries format=duration,size \
  -show_entries stream=codec_name,codec_type,width,height,r_frame_rate \
  video-output/watchtree-demo.mp4
```

Verify:
- [ ] Duration: 2:15–2:45 (never exceed 3:00)
- [ ] Resolution: 1920×1080
- [ ] Video codec: h264
- [ ] Audio codec: aac
- [ ] File plays correctly in a local player

## 12. Checksum

```bash
sha256sum video-output/watchtree-demo.mp4 > video-output/watchtree-demo.mp4.sha256
```

- [ ] Checksum file created
- [ ] Checksum verified

## 13. YouTube upload (Unlisted)

- Visibility: Unlisted (not Private)
- Title: `WatchTree by Resonance — Base44 Dev Build-Off Demo`
- Description: Include product URL, GitHub repository, and Base44 Dev Build-Off label
- Upload captions: `docs/submission/watchtree-demo.en.srt` (re-synced)
- Wait for 1080p processing to complete before verifying

- YouTube URL: `_______________`
- Visibility: `_______________`
- Upload date: `_______________`

## 14. Signed-out playback verification

- Open the YouTube URL in a signed-out browser (incognito or clean profile).
- [ ] Video plays without sign-in prompt
- [ ] 1080p quality available
- [ ] Captions display correctly
- [ ] Duration within 2:15–2:45
- [ ] No private data visible frame-by-frame

## 15. Submission portal URL entry

- Paste the YouTube URL into the Base44 Dev Build-Off submission portal `Demo video URL` field.
- [ ] Portal accepts the URL
- [ ] Save a private screenshot of the saved portal field

## 16. Portal acceptance confirmation

- [ ] Portal field saved successfully
- [ ] URL copied into Issue #39 and `DEV_BUILD_OFF_SUBMISSION.md`

## 17. Re-record conditions

Re-record if any of the following are true:

- Final deployed SHA changes after capture
- A product claim in the video no longer matches Production behavior
- A privacy checklist item fails frame-by-frame review
- Console errors or page errors appear in any recorded frame
- Duration exceeds 3:00
- YouTube processing fails at 1080p
- Captions are out of sync by more than 1 second
- Any secret, credential, or personal data found in any frame

Do not patch a published video silently. Re-record, re-upload, and update the portal URL.

---

## Credential safety rules (absolute)

- No password, token, OTP, or cookie value printed to terminal
- No browser storage state committed to Git
- No browser profile committed to Git
- No secret recorded in terminal history
- No full email address visible in video frames
- No DevTools Application/Cookies panel shown in any frame
- No `WATCHTREE_HMAC_KEY` or any environment variable value visible
- No CAPTCHA auto-handling
- No storageState saved or committed
