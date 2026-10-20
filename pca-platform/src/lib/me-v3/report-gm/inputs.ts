/**
 * **Gold Master PDF 의 입력을 응시에 고정한다**(Track E · Core 요청 1 의 임시 해법).
 *
 * 문제: Gold Master 는 경험 기록(`v3_experiences`)을 뽑는 순간에 읽는다. 굳은
 * 결과(`v3_snapshots`)는 응시 날 고정되지만 경험 기록은 학생이 고치고 지우고
 * 더한다. 그러면 **같은 응시의 PDF 가 뽑을 때마다 달라진다.**
 *
 * 바른 해법은 제출 때 경험 기록을 스냅숏에 함께 적는 것이고 그것은 공통 DB
 * 변경이라 Core 세션의 결정을 기다린다(`p3-iso/CORE_CHANGE_REQUEST.md` 요청 1).
 * **그 전까지 공통 DB 를 바꾸지 않고** 여기서 둘을 한다.
 *
 * 1. **기준 시각 규칙.** 넣는 경험 기록은 굳은 결과가 만들어진 시각 이전에
 *    만들어졌고 **그 뒤로 고쳐지지 않은 것**뿐이다. 그 뒤에 만들었거나 고친
 *    기록은 넣지 않고 제목만 `excluded` 에 적는다(원래 글을 되살릴 수 없으니
 *    고친 글을 그때의 글처럼 적지 않는다). 그 기록은 작업공간의 `현재 상태`
 *    가 읽는다.
 * 2. **첫 번째 생성이 입력을 파일로 굳힌다.** 그 뒤로는 그 파일을 읽어, 학생이
 *    기록을 지운 뒤에도 같은 PDF 가 다시 나온다. 파일은 저장소 밖
 *    (`var/gm-inputs/`, gitignore)이고 **운영 PDF 폴더(`var/reports`)를 쓰지
 *    않는다.**
 *
 * **이 파일은 판정을 하지 않는다.** 결과 모델은 굳은 줄 그대로이고 경험 기록을
 * 고르는 규칙 하나만 있다.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { query, queryOne } from "@/lib/db";
import { coreOf, type ResultModel } from "@/lib/me-v3/result/model";
import { resultMeta } from "@/lib/me-v3/result/meta";
import type { Experience } from "@/lib/me-v3/platform";
import { canReadParticipantReport, type Actor } from "@/lib/rbac";

export const GM_INPUT_VERSION = "gm-input.1";

export type GmInput = {
  version: typeof GM_INPUT_VERSION;
  attempt_id: string;
  user_id: string;
  core: string;
  tier: string;
  /** 굳은 결과가 만들어진 시각. 경험 기록을 고르는 기준이다 */
  frozen_at: string;
  /** 이 파일이 처음 만들어진 시각 */
  made_at: string;
  result_model: ResultModel;
  meta: Awaited<ReturnType<typeof resultMeta>>;
  experiences: Experience[];
  /** 기준 시각 뒤에 만들었거나 고쳐서 넣지 않은 기록. 제목과 까닭만 */
  excluded: { id: string; title: string; why: "created_after" | "edited_after" }[];
  /** 위 칸(이 칸 제외)을 정렬한 JSON 의 sha256 */
  sha256: string;
};

const DIR = process.env.GM_INPUT_DIR ?? path.resolve("var/gm-inputs");

/** jsonb 와 객체의 열쇠 차례가 달라도 같은 값이면 같은 글이 되게 */
function canon(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(canon);
  if (v && typeof v === "object") {
    return Object.fromEntries(Object.keys(v as object).sort()
      .map((k) => [k, canon((v as Record<string, unknown>)[k])]));
  }
  return v;
}
export function shaOf(v: unknown): string {
  return createHash("sha256").update(JSON.stringify(canon(v))).digest("hex");
}

