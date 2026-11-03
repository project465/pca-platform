import { createHash } from "node:crypto";
import { query, queryOne } from "./db";

/**
 * MAT 수익화 수치(2026-11-03 대표 결정 "수치: 운영자 화면, 개인 정보 없이 집계만").
 *
 * `funnel.ts` 는 옛 결과지 판매 흐름(방문 → 가격표 → 응시)을 센다. V3 검사 · MAT · 가입은 거기 한 줄도
 * 쌓이지 않았다. 그래서 MAT 의 걸음을 따로 센다. **표가 사람을 모른다**: 같은 사람을 두 번 세지 않으려고
 * 사람 번호의 열쇠 해시만 둔다(`subjectOf`). 화면은 날짜 · 걸음 · 유입 경로별 수만 보인다.
 *
 * **던지지 않는다.** 수치 한 줄 때문에 가입이나 결제가 되돌아가면 안 된다.
 */
export const MAT_STEPS = [
  "signup",              // 가입했다
  "assessment_complete", // V3 검사를 마쳤다(제출 · 채점)
  "mat_open",            // MAT 홈을 열었다
  "free_analysis_used",  // 무료 공고 분석을 썼다
  "checkout_start",      // 결제 화면에서 결제를 눌렀다
  "purchase",            // 결제가 확정됐다(첫 결제 · 1회 결제)
  "renewal",             // 자동 결제가 됐다
  "cancel",              // 해지했다(정기결제) · 대행사 쪽에서 취소됐다
  "payment_failed",      // 자동 결제가 실패했다
] as const;
export type MatStep = (typeof MAT_STEPS)[number];

export const MAT_SOURCES = ["jobindustry", "careerpeak", "school", "direct"] as const;
export type MatSource = (typeof MAT_SOURCES)[number];

export const MAT_STEP_KO: Record<MatStep, string> = {
  signup: "가입",
  assessment_complete: "검사 완료",
  mat_open: "MAT 열기",
  free_analysis_used: "무료 분석",
  checkout_start: "결제 시작",
  purchase: "결제",
  renewal: "자동 결제",
  cancel: "해지 · 취소",
  payment_failed: "결제 실패",
};
export const MAT_SOURCE_KO: Record<MatSource, string> = {
  jobindustry: "잡인더스트리", careerpeak: "커리어피크", school: "학교 · 기관", direct: "직접",
};

export function isMatSource(x: unknown): x is MatSource {
  return typeof x === "string" && (MAT_SOURCES as readonly string[]).includes(x);
}

function secret(): string {
  return process.env.AUTH_SECRET || "cm-funnel-dev";
}

/** 사람 번호 → 16자 열쇠 해시. 같은 사람은 늘 같은 값이고, 값에서 사람을 되찾을 수 없다 */
export function subjectOf(userId: string): string {
  return createHash("sha256").update(`${secret()}:${userId}`).digest("hex").slice(0, 16);
}

/**
 * 이 사람이 어디서 왔나. 차례가 곧 규칙이다.
 *   1. 가입 때 적은 유입(`user_attribution`, 잡인더스트리 공고 입구 등)
 *   2. 학교 · 기관 계정(`campus_students`)
 *   3. 제휴 입구 쿠키로 적힌 것(`brand_touches`)
 *   4. 그 밖은 직접
 */
export async function sourceOf(userId: string): Promise<MatSource> {
  const a = await queryOne<{ source: string }>(
    `SELECT source FROM user_attribution WHERE user_id = $1`, [userId]).catch(() => null);
  if (isMatSource(a?.source)) return a!.source as MatSource;
  const c = await queryOne<{ ok: boolean }>(
    `SELECT true AS ok FROM campus_students WHERE user_id = $1 LIMIT 1`, [userId]).catch(() => null);
  if (c?.ok) return "school";
  const b = await queryOne<{ brand: string }>(
    `SELECT brand FROM brand_touches WHERE user_id = $1 AND brand <> 'www' ORDER BY first_seen_at LIMIT 1`, [userId],
  ).catch(() => null);
  if (b?.brand === "jobindustry" || b?.brand === "careerpeak") return b.brand;
  return "direct";
}

