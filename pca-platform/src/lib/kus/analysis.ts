/**
 * KUS 학생 한 사람의 분석 묶음. **결과 화면 · 홈 · PDF 가 이 하나를 읽는다.**
 *
 * **새 판정을 만들지 않는다.** 값은 전부 공통 엔진이 굳힌 결과 모델
 * (`v3_snapshots.result_model`)과 그 Core 의 사전·관계표, 결과지가 쓰는
 * 문장 함수(`text.ko.ts`)에서 온다. 여기서 하는 일은 그 값을 KUS 가 받기로
 * 한 여덟 절의 차례로 다시 묶고, 기업탐방 기록을 **판정 밖의 관찰**로 옆에
 * 놓는 것뿐이다. 점수 · 백분위 · 적합도 · 합격 가능성을 만들지 않는다.
 *
 * **세 층을 섞지 않는다.** 검사가 판정한 것(결과 모델) · 학생이 고른
 * 관심(산업·직무) · 탐방에서 본 것(기록). 뒤의 둘로 역량을 확인했다고
 * 적지 않는다.
 *
 * 화면이 셋이라 문장을 세 번 짓지 않으려고 DOM 이 아니라 **값**을 돌려준다.
 */
import {
  domainName, industriesFromDomains, industryChoices, orgChoices, roleName,
  rolesFromDomains,
} from "@/lib/me-v3/runtime/session";
import type { ResultModel } from "@/lib/me-v3/result/model";
import {
  AXIS_KO, AXIS_STATE_SHORT_KO, AXIS_WHAT_KO, actionKo, axisStateKo, draftFrameKo, evidenceStoryKo,
  gapKo, headlineBadgeKo, headlineKo, needKo,
} from "@/lib/me-v3/result/text.ko";
import { REASON_KO } from "@/lib/me-v3/scoring/text.ko";
import { coreFile } from "@/lib/me-v3/core-registry";
import { withJosa } from "@/lib/me-v3/result/josa";
import type { Axis } from "@/lib/me-v3/scoring/types";
import { MODE_KO, type KusMode } from "./program";
import { activityLabel, didSomething, visitDraft, type Visit, type VisitDraft } from "./visits";

export const KUS_ANALYSIS_VERSION = "kus-analysis.2";

export type KusStudentInfo = {
  name: string; university: string; college: string; department: string;
  core: string; coreName: string; mode: KusMode;
  /** 그 학과 자리의 Core 호환 등급(`docs/kus/CORE_COMPAT.md`). 등록부에 없으면 비어 있다 */
  compat?: string;
};

export type KusInput = {
  model: ResultModel;
  student: KusStudentInfo;
  visits: Visit[];
  /** 공통 경험 입력에 적어 둔 경험 제목(있으면). 판정은 결과 모델이 이미 들고 있다 */
  experiences?: { title: string; kind: string; status: string }[];
};

export const ZONE_KO: Record<string, string> = {
  Z1_EVIDENCE_ESTABLISHED: "설명할 근거가 있음",
  Z2_EVIDENCE_INCOMPLETE: "해 봤고 정리가 남음",
  Z3_EVIDENCE_LOW_INTEREST: "근거는 있고 관심이 낮음",
  Z4_INSUFFICIENT_EVIDENCE: "아직 판단할 근거가 적음",
  NOT_EXPLORED: "이번 검사에서 묻지 않음",
};

export const RQ_KO: Record<string, string> = {
  OK: "특이 사항 없음",
  REVIEW: "다시 볼 응답이 있음 · 결과를 읽을 때 함께 봄",
  LOW_VARIANCE: "답이 한 값으로 고르게 모였음 · 결과를 읽을 때 함께 봄",
  INCONSISTENT: "앞뒤가 맞지 않는 응답이 있음 · 결과를 읽을 때 함께 봄",
};

/** 할 일 하나. `done` 은 그 일이 끝났다고 볼 기준이고, 검사 쪽은 그 영역 자료의 결과물 이름에서 온다 */
export type PlanItem = { do: string; done: string; from: "검사" | "탐방" };

type Dom = { code: string; tools: string[]; artifacts: string[] };
type Rel = { td: string; strength: string; axes_watched?: Axis[] };

