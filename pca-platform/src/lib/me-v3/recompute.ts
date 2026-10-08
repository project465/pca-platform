/**
 * 새 경험이 들어오면 **지금 값**을 다시 계산한다.
 *
 * **굳은 결과를 고치지 않는다.** `v3_snapshots` 은 그때 낸 결과지라 한 줄도
 * 바뀌지 않고, 여기서 바뀌는 것은 `career_profiles` 의 지금 축 수준과 묶음과
 * 비어 있는 자리와 `v3_actions` 뿐이다. 두 표를 나눠 둔 까닭이 이것이다.
 *
 * **경험이 소유를 만들지 않는다.** 보기 넷(`없다 · 받아 썼다 · 내가 했다 ·
 * 내가 정하고 쓰였다`)은 검사에서만 받고, 경험 기록에는 그 칸이 없다. 그래서
 * 경험으로 올라갈 수 있는 가장 높은 자리는 `확인`(CONFIRMED)이고, `직접
 * 정했다`(OWNED)는 검사에서만 선다. 이 선을 넘기면 **적는 사람에게만 유리한
 * 제품**이 된다.
 *
 * **내려가지 않는다.** 경험을 지워도 검사에서 확인된 축은 그대로다. 그쪽의
 * 근거는 검사 응답이고 이 기록이 아니다.
 *
 * 한 걸음씩 적으면 이렇다.
 *
 *   저장한 경험 → 축으로 묶기(candidate) → 굳은 결과와 대조(diff)
 *   → 묶음 다시 판정 → 비어 있는 자리 다시 계산 → 할 일 손질 → 지금 값 저장
 */
import { query, queryOne } from "@/lib/db";
import type { Axis, AxisState, Zone } from "./scoring/types";
import { decide } from "./scoring/zones";
import type { ResultModel } from "./result/model";
import { experiencesOf, latestResult, type Experience } from "./platform";
import { content } from "./runtime/session";

const CORE = "ME_CORE_V3";

/**
 * 고른 항목이 어느 축의 근거인가.
 *
 * **여기 적힌 것 말고 다른 길을 두지 않는다.** 경험 화면이 받는 칸과 축이
 * 1 대 1 로 맞물려야, 적은 사람이 자기 기록이 어디로 갔는지 되짚을 수 있다.
 */
const FIELD_AXIS: { field: keyof Experience & string; axis: Axis; what: string }[] = [
  { field: "problems", axis: "J1", what: "어떤 문제였나" },
  { field: "decisions", axis: "J3", what: "직접 정한 것" },
  { field: "artifacts", axis: "J5", what: "남긴 것" },
  { field: "verifications", axis: "J6", what: "견주어 확인한 것" },
  { field: "used_where", axis: "J8", what: "쓰인 자리" },
];

/** 경험으로 올라갈 수 있는 가장 높은 자리. **소유는 검사에서만 선다** */
const EXP_MAX: AxisState = "CONFIRMED";
/** 확인으로 세려면 근거가 둘이어야 한다. 검사의 소유 규칙과 같은 선이다 */
const CONFIRM_MIN = 2;

export type Candidate = {
  domain: string;
  axis: Axis;
  /** 어느 경험에서 왔는가. 되짚을 수 있어야 한다 */
  from: { id: string; title: string }[];
  /** 그 사람이 고른 글자 */
  picks: string[];
  before: AxisState;
  after: AxisState;
  /** 올라갔는가. 그대로면 `false` 이고 그 줄도 보여 준다 */
  moved: boolean;
};

export type RecomputePlan = {
  base_attempt_id: string | null;
  /** 아직 처리하지 않은 일의 수 */
  pending: number;
  candidates: Candidate[];
  /** 올라간 축만 */
  moved: Candidate[];
  /** 그 영역의 묶음이 달라지는가 */
  zone_moves: { domain: string; before: Zone; after: Zone }[];
  /** 메워진 비어 있는 자리 */
  closed_gaps: { id: string; domain: string; axis: Axis | null }[];
  /** 다시 계산할 거리가 하나도 없는가 */
  empty: boolean;
};

type Snap = {
  tier: "BASIC" | "STANDARD" | "PRO";
  domains: ResultModel["domains"];
  attempt_id: string;
};

