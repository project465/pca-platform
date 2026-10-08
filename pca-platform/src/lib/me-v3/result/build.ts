/**
 * 스냅샷을 결과 모델로 옮긴다. **새로운 판단을 하지 않는다.**
 *
 * 묶음도 축 상태도 까닭 코드도 스냅샷이 정한 것을 그대로 쓴다. 여기서
 * 하는 일은 셋뿐이다.
 *
 *   1. 사람이 읽는 차례로 다시 묶는다(먼저 볼 영역 → 왜 → 근거 → 비어
 *      있는 것 → 다음에 할 일).
 *   2. 응시자가 고른 항목을 축에서 꺼내 **그 사람의 답을 돌려준다.**
 *      `적합합니다` 대신 `하중 조건을 직접 정했다` 가 읽히는 자리다.
 *   3. 비어 있는 자리마다 **그 영역의 자료**에서 할 일의 재료를 붙인다.
 *      `경험을 쌓으세요` 를 쓰지 않으려면 재료가 있어야 한다.
 *
 * **한국어를 만들지 않는다.** 응시자가 고른 항목만 한국어이고 그것은
 * 그 사람이 고른 글자다. 문장은 `text.ko.ts` 가 만든다.
 */
import type { Loaded } from "../scoring/engine";
import type {
  Axis, AxisResult, DomainResult, PackContext, Snapshot,
} from "../scoring/types";
import type {
  Action, ActionCode, BasicGroups, CommonView, EvidenceGroup, FirstMove, Gap,
  HeadlineCode, PackView, ResultDomain, ResultModel, TargetView, TranslationView,
} from "./model";
import { RESULT_MODEL_VERSION } from "./version";

const AX: Axis[] = ["J1", "J2", "J3", "J4", "J5", "J6", "J7", "J8"];

/**
 * 영역에 걸치지 않는 판단을 축으로 모은다.
 *
 * 한 축에 문항이 둘 이상인 자리가 있어서(공통 판단과 학위 묶음이 같은 축을
 * 가리킨다) **높은 쪽을 쓴다.** 둘을 더하면 많이 물은 학위가 저절로 높아지고,
 * 그러면 포닥이 박사보다 높게 나온다.
 */
function commonView(rows: Snapshot["context"]["common"]): CommonView {
  const axes: CommonView["axes"] = [];
  for (const ax of AX) {
    const mine = rows.filter((r) => r.axis === ax);
    if (!mine.length) continue;
    axes.push({
      axis: ax,
      owned: mine.some((r) => r.ownership === "DECIDED_USED"),
      confirmed: mine.some((r) => r.confirmed),
      from: mine.map((r) => r.item_id),
    });
  }
  return { axes, blocks: [...new Set(rows.map((r) => r.block))] };
}

/**
 * 고른 항목에서 접두사를 뗀다.
 *
 * `second_item` 은 한 칸에 문항이 둘인 자리에서 **둘 다 확인**이라는
 * 표시지 응시자가 고른 글자가 아니다. 화면에 내보내면 그 사람이 고른 적
 * 없는 말이 자기 답으로 적힌다.
 */
function picksOf(a: AxisResult, kind?: "checklist" | "artifact" | "verify"): string[] {
  return a.evidence_keys
    .filter((k) => k.includes(":"))
    .filter((k) => !kind || k.startsWith(`${kind}:`))
    .map((k) => k.slice(k.indexOf(":") + 1));
}

type DomainData = {
  code: string; name: string; required_axes: Axis[];
  artifacts: string[]; verify_targets: string[];
  workflow?: { step: number; name: string; detail: string }[];
};

/** 영역 사전의 한 걸음. 가운뎃점으로 나열된 자리는 맨 앞 하나만 쓴다 */
function step(d: DomainData | undefined, n: number): string {
  const w = d?.workflow?.find((x) => x.step === n);
  return (w?.detail ?? "").split(" · ")[0].trim();
}

