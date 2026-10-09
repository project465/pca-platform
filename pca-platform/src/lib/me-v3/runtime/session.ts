/**
 * 응시 하나의 생애. **서버가 진실이고 브라우저는 사본이다.**
 *
 * 브라우저 저장소가 진실이면 기기를 바꾸는 순간 사라진다. 그래서 응답은
 * 받은 자리에서 DB 에 적고, 이어 들어오면 **마지막 화면부터** 다시 연다.
 *
 * **등급을 올려도 새 응시를 만들지 않는다.** BASIC ⊂ STANDARD ⊂ PRO 라
 * 같은 응시의 `tier` 를 올리고 추가 묶음만 연다. 앞에서 답한 것은 그대로
 * 쓴다: 처음부터 다시 풀게 하면 그 사람은 두 번째 응답을 성실하게 하지
 * 않고, 같은 사람의 응답이 두 벌 쌓여 규준이 오염된다.
 *
 * **routing 과 scoring 을 갈라 둔다.** 여기서는 무엇을 물을지만 정하고,
 * 판정은 `scoring/engine.ts` 가 끝에서 한 번 한다.
 */
import { query, queryOne } from "@/lib/db";
import { coreFile, packs as readPacks } from "../core-registry";
import { load, score } from "../scoring/engine";
import type {
  Answer, GradField, Snapshot, Stage, Submission, Tier, UndergradCore,
} from "../scoring/types";
import type { Bank, BankItem } from "../scoring/normalize";
import { ITEM_BANK_VERSION, SCORING_VERSION } from "../scoring/version";
import {
  buildPlan, type IndustryScene, type Plan, type PlanInput, type Screen,
} from "./blocks";
import { enqueue, syncProfile } from "../platform";
import { progressOf, type Progress } from "./progress";
import { ASSESSMENT_COPY_VERSION, ASSESSMENT_UI_VERSION } from "./ui-version";
import {
  branchBlock, crossField, pickDomains, ROLE_SECOND_MAX,
  strongCells, type GridAnswer,
} from "./routing";
import { counts, minutes } from "../response-count";
import { controlOf, type MenuContext } from "./menus";
import { buildResult } from "../result/build";
import type { ResultModel } from "../result/model";
import { RESULT_COPY_VERSION, RESULT_MODEL_VERSION, RESULT_UI_VERSION } from "../result/version";
import { WORKSPACE_UI_VERSION } from "../workspace-version";

export const CORE = "ME_CORE_V3";

/**
 * 검사 판본. **이용권과 상품이 이 값으로 맞물린다.**
 *
 * `ME_V3_2` 로 올린 까닭은 검사 본체가 달라졌기 때문이다: 선별 네 축의
 * 넷째가 바뀌고, 영역 훑기가 열두 화면에서 두 화면으로 접히고, 산업이
 * 맨 뒤에서 맨 앞으로 왔다. 같은 판본 이름으로 두면 **두 사람이 전혀
 * 다른 검사를 받고 같은 판본으로 적힌다.**
 */
export const ASSESSMENT_VERSION = "ME_V3_2";

export type V3Attempt = {
  id: string; user_id: string; tier: Tier; core_code: string; market_code: string;
  education_stage: Stage; grad_field: GradField | null;
  undergrad_core: UndergradCore | null;
  status: "in_progress" | "submitted" | "scored";
  current_screen: string | null;
  opened_probe: string[]; opened_deep: string[]; fourth_reason: string | null;
  industry_interest: string[]; role_interest: string[]; org_interest: string[];
  industry_pack: string | null; role_pack: string | null;
  item_bank_version: string; scoring_version: string;
};

/** 응시 한 줄을 읽는 열쇠 목록. 두 자리에서 따로 적다 칸이 빠진 적이 있다 */
const ATTEMPT_COLS = `id::text, user_id::text, tier, core_code, market_code,
       education_stage, grad_field, undergrad_core, status, current_screen,
       opened_probe, opened_deep, fourth_reason,
       industry_interest, role_interest, org_interest,
       industry_pack, role_pack, item_bank_version, scoring_version`;

type Domains = {
  domains: { code: string; name: string; artifacts: string[]; verify_targets: string[];
             axes: Record<string, { l2: string; l3: string }> }[];
};
type Checklists = { domains: Record<string, Record<string, { text: string }[]>> };

let cache: {
  bank: Bank; domains: Domains; checklists: Checklists;
} | null = null;

export function content() {
  if (!cache) {
    cache = {
      bank: coreFile<Bank>(CORE, "items"),
      domains: coreFile<Domains>(CORE, "domains"),
      checklists: coreFile<Checklists>(CORE, "checklists"),
    };
  }
  return cache;
}

/* 팩은 core 파일 계약 밖이라 따로 읽는다. 팩을 더하는 일이 core 계약을
   고치는 일이 되면 안 된다. **파일 이름은 등록부가 든다** */
type IndustryPack = {
  code: string; name_ko: string; demands: string[]; scene: string;
  items: { id: string; gloss: string }[];
};
type RolePack = {
  code: string; name_ko: string; owns: string; core_ref: { td: string[] };
};
function industryPacks(): { packs: IndustryPack[] } {
  return readPacks<{ packs: IndustryPack[] }>(CORE, "industry");
}
function rolePacks(): { packs: RolePack[] } {
  return readPacks<{ packs: RolePack[] }>(CORE, "role");
}

