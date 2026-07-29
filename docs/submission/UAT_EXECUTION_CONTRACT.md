# WatchTree — Authenticated UAT Execution Contract

**Status:** `DRAFT` — execute only after exact Production release deployment.

**Purpose:** Verify that all product paths, privacy boundaries, and infrastructure claims hold under authenticated conditions. This contract is designed for a reviewer who has a production account but does not share credentials or session state in this document.

---

## Prerequisites

- Exact Production release deployed and SHA recorded.
- Fresh browser session (incognito/private window).
- Separate test email account (not the developer's personal account).
- After UAT execution, create a **repository-external sanitized record** (not committed). Then commit only an approved public summary.

---

## Test paths

### 1. Email registration

| Step | Expectation | Evidence |
| --- | --- | --- |
| Open live app URL | Landing page renders; entry CTA is visible | Screenshot |
| Click "Enter WatchTree" | Auth panel appears with email/password fields and Google button | Screenshot |
| Click "Create account" | Registration form is presented with email + password fields | Screenshot |
| Enter valid email + password (≥8 chars) | Submit button is enabled | — |
| Submit registration | Verification requirement is communicated | Screenshot |
| Check test email inbox | Verification code email received from Base44 | — |

### 2. Email verification

| Step | Expectation | Evidence |
| --- | --- | --- |
| Enter the verification code | Verification succeeds | Screenshot |
| After verification | Sign-in form is displayed or session begins automatically | — |

### 3. Email sign-in

| Step | Expectation | Evidence |
| --- | --- | --- |
| Enter registered email + password | Sign-in succeeds | Screenshot |
| WatchTree experience loads | Entry choices are visible | Screenshot |

### 4. Sign-out

| Step | Expectation | Evidence |
| --- | --- | --- |
| Click Sign out | Session ends; landing page returns | Screenshot |

### 5. Re-sign-in and session restore (pre-data)

| Step | Expectation | Evidence |
| --- | --- | --- |
| Sign in again with same credentials | Authenticated shell restores; caller identity is maintained | Screenshot |
| Verify | No unauthorized redirect to landing page | — |

### 6. Google sign-in (separate or test Google account)

| Step | Expectation | Evidence |
| --- | --- | --- |
| On auth panel, click Google sign-in button | OAuth consent screen from Google appears (do not complete with personal account) | Screenshot (ensure no Google account email, profile photo, or account list is visible in the capture) |
| Verify the OAuth screen shows the correct app name/domain | App domain or name is visible | Screenshot |
| *(Optional, with separate test Google account)* Complete Google OAuth | Google-authenticated session begins; same WatchTree experience loads | Screenshot |

### 7. Tutorial — 6 steps

| Step | Expectation | Evidence |
| --- | --- | --- |
| Click "See Mina's WatchTree story" | Tutorial entry screen appears with title, body, and start choice | Screenshot |
| Click "Start Mina's story" | Step 1 loads — synthetic seed data is created | Screenshot |
| Progress through steps 1–5 | Each step shows correct title, subtitle, detail, and progress indicator | Screenshots per step |
| Step 5 (simulated mutual) | Simulated mutual state displayed with explicit synthetic/simulation label | Screenshot |
| Step 6 (finish) | Replay or delete options presented | Screenshot |

### 8. Tutorial replay

| Step | Expectation | Evidence |
| --- | --- | --- |
| Click replay | Tutorial restarts from step 1 without stale state | Screenshot |

### 9. Tutorial data deletion

| Step | Expectation | Evidence |
| --- | --- | --- |
| Click "Delete tutorial data" | Deletion completes; confirmation shown | Screenshot |
| Click "Build my WatchTree" | Switches to product path with empty state | Screenshot |

### 10. Deliberate YouTube URL addition

| Step | Expectation | Evidence |
| --- | --- | --- |
| From empty state, click to add a YouTube URL | URL input field appears | Screenshot |
| Paste a valid public YouTube URL | URL validated and added as a WatchEvent | Screenshot |
| Add optional watched-date or private-note labels | Labels stored with provenance marking | Screenshot |
| Add 2–3 more URLs | WatchEvent count increases | Screenshot |

### 11. WatchTree generation

| Step | Expectation | Evidence |
| --- | --- | --- |
| Build WatchTree from collected events | Tree visualization rendered with count, repeat, rhythm, sequence signals | Screenshot |

### 12. Synthetic match and evidence

| Step | Expectation | Evidence |
| --- | --- | --- |
| Matching triggers against synthetic archetypes | Candidate cards appear | Screenshot |
| Inspect one candidate's shared evidence | Evidence panel shows explainable overlap signals | Screenshot |
| Verify: No compatibility percentage, no soulmate claim, no real-person identity | All labels read "synthetic" or "demo" | Screenshot |

### 13. Evidence consent

| Step | Expectation | Evidence |
| --- | --- | --- |
| Select evidence tokens for reveal | Checkboxes selectable | Screenshot |
| Grant explicit consent | Consent confirmation shown | Screenshot |
| Verify: Consent can be withdrawn | Withdraw option works before mutual simulation | Screenshot |

### 14. Simulated mutual

| Step | Expectation | Evidence |
| --- | --- | --- |
| Run "Simulate mutual resonance" | Simulated mutual state displayed with explicit "simulation" label | Screenshot |

### 15. Data deletion (full)

| Step | Expectation | Evidence |
| --- | --- | --- |
| Click "Delete all WatchTree data" | Deletion begins; progress indicator if large dataset | Screenshot |
| After completion | Empty state: no private WatchTree data remains | Screenshot |

### 16. Deletion persistence after refresh

| Step | Expectation | Evidence |
| --- | --- | --- |
| Refresh the page | Empty state persists — no stale events, matches, or consent records | Screenshot |

### 17. Re-sign-in / sign-in after deletion (restore post-data)

| Step | Expectation | Evidence |
| --- | --- | --- |
| Sign in again | Events, matches, and consent from prior data creation are restored (or empty state persists if deletion completed) | Screenshot |

### 18. Realtime two-tab owner-scoped refresh

| Step | Expectation | Evidence |
| --- | --- | --- |
| Open two browser tabs signed in as same user | Both tabs show same WatchTree state | — |
| Tab A: Add a URL | Tab B: WatchEvent update triggers restore notification | Screenshot (both tabs) |
| Tab B: Verify restored state matches Tab A | Tree, events, and privacy state match | Screenshot |

### 19. Mobile viewport

| Step | Expectation | Evidence |
| --- | --- | --- |
| Resize browser to 375×812 (iPhone) or use mobile device tools | Layout adapts; no horizontal scroll; all CTAs tappable | Screenshot |
| Complete tutorial on mobile | All 6 steps navigable; progress bar visible | Screenshots |

### 20. Console errors and warnings

| Step | Expectation | Evidence |
| --- | --- | --- |
| Open DevTools Console before any interaction | 0 errors, 0 warnings | Screenshot |
| After completing all test paths above | Record error count, warning count, and warning classification | Console log export |
| Classify each warning | Determine whether each warning is a submission blocker | — |

### 21. Failed network requests

| Step | Expectation | Evidence |
| --- | --- | --- |
| Open DevTools Network tab; filter by status 4xx/5xx | 0 failed requests during entire session | Network log export |

---

## Non-goals for this UAT round

- Do not test with a real YouTube account or YouTube API.
- Do not test with a second real user for mutual matching.
- Do not test AI or LLM integration (none exists in the build).
- Do not test file storage (not used).
- Do not test Base44 Agent (not used).

## Session security

- Do not commit, paste, or screenshot passwords, OTP codes, cookies, tokens, or storage values.
- Google OAuth screenshots must **not** show the Google account email, profile photo, or account selection list.
- Use a dedicated test email account — not a personal account.
- Close the incognito session and clear site data after UAT completion.

## Result recording

Create a **repository-external sanitized record** when UAT is executed, then commit only an approved public summary. The external record must include:

- Exact Production release SHA and deployment timestamp.
- Pass/fail per test path.
- Screenshot or log evidence file paths (sanitized — no credentials, OTPs, tokens, or private data).
- Console log export (with warnings classified).
- Network log export.
- Total errors and failures.
- Warning count and classification.
- Blocking vs non-blocking issues.
- Final disposition: `PASS` or `ISSUES_FOUND`.

Do **not** include passwords, OTP codes, cookie values, storage values, access tokens, Firebase tokens, or personal account email in any record or log.
