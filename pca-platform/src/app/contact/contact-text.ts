/**
 * 문의하기(`/contact`) 문구 파일(CLAUDE.md 화면 문구 규칙 8). 영어 공개 전 필수인 **영어 문의 창구**다
 * (2026-11-03 대표 결정 목록). 높임은 `-요` 한 꼴. 일본어(`ja`) 칸은 아직 비어 있다.
 */
import type { Txt } from "../me/me-text";

export const CONTACT_TEXT = {
  title: { ko: "문의하기", en: "Contact us" },
  lead: { ko: "궁금한 점을 적어 보내 주세요. 적어 주신 메일로 답해요.", en: "Send us your question. We reply to the email address you give." },
  langNote: { ko: "", en: "You can write in English or Korean." },
  topic: { ko: "문의 종류", en: "Topic" },
  tPersonal: { ko: "개인 이용 · 검사", en: "Personal use · assessment" },
  tMat: { ko: "MAT", en: "MAT (job-search assistant)" },
  tUniv: { ko: "학교 · 기관 도입", en: "Schools and institutions" },
  tPartner: { ko: "제휴 · 기타", en: "Partnership · other" },
  name: { ko: "이름", en: "Name" },
  email: { ko: "답 받을 메일", en: "Email for our reply" },
  message: { ko: "문의 내용", en: "Message" },
  messageHolder: { ko: "무엇이 궁금한지 적어 주세요(4,000자까지)", en: "Tell us what you want to know (up to 4,000 characters)" },
  consent: { ko: "문의에 답하려고 이름 · 메일 · 문의 내용을 받는 데 동의해요. 답한 뒤 1년이 지나면 지워요.", en: "I agree that you collect my name, email and message to answer this inquiry. It is deleted 1 year after the reply." },
  privacy: { ko: "개인정보처리방침", en: "Privacy policy" },
  send: { ko: "보내기", en: "Send" },
  ok: { ko: "받았어요. 적어 주신 메일로 답할게요.", en: "We received your message. We will reply by email." },
  errEmail: { ko: "메일 주소를 다시 확인해 주세요.", en: "Check the email address." },
  errConsent: { ko: "동의 칸을 체크해 주세요.", en: "Tick the consent box." },
  errRequired: { ko: "이름과 문의 종류를 적어 주세요.", en: "Enter your name and pick a topic." },
  errLong: { ko: "문의 내용은 4,000자까지예요.", en: "The message can be up to 4,000 characters." },
  mailDirect: { ko: "메일로 바로 보내기", en: "Or email us directly" },
  support: { ko: "주문 · 환불 · 계정은 고객지원에서", en: "For orders, refunds and accounts, go to Support" },
} satisfies Record<string, Txt>;
