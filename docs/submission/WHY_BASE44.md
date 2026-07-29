# Why Base44

## From one-click builder to an agent-operated backend

### 120–160 words

We entered the Base44 Dev Build-Off expecting an AI app builder. What we found was more useful for this product: a code-defined production backend. Base44 provided authenticated identity, owner-scoped Entity storage with declarative RLS, caller-scoped Deno Functions, secrets, Realtime-capable resources, hosting, and deployment.

WatchTree’s application source was developed through external coding agents and agentic IDEs under human product direction and AI CTO review. Base44 did not “write the whole app,” and our deterministic matching is not presented as AI. Base44 remained the runtime authority that authenticated callers, enforced ownership, executed backend Functions, stored product data, and hosted the app. We did not assemble a separate database, Auth provider, permission middleware, API server, or hosting stack. At the latest reviewed source, 314 deterministic tests and 11 browser scenarios verify the product boundary; final source deployment and Production UAT remain a separate release step.

### 300–450 words

We entered the Base44 Dev Build-Off expecting a tool that could generate a complete application from one conversation. The project instead revealed a stronger use of the platform: Base44 as a code-defined backend and deployment authority for an externally developed, agent-assisted product.

The working model had five clear responsibilities:

1. A human project owner defined product intent and retained consequential approval, deployment, and submission authority.
2. An AI CTO translated that intent into bounded execution contracts, reviewed exact source and CI evidence, and made merge-readiness decisions.
3. Coding agents and agentic IDEs implemented isolated source slices without Production credentials or dashboard access.
4. GitHub and CI provided the auditable version-control, review, and evidence boundary.
5. Base44 provided Auth, owner-scoped Entities and RLS, caller-scoped Deno Functions, secrets, Realtime-capable resources, hosting, and deployment.

This distinction matters. Base44 did not automatically generate every line of WatchTree, and WatchTree’s deterministic matching is not runtime AI. The platform supplied the production primitives that made the privacy model practical without wiring separate infrastructure.

The current source contains 13 Entity schemas and 13 Deno Function entrypoints. Every private Entity uses `created_by_id` RLS; every Function authenticates the request-scoped caller; no service role or cross-user matching path exists. Raw imported history is parsed in a browser Worker rather than uploaded as a file. Realtime and the six-step judge tutorial are merged in source but remain ineligible for Production claims until deployment and authenticated UAT.

The latest reviewed source passed 314 deterministic tests and 11 browser scenarios. CI verifies shared Function-source parity, a deterministic browser journey, a fail-closed Production App-ID build, and release-bundle boundaries. CI never deploys. Production release remains a separate, explicit decision.

### Extended narrative

#### What we expected

Base44’s public positioning naturally suggested prompt-to-app development. The initial Resonance plan reflected that expectation: combine private media memories, AI fingerprinting, relationship discovery, and conversation in one generated product.

That scope proved too broad and too difficult to explain truthfully within a short Build-Off. The product pivoted to WatchTree, a narrower privacy-first viewing-memory experience. Runtime AI matching was removed in favor of deterministic, inspectable signals and clearly synthetic archetypes.

#### What Base44 actually contributed

Base44 replaced infrastructure that would otherwise have required multiple systems:

- **Authentication and caller identity** through Base44 Auth and `base44.auth.me()`.
- **Owner-scoped database records** through declarative `created_by_id` RLS.
- **Backend execution** through caller-scoped Deno Functions and the Base44 SDK.
- **Secrets boundary** for the backend-only HMAC key used in internal digests.
- **Realtime-capable Entities** for owner-scoped refresh behavior.
- **Hosting and deployment** for the public application.

The source contains 13 Entity schemas and 13 Function entrypoints. The earlier Production baseline contains 12 Functions; `add-watch-url-event`, Realtime source, and the judge tutorial require final release deployment and verification before being described as active Production capabilities.

#### What custom source implemented

The project-specific code includes:

- the React product and bilingual interface;
- browser-local viewing-history parsing;
- API-key-free deliberate YouTube URL validation;
- deterministic WatchTree construction and synthetic archetype scoring;
- evidence allowlists and reveal-consent handling;
- explicitly simulated mutual state;
- bounded, resumable, child-first deletion and reconciliation;
- owner-scoped Realtime lifecycle protection;
- the six-step Mina judge tutorial;
- release-bundle verification, deterministic tests, and browser validation.