/** 산업 장면. Core 선별 앞에 읽히고 **점수를 만들지 않는다** */
export function industryScene(code: string): IndustryScene | null {
  const p = industryPacks().packs.find((x) => x.code === code);
  if (!p) return null;
  return { code, name: p.name_ko, scene: p.scene, demands: p.demands };
}

/** 산업팩 문항의 쉬운 말 풀이. 용어를 모르는 사람이 떨어지지 않게 함께 띄운다 */
export function industryGloss(itemId: string): string | null {
  for (const p of industryPacks().packs) {
    const hit = p.items.find((x) => x.id === itemId);
    if (hit) return hit.gloss;
  }
  return null;
}

export function roleName(code: string): string {
  return rolePacks().packs.find((x) => x.code === code)?.name_ko ?? code;
}

export function domainName(td: string): string {
  return content().domains.domains.find((d) => d.code === td)?.name ?? td;
}
export function gridRowOf(td: string): string {
  const i = content().bank.items.find((x) => x.item_id === `G_${td}_INT`) as
    (BankItem & { grid_row?: string }) | undefined;
  return i?.grid_row ?? domainName(td);
}
export function wordingOf(id: string, stage: string): string {
  const i = content().bank.items.find((x) => x.item_id === id) as
    (BankItem & { wording: string; stage_wording?: Record<string, string> }) | undefined;
  if (!i) return id;
  return i.stage_wording?.[stage] ?? i.wording;
}
export function itemOf(id: string): (BankItem & {
  wording: string; options?: string[] | null; grid_row?: string | null;
  grid_stem?: string | null; response_scale?: string | null;
  option_values?: number[] | null;
}) | undefined {
  return content().bank.items.find((x) => x.item_id === id) as never;
}
export function levelOptions(): string[] {
  return (content().bank as unknown as { level_options: string[] }).level_options;
}
export function optionGuidance(): string {
  return (content().bank as unknown as { option_guidance: string }).option_guidance;
}
export function checklistFor(td: string): { slot: string; label: string; items: string[] }[] {
  const c = content().checklists.domains[td] ?? {};
  const dom = content().domains.domains.find((d) => d.code === td);
  const out = Object.entries(c).map(([axis, list]) => ({
    slot: axis, label: axisLabel(axis), items: list.map((x) => x.text),
  }));
  if (dom) {
    out.push({ slot: "ARTIFACT", label: "남긴 산출물", items: dom.artifacts });
    out.push({ slot: "VERIFY", label: "비교한 대상", items: dom.verify_targets });
  }
  return out;
}
const AXIS_LABEL: Record<string, string> = {
  J1: "문제 정의", J2: "요구 해석", J3: "직접 판단", J4: "방법과 도구",
  J5: "산출물", J6: "비교와 검증", J7: "실패와 수정", J8: "조직 활용",
};
export function axisLabel(a: string): string { return AXIS_LABEL[a] ?? a; }

export function industryChoices() {
  return industryPacks().packs
    .map((p) => ({ code: p.code, name: p.name_ko, first: p.demands[0] ?? "" }));
}
export function roleChoices() {
  return rolePacks().packs.map((p) => ({
    code: p.code, name: p.name_ko, first: p.owns,
    domains: p.core_ref.td.map(domainName),
  }));
}

/**
 * 선호 조직유형 일곱. **점수에 들어가지 않는다.**
 *
 * taxonomy 의 조직환경을 그대로 읽는다. 화면에 짧은 이름을 따로 적어
 * 두면 taxonomy 를 고친 날 두 이름이 갈린다.
 */
export function orgChoices() {
  const tax = coreFile<{ org_contexts: { code: string; name: string; differs: string }[] }>(
    CORE, "taxonomy");
  return tax.org_contexts.map((o) => ({ code: o.code, name: o.name, first: o.differs }));
}

/**
 * 이 등급에서 받게 되는 응답 수와 추정 시간.
 *
 * **세는 자리는 `response-count.ts` 하나다.** 시작 화면이 따로 세면
 * 문항을 고친 날 거기만 옛 수를 적고, 응시자는 그 수를 보고 시간을
 * 비워 둔다. 추정 시간은 **실측이 아니고** 파일럿에서 재서 고친다.
 */
/** 산업팩 하나 또는 역할팩 하나가 더하는 문항 수 */
function packSize(kind: "industry" | "role"): number {
  const items = content().bank.items;
  const codes = kind === "industry"
    ? industryPacks().packs.map((x) => x.code) : rolePacks().packs.map((x) => x.code);
  const per = codes.map((c) => items.filter((i) => kind === "industry"
    ? i.industry_pack === c
    : i.module === "ROLE" && i.item_id.startsWith(`${c}_`)).length);
  return Math.max(0, ...per);
}

