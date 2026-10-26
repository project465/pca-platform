import * as z from "zod/v4";
import { query, queryOne } from "@/lib/db";
import {
  currentState, experiencesOf, type CurrentState, type Experience,
} from "@/lib/me-v3/platform";
import type { Axis } from "@/lib/me-v3/scoring/types";
import { AXIS_KO } from "@/lib/me-v3/result/text.ko";
import { domainName } from "@/lib/me-v3/runtime/session";
import { aiFailKo, askStructured, type AiFail } from "./claude";
import { catalog, catalogPrompt, isAxis } from "./catalog";
import { readPosting } from "./rules";
import { aiConsented } from "./settings";

/**
 * 붙여 넣은 공고 하나를 읽고 지금 상태와 나란히 놓는다.
 *
 * **공고를 우리가 고르지 않는다.** 사용자가 직접 찾은 공고를 붙여 넣고,
 * 우리는 그 공고가 묻는 것과 그 사람이 이미 가진 것을 맞대어 볼 뿐이다.
 * 지원도 대신하지 않는다. 직업정보제공사업이 할 수 있는 범위 안이다
 * (CLAUDE.md 법적 범위).
 *
 * **합격 가능성을 말하지 않는다.** 나오는 것은 요구 항목마다 `설명할 경험
 * 있음 · 정리가 덜 됨 · 아직 없음 · 이 전공 밖` 넷 가운데 하나와 그 까닭
 * 이고, 이것을 더해 점수 하나로 만들지 않는다.
 *
 * **판정은 굳은 결과와 지금 값이 정한다.** Claude 가 하는 일은 공고 문장을
 * 요구 항목으로 끊고 그 Core 의 영역 코드에 다는 것까지다. 그 영역이 지금
 * 어느 묶음인지는 `currentState()` 가 답하고, 여기서 새로 계산하지 않는다.
 */

export type ItemStatus = "ready" | "partial" | "empty" | "unmapped";

export type PostingItem = {
  text: string;
  kind: "must" | "nice";
  domain: string | null;
  axis: Axis | null;
  status: ItemStatus;
  /** 그 영역에 적어 둔 경험의 제목 */
  evidence: string[];
  /**
   * 영역이 없을 때 그 까닭. `condition` 은 학력·연차·면허처럼 경험 기록으로
   * 판단하지 않는 조건이고, `unmatched` 는 이 전공의 업무 영역에 잇지 못한 줄이다.
   * 둘을 한 말(`전공 밖 조건`)로 적으면 `Git 협업 경험` 같은 줄이 전공 밖이 된다.
   * 옛 분석 줄에는 없다(그때는 조건으로 읽는다).
   */
  reason?: "condition" | "unmatched";
};

export type PostingAnalysis = {
  schema: "assistant-posting.1";
  role: string | null;
  items: PostingItem[];
  counts: Record<ItemStatus, number>;
  /** 규칙으로 읽었으면 그 까닭. Claude 가 읽었으면 비어 있다 */
  note: string | null;
};

export type PostingRow = {
  id: string; label: string; deadline: string | null; state: string;
  analyzed_by: "claude" | "rules"; created_at: string;
  analysis: PostingAnalysis;
  /** 그 공고를 읽은 전공. 영역 코드가 이 전공의 사전을 따른다 */
  core_code?: string;
};

const Read = z.object({
  role: z.string().nullable(),
  deadline: z.string().nullable(),
  requirements: z.array(z.object({
    text: z.string(),
    kind: z.enum(["must", "nice"]),
    domain: z.string().nullable(),
    axis: z.string().nullable(),
    reason: z.enum(["condition", "unmatched"]).optional(),
  })),
});
type ReadOut = z.infer<typeof Read>;

const SYSTEM =
  "당신은 대학생의 취업 준비를 돕는 진로 상담사입니다. 학생이 직접 찾아 붙여 넣은 " +
  "채용 공고에서 요구 항목을 뽑아, 아래 목록의 기술영역 코드와 판단축 코드에 답니다.\n" +
  "규칙:\n" +
  "1. 요구 항목은 공고에 실제로 적힌 것만 뽑고, 공고의 말을 짧게 줄여 한국어 한 줄로 적습니다.\n" +
  "2. 우대·가산·선호로 적힌 것은 kind=nice, 나머지는 must 입니다.\n" +
  "3. domain 과 axis 는 목록에 있는 코드만 씁니다. 맞는 것이 없으면 null 입니다.\n" +
  "4. 학력·연차·어학 점수·자격증 같은 조건은 domain=null 로 둡니다.\n" +
  "5. 지원자를 평가하거나 합격 가능성을 말하지 않습니다.\n" +
  "6. 최대 12개까지만 뽑습니다.";

