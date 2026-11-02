import { loadInputs } from "./data";
import { derive } from "./derive";
import { regionView, type RegionView } from "./region";

/**
 * **웹 결과와 책이 같은 지역 회사 목록을 쓴다**(2026-11-02 시험: 웹은 세종 명단의 첫 회사를 결과와 상관없이
 * 크게 띄웠고, 배재대 · 전주대 웹에는 지역 회사가 아예 없었다). 책 01장과 같은 `regionView` 를 그대로 부른다.
 * 학교 · 기관 응시만 지역 자료가 있다(`data.ts` 의 기관 → 지역). 못 읽으면 `null`: 화면은 그 절을 세우지 않는다
 */
export async function webRegionView(attemptId: string): Promise<RegionView | null> {
  try {
    const x = await loadInputs(attemptId);
    if (!x.region) return null;
    /* 이어지는 회사가 없어도 지역(권역 기본값)은 돌려준다. 화면이 `이 전공 산업과 이어지는 회사를 찾지 못했다` 고 적는다
       (2026-11-02 전 학과 점검: 배재대 42줄에 `아직 담지 않았습니다` 가 남았다) */
    return regionView(x, derive(x).name);
  } catch {
    return null;
  }
}

/** 이 사람의 가장 최근 굳은 결과로 본 지역 회사 묶음(`/me/region`). 없으면 `null` */
export async function latestRegionView(userId: string): Promise<{ attemptId: string; rv: RegionView } | null> {
  const { queryOne } = await import("@/lib/db");
  const a = await queryOne<{ id: string }>(
    `SELECT a.id::text FROM v3_attempts a JOIN v3_snapshots s ON s.attempt_id = a.id
      WHERE a.user_id = $1 AND s.result_model IS NOT NULL ORDER BY s.created_at DESC, s.id DESC LIMIT 1`, [userId]).catch(() => null);
  if (!a) return null;
  const rv = await webRegionView(a.id);
  return rv ? { attemptId: a.id, rv } : null;
}
