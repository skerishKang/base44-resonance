# Production clip contract

Do not commit captured media. Record every clip from the exact final Base44 Production release with the dedicated synthetic test account, then copy it into this directory under the exact filename below. `npm run render:final` rejects missing required clips.

| File | Expected minimum | Route / state | Current truth status | Replacement instructions |
|---|---:|---|---|---|
| `01-landing.webm` | 12 s | `/`; final Production landing, WatchTree identity, both choices | `VERIFIED_PRODUCTION` baseline; recapture exact release | Start on a settled signed-out landing. No browser identity, bookmarks, notification, or personal data. |
| `02-url-entry.webm` | 24 s | Final collection route; paste a public synthetic-demo URL, optional date/note/rewatch controls | `MERGED_NOT_DEPLOYED` | Use live URL entry only after deployed UAT. Otherwise record the real Production synthetic demo and keep an unmistakable `SYNTHETIC FALLBACK` label in-frame. |
| `03-private-tree.webm` | 24 s | Final tree route; collection count, repeat tendency, time rhythm, sequence | `VERIFIED_PRODUCTION` baseline; recapture exact release | Show only supported values from synthetic records. Hide private note text and unsupported metadata. |
| `04-synthetic-match.webm` | 25 s | Final matches route/state; synthetic candidate and inspectable evidence | `VERIFIED_PRODUCTION` baseline; recapture exact release | Keep `Synthetic archetype` visible. No percentage, real person, soulmate, or AI-ranking claim. |
| `05-consent-mutual.webm` | 23 s | Final candidate consent state; evidence selection and simulated mutual | `VERIFIED_PRODUCTION` baseline; recapture exact release | Keep `Synthetic archetype`, `Simulated mutual`, and `No real user contacted` visible throughout the result. |
| `06-delete.webm` | 18 s | Final privacy route/state; exclusion, matching off, delete all, restored empty state | `VERIFIED_PRODUCTION` baseline; recapture exact release | Begin with synthetic records and end on the real restored empty state. Do not expose another user or private note. |
| `07-base44-proof.webm` | 22 s | Sanitized exact-release proof: Auth, owner-scoped Entities/RLS, caller-scoped Functions, CI, hosting | `SOURCE_TARGET`; Realtime remains `MERGED_NOT_DEPLOYED` unless final UAT verifies it | Capture only public/sanitized evidence. Show 13 Entity schemas and 13 Function sources as `SOURCE INVENTORY — NOT DEPLOYMENT PROOF`, while keeping deployed Production proof visibly separate. |

Each normalized clip must be exactly 1920×1080 at exactly 30 fps and at least the expected duration. Longer clips are trimmed by the composition timeline. Replace one file at a time; never rename a personal recording into place without completing the privacy checklist.