export function estimate(stage: Stage, field: GradField | null): {
  responses: Record<string, number>; minutes: Record<string, number>;
} {
  const bp = coreFile<{ slots: { block: string }[] }>(CORE, "items_blueprint");
  const n = (b: string) => bp.slots.filter((x) => x.block === b).length;
  const BRANCH_BLOCK: Record<string, string> = {
    "ug-core": "UG-CORE", "ms-core": "MS-CORE",
    "phd-core": "PHD-CORE", "postdoc-core": "POSTDOC-CORE",
  };
  const branch = n(BRANCH_BLOCK[branchBlock(stage, field)]);
  const blocks = {
    /* 학습 의향 열둘은 선별된 영역에만 묻는다. 고정으로 받는 것은
       관심과 경험 스물넷이다 */
    grid: n("CORE-GRID") - 12, judge: n("CORE-JUDGE"), force: n("CORE-FORCE"),
    probePerDomain: n("PROBE-S4") / 2, probeSecondPerDomain: n("PROBE-S4") / 2,
    deepPerDomain: n("DEEP-S8"),
    learningPerDomain: 1,
    /* 일관성은 **한 짝만** 묻는다. 은행에는 두 짝이 있고 그 가운데 덜
       확인된 축의 짝 하나가 선다 */
    consist: 2,
    trans: n("TRANS-10"), target: n("TARGET"),
    branch: branch + (crossField(stage, field) ? n("GRAD-XFIELD") : 0),
    /* 팩은 blueprint 밖이라 은행에서 센다. 한 응시에 깊게 묻는 것은
       산업 하나와 역할 둘까지다 */
    pack: packSize("industry") + packSize("role") + ROLE_SECOND_MAX,
  };
  const c = counts(blocks);
  return {
    responses: {
      BASIC: c.basic, STANDARD: c.standard, STANDARD4: c.standard4,
      PRO: c.pro, PRO4: c.pro4, PROFULL: c.proFull,
    },
    minutes: minutes(blocks),
  };
}

/* ── 응시 열기와 이어보기 ─────────────────────────────────────────── */

export async function openAttempt(args: {
  userId: string; tier: Tier; stage: Stage; gradField: GradField | null;
  undergradCore?: UndergradCore | null;
  entitlementId?: string | null; market?: string;
}): Promise<V3Attempt> {
  /* 이어보기가 먼저다. 중복 응시를 만들지 않는다 */
  const open = await currentAttempt(args.userId);
  if (open) return open;
  const row = await queryOne<{ id: string }>(
    `INSERT INTO v3_attempts
       (user_id, entitlement_id, tier, market_code, education_stage, grad_field,
        undergrad_core, assessment_version,
        item_bank_version, scoring_version, current_screen)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'profile')
     RETURNING id::text`,
    [args.userId, args.entitlementId ?? null, args.tier, args.market ?? "KR",
     args.stage, args.gradField, args.undergradCore ?? null, ASSESSMENT_VERSION,
     ITEM_BANK_VERSION, SCORING_VERSION],
  );
  return (await attemptOf(row?.id as string, args.userId)) as V3Attempt;
}

/**
 * 아직 쓰지 않은 V3 이용권. **등급은 이 줄이 정한다.**
 *
 * 화면이 등급을 넘길 수 있으면 언젠가 주소로 등급을 올리는 길이 생긴다.
 * 그래서 `openAttempt` 가 받는 등급도 여기서 읽은 값이고, 이용권이 없으면
 * 무료 등급 하나뿐이다.
 */
export async function v3Grants(userId: string): Promise<
  { entitlement_id: string; tier: Tier; product_code: string }[]
> {
  return query<{ entitlement_id: string; tier: Tier; product_code: string }>(
    `SELECT e.id::text AS entitlement_id, e.tier, e.product_code
       FROM entitlements e
      WHERE e.user_id = $1 AND e.status = 'active'
        AND e.assessment_version = $2
        AND (e.ends_at IS NULL OR e.ends_at > now())
        AND NOT EXISTS (SELECT 1 FROM v3_attempts a WHERE a.entitlement_id = e.id)
      ORDER BY e.created_at`,
    [userId, ASSESSMENT_VERSION],
  ).catch(() => []);
}

export async function currentAttempt(userId: string): Promise<V3Attempt | null> {
  return queryOne<V3Attempt>(
    `SELECT ${ATTEMPT_COLS}
       FROM v3_attempts
      WHERE user_id = $1 AND status = 'in_progress'
      ORDER BY started_at DESC LIMIT 1`, [userId]);
}

export async function attemptOf(id: string, userId: string): Promise<V3Attempt | null> {
  return queryOne<V3Attempt>(
    `SELECT ${ATTEMPT_COLS}
       FROM v3_attempts WHERE id = $1 AND user_id = $2`, [id, userId]);
}

/* ── 응답 ─────────────────────────────────────────────────────────── */

export async function saveAnswer(
  attemptId: string, itemId: string, a: Answer,
): Promise<void> {
  const int = a.kind === "level" ? a.index
    : a.kind === "scale5" || a.kind === "exposure" ? a.value : null;
  const text = a.kind === "choice" ? a.value : null;
  await query(
    `INSERT INTO v3_responses (attempt_id, item_id, kind, value_int, value_text)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (attempt_id, item_id)
       DO UPDATE SET kind = $3, value_int = $4, value_text = $5, answered_at = now()`,
    [attemptId, itemId, a.kind, int, text],
  );
  await query(`UPDATE v3_attempts SET last_saved_at = now() WHERE id = $1`, [attemptId]);
}

