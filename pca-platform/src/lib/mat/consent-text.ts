import type { Widen } from "./copy";

/**
 * AI 로 읽기 전 동의 창 문구(시안 Consent). 화면 TSX 에 한국어를 두지 않고 여기서 읽는다.
 * 보내는 곳(Anthropic, 미국)은 개인정보처리방침의 국외 이전 항목과 같은 말이다.
 */
export const CONSENT = {
  title: "AI로 이 공고를 읽을까요?",
  lead: (posting: string) => `${posting} 공고의 요건을 AI로 읽고 내 경험과 맞춰 봐요.`,
  sees: "AI가 보는 것",
  seesBody: "검사 결과 · 내가 적은 경험과 파일 · 고른 공고",
  notSent: "보내지 않는 것",
  notSentBody: "이름 · 연락처 · 학번",
  where: "공고 글과 요건은 Anthropic(미국)의 Claude로 보내져 읽혀요. 끄는 곳은 MAT 설정이에요.",
  remember: "다음부터 묻지 않기",
  go: "동의하고 시작",
  cancel: "취소",
  open: "AI로 더 자세히 읽기",
} as const;

/** 영어(열쇠는 위와 같다). 보내는 곳 문구는 영어 개인정보처리방침 초안의 국외 이전 항목과 같은 말이다 */
export const CONSENT_EN: Widen<typeof CONSENT> = {
  title: "Read this posting with AI?",
  lead: (posting: string) => `AI reads the requirements of ${posting} and compares them with your experience.`,
  sees: "What AI sees",
  seesBody: "Test result · experience and files you added · the posting you picked",
  notSent: "What is not sent",
  notSentBody: "Name · contact details · student number",
  where: "The posting text and requirements are sent to Claude by Anthropic (USA). You can turn this off in MAT settings.",
  remember: "Do not ask again",
  go: "Agree and start",
  cancel: "Cancel",
  open: "Read in more detail with AI",
};
export const consentText = (lang: "ko" | "en") => (lang === "en" ? CONSENT_EN : CONSENT);
