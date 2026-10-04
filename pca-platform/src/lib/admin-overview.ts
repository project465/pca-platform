/**
 * 운영사가 아침에 읽는 숫자.
 *
 * **표를 그대로 뱉지 않는다.** B2C · B2B · 제품 · 시장 네 묶음으로 미리
 * 갈라서 내보내고, 화면은 그걸 그리기만 한다. 운영자가 10초 안에 답해야
 * 하는 것이 넷이기 때문이다: 개인 쪽이 도는가 · 기관 쪽이 도는가 ·
 * 제품이 제대로 나가는가 · 어느 시장에서 오는가.
 *
 * 세 가지를 지킨다.
 *
 *   - **여기서 점수를 만들지 않는다.** 전부 개수와 합계다.
 *   - **나눌 바닥이 0 이면 비율을 만들지 않는다.** `null` 로 내보내고
 *     화면이 그 자리를 비운다. 아무도 시작하지 않았는데 0% 를 찍으면
 *     거짓말이다.
 *   - **개인을 가리키는 칸을 만들지 않는다.** 사람 이름도 메일도 담지
 *     않고, 기관별 사람 수는 기관 자기 화면(`insights.ts`)에서 5명 규칙을
 *     거쳐 나간다. 여기 있는 것은 운영사 자기 장부다.
 */
import { query, queryOne } from "@/lib/db";

export const PERIODS = ["7d", "30d", "90d", "all"] as const;
export type Period = (typeof PERIODS)[number];

export function isPeriod(v: string | undefined): v is Period {
  return !!v && (PERIODS as readonly string[]).includes(v);
}

/** 기간을 SQL 조각으로. `all` 이면 조건을 붙이지 않는다. */
function since(p: Period): string | null {
  if (p === "all") return null;
  return { "7d": "7 days", "30d": "30 days", "90d": "90 days" }[p];
}

export type B2C = {
  signups: number;
  purchases: number;
  revenue: number;      // 최소 화폐 단위 합계. 통화는 아래 칸
  currency: string;
  started: number;
  completed: number;
  completion: number | null;
};

export type B2B = {
  orgs_active: number;
  contracts_active: number;
  seats: number;
  seats_used: number;
  completed: number;
  completion: number | null;
};

export type ProductStat = {
  tiers: { label: string; n: number }[];
  majors: { label: string; n: number }[];
  /** 채점은 끝났는데 결과지 판본이 안 남은 응시. **조용히 지나가면 안 되는 수다** */
  report_errors: number;
};

export type MarketStat = {
  sites: { label: string; domain: string; region: string | null; n: number }[];
  targets: { label: string; n: number }[];
};

export type AdminOverview = {
  period: Period;
  b2c: B2C;
  b2b: B2B;
  product: ProductStat;
  market: MarketStat;
};

const n = (v: unknown) => Number(v ?? 0);
function rate(part: number, whole: number): number | null {
  return whole > 0 ? Math.round((part / whole) * 100) : null;
}

