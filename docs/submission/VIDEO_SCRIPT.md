# WatchTree Demo Video Script

**Product:** WatchTree by Resonance
**Target duration:** 2:15–2:45 (never exceed 3:00)
**Language:** English narration; Korean reference translation below
**Captions:** English burned-in or selectable; `watchtree-demo.en.srt` is provisional until final capture

> The SRT caption file is provisional. Timecodes below are planning targets.
> Re-sync captions after final recording and narration pass.

## Truth-status key

| Value | Meaning |
|-------|---------|
| VERIFIED_PRODUCTION | Confirmed live in authenticated Production UAT |
| MERGED_NOT_DEPLOYED | Merged to main but not yet deployed to Production |
| SOURCE_TARGET | Present in source; deployment pending final release |
| OPTIONAL_IF_VERIFIED | Include only if verified in final Production UAT |
| DO_NOT_SHOW | Must not appear in the video |

## Current production facts

| Fact | Status |
|------|--------|
| Production URL: `https://base44-resonance-40117c91.base44.app` | VERIFIED_PRODUCTION |
| Production App ID: `6a6538c71a8e3e1640117c91` | VERIFIED_PRODUCTION |
| Base44 Auth | VERIFIED_PRODUCTION |
| 13 Entity schemas in source | VERIFIED_PRODUCTION |
| 12 deployed Function baseline | VERIFIED_PRODUCTION |
| `add-watch-url-event` (13th Function source) | MERGED_NOT_DEPLOYED |
| API-key-free URL collection UI | SOURCE_TARGET — pending final deployment |
| Realtime refresh | OPTIONAL_IF_VERIFIED — pending Issue #41 |
| AI Agent | DO_NOT_SHOW — roadmap only (Issue #43) |
| File & media storage | DO_NOT_SHOW — not used |

---

## Scene 1 — Hook (0:00–0:12)

**Screen direction:** WatchTree hero / private tree visual. Signed-out or authenticated landing.

**On-screen text:**
```
WatchTree by Resonance
Your memory. Your rules.
```

**Narration (EN):**
Your viewing history can say something about how you remember.
But it should never become another surveillance profile.
WatchTree lets you build a private memory tree —
from links you choose, not data taken from you.

**Narration (KO 참고 번역):**
당신의 시청 기록은 당신이 무엇을 기억하는지 보여줄 수 있습니다.
하지만 그것이 또 다른 감시 프로필이 되어서는 안 됩니다.
WatchTree는 당신이 직접 선택한 링크로 private memory tree를 만들게 해줍니다.
당신의 데이터가 아니라, 당신의 선택으로.

**Truth-status:** VERIFIED_PRODUCTION

**Fallback line (if hero visual unavailable):**
WatchTree is a private memory tree built on Base44. You choose every link. Nothing is taken.

---

## Scene 2 — Deliberate collection (0:12–0:38)

**Screen direction:** Authenticated user pastes one public YouTube URL into the collection form. Optional watched date, rewatch flag, and private note fields visible.

**On-screen text:**
```
No OAuth. No API key. No automatic history.
Only links you deliberately add.
```

**Narration (EN):**
WatchTree never reads your YouTube account.
There is no OAuth, no API key, no automatic history import.
You paste a public YouTube URL.
WatchTree validates it and stores only what you deliberately add.
You can attach a watched date, mark a rewatch, or leave a private note.
Every record enters your collection only because you chose it.

**Narration (KO 참고 번역):**
WatchTree는 당신의 YouTube 계정을 읽지 않습니다.
OAuth도, API 키도, 자동 기록 가져오기도 없습니다.
공개 YouTube URL을 직접 붙여넣으세요.
WatchTree는 이를 검증하고 당신이 의도적으로 추가한 것만 저장합니다.
시청 날짜를 첨부하거나, 재시청을 표시하거나, private 노트를 남길 수 있습니다.
모든 기록은 당신이 선택했기 때문에만 컬렉션에 들어갑니다.

**Truth-status:** SOURCE_TARGET — URL collection merged (PR #37) but pending final deployment

**Fallback (if URL collection not deployed at capture time):**
Use synthetic-demo path: show a pre-seeded collection state with clearly labeled fixture data. Do not fabricate a live URL submission. Add on-screen label: `Synthetic demo data — URL collection pending final deployment.`

---

## Scene 3 — Private WatchTree (0:38–1:03)

**Screen direction:** Tree view showing event count, repeat tendency, time rhythm, and tree growth. User-provided label shown with unverified badge.

**On-screen text:**
```
Your private tree. No AI profile.
User labels shown as unverified.
```

**Narration (EN):**
As your collection grows, WatchTree builds your private tree.
It shows your event count, repeat tendency, and time rhythm.
These signals come only from records you provided.
User-added labels are shown as unverified.
WatchTree does not generate an AI profile.
It reflects what you chose to remember.

**Narration (KO 참고 번역):**
컬렉션이 자라면서 WatchTree는 당신의 private tree를 만듭니다.
이벤트 수, 반복 경향, 시간 리듬을 보여줍니다.
이 신호들은 당신이 제공한 기록에서만 옵니다.
사용자가 추가한 라벨은 unverified로 표시됩니다.
WatchTree는 AI 프로필을 생성하지 않습니다.
당신이 기억하기로 선택한 것을 반영합니다.

**Truth-status:** VERIFIED_PRODUCTION (tree signals); user-label unverified badge: SOURCE_TARGET

**Fallback:** If tree view not reachable, show static annotated screenshot with on-screen label: `Annotated screenshot — live capture pending.`

---

## Scene 4 — Synthetic archetype matching (1:03–1:28)

**Screen direction:** Matching result showing clearly synthetic archetype candidate, bounded evidence list, and insufficient-signal or grounded-evidence state.

**On-screen text:**
```
Synthetic archetypes only. No real-person scan.
Deterministic. Explainable. Bounded evidence.
```

**Narration (EN):**
WatchTree compares your records against clearly synthetic viewing archetypes —
not real people.
Matching is deterministic and explainable.
Each candidate shows bounded evidence drawn from your own records.
When signal is insufficient, WatchTree says so.
There is no soulmate score. There is no real-person scan.

**Narration (KO 참고 번역):**
WatchTree는 당신의 기록을 명확하게 합성된 시청 아키타입과 비교합니다 —
실제 사람이 아닙니다.
매칭은 결정적이고 설명 가능합니다.
각 후보는 당신의 기록에서 도출된 제한된 증거를 보여줍니다.
신호가 부족하면 WatchTree는 그렇게 말합니다.
소울메이트 점수도, 실제 사람 스캔도 없습니다.

**Truth-status:** VERIFIED_PRODUCTION (deterministic matching); synthetic archetype labels: VERIFIED_PRODUCTION

**Fallback:** If matching result not reachable with test data, use pre-seeded synthetic result with visible `SYNTHETIC DEMO` label.

---

## Scene 5 — Consent (1:28–1:48)

**Screen direction:** Evidence token selection, explicit reveal consent toggle, simulated mutual state display. All simulation labels visible.

**On-screen text:**
```
Explicit consent required.
Mutual state: SIMULATED — not another real user.
```

**Narration (EN):**
Before any result is revealed, you select which evidence to share
and give explicit consent.
The mutual state shown here is simulated —
it does not represent another real user.
Your consent choices persist across reloads.

**Narration (KO 참고 번역):**
결과가 공개되기 전에, 당신은 공유할 증거를 선택하고
명시적 동의를 제공합니다.
여기에 표시된 상호 상태는 시뮬레이션입니다 —
다른 실제 사용자를 나타내지 않습니다.
동의 선택은 새로고침 후에도 유지됩니다.

**Truth-status:** VERIFIED_PRODUCTION (consent persistence); simulated mutual label: VERIFIED_PRODUCTION

**Fallback:** If consent flow not reachable, show annotated consent screen with visible `SIMULATED` label.

---

## Scene 6 — Privacy lifecycle (1:48–2:06)

**Screen direction:** Matching off toggle, record exclusion, delete-all action, empty restored state.

**On-screen text:**
```
Deletion is a product feature, not a footer promise.
```

**Narration (EN):**
Privacy is a product feature, not a footer promise.
You can turn matching off, exclude specific records,
or delete your entire collection.
After deletion, WatchTree restores a clean empty state.
Your data lifecycle is always in your hands.

**Narration (KO 참고 번역):**
프라이버시는 footer 약속이 아닌 제품 기능입니다.
매칭을 끄거나, 특정 기록을 제외하거나,
전체 컬렉션을 삭제할 수 있습니다.
삭제 후 WatchTree는 깨끗한 빈 상태를 복원합니다.
데이터 수명주기는 항상 당신의 손에 있습니다.

**Truth-status:** VERIFIED_PRODUCTION

**Fallback:** None required — privacy lifecycle is verified production behavior.

---

## Scene 7 — Base44 technical proof (2:06–2:28)

**Screen direction:** Architecture graphic or sanitized repository views showing Entity schemas, `created_by_id` RLS, Deno Function entrypoints, CI green evidence. No secrets, no tokens, no HMAC values.

**On-screen text:**
```
Base44 Auth · 13 Entity schemas · created_by_id RLS
12 deployed Functions · CI-verified release
```

**Narration (EN):**
Base44 is not only where WatchTree is hosted.
It is the authenticated data, permission, function,
and deployment layer behind the entire privacy model.
Base44 Auth verifies every caller.
Owner-scoped Entities enforce row-level security through created_by_id.
Caller-authenticated Deno Functions protect server state.
Base44 hosting deploys the verified release.

**Narration (KO 참고 번역):**
Base44는 WatchTree가 호스팅되는 곳만이 아닙니다.
전체 프라이버시 모델 뒤의 인증된 데이터, 권한, 함수,
그리고 배포 계층입니다.
Base44 Auth는 모든 호출자를 검증합니다.
Owner-scoped Entity는 created_by_id를 통해 row-level security를 강제합니다.
Caller-authenticated Deno Function은 서버 상태를 보호합니다.
Base44 호스팅이 검증된 릴리스를 배포합니다.

**Truth-status:**
- Base44 Auth: VERIFIED_PRODUCTION
- 13 Entity schemas: VERIFIED_PRODUCTION
- 12 deployed Function baseline: VERIFIED_PRODUCTION
- 13th Function (`add-watch-url-event`): MERGED_NOT_DEPLOYED — do not claim as deployed
- Realtime: OPTIONAL_IF_VERIFIED — include only if Issue #41 verified at capture time
- AI Agent: DO_NOT_SHOW
- File Storage: DO_NOT_SHOW

**Fallback:** If CI evidence not accessible during capture, use sanitized local `git log` and test output screenshot. Do not show secrets or tokens.

---

## Scene 8 — Close (2:28–2:40)

**Screen direction:** Ending card with product name, live URL, GitHub repository, and Base44 Dev Build-Off label.

**On-screen text:**
```
WatchTree by Resonance
https://base44-resonance-40117c91.base44.app
github.com/skerishKang/base44-resonance
Built for Base44 Dev Build-Off
```

**Narration (EN):**
WatchTree by Resonance.
Build your own private memory tree.
Built for the Base44 Dev Build-Off.

**Narration (KO 참고 번역):**
Resonance의 WatchTree.
당신만의 private memory tree를 만드세요.
Base44 Dev Build-Off를 위해 만들었습니다.

**Truth-status:** VERIFIED_PRODUCTION (URL and repository)

**Fallback:** None required.
