import { query, queryOne } from "@/lib/db";
import type { Period, Plan } from "@/lib/pricing/config";

/**
 * 기본 · 연구자 플랜(2026-11-03 대표 결정: 누구나 고름, 학위로 나누지 않음).
 *
 * **플랜은 지금 쓰는 기간 한 줄의 상품이 정한다.** 연구자 상품(`RESEARCH_*`)이면 연구자, 그 밖(개인 기간권 ·
 * 학교 · 기관 이용권 · PRO 첫 한 달)은 기본이다. 학교 · 기관 이용권은 지금 받는 것을 그대로 받는다(기본 전부).
 *
 * 연구자 플랜이 더 여는 것
 *   - 논문 · 긴 PDF 를 **쪽 수 한도**로 읽기(`pricing/config.ts` 의 RESEARCH_LIMITS, `research-docs.ts`)
 *   - 연구소 · 기업 연구소 · 박사급 · 대학원 · 연구실 공고 묶음(`jobs/meta.ts` 의 RESEARCH_SQL, `/mat/jobs`)
 *   - 연구계획서 · 연구 경력 기술서 · 영문 CV 초안 · 연구직 면접: 화면은 아직 없다(만들 차례 표에 둔다)
 */
export const PLAN_PRODUCTS: Record<Plan, Partial<Record<Period, string>>> = {
  basic: { 30: "TRACK_30D", 90: "TRACK_90D" },
  research: { 30: "RESEARCH_30D" },
};

export function planOfProduct(code: string | null | undefined): Plan {
  return code && code.startsWith("RESEARCH_") ? "research" : "basic";
}

export function productFor(plan: Plan, period: Period): string | null {
  return PLAN_PRODUCTS[plan][period] ?? null;
}

/** 지금 쓰는 플랜. 기간권이 없으면 `null` */
export async function planOf(userId: string): Promise<Plan | null> {
  const r = await queryOne<{ product_code: string }>(
    `SELECT product_code FROM entitlements
      WHERE user_id = $1 AND kind = 'track' AND status = 'active' AND starts_at <= now() AND ends_at > now()
      ORDER BY starts_at LIMIT 1`, [userId]).catch(() => null);
  return r ? planOfProduct(r.product_code) : null;
}

/** 지금 기간 한 칸(30일)에 읽은 PDF 쪽 수 합. 칸이 없는 DB 면 건수 × 1 로 센다 */
export async function researchPagesUsed(userId: string): Promise<number> {
  const w = await queryOne<{ s: string }>(
    `SELECT GREATEST(starts_at, now() - interval '30 days')::text AS s FROM entitlements
      WHERE user_id = $1 AND kind = 'track' AND status = 'active' AND starts_at <= now() AND ends_at > now()
      ORDER BY starts_at LIMIT 1`, [userId]).catch(() => null);
  const from = w?.s ?? new Date(Date.now() - 30 * 86_400_000).toISOString();
  const r = await query<{ n: number }>(
    `SELECT coalesce(sum(coalesce(pages, 1)), 0)::int AS n FROM research_docs WHERE user_id = $1 AND created_at >= $2`,
    [userId, from]).catch(async () => query<{ n: number }>(
    `SELECT count(*)::int AS n FROM research_docs WHERE user_id = $1 AND created_at >= $2`, [userId, from]).catch(() => []));
  return r[0]?.n ?? 0;
}

/**
 * 연구자 플랜의 공고 묶음: 연구소 · 기업 연구소 · 박사급 · 대학원 · 연구실(`jobs/meta.ts` 의 RESEARCH_SQL).
 * 마감이 지난 공고 · 제목 없는 공고는 뺀다. 마감이 가까운 차례
 */
export async function researchJobs(limit = 30): Promise<import("@/lib/assistant/match").MatchedPosting[]> {
  const { RESEARCH_SQL, LISTED_SQL } = await import("@/lib/jobs/meta");
  const rows = await query<{
    id: string; source: string; source_url: string | null; closes_on: string | null; captured_at: string;
    region_code: string | null; req: string[] | null; role: string | null; title: string | null; category: string | null;
    field: string | null; degree_label: string | null; region_label: string | null; posting_kind: string | null;
  }>(
    `SELECT id::text, source, source_url, closes_on::text, captured_at::text, region_code, raw_requirements AS req,
            role_code AS role, title, category, field, degree_label, region_label, posting_kind
       FROM v3_job_postings
      WHERE ${RESEARCH_SQL} AND ${LISTED_SQL}
        AND coalesce(trim(title), '') <> ''
        AND (closes_on IS NULL OR closes_on >= (now() AT TIME ZONE 'Asia/Seoul')::date)
      ORDER BY closes_on NULLS LAST, captured_at DESC
      LIMIT $1`, [limit]).catch(() => []);
  return rows.map((r) => ({
    id: r.id, source: r.source, source_url: r.source_url, closes_on: r.closes_on, captured_at: r.captured_at,
    region_code: r.region_code, requirements: (r.req ?? []).slice(0, 8), hits: [], tdHits: [], role: r.role,
    title: r.title, category: r.category, field: r.field, degree_label: r.degree_label, region_label: r.region_label,
    posting_kind: r.posting_kind,
  }));
}