/** 굳은 결과에서 축 상태를 꺼낸다. 없으면 다시 계산할 바탕이 없다 */
async function base(userId: string): Promise<Snap | null> {
  const m = await latestResult(userId);
  if (!m) return null;
  return { tier: m.tier, domains: m.domains, attempt_id: m.attempt_id };
}

const RANK: Record<AxisState, number> = {
  NOT_OBSERVED: 0, PARTICIPATED: 1, CONFIRMED: 2, OWNED: 3,
};

/** 경험 기록을 (영역 · 축)으로 묶는다 */
function candidates(snap: Snap, rows: Experience[]): Candidate[] {
  const bag = new Map<string, Candidate>();
  for (const e of rows) {
    for (const td of e.td_codes) {
      const d = snap.domains.find((x) => x.code === td);
      if (!d) continue;
      for (const { field, axis } of FIELD_AXIS) {
        const picks = ((e as unknown as Record<string, string[]>)[field] ?? []);
        /* **축만 고르고 항목을 고르지 않은 자리는 세지 않는다.** 축 이름에
           표시만 하고 넘어간 기록이 확인으로 서면, 고르기만 한 사람이 해 본
           사람으로 적힌다 */
        if (!picks.length) continue;
        const key = `${td}.${axis}`;
        const got = bag.get(key) ?? {
          domain: td, axis,
          from: [], picks: [],
          before: d.axes.find((a) => a.axis === axis)?.state ?? "NOT_OBSERVED",
          after: d.axes.find((a) => a.axis === axis)?.state ?? "NOT_OBSERVED",
          moved: false,
        };
        got.from.push({ id: e.id, title: e.title });
        got.picks.push(...picks);
        bag.set(key, got);
      }
    }
  }
  for (const c of bag.values()) {
    c.picks = [...new Set(c.picks)];
    const want: AxisState = c.picks.length >= CONFIRM_MIN ? EXP_MAX : "PARTICIPATED";
    /* **내려가지 않는다.** 검사에서 더 높이 선 축은 그대로 둔다 */
    c.after = RANK[want] > RANK[c.before] ? want : c.before;
    c.moved = c.after !== c.before;
  }
  return [...bag.values()].sort((a, b) =>
    a.domain.localeCompare(b.domain) || a.axis.localeCompare(b.axis));
}

/** 영역 하나의 묶음을 다시 판정한다. **검사와 같은 규칙을 부른다** */
function zoneOf(
  snap: Snap, d: ResultModel["domains"][number], after: Map<string, AxisState>,
): Zone {
  const state = (ax: Axis) =>
    after.get(`${d.code}.${ax}`) ?? d.axes.find((a) => a.axis === ax)?.state ?? "NOT_OBSERVED";
  const conf = (["J1", "J2", "J3", "J4", "J5", "J6", "J7", "J8"] as Axis[])
    .filter((ax) => RANK[state(ax)] >= RANK["CONFIRMED"]);
  const required = d.required;
  const missing = required.filter((ax) => !conf.includes(ax));
  const dd = content().domains.domains.find((x) => x.code === d.code);
  return decide({
    tier: snap.tier,
    openedDeep: d.opened.deep,
    openedProbe: d.opened.probe,
    interest: d.interest,
    confirmedAll: conf.length,
    confirmedScreen: conf.filter((ax) => ["J3", "J5", "J6", "J7"].includes(ax)).length,
    requiredOk: missing.length === 0,
    missingRequired: missing,
    outputOk: RANK[state("J5")] >= RANK["CONFIRMED"],
    /* 산출물 근거는 그 영역의 산출물 목록에서 고른 것이 있는가다 */
    outputEvidenceOk: (dd?.artifacts ?? []).length > 0
      && RANK[state("J5")] >= RANK["CONFIRMED"],
    verificationOk: RANK[state("J6")] >= RANK["CONFIRMED"],
    anyAnswer: true,
  }).zone;
}

/**
 * 무엇이 달라지는지 계산만 한다. **아무것도 쓰지 않는다.**
 *
 * 미리 보여 주는 까닭은, 저장한 것이 어디로 갔는지 모른 채 숫자만 바뀌면
 * 읽는 사람이 자기 기록과 결과를 잇지 못하기 때문이다.
 */
