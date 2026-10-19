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
import { opFail, ref } from "@/lib/oplog";
import type { Axis, AxisState, Zone } from "./scoring/types";
import { decide } from "./scoring/zones";
import { coreOf, type ResultModel } from "./result/model";
import { activeCore, experiencesOf, latestResult, type Experience } from "./platform";
import { content } from "./runtime/session";

/* **core 를 글자로 박지 않는다.** 지금 값과 줄과 할 일은 전부 그 사람의
   core 아래에 쌓인다. 어느 core 인지는 `activeCore()` 가 그 사람의 자료에서
   고르고, 고를 수 없으면 짐작하지 않고 던진다 */

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
  { field: "used_where", axis: "J8", what: "쓰인 곳" },
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
  /** 어느 Major Core 의 결과인가. 영역 사전을 읽을 때 쓴다 */
  core: string;
  tier: "BASIC" | "STANDARD" | "PRO";
  domains: ResultModel["domains"];
  attempt_id: string;
};

/** 굳은 결과에서 축 상태를 꺼낸다. 없으면 다시 계산할 바탕이 없다 */
async function base(userId: string): Promise<Snap | null> {
  const m = await latestResult(userId);
  if (!m) return null;
  return { core: coreOf(m), tier: m.tier, domains: m.domains, attempt_id: m.attempt_id };
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
  const dd = content(snap.core).domains.domains.find((x) => x.code === d.code);
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
  /* 메워진 자리. 굳은 결과의 빈자리 가운데 **이번 경험으로** 확인까지
     올라간 것.

     **닫을 수 있는 자리만 닫는다**(R30). 전에는 그 축이 확인 이상이기만
     하면 닫았다. 그래서 둘이 틀렸다. 첫째, 검사에서 이미 확인된 축에
     경험을 붙이면 아무것도 올라가지 않았는데도(`moved: false`) 그 축의
     빈자리가 닫히고 할 일이 `done` 으로 바뀌었다. 둘째, `어디까지 직접
     정했는지` 를 묻는 자리(`PARTIAL_EVIDENCE`)가 묻는 것은 소유(OWNED)인데
     **경험으로는 소유가 서지 않는다**(이 파일의 머리말). 그 자리를 확인으로
     닫으면 해 본 것을 직접 정한 것으로 적는 셈이다. 시나리오 B 에서 그
     모양이 났다: 경영전략·기획의 `직접 정한 것` 자리가 경험 하나로 닫혔다 */
  const model = await latestResult(userId);
  const closed = (model?.gaps ?? []).filter((g) => {
    if (!g.axis || g.kind === "PARTIAL_EVIDENCE") return false;
    const c = cands.find((x) => x.domain === g.domain && x.axis === g.axis);
    return !!c && c.moved && RANK[c.after] >= RANK["CONFIRMED"];
  }).map((g) => ({ id: g.id, domain: g.domain, axis: g.axis }));
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
 * 계산한 것을 지금 값에 적는다. **줄의 상태는 건드리지 않는다.**
 *
 * **굳은 결과는 건드리지 않는다.** 쓰는 자리는 `career_profiles` 의 세 칸과
 * `v3_actions` 의 상태뿐이다.
 *
 * 줄을 닫는 일을 여기서 떼어 낸 까닭은, 자동으로 도는 쪽이 **제가 집은
 * 줄만** 닫아야 하기 때문이다. 집지 않은 줄까지 싸잡아 `done` 으로 적으면,
 * 계산이 도는 동안 들어온 새 경험이 **한 번도 세어지지 않은 채로** 처리된
 * 것으로 적힌다.
 */
async function writePlan(userId: string, plan: RecomputePlan): Promise<void> {
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
    [userId, await activeCore(userId), JSON.stringify(levels), JSON.stringify(zones), JSON.stringify(gaps)]);

  /* 메워진 자리의 할 일을 닫는다. **지우지 않는다**: 무엇을 왜 닫았는지가
     기록으로 남아야 다음에 되짚을 수 있다 */
  for (const g of plan.closed_gaps) {
    await query(
      `UPDATE v3_actions SET state='done', done_at=now()
        WHERE user_id=$1 AND core_code=$2 AND state<>'done'
          AND coalesce(td_code,'')=$3 AND coalesce(axis_code,'')=$4`,
      [userId, await activeCore(userId), g.domain, g.axis ?? ""]);
  }

}

