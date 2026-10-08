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
  Action, ActionCode, EvidenceGroup, Gap, HeadlineCode, PackView,
  ResultDomain, ResultModel, TranslationView,
} from "./model";
import { RESULT_MODEL_VERSION } from "./version";

const AX: Axis[] = ["J1", "J2", "J3", "J4", "J5", "J6", "J7", "J8"];

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
};

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
    const push = (axis: Axis | null, kind: Gap["kind"], why: Gap["why"],
      reason: Gap["reason"], rank: number) => {
      out.push({
        id: `${code}.${axis ?? kind}`, domain: code, axis, kind, why, reason,
        rank: axis && wanted.has(`${code}.${axis}`) ? rank - 1 : rank,
        action_id: null,
      });
    };
    for (const ax of d.required) {
      if (d.confirmed.includes(ax)) continue;
      push(ax, "REQUIRED_AXIS", "REQUIRED_FOR_DOMAIN", "MISSING_REQUIRED_AXIS", 2);
    }
    if (!d.output_ok) push("J5", "OUTPUT", "BLOCKS_EVIDENCE", "MISSING_OUTPUT", 3);
    else if (!d.output_evidence_ok) {
      push("J5", "OUTPUT_EVIDENCE", "BLOCKS_EVIDENCE", "MISSING_OUTPUT_EVIDENCE", 4);
    }
    if (!d.verification_ok) push("J6", "VERIFICATION", "BLOCKS_EVIDENCE", "MISSING_VERIFICATION", 4);
    for (const ax of AX) {
      if (!wanted.has(`${code}.${ax}`) || d.confirmed.includes(ax)) continue;
      if (out.some((g) => g.id === `${code}.${ax}`)) continue;
      push(ax, "AXIS",
        byIndustry.has(`${code}.${ax}`) ? "NEEDED_BY_INDUSTRY" : "NEEDED_BY_ROLE",
        "INSUFFICIENT_CONFIRMED_AXES", 3);
    }
    void dd;
  }
  /* 차례는 급한 쪽 · 먼저 볼 영역 · 영역 코드 순이다. 같은 급이면 영역
     코드로 정해 **같은 스냅샷이 늘 같은 차례**를 내놓게 한다 */
  const focusAt = (c: string) => (s.focus.includes(c) ? 0 : 1);
  return out.sort((a, b) =>
    a.rank - b.rank || focusAt(a.domain) - focusAt(b.domain)
    || a.domain.localeCompare(b.domain) || a.id.localeCompare(b.id));
}

/** 비어 있는 자리마다 할 일 하나. **막연한 말을 쓰지 않으려고 재료를 붙인다** */
function actionsOf(
  s: Snapshot, gaps: Gap[], data: Map<string, DomainData>,
): Action[] {
  const out: Action[] = [];
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
      },
    });
  };

  for (const g of gaps) {
    const code: ActionCode = g.kind === "OUTPUT" || g.kind === "OUTPUT_EVIDENCE"
      ? "BUILD_OUTPUT"
      : g.kind === "VERIFICATION" ? "ADD_VERIFICATION" : "FILL_AXIS";
    const id = `A.${g.id}`;
    g.action_id = id;
    add(id, g.domain, g.axis, code, g.rank <= 2 ? "NOW" : "NEXT", g.id);
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
      add(id, d.code, null, n, n === "RECHECK_DIRECTION" ? "LATER" : "NOW", null);
    }
  }
  /* 근거가 다 선 영역. **비어 있는 자리가 없다고 할 일이 없는 것은
     아니다**: 남은 일은 그 근거를 지원서와 면접에서 쓸 문장으로 만드는
     것이고, 그것도 관찰된 사실에서 나온다 */
  if (s.tier_limits.allows_evidence_established) {
    for (const code of s.zones.Z1_EVIDENCE_ESTABLISHED) {
      if (out.some((a) => a.domain === code && a.from_gap)) continue;
      add(`A.${code}.WRITE_UP`, code, null, "WRITE_UP", "NEXT", null);
    }
  }

  /* 응답만으로 어느 영역도 앞서지 않은 사람. **없는 차례를 지어내지 않고
     그 사실과 함께 할 수 있는 한 걸음을 적는다.** 아무것도 안 적으면
     읽는 사람은 이 검사가 원래 그 정도인 줄 안다 */
  if (!s.focus.length && !out.length) {
    add("A.EXPLORE", null, null, "EXPLORE_BROADLY", "NOW", null);
  }
  const H = { NOW: 0, NEXT: 1, LATER: 2 };
  return out.sort((a, b) => H[a.horizon] - H[b.horizon] || a.id.localeCompare(b.id));
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
  };
}

/**
 * 모델이 스냅샷 밖에서 받는 것.
 *
 * **판정은 하나도 여기서 오지 않는다.** 고를 수 있었던 팩 목록(고르지 않은
 * 나머지를 적으려고)과 번역 열 단계에서 고른 보기(그 사람의 말을 그대로
 * 돌려주려고)뿐이다. 번역 보기는 응답이지 판정이 아니라서 스냅샷이 들고
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
      counts: {
        domains: s.domains.length,
        confirmed_axes: confirmedAxes,
        owned_axes: ownedAxes,
        evidence_items: evidenceItems,
      },
      top_gap: gaps[0]?.id ?? null,
      top_action: actions[0]?.id ?? null,
      no_basis: s.focus.length === 0 && confirmedAxes === 0,
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
    translation: s.context.translation_steps.length
      ? ({
          steps: s.context.translation_steps.map((id) => ({
            item_id: id,
            choice: input.translation?.find((t) => t.item_id === id)?.choice ?? null,
          })),
          domains: s.focus,
        } satisfies TranslationView)
      : null,
    response_quality: {
      flag: s.response_quality.flag,
      reasons: s.response_quality.reasons,
    },
  };
}
