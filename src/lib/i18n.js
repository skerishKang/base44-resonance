export const LANGUAGE_STORAGE_KEY = "resonance.language";
export const SUPPORTED_LANGUAGES = ["en", "ko"];

export const copy = {
  en: {
    language: { label: "Language", english: "EN", korean: "한국어" },
    nav: { backend: "How it works", enter: "Enter Resonance" },
    hero: {
      eyebrow: "A quieter way to meet",
      title: "Connect through the way you feel and remember, not just age, location, or interests.",
      koreanLine: "조건이 아니라, 느끼고 기억하는 방식으로 연결됩니다.",
      body: "Resonance begins with private memories, explicit consent, and explanations that reveal affinity without exposing the stories that created it.",
      primary: "Enter the experience",
      secondary: "Inspect the foundation",
      privacy: "No private memory text is used in this capability probe.",
    },
    auth: {
      eyebrow: "Built-in Base44 authentication",
      title: "Begin with a protected identity.",
      body: "Sign in with the app's Base44 account flow. Credentials are sent directly to Base44 and are never written to application logs.",
      signIn: "Sign in",
      register: "Create account",
      verify: "Verify email",
      email: "Email",
      password: "Password",
      otp: "Verification code",
      submitSignIn: "Continue securely",
      submitRegister: "Create protected account",
      submitVerify: "Verify address",
      working: "Checking…",
      switchToRegister: "Need an account?",
      switchToSignIn: "Already registered?",
      verifyInstruction: "Enter the one-time code Base44 sent to your email.",
      registered: "Account created. Check your email for a verification code.",
      verified: "Email verified. You can now sign in.",
      errors: {
        email: "Enter a valid email address.",
        password: "Use at least 8 characters.",
        otp: "Enter the 6-digit verification code.",
        credentials: "Sign-in was not accepted. Check your details and try again.",
        registration: "Account creation could not be completed.",
        verification: "The verification code could not be confirmed.",
        unavailable: "Authentication is temporarily unavailable.",
      },
    },
    capability: {
      eyebrow: "Authenticated capability foundation",
      title: "A private proof, owned by you.",
      body: "Create an owner-scoped record, retrieve only your records, then ask a Deno function to verify it under the same caller permissions.",
      greeting: "Protected session for",
      member: "Resonance member",
      label: "Probe label",
      placeholder: "e.g. evening tide",
      create: "Create private probe",
      creating: "Creating…",
      refresh: "Refresh records",
      verify: "Verify with function",
      verifying: "Verifying…",
      logout: "Sign out",
      records: "Your capability probes",
      empty: "No probe exists yet. Create one to test the Entity path.",
      loading: "Loading your private records…",
      verified: "Verified",
      unverified: "Awaiting function",
      locale: "Locale",
      select: "Select",
      selected: "Selected",
      successCreate: "Entity create and owner-scoped list completed.",
      successVerify: "The authenticated function verified this record.",
      errors: {
        label: "Use 2–48 characters for the probe label.",
        entity: "The private Entity operation could not be completed.",
        function: "The function could not verify this probe.",
        missing: "Create or select a probe before verification.",
      },
    },
    status: {
      title: "Capability state",
      auth: "Auth",
      entity: "Entity",
      function: "Function",
      checking: "Checking",
      ready: "Verified",
      waiting: "Waiting",
      loading: "In progress",
      empty: "No records",
      error: "Needs attention",
      anonymous: "Sign-in required",
    },
    backend: {
      eyebrow: "How the backend works",
      title: "A visible foundation, not a black box.",
      body: "This slice proves the protected route that later supports consented memories, structured fingerprints, deterministic scoring, and mutual conversation.",
      foundation: "Slice 1 capability foundation",
      steps: [
        { title: "Base44 Auth", text: "Built-in identity establishes the caller context." },
        { title: "Owner-scoped Entity", text: "RLS limits create, read, update, and delete to authenticated owners." },
        { title: "Authenticated Deno Function", text: "The function inherits caller permissions and verifies one bounded record." },
        { title: "Deployable Base44 site", text: "Vite output is prepared for controlled validation and deployment." },
      ],
      note: "This is not yet the matchmaking backend. AI, deterministic matching, mutual consent, and realtime conversation arrive in later slices.",
    },
    footer: { line: "Resonance · capability foundation", privacy: "Private by design. Inspectable by intent." },
  },
  ko: {
    language: { label: "언어", english: "EN", korean: "한국어" },
    nav: { backend: "작동 방식", enter: "Resonance 시작" },
    hero: {
      eyebrow: "조용하고 깊은 만남",
      title: "나이, 지역, 관심사만이 아니라 느끼고 기억하는 방식으로 연결됩니다.",
      koreanLine: "조건이 아니라, 느끼고 기억하는 방식으로 연결됩니다.",
      body: "Resonance는 사적인 기억과 명시적 동의에서 출발하며, 그 기억을 노출하지 않고도 왜 서로 닿는지 설명합니다.",
      primary: "경험 시작하기",
      secondary: "기반 구조 살펴보기",
      privacy: "이 capability probe에는 사적인 기억 문장을 사용하지 않습니다.",
    },
    auth: {
      eyebrow: "Base44 기본 인증",
      title: "보호된 신원에서 시작합니다.",
      body: "Base44가 제공하는 계정 흐름으로 로그인합니다. 비밀번호는 Base44로 직접 전송되며 애플리케이션 로그에 기록되지 않습니다.",
      signIn: "로그인",
      register: "계정 만들기",
      verify: "이메일 인증",
      email: "이메일",
      password: "비밀번호",
      otp: "인증번호",
      submitSignIn: "안전하게 계속",
      submitRegister: "보호된 계정 만들기",
      submitVerify: "이메일 인증",
      working: "확인 중…",
      switchToRegister: "계정이 없으신가요?",
      switchToSignIn: "이미 가입하셨나요?",
      verifyInstruction: "Base44가 이메일로 보낸 일회용 인증번호를 입력하세요.",
      registered: "계정이 생성되었습니다. 이메일에서 인증번호를 확인하세요.",
      verified: "이메일 인증이 완료되었습니다. 이제 로그인할 수 있습니다.",
      errors: {
        email: "올바른 이메일 주소를 입력하세요.",
        password: "비밀번호는 8자 이상이어야 합니다.",
        otp: "6자리 인증번호를 입력하세요.",
        credentials: "로그인할 수 없습니다. 입력 정보를 확인하세요.",
        registration: "계정을 만들지 못했습니다.",
        verification: "인증번호를 확인하지 못했습니다.",
        unavailable: "현재 인증 서비스를 사용할 수 없습니다.",
      },
    },
    capability: {
      eyebrow: "인증된 capability 기반",
      title: "나만 소유하는 비공개 증거입니다.",
      body: "소유자 전용 레코드를 만들고 내 레코드만 조회한 뒤, 동일한 사용자 권한으로 Deno Function이 검증하도록 합니다.",
      greeting: "보호된 세션",
      member: "Resonance 사용자",
      label: "Probe 이름",
      placeholder: "예: 저녁의 물결",
      create: "비공개 probe 만들기",
      creating: "생성 중…",
      refresh: "레코드 새로고침",
      verify: "Function으로 검증",
      verifying: "검증 중…",
      logout: "로그아웃",
      records: "내 capability probe",
      empty: "아직 probe가 없습니다. 하나 만들어 Entity 경로를 확인하세요.",
      loading: "비공개 레코드를 불러오는 중…",
      verified: "검증 완료",
      unverified: "Function 대기",
      locale: "언어",
      select: "선택",
      selected: "선택됨",
      successCreate: "Entity 생성과 소유자 전용 목록 조회가 완료되었습니다.",
      successVerify: "인증된 Function이 이 레코드를 검증했습니다.",
      errors: {
        label: "Probe 이름은 2~48자로 입력하세요.",
        entity: "비공개 Entity 작업을 완료하지 못했습니다.",
        function: "Function이 probe를 검증하지 못했습니다.",
        missing: "검증 전에 probe를 만들거나 선택하세요.",
      },
    },
    status: {
      title: "Capability 상태",
      auth: "인증",
      entity: "Entity",
      function: "Function",
      checking: "확인 중",
      ready: "검증됨",
      waiting: "대기",
      loading: "진행 중",
      empty: "레코드 없음",
      error: "확인 필요",
      anonymous: "로그인 필요",
    },
    backend: {
      eyebrow: "백엔드 작동 방식",
      title: "감춰진 블랙박스가 아니라 보이는 기반입니다.",
      body: "이번 Slice는 이후 동의된 기억, 구조화된 fingerprint, 결정론적 점수, 상호 대화로 이어질 보호 경로를 증명합니다.",
      foundation: "Slice 1 capability foundation",
      steps: [
        { title: "Base44 Auth", text: "기본 인증이 요청자의 사용자 권한을 설정합니다." },
        { title: "소유자 전용 Entity", text: "RLS가 생성·조회·수정·삭제를 인증된 소유자로 제한합니다." },
        { title: "인증된 Deno Function", text: "Function이 요청자 권한을 이어받아 제한된 레코드 하나를 검증합니다." },
        { title: "배포 가능한 Base44 site", text: "Vite 결과물을 통제된 검증과 배포에 사용할 수 있도록 준비합니다." },
      ],
      note: "아직 최종 매칭 백엔드는 아닙니다. AI, 결정론적 매칭, 상호 동의, 실시간 대화는 다음 Slice에서 구현합니다.",
    },
    footer: { line: "Resonance · capability foundation", privacy: "처음부터 비공개로, 의도적으로 검증 가능하게." },
  },
};

export function normalizeLanguage(value) {
  return SUPPORTED_LANGUAGES.includes(value) ? value : "en";
}

export function getStoredLanguage(storage = globalThis.localStorage) {
  try {
    return normalizeLanguage(storage?.getItem(LANGUAGE_STORAGE_KEY));
  } catch {
    return "en";
  }
}

export function persistLanguage(language, storage = globalThis.localStorage) {
  const normalized = normalizeLanguage(language);
  try {
    storage?.setItem(LANGUAGE_STORAGE_KEY, normalized);
  } catch {
    // The selected language still applies for the current session.
  }
  return normalized;
}

export function getCopy(language) {
  return copy[normalizeLanguage(language)];
}
