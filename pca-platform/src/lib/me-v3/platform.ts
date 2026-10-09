/**
 * 내 CareerMatri. **검사가 끝난 뒤의 자리를 읽고 쓴다.**
 *
 * 검사 하나로 끝나는 서비스가 아니다. 경험이 늘면 Gap 이 다시 계산되고,
 * 목표가 바뀌면 다시 견주고, 공고 자료가 들어오면 내 근거와 대조한다.
 *
 * **굳은 값과 지금 값을 가른다.** `v3_snapshots` 은 그때 낸 결과지라
 * 바뀌지 않고 줄이 쌓이기만 한다. `career_profiles` 가 지금 값이다. 한
 * 표에 담으면 갱신이 스냅샷을 덮어서 `만들어 둔 결과지를 고치지 않는다`
 * 가 깨진다.
 *
 * **다시 계산하는 일을 여기서 하지 않는다.** 경험을 저장하면
 * `career_events` 에 할 일 한 줄이 쌓이고, 그 줄을 처리하는 일은 다음
 * 회차다. 저장만으로 Gap 이 바뀌지 않는 것이 지금 상태이고, 화면이 그
 * 사실을 적는다.
 */
import { query, queryOne } from "@/lib/db";
import type { Gap, ResultModel } from "./result/model";
import type { Axis, AxisState, Zone } from "./scoring/types";
import { orgTypesFor } from "./region";

export const CORE = "ME_CORE_V3";

/* ── Workspace 가 읽는 한 자리 ─────────────────────────────────────── */

/**
 * 사용자가 지금 어느 처지인가.
 *
 * **상태마다 첫 화면의 주된 단추가 다르다.** 검사 전에게 `지금 상태 보기`
 * 를 내놓으면 누를 것이 없고, 끝낸 사람에게 `검사 시작` 을 내놓으면 앞
 * 응답이 두 벌 쌓인다.
 */
export type WorkspaceStage =
  | "NO_ASSESSMENT"
  | "IN_PROGRESS"
  | "BASIC_DONE"
  | "STANDARD_DONE"
  | "PRO_DONE"
  | "RECOMPUTED";

/**
 * Workspace 가 읽는 지금 상태.
 *
 * **판단을 여기서 하지 않는다.** 굳은 결과(`v3_snapshots.result_model`)를
 * 먼저 꺼내고, 반영한 적이 있으면 `career_profiles` 의 세 칸을 그 위에
 * 얹는다. 얹는 값은 **`applyRecompute` 가 만든 것**이라 이 함수에 새
 * 산식이 한 줄도 없다. 영역 이름과 축 이름과 비어 있는 자리의 뜻은 늘
 * 굳은 결과에서 온다.
 *
 * 같은 뜻을 두 번 계산하는 코드를 두지 않으려고 화면 다섯이 이 함수
 * 하나를 읽는다(홈 · 지금 상태 · 다음 할 일 · 결과 기록 · 반영).
 */
export type CurrentState = {
  stage: WorkspaceStage;
  /** 풀던 응시. 있으면 이어하기가 첫 걸음이다 */
  open: { id: string; tier: string } | null;
  /** 굳은 결과. 없으면 아직 아무 결과도 없다 */
  model: ResultModel | null;
  /** 그 결과를 낸 날 */
  result_at: string | null;
  /** 마지막으로 새 경험을 반영한 날. 없으면 반영한 적이 없다 */
  recomputed_at: string | null;
  /** 지금 영역 묶음. 반영한 적이 없으면 굳은 결과의 것 */
  zoneOf: Record<string, Zone>;
  /** 새 경험으로 올라간 축 */
  raised: { domain: string; axis: Axis; state: AxisState }[];
  /** 지금 남아 있는 비어 있는 자리. 급한 차례대로 */
  gaps: Gap[];
  /** 묶음이 달라진 영역 */
  zoneMoved: { domain: string; before: Zone; after: Zone }[];
  /** 아직 반영하지 않은 거리 */
  pending: number;
};

type ProfileRow = {
  levels: string | null; zones: string | null; gaps: string | null;
  at: string | null;
};

