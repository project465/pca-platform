/**
 * 입구(문 고르기 · 로그인 · 가입 · 비밀번호 찾기 · 전공 고르기 · 없는 쪽)의
 * 영어. **열쇠가 한국어 원문 자체다**(`me-v3/phrase.ts` 와 같은 꼴).
 *
 * 한국어는 사전을 거쳐도 글자가 그대로 나가서, 이 길을 들인 날 한국어 화면이
 * 한 글자도 바뀌지 않는다. `surface-text.ts` · `locale.ts` 에 섞지 않은 까닭은
 * 저 둘이 세 언어를 한 줄에 묶은 사전이라 한 줄을 더하려면 승인되지 않은
 * 튀르키예어까지 지어내야 하기 때문이다(`start-copy.ts` 와 같다).
 *
 * **빠진 열쇠를 조용히 넘기지 않는다.** 영어 사전에 없으면 원문(한국어)이
 * 나가서 화면에 한글이 서고, `npm run v3:en:walk` 가 그것을 센다.
 */
export type EntryLang = "ko" | "en";
export type EntrySay = (ko: string, vars?: Record<string, string | number>) => string;

function fill(s: string, vars?: Record<string, string | number>): string {
  if (!vars) return s;
  return s.replace(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g, (m, k: string) =>
    (k in vars ? String(vars[k]) : m));
}