/**
 * 번역 단계의 한 줄. **응답이 아니라 덧붙이는 말이다.**
 *
 * 고른 보기가 단계를 센 근거이고 이 줄은 결과지가 그 사람의 말로 옮겨
 * 적을 때 쓴다. 그래서 줄만 적고 보기를 고르지 않았으면 그 문항은 아직
 * 답하지 않은 것으로 남는다(`skipped`): 줄 하나로 단계가 섰다고 세면
 * 번역 열 단계가 **적은 사람에게만 유리해진다.**
 */
export async function saveNote(
  attemptId: string, itemId: string, text: string,
): Promise<void> {
  await query(
    `INSERT INTO v3_responses (attempt_id, item_id, kind, note_text)
     VALUES ($1,$2,'skipped',$3)
     ON CONFLICT (attempt_id, item_id) DO UPDATE SET note_text = $3`,
    [attemptId, itemId, text.slice(0, 400)],
  );
  await query(`UPDATE v3_attempts SET last_saved_at = now() WHERE id = $1`, [attemptId]);
}

export async function notesOf(attemptId: string): Promise<Record<string, string>> {
  const rows = await query<{ item_id: string; note_text: string | null }>(
    `SELECT item_id, note_text FROM v3_responses
      WHERE attempt_id = $1 AND note_text IS NOT NULL`, [attemptId]);
  return Object.fromEntries(rows.map((r) => [r.item_id, r.note_text ?? ""]));
}

/**
 * 학업 단계와 계열을 고친다. **routing 만 달라지고 판정 기준은 같다.**
 *
 * 앞에서 답한 것을 지우지 않는다: 계열을 바꾸면 전에 받던 분기 묶음의
 * 응답이 읽히지 않을 뿐이고, 되돌리면 그대로 쓰인다.
 */
export async function setProfile(
  attemptId: string, stage: Stage, gradField: GradField | null,
  undergradCore: UndergradCore | null = null,
): Promise<void> {
  const field = stage === "bachelor" ? null : gradField;
  await query(
    `UPDATE v3_attempts
        SET education_stage=$2, grad_field=$3, undergrad_core=$4, last_saved_at=now()
      WHERE id=$1`,
    [attemptId, stage, field,
     crossField(stage, field) ? undergradCore : null]);
}

/**
 * 고른 관심 산업과 역할과 조직. **점수에 들어가지 않는다.**
 *
 * 깊게 묻는 산업은 고른 것 가운데 첫째이고, 그 값도 여기서 함께 적는다.
 * 두 자리에 따로 적으면 뒤로 가서 고친 날 둘이 갈린다.
 */
export async function savePicks3(
  attemptId: string, kind: "industry" | "role" | "org", codes: string[],
): Promise<void> {
  const known = kind === "industry" ? industryChoices().map((x) => x.code)
    : kind === "role" ? roleChoices().map((x) => x.code)
      : orgChoices().map((x) => x.code);
  const clean = [...new Set(codes.filter((c) => known.includes(c)))].slice(0, 2);
  const col = kind === "industry" ? "industry_interest"
    : kind === "role" ? "role_interest" : "org_interest";
  if (kind === "industry") {
    await query(
      `UPDATE v3_attempts SET industry_interest=$2, industry_pack=$3,
              last_saved_at=now() WHERE id=$1`,
      [attemptId, clean, clean[0] ?? null]);
    return;
  }
  if (kind === "role") {
    await query(
      `UPDATE v3_attempts SET role_interest=$2, role_pack=$3,
              last_saved_at=now() WHERE id=$1`,
      [attemptId, clean, clean[0] ?? null]);
    return;
  }
  await query(
    `UPDATE v3_attempts SET ${col}=$2, last_saved_at=now() WHERE id=$1`,
    [attemptId, clean]);
}

export async function savePicks(
  attemptId: string, domain: string, slot: string, items: string[],
): Promise<void> {
  await query(
    `DELETE FROM v3_evidence_picks WHERE attempt_id=$1 AND domain_code=$2 AND slot=$3`,
    [attemptId, domain, slot]);
  for (const t of items) {
    await query(
      `INSERT INTO v3_evidence_picks (attempt_id, domain_code, slot, item_text)
       VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`, [attemptId, domain, slot, t]);
  }
  await query(`UPDATE v3_attempts SET last_saved_at = now() WHERE id = $1`, [attemptId]);
}

export async function answersOf(attemptId: string): Promise<Record<string, Answer>> {
  const rows = await query<{ item_id: string; kind: string; value_int: number | null; value_text: string | null }>(
    `SELECT item_id, kind, value_int, value_text FROM v3_responses WHERE attempt_id = $1`,
    [attemptId]);
  const out: Record<string, Answer> = {};
  for (const r of rows) {
    if (r.kind === "level") out[r.item_id] = { kind: "level", index: r.value_int ?? 0 };
    else if (r.kind === "scale5") out[r.item_id] = { kind: "scale5", value: r.value_int ?? 3 };
    else if (r.kind === "exposure") out[r.item_id] = { kind: "exposure", value: r.value_int ?? 0 };
    else if (r.kind === "choice") out[r.item_id] = { kind: "choice", value: r.value_text ?? "" };
    else out[r.item_id] = { kind: "skipped" };
  }
  return out;
}