export async function currentState(userId: string): Promise<CurrentState> {
  const [open, snap, prof, pending] = await Promise.all([
    queryOne<{ id: string; tier: string }>(
      `SELECT id::text, tier FROM v3_attempts
        WHERE user_id = $1 AND status = 'in_progress'
        ORDER BY started_at DESC LIMIT 1`, [userId]),
    queryOne<{ model: ResultModel | null; at: string | null }>(
      `SELECT s.result_model AS model, to_char(s.created_at, 'YYYY-MM-DD') AS at
         FROM v3_snapshots s JOIN v3_attempts a ON a.id = s.attempt_id
        WHERE a.user_id = $1 AND s.result_model IS NOT NULL
        ORDER BY s.created_at DESC, s.id DESC LIMIT 1`, [userId]),
    queryOne<ProfileRow>(
      `SELECT axis_levels::text AS levels, zones::text AS zones, gaps::text AS gaps,
              to_char(recomputed_at, 'YYYY-MM-DD') AS at
         FROM career_profiles WHERE user_id = $1 AND core_code = $2`, [userId, CORE]),
    pendingRecompute(userId),
  ]);

  const model = snap?.model ?? null;
  const base: Record<string, Zone> = {};
  for (const d of model?.domains ?? []) base[d.code] = d.zone;

  /* 반영한 적이 없으면 굳은 결과가 곧 지금 상태다. 두 줄로 적으면
     사용자가 같은 값을 두 번 읽는다 */
  const applied = !!prof?.at;
  const zoneOf = { ...base };
  const raised: CurrentState["raised"] = [];
  const zoneMoved: CurrentState["zoneMoved"] = [];
  let gaps = [...(model?.gaps ?? [])];

  if (applied) {
    const z = JSON.parse(prof?.zones ?? "{}") as Record<string, string[]>;
    for (const [zone, list] of Object.entries(z)) {
      for (const d of list) zoneOf[d] = zone as Zone;
    }
    for (const [d, before] of Object.entries(base)) {
      if (zoneOf[d] !== before) zoneMoved.push({ domain: d, before, after: zoneOf[d] });
    }
    const lv = JSON.parse(prof?.levels ?? "{}") as Record<string, Record<string, AxisState>>;
    for (const [d, axes] of Object.entries(lv)) {
      const was = model?.domains.find((x) => x.code === d);
      for (const [axis, state] of Object.entries(axes)) {
        const before = was?.axes.find((a) => a.axis === axis)?.state;
        if (before && before !== state) {
          raised.push({ domain: d, axis: axis as Axis, state });
        }
      }
    }
    /* **살아남은 자리만 남긴다.** `career_profiles.gaps` 는 영역과 축만
       들고 있어서 뜻(왜 필요한가 · 무엇을 하면)은 굳은 결과에서 가져온다 */
    const live = JSON.parse(prof?.gaps ?? "[]") as { domain: string; axis: string | null }[];
    gaps = gaps.filter((g) =>
      live.some((x) => x.domain === g.domain && (x.axis ?? null) === (g.axis ?? null)));
  }
  gaps.sort((a, b) => a.rank - b.rank);

  const stage: WorkspaceStage = !model
    ? (open ? "IN_PROGRESS" : "NO_ASSESSMENT")
    : applied ? "RECOMPUTED"
      : model.tier === "PRO" ? "PRO_DONE"
        : model.tier === "STANDARD" ? "STANDARD_DONE" : "BASIC_DONE";

  return {
    stage, open: open ?? null, model, result_at: snap?.at ?? null,
    recomputed_at: prof?.at ?? null, zoneOf, raised, gaps, zoneMoved, pending,
  };
}

/* ── 경험 ──────────────────────────────────────────────────────────── */

