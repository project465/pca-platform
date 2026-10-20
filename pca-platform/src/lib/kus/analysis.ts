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
  actionKo, draftFrameKo, evidenceStoryKo, gapKo, headlineBadgeKo, headlineKo, needKo,
} from "@/lib/me-v3/result/text.ko";
import { coreFile } from "@/lib/me-v3/core-registry";
import type { Axis } from "@/lib/me-v3/scoring/types";
import { MODE_KO, type KusMode } from "./program";
import { activityLabel, didSomething, visitDraft, type Visit, type VisitDraft } from "./visits";

export const KUS_ANALYSIS_VERSION = "kus-analysis.1";

export type KusStudentInfo = {
  name: string; university: string; college: string; department: string;
  core: string; coreName: string; mode: KusMode;
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
  };
  /** 2. 전공·역량 */
  major: {
    rows: { code: string; name: string; zone: string; zoneKo: string; axes: number; owned: number; example: string | null }[];
    notAsked: string[];
    tools: { domain: string; tools: string[] }[];
  };
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
    draft: VisitDraft;
  }[];
  /** 7. 자기소개서·면접 활용 */
  application: {
    story: { domain: string; action: string; outputs: string[]; application: string; interview: string } | null;
    frame: { label: string; items: string[] }[];
  };
  /** 8. 30·60·90일 */
  plan: { d30: string[]; d60: string[]; d90: string[] };
};

const axesOf = (d: { confirmed: string[]; owned: string[] }) =>
  new Set([...d.confirmed, ...d.owned]).size;

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
  };

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
  const by = (hz: string) => actions.filter((a) => a.horizon === hz)
    .map((a) => `${a.domain ? `${a.domain} — ` : ""}${a.do}`).slice(0, 3);
  const d30 = by("NOW");
  const d60 = by("NEXT");
  const d90 = by("LATER");
  const unlinked = x.visits.filter((v) => didSomething(v) && !v.experience_id);
  if (!x.visits.length) d30.push("기업탐방을 다녀오면 그날 안에 탐방 기록을 남기기(관찰한 직무 · 이해한 것 · 직접 한 활동)");
  for (const v of unlinked.slice(0, 2)) d30.push(`${v.company_name} 탐방에서 직접 해 본 활동을 경험으로 옮겨 판정 받기`);
  const obsOnly = x.visits.filter((v) => !didSomething(v));
  if (obsOnly.length) d60.push(`${obsOnly[0].company_name} 탐방에서 본 판단 하나를 수업·프로젝트에서 직접 해 보고 경험으로 기록하기`);
  if (x.visits.length) d90.push("탐방 기록과 경험을 묶어 자기소개서 한 문단 · 면접 답 하나 · 포트폴리오 한 쪽으로 정리하기");
  if (!d90.length) d90.push("다시 검사해 지금 상태가 어떻게 달라졌는지 보기");

  return {
    version: KUS_ANALYSIS_VERSION, student, tier: m.tier,
    status, major, evidence, interests, link, gaps, actions, visits, application,
    plan: { d30, d60, d90 },
  };
}

export const MODE_NOTE: Record<KusMode, string | null> = {
  LIVE: null,
  DEMO: `${MODE_KO.DEMO}: 이 학과의 검사는 전공자 검수 전입니다. 결과를 학생 진단으로 쓰지 않습니다.`,
  PREPARING: `${MODE_KO.PREPARING}: 이 학과는 아직 검사가 열리지 않았습니다.`,
};