export async function picksOf(attemptId: string): Promise<{
  checklists: Record<string, string[]>;
  artifacts: Record<string, string[]>;
  verifications: Record<string, string[]>;
}> {
  const rows = await query<{ domain_code: string; slot: string; item_text: string }>(
    `SELECT domain_code, slot, item_text FROM v3_evidence_picks WHERE attempt_id = $1`,
    [attemptId]);
  const checklists: Record<string, string[]> = {};
  const artifacts: Record<string, string[]> = {};
  const verifications: Record<string, string[]> = {};
  for (const r of rows) {
    if (r.slot === "ARTIFACT") artifacts[r.domain_code] = [...(artifacts[r.domain_code] ?? []), r.item_text];
    else if (r.slot === "VERIFY") verifications[r.domain_code] = [...(verifications[r.domain_code] ?? []), r.item_text];
    else {
      const k = `${r.domain_code}.${r.slot}`;
      checklists[k] = [...(checklists[k] ?? []), r.item_text];
    }
  }
  return { checklists, artifacts, verifications };
}

/* ── routing ───────────────────────────────────────────────────────── */

function gridOf(answers: Record<string, Answer>, tds: string[]): Record<string, GridAnswer> {
  const num = (a: Answer | undefined) =>
    a && a.kind !== "choice" && a.kind !== "skipped"
      ? ("index" in a ? a.index : a.value) : null;
  const out: Record<string, GridAnswer> = {};
  for (const td of tds) {
    out[td] = {
      interest: num(answers[`G_${td}_INT`]),
      exposure: num(answers[`G_${td}_EXP`]),
      learning: num(answers[`G_${td}_LEA`]),
    };
  }
  return out;
}

/**
 * 격자 응답이 다 들어오면 영역을 확정한다.
 *
 * **뒤로 가서 격자를 고치면 다시 센다.** 그래야 routing 이 응답과 어긋나지
 * 않는다. 이미 답한 심화 응답은 지우지 않는다: 영역이 빠지면 그 응답은
 * 채점에서 읽히지 않을 뿐이고, 되돌아오면 그대로 쓰인다.
 */
export async function recomputeRouting(a: V3Attempt): Promise<V3Attempt> {
  const tds = content().domains.domains.map((d) => d.code);
  const answers = await answersOf(a.id);
  const grid = gridOf(answers, tds);
  const filled = tds.filter((td) => grid[td].interest !== null).length;
  if (filled < tds.length) return a;
  const pick = pickDomains(grid, a.tier, tds);
  await query(
    `UPDATE v3_attempts SET opened_probe=$2, opened_deep=$3, fourth_reason=$4 WHERE id=$1`,
    [a.id, pick.probe, pick.deep, pick.fourth_reason]);
  return { ...a, opened_probe: pick.probe, opened_deep: pick.deep,
           fourth_reason: pick.fourth_reason };
}

/**
 * 격자에서 **같은 값으로 묶인 맨 위 두 영역**. 묶이지 않았으면 빈 배열.
 *
 * 강제 선택의 보기가 여기서 나온다. 은행의 그 문항은 보기가 비어 있고
 * `(격자에서 묶인 영역 가운데 하나)` 라고만 적혀 있다: 보기가 응시 중에
 * 정해지기 때문이다. 묶이지 않았으면 화면 자체를 띄우지 않는다. 묶이지
 * 않은 사람에게 둘 중 하나를 고르라고 물으면 **이미 답한 것을 다시
 * 묻는 것**이고, 그 답은 점수에도 들어가지 않는다.
 */
export function tiedPairIn(answers: Record<string, Answer>, tds: string[]): string[] {
  const grid = gridOf(answers, tds);
  const key = (td: string) => `${grid[td].exposure ?? 0}:${grid[td].interest ?? 0}`;
  const top = [...tds].map(key).sort().reverse()[0];
  const tied = tds.filter((td) => key(td) === top);
  return tied.length > 1 ? tied.slice(0, 2) : [];
}

/** `buildPlan` 이 읽는 것. 한자리에서 묶어 두 자리가 갈리지 않게 한다 */
function planDeps() {
  return {
    items: content().bank.items,
    domainName, wording: wordingOf, gridRow: gridRowOf,
    scene: industryScene, gloss: industryGloss, roleName,
  };
}

/**
 * 계획을 세우는 입력 한 벌.
 *
 * **한자리에서 만든다.** 등급을 올릴 때 쓰는 `before` 계획과 지금 계획이
 * 따로 적혀 있었고, adaptive 값(강하게 답한 축 · 일관성 축)이 늘면 한쪽이
 * 반드시 빠진다.
 */
