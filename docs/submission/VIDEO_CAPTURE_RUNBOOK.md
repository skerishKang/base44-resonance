# WatchTree Demo Video — Capture and Render Runbook

**Status:** `PREPRODUCTION_ONLY`
**Production capture performed:** No
**Authenticated UAT performed by this package:** No
**Final MP4 / upload / portal work performed:** No

This runbook starts only after the final release is merged, explicitly deployed through Base44, and authenticated UAT is green. The current package supplies the 2:38 timeline and editing shell; it does not authorize or perform deployment.

## 1. Release gate

Stop before recording unless every required item is true:

- [ ] PR #47 disposition is recorded; tutorial remains `SOURCE_TARGET` until deployed UAT.
- [ ] Final approved `origin/main` full SHA is recorded.
- [ ] The same full SHA is explicitly deployed to Base44 Production.
- [ ] Production URL and App ID are reverified.
- [ ] Authenticated UAT passes with a dedicated synthetic test account.
- [ ] Console errors: 0; page errors: 0 for the capture path.
- [ ] URL scene is resolved as `VERIFIED_PRODUCTION` or `SYNTHETIC_FALLBACK`.
- [ ] Realtime is omitted unless exact Production UAT verifies it.
- [ ] No unresolved P0 submission blocker remains.

Record only public provenance here; never record account identity or credentials:

| Field | Final value |
|---|---|
| `origin/main` full SHA | `UNVERIFIED` |
| Deployed full SHA | `UNVERIFIED` |
| Production URL | `UNVERIFIED` |
| Base44 App ID | `UNVERIFIED` |
| Deployment timestamp | `UNVERIFIED` |
| Authenticated UAT disposition | `UNVERIFIED` |

## 2. Tooling preflight

From the repository root:

```bash
git fetch origin --prune
git status --short
git rev-parse origin/main
node --version
node --check scripts/capture-demo-video.mjs
ffmpeg -version
ffprobe -version
npx --no-install playwright --version
```

From the isolated video workspace:

```bash
cd video
npm ci
npm run typecheck
npm run validate
npm run build
```

Do not add Playwright or Remotion to the root package. `video/.npmrc` keeps lifecycle scripts ignored.

## 3. Dedicated synthetic account and browser hygiene

- Use a competition-only synthetic account, never a personal account.
- Remove personal bookmarks, extensions, avatars, autofill, notifications, downloads, and browser sync from the visible capture environment.
- Prepare only public synthetic-fixture YouTube URLs.
- Leave private note content blank. A blank field may be shown; typed private text may not.
- Do not open DevTools Network, Application, Cookies, Storage, Sources, or environment panels.
- Do not place credentials in environment variables or CLI arguments.
- Do not save `storageState`, cookies, a browser profile, or a persistent user-data directory.
- Authentication is manual. CAPTCHA is manual. No automatic login or CAPTCHA handling is allowed.

## 4. Truth lock before capture

Copy `video/final-verification.example.json` to the ignored `video/final-verification.json`. Complete it only from exact final-release evidence:

- each required clip resolves to `VERIFIED_PRODUCTION`;
- `clip-url-entry` may resolve to `SYNTHETIC_FALLBACK`; `clip-base44-proof` may resolve to `SOURCE_EVIDENCE`;
- fallback footage must carry the required persistent on-screen label;
- `authenticatedUat`, `privacyReviewComplete`, and `narrationReviewComplete` remain false until their work is actually complete.

The final validator rejects `UNVERIFIED` values.

## 5. Playwright helper dry run

Use the exact HTTPS Production origin. Query strings and fragments are rejected to prevent accidental credential capture.

```bash
WATCHTREE_DEMO_URL="https://base44-resonance-40117c91.base44.app" \
  node scripts/capture-demo-video.mjs --dry-run
```

Local development is not final evidence. It is accepted only for helper testing:

```bash
WATCHTREE_DEMO_URL="http://localhost:4173" \
  node scripts/capture-demo-video.mjs --allow-localhost --dry-run
```

## 6. Capture S01 signed-out landing