function domainView(d: DomainResult): ResultDomain {
  const axes = AX.map((ax) => ({
    axis: ax,
    state: d.axes[ax].state,
    picks: picksOf(d.axes[ax]),
    evidence: d.axes[ax].evidence,
    from: d.axes[ax].from.map((f) => f.item_id),
    missing: d.axes[ax].missing,
  }));
  const pickIn = (list: Axis[]) =>
    [...new Set(list.flatMap((ax) => picksOf(d.axes[ax])))];
  return {
    code: d.code,
    zone: d.zone,
    opened: d.opened,
    interest: d.interest.band,
    experience: d.experience.label,
    learning: d.learning.band,
    axes,
    did: pickIn(d.confirmed),
    decided: pickIn(d.owned),
    artifacts: picksOf(d.axes.J5, "artifact"),
    verifications: picksOf(d.axes.J6, "verify"),
    confirmed: d.confirmed,
    owned: d.owned,
    empty: d.empty,
    required: d.required,
    reasons: d.reasons,
    next: d.next,
    trace: d.trace,
  };
}

/** 첫 화면 한 줄. **스냅샷의 묶음에서 그대로 읽는다** */
function headlineOf(s: Snapshot): HeadlineCode {
  if (s.zones.Z1_EVIDENCE_ESTABLISHED.length) return "EVIDENCE_READY";
  if (s.zones.Z2_EVIDENCE_INCOMPLETE.length) return "EVIDENCE_PARTIAL";
  if (s.domains.some((d) => d.interest.band === "HIGH")) return "EXPLORING";
  return "NO_EVIDENCE";
}

/**
 * 비어 있는 자리.
 *
 * **급한 차례를 영역 안에서 정한다.** 필수 축이 먼저고(그 영역이 꼭 보는
 * 판단이다), 그다음이 남긴 것, 그다음이 비교다. 산업이나 역할이 더 보는
 * 축은 한 단 올린다: 그 사람이 고른 자리라서 먼저 읽힌다.
 */