#### Why YouTube first

YouTube was selected as the first deliberate-input source, not as WatchTree’s permanent platform boundary. TikTok, Instagram, Facebook, and other video platforms may also support meaningful viewing-memory signals, but their history exports, API permissions, metadata reliability, retention behavior, and privacy boundaries were not sufficiently validated during this Build-Off.

YouTube offered a clear bounded action: a user can deliberately add a public video link and optional private context without granting automatic account-history access. The competition build does not claim that the YouTube API exposes complete watch history or authoritative repeat-view counts. Repeat and revisit signals come only from deliberately contributed or explicitly authorized records.

Future platforms may be added through bounded adapters after platform-specific URL, provenance, access, export, retention, and deletion behavior is researched and verified.

#### What was intentionally not used

- **Runtime AI / LLM matching:** not used; matching is deterministic for auditability.
- **Base44 Agent:** not used in the competition build; evaluation remains roadmap-only.
- **Base44 File storage:** not used; raw imported files stay browser-local.
- **Service role and cross-user scans:** not used.

#### The development method

Every implementation slice started from a known SHA and a written file-scope contract. Draft PRs remained open until exact-head CI and AI CTO review passed. Review findings were recorded publicly and corrected with new commits and fresh CI. The human project owner retained final authority over merge, deployment, and submission.

At the latest reviewed source:

- 13 Entity schemas;
- 13 Function sources;
- 314 deterministic tests;
- 11 browser scenarios;
- English/Korean tutorial parity;
- no runtime AI, external metadata API, service role, or file-storage dependency.

The central lesson is not that Base44 generated the entire product from one prompt. It is that Base44 supplied an authoritative production backend that external agentic development could target without separately assembling Auth, database, permissions, API runtime, secrets, and hosting.

---

## 한국어 참고 번역

우리는 Base44 Dev Build-Off에 참여하면서 한 번의 대화로 앱 전체를 생성하는 AI 빌더를 기대했다. 실제 개발을 통해 발견한 더 강한 가치는 **코드로 정의되는 프로덕션 백엔드 플랫폼**이었다.

인간 프로젝트 소유자는 제품 의도와 최종 승인·배포·제출 권한을 가졌다. AI CTO는 실행 계약을 만들고 정확한 소스와 CI 증거를 검토해 병합 준비 여부를 판단했다. 외부 코딩 에이전트와 agentic IDE는 Production 비밀정보나 Base44 대시보드에 접근하지 않은 채 격리된 소스 범위를 구현했다. GitHub와 CI는 버전 관리와 증거 경계였고, Base44는 Auth, owner-scoped Entities/RLS, caller-scoped Deno Functions, 시크릿, Realtime-capable resources, 호스팅과 배포의 권위자였다.

Base44가 앱의 모든 코드를 자동 생성했다고 주장하지 않는다. WatchTree의 매칭도 AI가 아니라 결정론적이고 검증 가능한 로직이다. 대신 Base44는 별도의 데이터베이스, Auth 제공자, 권한 미들웨어, API 서버, 시크릿 저장소, 호스팅을 따로 조합하지 않고도 개인정보 보호 모델을 구현하게 했다.

최신 검토 source에는 13개 Entity schema와 13개 Function source가 있다. 314개의 결정론적 테스트와 11개의 브라우저 시나리오가 통과했다. Realtime과 6단계 심사자 튜토리얼은 source에 병합됐지만, exact Production 배포와 인증 UAT 전에는 Production 기능으로 주장하지 않는다.

YouTube는 첫 입력 플랫폼일 뿐 영구적인 경계가 아니다. TikTok·Instagram·Facebook 등 다른 영상 플랫폼도 의미 있는 기록을 제공할 수 있지만, 이번 Build-Off에서는 기록 export, API 권한, metadata 신뢰도, 보존 정책과 개인정보 경계가 충분히 검증되지 않았다. 따라서 사용자가 공개 영상 링크를 의도적으로 추가할 수 있는 가장 명확한 경로인 YouTube부터 시작했다. 향후 다른 플랫폼은 URL 구조, provenance, 사용자 승인 접근, export, 보존과 삭제 동작을 별도로 검증한 뒤 bounded adapter로 추가할 수 있다.