```bash
WATCHTREE_DEMO_URL="https://base44-resonance-40117c91.base44.app" \
WATCHTREE_DEPLOYED_SHA="<FULL_40_CHARACTER_DEPLOYED_SHA>" \
  node scripts/capture-demo-video.mjs --landing-only
```

The helper launches headed Chromium at 1920×1080 with Playwright `recordVideo`, asks for a manual start and end marker, closes the context, and then finalizes `landing-session.raw.webm`. No login occurs in this run.

If the final landing lacks Mina’s guided-story choice, keep the real landing capture, retain the editorial `SOURCE TARGET` badge, and use the branch-neutral canonical narration. Never add a fake CTA to browser footage.

## 7. Capture S02–S07 authenticated session

```bash
WATCHTREE_DEMO_URL="https://base44-resonance-40117c91.base44.app" \
WATCHTREE_DEPLOYED_SHA="<FULL_40_CHARACTER_DEPLOYED_SHA>" \
WATCHTREE_URL_SCENE="<VERIFIED_PRODUCTION_OR_SYNTHETIC_FALLBACK>" \
  node scripts/capture-demo-video.mjs
```

Security behavior is deliberate:

1. Playwright opens a disposable page for manual login.
2. Credentials are entered only in that browser page, never the terminal.
3. After the operator confirms login, the helper closes the login page and deletes its transient Playwright video.
4. It opens a separate capture page in the same in-memory context.
5. It records S02–S07 with manual start/end markers.
6. It closes the browser context before finalizing the retained raw WebM and marker JSON.
7. It never calls `storageState()`, never exports cookies, and never writes a browser profile.

If the helper cannot delete the transient login recording, it fails and the session must not continue.

## 8. Inspect markers and raw privacy risk

The ignored session folder contains:

```text
.video-work/landing-<timestamp>/
  landing-session.raw.webm
  scene-markers.json

.video-work/authenticated-<timestamp>/
  authenticated-scenes.raw.webm
  scene-markers.json
```

Before trimming:

- [ ] Open the raw recordings locally; do not upload them.
- [ ] Confirm retained login footage does not exist.
- [ ] Confirm marker order and action completeness.
- [ ] Confirm page/console error counts are zero.
- [ ] Confirm each marked duration is at least its target; a short marker blocks trimming.
- [ ] Stop if any password, OTP, token, email, private note, browser identity, or local path is visible.

## 9. Trim and normalize each required clip

Use marker `startSeconds` and an exact target duration. `-n` forbids overwriting an existing clip. The `fps=30` filter converts Playwright’s raw WebM timing to the constant 30 fps required by the asset validator.

Example for S02 (replace the raw path and start time):

```bash
ffmpeg -n \
  -ss <S02_START_SECONDS> \
  -i .video-work/authenticated-<timestamp>/authenticated-scenes.raw.webm \
  -t 24 \
  -an \
  -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,fps=30,format=yuv420p" \
  -c:v libvpx-vp9 -crf 24 -b:v 0 \
  video/public/clips/02-url-entry.webm
```

Repeat with these exact targets:

| Marker | Output | Duration |
|---|---|---:|
| S01 | `01-landing.webm` | 12 s |
| S02 | `02-url-entry.webm` | 24 s |
| S03 | `03-private-tree.webm` | 24 s |
| S04 | `04-synthetic-match.webm` | 25 s |
| S05 | `05-consent-mutual.webm` | 23 s |
| S06 | `06-delete.webm` | 18 s |
| S07 | `07-base44-proof.webm` | 22 s |

Never pad missing product behavior with a freeze frame. Re-record a scene that is too short.

## 10. Record narration

Record the exact eight English cues in `VIDEO_SCRIPT.md` with natural pauses aligned to scene boundaries. Export:

```text
video/public/audio/watchtree-narration.wav
```

Requirements:

- 48 kHz PCM WAV recommended;
- exactly 158 seconds, accepted tolerance ±1 second;
- clean narration, no personal room details, no unlicensed music;
- wording exactly matches `watchtree-demo.en.srt`;
- final loudness and peak review recorded in `VIDEO_UPLOAD_RECORD.md`.

Check locally:

```bash
ffprobe -v error -show_entries format=duration -of default=nw=1 \
  video/public/audio/watchtree-narration.wav
```

## 11. Remotion preview and bundle gate

Preview intentionally works before any actual capture:

```bash
cd video
npm run validate
npm run typecheck
npm run build
npm run render:preview
```

Expected pre-production result:

- 158 seconds / 4,740 frames;
- seven explicit placeholder slates;
- placeholder slates say they are not product evidence;
- H.264/AAC 1920×1080 30 fps preview MP4;
- no actual Production behavior claim from a placeholder.

## 12. Final Remotion render gate

After clips, narration, verification record, and privacy review are complete:

```bash
cd video
npm run render:final
```

Final mode fails before rendering unless:

- every required asset exists and passes FFprobe;
- all seven clips are 1920×1080, constant 30 fps, and long enough;
- narration aligns to 158 seconds;
- placeholder count is zero;
- every scene truth is resolved in the ignored final verification file;
- authenticated UAT and both review gates are true.

Existing output is preserved unless the wrapper is called explicitly with `--overwrite`.

## 13. FFmpeg fallback — do not delay submission for Remotion

Use this path when Remotion fails or takes longer than the submission buffer permits.

1. Complete Sections 1–10 unchanged.
2. Create the ignored work/output directories, then generate the 10-second editorial close from the committed SVG:

```bash
cd video
mkdir -p .video-work out
ffmpeg -n -loop 1 -i fallback/closing-card.svg -t 10 -r 30 \
  -vf "scale=1920:1080,format=yuv420p" \
  -an -c:v libvpx-vp9 -crf 24 -b:v 0 \
  .video-work/08-closing.webm
```

3. Create `.video-work/concat.txt` with these exact paths in order:

```text
file '../public/clips/01-landing.webm'
file '../public/clips/02-url-entry.webm'
file '../public/clips/03-private-tree.webm'
file '../public/clips/04-synthetic-match.webm'
file '../public/clips/05-consent-mutual.webm'
file '../public/clips/06-delete.webm'
file '../public/clips/07-base44-proof.webm'
file '08-closing.webm'
```

4. Concatenate, burn the exact SRT, add narration, and encode H.264/AAC:

```bash
ffmpeg -n \
  -f concat -safe 0 -i .video-work/concat.txt \
  -i public/audio/watchtree-narration.wav \
  -map 0:v:0 -map 1:a:0 \
  -vf "subtitles=../docs/submission/watchtree-demo.en.srt,format=yuv420p" \
  -t 158 -r 30 \
  -c:v libx264 -preset slow -crf 18 \
  -c:a aac -b:a 192k \
  -movflags +faststart \
  out/watchtree-demo-final.mp4
```

5. If concat rejects a stream mismatch, normalize every clip again with the Section 9 VP9 command. Do not bypass privacy or truth gates.

## 14. Final technical verification

```bash
ffprobe -v error \
  -show_entries format=duration,size \
  -show_entries stream=codec_name,codec_type,width,height,avg_frame_rate \
  -of json \
  video/out/watchtree-demo-final.mp4
```

Required:

- [ ] Duration: 158 seconds and within 2:00–2:45.
- [ ] Resolution: 1920×1080.
- [ ] Frame rate: 30/1.
- [ ] Video codec: H.264.
- [ ] Audio codec: AAC.
- [ ] Last caption cue ends at 2:38 or earlier.
- [ ] Local playback succeeds from beginning to end.
- [ ] Frame-by-frame privacy review passes.
- [ ] Git shows zero video/audio binaries.

## 15. Upload handoff only

After final approval, a human operator may upload to YouTube as Unlisted or Public, wait for 1080p processing, verify signed-out playback/captions, and enter the accepted URL in the portal. Those actions are outside this package and must be recorded truthfully in `VIDEO_UPLOAD_RECORD.md`.

## 16. Re-record conditions

Re-record and rerender when the deployed SHA changes, any claim differs from Production, any privacy item fails, error counts are nonzero, a required disclosure is obscured, a clip is padded or fabricated, captions drift, or the final file fails its technical gate. Never patch a published claim silently.