function gapsOf(
  s: Snapshot, data: Map<string, DomainData>,
): Gap[] {
  const wanted = new Set<string>();
  for (const p of [s.context.industry, s.context.role]) {
    for (const r of p?.requested_evidence ?? []) wanted.add(`${r.domain}.${r.axis}`);
  }
  const byIndustry = new Set(
    (s.context.industry?.requested_evidence ?? []).map((r) => `${r.domain}.${r.axis}`));

  const out: Gap[] = [];
  /* 먼저 볼 영역과 같이 볼 영역에서만 비어 있는 자리를 적는다. 열두 영역의
     빈칸을 다 적으면 결과지가 빨간 목록이 된다 */
  const scope = [...s.focus, ...s.zones.Z2_EVIDENCE_INCOMPLETE,
    ...s.zones.Z3_EVIDENCE_LOW_INTEREST];
  for (const code of [...new Set(scope)]) {
    const d = s.domains.find((x) => x.code === code);
    if (!d || d.zone === "NOT_EXPLORED") continue;
    /* 여덟 축을 묻지 않은 응시에서 축이 비었다고 적지 않는다. 안 물어본
       것을 `확인되지 않았습니다` 로 적으면 응시자가 자기가 빠뜨린 줄 안다 */
    if (!d.opened.deep) continue;
    const dd = data.get(code);
    /* **한 축에 두 번 적지 않는다.** 필수 축과 산출물·검증이 같은 축을
       가리키면(`J5` · `J6`) 같은 자리가 두 줄로 서고, 거의 같은 할 일이
       두 번 붙는다. 먼저 들어온 쪽이 남는다 */
    const push = (axis: Axis | null, kind: Gap["kind"], why: Gap["why"],
      reason: Gap["reason"], rank: number) => {
      const id = `${code}.${axis ?? kind}`;
      if (out.some((g) => g.id === id)) return;
      out.push({
        id, domain: code, axis, kind, why, reason,
        rank: axis && wanted.has(`${code}.${axis}`) ? rank - 1 : rank,
        action_id: null,
      });
    };
    /* **같은 축이면 구체적인 쪽을 먼저 적는다.** `비교와 검증 경험이
       확인되지 않았습니다` 보다 `무엇과 비교해 확인했는지가 비어 있습니다`
       가 다음에 할 일을 더 또렷하게 만든다. 급한 차례는 그대로다: 그
       영역이 꼭 보는 축이면 1단이고 아니면 2단이다 */
    const req = new Set<Axis>(d.required);
    const tier1 = (ax: Axis) => (req.has(ax) ? 1 : 2);
    if (!d.output_ok) push("J5", "OUTPUT", "BLOCKS_EVIDENCE", "MISSING_OUTPUT", tier1("J5"));
    if (!d.verification_ok) {
      push("J6", "VERIFICATION", "BLOCKS_EVIDENCE", "MISSING_VERIFICATION", tier1("J6"));
    }
    /* 1단. 그 영역이 꼭 보는 판단이 아직 확인되지 않았다 */
    for (const ax of d.required) {
      if (d.confirmed.includes(ax)) continue;
      push(ax, "REQUIRED_AXIS", "REQUIRED_FOR_DOMAIN", "MISSING_REQUIRED_AXIS", 1);
    }
    /* 3단. 반쯤 선 자리다. 산출물은 있는데 근거가 모자라거나, 해 본 것은
       확인됐고 직접 정했다고 보기에는 모자란 축이다 */
    if (d.output_ok && !d.output_evidence_ok) {
      push("J5", "OUTPUT_EVIDENCE", "BLOCKS_EVIDENCE", "MISSING_OUTPUT_EVIDENCE", 3);
    }
    for (const ax of AX) {
      if (!wanted.has(`${code}.${ax}`) || d.confirmed.includes(ax)) continue;
      if (out.some((g) => g.id === `${code}.${ax}`)) continue;
      push(ax, "AXIS",
        byIndustry.has(`${code}.${ax}`) ? "NEEDED_BY_INDUSTRY" : "NEEDED_BY_ROLE",
        "INSUFFICIENT_CONFIRMED_AXES", 3);
    }
    /* 먼저 볼 영역에서 **한 자리만** 적는다. 반쯤 선 축을 다 적으면 잘한
       사람의 결과지가 가장 긴 지적 목록이 된다 */
    if (s.focus.includes(code)) {
      const partial = [...d.required, ...AX]
        .filter((ax) => d.confirmed.includes(ax) && !d.owned.includes(ax))
        .find((ax) => !out.some((g) => g.id === `${code}.${ax}`));
      if (partial) {
        push(partial, "PARTIAL_EVIDENCE", "BLOCKS_EVIDENCE",
          "INSUFFICIENT_CONFIRMED_AXES", 3);
      }
    }
    void dd;
  }
  /**
   * 차례는 **어느 영역인가가 먼저**고, 그다음이 급한 쪽이다.
   *
   * 급한 쪽을 앞에 두었더니 첫 화면의 `가장 먼저 채울 것` 이 관심이 낮은
   * 영역을 가리켰다. 바로 위 칸에는 `먼저 볼 영역` 으로 다른 이름이
   * 적혀 있어서, 두 칸이 서로 다른 곳을 가리켰다. 같은 영역 안에서는
   * 필수 축 → 산출물과 검증 → 반쯤 선 자리 순이다. 끝은 영역 코드로
   * 정해 **같은 스냅샷이 늘 같은 차례**를 내놓게 한다.
   */
  const low = new Set(s.zones.Z3_EVIDENCE_LOW_INTEREST);
  const scopeAt = (c: string) => (s.focus.includes(c) ? 0 : low.has(c) ? 2 : 1);
  return out.sort((a, b) =>
    scopeAt(a.domain) - scopeAt(b.domain) || a.rank - b.rank
    || a.domain.localeCompare(b.domain) || a.id.localeCompare(b.id));
}