/**
 * 규칙으로 읽는다. 열쇠가 없거나 동의하지 않았거나 Claude 가 거절했을 때.
 * 읽는 법은 `rules.ts` 한 곳에 있고 `npm run mat:gold` 가 시험지 셋으로 잰다.
 */
function readByRules(core: string, text: string): ReadOut {
  const r = readPosting(core, text);
  return { role: r.role, deadline: r.deadline, requirements: r.requirements };
}

/**
 * 영역 하나가 지금 어느 상태인가. 붙여 넣을 때와 다시 열 때가 **같은 줄**을
 * 쓴다: 둘이 갈리면 경험을 적은 뒤에도 공고 쪽이 `아직 없음` 을 고집한다.
 */
type StatusInput = Pick<CurrentState, "zoneOf" | "gaps">;
function statusFor(
  st: StatusInput, exps: Experience[], domain: string, axis: Axis | null,
): { status: ItemStatus; evidence: string[] } {
  const evidence = exps.filter((e) => e.td_codes.includes(domain)).map((e) => e.title).slice(0, 3);
  const zone = st.zoneOf[domain];
  const gap = st.gaps.some((g) => g.domain === domain && (!axis || g.axis === axis));
  if (zone === "Z1_EVIDENCE_ESTABLISHED" && !gap) return { status: "ready", evidence };
  if (zone === "Z1_EVIDENCE_ESTABLISHED" || zone === "Z2_EVIDENCE_INCOMPLETE"
    || evidence.length) return { status: "partial", evidence };
  return { status: "empty", evidence };
}

/** 요구 항목 하나를 지금 상태에 댄다 */
function judge(
  st: CurrentState, exps: Experience[], r: ReadOut["requirements"][number],
): PostingItem {
  const domain = r.domain && catalog(st.core).some((d) => d.code === r.domain) ? r.domain : null;
  const axis = isAxis(r.axis) ? r.axis : null;
  let status: ItemStatus = "unmapped";
  let evidence: string[] = [];
  if (domain) ({ status, evidence } = statusFor(st, exps, domain, axis));
  /* 영역이 없으면 까닭을 남긴다. Claude 는 조건 줄만 비워 두라고 받았으므로 조건이다 */
  const reason = domain ? undefined : (r.reason ?? "condition");
  return { text: r.text.slice(0, 120), kind: r.kind, domain, axis, status, evidence, ...(reason ? { reason } : {}) };
}

export async function analyzePosting(userId: string, input: {
  label: string; text: string; deadline: string | null;
}): Promise<{ id: string; by: "claude" | "rules" }> {
  const st = await currentState(userId);
  const exps = await experiencesOf(userId, st.core);
  const text = input.text.slice(0, 12000);
  let read: ReadOut;
  let by: "claude" | "rules" = "rules";
  let model: string | null = null;
  let note: string | null = null;
  const consent = await aiConsented(userId);
  if (!consent) {
    read = readByRules(st.core, text);
    note = aiFailKo("consent");
  } else {
    const r = await askStructured({
      op: "assistant.posting", schema: Read, system: SYSTEM,
      user: `${catalogPrompt(st.core)}\n\n<공고>\n${text}\n</공고>`,
    });
    if (r.ok) { read = r.value; by = "claude"; model = r.model; }
    else { read = readByRules(st.core, text); note = aiFailKo(r.reason as AiFail); }
  }
  const items = read.requirements.slice(0, 15).map((x) => judge(st, exps, x));
  const counts = countOf(items);
  const analysis: PostingAnalysis = {
    schema: "assistant-posting.1",
    role: read.role ? read.role.slice(0, 60) : null,
    items, counts, note,
  };
  /* 사용자가 적은 마감이 먼저다. 비었으면 공고에서 읽은 날짜를 쓴다 */
  const dl = input.deadline || (read.deadline && /^\d{4}-\d{2}-\d{2}$/.test(read.deadline)
    ? read.deadline : null);
  const row = await queryOne<{ id: string }>(
    `INSERT INTO assistant_postings
       (user_id, core_code, label, deadline, raw_text, analysis, analyzed_by, model)
     VALUES ($1,$2,$3,$4::date,$5,$6::jsonb,$7,$8) RETURNING id::text`,
    [userId, st.core, input.label.slice(0, 80), dl, text,
      JSON.stringify(analysis), by, model],
  );
  return { id: row!.id, by };
}

