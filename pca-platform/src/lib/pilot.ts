/**
 * 통제 파일럿 20~50명.
 *
 * **만족도만 재지 않는다**(규격 §20 마지막 줄). "좋았다" 는 값을 재면
 * 거의 전부 좋았다고 답하고, 그 답으로는 고칠 자리를 고를 수 없다. 묻는
 * 것은 이해했는가 · 다음에 무엇을 하겠는가 · 얼마면 내겠는가다.
 *
 * **문항을 고쳐 쓰지 않았다.** 받은 규격 §20 의 열 문항 그대로다
 * (`pilot_items` 시드). 물음을 바꾸면 다른 것을 재게 되고, 그러면 파일럿
 * 결과를 규격과 견줄 수 없다.
 *
 * **점수를 만들지 않는다.** 여기서 나오는 것은 응답과 분포이고, 이 값은
 * 적합도에 한 점도 들어가지 않는다(`survey.ts` 와 같은 규칙).
 */
import { query, queryOne } from "./db";

export type PilotItem = {
  code: string;
  orderNo: number;
  kind: "scale" | "text";
  text: string;
  /** 무엇을 재는 칸인가. 덮임을 세는 자리가 이 값을 읽는다 */
  topic: string | null;
  cohort: "all" | "paid";
};

/**
 * 이번 파일럿이 **반드시 받아 와야 하는 여덟 가지.**
 *
 * 코드 이름이 아니라 칸 이름(`pilot_items.topic`)으로 적는다. 문항을 하나
 * 더 넣거나 문면을 다듬어도 그 칸이 비지 않으면 덮인 것이고, 그 판단을
 * `npm run pilot:check` 가 한다. **묻는 것을 코드가 짐작하지 않는다.**
 */
export const REQUIRED_TOPICS: { topic: string; what: string }[] = [
  { topic: "fit", what: "결과가 본인과 맞는지" },
  { topic: "why", what: "왜 그 직무가 나왔는지 이해했는지" },
  { topic: "newrole", what: "새롭게 알게 된 직무가 있는지" },
  { topic: "gap_clear", what: "부족한 근거가 무엇인지 이해했는지" },
  { topic: "doable", what: "다음 행동이 실제로 실행 가능한지" },
  { topic: "tier_value", what: "무료와 유료 결과의 가치 차이가 느껴지는지" },
  { topic: "wording", what: "결과에서 이해하기 어려운 표현" },
  { topic: "changed", what: "결과를 받고 진로 판단이 달라졌는지" },
];

/**
 * 무엇을 보여 드릴까.
 *
 * **받은 적 없는 것을 견주게 하지 않는다.** 유료 구간이 열리지 않은
 * 응시에는 `cohort='paid'` 문항을 띄우지 않는다. 등급은 화면이 짐작하지
 * 않고 `reportLevel()` 하나가 정한다(설계 원칙 10).
 */
export async function items(
  lang = "ko", opts: { paid?: boolean } = {},
): Promise<PilotItem[]> {
  const rows = await query<{
    code: string; order_no: number; kind: string; ko: string; en: string;
    topic: string | null; cohort: string;
  }>(
    `SELECT code, order_no, kind, ko, en, topic, cohort FROM pilot_items
      WHERE active AND (cohort = 'all' OR $1::boolean)
      ORDER BY order_no`,
    [opts.paid === true],
  ).catch(() => []);
  return rows.map((r) => ({
    code: r.code, orderNo: r.order_no, kind: r.kind as "scale" | "text",
    text: lang === "en" ? r.en : r.ko,
    topic: r.topic, cohort: r.cohort === "paid" ? "paid" : "all",
  }));
}

/** 여덟 가지가 실제로 물어지는가. 비어 있으면 그 칸 이름을 돌려준다 */
export async function uncovered(): Promise<string[]> {
  const all = await items("ko", { paid: true });
  const have = new Set(all.map((i) => i.topic).filter(Boolean) as string[]);
  return REQUIRED_TOPICS.filter((r) => !have.has(r.topic)).map((r) => r.what);
}

/** 이 응시로 이미 답했는가 */
export async function done(attemptId: string): Promise<boolean> {
  const r = await queryOne<{ n: number }>(
    `SELECT count(*)::int AS n FROM pilot_feedback WHERE attempt_id = $1`,
    [attemptId],
  ).catch(() => null);
  return (r?.n ?? 0) > 0;
}

/**
 * 답을 적는다.
 *
 * **비운 칸을 적지 않는다.** 안 적으신 것과 "없다" 고 적으신 것은 다른
 * 상태이고, 빈 문자열로 넣어 두면 분포에서 둘이 섞인다.
 *
 * **자유입력 길이를 자른다.** 긴 글이 들어올 자리가 아니고, 길면 그
 * 자체가 개인 서술이 되기 쉽다.
 */