/** 비어 있는 자리마다 할 일 하나. **막연한 말을 쓰지 않으려고 재료를 붙인다** */
function actionsOf(
  s: Snapshot, gaps: Gap[], data: Map<string, DomainData>,
): Action[] {
  const out: Action[] = [];
  const lowInterest = new Set(s.zones.Z3_EVIDENCE_LOW_INTEREST);
  /**
   * 언제 할 수 있는 일인가. **급한 차례 대신 할 수 있는 때로 묶는다.**
   *
   * 급한 쪽을 `지금 할 일` 로 적었더니, 그 칸 안에 `다음 과제에서는
   * 결과물을 하나 남겨보세요` 가 들어갔다. 제목과 문장이 서로 다른 때를
   * 가리킨 것이다. 적어 두기만 하면 되는 일은 오늘 할 수 있고, 산출물과
   * 검증은 다음 과제가 있어야 한다.
   */
  const WHEN: Record<ActionCode, Action["horizon"]> = {
    EXPLORE_BROADLY: "NOW", TRY_SHORT_EXPERIENCE: "NOW",
    DEEPEN_OWNERSHIP: "NOW", WRITE_UP: "NOW",
    BUILD_OUTPUT: "NEXT", ADD_VERIFICATION: "NEXT",
    /* 수업은 과제를 기다리지 않는다. `다음 과제에서 교육을 들어보세요`
       는 때를 잘못 적은 말이다 */
    FILL_AXIS: "NEXT", STUDY_NEXT: "NOW",
    RECHECK_DIRECTION: "LATER",
  };
  const add = (
    id: string, domain: string | null, axis: Axis | null, code: ActionCode,
    horizon: Action["horizon"], fromGap: string | null,
  ) => {
    const dd = domain ? data.get(domain) : undefined;
    out.push({
      id, domain, axis, code, horizon, from_gap: fromGap,
      material: {
        artifacts: dd?.artifacts.slice(0, 3) ?? [],
        verify_targets: dd?.verify_targets.slice(0, 3) ?? [],
        checklist_hint: [],
        /* 3 먼저 정하는 것 · 4 쓰는 방법 · 6 내놓는 산출물 · 8 틀렸을 때 */
        workflow: {
          decide: step(dd, 3), method: step(dd, 4),
          output: step(dd, 6), on_fail: step(dd, 8),
        },
      },
    });
  };

  for (const g of gaps) {
    const code: ActionCode = g.kind === "OUTPUT" || g.kind === "OUTPUT_EVIDENCE"
      ? "BUILD_OUTPUT"
      : g.kind === "VERIFICATION" ? "ADD_VERIFICATION"
        /* 확인된 축에 `아직 확인되지 않았습니다` 를 붙이지 않는다 */
        : g.kind === "PARTIAL_EVIDENCE" ? "DEEPEN_OWNERSHIP" : "FILL_AXIS";
    const id = `A.${g.id}`;
    g.action_id = id;
    /* **관심이 낮다고 답한 영역을 `지금 할 일` 로 적지 않는다.** 같은
       결과지에서 `원하는 방향인지 한 번 더 보세요` 와 `지금 이것부터
       하세요` 가 같은 영역에 나란히 섰다 */
    add(id, g.domain, g.axis, code,
      lowInterest.has(g.domain) ? "LATER" : WHEN[code], g.id);
  }

  /* 아직 아무 근거가 없는 사람에게도 방향은 남긴다. 스냅샷의 `next` 를
     그대로 읽고 여기서 새로 판단하지 않는다 */
  for (const d of s.domains) {
    if (d.zone === "NOT_EXPLORED") continue;
    for (const n of d.next) {
      if (n !== "TRY_SHORT_EXPERIENCE" && n !== "STUDY_NEXT" && n !== "RECHECK_DIRECTION") {
        continue;
      }
      const id = `A.${d.code}.${n}`;
      if (out.some((a) => a.id === id)) continue;
      add(id, d.code, null, n, lowInterest.has(d.code) ? "LATER" : WHEN[n], null);
    }
  }
  /* 근거가 다 선 영역. **비어 있는 자리가 없다고 할 일이 없는 것은
     아니다**: 남은 일은 그 근거를 지원서와 면접에서 쓸 문장으로 만드는
     것이고, 그것도 관찰된 사실에서 나온다 */
  if (s.tier_limits.allows_evidence_established) {
    for (const code of s.zones.Z1_EVIDENCE_ESTABLISHED) {
      if (out.some((a) => a.domain === code && a.from_gap)) continue;
      add(`A.${code}.WRITE_UP`, code, null, "WRITE_UP",
        lowInterest.has(code) ? "LATER" : "NOW", null);
    }
  }

  /* 응답만으로 어느 영역도 앞서지 않은 사람. **없는 차례를 지어내지 않고
     그 사실과 함께 할 수 있는 한 걸음을 적는다.** 아무것도 안 적으면
     읽는 사람은 이 검사가 원래 그 정도인 줄 안다 */
  if (!s.focus.length && !out.length) {
    add("A.EXPLORE", null, null, "EXPLORE_BROADLY", "NOW", null);
  }
  /* **차례가 뜻을 가진다.** 관심은 높고 겪은 적이 없는 사람에게 공부를
     먼저 적으면, 해 보기 전에 책부터 사라고 말하는 셈이다 */
  const H = { NOW: 0, NEXT: 1, LATER: 2 };
  const C: Record<ActionCode, number> = {
    /* `한 번 더 볼 것` 묶음에서는 방향을 다시 보라는 말이 맨 앞이다.
       그 말이 뒤에 있으면 앞의 두 줄이 그냥 할 일로 읽힌다 */
    RECHECK_DIRECTION: 0, EXPLORE_BROADLY: 0, TRY_SHORT_EXPERIENCE: 1,
    DEEPEN_OWNERSHIP: 2, WRITE_UP: 3, BUILD_OUTPUT: 4,
    ADD_VERIFICATION: 5, FILL_AXIS: 6, STUDY_NEXT: 7,
  };
  return out.sort((a, b) =>
    H[a.horizon] - H[b.horizon] || C[a.code] - C[b.code] || a.id.localeCompare(b.id));
}

