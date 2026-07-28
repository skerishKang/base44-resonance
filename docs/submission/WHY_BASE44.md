# Why Base44

## From one-click builder to agent-operated backend

### 120–160 words

We entered the Base44 Dev Build-Off expecting a tool that generates a complete app from a single prompt. What we discovered was a code-defined production backend platform. Base44 provided Auth, owner-scoped entity storage with declarative RLS, Deno backend functions, secrets management, and deployment.

For this submission, most production source was developed through external agentic tools and local models under human direction and AI CTO review, while Base44 remained the authenticated backend and runtime authority. It authenticated callers, enforced row-level security, executed Deno functions, stored data, and hosted the production site. We never wired a separate database, Auth provider, API server, or permission layer. The current final-source suite includes 277 tests and runs entirely on Base44 — no service role, no runtime AI, no external API calls.

### 300–450 words

We entered the Base44 Dev Build-Off expecting a tool that generates a complete application from a single conversation. For this submission, most production source was developed through external agentic tools and local models under human direction and AI CTO review, while Base44 remained the authenticated backend and runtime authority.

The development model that emerged was neither prompt-to-app nor traditional full-stack. A human project owner defined the product requirements. An AI CTO defined execution contracts, performed source review, verified exact-head SHAs, and made merge-readiness decisions. An agent (local LLM + IDE tools) implemented isolated source slices against those contracts. GitHub served as the evidence and integration boundary: PRs were reviewed, CTO review findings were tracked as repository comments, and CI enforced exact-head SHA verification. No model output was trusted without CI and code review confirming it.

Base44 handled what would otherwise have required five separate services:
- **Auth** — caller identity via SDK
- **Database** — 13 entity types with automatic `created_by_id` RLS
- **API server** — 13 Deno Functions with standard request guarding
- **Permission layer** — declarative per-entity RLS, no custom middleware
- **Hosting** — Vite-built single-page application with release CI

We did not use Base44's AI call capability, Agent integrations, or file storage. Realtime subscriptions are merged but not yet deployed. These remain audited in our submission ledger.

### 700–1,000 words

We entered the Base44 Dev Build-Off expecting an AI website builder.

