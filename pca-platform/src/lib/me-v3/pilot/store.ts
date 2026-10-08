/**
 * 본 파일럿이 보는 것.
 *
 * 재는 자리를 **응시 화면 밖에 둔다.** 화면은 `ME_V3_ASSESSMENT_UI_V1` 로
 * 굳혀 두었고, 블록마다 걸린 시간은 `v3_responses.answered_at` 에 이미
 * 찍혀 있다. 재려고 화면에 코드를 심으면 재는 행위가 재려는 것을 바꾸고,
 * 동결 기록에는 `응시 화면이 바뀌었다` 가 남는다.
 *
 * **작은 칸을 평균으로 내놓지 않는다.** 스무 명짜리 파일럿에서 `박사 ·
 * 재료공학 · PRO` 는 한둘이고, 그 칸의 평균은 그 사람의 답이다. 다섯 명
 * 미만인 칸은 수를 세어 주고 평균은 돌려주지 않는다.
 */
import { query, queryOne } from "@/lib/db";

/** 다섯 명 미만인 칸은 평균을 내지 않는다 */
export const MIN_CELL = 5;

export type Participant = {
  id: string;
  code: string;
  cohort: string;
  wave: number;
  education_stage: string;
  major_field: string | null;
  current_status: string | null;
  experience_level: string | null;
  interest_area: string | null;
  purge_after: string;
  purged_at: string | null;
};

export async function participantOf(userId: string): Promise<Participant | null> {
  return queryOne<Participant>(
    `SELECT id::text, code, cohort, wave, education_stage, major_field, current_status,
            experience_level, interest_area, purge_after::text, purged_at::text
       FROM v3_pilot_participants
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 1`,
    [userId]);
}

export type EventKind =
  | "result_open" | "section_view" | "action_click" | "action_save" | "action_unsave"
  /* 종이를 못 뽑은 자리. **화면이 보내는 것이 아니라 서버가 적는다** */
  | "pdf_fail";

const KINDS: EventKind[] = [
  "result_open", "section_view", "action_click", "action_save", "action_unsave",
];

export function isEventKind(x: string): x is EventKind {
  return (KINDS as string[]).includes(x);
}

/**
 * 발자국을 **한 번에 모아 적는다.**
 *
 * 같은 절을 열 번 봐도 한 번만 남는다(`section_view`). 스크롤을 오래 끌면
 * 같은 줄이 수십 개 쌓이고, 그러면 `어디를 봤는가` 가 `얼마나 흔들렸는가`
 * 가 된다. 한 줄씩 나눠 적지도 않는다: 쪽을 한 번 굴리는 동안 아홉 벌이
 * 줄을 서면 재는 일이 읽는 일을 느리게 만든다.
 */
export async function record(
  attemptId: string, kind: EventKind, refs: string[],
): Promise<void> {
  const once = kind === "section_view" || kind === "result_open";
  const list = refs.length ? [...new Set(refs)] : [null];
  if (once) {
    const had = await query<{ ref: string | null }>(
      `SELECT DISTINCT ref FROM v3_pilot_events
        WHERE attempt_id = $1 AND kind = $2`,
      [attemptId, kind]);
    const seen = new Set(had.map((r) => r.ref));
    const fresh = list.filter((r) => !seen.has(r));
    if (!fresh.length) return;
    await query(
      `INSERT INTO v3_pilot_events (attempt_id, kind, ref)
       SELECT $1, $2, x FROM unnest($3::text[]) AS x`,
      [attemptId, kind, fresh]);
    return;
  }
  await query(
    `INSERT INTO v3_pilot_events (attempt_id, kind, ref)
     SELECT $1, $2, x FROM unnest($3::text[]) AS x`,
    [attemptId, kind, list]);
}

/** 담아 둔 할 일. 담았다 뺐다를 적어 두고 마지막 상태만 읽는다 */
export async function savedActions(attemptId: string): Promise<string[]> {
  const rows = await query<{ ref: string; kind: string }>(
    `SELECT DISTINCT ON (ref) ref, kind
       FROM v3_pilot_events
      WHERE attempt_id = $1 AND kind IN ('action_save','action_unsave') AND ref IS NOT NULL
      ORDER BY ref, at DESC`,
    [attemptId]);
  return rows.filter((r) => r.kind === "action_save").map((r) => r.ref);
}

