# WatchTree — Authenticated UAT Execution Contract

**Status:** `DRAFT` — execute only after exact Production release deployment.

**Purpose:** Verify that all product paths, privacy boundaries, and infrastructure claims hold under authenticated conditions. This contract is designed for a reviewer who has a production account but does not share credentials or session state in this document.

---

## Prerequisites

- Exact Production release deployed and SHA recorded.
- `docs/submission/UAT_VERIFICATION_RECORD.md` prepared with timestamp and evidence sections.
- Fresh browser session (incognito/private window).
- Separate test email account (not the developer's personal account).

---

## Test paths

### 1. Email registration

| Step | Expectation | Evidence |
| --- | --- | --- |
| Open live app URL | Landing page renders; "Enter WatchTree" is visible | Screenshot |
| Click "Enter WatchTree" | Auth panel appears with email/password fields and Google button | Screenshot |
| Click "Create account" | Registration form switches to email + password fields | Screenshot |
| Enter valid email + password (≥8 chars) | **Create protected account** button is enabled | — |
| Submit registration | Success message: "Account created. Check your email for a verification code." | Screenshot |
| Check test email inbox | Verification code email received from Base44 | — |

### 2. Email verification

| Step | Expectation | Evidence |
| --- | --- | --- |
| Enter the 6-digit verification code | Code accepted; message: "Email verified. You can now sign in." | Screenshot |
| Auto-redirect or manual sign-in prompt | Sign-in form is displayed | — |

### 3. Email sign-in

| Step | Expectation | Evidence |
| --- | --- | --- |
| Enter registered email + password | Sign-in succeeds | Screenshot |
| WatchTree experience loads | Entry choices visible: "Build my WatchTree" and "See Mina's WatchTree story" | Screenshot |

### 4. Sign-out

| Step | Expectation | Evidence |
| --- | --- | --- |
| Click Sign out | Session ends; landing page returns | Screenshot |

### 5. Re-sign-in and session restore

| Step | Expectation | Evidence |
| --- | --- | --- |
| Sign in again with same credentials | Previous WatchTree state is restored (events, matches, consent) | Screenshot |

### 6. Google sign-in (separate or test Google account)

| Step | Expectation | Evidence |
| --- | --- | --- |
| On auth panel, click Google sign-in button | OAuth consent screen from Google appears (do not complete with personal account) | Screenshot |
| Verify the OAuth screen shows the correct app name/domain | "base44-resonance" or app domain visible | Screenshot |
| *(Optional, with separate test Google account)* Complete Google OAuth | Google-authenticated session begins; same WatchTree experience loads | Screenshot |

### 7. Tutorial — 6 steps

| Step | Expectation | Evidence |
| --- | --- | --- |
| Click "See Mina's WatchTree story" | Tutorial entry screen appears with title, body, and start choice | Screenshot |
| Click "Start Mina's story" | Step 1 loads — synthetic seed data is created | Screenshot |
| Progress through steps 1–5 | Each step shows correct title, subtitle, detail, and progress indicator | Screenshots per step |
| Step 5 (simulated mutual) | "Simulated mutual resonance" state displayed with clear synthetic label | Screenshot |
| Step 6 (finish) | Replay or delete options presented | Screenshot |

### 8. Tutorial replay

| Step | Expectation | Evidence |
| --- | --- | --- |
| Click replay | Tutorial restarts from step 1 without stale state | Screenshot |

### 9. Tutorial data deletion

| Step | Expectation | Evidence |
| --- | --- | --- |
| Click "Delete tutorial data" | Deletion completes; "Tutorial data deleted" confirmation shown | Screenshot |
| Click "Build my WatchTree" | Switches to product path with empty state | Screenshot |

### 10. Deliberate YouTube URL addition

| Step | Expectation | Evidence |
| --- | --- | --- |
| From empty state, click to add a YouTube URL | URL input field appears | Screenshot |
| Paste a valid public YouTube URL (e.g., `https://www.youtube.com/watch?v=dQw4w9WgXcQ`) | URL validated and added as a WatchEvent | Screenshot |
| Add optional watched-date or private-note labels | Labels stored with provenance marking | Screenshot |
| Add 2–3 more URLs | WatchEvent count increases | Screenshot |

### 11. WatchTree generation

| Step | Expectation | Evidence |
| --- | --- | --- |
| Build WatchTree from collected events | Tree visualization rendered with count, repeat, rhythm, sequence signals | Screenshot |

### 12. Synthetic match and evidence

| Step | Expectation | Evidence |
| --- | --- | --- |
| Matching triggers against synthetic archetypes | Candidate cards appear with deterministic scores | Screenshot |
| Inspect one candidate's shared evidence | Evidence panel shows explainable overlap signals | Screenshot |
| Verify: No percentage, no soulmate claim, no real-person identity | All labels read "synthetic" or "demo" | Screenshot |

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
| After completion | Empty state: "No private WatchTree data yet." | Screenshot |

### 16. Deletion persistence after refresh

| Step | Expectation | Evidence |
| --- | --- | --- |
| Refresh the page | Empty state persists — no stale events, matches, or consent records | Screenshot |

### 17. Sign-out / sign-in after deletion

| Step | Expectation | Evidence |
| --- | --- | --- |
| Sign out, then sign in again | Empty state persists — deletion is durable | Screenshot |

### 18. Realtime two-tab owner-scoped refresh

| Step | Expectation | Evidence |
| --- | --- | --- |
| Open two browser tabs signed in as same user | Both tabs show same WatchTree state | — |
| Tab A: Add a URL | Tab B: Watchevent update triggers restore notification within 2 seconds | Screenshot (both tabs) |
| Tab B: Verify restored state matches Tab A | Tree, events, and privacy state match | Screenshot |

### 19. Mobile viewport

| Step | Expectation | Evidence |
| --- | --- | --- |
| Resize browser to 375×812 (iPhone) or use mobile device tools | Layout adapts; no horizontal scroll; all CTAs tappable | Screenshot |
| Complete tutorial on mobile | All 6 steps navigable; progress bar visible | Screenshots |

### 20. Console errors

| Step | Expectation | Evidence |
| --- | --- | --- |
| Open DevTools Console before any interaction | 0 errors | Screenshot |
| After completing all test paths above | 0 errors (warnings are acceptable) | Console log export |

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
- Use a dedicated test email account — not a personal account.
- Close the incognito session and clear site data after UAT completion.

## Result recording

After completing all 21 test paths, record the following in `docs/submission/UAT_VERIFICATION_RECORD.md`:

- Exact Production release SHA and deployment timestamp.
- Pass/fail per test path.
- Screenshot or log evidence file paths (sanitized).
- Console log export.
- Network log export.
- Total errors or failures.
- Blocking vs non-blocking issues.
- Final disposition: `PASS` or `ISSUES_FOUND`.
