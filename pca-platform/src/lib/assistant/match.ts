import { query } from "@/lib/db";
import { researchTermsOf } from "./research-docs";

/**
 * 내 자료와 겹치는 공고(2026-10-31 대표 지시).
 *
 * 올린 논문 · 발표 자료 · 이력서 · 자기소개서에서 뽑은 낱말(`research_docs.terms`)과
 * 적어 둔 경험의 기술영역을, 모아 둔 공고(`v3_job_postings`)의 요구와 비교해
 * **겹치는 것이 많은 차례**로 세운다.
 *
 * **고르지 않고 보여 준다.** "추천" 이라고 부르지 않고 합격 가능성을 내지 않는다
 * (직업정보제공사업 범위, CLAUDE.md 법적 범위). 무엇이 겹쳤는지를 낱말 그대로
 * 적어서, 왜 이 공고가 위에 왔는지를 사람이 되짚을 수 있게 한다.
 *
 * **기업 이름을 담지 않는 표다.** 화면에 서는 것은 요구 · 마감 · 지역 · 원문
 * 주소이고, 지원은 원문에서 직접 한다.
 *
 * **점수를 만들지 않는다**(설계 원칙 6). 차례는 겹친 개수이고 그 개수를 그대로 적는다.
 */

export type MatchedPosting = {
  id: string;
  source: string;
  source_url: string | null;
  closes_on: string | null;
  captured_at: string;
  region_code: string | null;
  requirements: string[];
  /** 겹친 낱말(자료에서 뽑은 것 그대로) */
  hits: string[];
  /** 겹친 기술영역 코드 */
  tdHits: string[];
};

const STOP = new Set(["연구", "분석", "개발", "경험", "업무", "관련", "이상", "가능", "우대", "research", "analysis", "development"]);

export async function myMatchTerms(userId: string): Promise<{ terms: string[]; roles: string[]; tds: string[] }> {
  const [r, ex] = await Promise.all([
    researchTermsOf(userId),
    query<{ td: string[] }>(`SELECT td_codes AS td FROM v3_experiences WHERE user_id = $1`, [userId]).catch(() => []),
  ]);
  const terms = [...new Set([...r.terms, ...r.roles].map((t) => t.trim()).filter((t) => t.length >= 2 && !STOP.has(t.toLowerCase())))];
  return { terms, roles: r.roles, tds: [...new Set(ex.flatMap((e) => e.td ?? []))] };
}

/** 마감이 지나지 않았고 최근 180일에 모은 공고 가운데 겹치는 것 */
export async function postingsForMe(userId: string, limit = 30): Promise<{
  rows: MatchedPosting[]; terms: string[]; pool: number;
}> {
  const me = await myMatchTerms(userId);
  const pool = await query<{
    id: string; source: string; source_url: string | null; closes_on: string | null; captured_at: string;
    region_code: string | null; raw_requirements: string[]; required_td: Record<string, unknown>;
  }>(
    `SELECT id::text, source, source_url, closes_on::text, captured_at::text, region_code, raw_requirements, required_td
       FROM v3_job_postings
      WHERE captured_at > now() - interval '180 days'
        AND (closes_on IS NULL OR closes_on >= (now() AT TIME ZONE 'Asia/Seoul')::date)
      ORDER BY captured_at DESC LIMIT 3000`, []).catch(() => []);
  if (!me.terms.length && !me.tds.length) return { rows: [], terms: [], pool: pool.length };
  const lower = me.terms.map((t) => [t, t.toLowerCase()] as const);
  const rows: (MatchedPosting & { score: number })[] = [];
  for (const p of pool) {
    const hay = (p.raw_requirements ?? []).join(" \n ").toLowerCase();
    const hits = lower.filter(([, l]) => hay.includes(l)).map(([t]) => t);
    const tdHits = Object.keys(p.required_td ?? {}).filter((k) => me.tds.includes(k));
    const score = hits.length * 2 + tdHits.length;
    if (!score) continue;
    rows.push({
      id: p.id, source: p.source, source_url: p.source_url, closes_on: p.closes_on,
      captured_at: p.captured_at, region_code: p.region_code,
      requirements: (p.raw_requirements ?? []).slice(0, 8), hits, tdHits, score,
    });
  }
  rows.sort((a, b) => b.score - a.score
    || (a.closes_on ?? "9999").localeCompare(b.closes_on ?? "9999"));
  return { rows: rows.slice(0, limit).map(({ score: _s, ...r }) => r), terms: me.terms, pool: pool.length };
}