/**
 * 블록마다 걸린 시간.
 *
 * 화면에 시계를 심지 않고 **답이 찍힌 시각**에서 읽는다. 한 블록의 시간은
 * 그 블록의 첫 답과 마지막 답 사이고, 블록 사이의 빈 자리(읽기만 한
 * 전환 화면)는 앞 블록의 끝과 다음 블록의 처음 사이로 남는다.
 *
 * **자리를 비운 시간을 섞지 않는다.** 답 사이가 20분을 넘으면 그 틈은
 * 빼고 센다. 창을 열어 둔 채 밥을 먹고 온 것을 `문항이 어려웠다` 로
 * 읽으면 안 된다.
 */
const AWAY_MS = 20 * 60 * 1000;

export type BlockTime = { block: string; items: number; seconds: number };

export async function blockTimes(attemptId: string): Promise<BlockTime[]> {
  const rows = await query<{ item_id: string; answered_at: string }>(
    `SELECT item_id, answered_at::text
       FROM v3_responses WHERE attempt_id = $1 ORDER BY answered_at`,
    [attemptId]);
  const out = new Map<string, BlockTime>();
  let prev: number | null = null;
  let prevBlock = "";
  for (const r of rows) {
    const b = blockOf(r.item_id);
    const t = new Date(r.answered_at).getTime();
    const cur = out.get(b) ?? { block: b, items: 0, seconds: 0 };
    cur.items += 1;
    if (prev !== null && b === prevBlock) {
      const d = t - prev;
      if (d > 0 && d < AWAY_MS) cur.seconds += Math.round(d / 1000);
    }
    out.set(b, cur);
    prev = t;
    prevBlock = b;
  }
  return [...out.values()];
}

/**
 * 문항 번호가 어느 블록인가.
 *
 * 접두사로 가른다. 문항 은행을 읽지 않아도 되고, 블록이 늘면 여기 한 줄만
 * 는다. **운영 화면에 나가는 것은 이 이름이지 문항 번호가 아니다.**
 */
export function blockOf(itemId: string): string {
  if (itemId.startsWith("G_")) return "기술영역 확인";
  if (itemId.startsWith("TR_")) return "경험 번역";
  if (itemId.startsWith("IND_")) return "산업 탐색";
  if (itemId.startsWith("ROLE_")) return "역할 탐색";
  if (itemId.startsWith("TG_")) return "기본 정보";
  if (itemId.startsWith("CJ_") || itemId.startsWith("CO_")) return "기본 탐색";
  if (/^TD\d\d/.test(itemId)) return "경험 심화";
  return "그 밖";
}

/** 운영 화면 한 줄. **가명만 내보낸다** */
export type PilotRow = {
  code: string;
  cohort: string;
  wave: number;
  education_stage: string;
  major_field: string | null;
  attempt_id: string | null;
  tier: string | null;
  status: string | null;
  started_at: string | null;
  submitted_at: string | null;
  /** 창을 열어 둔 시간이 아니고 **손을 움직인 시간**. 20분 넘는 틈은 뺀다 */
  active_seconds: number | null;
  /** 처음부터 끝까지. 둘을 같이 두는 까닭은 차이가 곧 자리를 비운 시간이다 */
  wall_seconds: number | null;
  response_quality: string | null;
  opened_deep: number;
  /** 묶음 코드 → 영역 수. **화면이 사람 말로 옮긴다** */
  zones: Record<string, number> | null;
  answered: number;
  /** 결과를 한 번이라도 열었는가 */
  result_opened: boolean;
  feedback: number;
  /** 그 등급이 받는 문항을 다 적었는가 */
  feedback_items: number;
  /** 냈는데 결과가 안 만들어졌는가. `job_failures` 는 V2 응시를 가리킨다 */
  broken: boolean;
};