/* ── 줄을 집고 닫는다 ──────────────────────────────────────────────── */

/**
 * 다시 계산할 줄을 **한 번에 하나의 흐름만** 집는다(규격 §2).
 *
 * 같은 사람의 줄을 겨냥한 두 요청이 같은 순간에 들어와도 한쪽만 집는다.
 * `status IN ('queued','failed')` 로 거르는 UPDATE 가 같은 줄을 겨냥하므로,
 * 뒤에 온 쪽은 앞쪽이 끝날 때까지 그 줄에서 기다렸다가 **다시 읽는다.**
 * 그때 그 줄은 이미 `running` 이라 조건에서 빠지고 0줄이 집힌다.
 *
 * **멈춘 흐름이 영원히 막지 않는다.** 서버가 중간에 죽으면 `running` 줄이
 * 그대로 남는데, 그 상태로 두면 그 사람은 다시는 자동 반영을 못 받는다.
 * 5분이 지난 `running` 은 멈춘 것으로 보고 다시 집는다.
 */
async function claim(userId: string): Promise<string[]> {
  const rows = await query<{ id: string }>(
    `UPDATE career_events
        SET status='running', started_at=now(), attempts_n=attempts_n+1
      WHERE user_id=$1 AND core_code=$2
        AND (status IN ('queued','failed')
             OR (status='running' AND started_at < now() - interval '5 minutes'))
        AND NOT EXISTS (
          SELECT 1 FROM career_events r
           WHERE r.user_id=$1 AND r.core_code=$2 AND r.status='running'
             AND r.started_at >= now() - interval '5 minutes')
      RETURNING id::text`,
    [userId, await activeCore(userId)]);
  return rows.map((r) => r.id);
}

/** 집은 줄만 닫는다. **까닭을 버리지 않는다**: 실패한 줄은 한 줄을 들고 선다 */
async function finish(ids: string[], ok: boolean, err?: unknown): Promise<void> {
  if (!ids.length) return;
  await query(
    `UPDATE career_events
        SET status=$2, finished_at=now(), last_error=$3
      WHERE id = ANY($1::bigint[])`,
    [ids, ok ? "done" : "failed",
     ok ? null : String((err as Error)?.message ?? err ?? "").slice(0, 500)]);
}

/** 지금 어떤 상태인가. **화면이 짐작하지 않는다**(규격 §2) */
export type RecomputeStatus = {
  /** 돌고 있는 줄이 있는가 */
  running: boolean;
  /** 실패해서 다시 해야 하는 줄의 수 */
  failed: number;
  /** 아직 세어지지 않은 줄의 수(돌고 있는 것 포함) */
  pending: number;
  /** 마지막으로 지금 값에 적은 때 */
  recomputed_at: string | null;
};

export async function recomputeStatus(userId: string): Promise<RecomputeStatus> {
  const core = await activeCore(userId);
  const [ev, prof] = await Promise.all([
    query<{ status: string; n: string }>(
      `SELECT status, count(*)::text AS n FROM career_events
        WHERE user_id=$1 AND core_code=$2 AND status IN ('queued','running','failed')
        GROUP BY status`, [userId, core]),
    queryOne<{ at: string | null }>(
      `SELECT recomputed_at::text AS at FROM career_profiles
        WHERE user_id=$1 AND core_code=$2`, [userId, core]),
  ]);
  const n = (k: string) => Number(ev.find((r) => r.status === k)?.n ?? 0);
  return {
    running: n("running") > 0,
    failed: n("failed"),
    pending: n("queued") + n("running") + n("failed"),
    recomputed_at: prof?.at ?? null,
  };
}