/** 경험 여덟 갈래. **응시자가 자기 경험을 찾을 수 있는 말로 적는다** */
export const EXPERIENCE_KINDS = [
  { code: "course", label: "수업", hint: "들으면서 직접 계산하거나 정해 본 것" },
  { code: "assignment", label: "과제", hint: "제출물이 남은 과제나 레포트" },
  { code: "capstone", label: "캡스톤·설계 과제", hint: "한 학기 이상 끌고 간 설계" },
  { code: "research", label: "연구·실험", hint: "연구실에서 돌린 실험이나 해석" },
  { code: "paper", label: "논문·학회", hint: "쓴 논문이나 발표" },
  { code: "internship", label: "인턴·현장실습", hint: "회사나 기관에서 맡은 일" },
  { code: "project", label: "개인·동아리 프로젝트", hint: "대회나 제작이나 혼자 만든 것" },
  { code: "work", label: "직장 경험", hint: "맡아서 끌고 간 업무" },
  { code: "credential", label: "자격·교육 이수", hint: "딴 자격이나 들은 교육" },
] as const;

export type ExperienceKind = typeof EXPERIENCE_KINDS[number]["code"];

export type Experience = {
  id: string;
  kind: ExperienceKind;
  problems?: string[];
  used_where?: string[];
  title: string;
  started_on: string | null;
  ended_on: string | null;
  td_codes: string[];
  axis_codes: string[];
  decisions: string[];
  artifacts: string[];
  verifications: string[];
  note_text: string | null;
  status: "draft" | "saved" | "reflected";
  created_at: string;
};

export async function experiencesOf(userId: string): Promise<Experience[]> {
  return query<Experience>(
    `SELECT id::text, kind, title, started_on::text, ended_on::text,
            td_codes, axis_codes, problems, decisions, artifacts, verifications,
            used_where, note_text, status, created_at::text
       FROM v3_experiences
      WHERE user_id = $1 AND core_code = $2
      ORDER BY created_at DESC`,
    [userId, CORE]);
}

/**
 * 경험 하나를 저장한다.
 *
 * **보기에서 고른 값이 주 입력이다.** 한 줄 메모는 결과지가 그 사람의
 * 말로 옮길 때만 읽고 판정에 들어가지 않는다. 그 줄에는 기한을 붙인다:
 * 자유입력은 남겨 둘 이유가 끝나면 지운다.
 */
/**
 * 달만 받은 값을 날짜로 만든다.
 *
 * **`input type="month"` 는 `2025-03` 을 보낸다.** 그 값을 `DATE` 칸에
 * 그대로 넣으면 PostgreSQL 이 `invalid input syntax for type date` 로
 * 거절하고, 경험을 적어 넣은 사람은 **저장 단추를 눌렀는데 오류 화면**
 * 을 본다. 달만 받기로 한 것은 일부러다(언제였는지까지만 쓴다). 그래서
 * 꼴을 맞추는 자리를 **쓰는 자리 하나**에 둔다: 화면에서 고치면 다음에
 * 폼을 하나 더 만드는 사람이 같은 자리에서 또 걸린다.
 */
function asDate(v: string | null | undefined): string | null {
  const x = (v ?? "").trim();
  if (!x) return null;
  if (/^\d{4}-\d{2}$/.test(x)) return `${x}-01`;
  return /^\d{4}-\d{2}-\d{2}$/.test(x) ? x : null;
}

export async function addExperience(userId: string, e: {
  kind: string; title: string; started_on?: string | null; ended_on?: string | null;
  td_codes?: string[]; axis_codes?: string[];
  problems?: string[]; decisions?: string[]; artifacts?: string[];
  verifications?: string[]; used_where?: string[];
  note_text?: string | null;
}): Promise<string> {
  const row = await queryOne<{ id: string }>(
    `INSERT INTO v3_experiences
       (user_id, core_code, kind, title, started_on, ended_on,
        td_codes, axis_codes, problems, decisions, artifacts, verifications,
        used_where, note_text, purge_after)
     -- 꼴을 못 박는다. 같은 자리가 값과 IS NULL 두 곳에 서는데,
     -- 한쪽에 꼴을 일러 주는 자리가 없으면 타입을 못 정해 멈춘다
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::text,
             CASE WHEN $14::text IS NULL THEN NULL ELSE current_date + 365 END)
     RETURNING id::text`,
    [userId, CORE, e.kind, e.title.slice(0, 120),
     asDate(e.started_on), asDate(e.ended_on),
     e.td_codes ?? [], e.axis_codes ?? [],
     e.problems ?? [], e.decisions ?? [], e.artifacts ?? [], e.verifications ?? [],
     e.used_where ?? [],
     (e.note_text ?? "").trim() || null]);
  /* **다시 계산할 일을 줄로 쌓는다.** 여기서 바로 계산하면 저장이 느려지고,
     계산이 깨진 날 저장까지 막힌다 */
  await enqueue(userId, "evidence.added", { experience_id: row?.id ?? null });
  return row?.id ?? "";
}