function packView(
  p: PackContext | null, s: Snapshot, all: string[],
): PackView | null {
  if (!p) return null;
  const est = p.domains_in_focus.map((td) => {
    const d = s.domains.find((x) => x.code === td);
    return { domain: td, axes: d?.confirmed ?? [] };
  }).filter((x) => x.axes.length > 0);
  return {
    code: p.code,
    version: p.version,
    explain_order: p.explain_order,
    established: est,
    requested: p.requested_evidence,
    compare_with: p.compare_with,
    vocabulary: p.vocabulary,
    others: all.filter((c) => c !== p.code),
    /* 팩 문항에서 확인된 판단. **Core 축 수준과 섞지 않는다** */
    answered: p.answers.filter((a) => a.confirmed).map((a) => ({
      domain: a.domain, axis: a.axis, owned: a.ownership === "DECIDED_USED",
    })),
  };
}

/**
 * 모델이 스냅샷 밖에서 받는 것.
 *
 * **판정은 하나도 여기서 오지 않는다.** 고를 수 있었던 팩 목록(고르지 않은
 * 나머지를 적으려고)과 번역 열 단계에서 고른 보기(그 사람의 말을 그대로
 * 돌려주려고)뿐이다. 번역 보기는 판정이 아닌 응답이라서 스냅샷이 들고
 * 있지 않고, 그것을 담으려고 채점을 고치지는 않는다.
 */
export type ResultInput = {
  packs?: { industries: string[]; roles: string[] };
  translation?: { item_id: string; choice: string | null }[];
};

