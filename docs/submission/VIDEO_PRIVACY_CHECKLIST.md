# WatchTree Demo Video — Privacy Checklist

Complete every item before publishing. Any unchecked item blocks upload.

## Account and identity

- [ ] Synthetic test account used (not a personal account)
- [ ] Email address sanitized (no real personal email visible in any frame)
- [ ] No browser autofill suggestions visible
- [ ] No notification popups visible
- [ ] No clipboard permission popups visible
- [ ] No personal bookmarks visible in browser chrome
- [ ] No local filesystem paths visible in any frame

## Secrets and credentials

- [ ] No password visible or typed on screen
- [ ] No access token visible in any frame
- [ ] No cookie values visible (DevTools Application/Cookies not shown)
- [ ] No HMAC key or digest value visible
- [ ] No `WATCHTREE_HMAC_KEY` or any environment variable value visible
- [ ] No secret environment variable visible in terminal or DevTools
- [ ] No OAuth token or authorization code visible
- [ ] No YouTube API key visible (product uses none)

## Product data

- [ ] No private note content visible in any frame
- [ ] No other-user data visible (single-user test account only)
- [ ] No real-person matching claim made in narration or on-screen text
- [ ] Synthetic archetype labels visible in matching shots
- [ ] `SIMULATED` label visible on mutual-state shots
- [ ] Delete completion visible (empty state confirmed on screen)

## Undeployed features

- [ ] No undeployed feature shown as live product behavior
- [ ] URL collection shown only if deployed; otherwise synthetic-demo fallback used
- [ ] Realtime refresh shown only if verified at capture time (Issue #41)
- [ ] AI Agent not mentioned or shown (roadmap only)
- [ ] File & media storage not mentioned or shown (not used)

## Unsupported claims

- [ ] No claim of automatic YouTube history access
- [ ] No claim of real-person matching or soulmate scoring
- [ ] No claim of live AI conversation unless actually deployed
- [ ] No claim of AI-generated user profile
- [ ] No claim that user labels are verified metadata

## Recording hygiene

- [ ] No personal browser profile used (clean profile or incognito)
- [ ] No browser extensions visible that could leak personal data
- [ ] No terminal history with secrets visible
- [ ] No DevTools Network tab with tokens visible
- [ ] No DevTools Application/Storage tab visible

## Final sign-off

- [ ] Frame-by-frame review completed
- [ ] All items above checked
- [ ] Reviewer: _______________
- [ ] Date: _______________
