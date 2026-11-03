import { CONSULT_POLICY_FROM } from "@/lib/careerpeak-consult";
import { ASK_OPEN_FROM } from "./ask-open";

/**
 * MAT 화면이 적는 "언제부터 열립니다" 를 **한 곳에서** 읽는다(2026-11-02 운영 시험: 상담 11월 6일 ·
 * 이용권 11월 7일 · 지원서 11월 10일로 서로 달랐다).
 *
 * 날은 둘이다. 까닭이 달라서다.
 * - 상담 연결: 커리어피크로 보내는 동의 · 처리방침이 적용되는 날(`CONSULT_POLICY_FROM`)
 * - 문장 고치기 · 면접 연습 · 묻기: 질문 · 문장 · 답을 국외로 보내는 처리방침이 적용되는 날(`ASK_OPEN_FROM`)
 *
 * **한국 시간으로 적는다.** 서버 시간대(UTC)로 읽으면 11월 7일 0시(한국)가 11월 6일로 나온다.
 */
export function kstDayKo(d: Date | number | null): string {
  if (d === null) return "곧";
  const k = new Date((typeof d === "number" ? d : d.getTime()) + 9 * 3_600_000);
  return `${k.getUTCMonth() + 1}월 ${k.getUTCDate()}일`;
}

export const CONSULT_OPENS_KO = kstDayKo(CONSULT_POLICY_FROM);
export const AI_TOOLS_OPEN_KO = kstDayKo(ASK_OPEN_FROM);

/** 영어 화면: `Nov 10` */
export function kstDayEn(d: Date | number | null): string {
  if (d === null) return "soon";
  const k = new Date((typeof d === "number" ? d : d.getTime()) + 9 * 3_600_000);
  return `${k.toLocaleString("en-US", { month: "short", timeZone: "UTC" })} ${k.getUTCDate()}`;
}
export const openDay = (which: "consult" | "tools", lang: "ko" | "en" = "ko") =>
  lang === "en" ? kstDayEn(which === "consult" ? CONSULT_POLICY_FROM : ASK_OPEN_FROM) : which === "consult" ? CONSULT_OPENS_KO : AI_TOOLS_OPEN_KO;
