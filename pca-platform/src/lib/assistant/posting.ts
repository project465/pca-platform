import * as z from "zod/v4";
import { query, queryOne } from "@/lib/db";
import {
  currentState, experiencesOf, type CurrentState, type Experience,
} from "@/lib/me-v3/platform";
import type { Axis } from "@/lib/me-v3/scoring/types";
import { AXIS_KO } from "@/lib/me-v3/result/text.ko";
import { domainName } from "@/lib/me-v3/runtime/session";
import { wsLang } from "@/lib/me-v3/ws-lang";
import { aiFailEn, aiFailKo, askStructured, type AiFail } from "./claude";
import { areaName, axisName, catalog, catalogPrompt, isAxis, type MatLang } from "./catalog";
import { domainTerms, matchDomains, readPosting } from "./rules";
import { aiConsented } from "./settings";
import { cleanTitle, jobTitle } from "@/lib/mat/job-title";

/**
 * 붙여 넣은 공고 하나를 읽고 지금 상태와 나란히 놓는다.
 *
 * **공고를 우리가 고르지 않는다.** 사용자가 직접 찾은 공고를 붙여 넣고,
 * 우리는 그 공고가 묻는 것과 그 사람이 이미 가진 것을 비교해 볼 뿐이다.
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
  /** 그 줄에 함께 걸린 다른 영역(규칙으로 읽었을 때만). 가까운 경험을 찾는 데 쓴다 */
  alt?: string[];
  /**
   * 적어 둔 경험이 이 줄의 영역에 바로 있지 않고 **가까운 경험**(함께 걸린 영역이거나,
   * 경험 글에 이 영역의 이름이 들어 있다)으로 이어졌다. 그때 상태는 `정리가 덜 됨` 이다
   */
  near?: boolean;
  /**
   * 공고 글에서 읽은 줄이 아니라 **모을 때 단 직무 이름으로 본 영역**이다(2026-11-02 운영 시험:
   * 본문이 짧은 모은 공고는 자격 조건 두 줄만 읽혀 맞는 점 · 채울 것이 비었다). 화면은 그렇다고 적는다
   */
  from?: "role" | "words";
  /** `from: "words"` 일 때 공고에 나온 낱말. 화면은 글에 끼우지 않고 칩으로 적는다 */
  term?: string;
};

/** 모은 공고를 분석할 때 넘기는 것: 모을 때 단 전공 · 영역 · 직무 이름(`v3_job_postings`) */
export type PostingHint = { core: string | null; td: string[]; role: string | null };

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
  /**
   * 화면에 보일 이름. 모은 공고는 저장 이름이 `잡인더스트리 공고 99` 라 무슨 공고인지 모른다
   * (2026-11-02 운영 시험). 읽은 직무 → 모을 때 단 직무 · 제목 줄 차례로 짓는다. `label` 은 지원 현황과
   * 잇는 열쇠라 그대로 둔다
   */
  name?: string;
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
/* 규칙으로 읽은 줄에는 함께 걸린 영역(`alt`)이 붙는다. Claude 에게 주는 틀(`Read`)은 그대로 둔다 */
type ReadOut = Omit<z.infer<typeof Read>, "requirements"> & {
  requirements: (z.infer<typeof Read>["requirements"][number] & { alt?: string[] })[];
};

const SYSTEM =
  "당신은 대학생의 취업 준비를 돕는 진로 상담사입니다. 학생이 직접 찾아 붙여 넣은 " +
  "채용 공고에서 요구 항목을 뽑아, 아래 목록의 기술영역 코드와 판단축 코드에 답니다.\n" +
  "규칙:\n" +
  "1. 요구 항목은 공고에 실제로 적힌 것만 뽑고, 공고의 말을 짧게 줄여 한국어 한 줄로 적습니다.\n" +
  "2. 우대·가산·선호로 적힌 것은 kind=nice, 나머지는 must 입니다.\n" +
  "3. domain 과 axis 는 목록에 있는 코드만 씁니다. 맞는 것이 없으면 null 입니다.\n" +
  "4. 학력·연차·어학 점수·자격증 같은 조건은 domain=null 로 둡니다.\n" +
  "5. 지원자를 평가하거나 합격 가능성을 말하지 않습니다.\n" +
  "6. 최대 12개까지만 뽑습니다.\n" +
  "7. 논문·특허·연구 과제 수행·학회 발표·연구계획서·학위 같은 연구 실적 요구도 빠뜨리지 않고 " +
  "한 줄씩 뽑습니다. 편수·등급 같은 기준은 공고에 적힌 그대로 둡니다.";