export async function removeExperience(userId: string, id: string): Promise<void> {
  await query(`DELETE FROM v3_experiences WHERE id=$1 AND user_id=$2`, [id, userId]);
  await enqueue(userId, "evidence.edited", { experience_id: id });
}

/* ── 다시 계산할 일 ────────────────────────────────────────────────── */

/**
 * 다시 계산해야 할 일을 줄로 쌓는다.
 *
 * **퍼널(`analytics_events`)과 메일(`outbox`)과 섞지 않는다.** 셋이 묻는
 * 질문이 다르다: 퍼널은 전환을, 메일은 나갔는지를, 여기는 무엇을 다시
 * 계산해야 하는지를 묻는다. 같은 일로 두 번 돌지 않는 것은 DB 가 막는다.
 */
export async function enqueue(
  userId: string, kind: string, payload: Record<string, unknown>,
): Promise<void> {
  const key = `${userId}:${kind}:${JSON.stringify(payload)}`;
  await query(
    /* **부분 유일 인덱스는 조건을 같이 적어야 추론된다.** `dedupe_key` 의
       인덱스가 `WHERE dedupe_key IS NOT NULL` 이라서, 조건 없이 적으면
       `맞는 제약이 없다` 로 그 자리에서 멈춘다 */
    `INSERT INTO career_events (user_id, core_code, kind, payload, dedupe_key)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING`,
    [userId, CORE, kind, JSON.stringify(payload), key.slice(0, 300)]);
}

export async function pendingRecompute(userId: string): Promise<number> {
  const r = await queryOne<{ n: string }>(
    `SELECT count(*)::text AS n FROM career_events
      WHERE user_id=$1 AND status IN ('queued','failed')`, [userId]);
  return Number(r?.n ?? 0);
}

/* ── 지금 값 ───────────────────────────────────────────────────────── */

export type Profile = {
  target_industry: string[];
  target_role: string[];
  /** 보고 싶은 기관 유형(ORG_*). 지역 화면에서 고른다 */
  target_org: string[];
  /** 검사에서 고른 조직환경(OC1~OC7). **ORG 와 다른 층이다** */
  target_org_context: string[];
  home_region: string | null;
  move_range: string | null;
  recomputed_at: string | null;
};

export async function profileOf(userId: string): Promise<Profile | null> {
  return (await queryOne<Profile>(
    `SELECT target_industry, target_role, target_org, target_org_context,
            home_region, move_range, recomputed_at::text
       FROM career_profiles WHERE user_id=$1 AND core_code=$2`,
    [userId, CORE])) ?? null;
}

/**
 * 응시에서 고른 것을 지금 값으로 옮긴다.
 *
 * **스냅샷을 덮지 않는다.** 여기 쓰는 것은 지금 값이고, 그때 낸 결과지는
 * `v3_snapshots` 에 그대로 있다.
 */
export async function syncProfile(userId: string, from: {
  attemptId: string;
  industry: string[]; role: string[]; org: string[];
}): Promise<void> {
  /* 검사에서 고른 조직환경(OC)을 그 자리에 적고, **기관 유형은 거기서
     씨만 뿌린다.** 아직 지역 화면에서 고르지 않으신 분께 빈 칸을 보여
     주는 것보다, 검사에서 고르신 것으로 미리 채워 두고 고치시게 하는
     편이 낫다. 이미 고르신 분의 것은 덮지 않는다 */
  const seed = [...new Set(from.org.flatMap(
    (oc) => orgTypesFor(oc).map((o) => o.code)))].slice(0, 3);
  await query(
    `INSERT INTO career_profiles
       (user_id, core_code, market_code, base_attempt_id,
        target_industry, target_role, target_org_context, target_org)
     VALUES ($1,$2,'KR',$3,$4,$5,$6,$7)
     ON CONFLICT (user_id, core_code) DO UPDATE
       SET base_attempt_id    = EXCLUDED.base_attempt_id,
           target_industry    = EXCLUDED.target_industry,
           target_role        = EXCLUDED.target_role,
           target_org_context = EXCLUDED.target_org_context,
           target_org         = CASE
             WHEN career_profiles.target_org = '{}' THEN EXCLUDED.target_org
             ELSE career_profiles.target_org END,
           recomputed_at      = now()`,
    [userId, CORE, from.attemptId, from.industry, from.role, from.org, seed]);
}