export type KusAnalysis = {
  version: string;
  student: KusStudentInfo;
  tier: string;
  /** 1. 개인 현황 */
  status: {
    badge: string; title: string; lead: string;
    counts: { confirmed: number; owned: number; evidence: number; ready_domains: number; opened: number };
    quality: { flag: string; text: string };
    demo: boolean;
    /** 공통 결과지가 적는 상태 이름 그대로. `badge` 를 KUS 쪽에서 낮춰 적었을 때도 감추지 않는다 */
    coreBadge: string;
  };
  /**
   * 1-1. 이 결과가 무엇에 기대고 있는가(KUS 화면 층 · 판정은 그대로).
   *
   * 판정은 응답에서 나온다. 그런데 응답으로 `확인` 이 선 칸과 근거 항목이 받친 칸은 다르다.
   * CONTRA 처럼 모든 영역에서 `직접 정했다` 를 고르고 근거를 하나도 고르지 않은 응답은
   * 공통 판정으로 확인 32칸 · `정리만 하면 돼요` 를 받는다. 그 판정을 바꾸지 않고(KUS-CR-04),
   * 그 결과가 **응답에만** 기대고 있다는 것을 같은 무게로 적는다.
   */
  reliability: {
    basis: "SELF_REPORT_ONLY" | "PARTLY_BACKED" | "BACKED";
    label: string;
    lines: { k: string; v: string }[];
    caution: string | null;
  };
  /** 2. 전공·역량 */
  major: {
    rows: { code: string; name: string; zone: string; zoneKo: string; axes: number; owned: number; example: string | null }[];
    notAsked: string[];
    tools: { domain: string; tools: string[] }[];
  };
  /**
   * 2-1. 영역마다 깊이 읽기(리포트 2장). 축 여덟의 상태 · 고른 항목 · 필수 축 가운데 빈 것 ·
   * 그 영역이 사전에 든 도구·결과물 · 그 영역이 중심인 직무. **값은 결과 모델 그대로다.**
   * 사전의 도구·결과물은 `이 학생이 다룬다` 가 아니라 `그 영역이 다루는 것` 으로 적는다.
   */
  deep: {
    code: string; name: string; zone: string; zoneKo: string;
    interest: string | null; experience: string | null;
    axes: { axis: string; name: string; what: string; state: string; stateKo: string; sentence: string; picks: string[]; required: boolean }[];
    chain: { did: string[]; decided: string[]; artifacts: string[]; verifications: string[] };
    missingRequired: string[];
    why: string[];
    dict: { tools: string[]; artifacts: string[] };
    roles: string[];
  }[];
  /** 3. 경험·Evidence */
  evidence: {
    ready: { domain: string; picks: string[] }[];
    partial: { domain: string; picks: string[] }[];
    experiences: { title: string; kind: string; status: string }[];
    visitsObserved: number; visitsDid: number; visitsLinked: number;
  };
  /** 4. 관심 산업·직무 */
  interests: {
    industries: { name: string; from: "PICKED" | "DERIVED" }[];
    roles: { code: string; name: string; from: "PICKED" | "DERIVED" }[];
    orgs: string[];
  };
  /** 5. 직무 요구사항과 Gap */
  link: {
    role: string | null;
    rows: { domain: string; needs: string; state: string; hit: number; all: number; next: string }[];
  };
  gaps: { domains: string; title: string; why: string }[];
  actions: { horizon: "NOW" | "NEXT" | "LATER"; domain: string | null; do: string; note: string | null }[];
  /** 6. 탐방 경험과 직무 연결 */
  visits: {
    id: string; company: string; on: string | null; confirmed: boolean; test: boolean;
    roles: string[]; domains: { name: string; zoneKo: string }[];
    did: string[]; observed: string[]; linked: boolean; understood: string | null; learned: string | null;
    /** 본 것을 내 경험으로 확인하려면 무엇을 해야 하는가. 학생이 이은 영역의 검사 상태에서 나온다 */
    verify: string[];
    draft: VisitDraft;
  }[];
  /** 7. 자기소개서·면접 활용 */
  application: {
    story: { domain: string; action: string; outputs: string[]; application: string; interview: string } | null;
    frame: { label: string; items: string[] }[];
  };
  /** 8. 30·60·90일. 할 일마다 `끝났다고 볼 기준` 을 함께 든다 */
  plan: { d30: PlanItem[]; d60: PlanItem[]; d90: PlanItem[] };
};

const axesOf = (d: { confirmed: string[]; owned: string[] }) =>
  new Set([...d.confirmed, ...d.owned]).size;

