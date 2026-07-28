/**
 * tutorial-copy.js — English/Korean copy for the 6-step judge tutorial.
 */

const en = {
  entry: {
    title: "Start your WatchTree journey",
    primary: "Build my WatchTree",
    secondary: "See Mina's WatchTree story",
    body: "Start with your own link collection, or follow Mina — a curious night viewer — through a guided six-step demo.",
  },
  progress: "Step {current} of 6",
  next: "Next",
  back: "Back",
  exit: "Exit demo",
  restart: "Replay story",
  deleteData: "Delete tutorial data",
  buildOwn: "Build my own WatchTree",
  replay: "Replay story",
  error: "Something went wrong. You can restart the tutorial.",

  steps: [
    {
      title: "Deliberate collection",
      subtitle: "Mina adds only the links she chooses. WatchTree never reads her private YouTube account automatically.",
      detail: "Mina starts with synthetic demo data — 48 events from publicly available YouTube media. Each event represents a deliberate choice to record a video she watched.",
      label: "Synthetic demo · 48 events",
      koreanSubtitle: "Mina는 자신이 선택한 링크만 추가합니다. WatchTree는 비공개 YouTube 계정을 자동으로 읽지 않습니다.",
    },
    {
      title: "Private tree growth",
      subtitle: "Repeated choices begin to form a private, deterministic tree.",
      detail: "Mina's repeated watches, preferred creators, viewing times, and sequential paths create a unique fingerprint — a WatchTree that belongs only to her.",
      label: "Owner-private · deterministic tree",
    },
    {
      title: "Synthetic match",
      subtitle: "WatchTree compares Mina's private tree with synthetic archetypes, never by scanning another user.",
      detail: "Using deterministic matching, WatchTree finds shared patterns between Mina's tree and predefined viewing archetypes. These are synthetic — no real person is involved.",
      label: "Synthetic archetype · competition demo",
    },
    {
      title: "Explainable evidence",
      subtitle: "The match is not a mysterious percentage. Mina can inspect the exact evidence behind it.",
      detail: "Each matched candidate shows concrete evidence tokens: exact overlaps, rare signals, shared paths, and meaningful differences. No compatibility scores or personality labels.",
      label: "Inspectable evidence · no percentage",
    },
    {
      title: "Consent and simulated mutual",
      subtitle: "Mina chooses what may be revealed. The mutual result in this demo is clearly simulated.",
      detail: "After selecting specific evidence, Mina grants consent to reveal those items. The mutual resonance that follows is simulated — no real user is contacted.",
      label: "Consent-gated · simulated mutual",
    },
    {
      title: "Finish with control",
      subtitle: "Mina can start with her own link or delete every tutorial record.",
      detail: "You now understand the full WatchTree flow. Start building your own tree, or delete all tutorial data and begin fresh.",
      label: "You control your data",
    },
  ],

  base44: {
    title: "How Base44 powers WatchTree",
    items: [
      "Base44 Authentication",
      "13 owner-scoped Entities",
      "created_by_id RLS",
      "13 Deno Function sources",
      "Caller-scoped backend execution",
      "Realtime: Source merged — Production verification pending",
      "URL Function: Source merged — Production verification pending",
      "Deterministic matching",
      "Consent persistence",
      "Bounded delete-all",
      "Base44 hosting",
      "AI Agent: Not used",
      "File storage: Not used",
    ],
  },

  truth: {
    synthetic: "Synthetic archetype",
    simulated: "Simulated mutual",
    noRealUser: "No real user contacted",
    noYoutubeAccess: "WatchTree does not access your YouTube account",
    controls: {
      build: "Build my own WatchTree",
      delete: "Delete tutorial data",
      replay: "Replay story",
      exit: "Exit demo",
    },
  },
};

