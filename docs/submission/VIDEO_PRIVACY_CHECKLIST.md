# WatchTree Demo Video — Privacy and Truth Checklist

**Current package status:** `PREPRODUCTION_ONLY`
Complete every item before any final MP4 is uploaded. One unchecked item blocks publication.

## Dedicated identity boundary

- [ ] Competition-only synthetic test account used; no personal account used.
- [ ] No full email address visible in retained raw footage, clips, narration metadata, or final frames.
- [ ] No password visible in retained footage.
- [ ] No OTP or verification link/code visible.
- [ ] No access token, API key, cookie, HMAC, digest, secret, or environment value visible.
- [ ] No other user’s data visible.
- [ ] No personal YouTube history, recommendations, subscriptions, playlists, avatar, or account page visible.

## Authentication capture boundary

- [ ] Authentication performed manually in the browser; nothing sensitive entered in the terminal.
- [ ] CAPTCHA, if any, handled manually.
- [ ] Playwright transient login page closed before the retained capture page opened.
- [ ] Transient login-page video deleted successfully; no login recording remains in `.video-work/`.
- [ ] Retained authenticated capture begins only on a separate page after login.
- [ ] No `storageState` file created.
- [ ] No cookies exported or written.
- [ ] No persistent browser profile or user-data directory created.
- [ ] Raw capture and markers remain local, ignored, and unuploaded.

## Browser and desktop hygiene

- [ ] Browser autofill disabled and no suggestions visible.
- [ ] Browser sync disabled for the capture environment.
- [ ] No personal bookmarks, extensions, profile image, downloads, or notification visible.
- [ ] No OS taskbar/dock item or notification reveals personal activity.
- [ ] No clipboard or permission popup visible.
- [ ] No local absolute path visible in a frame.
- [ ] No terminal history visible.
- [ ] DevTools Network, Application, Storage, Cookies, Sources, and environment panels never shown.

## Synthetic fixture and private data

- [ ] Every captured YouTube URL is a preapproved public synthetic fixture, not personal history.
- [ ] Private note fields are blank; no private note content appears.
- [ ] Watched dates, labels, and rewatch values are synthetic and non-identifying.
- [ ] User-provided labels are never presented as verified metadata.
- [ ] No unsupported creator, category, duration, topic, or metadata is invented.

## Scene truth

- [ ] Exact deployed full SHA, Production URL, App ID, and deployment timestamp recorded.
- [ ] Authenticated UAT completed on that exact release.
- [ ] S01 shows only the actual Production landing; Mina’s story is persistently `SOURCE TARGET` unless verified.
- [ ] S02 is resolved to `VERIFIED_PRODUCTION` or visibly labeled `SYNTHETIC FALLBACK`.
- [ ] S03 shows only supported count, repeat, rhythm, and sequence signals actually visible.
- [ ] S04 keeps `Synthetic archetype` readable and shows no percentage, real person, or AI ranking.
- [ ] S05 keeps `Synthetic archetype`, `Simulated mutual`, and `No real user contacted` readable.
- [ ] S06 visibly reaches the real restored empty state after deletion.
- [ ] S07 labels 13 Entity schemas and 13 Function sources as source inventory, not deployed counts.
- [ ] Production baseline and latest source remain visibly separate.
- [ ] Realtime omitted unless final deployed UAT verifies it.
- [ ] Tutorial omitted as live behavior unless PR #47 is merged, deployed, and UAT-verified.
- [ ] Product AI/LLM/Agent capability not shown or claimed.
- [ ] File storage capability not shown or claimed.

## Prohibited claims

- [ ] No automatic YouTube account/history access claim.
- [ ] No YouTube OAuth or API-key dependency claim contrary to the actual release.
- [ ] No real-person matching or contact claim.
- [ ] No soulmate/compatibility percentage claim.
- [ ] Deterministic matching is not described as AI.
- [ ] No live AI conversation claim.
- [ ] No claim that Base44 AI generated the whole product.
- [ ] Development workflow language is clearly separate from product capability.
- [ ] No undeployed feature is described as Production.

## Edit and output integrity

- [ ] All seven final clips were trimmed from exact-release footage after privacy review.
- [ ] No clip uses a fabricated browser state, AI-generated product screen, freeze-frame padding, or hidden disclosure.
- [ ] Preview placeholder count is understood as seven during pre-production.
- [ ] Final placeholder count is zero.
- [ ] Final narration matches the eight canonical English cues.
- [ ] SRT is synchronized to the final waveform and ends by 2:38.
- [ ] Final output is 158 seconds, 1920×1080, 30 fps, H.264/AAC MP4.
- [ ] Frame-by-frame review completed at full resolution.
- [ ] Local playback completed without errors.
- [ ] Git staged/committed video and audio binaries: 0.
- [ ] Git staged/committed cookies, storage state, browser profile, or credential material: 0.

## Publication sign-off

| Field | Value |
|---|---|
| Privacy reviewer | `UNVERIFIED` |
| Truth reviewer | `UNVERIFIED` |
| Exact deployed SHA | `UNVERIFIED` |
| Review date/time | `UNVERIFIED` |
| Disposition | `BLOCKED_UNTIL_ALL_CHECKS_PASS` |
