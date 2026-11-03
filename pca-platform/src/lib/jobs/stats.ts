import { query, queryOne } from "@/lib/db";

/**
 * 공고 통계. **숫자를 만들지 않고 센다.**
 *
 * 세는 것은 둘이다: 그 전공으로 단 공고가 몇 건인가, 그 가운데 각 영역의
 * 일을 묻는 공고가 몇 건인가. 비율은 그 둘의 나눗셈이고 그 밖의 값(인기도 ·
 * 적합도 · 전망)을 만들지 않는다.
 *
 * **적으면 그리지 않는다.** 전공 하나의 공고가 `MIN_TOTAL` 보다 적으면
 * 통계 전체를 세우지 않고, 영역 하나가 `MIN_CELL` 보다 적으면 그 칸은
 * 수를 비운다. 열 건짜리 표의 비율은 한두 건에 크게 흔들리고, 읽는 사람은
 * 그것을 시장으로 읽는다.
 *
 * **출처와 기준일을 늘 함께 돌려준다.** 화면이 그 둘 없이 숫자만 그리지
 * 못하게 하려는 것이다.
 */

export const MIN_TOTAL = 30;
export const MIN_CELL = 5;
export const WINDOW_DAYS = 180;

export type DomainDemand = { domain: string; postings: number | null; share: number | null };

export type Demand =
  | { ready: false; total: number; min: number; sources: string[]; asOf: string | null }
  | {
    ready: true; total: number; sources: string[]; asOf: string; from: string;
    domains: DomainDemand[];
    regions: { region: string; postings: number | null }[];
  };

const SOURCE_KO: Record<string, string> = { work24: "고용24", csv: "직접 가져온 공고" };
export const sourceKo = (s: string) => SOURCE_KO[s] ?? s;

export async function demandOf(core: string, opts: { region?: string | null } = {}): Promise<Demand> {
  const params: unknown[] = [core, WINDOW_DAYS];
  let where = `core_code = $1 AND COALESCE(posted_on, captured_at::date) >= current_date - $2::int`;
  if (opts.region) { params.push(opts.region); where += ` AND region_code = $3`; }
  const head = await queryOne<{ n: number; sources: string[] | null; as_of: string | null; from_d: string | null }>(
    `SELECT count(*)::int AS n, array_agg(DISTINCT source) AS sources,
            max(captured_at)::date::text AS as_of,
            min(COALESCE(posted_on, captured_at::date))::text AS from_d
       FROM v3_job_postings WHERE ${where}`, params);
  const total = head?.n ?? 0;
  const sources = (head?.sources ?? []).filter(Boolean).map(sourceKo);
  if (total < MIN_TOTAL) return { ready: false, total, min: MIN_TOTAL, sources, asOf: head?.as_of ?? null };

  const rows = await query<{ domain: string; n: number }>(
    `SELECT k AS domain, count(*)::int AS n
       FROM v3_job_postings, jsonb_object_keys(required_td) AS k
      WHERE ${where} GROUP BY k ORDER BY n DESC`, params);
  const domains = rows.map((r) => r.n >= MIN_CELL
    ? { domain: r.domain, postings: r.n, share: Math.round((r.n / total) * 100) }
    : { domain: r.domain, postings: null, share: null });
  const reg = await query<{ region: string; n: number }>(
    `SELECT COALESCE(region_code, '') AS region, count(*)::int AS n
       FROM v3_job_postings WHERE ${where} GROUP BY 1 ORDER BY n DESC`, params);
  return {
    ready: true, total, sources, asOf: head!.as_of!, from: head!.from_d!,
    domains,
    regions: reg.map((r) => ({ region: r.region, postings: r.n >= MIN_CELL ? r.n : null })),
  };
}