/** 자동 반영이 어떻게 끝났는가. 화면은 이 값만 보고 적는다 */
export type AutoOutcome =
  /** 집어서 끝까지 돌았다 */
  | { state: "done"; plan: RecomputePlan }
  /** 집을 줄이 없었다. 이미 다 세어져 있다 */
  | { state: "nothing" }
  /** 다른 흐름이 돌고 있다. 그쪽이 같은 줄을 센다 */
  | { state: "busy" }
  /** 집었는데 계산이 틀어졌다. **경험은 그대로 있고 다시 할 수 있다** */
  | { state: "failed" };

/**
 * 경험이 저장된 **뒤에** 저절로 돈다(규격 §1).
 *
 * **저장을 막지 않는다.** 부르는 쪽이 이 함수를 `try` 로 감싸고, 여기서
 * 무엇이 틀어져도 적어 둔 경험은 그대로 남는다. 틀어진 줄은 `failed` 로
 * 서고 다음 저장이나 `다시 시도` 가 그 줄을 다시 집는다.
 *
 * **새 엔진을 만들지 않았다.** 집고 닫는 일만 여기 있고, 판단은 전부
 * `previewRecompute()` 와 `writePlan()` 이 하던 그대로다.
 */
export async function autoRecompute(userId: string): Promise<AutoOutcome> {
  const ids = await claim(userId);
  if (!ids.length) {
    const st = await recomputeStatus(userId);
    return st.running ? { state: "busy" } : { state: "nothing" };
  }
  try {
    const plan = await previewRecompute(userId);
    if (!plan.base_attempt_id) {
      /* 바탕이 될 검사 결과가 없다. **줄을 실패로 남기지 않는다**: 고칠
         것이 없는 빨간 줄이 쌓이면 다음부터 아무도 안 본다. 검사를 끝내는
         날 그 결과 위에서 다시 세어야 하므로 집은 줄을 되돌려 둔다 */
      await query(
        `UPDATE career_events SET status='queued', started_at=NULL
          WHERE id = ANY($1::bigint[])`, [ids]);
      return { state: "nothing" };
    }
    await writePlan(userId, plan);
    await finish(ids, true);
    return { state: "done", plan: { ...plan, pending: 0 } };
  } catch (e) {
    /**
     * **줄을 닫는 일까지 실패하면 그 사실을 남긴다.**
     *
     * 전에는 `.catch(() => undefined)` 였다. 닫기가 실패하면 그 줄이
     * `running` 으로 남아 화면이 `돌고 있습니다` 로 서는데, **까닭이
     * 어디에도 없었다.** 5분이 지나면 `claim()` 이 그 줄을 다시 집어
     * 저절로 풀리므로 여기서 던지지는 않는다: 던지면 다시 셀 일 하나가
     * 사람의 화면을 오류로 만들고, 굳은 결과는 어차피 바뀌지 않는다.
     *
     * **돌려주는 것은 전과 같이 `failed` 다.** 바뀐 것은 조용하던 자리에
     * 줄 하나가 남는 것뿐이다(규격 §4).
     */
    try {
      await finish(ids, false, e);
    } catch (e2) {
      opFail({
        operation: "recompute.finish",
        ref: ref("user", userId),
        step: "close",
        category: "db",
        detail: `events=${ids.length}`,
      }, e2);
    }
    return { state: "failed" };
  }
}

/**
 * 사람이 `다시 시도` 를 누를 때 도는 길. 자동과 **같은 자리를 부른다**.
 *
 * 판정을 두 곳에서 하면 어느 날 갈리고, 갈린 날 둘 다 못 믿는다.
 */
export async function applyRecompute(userId: string): Promise<RecomputePlan> {
  const out = await autoRecompute(userId);
  if (out.state === "done") return out.plan;
  if (out.state === "failed") throw new Error("recompute failed");
  /* 집을 줄이 없거나 다른 흐름이 돌고 있다. 그래도 **지금 값은 적는다**:
     부른 사람이 기다리는 것은 줄 처리가 아니라 지금 값이고, 이 계산은 몇
     번을 돌려도 같은 값이 나온다 */
  const plan = await previewRecompute(userId);
  if (plan.base_attempt_id) await writePlan(userId, plan);
  return plan;
}