export async function adminOverview(period: Period = "30d"): Promise<AdminOverview> {
  const iv = since(period);
  /* 기간 조건을 문자열로 붙이지만 값은 고른 네 가지뿐이라 밖에서 들어온
     글자가 그대로 들어가지 않는다(`isPeriod` 가 먼저 막는다) */
  const w = (col: string) => (iv ? `AND ${col} >= now() - interval '${iv}'` : "");
  const wh = (col: string) => (iv ? `WHERE ${col} >= now() - interval '${iv}'` : "");

  /* ── 개인 ─────────────────────────────────────────────────────── */
  const signups = await queryOne<{ n: string }>(
    `SELECT count(*)::text AS n FROM users u
      WHERE NOT EXISTS (SELECT 1 FROM memberships m WHERE m.user_id = u.id)
        ${w("u.created_at")}`,
  ).catch(() => null);

  const pay = await queryOne<{ n: string; amount: string; currency: string | null }>(
    `SELECT count(*)::text AS n, COALESCE(sum(amount), 0)::text AS amount,
            min(currency) AS currency
       FROM orders WHERE status = 'paid' ${w("paid_at")}`,
  ).catch(() => null);

  const att = await query<{ k: string; n: string }>(
    `SELECT CASE WHEN a.submitted_at IS NOT NULL THEN 'completed' ELSE 'started' END AS k,
            count(*)::text AS n
       FROM attempts a ${wh("a.started_at")}
      GROUP BY 1`,
  ).catch(() => []);
  const byAtt = Object.fromEntries(att.map((r) => [r.k, n(r.n)]));
  const started = n(byAtt.started) + n(byAtt.completed);
  const completed = n(byAtt.completed);

  /* ── 기관 ─────────────────────────────────────────────────────── */
  const b2bRow = await queryOne<{
    orgs: string; contracts: string; seats: string; used: string; done: string;
  }>(
    `SELECT count(DISTINCT c.org_id)::text AS orgs,
            count(DISTINCT c.id)::text AS contracts,
            count(s.id)::text AS seats,
            count(s.id) FILTER (WHERE s.status IN ('started', 'completed'))::text AS used,
            count(s.id) FILTER (WHERE s.status = 'completed')::text AS done
       FROM contracts c LEFT JOIN seats s ON s.contract_id = c.id
      WHERE c.status = 'active'`,
  ).catch(() => null);

  /* ── 제품 ─────────────────────────────────────────────────────── */
  const tiers = await query<{ label: string; n: string }>(
    `SELECT report_level AS label, count(*)::text AS n
       FROM report_snapshots ${wh("generated_at")}
      GROUP BY 1 ORDER BY count(*) DESC`,
  ).catch(() => []);

  const majors = await query<{ label: string; n: string }>(
    `SELECT COALESCE(mj.code, i.instrument_key, '미지정') AS label, count(*)::text AS n
       FROM attempts a
       JOIN test_sessions ts ON ts.id = a.session_id
       JOIN instruments i ON i.id = ts.instrument_id
       LEFT JOIN majors mj ON mj.id = i.major_id
      ${iv ? `WHERE a.started_at >= now() - interval '${iv}'` : ""}
      GROUP BY 1 ORDER BY count(*) DESC LIMIT 8`,
  ).catch(() => []);

  /* 채점이 끝났는데 결과지 판본이 없는 응시. 숫자가 0 이 아니면 사람이 본다 */
  const errs = await queryOne<{ n: string }>(
    `SELECT count(*)::text AS n FROM attempts a
      WHERE a.submitted_at IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM report_snapshots r WHERE r.attempt_id = a.id)
        ${w("a.submitted_at")}`,
  ).catch(() => null);

  /* ── 시장 ─────────────────────────────────────────────────────── */
  const sites = await query<{ label: string; domain: string; region: string | null; n: string }>(
    `SELECT sc.site_id AS label, sc.domain, sc.site_region AS region,
            count(a.id)::text AS n
       FROM site_configs sc
       LEFT JOIN attempts a ON a.site_id = sc.site_id
         ${iv ? `AND a.started_at >= now() - interval '${iv}'` : ""}
      GROUP BY sc.site_id, sc.domain, sc.site_region
      ORDER BY sc.site_id`,
  ).catch(() => []);

  const targets = await query<{ label: string; n: string }>(
    `SELECT COALESCE(target_country, '미지정') AS label, count(*)::text AS n
       FROM attempts ${wh("started_at")}
      GROUP BY 1 ORDER BY count(*) DESC LIMIT 8`,
  ).catch(() => []);

  const seats = n(b2bRow?.seats);
  const used = n(b2bRow?.used);
  const done = n(b2bRow?.done);

  return {
    period,
    b2c: {
      signups: n(signups?.n),
      purchases: n(pay?.n),
      revenue: n(pay?.amount),
      currency: pay?.currency ?? "KRW",
      started,
      completed,
      completion: rate(completed, started),
    },
    b2b: {
      orgs_active: n(b2bRow?.orgs),
      contracts_active: n(b2bRow?.contracts),
      seats,
      seats_used: used,
      completed: done,
      completion: rate(done, used),
    },
    product: {
      tiers: tiers.map((r) => ({ label: r.label, n: n(r.n) })),
      majors: majors.map((r) => ({ label: r.label, n: n(r.n) })),
      report_errors: n(errs?.n),
    },
    market: {
      sites: sites.map((r) => ({
        label: r.label, domain: r.domain, region: r.region, n: n(r.n),
      })),
      targets: targets.map((r) => ({ label: r.label, n: n(r.n) })),
    },
  };
}

/** 기관 목록 위에 얹는 숫자 넷. */
export type OrgSummary = {
  total: number;
  with_active_contract: number;
  types: { label: string; n: number }[];
  countries: { label: string; n: number }[];
};

export async function orgSummary(): Promise<OrgSummary> {
  const row = await queryOne<{ total: string; active: string }>(
    `SELECT count(*)::text AS total,
            count(*) FILTER (
              WHERE EXISTS (SELECT 1 FROM contracts c
                             WHERE c.org_id = o.id AND c.status = 'active'))::text AS active
       FROM organizations o`,
  ).catch(() => null);
  const types = await query<{ label: string; n: string }>(
    `SELECT COALESCE(org_type, '미지정') AS label, count(*)::text AS n
       FROM organizations GROUP BY 1 ORDER BY count(*) DESC`,
  ).catch(() => []);
  const countries = await query<{ label: string; n: string }>(
    `SELECT COALESCE(country, '미지정') AS label, count(*)::text AS n
       FROM organizations GROUP BY 1 ORDER BY count(*) DESC`,
  ).catch(() => []);
  return {
    total: n(row?.total),
    with_active_contract: n(row?.active),
    types: types.map((r) => ({ label: r.label, n: n(r.n) })),
    countries: countries.map((r) => ({ label: r.label, n: n(r.n) })),
  };
}

export type OrgRow = {
  id: string; code: string; name: string; org_type: string | null;
  country: string | null; active_contract: boolean; seats: number;
  users: number; updated: string | null;
};

export async function orgRows(): Promise<OrgRow[]> {
  return query<OrgRow>(
    `SELECT o.id::text, o.code, o.name, o.org_type, o.country,
            EXISTS (SELECT 1 FROM contracts c
                     WHERE c.org_id = o.id AND c.status = 'active') AS active_contract,
            (SELECT count(*) FROM seats s JOIN contracts c2 ON c2.id = s.contract_id
                WHERE c2.org_id = o.id)::int AS seats,
            (SELECT count(*) FROM memberships m WHERE m.org_id = o.id)::int AS users,
            to_char(o.created_at, 'YYYY-MM-DD') AS updated
       FROM organizations o
      ORDER BY active_contract DESC, o.name`,
  ).catch(() => [] as OrgRow[]);
}