/** 희망 지역과 이동 범위. **Core 판정에 들어가지 않는다** */
export async function saveRegion(
  userId: string, region: string | null, move: string | null,
  orgs: string[] = [],
): Promise<void> {
  await query(
    `INSERT INTO career_profiles
       (user_id, core_code, market_code, home_region, move_range, target_org)
     VALUES ($1,$2,'KR',$3,$4,$5)
     ON CONFLICT (user_id, core_code) DO UPDATE
       SET home_region = EXCLUDED.home_region,
           move_range  = EXCLUDED.move_range,
           target_org  = EXCLUDED.target_org`,
    [userId, CORE, region, move, orgs.slice(0, 3)]);
  await enqueue(userId, "region.changed", { region, move, orgs });
}

/** 관심 산업과 역할을 내 CareerMatri 에서 바꾼다 */
export async function saveTargets(
  userId: string, industry: string[], role: string[],
): Promise<void> {
  await query(
    `INSERT INTO career_profiles (user_id, core_code, market_code, target_industry, target_role)
     VALUES ($1,$2,'KR',$3,$4)
     ON CONFLICT (user_id, core_code) DO UPDATE
       SET target_industry = EXCLUDED.target_industry,
           target_role     = EXCLUDED.target_role`,
    [userId, CORE, industry.slice(0, 2), role.slice(0, 2)]);
  await enqueue(userId, "target.changed", { industry, role });
}

/* ── 다음 행동 ─────────────────────────────────────────────────────── */

export type ActionRow = {
  id: string; source: string; td_code: string | null; axis_code: string | null;
  body: string; horizon: number; state: string;
};

export async function actionsOf(userId: string): Promise<ActionRow[]> {
  return query<ActionRow>(
    `SELECT id::text, source, td_code, axis_code, body, horizon, state
       FROM v3_actions
      WHERE user_id=$1 AND core_code=$2 AND state <> 'dropped'
      ORDER BY (state='done'), horizon, id`,
    [userId, CORE]);
}

export async function setActionState(
  userId: string, id: string, state: "open" | "doing" | "done" | "dropped",
): Promise<void> {
  await query(
    `UPDATE v3_actions SET state=$3,
            done_at = CASE WHEN $3='done' THEN now() ELSE NULL END
      WHERE id=$1 AND user_id=$2`, [id, userId, state]);
}

/**
 * 결과지가 낸 할 일을 내 CareerMatri 로 옮긴다.
 *
 * **같은 할 일을 두 번 쌓지 않는다.** 결과를 두 번 열어도 줄이 늘지 않게
 * 영역과 축과 문장으로 본다.
 */
export async function importActions(
  userId: string, rows: { td: string | null; axis: string | null;
                          body: string; horizon: number }[],
): Promise<number> {
  let n = 0;
  for (const r of rows) {
    const got = await queryOne<{ id: string }>(
      `INSERT INTO v3_actions (user_id, core_code, source, td_code, axis_code, body, horizon)
       SELECT $1,$2,'result',$3,$4,$5,$6
        WHERE NOT EXISTS (
          SELECT 1 FROM v3_actions
           WHERE user_id=$1 AND core_code=$2 AND body=$5
             AND coalesce(td_code,'')=coalesce($3,''))
       RETURNING id::text`,
      [userId, CORE, r.td, r.axis, r.body.slice(0, 400), r.horizon]);
    if (got) n += 1;
  }
  return n;
}

/* ── 지원한 곳 ─────────────────────────────────────────────────────── */

/**
 * 본인이 적는 지원 이력.
 *
 * **알선하지 않는다.** 우리가 넣어 주는 일은 없고, 직접 지원하신 사실을
 * 적어 두는 자리다. 기업 이름은 자유입력이라 기한을 들고 다닌다.
 */