const EN: Record<string, string> = {
  /* 왼쪽 판(EntryFrame) */
  "전공과 경험으로 찾는 내 커리어": "Your career, read from your major and your experience",
  "해 본 일 확인": "What you've done",
  "직접 정한 것과 받아서 한 것을 나눠 봅니다": "We separate what you decided from what you were handed",
  "산업·직무 연결": "Industries and roles",
  "확인된 경험이 이어지는 자리를 찾습니다": "We show where your confirmed experience leads",
  "다음 할 일": "What to do next",
  "비어 있는 자리를 메우는 한 가지를 냅니다": "One concrete step to fill what's missing",
  "대학·기관 계정과 개인 계정이 같은 화면을 씁니다.":
    "University accounts and personal accounts use the same screens.",

  /* 문 고르기(/start) */
  "CareerMatri 시작하기": "Get started with CareerMatri",
  "무료 기본 검사로 시작합니다. 가입하고 전공을 고르면 바로 응시로 들어갑니다.":
    "Start with the free Basic assessment. Sign up, pick your major and you're in.",

  /* 로그인 */
  "로그인 · CareerMatri": "Sign in · CareerMatri",
  "다시 오셨군요": "Welcome back",
  "학교에서 받은 아이디나, 개인으로 가입하신 이메일로 들어오세요.":
    "Sign in with the ID your school gave you, or the email you signed up with.",
  "또는": "or",
  "비밀번호를 잊으셨나요?": "Forgot your password?",
  "개인으로 가입하기": "Sign up as an individual",
  "학번 또는 이메일": "Student ID or email",
  "비밀번호": "Password",
  "확인 중…": "Checking…",
  "로그인": "Sign in",
  "아이디와 비밀번호를 모두 입력하세요.": "Enter both your ID and your password.",
  "로그인 시도가 너무 많습니다. {wait} 뒤에 다시 시도해주세요.":
    "Too many sign-in attempts. Try again in {wait}.",
  "약 1분": "about a minute",
  "약 {n}분": "about {n} minutes",
  "이 계정은 지금 이용이 멈춰 있습니다. 학과 담당자에게 계정을 다시 열어 달라고 말씀해 주세요.":
    "This account is paused. Ask your department administrator to reopen it.",
  "이 계정은 파기 처리되어 더 쓰실 수 없습니다. 다시 쓰시려면 학과 담당자에게 말씀해 주세요.":
    "This account has been deleted and can't be used. Contact your department administrator to use it again.",
  "아이디 또는 비밀번호가 올바르지 않습니다. 학교에서 받은 비밀번호가 기억나지 않으면 학과 담당자가 다시 발급해 드립니다.":
    "That ID or password isn't right. If you signed up with an email, you can reset your password below.",
  "로그인 정보를 다 받지 못했습니다. 다시 눌러 보시고, 그래도 안 되면 아래 이메일 로그인을 쓰실 수 있습니다.":
    "We didn't get all of your sign-in details. Try again, or sign in with your email below.",
  "가입을 마치는 데 시간이 조금 지났습니다. 다시 눌러 주십시오.":
    "Signing up took a little too long. Please try again.",
  "이 계정은 지금 이용이 멈춰 있습니다. 고객지원으로 알려 주십시오.":
    "This account is paused. Please contact support.",
  "그 로그인 방법은 지금 켜져 있지 않습니다. 이메일로 들어오실 수 있습니다.":
    "That sign-in option isn't available right now. You can sign in with your email.",
  "로그인 공급자에서 돌아오는 길이 끊겼습니다. 다시 눌러 주십시오.":
    "The connection back from the sign-in provider dropped. Please try again.",
  "이 이메일로 만들어진 계정이 이미 있습니다. 쓰시던 방법으로 들어오신 뒤 계정 화면에서 연결해 주십시오.":
    "An account with this email already exists. Sign in the way you did before, then link it from your account page.",
  "로그인이 취소됐습니다. 다시 눌러 보시거나 이메일로 들어오실 수 있습니다.":
    "Sign-in was cancelled. Try again, or sign in with your email.",
  "로그인 설정에 문제가 있습니다. 이메일로 들어오시고, 이 사실을 알려 주십시오.":
    "Something is wrong with this sign-in option. Please use your email and let us know.",

  /* 가입 */
  "이미 가입된 이메일입니다. 로그인해 주세요.": "This email is already registered. Please sign in.",
  "가입은 됐습니다. 로그인해 주세요.": "Your account is ready. Please sign in.",
  "이메일 형식이 아닙니다.": "That doesn't look like an email address.",
  "이름을 적어 주세요.": "Please enter your name.",
  "비밀번호는 10자 이상이어야 합니다.": "Your password needs at least 10 characters.",
  "비밀번호가 너무 깁니다.": "That password is too long.",
  "동의문이 등록되지 않았습니다.": "The consent documents aren't set up yet. Please contact support.",
  "필수 동의 항목이 빠졌습니다.": "Please agree to all the required items.",
  "동의를 적지 못했습니다. 잠시 뒤 다시 시도해 주세요.":
    "We couldn't record your consent. Please try again in a moment.",

  /* 비밀번호 찾기 · 새로 정하기 */
  "비밀번호 재설정 · CareerMatri": "Reset password · CareerMatri",
  "비밀번호 재설정": "Reset your password",
  "등록된 학번이나 이메일을 입력하세요.": "Enter your student ID or the email you registered with.",
  "처리 중…": "Working…",
  "재설정 링크 받기": "Send me a reset link",
  "이 서버는 메일 발송이 아직 연결되지 않아 재설정 링크를 보내지 못했습니다. 기다리셔도 메일은 오지 않습니다.":
    "Email isn't connected on this server yet, so we couldn't send a reset link. No email will arrive.",
  "입력하신 계정이 등록돼 있다면 재설정 링크를 보냈습니다.":
    "If that account is registered, we've sent a reset link.",
  "메일이 없는 학생 계정은 학과 담당자가 직접 재설정 링크를 발급합니다. 담당자에게 문의하세요.":
    "Student accounts without an email get a reset link from the department administrator.",
  "개발 모드": "Development mode",
  "메일 발송이 아직 연결되지 않아 링크를 여기에 표시합니다. 운영 환경에서는 표시되지 않습니다.":
    "Email isn't connected, so the link is shown here. It is never shown in production.",
  "로그인으로 돌아가기": "Back to sign in",
  "새 비밀번호 설정 · CareerMatri": "Set a new password · CareerMatri",
  "새 비밀번호 설정": "Set a new password",
  "{name} 님의 비밀번호를 새로 정합니다.": "Setting a new password for {name}.",
  "이 링크는 만료되었거나 이미 사용되었습니다. 링크는 발급 후 24시간 동안, 한 번만 쓸 수 있습니다.":
    "This link has expired or was already used. A link works once, within 24 hours.",
  "다시 발급받기": "Get a new link",
  "새 비밀번호": "New password",
  "10자 이상": "At least 10 characters",
  "새 비밀번호 확인": "Confirm new password",
  "설정 중…": "Saving…",
  "비밀번호 설정": "Set password",
  "새 비밀번호가 서로 다릅니다.": "The two passwords don't match.",
  "링크가 만료되었거나 이미 사용되었습니다. 다시 발급받으세요.":
    "This link has expired or was already used. Please request a new one.",

  /* 없는 쪽 */
  "없는 쪽입니다 · CareerMatri": "Page not found · CareerMatri",
  "없는 쪽입니다": "Page not found",
  "주소가 바뀌었거나 지워진 쪽입니다. 아래에서 가시려던 곳을 찾으실 수 있습니다.":
    "This address has changed or the page was removed. You can find your way from here.",
  "내 CareerMatri": "My CareerMatri",
  "검사": "Assessment",
  "고객지원": "Support",

  /* 전공 고르기(/cores, 해외 개인) */
  "전공 고르기 · CareerMatri": "Choose your major · CareerMatri",
  "검사 시작": "Start the assessment",
  "전공을 선택해주세요": "Choose your major",
  "전공에 따라 살펴보는 경험과 기술 분야가 달라집니다.":
    "Your major decides which technical areas and kinds of experience we ask about.",
  "이어서 풀 응시가 있습니다": "You have an assessment in progress",
  "마지막으로 답한 문항에서 이어집니다.": "You'll pick up at the last question you answered.",
  "이어하기": "Continue",
  "결과가 나와 있습니다": "Your results are ready",
  "검사 당시 결과는 고정돼 있어 언제든 다시 열립니다.": "Your results are saved as they were and open any time.",
  "결과 보기": "View results",
  "무료 기본 검사": "Free Basic assessment",
  "검사 시작하기": "Start",
  "약 {min}분 · 저장되며 진행됩니다": "About {min} min · saved as you go",
  "로그아웃": "Sign out",
  "이공계 진로 진단": "Engineering career diagnostic",
  "웹 결과와 A4 PDF": "Web report and an A4 PDF",
  "답할 때마다 저장되어 이어서 풉니다": "Saved as you go, so you can pick up where you left off",
  "해외에서는 무료 기본 검사가 열려 있습니다": "Outside Korea, the free Basic assessment is open",
  "무료 기본 검사 시작하기": "Start the free Basic assessment",
  "유료 등급(Standard · Pro)은 아직 한국 밖에서 결제할 수 없습니다.":
    "Paid tiers (Standard and Pro) can't be purchased outside Korea yet.",
};

/** 그 언어의 말. 영어가 아니면 원문 그대로다 */
export function entrySay(lang?: string | null): EntrySay {
  if (lang === "en") return (ko, vars) => fill(EN[ko] ?? ko, vars);
  return (ko, vars) => fill(ko, vars);
}

/** 테스트용: 영어가 빠진 열쇠를 센다 */
export function entryMissing(keys: string[]): string[] {
  return keys.filter((k) => !(k in EN));
}