/** 응답 · 근거 · 응답 품질 셋을 나란히 적는다. 점수로 합치지 않는다 */
export function reliabilityOf(st: KusAnalysis["status"]): KusAnalysis["reliability"] {
  const c = st.counts;
  const basis = c.evidence === 0 ? "SELF_REPORT_ONLY" : c.ready_domains === 0 || c.owned === 0 ? "PARTLY_BACKED" : "BACKED";
  const label = c.confirmed === 0 ? "아직 확인된 판단이 없는 결과" : basis === "SELF_REPORT_ONLY" ? "응답만으로 선 결과"
    : basis === "PARTLY_BACKED" ? "응답에 근거 항목이 일부 붙은 결과" : "응답과 근거 항목이 함께 받치는 결과";
  const lines = [
    { k: "응답으로 확인된 판단", v: `${c.confirmed}칸` },
    { k: "직접 정했고 근거 둘이 받친 판단", v: `${c.owned}칸` },
    { k: "고른 근거 항목", v: `${c.evidence}개` },
    { k: "근거가 선 영역", v: `${c.ready_domains}개` },
    { k: "응답 품질", v: st.quality.text },
    ...(st.badge !== st.coreBadge || basis === "SELF_REPORT_ONLY" ? [{ k: "공통 결과지의 상태 이름", v: st.coreBadge }] : []),
  ];
  const caution = basis === "SELF_REPORT_ONLY" && c.confirmed > 0
    ? "확인된 칸은 `해 봤다` 는 응답에서 나왔고 근거 항목이 하나도 붙지 않았습니다. 지원서·면접에서 이 결과를 그대로 성과로 쓰지 않습니다. 이 판정 방식은 측정 담당 검토를 요청해 두었습니다(KUS-CR-04)."
    : st.quality.flag !== "OK" ? `응답 품질 표시가 있습니다(${st.quality.text}). 결과를 읽을 때 함께 봅니다.` : null;
  return { basis, label, lines, caution };
}