function planInput(
  a: V3Attempt, answers: Record<string, Answer>,
  over: { tier?: Tier; deep?: string[] } = {},
): PlanInput {
  const tds = content().domains.domains.map((d) => d.code);
  const items = content().bank.items;
  /* 보기 넷의 자리만 본다. 이 값은 판정이 아니고 **다음에 무엇을 물을지**다 */
  const levels: Record<string, number> = {};
  for (const [id, v] of Object.entries(answers)) {
    if (v.kind === "level") levels[id] = v.index;
  }
  const probeItems = items.filter((i) => i.module === "PROBE-S4");
  const strong = strongCells(levels, probeItems);
  /* 일관성은 한 짝만 묻는다. **덜 확인된 축**으로 묻는다: 이미 강하게
     답한 축을 또 물으면 같은 판단을 표현만 바꿔 되묻는 일이 된다 */
  const axes = [...new Set(items
    .filter((i) => i.module === "CONSIST")
    .map((i) => String(i.evidence_axis)))];
  const openCount = (ax: string) =>
    a.opened_probe.filter((td) => !strong.includes(`${td}.${ax}`)).length;
  const consistAxis = [...axes].sort((x, y) => openCount(y) - openCount(x))[0] ?? null;
  return {
    tier: over.tier ?? a.tier, stage: a.education_stage,
    branchBlock: branchBlock(a.education_stage, a.grad_field),
    crossField: crossField(a.education_stage, a.grad_field),
    probe: a.opened_probe, deep: over.deep ?? a.opened_deep,
    industryInterest: a.industry_interest ?? [],
    roleInterest: a.role_interest ?? [],
    tiedPair: tiedPairIn(answers, tds),
    strongCells: strong,
    consistAxis,
    touched: tds.filter((td) => {
      const a = answers[`G_${td}_EXP`];
      return !!a && a.kind === "exposure" && a.value >= 1;
    }),
  };
}

export async function planFor(a: V3Attempt): Promise<Plan> {
  const answers = await answersOf(a.id);
  return buildPlan(planInput(a, answers), planDeps());
}

/**
 * 실제로 화면에 선 팩 문항.
 *
 * 산업 판단은 비어 있는 축을 먼저 세우고 여섯에서 끊고 둘째 역할은 앞머리
 * 셋만 묻는다. **묻지 않은 문항을 공백으로 적지 않으려고** 이 목록을 판정에
 * 넘긴다.
 */
function askedPackItems(plan: Plan): string[] {
  const out: string[] = [];
  for (const sc of plan.screens) {
    if (sc.id.startsWith("ind-") || sc.id.startsWith("role-")) out.push(...sc.items);
  }
  return out;
}

export type View = {
  attempt: V3Attempt;
  plan: Plan;
  screen: Screen;
  progress: Progress;
  answers: Record<string, Answer>;
  notes: Record<string, string>;
  picks: Awaited<ReturnType<typeof picksOf>>;
  prevId: string | null;
  nextId: string | null;
  /** 화면이 몇째인가. **주소에는 이 수를 쓴다**: 화면 이름에 내부 코드가
      들어 있어서 주소에 적으면 응시자가 그것을 본다 */
  index: number;
  prevIndex: number | null;
  nextIndex: number | null;
};

/**
 * 지금 보여 줄 화면. 이어 들어오면 마지막 자리부터.
 *
 * `want` 는 화면 이름이고 `wantIndex` 는 몇째인가다. **주소는 몇째인가로
 * 적는다**: 화면 이름에 `grid-TD03` 처럼 내부 코드가 들어 있고, 그것이
 * 주소창에 서면 응시자가 보게 된다. 이어보기 자리는 DB 에 이름으로
 * 남는다(몇째인가는 routing 이 바뀌면 다른 자리를 가리킨다).
 */
export async function viewOf(
  a0: V3Attempt, want?: string | null, wantIndex?: number | null,
): Promise<View> {
  const a = await recomputeRouting(a0);
  const plan = await planFor(a);
  const answers = await answersOf(a.id);
  const notes = await notesOf(a.id);
  const picks = await picksOf(a.id);
  const ids = plan.screens.map((s) => s.id);
  const byIndex = typeof wantIndex === "number" && wantIndex >= 0 && wantIndex < ids.length
    ? ids[wantIndex] : null;
  const target = byIndex ?? (want && ids.includes(want) ? want
    : a.current_screen && ids.includes(a.current_screen) ? a.current_screen
      : ids[0]);
  const at = ids.indexOf(target);
  return {
    attempt: a, plan, screen: plan.screens[at], progress: progressOf(plan, target),
    answers, notes, picks,
    prevId: at > 0 ? ids[at - 1] : null,
    nextId: at < ids.length - 1 ? ids[at + 1] : null,
    index: at,
    prevIndex: at > 0 ? at - 1 : null,
    nextIndex: at < ids.length - 1 ? at + 1 : null,
  };
}

/**
 * 보기를 응시 중에 정하는 문항이 읽는 것.
 *
 * **산업과 역할 전부를 넘긴다.** 고른 하나만 넘기면 목표를 고르는 자리에
 * 보기가 하나만 서고, 그러면 "여덟 산업을 다 볼 수 있다" 는 말과 화면이
 * 어긋난다.
 */