export type Application = {
  id: string;
  org_name: string | null;
  role_code: string | null;
  role_label: string | null;
  industry_code: string | null;
  region_code: string | null;
  org_type_code: string | null;
  applied_on: string | null;
  state: "watching" | "applied" | "interview" | "offer" | "closed";
  note_text: string | null;
  created_at: string;
};

export const APPLY_STATES = [
  { code: "watching", label: "보는 중" },
  { code: "applied", label: "냈습니다" },
  { code: "interview", label: "면접까지" },
  { code: "offer", label: "합격" },
  { code: "closed", label: "끝났습니다" },
] as const;

export async function applicationsOf(userId: string): Promise<Application[]> {
  return query<Application>(
    `SELECT id::text, org_name, role_code, role_label, industry_code,
            region_code, org_type_code, applied_on::text, state, note_text,
            created_at::text
       FROM v3_applications
      WHERE user_id=$1 AND core_code=$2
      ORDER BY coalesce(applied_on, created_at::date) DESC, id DESC`,
    [userId, CORE]);
}

export async function addApplication(userId: string, a: {
  org_name?: string | null; role_code?: string | null; industry_code?: string | null;
  region_code?: string | null; org_type_code?: string | null;
  applied_on?: string | null; state?: string; note_text?: string | null;
}): Promise<void> {
  await query(
    `INSERT INTO v3_applications
       (user_id, core_code, org_name, role_code, industry_code, region_code,
        org_type_code, applied_on, state, note_text, purge_after)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
             CASE WHEN $3 IS NULL AND $10 IS NULL THEN NULL
                  ELSE current_date + 365 END)`,
    [userId, CORE, (a.org_name ?? "").trim().slice(0, 120) || null,
     a.role_code || null, a.industry_code || null,
     a.region_code || null, a.org_type_code || null,
     a.applied_on || null, a.state ?? "applied",
     (a.note_text ?? "").trim().slice(0, 300) || null]);
  await enqueue(userId, "target.changed", { applied: true });
}

export async function setApplicationState(
  userId: string, id: string, state: string,
): Promise<void> {
  await query(
    `UPDATE v3_applications SET state=$3, updated_at=now()
      WHERE id=$1 AND user_id=$2`, [id, userId, state]);
}

export async function removeApplication(userId: string, id: string): Promise<void> {
  await query(`DELETE FROM v3_applications WHERE id=$1 AND user_id=$2`, [id, userId]);
}

/* ── 공고 · Track ──────────────────────────────────────────────────── */

export async function savedJobCount(userId: string): Promise<number> {
  const r = await queryOne<{ n: string }>(
    `SELECT count(*)::text AS n FROM v3_saved_jobs WHERE user_id=$1`, [userId]);
  return Number(r?.n ?? 0);
}

/** 공고 자료가 들어와 있는가. **1차에서 0 이다** */
export async function postingCount(): Promise<number> {
  const r = await queryOne<{ n: string }>(
    `SELECT count(*)::text AS n FROM v3_job_postings`, []);
  return Number(r?.n ?? 0);
}

/** Track 이 켜질 때 알려 달라고 한 기능. **결제가 아니다** */
export async function trackInterest(userId: string): Promise<string[]> {
  const rows = await query<{ feature: string }>(
    `SELECT feature FROM v3_track_interest WHERE user_id=$1`, [userId]);
  return rows.map((r) => r.feature);
}

export async function markTrackInterest(
  userId: string, feature: string, on: boolean,
): Promise<void> {
  if (on) {
    await query(
      `INSERT INTO v3_track_interest (user_id, feature) VALUES ($1,$2)
       ON CONFLICT DO NOTHING`, [userId, feature]);
  } else {
    await query(
      `DELETE FROM v3_track_interest WHERE user_id=$1 AND feature=$2`,
      [userId, feature]);
  }
}

/* ── 최근 움직임 ───────────────────────────────────────────────────── */

export type Recent = {
  last_attempt_at: string | null;
  last_submitted_at: string | null;
  last_experience_at: string | null;
  last_recomputed_at: string | null;
  attempt_id: string | null;
  tier: string | null;
  status: string | null;
};

