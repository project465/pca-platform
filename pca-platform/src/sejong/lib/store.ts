/**
 * 세종 시연 층의 읽기·쓰기. 표는 `db/sejong/schema_sejong_demo.sql` 의 `sj_` 표다.
 *
 * **결과는 제출할 때 한 번 굳힌다.** 다시 읽을 때 새로 계산하지 않는다:
 * 그래야 웹 결과와 PDF 와 상담사가 본 것이 같은 값이다(ME_V3 스냅샷과 같은 선).
 */
import { query, queryOne, tx } from "@/lib/db";
import { analyze, type Experience, type Profile, type Result } from "./analysis";
import { sejongContent } from "./content";

export type AttemptRow = {
  id: string;
  user_id: string;
  program_code: string;
  instrument_version: string;
  profile: Profile;
  status: "in_progress" | "scored";
  result: Result | null;
  analysis_version: string | null;
  started_at: string;
  scored_at: string | null;
};

/* 시각 칸은 글자로 받는다. `pg` 는 timestamptz 를 Date 로 돌려주는데 화면은 글자로
 *다룬다(`scoredAt.slice(0, 10)`). Date 가 그대로 오면 결과지가 그리는 순간 터진다
 * — CI 브라우저 E2E 가 `/sejong/report` 에서 그렇게 멈췄다. */
const ATT = `id, user_id, org_id, program_code, instrument_version, profile, status, result,
  analysis_version, started_at::text AS started_at, scored_at::text AS scored_at`;

export async function latestAttempt(userId: number): Promise<AttemptRow | null> {
  return queryOne<AttemptRow>(
    `SELECT ${ATT} FROM sj_attempts WHERE user_id = $1 ORDER BY started_at DESC LIMIT 1`, [userId]);
}

export async function latestScored(userId: number): Promise<AttemptRow | null> {
  return queryOne<AttemptRow>(
    `SELECT ${ATT} FROM sj_attempts WHERE user_id = $1 AND status = 'scored'
      ORDER BY scored_at DESC LIMIT 1`, [userId]);
}

/** 남의 응시는 열리지 않는다. 번호와 주인을 같이 본다 */
export async function attemptOf(attemptId: string, userId: number): Promise<AttemptRow | null> {
  if (!/^\d+$/.test(attemptId)) return null;
  return queryOne<AttemptRow>(
    `SELECT ${ATT} FROM sj_attempts WHERE id = $1 AND user_id = $2`, [attemptId, userId]);
}

export async function startAttempt(opts: {
  userId: number; orgId: number; programCode: string; profile: Profile;
}): Promise<string> {
  const { instrument } = sejongContent();
  /* 진행 중인 응시가 있으면 새로 만들지 않고 그것을 이어 간다 */
  const open = await queryOne<{ id: string }>(
    `SELECT id FROM sj_attempts WHERE user_id = $1 AND status = 'in_progress'
      ORDER BY started_at DESC LIMIT 1`, [opts.userId]);
  if (open) {
    await query(`UPDATE sj_attempts SET profile = $2 WHERE id = $1`, [open.id, opts.profile]);
    return open.id;
  }
  const row = await queryOne<{ id: string }>(
    `INSERT INTO sj_attempts (user_id, org_id, program_code, instrument_version, profile)
     VALUES ($1,$2,$3,$4,$5) RETURNING id`,
    [opts.userId, opts.orgId, opts.programCode, instrument.instrument_version, opts.profile]);
  return row!.id;
}

export async function responsesOf(attemptId: string): Promise<Record<string, number>> {
  const rows = await query<{ item_code: string; value: number }>(
    `SELECT item_code, value FROM sj_responses WHERE attempt_id = $1`, [attemptId]);
  return Object.fromEntries(rows.map((r) => [r.item_code, Number(r.value)]));
}

export async function saveResponse(attemptId: string, itemCode: string, value: number): Promise<void> {
  await query(
    `INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ($1,$2,$3)
     ON CONFLICT (attempt_id, item_code) DO UPDATE SET value = EXCLUDED.value, answered_at = now()`,
    [attemptId, itemCode, value]);
}

export async function experiencesOf(userId: number): Promise<Experience[]> {
  const rows = await query<{
    id: string; kind: string; title: string; checks: string[]; skills: string[]; job_area: string | null;
  }>(`SELECT id, kind, title, checks, skills, job_area FROM sj_experiences
       WHERE user_id = $1 ORDER BY created_at`, [userId]);
  return rows.map((r) => ({ ...r, id: String(r.id) }));
}

export type ExperienceRow = {
  id: string; kind: string; title: string; org_name: string | null; period_text: string | null;
  job_area: string | null; role_text: string | null; checks: string[]; skills: string[]; created_at: string;
};

