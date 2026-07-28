# WatchTree Demo Video Script

**Product:** WatchTree by Resonance
**Target duration:** 2:15–2:45 (never exceed 3:00)
**Language:** English narration; Korean reference translation
**Captions:** English SRT (see `watchtree-demo.en.srt`)
**Output:** 1920×1080 · 30 fps · MP4 H.264/AAC

> Timecodes below are planning targets. Re-sync SRT after final narration recording.

---

## Truth-status key

| Value | Meaning |
|-------|---------|
| VERIFIED_PRODUCTION | Confirmed live in authenticated Production UAT |
| MERGED_NOT_DEPLOYED | Merged to main but not yet deployed to Production |
| SOURCE_TARGET | Present in source; deployment pending final release |
| OPTIONAL_IF_VERIFIED | Include only if verified in final Production UAT |
| DO_NOT_SHOW | Must not appear in the video |

## Current production facts at script time

| Fact | Status |
|------|--------|
| Production URL: `https://base44-resonance-40117c91.base44.app` | VERIFIED_PRODUCTION |
| Production App ID: `6a6538c71a8e3e1640117c91` | VERIFIED_PRODUCTION |
| Base44 Auth | VERIFIED_PRODUCTION |
| 13 Entity schemas in source | VERIFIED_PRODUCTION |
| 12 deployed Function baseline | VERIFIED_PRODUCTION |
| `add-watch-url-event` (13th Function source) | MERGED_NOT_DEPLOYED |
| API-key-free URL collection UI | SOURCE_TARGET — pending final deployment |
| Realtime refresh (Issue #41) | OPTIONAL_IF_VERIFIED — merged, UAT pending |
| Tutorial (Issue #35 / PR #47) | OPTIONAL_IF_VERIFIED — Draft, not deployed |
| AI Agent | DO_NOT_SHOW — not used |
| File & media storage | DO_NOT_SHOW — not used |

---

# Version 1 — Main (2:20)

> Primary submission version. All core product flow + concise Base44 proof.

| Timecode | Scene | EN Narration | KO 참고 번역 | Screen Direction | On-Screen Text | Truth Status | Fallback | Final Verification |
|----------|-------|-------------|-------------|-----------------|----------------|--------------|----------|-------------------|
| 0:00–0:12 | 1 — Hook | Your viewing history can say something about how you remember. But it should never become another surveillance profile. WatchTree lets you build a private memory tree — from links you choose, not data taken from you. | 당신의 시청 기록은 당신이 어떻게 기억하는지 말해줄 수 있습니다. 하지만 그것이 또 다른 감시 프로필이 되어서는 안 됩니다. WatchTree는 당신이 선택한 링크로 private memory tree를 만듭니다 — 당신의 데이터가 아니라, 당신의 선택으로. | WatchTree hero / private tree visual. Signed-out or authenticated landing. | `WatchTree by Resonance — Your memory. Your rules.` | VERIFIED_PRODUCTION | Static title card if hero unavailable | UNVERIFIED |
| 0:12–0:38 | 2 — Deliberate collection | WatchTree never reads your YouTube account. There is no OAuth, no API key, no automatic history import. You paste a public YouTube URL. WatchTree validates it and stores only what you deliberately add. You can attach a watched date, mark a rewatch, or leave a private note. Every record enters your collection only because you chose it. | WatchTree는 당신의 YouTube 계정을 읽지 않습니다. OAuth도, API 키도, 자동 기록 가져오기도 없습니다. 공개 YouTube URL을 붙여넣으면 WatchTree가 검증하고 당신이 의도적으로 추가한 것만 저장합니다. 시청 날짜, 재시청 표시, private 노트를 첨부할 수 있습니다. 모든 기록은 당신이 선택했기 때문에만 컬렉션에 들어갑니다. | Authenticated user pastes one public YouTube URL into the collection form. Optional fields visible. | `No OAuth. No API key. No automatic history. Only links you deliberately add.` | SOURCE_TARGET — URL collection merged but pending final deployment | Use synthetic-demo fallback with `SYNTHETIC DEMO — URL collection pending deployment` label | UNVERIFIED |
| 0:38–1:03 | 3 — Private WatchTree | As your collection grows, WatchTree builds your private tree. It shows your event count, repeat tendency, and time rhythm. These signals come only from records you provided. User-added labels are shown as unverified. WatchTree does not generate an AI profile. It reflects what you chose to remember. | 컬렉션이 자라면서 WatchTree는 당신의 private tree를 만듭니다. 이벤트 수, 반복 경향, 시간 리듬을 보여줍니다. 이러한 신호는 당신이 제공한 기록에서만 나옵니다. 사용자가 추가한 라벨은 unverified로 표시됩니다. WatchTree는 AI 프로필을 생성하지 않습니다. 당신이 기억하기로 선택한 것을 반영합니다. | Tree view showing event count, repeat tendency, time rhythm, tree growth. Unverified label badge visible. | `Your private tree. No AI profile. User labels shown as unverified.` | VERIFIED_PRODUCTION (tree signals); user-label unverified badge: SOURCE_TARGET | Annotated screenshot with `Annotated — live capture pending` label | UNVERIFIED |
| 1:03–1:28 | 4 — Synthetic archetype matching | WatchTree compares your records against clearly synthetic viewing archetypes — not real people. Matching is deterministic and explainable. Each candidate shows bounded evidence drawn from your own records. When signal is insufficient, WatchTree says so. There is no soulmate score. There is no real-person scan. | WatchTree는 당신의 기록을 명확히 합성된 시청 아키타입과 비교합니다 — 실제 사람이 아닙니다. 매칭은 결정적이고 설명 가능합니다. 각 후보는 당신의 기록에서 도출된 제한된 증거를 보여줍니다. 신호가 불충분하면 WatchTree가 그렇게 알려줍니다. 소울메이트 점수도, 실제 사람 스캔도 없습니다. | Matching result showing synthetic archetype candidate, bounded evidence list, signal state. | `Synthetic archetypes only. No real-person scan. Deterministic. Explainable.` | VERIFIED_PRODUCTION (deterministic matching); synthetic labels: VERIFIED_PRODUCTION | Pre-seeded synthetic result with `SYNTHETIC DEMO` label | UNVERIFIED |
| 1:28–1:48 | 5 — Consent & simulated mutual | Before any result is revealed, you select which evidence to share and give explicit consent. The mutual state shown here is simulated — it does not represent another real user. Your consent choices persist across reloads. | 결과가 공개되기 전에, 당신은 공유할 증거를 선택하고 명시적 동의를 제공합니다. 여기 표시된 상호 상태는 시뮬레이션입니다 — 다른 실제 사용자를 나타내지 않습니다. 동의 선택은 새로고침 후에도 유지됩니다. | Evidence token selection, explicit reveal consent toggle, simulated mutual state. All simulation labels visible. | `Explicit consent required. Mutual state: SIMULATED — not another real user.` | VERIFIED_PRODUCTION (consent persistence); simulated label: VERIFIED_PRODUCTION | Annotated consent screen with visible `SIMULATED` label | UNVERIFIED |
| 1:48–2:06 | 6 — Privacy lifecycle | Privacy is a product feature, not a footer promise. You can turn matching off, exclude specific records, or delete your entire collection. After deletion, WatchTree restores a clean empty state. Your data lifecycle is always in your hands. | 프라이버시는 제품 기능이지, footer의 약속이 아닙니다. 매칭을 끄거나, 특정 기록을 제외하거나, 전체 컬렉션을 삭제할 수 있습니다. 삭제 후 WatchTree는 깨끗한 빈 상태를 복원합니다. 데이터 수명주기는 항상 당신의 손에 있습니다. | Matching off toggle, record exclusion, delete-all action, empty restored state. | `Deletion is a product feature, not a footer promise.` | VERIFIED_PRODUCTION | None required | UNVERIFIED |
| 2:06–2:20 | 7 — Base44 proof & Close | Base44 is not only where WatchTree is hosted. It is the authenticated data, permission, function, and deployment layer behind the entire privacy model. Base44 Auth verifies every caller. Owner-scoped Entities enforce row-level security. Caller-authenticated Deno Functions protect server state. WatchTree by Resonance. Built for the Base44 Dev Build-Off. | Base44는 WatchTree가 호스팅되는 곳만이 아닙니다. 전체 프라이버시 모델 뒤의 인증된 데이터, 권한, 함수, 배포 계층입니다. Base44 Auth는 모든 호출자를 검증합니다. Owner-scoped Entity가 row-level security를 강제합니다. Caller-authenticated Deno Function이 서버 상태를 보호합니다. Resonance의 WatchTree. Base44 Dev Build-Off를 위해 만들었습니다. | Architecture overlay or sanitized repository views + ending card. | `WatchTree by Resonance — base44-resonance-40117c91.base44.app — github.com/skerishKang/base44-resonance — Built for Base44 Dev Build-Off` | VERIFIED_PRODUCTION (Auth, Entities, hosting); Function count: 12 deployed / 13 source | Sanitized git log + test output if CI evidence inaccessible | UNVERIFIED |

---

# Version 2 — Extended Technical (2:40)

> Use if the submission portal accepts longer content and Realtime or Tutorial is verified.

| Timecode | Scene | Changes from Main |
|----------|-------|-------------------|
| 0:00–0:12 | 1 — Hook | Same as Main |
| 0:12–0:38 | 2 — Deliberate collection | Same as Main |
| 0:38–1:03 | 3 — Private WatchTree | Same as Main |
| 1:03–1:28 | 4 — Synthetic archetype matching | Same as Main |
| 1:28–1:48 | 5 — Consent & simulated mutual | Same as Main |
| 1:48–2:06 | 6 — Privacy lifecycle | Same as Main |
| 2:06–2:15 | 7a — Base44 architecture | Add: `13 Entity schemas in source. 12 Functions deployed, 13th Function source merged. CI-verified release bundle.` |
| 2:15–2:22 | 7b — Realtime (OPTIONAL) | Add only if Issue #41 verified: `Owner-scoped realtime refresh keeps your tree in sync without polling.` | OPTIONAL_IF_VERIFIED — Realtime merged, UAT pending |
| 2:22–2:28 | 7c — Tutorial (OPTIONAL) | Add only if PR #47 deployed: `The guided tutorial walks new users through the full privacy model in under a minute.` | OPTIONAL_IF_VERIFIED — PR #47 Draft |
| 2:28–2:40 | 8 — Close | Same as Main |

---

# Version 3 — Emergency Fallback (90 seconds)

> Use if production issues prevent capturing full flow. Narrator speaks faster, fewer product details.

| Timecode | Scene | EN Narration | KO 참고 번역 | Truth Status |
|----------|-------|-------------|-------------|--------------|
| 0:00–0:08 | Hook | Your viewing history should not become a surveillance profile. WatchTree builds a private memory tree from links you choose. | 당신의 시청 기록이 감시 프로필이 되어서는 안 됩니다. WatchTree는 당신이 선택한 링크로 private memory tree를 만듭니다. | VERIFIED_PRODUCTION |
| 0:08–0:22 | Collection | No YouTube OAuth. No API key. You paste a public URL. WatchTree stores only what you deliberately add. | YouTube OAuth나 API 키가 없습니다. 공개 URL을 붙여넣으면 WatchTree는 당신이 추가한 것만 저장합니다. | SOURCE_TARGET |
| 0:22–0:36 | Tree & Match | Your private tree shows event count and time rhythm. Matching compares your records against synthetic archetypes — not real people. No soulmate score. | private tree는 이벤트 수와 시간 리듬을 보여줍니다. 매칭은 합성 아키타입과 비교합니다 — 실제 사람이 아닙니다. | VERIFIED_PRODUCTION |
| 0:36–0:50 | Consent & Privacy | You choose evidence, give explicit consent. Mutual state is simulated. Delete your collection and WatchTree restores a clean empty state. | 증거를 선택하고 명시적 동의를 합니다. 상호 상태는 시뮬레이션입니다. 컬렉션을 삭제하면 WatchTree는 빈 상태로 복원됩니다. | VERIFIED_PRODUCTION |
| 0:50–1:10 | Base44 | Base44 provides Auth, owner-scoped Entities with RLS, caller-authenticated Functions, and hosting. 13 Entity schemas. 12 deployed Functions. | Base44는 Auth, RLS가 적용된 owner-scoped Entity, 호출자 인증 Function, 호스팅을 제공합니다. 13개 Entity 스키마, 12개 배포된 Function. | VERIFIED_PRODUCTION (counts from source) |
| 1:10–1:30 | Close | WatchTree by Resonance. Live at base44-resonance-40117c91.base44.app. Built for the Base44 Dev Build-Off. | Resonance의 WatchTree. Base44 Dev Build-Offer를 위해 만들었습니다. | VERIFIED_PRODUCTION |