const ko = {
  entry: {
    title: "WatchTree 여정 시작하기",
    primary: "내 WatchTree 만들기",
    secondary: "Mina의 WatchTree 이야기 보기",
    body: "직접 링크를 모아 시작하거나, 호기심 많은 밤샘 시청자 Mina의 6단계 가이드 데모를 따라해보세요.",
  },
  progress: "{current} / 6 단계",
  next: "다음",
  back: "이전",
  exit: "데모 종료",
  restart: "다시 보기",
  deleteData: "데이터 삭제",
  buildOwn: "내 WatchTree 만들기",
  replay: "다시 보기",
  error: "문제가 발생했습니다. 튜토리얼을 다시 시작할 수 있습니다.",

  steps: [
    {
      title: "선택적 수집",
      subtitle: "Mina는 자신이 선택한 링크만 추가합니다. WatchTree는 비공개 YouTube 계정을 자동으로 읽지 않습니다.",
      detail: "Mina는 synthetic 데모 데이터(48개 이벤트)로 시작합니다. 각 이벤트는 그녀가 본 영상을 기록하기 위한 의도적인 선택입니다.",
      label: "Synthetic 데모 · 48개 이벤트",
      koreanSubtitle: "Mina는 자신이 선택한 링크만 추가합니다. WatchTree는 비공개 YouTube 계정을 자동으로 읽지 않습니다.",
    },
    {
      title: "비공개 트리 성장",
      subtitle: "반복된 선택이 비공개 결정론적 트리를 형성합니다.",
      detail: "Mina의 반복 시청, 선호 크리에이터, 시청 시간 및 순차적 경로는 고유한 지문 — 오직 그녀만의 WatchTree를 만듭니다.",
      label: "소유자 비공개 · 결정론적 트리",
    },
    {
      title: "Synthetic 매칭",
      subtitle: "WatchTree는 Mina의 비공개 트리를 synthetic archetype과 비교합니다. 다른 사용자를 스캔하지 않습니다.",
      detail: "결정론적 매칭을 통해 WatchTree는 Mina의 트리와 사전 정의된 시청 유형(archetype) 간의 공유 패턴을 찾습니다. 실제 인물은 관여하지 않습니다.",
      label: "Synthetic archetype · 대회 데모",
    },
    {
      title: "설명 가능한 증거",
      subtitle: "매칭은 신비로운 퍼센티지가 아닙니다. Mina는 그 뒤에 있는 정확한 증거를 검사할 수 있습니다.",
      detail: "각 매칭 candidate는 구체적인 증거 토큰(정확한 중복, 희귀 신호, 공유 경로, 의미 있는 차이)을 보여줍니다. 궁합 점수나 성격 라벨은 없습니다.",
      label: "검사 가능한 증거 · 퍼센티지 없음",
    },
    {
      title: "동의와 시뮬레이션된 상호 공명",
      subtitle: "Mina는 공개할 내용을 선택합니다. 이 데모의 상호 공명 결과는 명확히 시뮬레이션된 것입니다.",
      detail: "특정 증거를 선택한 후 Mina는 해당 항목을 공개하는 데 동의합니다. 이후 발생하는 상호 공명(mutual resonance)은 시뮬레이션된 것입니다. 실제 사용자에게 연락되지 않습니다.",
      label: "동의 기반 · 시뮬레이션된 상호 공명",
    },
    {
      title: "제어권을 가진 마무리",
      subtitle: "Mina는 자신의 링크로 시작하거나 모든 튜토리얼 기록을 삭제할 수 있습니다.",
      detail: "이제 전체 WatchTree 흐름을 이해했습니다. 직접 트리를 만들거나 모든 튜토리얼 데이터를 삭제하고 새로 시작하세요.",
      label: "당신이 데이터를 제어합니다",
    },
  ],

  base44: {
    title: "Base44가 WatchTree를 작동시키는 방법",
    items: [
      "Base44 인증",
      "13개의 소유자 범위 Entity",
      "created_by_id RLS",
      "13개의 Deno Function 소스",
      "호출자 범위 백엔드 실행",
      "Realtime: 소스 병합됨 — 프로덕션 검증 대기 중",
      "URL Function: 소스 병합됨 — 프로덕션 검증 대기 중",
      "결정론적 매칭",
      "동의 지속성",
      "제한된 전체 삭제",
      "Base44 호스팅",
      "AI Agent: 사용하지 않음",
      "파일 저장소: 사용하지 않음",
    ],
  },

  truth: {
    synthetic: "Synthetic archetype",
    simulated: "시뮬레이션된 상호 공명",
    noRealUser: "실제 사용자에게 연락되지 않음",
    noYoutubeAccess: "WatchTree는 YouTube 계정에 접근하지 않습니다",
    controls: {
      build: "내 WatchTree 만들기",
      delete: "튜토리얼 데이터 삭제",
      replay: "다시 보기",
      exit: "데모 종료",
    },
  },
};

export function getTutorialCopy(language) {
  return language === "ko" ? ko : en;
}