export function kusAnalysis(x: KusInput): KusAnalysis {
  const { model: m, student } = x;
  const core = student.core;
  const nm = (td: string) => domainName(core, td);
  const h = headlineKo(m, nm);
  const opened = m.domains.filter((d) => d.zone !== "NOT_EXPLORED");
  const evidenced = m.domains.filter((d) => d.confirmed.length || d.owned.length);
  const confirmed = evidenced.map((d) => d.code);
  const byCode = new Map(m.domains.map((d) => [d.code, d]));
  const zoneKo = (td: string) => ZONE_KO[byCode.get(td)?.zone ?? "NOT_EXPLORED"] ?? "";

  let dict = new Map<string, Dom>();
  let rel: { td_role: (Rel & { role: string })[] } = { td_role: [] };
  try {
    dict = new Map(coreFile<{ domains: Dom[] }>(core, "domains").domains.map((d) => [d.code, d]));
    rel = coreFile<{ td_role: (Rel & { role: string })[] }>(core, "relations");
  } catch { /* 사전이 없는 Core 면 그 줄을 세우지 않는다 */ }

  /* 1 */
  const status: KusAnalysis["status"] = {
    badge: headlineBadgeKo(m), title: h.title, lead: h.lead,
    counts: {
      confirmed: m.overview.counts.confirmed_axes, owned: m.overview.counts.owned_axes,
      evidence: m.overview.counts.evidence_items,
      ready_domains: new Set(m.evidence.ready.map((g) => g.domain)).size,
      opened: opened.length,
    },
    quality: { flag: m.response_quality.flag, text: RQ_KO[m.response_quality.flag] ?? RQ_KO.REVIEW },
    demo: student.mode !== "LIVE",
    coreBadge: headlineBadgeKo(m),
  };
  const reliability = reliabilityOf(status);
  /* 근거 항목이 하나도 없는데 확인된 칸이 많으면, 머리에 공통 판정의 상태 이름을 그대로 세우지 않는다.
     **판정을 바꾸는 것이 아니다**: 공통 이름은 `coreBadge` 로 남고 신뢰도 상자가 그것을 적는다 */
  if (reliability.basis === "SELF_REPORT_ONLY" && status.counts.confirmed > 0) {
    status.badge = "근거 확인 전";
    status.title = `응답으로는 ${status.counts.confirmed}칸에서 해 봤다고 답했고, 받쳐 줄 근거 항목은 아직 고르지 않았어요`;
    status.lead = "이 결과는 응답만으로 선 것입니다. 해 본 과제 하나를 골라 무엇을 직접 정했고 무엇이 남았는지 근거로 고르면, 같은 판정을 근거와 함께 설명할 수 있습니다.";
  }

  /* 2 */
  const major: KusAnalysis["major"] = {
    rows: opened.map((d) => ({
      code: d.code, name: nm(d.code), zone: d.zone, zoneKo: ZONE_KO[d.zone] ?? d.zone,
      axes: axesOf(d), owned: d.owned.length, example: d.decided[0] ?? d.did[0] ?? null,
    })),
    notAsked: m.domains.filter((d) => d.zone === "NOT_EXPLORED").map((d) => nm(d.code)),
    tools: (m.overview.focus.length ? m.overview.focus : opened.map((d) => d.code)).slice(0, 3)
      .map((td) => ({ domain: nm(td), tools: (dict.get(td)?.tools ?? []).slice(0, 4) }))
      .filter((t) => t.tools.length),
  };

  /* 2-1 */
  const BAND_KO: Record<string, string> = { HIGH: "관심 높음", MID: "관심 보통", LOW: "관심 낮음" };
  const EXP_KO: Record<string, string> = { NONE: "해 본 적 없음", ONCE_OR_TWICE: "한두 번 해 봄", SEVERAL: "여러 번 해 봄" };
  const deepOrder = [...opened].sort((a, b) => (a.zone > b.zone ? 1 : a.zone < b.zone ? -1 : 0));
  const deep: KusAnalysis["deep"] = deepOrder.slice(0, 4).map((d) => ({
    code: d.code, name: nm(d.code), zone: d.zone, zoneKo: ZONE_KO[d.zone] ?? d.zone,
    interest: d.interest ? BAND_KO[d.interest] ?? null : null,
    experience: d.experience ? EXP_KO[d.experience] ?? null : null,
    axes: d.axes.map((ax) => ({
      axis: ax.axis, name: AXIS_KO[ax.axis], what: AXIS_WHAT_KO[ax.axis], state: ax.state,
      stateKo: AXIS_STATE_SHORT_KO[ax.state], sentence: axisStateKo(ax.axis, ax.state),
      picks: ax.picks.slice(0, 2), required: d.required.includes(ax.axis),
    })),
    chain: {
      did: d.did.slice(0, 3), decided: d.decided.slice(0, 3),
      artifacts: d.artifacts.slice(0, 3), verifications: d.verifications.slice(0, 3),
    },
    missingRequired: d.required.filter((ax) => !d.confirmed.includes(ax) && !d.owned.includes(ax)).map(needKo),
    why: [...new Set(d.reasons.map((r) => REASON_KO[r]).filter(Boolean))].slice(0, 2),
    dict: { tools: (dict.get(d.code)?.tools ?? []).slice(0, 4), artifacts: (dict.get(d.code)?.artifacts ?? []).slice(0, 3) },
    roles: [...new Set(rel.td_role.filter((r) => r.td === d.code && r.strength === "중심").map((r) => roleName(core, r.role)))].slice(0, 3),
  }));

  /* 3 */
  const group = (gs: { domain: string; picks: string[] }[]) => {
    const by = new Map<string, string[]>();
    for (const g of gs) by.set(g.domain, [...new Set([...(by.get(g.domain) ?? []), ...g.picks])]);
    return [...by.entries()].map(([td, picks]) => ({ domain: nm(td), picks: picks.slice(0, 4) }));
  };
  const evidence: KusAnalysis["evidence"] = {
    ready: group(m.evidence.ready), partial: group(m.evidence.partial),
    experiences: (x.experiences ?? []).slice(0, 6),
    visitsObserved: x.visits.length,
    visitsDid: x.visits.filter(didSomething).length,
    visitsLinked: x.visits.filter((v) => v.experience_id).length,
  };

  /* 4. 학생이 고른 것과 확인된 판단에서 이어진 것을 갈라 적는다 */
  const indName = new Map(industryChoices(core).map((v) => [v.code, v.name]));
  const orgName = new Map(orgChoices(core).map((v) => [v.code, v.name]));
  const derivedRoles = confirmed.length ? rolesFromDomains(core, confirmed).map((r) => r.code) : [];
  const derivedInd = confirmed.length ? industriesFromDomains(core, confirmed).map((r) => r.code) : [];
  const interests: KusAnalysis["interests"] = {
    industries: [
      ...m.targets.industries.map((c) => ({ name: indName.get(c) ?? c, from: "PICKED" as const })),
      ...derivedInd.filter((c) => !m.targets.industries.includes(c)).slice(0, 3)
        .map((c) => ({ name: indName.get(c) ?? c, from: "DERIVED" as const })),
    ],
    roles: [
      ...m.targets.roles.map((c) => ({ code: c, name: roleName(core, c), from: "PICKED" as const })),
      ...derivedRoles.filter((c) => !m.targets.roles.includes(c)).slice(0, 3)
        .map((c) => ({ code: c, name: roleName(core, c), from: "DERIVED" as const })),
    ],
    orgs: m.targets.orgs.map((c) => orgName.get(c) ?? c),
  };

  /* 5. 역할 하나를 골라 그 역할의 중심 영역마다 필요한 판단 · 학생 상태 · 다음 할 일 */
  const roleSet = interests.roles.map((r) => r.code);
  const centerOf = (role: string) =>
    rel.td_role.filter((r) => r.role === role && r.strength === "중심");
  const focusRole = roleSet.find((r) => centerOf(r).some((t) => confirmed.includes(t.td))) ?? roleSet[0] ?? null;
  const link: KusAnalysis["link"] = {
    role: focusRole ? roleName(core, focusRole) : null,
    rows: focusRole ? centerOf(focusRole).map((r) => {
      const d = byCode.get(r.td);
      const all = r.axes_watched ?? [];
      const hit = d ? all.filter((a) => d.confirmed.includes(a) || d.owned.includes(a)) : [];
      const miss = all.filter((a) => !hit.includes(a));
      const act = m.actions.find((a) => a.domain === r.td);
      return {
        domain: nm(r.td), needs: all.map(needKo).join(" · "),
        state: d && d.zone !== "NOT_EXPLORED" ? `${ZONE_KO[d.zone]} · 확인 ${axesOf(d)}칸` : "이번 검사에서 묻지 않음",
        hit: hit.length, all: all.length,
        next: act ? actionKo(act, nm(r.td), m.stage).do
          : miss.length ? `${needKo(miss[0])}부터 적을 경험 하나` : "정리해 둔 근거를 지원서 문장으로",
      };
    }) : [],
  };

  /* 같은 까닭의 빈자리는 한 줄로 묶는다. 묶기만 하고 줄이지 않는다 */
  const gb = new Map<string, { title: string; why: string; d: string[] }>();
  for (const g of m.gaps) {
    const t = gapKo(g, "");
    const k = `${t.title}|${t.why}`;
    const e = gb.get(k) ?? { title: t.title.replace(/^\s*·\s*/, ""), why: t.why, d: [] };
    if (!e.d.includes(nm(g.domain))) e.d.push(nm(g.domain));
    gb.set(k, e);
  }
  const gaps = [...gb.values()].slice(0, 6).map((e) => ({ domains: e.d.join(" / "), title: e.title, why: e.why }));

  const actions = m.actions.slice(0, 9).map((a) => {
    const t = actionKo(a, a.domain ? nm(a.domain) : "", m.stage);
    return { horizon: a.horizon, domain: a.domain ? nm(a.domain) : null, do: t.do, note: t.note ?? null };
  });

  /* 6. 탐방은 학생이 이은 영역의 **검사 상태**를 옆에 놓을 뿐 바꾸지 않는다 */
  const visits: KusAnalysis["visits"] = x.visits.map((v) => ({
    id: v.id, company: v.company_name, on: v.visited_on, confirmed: v.confirmed, test: v.is_test,
    roles: [...v.role_codes.map((c) => roleName(core, c)), ...(v.role_text ? [v.role_text] : [])],
    domains: v.td_codes.map((td) => ({ name: nm(td), zoneKo: zoneKo(td) })),
    did: v.activities.filter((a) => ["HANDS_ON", "TASK", "PRESENT"].includes(a)).map(activityLabel),
    observed: v.activities.filter((a) => !["HANDS_ON", "TASK", "PRESENT"].includes(a)).map(activityLabel),
    linked: Boolean(v.experience_id), understood: v.understood, learned: v.learned,
    verify: v.td_codes.map((td) => {
      const d = byCode.get(td);
      if (!d || d.zone === "NOT_EXPLORED") return `${nm(td)}: 이번 검사에서 묻지 않은 영역이라 탐방만으로는 확인되지 않습니다. 직접 해 본 과제가 생기면 다음 검사에서 답합니다`;
      const miss = d.required.filter((ax) => !d.confirmed.includes(ax) && !d.owned.includes(ax));
      return miss.length
        ? `${nm(td)}: 검사에서 ${withJosa(needKo(miss[0]), "이가")} 아직 비어 있습니다. 탐방에서 본 그 판단을 과제 하나에서 직접 해 보고 근거로 고릅니다`
        : `${nm(td)}: 검사에서 이미 근거가 선 영역입니다. 탐방에서 본 장면을 그 근거 옆에 한 줄로 덧붙입니다`;
    }),
    draft: visitDraft(core, v),
  }));

  /* 7 */
  const lead = opened.find((d) => d.decided.length || d.did.length) ?? null;
  const st = lead ? evidenceStoryKo(core, lead.code, {
    did: lead.did[0], decided: lead.decided[0], artifacts: lead.artifacts, verifications: lead.verifications,
  }, "lead", nm(lead.code)) : null;
  const application: KusAnalysis["application"] = {
    story: st ? { domain: st.domain, action: st.action, outputs: st.outputs, application: st.application, interview: st.interview } : null,
    frame: m.translation ? draftFrameKo(m.translation.steps).map((f) => ({ label: f.label, items: f.items })) : [],
  };

  /* 8. 때는 결과 모델이 정한 것(NOW · NEXT · LATER)을 30 · 60 · 90 일로 옮긴다.
        탐방 쪽 할 일은 기록의 상태에서만 나온다 */
  const doneOf = (a: ResultModel["actions"][number]): string => {
    const art = a.material?.artifacts?.[0];
    return art
      ? `${withJosa(art, "이가")} 한 벌 남고, 다음 검사에서 그것을 근거로 고를 수 있으면`
      : "적은 기록이 남고, 다음 검사에서 그것을 근거로 고를 수 있으면";
  };
  const by = (hz: string): PlanItem[] => m.actions.slice(0, 9).filter((a) => a.horizon === hz).slice(0, 3).map((a) => {
    const t = actionKo(a, a.domain ? nm(a.domain) : "", m.stage);
    return { do: `${a.domain ? `${nm(a.domain)} — ` : ""}${t.do}`, done: doneOf(a), from: "검사" as const };
  });
  const d30 = by("NOW");
  const d60 = by("NEXT");
  const d90 = by("LATER");
  const unlinked = x.visits.filter((v) => didSomething(v) && !v.experience_id);
  const tv = (t: string, done: string): PlanItem => ({ do: t, done, from: "탐방" });
  if (!x.visits.length) d30.push(tv("기업탐방을 다녀오면 그날 안에 탐방 기록을 남기기(관찰한 직무 · 이해한 것 · 직접 한 활동)", "탐방 기록 1건이 저장되면"));
  for (const v of unlinked.slice(0, 2)) d30.push(tv(`${v.company_name} 탐방에서 직접 해 본 활동을 공통 경험 입력으로 옮기기`, "그 경험이 탐방 기록과 이어지고 다음 반영에서 판정에 들어가면"));
  const obsOnly = x.visits.filter((v) => !didSomething(v));
  if (obsOnly.length) d60.push(tv(`${obsOnly[0].company_name} 탐방에서 본 판단 하나를 수업·프로젝트에서 직접 해 보기`, "그 과제에서 직접 정한 것 하나와 남은 결과물 하나를 경험으로 적으면"));
  if (x.visits.length) d90.push(tv("탐방 기록과 경험을 묶어 자기소개서 한 문단 · 면접 답 하나 · 포트폴리오 한 쪽으로 정리하기", "세 벌이 다 있고, 수치·기간·결과를 직접 채웠으면"));
  if (!d90.length) d90.push(tv("다시 검사해 지금 상태가 어떻게 달라졌는지 보기", "새 결과에서 근거가 선 영역이 지금과 견줄 수 있게 남으면"));

  return {
    version: KUS_ANALYSIS_VERSION, student, tier: m.tier,
    status, reliability, major, deep, evidence, interests, link, gaps, actions, visits, application,
    plan: { d30, d60, d90 },
  };
}

export const MODE_NOTE: Record<KusMode, string | null> = {
  LIVE: null,
  DEMO: `${MODE_KO.DEMO}: 이 학과의 검사는 전공자 검수 전입니다. 결과를 학생 진단으로 쓰지 않습니다.`,
  PREPARING: `${MODE_KO.PREPARING}: 이 학과는 아직 검사가 열리지 않았습니다.`,
};

/** 학과 Core 가 없는 학생에게 거는 한 줄. 다른 전공 검사로 대신 재지 않는다는 것을 함께 적는다 */
export const UNSUPPORTED_NOTE =
  "검사 이용 불가: 이 학과의 전공 기준이 아직 없어 검사 결과를 내지 않습니다. 다른 전공 검사로 대신 재지 않습니다. 계정과 기업탐방 기록은 그대로 쓸 수 있습니다.";