/** 그 사람이 들어온 잡인더스트리 공고 idx. 없으면 빈 글자 */
async function postingOf(userId: string): Promise<string> {
  const a = await queryOne<{ idx: string | null }>(
    `SELECT posting_idx AS idx FROM user_attribution WHERE user_id = $1`, [userId]).catch(() => null);
  return a?.idx && /^\d{1,12}$/.test(a.idx) ? a.idx : "";
}

/** 한 걸음을 센다. 같은 날 같은 사람 같은 걸음은 한 번이다 */
export async function matStep(
  step: MatStep, userId: string | null | undefined,
  opts: { source?: MatSource; postingIdx?: string | null } = {},
): Promise<void> {
  if (!userId) return;
  try {
    const source = opts.source ?? await sourceOf(userId);
    const idx = opts.postingIdx && /^\d{1,12}$/.test(opts.postingIdx) ? opts.postingIdx : await postingOf(userId);
    /* 시연 계정은 세지 않는다(전환율에 섞지 않는다) */
    const demo = await queryOne<{ d: boolean }>(`SELECT is_demo AS d FROM users WHERE id = $1`, [userId]).catch(() => null);
    if (demo?.d && process.env.MAT_FUNNEL_DEMO !== "1") return;
    await query(
      `INSERT INTO mat_funnel_events (step, source, posting_idx, subject) VALUES ($1,$2,$3,$4)
       ON CONFLICT (day, step, subject, posting_idx) DO NOTHING`,
      [step, source, idx, subjectOf(userId)],
    );
  } catch {
    /* 비워 둔다 */
  }
}

/**
 * 검사 완료는 **채점된 응시에서 옮겨 센다.** 검사 화면 · 채점 코드는 동결이라 거기서 적지 않는다.
 * 운영 당번(ops tick)과 운영자 화면이 부른다. 같은 응시는 한 번만 들어간다(날짜 · 사람으로 겹치면 접는다)
 */
export async function syncAssessmentComplete(days = 40): Promise<number> {
  const rows = await query<{ user_id: string; day: string }>(
    `SELECT a.user_id::text, ((a.submitted_at AT TIME ZONE 'Asia/Seoul')::date)::text AS day
       FROM v3_attempts a JOIN users u ON u.id = a.user_id
      WHERE a.status = 'scored' AND a.submitted_at > now() - ($1 || ' days')::interval
        AND (NOT u.is_demo OR $2::boolean)`,
    [String(days), process.env.MAT_FUNNEL_DEMO === "1"],
  ).catch(() => []);
  let n = 0;
  for (const r of rows) {
    const source = await sourceOf(r.user_id);
    const ins = await query(
      `INSERT INTO mat_funnel_events (day, step, source, posting_idx, subject)
       VALUES ($1::date, 'assessment_complete', $2, $3, $4)
       ON CONFLICT (day, step, subject, posting_idx) DO NOTHING RETURNING id`,
      [r.day, source, await postingOf(r.user_id), subjectOf(r.user_id)],
    ).catch(() => []);
    n += ins.length;
  }
  return n;
}

/**
 * 분석 한 번에 붙은 근거 수를 남긴다. **사람을 적지 않는다.** 검사 전 · 후로만 가른다.
 * 화면에 비율이나 "더 정확하다" 같은 말을 내지 않는다(표시광고법). 수만 쌓는다
 */
export async function recordEvidenceCount(row: {
  withAssessment: boolean; items: { evidence: string[]; status: string }[]; by: string;
}): Promise<void> {
  const backed = row.items.filter((i) => i.evidence.length > 0 || i.status === "ready").length;
  const ev = row.items.reduce((n, i) => n + i.evidence.length, 0);
  await query(
    `INSERT INTO mat_evidence_counts (with_assessment, backed_items, evidence_items, requirement_items, analyzed_by)
     VALUES ($1,$2,$3,$4,$5)`,
    [row.withAssessment, backed, ev, row.items.length, row.by === "claude" ? "claude" : "rules"],
  ).catch(() => undefined);
}