export function countOf(items: PostingItem[]): Record<ItemStatus, number> {
  const counts = { ready: 0, partial: 0, empty: 0, unmapped: 0 } as Record<ItemStatus, number>;
  for (const it of items) counts[it.status] += 1;
  return counts;
}

/**
 * 붙여 넣은 뒤에 적은 경험까지 넣어 **상태만 다시 단다.** 요구 항목을 다시
 * 끊지 않고(공고 문장 · 영역 · 판단축은 붙여 넣을 때 그대로) 넷 가운데 어느
 * 것인지와 적어 둔 경험 제목만 지금 값으로 바꾼다. 판정은 `currentState()`
 * 가 이미 낸 값을 읽을 뿐이라 새 산식이 없다.
 *
 * 다른 전공으로 읽은 공고는 영역 코드가 이 전공의 것이 아니라 그대로 둔다.
 */
export function refreshPosting(
  row: PostingRow, core: string, st: StatusInput, exps: Experience[],
): PostingRow {
  if ((row.core_code ?? core) !== core) return row;
  const items = row.analysis.items.map((it) => (it.domain
    ? { ...it, ...statusFor(st, exps, it.domain, it.axis) } : it));
  return { ...row, analysis: { ...row.analysis, items, counts: countOf(items) } };
}

const COLS = `id::text, label, deadline::text, state, analyzed_by, created_at::text, analysis, core_code`;

export async function postingsOf(userId: string): Promise<PostingRow[]> {
  return query<PostingRow>(
    `SELECT ${COLS}
       FROM assistant_postings WHERE user_id = $1
      ORDER BY (state = 'closed'), deadline NULLS LAST, created_at DESC LIMIT 30`,
    [userId]);
}

/** 한 건. **남의 것은 열리지 않는다**: 주소의 번호와 로그인한 사람으로 거른다 */
export async function postingOf(userId: string, id: string): Promise<PostingRow | null> {
  if (!/^\d+$/.test(id)) return null;
  return queryOne<PostingRow>(
    `SELECT ${COLS}
       FROM assistant_postings WHERE user_id = $1 AND id = $2`, [userId, id]);
}

/** 지금 상태와 적어 둔 경험. 못 읽으면(결과가 없는 등) 붙여 넣을 때의 값을 쓴다 */
async function liveBasis(userId: string): Promise<{ st: CurrentState; exps: Experience[] } | null> {
  try {
    const st = await currentState(userId);
    return { st, exps: await experiencesOf(userId, st.core) };
  } catch {
    return null;
  }
}

/** 목록 전체를 지금 값으로. 브리핑과 MAT 목록이 같은 값을 읽는다 */
export async function livePostingsOf(userId: string): Promise<{
  rows: PostingRow[]; core: string | null; exps: Experience[];
}> {
  const [rows, base] = await Promise.all([postingsOf(userId), liveBasis(userId)]);
  if (!base) return { rows, core: null, exps: [] };
  return {
    rows: rows.map((r) => refreshPosting(r, base.st.core, base.st, base.exps)),
    core: base.st.core, exps: base.exps,
  };
}

/** 한 건을 지금 값으로. 남의 것은 `postingOf` 에서 이미 걸러진다 */
export async function livePostingOf(userId: string, id: string): Promise<PostingRow | null> {
  const [row, base] = await Promise.all([postingOf(userId, id), liveBasis(userId)]);
  if (!row || !base) return row;
  return refreshPosting(row, base.st.core, base.st, base.exps);
}

export async function setPostingState(userId: string, id: string, state: string): Promise<void> {
  if (!["watching", "applied", "closed"].includes(state) || !/^\d+$/.test(id)) return;
  await query(`UPDATE assistant_postings SET state = $3 WHERE user_id = $1 AND id = $2`,
    [userId, id, state]);
}

export function itemDomainKo(core: string, it: PostingItem): string {
  if (!it.domain) return it.reason === "unmatched" ? "영역을 찾지 못함" : "전공 밖 조건";
  return it.axis ? `${domainName(core, it.domain)} · ${AXIS_KO[it.axis]}`
    : domainName(core, it.domain);
}