/** DB 에서 입력을 새로 모은다. **파일을 쓰지 않는다** */
export async function collectInput(attemptId: string): Promise<GmInput> {
  const row = await queryOne<{
    result_model: ResultModel; tier: string; user_id: string; frozen: string;
  }>(
    `SELECT s.result_model, a.tier, a.user_id::text,
            to_char(s.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS frozen
       FROM v3_snapshots s JOIN v3_attempts a ON a.id = s.attempt_id
      WHERE s.attempt_id = $1 AND s.result_model IS NOT NULL
      ORDER BY s.created_at DESC, s.id DESC LIMIT 1`, [attemptId]);
  if (!row) throw new Error(`${attemptId}: 굳은 결과가 없다`);
  const core = coreOf(row.result_model);
  const meta = await resultMeta(attemptId, core);
  const all = await query<Experience & { created: string; updated: string | null }>(
    `SELECT id::text, kind, title, started_on::text, ended_on::text,
            td_codes, axis_codes, problems, decisions, artifacts, verifications,
            used_where, note_text, status, created_at::text,
            to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS created,
            to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS updated
       FROM v3_experiences
      WHERE user_id = $1 AND core_code = $2
      ORDER BY created_at DESC, id DESC`, [row.user_id, core]);
  const experiences: Experience[] = [];
  const excluded: GmInput["excluded"] = [];
  for (const e of all) {
    const { created, updated, ...rest } = e;
    if (created > row.frozen) excluded.push({ id: e.id, title: e.title, why: "created_after" });
    else if (updated && updated > row.frozen) excluded.push({ id: e.id, title: e.title, why: "edited_after" });
    else experiences.push(rest as Experience);
  }
  const body = {
    version: GM_INPUT_VERSION, attempt_id: attemptId, user_id: row.user_id, core,
    tier: row.tier, frozen_at: row.frozen, made_at: new Date().toISOString(),
    result_model: row.result_model, meta, experiences, excluded,
  };
  const { made_at: _m, ...hashed } = body;
  return { ...body, sha256: shaOf(hashed) } as GmInput;
}

export function inputFile(attemptId: string): string {
  if (!/^\d+$/.test(attemptId)) throw new Error(`응시 번호 꼴이 아니다: ${attemptId}`);
  return path.join(DIR, `${attemptId}.json`);
}

/**
 * 굳혀 둔 입력이 있으면 그것을, 없으면 새로 모아 굳힌다.
 *
 * **굳혀 둔 파일이 굳은 결과와 어긋나면 쓰지 않는다**: 등급을 올려 응시가
 * 다시 굳으면 결과 줄이 새로 생기고, 그때는 그 결과를 기준으로 다시 모은다.
 */
export async function frozenInput(attemptId: string): Promise<{ input: GmInput; reused: boolean }> {
  const file = inputFile(attemptId);
  const fresh = await collectInput(attemptId);
  if (existsSync(file)) {
    const kept = JSON.parse(readFileSync(file, "utf8")) as GmInput;
    const { made_at: _m, sha256, ...hashed } = kept;
    const intact = shaOf(hashed) === sha256;
    if (intact && kept.frozen_at === fresh.frozen_at && kept.version === GM_INPUT_VERSION) {
      return { input: kept, reused: true };
    }
  }
  mkdirSync(DIR, { recursive: true });
  writeFileSync(file, JSON.stringify(fresh, null, 1));
  return { input: fresh, reused: false };
}

/* ── 누가 이 PDF 를 받는가 ────────────────────────────────────────── */

export type GmRequester = {
  userId: string;
  /** 전역 역할(`users` 의 세션 역할) */
  role: string;
  /** 담당자로 들어가 있는 기관 번호와 그 기관의 학교 코드 */
  orgs: { id: number; code: string }[];
};

/**
 * **본인만 받는다. 기관 담당자는 기본으로 받지 못한다**(CLAUDE.md · rbac).
 *
 * 담당자가 개인 결과지를 여는 길은 셋이 다 맞을 때뿐이다: 계약에 적혀 있고 ·
 * 본인이 동의했고 · 연 기록이 남는다(`canReadParticipantReport`). 학교 전용
 * 진입(PCU)에는 그 계약 칸과 동의 칸이 아직 없다. 그래서 지금은 늘 거절하고
 * **까닭을 그대로 돌려준다**: 그 칸을 만드는 일은 공통 DB 와 계약의 결정이다.
 */
export async function canDownloadGm(
  req: GmRequester, attemptId: string,
): Promise<{ ok: boolean; who: "self" | "org" | "none"; reason: string | null }> {
  const a = await queryOne<{ user_id: string; university_code: string | null }>(
    `SELECT user_id::text, university_code FROM v3_attempts WHERE id = $1`, [attemptId]);
  if (!a) return { ok: false, who: "none", reason: "없는 응시입니다." };
  if (a.user_id === req.userId) return { ok: true, who: "self", reason: null };
  const hit = req.orgs.find((o) => a.university_code && o.code === a.university_code);
  if (!hit) return { ok: false, who: "none", reason: "본인의 응시가 아닙니다." };
  const role = req.role === "org_admin" ? "org_admin" : req.role === "instructor" ? "org_staff" : "org_participant";
  const actor: Actor = { userId: Number(req.userId), role: role as Actor["role"], orgIds: req.orgs.map((o) => o.id) };
  const r = canReadParticipantReport({
    actor, orgId: hit.id,
    /* 학교 전용 진입에는 개인 결과지 열람 계약 칸이 없다 */
    contractAllowsIndividualAccess: false,
    participantConsented: false,
  });
  return { ok: r.ok, who: "org", reason: r.reason };
}
