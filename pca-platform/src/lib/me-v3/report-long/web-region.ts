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
    const rv = regionView(x, derive(x).name);
    return rv && rv.groups.length ? rv : null;
  } catch {
    return null;
  }
}