The platform homepage and documentation emphasize building with AI. The builder UI, the "ship in hours" messaging, the SDK documentation that mentions LLM integration — all of it pointed toward a tool that generates an application from a conversation. Our initial product plan (Issue #1) reflected that assumption: we would feed Base44 a product description and receive a working relationship-discovery application.

That assumption was partly wrong and partly incomplete.

**What Base44 actually is**

Base44 is a code-defined backend platform optimized for AI-assisted development. It provides production infrastructure — Auth, database entities with automatic Row-Level Security, Deno runtime for backend functions, secrets management, and hosting. For this submission, most production source was developed through external agentic tools and local models under human direction and AI CTO review, while Base44 remained the authenticated backend and runtime authority.

**What we discovered through building**

The development model that emerged was neither prompt-to-app nor traditional full-stack. It had four layers:

1. **Product and contract layer (human project owner + AI CTO):** A human project owner defined product intent and held final approval authority. An AI CTO defined execution contracts, performed source review, verified exact-head SHAs, and made merge-readiness decisions.

2. **Implementation layer (local LLM + agentic IDE):** A local language model running outside Base44's infrastructure implemented isolated source slices. Each slice had a defined file scope, a known base commit, and an explicit list of allowed and forbidden changes. The agent never accessed production secrets, the Base44 dashboard, or the deployment pipeline.

3. **Integration layer (GitHub):** Every change entered the codebase through a GitHub PR. The PR body recorded the exact base SHA, exact head SHA, CTO review findings, and next-actions. Branch history was auditable. Direct-main changes were prohibited by the operating contract; one accidental no-op file write reached main, was immediately reverted, publicly disclosed, and led to stricter PR-only integration discipline.

4. **Validation layer (CI + CTO review):** The final-source test suite contains 277 deterministic tests. CI runs browser validation and release build verification on every PR. An AI CTO reviewed source, contract regexes, and exact SHA baselines, then either approved or sent PRs back for correction. No model-produced output was trusted without both CI pass and human review.

**What Base44 handled**

Base44 replaced five infrastructure concerns that would otherwise have required separate services or custom code:

- **Authentication and user identity:** Base44 Auth handled sign-in, session management, and caller identity via `base44.auth.me()`. The SDK extracted credentials from the request context — we never wrote an Auth endpoint, never stored a password hash, never configured a JWT secret.

- **Database with Row-Level Security:** 13 Entity schemas with automatically enforced `created_by_id` RLS. Every read, update, and delete was owner-scoped by the platform — we never added a `WHERE user_id = ?` clause, never implemented a permission middleware, never wrote a migration script.

- **Backend API server:** 13 Deno Functions with a uniform request-handling pattern: `createClientFromRequest(req)` → `authenticate(base44)` → bounded logic → `json()` or `fail()`. No Express routes, no API gateway configuration, no request validation middleware.

- **Secrets management:** `Deno.env.get("WATCHTREE_HMAC_KEY")` for HMAC digests. No Vault, no AWS Secrets Manager, no encrypted config files.

- **Hosting and deployment:** Vite-built SPA deployed to Base44's hosting with a release CI pipeline that verifies the production App ID and rejects validation/buildoff IDs.

**What we built in custom code**

Everything else — approximately 2,600 added lines across 48 files in the final PR alone — was custom application code: React components, the URL parser, the matching engine, the deletion budget model, the scoped restoration logic, the HMAC-backed confirmation system, the 13 function entrypoints, the browser worker for file parsing, the CI pipeline, the release bundle verifier, and the 277 test cases.

**What remains unused and why**

Base44 offers capabilities we audited and intentionally declined:

- **AI / LLM calls:** WatchTree's matching is deterministic — no runtime AI, no LLM calls after initial product decision. Not using AI was a product choice for auditability and performance.

- **Base44 Agents:** Not evaluated. The Build-Off timeline did not permit Agent integration review.

- **Realtime subscriptions:** Merged via PR #45 (Issue #41) but not yet deployed. Caller-scoped WatchEvent subscription with debounced restore and session-object lifecycle isolation. Production verification pending.

- **File and media storage:** Raw watch-history files are parsed in a browser Worker and never uploaded. No file storage needed.

**The stronger story**

For this submission, we did not rely on a one-click generated app. Most production source was developed through external agentic tools and local models under human direction and AI CTO review, while Base44 remained the authenticated backend and runtime authority. Base44 provided Auth, Entities, RLS, Functions, secrets, and hosting. We did not wire a separate database, Auth provider, API server, permission layer, or secrets vault. Multiple reviewed correction rounds and 277 tests later, WatchTree runs entirely on Base44 without service role, without runtime AI, and without external API calls.

---

## Base44 활용 서사: 한 번의 클릭으로 끝나는 AI 사이트 빌더에서 Agent가 운영하는 백엔드 플랫폼으로

### 한국어 참고 번역 (700–1,000 words 버전 기준)

Base44 Dev Build-Off에 참여하면서 우리는 AI 웹사이트 빌더를 기대했다. 플랫폼 문서는 AI를 강조했고, "몇 시간 만에 출시"라는 메시지와 SDK 문서의 LLM 통합 설명은 하나의 대화만으로 완전한 애플리케이션이 생성될 것처럼 보이게 했다. 첫 번째 제품 계획(Issue #1)은 그 가정을 반영했다.

그 가정은 부분적으로 틀렸고, 부분적으로 불완전했다.

Base44는 AI 지원 개발에 최적화된 **코드 정의 백엔드 플랫폼**이다. 인증, 자동 Row-Level Security가 적용된 데이터베이스 Entity, Deno 런타임 백엔드 함수, 시크릿 관리, 호스팅을 제공하지만, 애플리케이션 로직을 작성하지는 않는다. 코드를 작성하는 것은 개발자다. Base44는 그 코드를 실행한다.

이 차이는 우리의 개발 방식을 완전히 바꾸었다. 대화에서 완전한 앱을 추출하려고 시도하는 대신, Base44를 권위 있는 백엔드로 사용하고 외부 로컬 언어 모델과 agentic IDE가 Base44의 SDK 및 Entity 계약에 맞춰 모든 소스 파일을 작성하도록 했다.

개발 모델은 프롬프트-투-앱도 전통적인 풀스택도 아닌 네 개의 계층으로 구성되었다:

1. **제품 및 계약 계층 (인간 프로젝트 소유자 + AI CTO):** 인간 프로젝트 소유자가 제품 의도와 최종 승인 권한을 정의했다. AI CTO가 실행 계약을 정의하고, 소스를 검토하고, 정확한 SHA를 확인하고, 병합 준비를 결정했다.

2. **구현 계층 (로컬 LLM + agentic IDE):** Base44 인프라 외부에서 실행되는 로컬 언어 모델이 격리된 소스 슬라이스를 구현했다. 각 슬라이스는 정의된 파일 범위, 알려진 베이스 커밋, 명시적인 허용/금지 변경 목록을 가졌다.

3. **통합 계층 (GitHub):** 모든 변경사항은 GitHub PR을 통해 코드베이스에 진입했다. PR 본문은 정확한 베이스 SHA, 정확한 헤드 SHA, CTO 리뷰 결과, 다음 조치를 기록했다.

4. **검증 계층 (CI + CTO 리뷰):** CI는 277개의 결정론적 테스트, 브라우저 검증, 릴리스 빌드 검증을 모든 PR에서 실행했다. 인간 CTO가 소스를 검토하고 계약 정규식을 확인한 후 승인하거나 수정을 요청했다.

Base44는 다섯 가지 인프라 영역을 대체했다: 인증, 데이터베이스 + RLS, API 서버, 권한 계층, 호스팅. 우리는 별도의 데이터베이스, Auth 제공자, API 서버, 권한 미들웨어, 시크릿 볼트를 연결하지 않았다. 세 개의 PR, 여덟 번의 CTO 리뷰, 277개의 테스트 이후, WatchTree는 service role, runtime AI, 외부 API 호출 없이 전적으로 Base44 위에서 실행된다.

더 강력한 서사는 이것이다: Base44가 하나의 프롬프트로 전체 앱을 생성했다는 것이 아니라, Base44가 프로덕션 백엔드 권위자로서 인증, Entities, RLS, Functions, 시크릿, 호스팅을 제공했고, 외부 agentic 코딩이 Base44의 SDK 계약에 맞춰 제품 로직을 구현했다는 것이다.