export type RowFilter = {
  wave?: number | null;
  tier?: string | null;
  /** `done` 끝낸 것 · `open` 아직 하는 중 · `none` 시작도 안 한 것 */
  completion?: "done" | "open" | "none" | null;
};

/**
 * 운영 표.
 *
 * **거르는 자리를 넷으로 둔다** — wave · 등급 · 진행 · 손볼 일. 검색 칸과
 * 내보내기를 달면 스무 명을 보는 화면이 관리 시스템이 되고, 파일럿이 끝난
 * 뒤 아무도 안 쓰는 화면이 하나 남는다.
 *
 * **전공명을 뽑지 않는다.** 뽑는 질의가 없으면 그 칸이 샐 자리가 없다.
 */
export async function pilotRows(f: RowFilter = {}): Promise<PilotRow[]> {
  return query<PilotRow>(
    `WITH act AS (
       SELECT attempt_id, SUM(d)::int AS secs FROM (
         SELECT attempt_id, EXTRACT(EPOCH FROM (answered_at
                  - lag(answered_at) OVER (PARTITION BY attempt_id
                                           ORDER BY answered_at))) AS d
           FROM v3_responses) g
        WHERE d > 0 AND d < 1200
        GROUP BY attempt_id
     )
     SELECT p.code, p.cohort, p.wave, p.education_stage, p.major_field,
            a.id::text AS attempt_id, a.tier, a.status,
            a.started_at::text, a.submitted_at::text,
            act.secs AS active_seconds,
            CASE WHEN a.submitted_at IS NULL THEN NULL
                 ELSE EXTRACT(EPOCH FROM (a.submitted_at - a.started_at))::int END
              AS wall_seconds,
            s.response_quality,
            COALESCE(array_length(a.opened_deep, 1), 0) AS opened_deep,
            CASE WHEN s.payload IS NULL THEN NULL ELSE (
              SELECT jsonb_object_agg(z.k, jsonb_array_length(z.v))
                FROM jsonb_each(s.payload->'zones') AS z(k, v)
               WHERE jsonb_array_length(z.v) > 0
            ) END AS zones,
            (SELECT count(*) FROM v3_responses r WHERE r.attempt_id = a.id)::int
              AS answered,
            EXISTS (SELECT 1 FROM v3_pilot_events e
                     WHERE e.attempt_id = a.id AND e.kind = 'result_open')
              AS result_opened,
            (SELECT count(*) FROM v3_pilot_feedback fb WHERE fb.attempt_id = a.id)::int
              AS feedback,
            (SELECT count(*) FROM v3_pilot_items i
              WHERE i.active AND i.tier_scope = ANY (
                CASE WHEN a.tier = 'BASIC' THEN ARRAY['all','BASIC']
                     ELSE ARRAY['all','PAID', COALESCE(a.tier,'STANDARD')] END))::int
              AS feedback_items,
            -- 냈는데 결과가 없다 — 이 자리에서 보려는 오류가 그것이다.
            -- job_failures.attempt_id 는 V2 응시를 가리켜 여기 쓸 수 없다
            (a.submitted_at IS NOT NULL AND s.id IS NULL) AS broken
       FROM v3_pilot_participants p
       LEFT JOIN LATERAL (
         SELECT * FROM v3_attempts x
          WHERE x.user_id = p.user_id ORDER BY x.started_at DESC LIMIT 1
       ) a ON true
       LEFT JOIN LATERAL (
         SELECT * FROM v3_snapshots y
          WHERE y.attempt_id = a.id ORDER BY y.id DESC LIMIT 1
       ) s ON true
       LEFT JOIN act ON act.attempt_id = a.id
      WHERE ($1::int IS NULL OR p.wave = $1)
        AND ($2::text IS NULL OR a.tier = $2)
        AND ($3::text IS NULL
             OR ($3 = 'done' AND a.submitted_at IS NOT NULL)
             OR ($3 = 'open' AND a.id IS NOT NULL AND a.submitted_at IS NULL)
             OR ($3 = 'none' AND a.id IS NULL))
      ORDER BY p.wave, p.created_at`,
    [f.wave ?? null, f.tier ?? null, f.completion ?? null]);
}