export async function save(opts: {
  attemptId: string;
  userId: string;
  answers: { code: string; value?: number | null; text?: string | null }[];
}): Promise<number> {
  let n = 0;
  for (const a of opts.answers) {
    const v = typeof a.value === "number" && a.value >= 1 && a.value <= 5 ? a.value : null;
    const t = (a.text ?? "").trim().slice(0, 600) || null;
    if (v === null && t === null) continue;
    await query(
      `INSERT INTO pilot_feedback (attempt_id, user_id, item_code, value, text)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (attempt_id, item_code) DO UPDATE
         SET value = EXCLUDED.value, text = EXCLUDED.text, answered_at = now()`,
      [opts.attemptId, opts.userId, a.code, v, t],
    ).catch(() => null);
    n++;
  }
  return n;
}

export type ScaleRow = { code: string; text: string; topic: string | null;
  n: number; avg: number | null };
export type TextRow = { code: string; text: string; topic: string | null;
  n: number; answers: string[] };

export type PilotSummary = {
  /** 끝까지 답한 사람 수 */
  people: number;
  /** 목표. 스물 명 전에 유료 광고를 돌리지 않는다(규격 §27) */
  target: number;
  scales: ScaleRow[];
  texts: TextRow[];
  /** 응시를 끝낸 사람 가운데 몇 명이 답했는가 */
  ofCompleted: number | null;
  /** 끝내는 데 걸린 시간의 가운데값 (분) */
  medianMinutes: number | null;
  /** 시작했고 안 끝낸 사람 */
  abandoned: number;
};

/** 5명 미만 칸은 숫자를 내지 않는다. 기관 집계와 같은 규칙이다 */
export const MIN_CELL = 5;
const TARGET = 20;

export async function summary(lang = "ko"): Promise<PilotSummary> {
  /* 집계에서는 유료 전용 문항까지 전부 본다. 안 물어본 사람의
     빈칸은 0명으로 세어지고, 그 사실이 곧 자료다 */
  const all = await items(lang, { paid: true });
  const people = (await queryOne<{ n: number }>(
    `SELECT count(DISTINCT attempt_id)::int AS n FROM pilot_feedback`,
  ).catch(() => null))?.n ?? 0;

  const scaleRows = await query<{ item_code: string; n: number; avg: string | null }>(
    `SELECT item_code, count(*)::int AS n, avg(value)::text AS avg
       FROM pilot_feedback WHERE value IS NOT NULL
      GROUP BY item_code`,
  ).catch(() => []);

  const textRows = await query<{ item_code: string; n: number }>(
    `SELECT item_code, count(*)::int AS n
       FROM pilot_feedback WHERE text IS NOT NULL
      GROUP BY item_code`,
  ).catch(() => []);

  /* 자유입력은 **5명이 넘을 때만** 내놓는다. 네 줄짜리 표에서는 그 글이
     누구 것인지 짐작이 되고, 그러면 익명이 아니다 */
  const texts: TextRow[] = [];
  for (const it of all.filter((x) => x.kind === "text")) {
    const n = textRows.find((t) => t.item_code === it.code)?.n ?? 0;
    const answers = n >= MIN_CELL
      ? (await query<{ text: string }>(
        `SELECT text FROM pilot_feedback
          WHERE item_code = $1 AND text IS NOT NULL
          ORDER BY answered_at DESC LIMIT 50`,
        [it.code],
      ).catch(() => [])).map((r) => r.text)
      : [];
    texts.push({ code: it.code, text: it.text, topic: it.topic, n, answers });
  }

  const flow = await queryOne<{ completed: number; started: number; med: string | null }>(
    `SELECT count(*) FILTER (WHERE submitted_at IS NOT NULL)::int AS completed,
            count(*)::int AS started,
            percentile_cont(0.5) WITHIN GROUP (
              ORDER BY extract(epoch FROM submitted_at - started_at) / 60
            ) FILTER (WHERE submitted_at IS NOT NULL)::text AS med
       FROM attempts WHERE assessment_version = 'ME_V2'`,
  ).catch(() => null);

  return {
    people, target: TARGET,
    scales: all.filter((x) => x.kind === "scale").map((it) => {
      const r = scaleRows.find((s) => s.item_code === it.code);
      return {
        code: it.code, text: it.text, topic: it.topic, n: r?.n ?? 0,
        /* 5명 미만은 평균을 내지 않는다 */
        avg: r && r.n >= MIN_CELL && r.avg
          ? Math.round(Number(r.avg) * 10) / 10 : null,
      };
    }),
    texts,
    ofCompleted: flow?.completed ? people / flow.completed : null,
    medianMinutes: flow?.med ? Math.round(Number(flow.med)) : null,
    abandoned: Math.max(0, (flow?.started ?? 0) - (flow?.completed ?? 0)),
  };
}