export async function recentOf(userId: string): Promise<Recent> {
  const a = await queryOne<{
    id: string; tier: string; status: string;
    started_at: string; submitted_at: string | null;
  }>(
    `SELECT id::text, tier, status, started_at::text, submitted_at::text
       FROM v3_attempts WHERE user_id=$1 ORDER BY started_at DESC LIMIT 1`,
    [userId]);
  const e = await queryOne<{ at: string | null }>(
    `SELECT max(created_at)::text AS at FROM v3_experiences WHERE user_id=$1`,
    [userId]);
  const p = await queryOne<{ at: string | null }>(
    `SELECT recomputed_at::text AS at FROM career_profiles
      WHERE user_id=$1 AND core_code=$2`, [userId, CORE]);
  return {
    last_attempt_at: a?.started_at ?? null,
    last_submitted_at: a?.submitted_at ?? null,
    last_experience_at: e?.at ?? null,
    last_recomputed_at: p?.at ?? null,
    attempt_id: a?.id ?? null,
    tier: a?.tier ?? null,
    status: a?.status ?? null,
  };
}

/**
 * 결과 이력.
 *
 * **굳은 값과 지금 값을 한 목록에서 가른다.** `v3_snapshots` 의 줄은
 * 그때 낸 결과지이고 날짜가 그 응시를 제출한 날이다. 지금 값은
 * `career_profiles` 한 줄이고 날짜가 마지막 재분석한 날이다.
 *
 * 둘을 한 줄로 적으면 읽는 사람이 **경험을 더한 뒤의 숫자를 검사 결과로
 * 읽는다.** 그리고 응시를 두 번 한 사람의 앞 결과는 어느 화면에서도
 * 닿지 않았다: 대시보드가 가장 최근 것만 걸고 있었다.
 */
export type ResultHistoryRow = {
  kind: "SNAPSHOT" | "CURRENT";
  attempt_id: string | null;
  tier: string | null;
  at: string | null;
  confirmed: number | null;
};

export async function resultHistory(userId: string): Promise<ResultHistoryRow[]> {
  const snaps = await query<{
    attempt_id: string; tier: string; at: string; confirmed: number | null;
  }>(
    `SELECT s.attempt_id::text AS attempt_id, a.tier,
            to_char(s.created_at, 'YYYY-MM-DD') AS at,
            (s.result_model -> 'overview' -> 'counts' -> 'confirmed_axes')::int AS confirmed
       FROM v3_snapshots s JOIN v3_attempts a ON a.id = s.attempt_id
      WHERE a.user_id = $1 AND s.result_model IS NOT NULL
      ORDER BY s.created_at DESC, s.id DESC LIMIT 10`, [userId]);
  const now = await queryOne<{ at: string | null }>(
    `SELECT to_char(recomputed_at, 'YYYY-MM-DD') AS at FROM career_profiles
      WHERE user_id = $1 AND core_code = $2`, [userId, CORE]);
  const rows: ResultHistoryRow[] = snaps.map((r) => ({
    kind: "SNAPSHOT" as const, attempt_id: r.attempt_id, tier: r.tier,
    at: r.at, confirmed: r.confirmed,
  }));
  /* 지금 값은 재분석을 한 번이라도 돌린 뒤에만 줄로 선다. 안 돌린 사람에게
     `지금 상태` 를 세워 두면 검사 결과와 같은 값이 두 줄로 보인다 */
  if (now?.at) {
    rows.unshift({ kind: "CURRENT", attempt_id: null, tier: null,
                   at: now.at, confirmed: null });
  }
  return rows;
}

/** 마지막으로 만든 결과. 대시보드의 Evidence 와 Gap 이 이것을 읽는다 */
export async function latestResult(userId: string): Promise<ResultModel | null> {
  const r = await queryOne<{ result_model: ResultModel | null }>(
    `SELECT s.result_model
       FROM v3_snapshots s JOIN v3_attempts a ON a.id = s.attempt_id
      WHERE a.user_id = $1 AND s.result_model IS NOT NULL
      ORDER BY s.created_at DESC LIMIT 1`, [userId]);
  return r?.result_model ?? null;
}