export type MatFunnelReport = {
  days: number;
  /** 날짜(최근 먼저) → 걸음 → 유입 → 사람 수 */
  byDay: { day: string; counts: Record<MatStep, Record<MatSource, number>> }[];
  /** 기간 합계: 걸음 → 유입 → 사람 수(같은 사람이 다른 날 다시 와도 한 번) */
  total: Record<MatStep, Record<MatSource, number>>;
  /** 잡인더스트리 공고 idx 별 걸음 수(많은 차례 20개) */
  postings: { idx: string; counts: Partial<Record<MatStep, number>> }[];
  /** 분석 근거 수: 검사 전 · 후 */
  evidence: { withAssessment: boolean; analyses: number; backedItems: number; evidenceItems: number; requirementItems: number }[];
};

function blank(): Record<MatStep, Record<MatSource, number>> {
  const o = {} as Record<MatStep, Record<MatSource, number>>;
  for (const s of MAT_STEPS) {
    o[s] = {} as Record<MatSource, number>;
    for (const k of MAT_SOURCES) o[s][k] = 0;
  }
  return o;
}

export async function matFunnelReport(days = 14): Promise<MatFunnelReport> {
  const d = Math.max(1, Math.min(365, Math.round(days)));
  const rows = await query<{ day: string; step: string; source: string; n: number }>(
    `SELECT day::text, step, source, count(DISTINCT subject)::int AS n FROM mat_funnel_events
      WHERE day > ((now() AT TIME ZONE 'Asia/Seoul')::date - $1::int)
      GROUP BY day, step, source ORDER BY day DESC`, [d]).catch(() => []);
  const tot = await query<{ step: string; source: string; n: number }>(
    `SELECT step, source, count(DISTINCT subject)::int AS n FROM mat_funnel_events
      WHERE day > ((now() AT TIME ZONE 'Asia/Seoul')::date - $1::int)
      GROUP BY step, source`, [d]).catch(() => []);
  const post = await query<{ idx: string; step: string; n: number }>(
    `SELECT posting_idx AS idx, step, count(DISTINCT subject)::int AS n FROM mat_funnel_events
      WHERE posting_idx <> '' AND day > ((now() AT TIME ZONE 'Asia/Seoul')::date - $1::int)
      GROUP BY posting_idx, step`, [d]).catch(() => []);
  const ev = await query<{ w: boolean; a: number; b: number; e: number; r: number }>(
    `SELECT with_assessment AS w, count(*)::int AS a, coalesce(sum(backed_items),0)::int AS b,
            coalesce(sum(evidence_items),0)::int AS e, coalesce(sum(requirement_items),0)::int AS r
       FROM mat_evidence_counts WHERE day > ((now() AT TIME ZONE 'Asia/Seoul')::date - $1::int)
      GROUP BY with_assessment ORDER BY with_assessment`, [d]).catch(() => []);

  const days0 = new Map<string, Record<MatStep, Record<MatSource, number>>>();
  for (const r of rows) {
    if (!(MAT_STEPS as readonly string[]).includes(r.step) || !isMatSource(r.source)) continue;
    const c = days0.get(r.day) ?? blank();
    c[r.step as MatStep][r.source] = r.n;
    days0.set(r.day, c);
  }
  const total = blank();
  for (const r of tot) {
    if ((MAT_STEPS as readonly string[]).includes(r.step) && isMatSource(r.source)) total[r.step as MatStep][r.source] = r.n;
  }
  const pm = new Map<string, Partial<Record<MatStep, number>>>();
  for (const r of post) {
    const c = pm.get(r.idx) ?? {};
    c[r.step as MatStep] = r.n;
    pm.set(r.idx, c);
  }
  const postings = [...pm.entries()]
    .map(([idx, counts]) => ({ idx, counts }))
    .sort((a, b) => Object.values(b.counts).reduce((x, y) => x + (y ?? 0), 0) - Object.values(a.counts).reduce((x, y) => x + (y ?? 0), 0))
    .slice(0, 20);
  return {
    days: d,
    byDay: [...days0.entries()].map(([day, counts]) => ({ day, counts })),
    total, postings,
    evidence: ev.map((r) => ({ withAssessment: r.w, analyses: r.a, backedItems: r.b, evidenceItems: r.e, requirementItems: r.r })),
  };
}