export async function menuContextOf(a: V3Attempt): Promise<MenuContext> {
  const answers = await answersOf(a.id);
  const tds = content().domains.domains.map((d) => d.code);
  return {
    tiedPair: tiedPairIn(answers, tds).map((code) => ({ code, name: domainName(code) })),
    domains: tds.map((code) => ({ code, name: domainName(code) })),
    industries: industryChoices().map((i) => ({ code: i.code, name: i.name })),
    roles: roleChoices().map((r) => ({ code: r.code, name: r.name })),
    orgs: orgChoices().map((o) => ({ code: o.code, name: o.name })),
  };
}

export async function moveTo(attemptId: string, screenId: string): Promise<void> {
  await query(`UPDATE v3_attempts SET current_screen=$2, last_saved_at=now() WHERE id=$1`,
    [attemptId, screenId]);
}

/**
 * 깊게 볼 산업이나 역할 하나.
 *
 * **없는 팩 이름을 받아 두지 않는다.** 받아 두면 그 자리에서는 아무 일도
 * 없고 제출할 때 터진다: 응시자는 다 풀고 나서 "판정 만들기" 가 안 되는
 * 것을 보고, 어디서 틀렸는지 알 길이 없다.
 */
export async function choosePack(
  attemptId: string, kind: "industry" | "role", code: string | null,
): Promise<void> {
  await savePicks3(attemptId, kind, code ? [code] : []);
}

/* ── 등급 올리기 ───────────────────────────────────────────────────── */

const RANK: Record<Tier, number> = { BASIC: 0, STANDARD: 1, PRO: 2 };

/**
 * 같은 응시의 등급을 올린다. **앞 응답을 지우지 않는다.**
 *
 * 내려가는 길은 없다: 이미 열린 묶음을 닫으면 답한 것이 사라진 것처럼
 * 보이고, 결과지도 좁아진다.
 */
export async function upgradeTier(
  attemptId: string, userId: string, to: Tier, entitlementId?: string | null,
): Promise<V3Attempt> {
  const a = await attemptOf(attemptId, userId);
  if (!a) throw new Error("응시를 찾을 수 없다");
  if (RANK[to] <= RANK[a.tier]) throw new Error(`등급을 내리지 않는다: ${a.tier} → ${to}`);
  await query(
    `INSERT INTO v3_tier_events (attempt_id, from_tier, to_tier, entitlement_id)
     VALUES ($1,$2,$3,$4)`, [attemptId, a.tier, to, entitlementId ?? null]);
  await query(
    `UPDATE v3_attempts
        SET tier=$2, status='in_progress', submitted_at=NULL, last_saved_at=now()
      WHERE id=$1`, [attemptId, to]);
  const up0 = { ...a, tier: to, status: "in_progress" as const };
  /* 심화 영역은 등급이 올라가면 다시 고른다. 선별 둘만 보던 자리에
     셋째가 열리기 때문이다 */
  const up = await recomputeRouting(up0);
  /* **끝난 자리에 두지 않는다.** 올리고 들어온 사람은 새로 묻는 첫 화면에서
     이어야 한다. `done` 에 그대로 두면 더 풀 것이 없는 줄 안다 */
  const { added } = await newScreensAfterUpgrade(up, a.tier);
  const first = added[0]?.id;
  if (first) {
    await moveTo(up.id, first);
    return { ...up, current_screen: first };
  }
  return up;
}

/** 올린 뒤 **새로 묻는** 화면만. 앞에서 답한 자리는 세지 않는다 */
export async function newScreensAfterUpgrade(
  a: V3Attempt, from: Tier,
): Promise<{ added: Screen[]; answered: number }> {
  const answers = await answersOf(a.id);
  const before = buildPlan(
    planInput(a, answers, { tier: from, deep: from === "BASIC" ? [] : a.opened_deep }),
    planDeps());
  const plan = await planFor(a);
  const had = new Set(before.screens.map((s) => s.id));
  const added = plan.screens.filter((s) => !had.has(s.id) && s.items.length > 0);
  return { added, answered: Object.keys(answers).length };
}

/* ── 제출과 판정 ───────────────────────────────────────────────────── */

export async function submissionOf(a: V3Attempt): Promise<Submission> {
  const answers = await answersOf(a.id);
  const picks = await picksOf(a.id);
  const plan = buildPlan(planInput(a, answers), planDeps());
  return {
    attempt_id: a.id, tier: a.tier, stage: a.education_stage, grad_field: a.grad_field,
    undergrad_core: a.undergrad_core,
    asked: askedPackItems(plan),
    answers, ...picks,
    opened: { probe: a.opened_probe, deep: a.opened_deep },
    industry_interest: a.industry_interest ?? [],
    role_interest: a.role_interest ?? [],
    org_interest: a.org_interest ?? [],
    industry_pack: a.industry_pack, role_pack: a.role_pack,
  };
}

/**
 * 제출하고 판정을 한 줄 적는다.
 *
 * **만들어 둔 판정을 고치지 않는다**: 줄이 쌓이기만 한다. 등급을 올려 다시
 * 제출하면 새 줄이 생기고, 앞 줄은 그때의 판본과 함께 남는다.
 */