export async function experienceRows(userId: number): Promise<ExperienceRow[]> {
  return query<ExperienceRow>(
    `SELECT * FROM sj_experiences WHERE user_id = $1 ORDER BY created_at DESC`, [userId]);
}

/**
 * 제출. **응시 줄을 잠그고 진행 중일 때만 굳힌다**: 두 번 눌러도 결과는 한 벌이다
 * (CareerMatri R33 의 동시 제출 교훈과 같다).
 */
export async function submitAttempt(attemptId: string, userId: number): Promise<Result | null> {
  const c = sejongContent();
  return tx(async (db) => {
    const a = (await db.query<AttemptRow>(
      `SELECT * FROM sj_attempts WHERE id = $1 AND user_id = $2 FOR UPDATE`, [attemptId, userId])).rows[0];
    if (!a) return null;
    if (a.status === "scored") return a.result;
    const rs = (await db.query<{ item_code: string; value: number }>(
      `SELECT item_code, value FROM sj_responses WHERE attempt_id = $1`, [attemptId])).rows;
    const responses = Object.fromEntries(rs.map((r) => [r.item_code, Number(r.value)]));
    const ex = (await db.query<{
      id: string; kind: string; title: string; checks: string[]; skills: string[]; job_area: string | null;
    }>(`SELECT id, kind, title, checks, skills, job_area FROM sj_experiences WHERE user_id = $1`, [userId])).rows;
    const result = analyze({
      instrument: c.instrument, axisInfo: c.axisInfo, responses,
      experiences: ex.map((e) => ({ ...e, id: String(e.id) })), profile: a.profile,
    });
    await db.query(
      `UPDATE sj_attempts SET status = 'scored', result = $2, analysis_version = $3, scored_at = now()
        WHERE id = $1`, [attemptId, result, result.analysis_version]);
    return result;
  });
}

export async function actionsDone(attemptId: string): Promise<Set<string>> {
  const rows = await query<{ action_code: string }>(
    `SELECT action_code FROM sj_actions WHERE attempt_id = $1 AND done`, [attemptId]);
  return new Set(rows.map((r) => r.action_code));
}

export async function setAction(attemptId: string, code: string, done: boolean): Promise<void> {
  await query(
    `INSERT INTO sj_actions (attempt_id, action_code, done) VALUES ($1,$2,$3)
     ON CONFLICT (attempt_id, action_code) DO UPDATE SET done = EXCLUDED.done, updated_at = now()`,
    [attemptId, code, done]);
}

export async function logRender(opts: {
  attemptId: string; by: number; ok: boolean; bytes?: number; step?: string;
}): Promise<void> {
  await query(
    `INSERT INTO sj_report_renders (attempt_id, requested_by, status, bytes, error_step)
     VALUES ($1,$2,$3,$4,$5)`,
    [opts.attemptId, opts.by, opts.ok ? "ready" : "failed", opts.bytes ?? null, opts.step ?? null]);
}

export async function logAccess(opts: {
  actorId: number; actorKind: "self" | "counselor" | "admin"; targetUser: number;
  attemptId: string | null; what: "result_web" | "report_web" | "report_pdf" | "denied"; reason?: string;
}): Promise<void> {
  await query(
    `INSERT INTO sj_access_logs (actor_id, actor_kind, target_user, attempt_id, what, reason)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [opts.actorId, opts.actorKind, opts.targetUser, opts.attemptId, opts.what, opts.reason ?? null]);
}

export async function renderStatus(attemptId: string): Promise<{ last: string | null; ok: number; failed: number }> {
  const r = await queryOne<{ last: string | null; ok: string; failed: string }>(
    `SELECT max(created_at)::text AS last,
            count(*) FILTER (WHERE status = 'ready') AS ok,
            count(*) FILTER (WHERE status = 'failed') AS failed
       FROM sj_report_renders WHERE attempt_id = $1`, [attemptId]);
  return { last: r?.last ?? null, ok: Number(r?.ok ?? 0), failed: Number(r?.failed ?? 0) };
}

/**
 * 보조 권역(대전·충남·충북)을 보여 줘도 되는가.
 * **지원사업의 지역 제한이 먼저다**: 사업이 세종 한정이면 본인이 '통근권까지'를 골라도 끈다.
 */
export async function auxAllowed(programCode: string, profile: Profile): Promise<boolean> {
  const p = await queryOne<{ region_rule: string }>(
    `SELECT region_rule FROM sj_programs WHERE code = $1`, [programCode]);
  if (p?.region_rule === "SEJONG_ONLY") return false;
  return profile.region_range !== "HOME_ONLY";
}