/**
 * 아직 안 지운 자유입력이 남은 참가자.
 *
 * **운영 화면이 전공명을 건드리지 않게 여기서 끝낸다.** 화면이 `major_name
 * IS NOT NULL` 을 직접 쓰기 시작하면, 다음 사람이 그 옆에 한 칸 더 뽑는
 * 것은 한 줄이다. 돌려주는 것은 가명과 날짜뿐이다.
 */
export type PurgeDue = { code: string; purge_after: string; left_days: number };

export async function purgeDue(limit = 10): Promise<PurgeDue[]> {
  return query<PurgeDue>(
    `SELECT code, purge_after::text, (purge_after - CURRENT_DATE)::int AS left_days
       FROM v3_pilot_participants
      WHERE purged_at IS NULL
        AND (major_name IS NOT NULL OR career_interest IS NOT NULL)
      ORDER BY purge_after
      LIMIT $1`,
    [limit]);
}

/**
 * 칸 하나의 집계.
 *
 * `n` 이 다섯 미만이면 **평균을 돌려주지 않는다.** 화면이 알아서 가려 주기를
 * 바라지 않는다: 값이 아예 나가지 않아야 캡처에도 내보내기에도 안 남는다.
 */
export type Cell = { key: string; n: number; mean: number | null };

export function cells(
  rows: { key: string; value: number }[],
): Cell[] {
  const by = new Map<string, number[]>();
  for (const r of rows) by.set(r.key, [...(by.get(r.key) ?? []), r.value]);
  return [...by].map(([key, xs]) => ({
    key,
    n: xs.length,
    mean: xs.length >= MIN_CELL
      ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 100) / 100
      : null,
  })).sort((a, b) => a.key.localeCompare(b.key));
}

export type Choice = { value: string; label: string };
export type FeedbackItem = {
  code: string; order_no: number; kind: "scale" | "text" | "choice" | "action";
  topic: string; tier_scope: string; ko: string; hint: string | null;
  choices: Choice[] | null;
};

/**
 * 그 등급이 받는 문항만.
 *
 * **받은 적 없는 것을 묻지 않는다.** 무료로 받으신 분께 `치른 값에 견주어`
 * 를 물으면 그 자리에서 답할 것이 없고, 그 빈칸이 집계에서 0 으로 세어진다.
 */
export async function feedbackItems(tier: string): Promise<FeedbackItem[]> {
  const scopes = tier === "BASIC" ? ["all", "BASIC"] : ["all", "PAID", tier];
  return query<FeedbackItem>(
    `SELECT code, order_no, kind, topic, tier_scope, ko, hint, choices
       FROM v3_pilot_items
      WHERE active AND tier_scope = ANY($1::text[])
      ORDER BY order_no, code`,
    [scopes]);
}

/** 의견 문항을 묶음으로 나눈다. 열일곱 줄을 한 줄로 늘어놓지 않는다 */
export const TOPIC_KO: Record<string, string> = {
  item: "문항",
  result: "결과",
  ui: "화면",
  product: "상품",
  price: "값",
};
export const TOPIC_ORDER = ["item", "result", "ui", "product", "price"];

export async function feedbackOf(
  attemptId: string,
): Promise<Record<string, { value: number | null; text: string | null; choice: string | null }>> {
  const rows = await query<{
    item_code: string; value: number | null; text: string | null; choice: string | null;
  }>(
    `SELECT item_code, value, text, choice FROM v3_pilot_feedback WHERE attempt_id = $1`,
    [attemptId]);
  return Object.fromEntries(rows.map((r) =>
    [r.item_code, { value: r.value, text: r.text, choice: r.choice }]));
}

export async function saveFeedback(
  attemptId: string, itemCode: string,
  value: number | null, text: string | null, choice: string | null = null,
): Promise<void> {
  await query(
    `INSERT INTO v3_pilot_feedback (attempt_id, item_code, value, text, choice)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (attempt_id, item_code)
     DO UPDATE SET value = EXCLUDED.value, text = EXCLUDED.text,
                   choice = EXCLUDED.choice, answered_at = now()`,
    [attemptId, itemCode, value, text, choice]);
}