/** 영어 작업공간. 요구 항목을 공고에 적힌 말(영어)로 돌려받는다 */
const SYSTEM_EN =
  "You help university students prepare for jobs. From a job posting the student found and " +
  "pasted, extract the requirements and tag each with a technical-area code and a judgment-axis " +
  "code from the lists below.\n" +
  "Rules:\n" +
  "1. Only extract requirements actually written in the posting. Shorten each to one line in " +
  "English, keeping the posting's own words.\n" +
  "2. Anything marked preferred, a plus, bonus or nice to have is kind=nice; everything else is must.\n" +
  "3. Use only codes from the lists for domain and axis. If nothing fits, use null.\n" +
  "4. Conditions such as degree, years of experience, language scores, licenses or work " +
  "authorization get domain=null.\n" +
  "5. Do not evaluate the applicant or say anything about their chances.\n" +
  "6. Extract at most 12.\n" +
  "7. Do not skip research-record requirements such as papers, patents, funded research projects, " +
  "conference talks, research proposals or degrees. Keep counts and ranks as written in the posting.";

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
  /* `Z3_EVIDENCE_LOW_INTEREST` 는 **해 본 영역**이다(관심만 낮다). `아직 없음` 으로 두면 학생이 해 봤다고
     답한 일을 공고 쪽이 지운다(2026-11-02 v3/23 시험: CI/CD · 장애 대응이 `없음`) */
  if (zone === "Z1_EVIDENCE_ESTABLISHED" || zone === "Z2_EVIDENCE_INCOMPLETE" || zone === "Z3_EVIDENCE_LOW_INTEREST"
    || evidence.length) return { status: "partial", evidence };
  return { status: "empty", evidence };
}

/**
 * 바로 이어진 경험이 없을 때 **가까운 경험**을 찾는다(2026-10-31 대표 시험: `수명 예측값을
 * 시험 결과와 비교` 한 구조·내구 해석 경험이 `기계적 특성 평가 및 물성 보증 시험` 에 잇지
 * 못했다). 함께 걸린 영역의 경험이거나, 경험 글에 이 줄의 영역 이름이 들어 있으면 잇는다.
 * **꾸미지 않는다**: `설명할 경험 있음` 이 아니라 `정리가 덜 됨` 으로만 세운다
 */
function withNear(
  core: string, st: StatusInput, exps: Experience[], domain: string, alt: string[] | undefined, axis: Axis | null,
): { status: ItemStatus; evidence: string[]; near?: boolean } {
  const base = statusFor(st, exps, domain, axis);
  if (base.status !== "empty") return base;
  const codes = [domain, ...(alt ?? [])];
  const words = domainTerms(core, codes).map((w) => w.toLowerCase());
  const near = exps.filter((e) => !e.td_codes.includes(domain) && (
    e.td_codes.some((c) => (alt ?? []).includes(c))
    || [e.title, ...e.decisions, ...e.artifacts, ...e.verifications].join(" \n ").toLowerCase()
      .split(" \n ").some((x) => words.some((w) => x.includes(w)))
  )).map((e) => e.title).slice(0, 3);
  return near.length ? { status: "partial", evidence: near, near: true } : base;
}

/** 요구 항목 하나를 지금 상태에 댄다 */
function judge(
  st: CurrentState, exps: Experience[], r: ReadOut["requirements"][number],
): PostingItem {
  const domain = r.domain && catalog(st.core).some((d) => d.code === r.domain) ? r.domain : null;
  const axis = isAxis(r.axis) ? r.axis : null;
  let status: ItemStatus = "unmapped";
  let evidence: string[] = [];
  let near: boolean | undefined;
  const alt = (r.alt ?? []).filter((c) => catalog(st.core).some((d) => d.code === c));
  if (domain) ({ status, evidence, near } = withNear(st.core, st, exps, domain, alt, axis));
  /* 영역이 없으면 까닭을 남긴다. Claude 는 조건 줄만 비워 두라고 받았으므로 조건이다 */
  const reason = domain ? undefined : (r.reason ?? "condition");
  return {
    text: r.text.slice(0, 120), kind: r.kind, domain, axis, status, evidence,
    ...(reason ? { reason } : {}), ...(alt.length ? { alt } : {}), ...(near ? { near } : {}),
  };
}

