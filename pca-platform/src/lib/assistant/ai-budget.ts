import type { PoolClient } from "pg";
import { query, queryOne } from "@/lib/db";

/**
 * MAT 이 Claude 를 부르기 전에 보는 두 가지 상한과, 부른 뒤 남기는 한 줄(2026-11-02 대표 결정:
 * 9,900원 그대로, 기간권 한 장의 최악 원가를 묶는다).
 *
 * 1. **서버 하루 총액**: 오늘(한국 시각) 합이 `MAT_AI_DAILY_USD`(기본 20달러)를 넘으면 그날은
 *    부르지 않는다. 부르는 쪽은 규칙으로 읽는다. 화면이 깨지지 않는다
 * 2. **기간권 한 장의 기능별 횟수**(2026-11-02 대표 "1로 진행해"): 30일 기준 공고 맞춰 보기 20 ·
 *    지원서 문장 10 · 면접 연습 3번(번마다 8턴, 턴으로 24) · 파일 10. 대표 표에 없는 기능은 원가를
 *    묶으려고 따로 둔다: 메모 초안 10 · 자료 10 · 자유 질문 40. 기간이 길면 30일마다 같은 만큼
 *    더한다(90일권은 3배, 학교 좌석도 같은 셈). 기간권이 없으면(무료 체험) 최근 30일을 한 칸으로 센다
 *
 * **표가 없으면 막지 않는다**(`schema_ai_usage.sql` 을 올리기 전). 세지 못한 것을 넘은 것으로
 * 보지 않는다. 열쇠를 넣기 전에 표를 먼저 세운다.
 */

/** 횟수를 세는 칸. `op` 이름(`claude.ts`)이 곧 칸이다 */
export const AI_OPS = {
  posting: "assistant.posting",
  draft: "assistant.draft",
  upload: "assistant.upload",
  research: "assistant.research",
  sentence: "mat.ask.draft",
  interview: "mat.ask.interview",
  ask: "mat.ask.free",
} as const;
export type AiOp = keyof typeof AI_OPS;

/** 30일 한 칸의 횟수 */
export const PASS_CAPS: Record<AiOp, number> = {
  posting: 20, sentence: 10, interview: 24, upload: 10, draft: 10, research: 10, ask: 40,
};

/**
 * **추가 이용권 한 장이 더하는 횟수**(4,900원, 2026-11-02 대표). 공고 10 · 문장 5 · 면접 1번(8턴) · 파일 5.
 * 표에 없는 칸(메모 초안 · 자료 · 자유 질문)은 더하지 않는다
 */
export const REFILL_ADDS: Partial<Record<AiOp, number>> = { posting: 10, sentence: 5, interview: 8, upload: 5 };
export const REFILL_PRODUCT = "MAT_REFILL";

/** 버튼 글자. 'AI' 를 쓰지 않는다 */
export const REFILL_LABEL = "모두 다시 채우기 · 4,900원";
export const REFILL_HREF = `/checkout?product=${REFILL_PRODUCT}`;

/** 추가 이용권을 살 수 있는가: 개인 이용권을 쓰는 중이어야 한다(학교 좌석에는 팔지 않는다) */
export async function canBuyRefill(userId: string): Promise<boolean> {
  const { activeTrack } = await import("@/lib/track");
  const st = await activeTrack(userId);
  return st.on && st.source?.kind === "personal";
}

/** 지금 살아 있는 추가 이용권 수. 표가 없으면 0 */
export async function activeRefills(userId: string): Promise<number> {
  const r = await queryOne<{ n: number }>(
    `SELECT count(*)::int AS n FROM mat_refills WHERE user_id = $1 AND status = 'active' AND ends_at > now()`,
    [userId]).catch(() => null);
  return r?.n ?? 0;
}

/**
 * 결제를 확정하는 거래 안에서 추가 이용권 한 줄을 세운다(`settlePayment`).
 * **끝나는 날은 지금 쓰는 개인 기간권의 끝**이다(기간은 늘지 않는다). 그 사이 기간권이 끝났으면
 * 지금으로 적어 쓸 수 없는 줄이 되고, 운영자가 환불한다(`refund.ts` 가 7일 안 전액)
 */
export async function grantRefillTx(c: PoolClient, o: { userId: string; orderId: string }): Promise<string | null> {
  const r = await c.query<{ ends_at: string }>(
    `INSERT INTO mat_refills (user_id, order_id, ends_at)
     SELECT $1, $2, COALESCE((
       SELECT e.ends_at FROM entitlements e
        WHERE e.user_id = $1 AND e.kind = 'track' AND e.status = 'active'
          AND e.campus_pool_id IS NULL AND e.starts_at <= now() AND e.ends_at > now()
        ORDER BY e.starts_at LIMIT 1), now())
     ON CONFLICT (order_id) DO NOTHING
     RETURNING ends_at::text`, [o.userId, o.orderId]);
  return r.rows[0]?.ends_at ?? null;
}

/**
 * 추가 이용권으로 더한 횟수를 이미 쓰기 시작했는가. 어느 칸이든 기간권 몫을 넘겨 썼으면 그렇다.
 * 환불 판단에 쓴다: 쓰기 전이면 7일 안 전액, 쓰기 시작했으면 환불하지 않는다
 */
export async function refillTouched(userId: string): Promise<boolean> {
  const w = await windowOf(userId);
  for (const g of Object.keys(REFILL_ADDS) as AiOp[]) {
    const r = await queryOne<{ n: number }>(
      `SELECT count(*)::int AS n FROM assistant_ai_calls
        WHERE user_id = $1 AND op LIKE $2 AND outcome = 'ok' AND created_at >= $3`,
      [userId, `${AI_OPS[g]}%`, w.from]).catch(() => null);
    if ((r?.n ?? 0) > PASS_CAPS[g] * w.units) return true;
  }
  return false;
}

