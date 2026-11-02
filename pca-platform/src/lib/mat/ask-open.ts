import { isSuperadmin } from "@/lib/session";
import { matAccess } from "@/lib/mat-access";

/**
 * 질문 입력창을 이 사람에게 여는가. 화면(입력창을 세울지)과 API(받을지)가 같은 답을 쓴다.
 *
 * **처리방침 개정(질문 · 문장 · 면접 답의 국외 이전, 11월 10일 적용) 전에는 운영자만.**
 * 그 뒤에는 MAT 이 열린 사람(이용권 · 학교 좌석). AI 분석 동의는 API 가 따로 본다:
 * 동의하지 않은 사람에게도 입력창은 서고, 누르면 켜는 길을 알려 준다.
 */
export const ASK_OPEN_FROM = Date.parse("2026-11-10T00:00:00+09:00");

export async function askOpenFor(userId: string): Promise<{ ok: true } | { ok: false; why: "date" | "pass" }> {
  if (await isSuperadmin()) return { ok: true };
  if (Date.now() < ASK_OPEN_FROM) return { ok: false, why: "date" };
  if (!(await matAccess(userId)).open) return { ok: false, why: "pass" };
  return { ok: true };
}