/**
 * 공고 글을 읽어 요구 항목을 지금 상태에 댄다. 새로 저장할 때와 같은 공고를 다시 읽을 때가 함께 쓴다.
 *
 * 글에서 경험 영역에 이어진 줄이 **하나도 없고** 모을 때 같은 전공의 직무로 단 공고면, 그 직무가
 * 보는 영역(셋까지)을 `from: "role"` 로 덧붙인다. 공고 글에 없던 요구를 지어내지 않고, 화면이
 * "직무 이름으로 본 영역" 이라고 따로 적는다.
 */
async function readAndJudge(userId: string, text0: string, hint?: PostingHint): Promise<{
  st: CurrentState; analysis: PostingAnalysis; by: "claude" | "rules"; model: string | null;
  readDeadline: string | null;
}> {
  const st = await currentState(userId);
  const exps = await experiencesOf(userId, st.core);
  const text = text0.slice(0, 12000);
  /* 남기는 안내(`note`)와 Claude 가 돌려줄 말은 작업공간 언어를 따른다 */
  const lang: MatLang = await wsLang(userId).catch(() => "ko" as const);
  const failText = lang === "en" ? aiFailEn : aiFailKo;
  let read: ReadOut;
  let by: "claude" | "rules" = "rules";
  let model: string | null = null;
  let note: string | null = null;
  const consent = await aiConsented(userId);
  if (!consent) {
    read = readByRules(st.core, text);
    note = failText("consent");
  } else {
    const r = await askStructured({
      op: "assistant.posting", schema: Read, system: lang === "en" ? SYSTEM_EN : SYSTEM,
      user: lang === "en"
        ? `${catalogPrompt(st.core, "en")}\n\n<posting>\n${text}\n</posting>`
        : `${catalogPrompt(st.core)}\n\n<공고>\n${text}\n</공고>`,
    });
    if (r.ok) { read = r.value; by = "claude"; model = r.model; }
    else { read = readByRules(st.core, text); note = failText(r.reason as AiFail); }
  }
  const items = read.requirements.slice(0, 15).map((x) => judge(st, exps, x));
  if (!items.some((i) => i.domain) && hint && hint.core === st.core) {
    const codes = hint.td.filter((c) => catalog(st.core).some((d) => d.code === c)).slice(0, 3);
    for (const code of codes) {
      items.push({
        /* 글은 영역 이름만. 어디서 왔는지는 화면의 칩(`직무 이름으로 본 영역`)이 적는다 */
        text: domainName(st.core, code).slice(0, 120),
        kind: "nice", domain: code, axis: null, from: "role",
        ...withNear(st.core, st, exps, code, undefined, null),
      });
    }
  }
  /* 그래도 없으면 공고 글 어디엔가 나온 이 전공의 사전 낱말(예: `AI Engineer` · `PyTorch`)로 본 영역 */
  if (!items.some((i) => i.domain)) {
    for (const h of matchDomains(st.core, text).filter((x) => x.score >= 3).slice(0, 3)) {
      items.push({
        text: domainName(st.core, h.code).slice(0, 120),
        kind: "nice", domain: h.code, axis: null, from: "words", term: h.terms[0],
        ...withNear(st.core, st, exps, h.code, undefined, null),
      });
    }
  }
  const analysis: PostingAnalysis = {
    schema: "assistant-posting.1",
    role: read.role ? read.role.slice(0, 60) : hint?.role ?? null,
    items, counts: countOf(items), note,
  };
  const readDeadline = read.deadline && /^\d{4}-\d{2}-\d{2}$/.test(read.deadline) ? read.deadline : null;
  return { st, analysis, by, model, readDeadline };
}

export async function analyzePosting(userId: string, input: {
  label: string; text: string; deadline: string | null; hint?: PostingHint;
}): Promise<{ id: string; by: "claude" | "rules" }> {
  const text = input.text.slice(0, 12000);
  const { st, analysis, by, model, readDeadline } = await readAndJudge(userId, text, input.hint);
  /* 사용자가 적은 마감이 먼저다. 비었으면 공고에서 읽은 날짜를 쓴다 */
  const dl = input.deadline || readDeadline;
  const row = await queryOne<{ id: string }>(
    `INSERT INTO assistant_postings
       (user_id, core_code, label, deadline, raw_text, analysis, analyzed_by, model)
     VALUES ($1,$2,$3,$4::date,$5,$6::jsonb,$7,$8) RETURNING id::text`,
    [userId, st.core, input.label.slice(0, 80), dl, text,
      JSON.stringify(analysis), by, model],
  );
  return { id: row!.id, by };
}