export async function submit(a: V3Attempt): Promise<{ snapshot: Snapshot; id: string }> {
  const sub = await submissionOf(a);
  const loaded = load(a.core_code);
  const snapshot = score(sub, loaded);
  /* 결과 모델을 같은 줄에 굳힌다. 읽는 쪽이 다시 만들면 엔진이 바뀐 날
     그 사람의 결과지가 조용히 달라진다 */
  const result = buildResult(snapshot, loaded, {
    packs: {
      industries: industryChoices().map((x) => x.code),
      roles: roleChoices().map((x) => x.code),
    },
    translation: translationChoices(sub),
  });
  /**
   * **응시마다 판본 열두 가지를 남긴다.**
   *
   * 채점 엔진은 화면 판본을 모른다(알면 문장 하나 고친 날 채점이 달라진
   * 것처럼 보인다). 그래서 **적는 자리에서** 화면과 문장 판본을 얹는다.
   * 파일럿 분석이 묻는 것은 `이 사람이 어느 화면으로 어느 문장을 읽고
   * 답했는가` 이고, 끝난 뒤에는 되물을 수 없다.
   *
   * 작업공간 판본도 한 칸이다. **판정에 쓰이지 않는다**: 그 사람이 결과를
   * 받은 뒤 어느 작업공간으로 들어갔는지를 되짚는 자리이고, 경험을 쌓는
   * 화면이 달라지면 다음에 반영한 것의 뜻도 달라진다.
   */
  const versions = {
    ...snapshot.module_versions,
    assessment_ui_version: ASSESSMENT_UI_VERSION,
    assessment_copy_version: ASSESSMENT_COPY_VERSION,
    result_model_version: RESULT_MODEL_VERSION,
    result_copy_version: RESULT_COPY_VERSION,
    result_ui_version: RESULT_UI_VERSION,
    workspace_ui_version: WORKSPACE_UI_VERSION,
  };
  const row = await queryOne<{ id: string }>(
    `INSERT INTO v3_snapshots
       (attempt_id, module_versions, response_quality, payload,
        result_model, result_model_version, result_copy_version)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id::text`,
    [a.id, JSON.stringify(versions),
     snapshot.response_quality.flag, JSON.stringify(snapshot),
     JSON.stringify(result), RESULT_MODEL_VERSION, RESULT_COPY_VERSION],
  );
  await query(
    `UPDATE v3_attempts SET status='scored', submitted_at=now(), current_screen='done'
      WHERE id=$1`, [a.id]);
  /* **검사가 끝나는 자리가 아니다.** 고른 산업과 직무와 조직을 지금 값으로
     옮기고 다시 계산할 일을 한 줄 쌓는다. 그것이 없으면 내 CareerMatri 가
     빈 쪽으로 서고, 다 푼 사람이 다시 들어올 이유가 사라진다.
     **스냅샷을 덮지 않는다**: 위에서 굳힌 줄은 그대로 있다 */
  await syncProfile(a.user_id, {
    attemptId: a.id,
    industry: a.industry_interest ?? [],
    role: a.role_interest ?? [],
    org: a.org_interest ?? [],
  });
  await enqueue(a.user_id, "attempt.scored", { attempt_id: a.id });
  return { snapshot, id: row?.id as string };
}

export async function latestSnapshot(attemptId: string): Promise<Snapshot | null> {
  const row = await queryOne<{ payload: Snapshot }>(
    `SELECT payload FROM v3_snapshots WHERE attempt_id=$1
      ORDER BY created_at DESC, id DESC LIMIT 1`, [attemptId]);
  return row?.payload ?? null;
}

/**
 * 번역 열 단계에서 고른 보기의 말.
 *
 * 스냅샷은 **단계가 섰다는 것**만 들고 다닌다(그것이 판정이다). 고른 보기는
 * 응답이라 거기 없고, 그것을 담으려고 채점을 고치지는 않는다. 결과 모델이
 * 그 사람의 말을 그대로 돌려주려면 여기서 맞춰 붙인다.
 */
function translationChoices(sub: Submission): { item_id: string; choice: string | null }[] {
  const ctx = { tiedPair: [], domains: [], industries: [], roles: [], orgs: [] };
  const out: { item_id: string; choice: string | null }[] = [];
  for (const it of content().bank.items) {
    if (it.module !== "TRANS-10") continue;
    const a = sub.answers[it.item_id];
    if (!a || a.kind !== "choice") continue;
    let label: string | null = null;
    try {
      const c = controlOf(it as never, ctx);
      if (c.kind === "choice") label = c.options.find((o) => o.value === a.value)?.label ?? null;
    } catch { label = null; }
    out.push({ item_id: it.item_id, choice: label });
  }
  return out;
}

/** 굳혀 둔 결과 모델. **읽는 쪽은 다시 만들지 않는다** */
export async function latestResult(attemptId: string): Promise<ResultModel | null> {
  const row = await queryOne<{ result_model: ResultModel | null }>(
    `SELECT result_model FROM v3_snapshots WHERE attempt_id=$1
      ORDER BY created_at DESC, id DESC LIMIT 1`, [attemptId]);
  return row?.result_model ?? null;
}
