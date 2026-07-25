# Resonance

Resonance is an English-first, Korean-switchable relationship-discovery experience built around a simple product premise:

> Connect through the way you feel and remember, not just age, location, or interests.

This repository currently contains **Slice 1**: a cinematic visual foundation and an inspectable Base44 capability probe. It does not yet implement the final memory, fingerprint, matching, mutual-consent, AI, or realtime-conversation pipeline.

## Slice 1 experience

- English default UI with a persistent `EN | 한국어` switch.
- Dusk-to-dawn visual system built entirely with CSS, SVG, gradients, blur, grain, and reduced-motion fallbacks.
- Base44 built-in email/password authentication, registration, and OTP verification flows.
- An authenticated `CapabilityProbe` Entity with owner-only RLS.
- An authenticated `verify-capability` Deno Function that uses caller permissions.
- Independent Auth, Entity, and Function state indicators.
- Loading, empty, success, and bounded error states.
- A visible backend path explaining what this foundation proves.

## Backend capability path

```text
Base44 Auth
→ owner-scoped CapabilityProbe Entity
→ authenticated verify-capability Deno Function
→ deployable Vite site
```

The function uses `createClientFromRequest(req)`, explicitly requires a current user, validates a bounded `probe_id`, reads and updates the record under normal caller permissions, and returns only stable capability flags. It does not use service-role access and does not return emails, tokens, request headers, app identifiers, stack traces, or private content.

## Privacy and security boundaries

- `CapabilityProbe` has no anonymous read or write path.
- Create requires an authenticated user.
- Read, update, and delete require record ownership through `created_by`.
- Probe labels are non-sensitive and bounded to 48 characters.
- Passwords are never logged or included in rendered error messages.
- Function errors use stable codes and do not disclose whether another user's record exists.
- No private memories, AI calls, or realtime data are present in this slice.

The untouched scaffold included a `task_manager` agent under `base44/agents/**`. Issue #3 does not authorize modifying that path, so its dependent `Task` schema is retained temporarily rather than leaving a dangling resource. The Task UI is removed, and the retained schema is hardened to authenticated create plus owner-only read/update/delete. Web CTO can authorize removal of both legacy resources in a later scope decision.

## Local commands

```bash
npm ci
npm run test:ci
npm run build
npm run dev
```

Tests use the Node test runner and do not require Base44 credentials, a workspace token, a deployed app, or network access. They verify language persistence, unauthenticated capability isolation, independent status rendering, password-safe error handling, function input/auth contracts, Entity RLS, reduced motion, responsive width constraints, and credential-free CI.

## Base44 runtime validation

The Web Implementation Developer does **not** deploy this branch. After Web CTO review, the Local Validator checks out the exact Draft PR HEAD and performs:

1. `npm ci`, `npm run test:ci`, and `npm run build`.
2. `base44 dev` against the existing `base44-resonance` app.
3. Built-in auth registration, OTP verification, login, session restoration, and logout.
4. Anonymous denial for `CapabilityProbe` create/list/get/update/delete.
5. Owner-only access and a negative cross-user access test.
6. `verify-capability` success, malformed JSON, unsupported method, unauthenticated, invalid ID, and inaccessible-record behavior.
7. Desktop 1440×900 and mobile 390×844 rendering, keyboard focus, reduced motion, console errors, and unexpected same-origin request failures.
8. One controlled deployment only after Web CTO approval, with credit balance recorded before and after.

No deploy, Base44 Builder message, real AI call, new app, or new workspace is part of this implementation slice.