/**
 * 저장해 둔 공고를 **같은 줄에서 다시 읽는다**(AI 분석을 켠 뒤, 또는 전에 읽은 결과에 경험 영역이
 * 하나도 이어지지 않았을 때). 새 줄을 만들지 않아 `분석한 공고` 목록에 같은 공고가 둘 서지 않는다.
 * 남의 것은 고치지 않는다: 번호와 로그인한 사람으로 함께 거른다.
 */
export async function reanalyzePosting(userId: string, id: string, hint?: PostingHint): Promise<boolean> {
  if (!/^\d+$/.test(id)) return false;
  const row = await queryOne<{ raw_text: string }>(
    `SELECT raw_text FROM assistant_postings WHERE user_id = $1 AND id = $2`, [userId, id]);
  if (!row?.raw_text) return false;
  const { st, analysis, by, model } = await readAndJudge(userId, row.raw_text, hint);
  await query(
    `UPDATE assistant_postings SET core_code = $3, analysis = $4::jsonb, analyzed_by = $5, model = $6
      WHERE user_id = $1 AND id = $2`,
    [userId, id, st.core, JSON.stringify(analysis), by, model]);
  return true;
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
  const items = row.analysis.items.map((it) => {
    if (!it.domain) return it;
    const { near: _old, ...rest } = it;
    return { ...rest, ...withNear(core, st, exps, it.domain, it.alt, it.axis) };
  });
  return { ...row, analysis: { ...row.analysis, items, counts: countOf(items) } };
}

const COLS = `id::text, label, deadline::text, state, analyzed_by, created_at::text, analysis, core_code`;

/** 모은 공고의 저장 이름(`잡인더스트리 공고 99`)에서 공고 번호 */
export function jobNoOf(label: string): string | null {
  return /^(잡인더스트리|고용24) 공고 (\d{1,18})$/.exec(label)?.[2] ?? null;
}

async function withNames(rows: PostingRow[]): Promise<PostingRow[]> {
  const nos = [...new Set(rows.map((r) => jobNoOf(r.label)).filter((x): x is string => Boolean(x)))];
  const jobs = nos.length ? await query<{ id: string; req: string[]; role: string | null }>(
    `SELECT id::text, raw_requirements AS req, role_code AS role FROM v3_job_postings WHERE id = ANY($1::bigint[])`,
    [nos]).catch(() => []) : [];
  const by = new Map(jobs.map((j) => [j.id, j]));
  return rows.map((r) => {
    const no = jobNoOf(r.label);
    if (!no) return { ...r, name: r.label };
    const j = by.get(no);
    const t = (r.analysis?.role ? cleanTitle(r.analysis.role) : "") || (j ? jobTitle(j.req ?? [], j.role).title : null);
    return { ...r, name: t ? (t.length > 40 ? `${t.slice(0, 39)}…` : t) : r.label };
  });
}

export async function postingsOf(userId: string): Promise<PostingRow[]> {
  return withNames(await query<PostingRow>(
    `SELECT ${COLS}
       FROM assistant_postings WHERE user_id = $1
      ORDER BY (state = 'closed'), deadline NULLS LAST, created_at DESC LIMIT 30`,
    [userId]));
}

/** 한 건. **남의 것은 열리지 않는다**: 주소의 번호와 로그인한 사람으로 거른다 */
export async function postingOf(userId: string, id: string): Promise<PostingRow | null> {
  if (!/^\d+$/.test(id)) return null;
  const row = await queryOne<PostingRow>(
    `SELECT ${COLS}
       FROM assistant_postings WHERE user_id = $1 AND id = $2`, [userId, id]);
  return row ? (await withNames([row]))[0] : null;
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

export function itemDomainKo(core: string, it: PostingItem, lang: MatLang = "ko"): string {
  if (lang === "en") {
    if (!it.domain) return it.reason === "unmatched" ? "No matching area" : "Not about experience";
    const area = areaName(core, it.domain, "en");
    return it.axis ? `${area} · ${axisName(it.axis, "en")}` : area;
  }
  if (!it.domain) return it.reason === "unmatched" ? "영역을 찾지 못함" : "전공 밖 조건";
  return it.axis ? `${domainName(core, it.domain)} · ${AXIS_KO[it.axis]}`
    : domainName(core, it.domain);
}