export function buildResult(
  s: Snapshot, loaded: Loaded, input: ResultInput = {},
): ResultModel {
  const packs = input.packs ?? { industries: [], roles: [] };
  const data = new Map<string, DomainData>(
    (loaded.domains.domains as unknown as DomainData[]).map((d) => [d.code, d]));

  const domains = s.domains.map(domainView);
  const gaps = gapsOf(s, data);
  const actions = actionsOf(s, gaps, data);

  const group = (want: (d: ResultDomain, ax: Axis) => boolean): EvidenceGroup[] => {
    const out: EvidenceGroup[] = [];
    for (const d of domains) {
      if (d.zone === "NOT_EXPLORED") continue;
      for (const ax of AX) {
        const a = d.axes.find((x) => x.axis === ax)!;
        if (!want(d, ax)) continue;
        out.push({ domain: d.code, axis: ax, state: a.state, picks: a.picks });
      }
    }
    return out;
  };

  /**
   * 첫 화면 세 번째 칸.
   *
   * **깊게 묻지 않은 응시에서 빈자리를 세지 않는다.** 축을 물은 적이 없으니
   * `비어 있는 자리가 없다` 는 참이 아니고, 그 옆 칸에 `관심은 높고 해 본
   * 적이 없다` 가 같이 서면 두 문장이 서로를 부순다.
   */
  const firstMove: FirstMove = !s.tier_limits.deep_axes
    ? "TRY"
    : gaps.length
      ? "FILL_GAP"
      : actions.some((a) => a.code === "WRITE_UP")
        ? "WRITE_UP"
        : actions.length ? "TRY" : "NONE";

  /**
   * 관심과 배울 뜻에서만 묶는다. 근거를 재지 않은 응시다.
   *
   * **묶음(Z1~Z4)을 보지 않는다.** 열두 영역의 관심과 배울 뜻은 첫 표에서
   * 전부 받아 두고, 깊게 묻는 자리만 몇 개를 연다. 묶음을 기준으로 삼으면
   * 열 영역이 `아직 보지 않은 영역` 으로 쓸려 들어가서, 이미 답한 사람의
   * 답이 결과지에서 사라진다. 묻지 않은 것은 **답이 없는 자리**뿐이다.
   */
  const basicGroups: BasicGroups | null = s.tier_limits.deep_axes ? null : (() => {
    const g: BasicGroups = { do_now: [], scan: [], low: [], unseen: [] };
    for (const d of domains) {
      if (d.interest === null) g.unseen.push(d.code);
      else if (d.interest === "HIGH" && d.learning === "HIGH") g.do_now.push(d.code);
      else if (d.interest === "LOW" && d.learning !== "HIGH") g.low.push(d.code);
      else g.scan.push(d.code);
    }
    return g;
  })();

  const confirmedAxes = domains.reduce((n, d) => n + d.confirmed.length, 0);
  const ownedAxes = domains.reduce((n, d) => n + d.owned.length, 0);
  const evidenceItems = domains.reduce(
    (n, d) => n + d.axes.reduce((m, a) => m + a.picks.length, 0), 0);

  return {
    schema: "me-v3-result.1",
    attempt_id: s.attempt_id,
    tier: s.tier,
    stage: s.stage,
    grad_field: s.grad_field,
    provenance: {
      module_versions: s.module_versions,
      result_model_version: RESULT_MODEL_VERSION,
      snapshot_trace: s.trace.length,
    },
    limits: { ...s.tier_limits },
    overview: {
      headline: headlineOf(s),
      focus: s.focus,
      compare: s.zones.Z2_EVIDENCE_INCOMPLETE.filter((c) => !s.focus.includes(c)),
      unclear: s.zones.Z4_INSUFFICIENT_EVIDENCE,
      low_interest: s.zones.Z3_EVIDENCE_LOW_INTEREST,
      not_explored: s.zones.NOT_EXPLORED,
      tied: s.tied,
      /* 고르신 쪽. **없는 영역 코드를 적지 않는다**: 강제 선택의 보기는
         응시 중에 정해지므로 지금 판정에 있는 영역만 남긴다 */
      tied_pick: [...new Set(s.context.forced.map((f) => f.choice))]
        .filter((c) => s.domains.some((d) => d.code === c)),
      counts: {
        domains: s.domains.length,
        confirmed_axes: confirmedAxes,
        owned_axes: ownedAxes,
        evidence_items: evidenceItems,
      },
      top_gap: gaps[0]?.id ?? null,
      top_action: actions[0]?.id ?? null,
      no_basis: s.focus.length === 0 && confirmedAxes === 0,
      first_move: firstMove,
      basic_groups: basicGroups,
    },
    domains,
    evidence: {
      /* 지원서와 면접에서 바로 설명할 수 있는 것: 직접 정한 것으로 확인됐고
         고른 항목이 함께 있다 */
      ready: group((d, ax) => d.owned.includes(ax)
        && (d.axes.find((x) => x.axis === ax)?.picks.length ?? 0) > 0),
      /* 경험은 확인됐고 설명 재료가 아직 모자란 것 */
      partial: group((d, ax) => d.confirmed.includes(ax) && !d.owned.includes(ax)),
      missing: gaps,
    },
    gaps,
    actions,
    industry_context: packView(s.context.industry, s, packs.industries),
    role_context: packView(s.context.role, s, packs.roles),
    /* 번역 열 단계. 고른 보기는 그 사람이 고른 글자고, 단계가 섰다는 것은
       스냅샷이 말한다. 둘을 여기서 맞춰 붙인다 */
    /* 타계열 맥락만 있고 열 단계가 없는 응시도 있다(BASIC 에서는 번역을
       묻지 않는다). 그때도 이 절을 세워야 적어 주신 것이 어디로 갔는지
       보인다 */
    translation: (s.context.translation_steps.length || s.context.xfield.length)
      ? ({
          steps: s.context.translation_steps.map((id) => ({
            item_id: id,
            choice: input.translation?.find((t) => t.item_id === id)?.choice ?? null,
          })),
          domains: s.focus,
          xfield: s.context.xfield,
        } satisfies TranslationView)
      : null,
    common: commonView(s.context.common),
    targets: {
      industries: s.context.industry_interest,
      roles: s.context.role_interest,
      orgs: s.context.org_interest,
      goal: {
        role: s.context.target.TG_ROLE ?? null,
        industry: s.context.target.TG_INDUSTRY ?? null,
        org: s.context.target.TG_OC ?? null,
      },
    } satisfies TargetView,
    response_quality: {
      flag: s.response_quality.flag,
      reasons: s.response_quality.reasons,
    },
  };
}