export async function previewRecompute(userId: string): Promise<RecomputePlan> {
  const [snap, rows, pend] = await Promise.all([
    base(userId), experiencesOf(userId), pendingCount(userId),
  ]);
  if (!snap) {
    return {
      base_attempt_id: null, pending: pend, candidates: [], moved: [],
      zone_moves: [], closed_gaps: [], empty: true,
    };
  }
  const cands = candidates(snap, rows);
  const after = new Map(cands.map((c) => [`${c.domain}.${c.axis}`, c.after]));
  const zone_moves: RecomputePlan["zone_moves"] = [];
  for (const d of snap.domains) {
    const z = zoneOf(snap, d, after);
    if (z !== d.zone) zone_moves.push({ domain: d.code, before: d.zone, after: z });
  }
  /* 메워진 자리. 굳은 결과의 빈자리 가운데 지금 확인으로 선 것 */
  const model = await latestResult(userId);
  const closed = (model?.gaps ?? []).filter((g) =>
    g.axis && after.get(`${g.domain}.${g.axis}`)
      && RANK[after.get(`${g.domain}.${g.axis}`) as AxisState] >= RANK["CONFIRMED"])
    .map((g) => ({ id: g.id, domain: g.domain, axis: g.axis }));
  const moved = cands.filter((c) => c.moved);
  return {
    base_attempt_id: snap.attempt_id, pending: pend,
    candidates: cands, moved, zone_moves, closed_gaps: closed,
    empty: cands.length === 0,
  };
}

async function pendingCount(userId: string): Promise<number> {
  const r = await queryOne<{ n: string }>(
    /* **칸 이름을 짐작하지 않는다.** 처음에 `processed_at` 으로 적었는데
       그런 칸이 없다. `career_events` 는 `status` 로 다음에 할 일을 가린다 */
    `SELECT count(*)::text AS n FROM career_events
      WHERE user_id=$1 AND status IN ('queued','failed')`, [userId]);
  return Number(r?.n ?? 0);
}

/**
 * 계산한 것을 지금 값에 적는다.
 *
 * **굳은 결과는 건드리지 않는다.** 쓰는 자리는 `career_profiles` 의 세 칸과
 * `v3_actions` 의 상태와 `career_events.processed_at` 뿐이다.
 */
export async function applyRecompute(userId: string): Promise<RecomputePlan> {
  const plan = await previewRecompute(userId);
  if (!plan.base_attempt_id) return plan;

  const levels: Record<string, Record<string, AxisState>> = {};
  for (const c of plan.candidates) {
    levels[c.domain] = levels[c.domain] ?? {};
    levels[c.domain][c.axis] = c.after;
  }
  const zones: Record<string, string[]> = {};
  const model = await latestResult(userId);
  for (const d of model?.domains ?? []) {
    const moveTo = plan.zone_moves.find((z) => z.domain === d.code)?.after ?? d.zone;
    zones[moveTo] = [...(zones[moveTo] ?? []), d.code];
  }
  const gaps = (model?.gaps ?? [])
    .filter((g) => !plan.closed_gaps.some((c) => c.id === g.id))
    .map((g) => ({ domain: g.domain, axis: g.axis, kind: g.kind }));

  await query(
    `INSERT INTO career_profiles
       (user_id, core_code, market_code, axis_levels, zones, gaps, recomputed_at)
     VALUES ($1,$2,'KR',$3,$4,$5, now())
     ON CONFLICT (user_id, core_code) DO UPDATE
       SET axis_levels = EXCLUDED.axis_levels,
           zones       = EXCLUDED.zones,
           gaps        = EXCLUDED.gaps,
           recomputed_at = now()`,
    [userId, CORE, JSON.stringify(levels), JSON.stringify(zones), JSON.stringify(gaps)]);

  /* 메워진 자리의 할 일을 닫는다. **지우지 않는다**: 무엇을 왜 닫았는지가
     기록으로 남아야 다음에 되짚을 수 있다 */
  for (const g of plan.closed_gaps) {
    await query(
      `UPDATE v3_actions SET state='done', done_at=now()
        WHERE user_id=$1 AND core_code=$2 AND state<>'done'
          AND coalesce(td_code,'')=$3 AND coalesce(axis_code,'')=$4`,
      [userId, CORE, g.domain, g.axis ?? ""]);
  }

  await query(
    `UPDATE career_events
        SET status='done', finished_at=now()
      WHERE user_id=$1 AND status IN ('queued','failed')`, [userId]);
  return { ...plan, pending: 0 };
}
