/**
 * 작업공간(`/me/*`)을 어느 언어로 세우는가.
 *
 * **그 사람의 가장 최근 응시가 정한다.** 응시 줄이 언어를 들고 다니고
 * (`v3_attempts.locale`), 작업공간이 보여 주는 결과 · 경험 · 할 일이 전부
 * 그 응시에서 나온다. 화면 쿠키로 정하면 영어로 검사를 끝낸 사람이 한국어
 * 쿠키를 가진 기기에서 들어올 때 결과는 영어인데 작업공간은 한국어가 된다.
 *
 * 응시가 아직 없으면 사람이 **직접 고른 언어**(`explicitLang`)를 따른다.
 * 학교 학생은 늘 한국어 응시라 여기서 한국어가 나온다.
 */
import { queryOne } from "@/lib/db";
import { explicitLang } from "@/lib/locale-server";

export type WsLang = "ko" | "en";

export async function wsLang(userId: string): Promise<WsLang> {
  const last = await queryOne<{ locale: string | null }>(
    `SELECT locale FROM v3_attempts WHERE user_id = $1
      ORDER BY started_at DESC LIMIT 1`, [userId]).catch(() => null);
  if (last) return last.locale === "en" ? "en" : "ko";
  return (await explicitLang(null).catch(() => null)) === "en" ? "en" : "ko";
}

/**
 * 영어 작업공간에 세우지 않는 자리. **한국 자료에 서 있는 쪽이다**: 지역
 * 기관(한국 권역) · 공고(고용24) · 지원 기록(국내 공고와 이어진다) · 파일
 * 올려 경험 초안 만들기(국내 개인정보 동의로 열었다). 번역해 두면 해외
 * 손님이 한국 자료를 자기 것으로 읽는다.
 *
 * **MAT(`/me/track`)은 빠졌다**(2026-10-26). 해외판 기간권과 영어 공고
 * 읽기가 생겨서 영어 작업공간에서도 연다. 그 쪽 안에서 파일 올리기 · 지원
 * 기록 · AI 동의처럼 국내에만 있는 줄은 여전히 감춘다.
 */
export const WS_KR_ONLY = ["/me/region", "/me/jobs", "/me/apply"] as const;

export function wsKrOnly(path: string): boolean {
  return WS_KR_ONLY.some((p) => path === p || path.startsWith(`${p}/`));
}
