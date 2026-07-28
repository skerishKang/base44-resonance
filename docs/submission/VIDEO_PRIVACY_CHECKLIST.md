# WatchTree Demo Video — Privacy Checklist

Complete every item before publishing. Any unchecked item blocks upload.

## Account and identity

- [ ] Synthetic test account used (not a personal account)
- [ ] Email address sanitized (no full email visible in any frame — show only sanitized form `watchtree-demo-test@…`)
- [ ] No password typed or visible on screen
- [ ] No OTP or verification code visible
- [ ] No access token visible in any frame
- [ ] No cookie values visible (DevTools Application/Cookies panel not shown)
- [ ] No HMAC key or digest value visible
- [ ] No `WATCHTREE_HMAC_KEY` or any environment variable name/value visible
- [ ] No secret environment variable visible in terminal or DevTools

## Browser hygiene

- [ ] No browser autofill suggestions visible
- [ ] No notification popups visible
- [ ] No clipboard permission popups visible
- [ ] No personal bookmarks visible in browser chrome
- [ ] No local filesystem absolute paths visible in any frame
- [ ] No personal profile image or avatar visible
- [ ] No browser extensions visible that could leak personal data
- [ ] No terminal history with secrets visible
- [ ] No DevTools Network tab with tokens visible
- [ ] No DevTools Storage tab visible
- [ ] No browser storage state, cookies, or session committed to Git

## Product data

- [ ] No private note content visible in any frame
- [ ] No other-user data visible (single-user test account only)
- [ ] No real-person matching claim made in narration or on-screen text
- [ ] Synthetic archetype labels visible in matching shots
- [ ] `SIMULATED` label visible on mutual-state shots
- [ ] Delete completion visible (empty state confirmed on screen)
- [ ] User-provided labels shown as unverified (not claimed as verified metadata)

## Undeployed feature restrictions

- [ ] No undeployed feature shown as live product behavior
- [ ] URL collection shown only if deployed; otherwise synthetic-demo fallback used with clear label
- [ ] Realtime refresh shown only if verified at capture time (Issue #41)
- [ ] Tutorial shown only if PR #47 deployed to Production
- [ ] AI Agent not mentioned or shown (roadmap only)
- [ ] File & media storage not mentioned or shown (not used)

## Prohibited claims

- [ ] No claim of automatic YouTube history access
- [ ] No claim of real-person matching or soulmate scoring
- [ ] No claim of live AI conversation unless actually deployed
- [ ] No claim of AI-generated user profile
- [ ] No claim that user labels are verified metadata
- [ ] No claim that Base44 AI generated all code
- [ ] No claim of unsupported product capabilities

## Recording hygiene

- [ ] No personal browser profile used (clean profile or incognito)
- [ ] No browser extensions visible
- [ ] No terminal history with secrets visible
- [ ] No DevTools Network / Application / Storage tab visible
- [ ] Screen recording area excludes OS taskbar/dock with personal apps

## Final sign-off

- [ ] Frame-by-frame review completed
- [ ] All items above checked
- [ ] Reviewer: _______________
- [ ] Date: _______________