/** `op` 이름 → 칸. 브리핑(`mat.brief`)처럼 칸이 없는 기능은 세지 않는다(하루 총액만 본다) */
export function opGroup(op: string): AiOp | null {
  for (const [k, prefix] of Object.entries(AI_OPS) as [AiOp, string][]) {
    if (op === prefix || op.startsWith(`${prefix}.`)) return k;
  }
  return null;
}

/** 단가(달러 / 백만 토큰). 캐시 쓰기는 입력의 1.25배(5분짜리), 캐시 읽기는 0.2 */
const PRICES: Record<string, { input: number; output: number; cacheRead: number; cacheWrite: number }> = {
  "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 },
  "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 },
};

export type AiUsage = { input: number; output: number; cacheRead: number; cacheWrite: number };

/** 모르는 모델은 비싼 쪽(Opus) 값으로 센다: 덜 세는 쪽으로 틀리지 않게 */
export function costUsd(u: AiUsage, model = "claude-opus-5-5"): number {
  const p = PRICES[model] ?? PRICES["claude-opus-5-5"];
  return (u.input * p.input + u.output * p.output + u.cacheRead * p.cacheRead + u.cacheWrite * p.cacheWrite) / 1_000_000;
}

export function dailyLimitUsd(): number {
  const v = Number(process.env.MAT_AI_DAILY_USD);
  return Number.isFinite(v) && v > 0 ? v : 20;
}

/** 오늘(한국 시각) 쓴 총액. 표가 없으면 0 */
export async function spentTodayUsd(): Promise<number> {
  const r = await queryOne<{ usd: string | null }>(
    `SELECT sum(cost_usd)::text AS usd FROM assistant_ai_calls
      WHERE created_at >= (date_trunc('day', now() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul')`,
  ).catch(() => null);
  return Number(r?.usd ?? 0) || 0;
}

/** 지금 기간권 한 칸: 시작 · 끝 · 30일 몇 칸인가. 없으면 최근 30일 한 칸 */
async function windowOf(userId: string): Promise<{ from: Date; to: Date; units: number }> {
  const r = await queryOne<{ s: Date; e: Date }>(
    `SELECT starts_at AS s, ends_at AS e FROM entitlements
      WHERE user_id = $1 AND kind = 'track' AND status = 'active' AND starts_at <= now() AND ends_at > now()
      ORDER BY starts_at LIMIT 1`, [userId],
  ).catch(() => null);
  if (!r) {
    const to = new Date();
    return { from: new Date(to.getTime() - 30 * 86_400_000), to: new Date(to.getTime() + 30 * 86_400_000), units: 1 };
  }
  const days = (new Date(r.e).getTime() - new Date(r.s).getTime()) / 86_400_000;
  return { from: new Date(r.s), to: new Date(r.e), units: Math.max(1, Math.round(days / 30)) };
}

export type Allowance =
  | { ok: true }
  | { ok: false; why: "day" }
  | { ok: false; why: "cap"; reopen: string };

/** 이 사람이 지금 이 기능으로 한 번 더 부를 수 있는가 */
export async function aiAllowance(userId: string | undefined, op: string): Promise<Allowance> {
  if (await spentTodayUsd() >= dailyLimitUsd()) return { ok: false, why: "day" };
  const g = opGroup(op);
  if (!userId || !g) return { ok: true };
  const w = await windowOf(userId);
  const r = await queryOne<{ n: number }>(
    `SELECT count(*)::int AS n FROM assistant_ai_calls
      WHERE user_id = $1 AND op LIKE $2 AND outcome = 'ok' AND created_at >= $3`,
    [userId, `${AI_OPS[g]}%`, w.from],
  ).catch(() => null);
  if (!r) return { ok: true };
  const extra = (REFILL_ADDS[g] ?? 0) * (await activeRefills(userId));
  if (r.n < PASS_CAPS[g] * w.units + extra) return { ok: true };
  return { ok: false, why: "cap", reopen: w.to.toISOString() };
}

/** 부른 뒤 한 줄. 글은 적지 않는다. 표가 없으면 조용히 넘어간다 */
export async function recordAiCall(row: {
  userId?: string; op: string; model: string; effort: string; outcome: string; usage?: AiUsage;
}): Promise<void> {
  const u = row.usage ?? { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
  await query(
    `INSERT INTO assistant_ai_calls (user_id, op, model, effort, outcome, input_tokens, output_tokens,
       cache_read_tokens, cache_write_tokens, cost_usd)
     VALUES ($1::bigint, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [row.userId ?? null, row.op, row.model, row.effort, row.outcome, u.input, u.output, u.cacheRead, u.cacheWrite,
      costUsd(u, row.model).toFixed(6)],
  ).catch(() => undefined);
}

/** 상한에 닿았을 때 화면 한 줄. 'AI' · '토큰' 같은 말을 쓰지 않는다 */
export function capLine(reopenIso: string, lang: "ko" | "en" = "ko"): string {
  const d = new Date(reopenIso);
  const kst = new Date(d.getTime() + 9 * 3_600_000);
  return lang === "en"
    ? `You've used this period's uses. They open again on ${kst.toISOString().slice(0, 10)}.`
    : `이번 기간 횟수를 다 썼어요. ${kst.getUTCMonth() + 1}월 ${kst.getUTCDate()}일에 다시 열려요.`;
}
