/**
 * 전주대학교 부트캠프 학생 한 사람의 리포트.
 *
 * **새 판정을 만들지 않는다.** 아홉 절의 값은 전부 공통 엔진이 굳혀 둔
 * 결과 모델(`v3_snapshots.result_model`)과 결과지가 쓰는 문장 함수
 * (`text.ko.ts`)와 문항 커버리지(`coverage.ts`)에서 오고, 여기서 하는 일은
 * 그 값을 사업단이 받기로 한 차례로 다시 묶는 것뿐이다. 점수 · 백분위 ·
 * 적합도 · 합격 가능성을 만들지 않는다.
 *
 * **세 층을 섞지 않는다**(R2 Track B). 검사가 판정 문항으로 직접 잰 것 ·
 * 학생이 스스로 고른 근거 · 공식 교육과정이 다루지만 문항이 없는 것.
 * 마지막 둘로 역량을 확인했다고 적지 않는다.
 *
 * **근거가 없는 연결을 적지 않는다**(R2 Track C). 이어 볼 일과 산업은 확인된
 * 판단이 있는 영역에서만 끌어오고, 그런 영역이 없으면 비어 있다고 적는다.
 * 전에는 `먼저 볼 영역` 으로 떨어져 근거 없이도 줄이 섰다.
 *
 * **기업을 추천하지 않는다.** 직업정보제공사업 신고로 할 수 있는 것은
 * 정보 제공까지이고(CLAUDE.md 법적 범위), 지역 기업 자료는 아직 0줄이다.
 *
 * **공통 PDF 엔진을 고치지 않는다.** 이 묶음은 그 자체로 한 벌의 HTML 이고
 * 종이는 `report-pdf.ts` 가 따로 뽑는다(공통 `drawResultPdf` 는 결과 주소를
 * 못 박고 있어 학교 묶음을 그릴 수 없다 — 요청 C9).
 */
import {
  domainName, industriesFromDomains, industryChoices, orgChoices, roleName,
  rolesFromDomains,
} from "@/lib/me-v3/runtime/session";
import type { Gap, ResultModel } from "@/lib/me-v3/result/model";
import {
  actionKo, draftFrameKo, evidenceStoryKo, gapKo, headlineBadgeKo,
  headlineKo, needKo,
} from "@/lib/me-v3/result/text.ko";
import { coreFile } from "@/lib/me-v3/core-registry";
import type { Axis } from "@/lib/me-v3/scoring/types";
import type { OfficialProgram } from "@/lib/jju/program";
import { answeredIn, CAP_STATUS_KO, type CapCell } from "@/lib/jju/coverage";

export const JJU_REPORT_VERSION = "jju-report.4";

export type JjuReportInput = {
  model: ResultModel;
  core: string;
  student: { name: string; track: string; cohort: string; field: string; spec: string | null };
  program: OfficialProgram | null;
  /** 그 트랙이 어디까지 실제로 열린 검사인가. `DEMO` 면 결과를 진단으로 쓰지 않는다 */
  mode: "LIVE" | "DEMO" | "PREPARING";
  /** 그 Core 의 AI 역량 커버리지(`coverageOf`) */
  coverage: CapCell[];
  /** 이 응시에서 답한 문항 번호. 측정된 역량 가운데 **실제로 받은 문항**만 센다 */
  answered: string[];
  /**
   * 전북·전국의 산업·정책 사실(`docs/jju/r3/data/fact-register.csv` 에서 고른 것).
   * 출처 URL 과 확인 방식이 함께 온다. **없으면 그 줄을 세우지 않는다.**
   */
  region?: RegionFact[];
};

export type RegionFact = {
  id: string; claim: string; status: "FACT" | "INTERPRETATION" | "RECOMMENDATION";
  url: string; how: string; tracks: string[];
};

type Line = { k?: string; v: string; muted?: boolean };
type Table = { head: string[]; rows: string[][]; statusCol?: number };
export type Section = { no: number; title: string; lead?: string; lines: Line[]; table?: Table };

/** 확인된 축의 수. `owned` 는 `confirmed` 의 부분집합이라 더하면 두 번 센다(R2 에서 `10칸` 이 섰다) */
const axesOf = (d: { confirmed: string[]; owned: string[] }) => new Set([...d.confirmed, ...d.owned]).size;

/** 응답 품질 코드를 종이에 그대로 찍지 않는다 */
const RQ_KO: Record<string, string> = {
  OK: "특이 사항 없음",
  REVIEW: "다시 볼 응답이 있음",
  LOW_VARIANCE: "답이 한 값으로 고르게 모였음 · 결과를 읽을 때 함께 봄",
  INCONSISTENT: "앞뒤가 맞지 않는 응답이 있음 · 결과를 읽을 때 함께 봄",
};

const ZONE_KO: Record<string, string> = {
  Z1_EVIDENCE_ESTABLISHED: "설명할 근거가 있음",
  Z2_EVIDENCE_INCOMPLETE: "해 봤고 정리가 남음",
  Z3_EVIDENCE_LOW_INTEREST: "근거는 있고 관심이 낮음",
  Z4_INSUFFICIENT_EVIDENCE: "아직 판단할 근거가 적음",
};

/**
 * 같은 까닭의 빈자리를 한 줄로. 결과 모델은 영역마다 한 줄씩 내는데 까닭이
 * 같으면 같은 문장이 네 번 선다(요청 C13). 묶기만 하고 줄이지 않는다.
 */
function groupGaps(gaps: Gap[], nm: (td: string) => string): Line[] {
  const by = new Map<string, { why: string; title: string; domains: string[] }>();
  for (const g of gaps) {
    const t = gapKo(g, "");
    const key = `${t.title}|${t.why}`;
    const e = by.get(key) ?? { why: t.why, title: t.title.replace(/^\s*·\s*/, ""), domains: [] };
    if (!e.domains.includes(nm(g.domain))) e.domains.push(nm(g.domain));
    by.set(key, e);
  }
  return [...by.values()].slice(0, 5).map((e) => ({ k: e.domains.join(" / "), v: `${e.title} — ${e.why}` }));
}

export function buildJjuReport(x: JjuReportInput): Section[] {
  const { model: m, core } = x;
  const nm = (td: string) => domainName(core, td);
  const h = headlineKo(m, nm);
  const opened = m.domains.filter((d) => d.zone !== "NOT_EXPLORED");
  const evidenced = m.domains.filter((d) => d.confirmed.length || d.owned.length);
  const confirmed = evidenced.map((d) => d.code);
  const ind = new Map(industryChoices(core).map((v) => [v.code, v.name]));
  const org = new Map(orgChoices(core).map((v) => [v.code, v]));
  const S: Section[] = [];
  const first = opened.find((d) => d.code === m.overview.focus[0]) ?? opened[0];
  const sample = first?.decided[0] ?? first?.did[0];

  /* 1. 요약. 결과지의 이끄는 줄은 묶음마다 하나라 같은 묶음 학생에게 같은
        문장이 나간다(요청 C12). 여기서는 그 자리에 그 학생이 고른 답을 둔다 */
  S.push({ no: 1, title: "개인 진단 요약", lead: h.title, lines: [
    { k: "트랙", v: `${x.student.track} · ${x.student.field}${x.student.spec ? ` · 검사 갈래 ${x.student.spec}` : ""} · ${x.student.cohort}` },
    { k: "지금 상태", v: headlineBadgeKo(m) },
    ...(sample && first ? [{ k: "응답에서 확인된 예", v: `${nm(first.code)} — ${sample}` }] : []),
    { k: "먼저 볼 영역", v: m.overview.focus.map(nm).join(" / ") || "아직 앞선 영역이 없습니다" },
    { k: "가진 것", v: evidenced.length ? `${evidenced.map((d) => nm(d.code)).slice(0, 3).join(" / ")}에서 확인된 판단이 있습니다` : "확인된 판단이 있는 영역이 아직 없습니다" },
    { k: "비어 있는 것", v: m.gaps[0] ? `${nm(m.gaps[0].domain)} — ${gapKo(m.gaps[0], "").title.replace(/^\s*·\s*/, "")}` : "결과 모델이 적은 빈자리가 없습니다" },
    { k: "다음 한 가지", v: m.actions[0] ? actionKo(m.actions[0], m.actions[0].domain ? nm(m.actions[0].domain) : "", m.stage).do : "결과 모델이 낸 할 일이 없습니다" },
    { k: "센 수", v: `확인된 판단 ${m.overview.counts.confirmed_axes}칸 · 직접 정한 것 ${m.overview.counts.owned_axes}칸 · 고른 근거 ${m.overview.counts.evidence_items}개 (점수가 아니라 센 수입니다)` },
    ...(x.mode !== "LIVE" ? [{ v: "이 트랙의 검사는 전공자 검수 전 시연 전용입니다. 이 리포트를 학생 진단이나 사업 성과로 쓰지 않습니다.", muted: true }] : []),
  ] });

  type Dom = { code: string; tools: string[]; artifacts: string[]; verify_targets: string[];
    org_outcomes: Record<string, string>; workflow: { step: number; name: string; detail: string }[] };
  type Rel = { td: string; strength: string; axes_watched?: Axis[]; dimensions?: string[] };
  const dict = new Map(coreFile<{ domains: Dom[] }>(core, "domains").domains.map((d) => [d.code, d]));
  const rel = coreFile<{ td_role: (Rel & { role: string })[]; td_industry: (Rel & { industry: string })[] }>(core, "relations");
  /* 2. 전공 영역은 검사가 잰 것, AI 역량은 세 층으로 */
  const capRows = x.coverage.map((c) => {
    const got = answeredIn(c, x.answered);
    const how = c.status === "MEASURED"
      ? (got.length ? `이 응시에서 판정 문항 ${got.length}개에 답함`
        /* Core 에 없고 팩에만 있으면 그 산업·직무를 고른 사람만 받는다. `측정` 한 마디로 두면
           모든 학생이 재어지는 것으로 읽힌다 */
        : !c.core.length ? "그 산업·직무 팩을 고른 사람만 받음 · 이 응시는 받지 않음"
        : "문항은 있으나 이 응시에서 받지 않음")
      : c.status === "SELF_REPORT" ? "고르는 근거 문구에만 있음 · 판정 밖"
      : c.status === "CURRICULUM" ? "공식 과정이 다룸 · 문항 없음"
      : "어디에도 없음";
    return [c.cap.name, c.status === "MEASURED" && !c.core.length ? "측정(팩만)" : CAP_STATUS_KO[c.status], how];
  });
  S.push({ no: 2, title: "전공·AI 지식과 실무역량", lead: "전공 영역은 검사가 판정한 상태이고, AI 역량은 문항이 있는가에 따라 세 층으로 나눕니다.", lines: [
    ...opened.map((d) => ({
      k: nm(d.code),
      v: `${ZONE_KO[d.zone] ?? d.zone} · 확인된 판단 ${axesOf(d)}칸(직접 정함 ${d.owned.length})${d.decided[0] ?? d.did[0] ? ` · 예: ${d.decided[0] ?? d.did[0]}` : ""}`,
    })),
    ...(() => {
      const tds = (m.overview.focus.length ? m.overview.focus : opened.map((d) => d.code)).slice(0, 3);
      const t = tds.map((td) => `${nm(td)}: ${(dict.get(td)?.tools ?? []).slice(0, 4).join("·") || "—"}`);
      return t.length ? [{ k: "그 영역에서 쓰는 도구", v: `${t.join(" / ")} (그 Core 사전 · 이 학생이 다룬다는 뜻이 아님)`, muted: true }] : [];
    })(),
  ], table: { head: ["AI 역량", "이 검사에서", "이 학생"], rows: capRows, statusCol: 1 } });

  /* ── 3~10. Gold Master 구조. 값은 전부 결과 모델 · 그 Core 의 사전과 관계표 · 사업 사실에서 온다 ── */
  const byCode = new Map(m.domains.map((d) => [d.code, d]));
  const stateOf = (td: string) => {
    const d = byCode.get(td);
    if (!d || d.zone === "NOT_EXPLORED") return "이번 검사에서 묻지 않음";
    return `${ZONE_KO[d.zone] ?? d.zone} · 확인 ${axesOf(d)}칸`;
  };
  const watched = (td: string, axes: Axis[] | undefined) => {
    const d = byCode.get(td);
    const xs = (axes ?? []);
    const hit = d ? xs.filter((a) => d.confirmed.includes(a) || d.owned.includes(a)) : [];
    return { all: xs, hit, miss: xs.filter((a) => !hit.includes(a)) };
  };
  const step = (td: string, name: string) => dict.get(td)?.workflow.find((w) => w.name === name)?.detail ?? "";

  /* 3. 산업·역할 비교: 학생이 고른 것과 확인된 판단에서 이어진 것을 함께 놓고 근거 영역을 적는다 */
  const roleSet = [...new Set([...m.targets.roles, ...(confirmed.length ? rolesFromDomains(core, confirmed).map((r) => r.code) : [])])].slice(0, 4);
  const indSet = [...new Set([...m.targets.industries, ...(confirmed.length ? industriesFromDomains(core, confirmed).map((r) => r.code) : [])])].slice(0, 4);
  const centerOf = <T extends Rel>(rows: T[], pick: (r: T) => string, code: string) =>
    rows.filter((r) => pick(r) === code && r.strength === "중심").map((r) => r.td);
  /** 중심 영역이 없는 산업은 여러 영역에 고르게 걸린다. `0개 모두 아직` 으로 적지 않고 그 사실을 적는다 */
  const spreadOf = <T extends Rel>(rows: T[], pick: (r: T) => string, code: string) =>
    rows.filter((r) => pick(r) === code && r.strength === "있음").map((r) => r.td);
  const cmpRows: string[][] = [
    ...roleSet.map((r) => {
      const tds = centerOf(rel.td_role, (x) => x.role, r);
      const ready = tds.filter((t) => confirmed.includes(t));
      return [`직무 · ${roleName(core, r)}`, m.targets.roles.includes(r) ? "학생이 고름" : "확인된 판단에서 이어짐",
        tds.map(nm).join(" / ") || "—", ready.length ? `${ready.length}/${tds.length} 영역에 확인된 판단` : `중심 영역 ${tds.length}개에 확인된 판단 아직 없음`];
    }),
    ...indSet.map((c) => {
      const tds = centerOf(rel.td_industry, (x) => x.industry, c);
      const from = m.targets.industries.includes(c) ? "학생이 고름" : "확인된 판단에서 이어짐";
      if (!tds.length) {
        const sp = spreadOf(rel.td_industry, (x) => x.industry, c);
        const hit = sp.filter((t) => confirmed.includes(t));
        return [`산업 · ${ind.get(c) ?? c}`, from, `중심 영역 없이 ${sp.length}개 영역에 고르게 나타남`,
          hit.length ? `그 가운데 ${hit.length}개 영역에 확인된 판단` : "그 영역들에 확인된 판단 아직 없음"];
      }
      const ready = tds.filter((t) => confirmed.includes(t));
      return [`산업 · ${ind.get(c) ?? c}`, from,
        tds.map(nm).join(" / "), ready.length ? `${ready.length}/${tds.length} 영역에 확인된 판단` : `중심 영역 ${tds.length}개에 확인된 판단 아직 없음`];
    }),
  ];
  S.push({ no: 3, title: "산업·직무 비교", lead: cmpRows.length
      ? "고른 것과 확인된 판단에서 이어진 것을 한 표에 놓고, 그 일이 중심으로 보는 영역에 이 학생의 판단이 얼마나 있는지 셉니다."
      : "고른 산업·직무도, 확인된 판단도 아직 없어 비교할 줄이 없습니다.",
    lines: [{ v: "적합도나 합격 가능성이 아닙니다. 중심 영역은 그 Core 의 관계표에서 왔고 기업 자료가 아닙니다. 관심만으로 직무를 잇지 않습니다.", muted: true }],
    table: cmpRows.length ? { head: ["후보", "어디서 왔나", "그 일의 중심 영역", "이 학생"], rows: cmpRows } : undefined });

  /* 4. 역할별 직무 역량: 한 역할을 골라 Role → 필요한 판단 → 근거/빈자리 → 다음 할 일로 잇는다 */
  const focusRole = roleSet.find((r) => centerOf(rel.td_role, (x) => x.role, r).some((t) => confirmed.includes(t))) ?? roleSet[0];
  const roleRows = focusRole ? rel.td_role.filter((x) => x.role === focusRole && x.strength === "중심").map((x) => {
    const w = watched(x.td, x.axes_watched);
    const act = m.actions.find((a) => a.domain === x.td);
    const d = byCode.get(x.td);
    const ev = d ? (d.decided[0] ?? d.did[0] ?? "") : "";
    return [nm(x.td), w.all.map(needKo).join(" · "), `${stateOf(x.td)}${w.all.length ? ` · 이 역할이 보는 판단 ${w.hit.length}/${w.all.length}` : ""}${ev ? ` · 예: ${ev}` : ""}`,
      act ? actionKo(act, nm(x.td), m.stage).do : w.miss.length ? `${needKo(w.miss[0])}부터 적을 경험 하나` : "정리해 둔 근거를 지원서 문장으로"];
  }) : [];
  S.push({ no: 4, title: "역할별 직무 역량", lead: focusRole
      ? `${roleName(core, focusRole)} 역할이 직접 정하는 영역마다, 그 자리가 보는 판단과 이 학생의 상태와 다음 할 일을 잇습니다.`
      : "이어 볼 역할이 아직 없습니다.",
    lines: focusRole ? [] : [{ v: "역할을 고르거나 확인된 판단이 생기면 이 표가 섭니다." }],
    table: roleRows.length ? { head: ["영역", "그 역할이 보는 판단", "이 학생", "다음 할 일"], rows: roleRows } : undefined });

  S.push({ no: 5, title: "Evidence / Gap", lines: [
    ...[...new Set(m.evidence.ready.map((g) => g.domain))].map((td) => ({ k: `근거 · ${nm(td)}`, v: m.evidence.ready.filter((g) => g.domain === td).flatMap((g) => g.picks).slice(0, 4).join(" / ") || "—" })),
    ...(m.evidence.ready.length ? [] : [{ v: "근거가 선 영역은 아직 없습니다. 아래 빈자리가 무엇을 적으면 근거가 되는지 말합니다.", muted: true }]),
    ...groupGaps(m.gaps, nm),
  ] });

  /* 6. 조직 유형과 지역: 고른 조직 유형에서 그 영역이 무엇으로 평가되는가(사전) + 출처 있는 지역 사실 */
  const orgs = m.targets.orgs.map((c) => ({ c, o: org.get(c) })).filter((x) => x.o) as { c: string; o: { name: string; first: string } }[];
  const lookTds = (focus => focus.length ? focus : opened.map((d) => d.code))(m.overview.focus).slice(0, 2);
  const region = (x.region ?? []).slice(0, 6);
  S.push({ no: 6, title: "조직 유형과 지역에서의 쓰임", lines: [
    ...(orgs.length ? orgs.flatMap(({ c, o }) => [
      { k: o.name, v: o.first },
      ...lookTds.map((td) => ({ k: `  ${nm(td)}`, v: dict.get(td)?.org_outcomes?.[c] ? `이 조직 유형에서는 ${dict.get(td)!.org_outcomes[c]}(으)로 평가됩니다` : "그 Core 사전에 이 조직 유형의 설명이 없습니다" })),
    ]) : [{ v: "관심 조직 유형을 고르지 않았습니다." }]),
    ...region.map((r) => ({ k: `${r.id} · ${r.how === "FETCHED_PAGE" && r.status === "FACT" ? "사실" : r.status === "INTERPRETATION" ? "해석" : "보도·자료 요지"}`,
      v: `${r.claim} [${r.how === "FETCHED_PAGE" ? "원문 확인" : "검색 결과만 · 원문 확인 전"}]` })),
    { v: region.length
        ? "지역 사실은 출처가 붙은 것만 적고 아래 10절에 URL 이 있습니다. 특정 기업의 채용·협약을 뜻하지 않습니다. 기업 이름을 추천하지 않습니다."
        : "기업 이름을 추천하지 않습니다. 지역 사실은 출처를 확인한 것만 적는데 이 리포트에는 아직 없습니다.", muted: true },
  ] });

  /* 7. AI 학습·프로젝트 전략: 측정되는 것과 아닌 것을 나눠서 권한다 */
  const lead = opened.find((d) => d.did.length || d.decided.length);
  const story = lead ? evidenceStoryKo(core, lead.code, { did: lead.did[0], decided: lead.decided[0], artifacts: lead.artifacts, verifications: lead.verifications }, "lead", nm(lead.code)) : null;
  const ai = x.program?.courses.find((c) => c.status !== "EXISTS_DETAIL_UNVERIFIED");
  const measured = x.coverage.filter((c) => c.status === "MEASURED");
  const offList = x.coverage.filter((c) => c.status === "CURRICULUM" || c.status === "NOT_MEASURED");
  const weak = measured.find((c) => answeredIn(c, x.answered).length === 0) ?? measured[0];
  S.push({ no: 7, title: "AI 학습·프로젝트 경험 활용", lines: [
    ...(story ? [
      { k: "꺼내 쓸 경험", v: `${story.domain} — ${story.action}` },
      ...(story.outputs.length ? [{ k: "남은 결과물", v: story.outputs.join(" / ") }] : []),
    ] : [{ v: "아직 꺼내 쓸 경험이 확인되지 않았습니다." }]),
    ...(ai ? [{ k: "공식 과정에서 남길 것", v: `${ai.name} 과제 하나를 끝까지 하고, 무엇을 직접 정했고 무엇과 견줬는지를 경험으로 적습니다. 과정 이수 자체를 역량 확인으로 세지 않습니다.` }] : []),
    ...(weak ? [{ k: "판정에 들어가는 쪽", v: `${weak.cap.name}: 이 경험을 적으면 다시 볼 때 이 검사의 문항(${[...weak.core].slice(0, 4).join(", ")}${weak.core.length > 4 ? " 등" : ""})이 묻는 축과 맞춰 봅니다.` }] : []),
    ...(offList.length ? [{ k: "판정 밖에 두는 쪽", v: `${offList.map((c) => c.cap.name).join(" · ")} — 프로젝트 결과물(코드·보고서·시연)로 포트폴리오에 남깁니다. 이 검사는 이것을 재지 않습니다.`, muted: true }] : []),
  ] });

  /* 8. 이력서·자소서·면접·포트폴리오. 고른 답만 칸에 넣고 빈칸은 학생이 적을 자리로 남긴다 */
  const frame = m.translation ? draftFrameKo(m.translation.steps) : [];
  const ld = lead ?? first;
  const bullet = ld ? [
    `상황: ${step(ld.code, "문제가 들어오는 모양") || "(적을 칸)"}`,
    `행동: ${ld.decided[0] ?? ld.did[0] ?? "(적을 칸)"}`,
    `결과물: ${ld.artifacts.slice(0, 2).join(", ") || "(적을 칸)"}`,
    `견준 대상: ${ld.verifications.slice(0, 1).join("") || "(무엇과 견줬는지 적을 칸)"}`,
  ] : [];
  const keep = ld ? [...new Set(ld.artifacts)] : [];
  const usual = ld ? (dict.get(ld.code)?.artifacts ?? []).filter((a) => !keep.includes(a)).slice(0, 4) : [];
  S.push({ no: 8, title: "이력서·자기소개서·면접·포트폴리오", lines: [
    ...(ld ? [{ k: `이력서 한 줄 뼈대 · ${nm(ld.code)}`, v: bullet.join(" → ") }] : []),
    ...(story ? [{ k: "자기소개서에서 먼저 쓸 것", v: story.application }, { k: "면접에서 받을 질문", v: story.interview }] : []),
    ...frame.map((f) => ({ k: `자기소개서 뼈대 · ${f.label}`, v: f.items.join(" / ") })),
    ...(keep.length ? [{ k: "포트폴리오 · 이미 고른 결과물", v: keep.slice(0, 4).join(" / ") }] : []),
    ...(usual.length ? [{ k: "포트폴리오 · 이 영역에서 흔히 남기는 것", v: `${usual.join(" / ")} (그 Core 사전 · 이 학생이 만들었다는 뜻이 아님)` }] : []),
    { v: "수치·기간·결과는 학생이 직접 적습니다. 이 리포트는 문장을 대신 써 주지 않습니다.", muted: true },
  ] });

  /* 9. 단계별 계획: 할 일 전부를 때로 묶고, 공식 과정의 자리는 확인된 만큼만 적는다 */
  const hz: [string, string][] = [["NOW", "지금"], ["NEXT", "다음"], ["LATER", "나중"]];
  const f4 = x.program?.facts.find((f) => f.id === "F4");
  S.push({ no: 9, title: "단계별 학습·경험 계획", lines: [
    /* 덧붙이는 말(`수업 프로젝트나 캡스톤 …`)은 할 일마다 같아서 줄마다 되풀이하면 표가 같은 말로 찬다. 한 번만 적는다 */
    ...hz.flatMap(([h, label]) => m.actions.filter((a) => a.horizon === h).slice(0, 3).map((a) => {
      const t = actionKo(a, a.domain ? nm(a.domain) : "", m.stage);
      return { k: `${label}${a.domain ? ` · ${nm(a.domain)}` : ""}`, v: t.do };
    })),
    ...(() => {
      const notes = [...new Set(m.actions.slice(0, 9).map((a) => actionKo(a, a.domain ? nm(a.domain) : "", m.stage).note).filter(Boolean))];
      return notes.length ? [{ v: notes.join(" "), muted: true }] : [];
    })(),
    ...(m.actions.length ? [] : [{ v: "결과 모델이 낸 할 일이 없습니다." }]),
    ...(ai ? [{ k: "공식 과정 · 지금 열린 것", v: `${ai.name}(${ai.topics.join("·")}) [${ai.source}]` }] : []),
    ...(f4 ? [{ k: "공식 과정 · 이어지는 것", v: `${f4.text} [${f4.source}] — 후속 ND1~ND6 의 이름·내용·순서는 확인 전이라 적지 않습니다`, muted: true }] : []),
  ] });

  S.push({ no: 10, title: "근거 출처와 한계", lines: [
    ...(x.program ? x.program.facts.map((f) => ({ k: `${f.id} · ${f.status === "EXISTS_DETAIL_UNVERIFIED" ? "있음·세부 미확인" : "공식 출처·사업주 확인"}`, v: `${f.text}${f.caution ? ` (${f.caution})` : ""} [${f.source}]` })) : []),
    ...(x.program ? [{ k: "출처", v: x.program.sources.map((s) => `${s.id} ${s.url}`).join(" / ") }, { v: `확인한 날 ${x.program.checked_on}. ${x.program.verification_note}`, muted: true }] : []),
    ...(region.length ? [{ k: "지역 사실 출처", v: region.map((r) => `${r.id} ${r.url}`).join(" / ") }] : []),
    { k: "트랙·기수", v: "CareerMatri 시연용 분류이며 사업단 공식 트랙이 아닙니다." },
    { k: "검사", v: `${core} · 문항 ${m.provenance.module_versions.item_bank_version ?? "?"} · 채점 ${m.provenance.module_versions.scoring_version ?? "?"} · 규준·인지면접 전이라 검증된 검사가 아닙니다` },
    { k: "재지 않는 것", v: x.coverage.filter((c) => c.status === "NOT_MEASURED").map((c) => c.cap.name).join(" · ") || "—" },
    { k: "응답 품질", v: RQ_KO[m.response_quality.flag] ?? "다시 볼 것이 있음" },
    { k: "리포트", v: JJU_REPORT_VERSION },
  ] });
  return S;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** A4 한 벌의 HTML. 뽑는 쪽은 브라우저 인쇄다 */
export function jjuReportHtml(x: JjuReportInput, S: Section[], opts: { draft?: boolean } = {}): string {
  const m = x.model;
  const chips = [
    ["확인된 판단", `${m.overview.counts.confirmed_axes}칸`],
    ["직접 정한 것", `${m.overview.counts.owned_axes}칸`],
    ["고른 근거", `${m.overview.counts.evidence_items}개`],
    ["근거가 선 영역", `${new Set(m.evidence.ready.map((g) => g.domain)).size}개`],
  ];
  const body = S.map((s) => `<section><h2><span>${s.no}</span>${esc(s.title)}</h2>${s.lead ? `<p class="lead">${esc(s.lead)}</p>` : ""}${s.lines.length ? `<dl>${s.lines.map((l) =>
    l.k ? `<dt>${esc(l.k)}</dt><dd${l.muted ? ' class="m"' : ""}>${esc(l.v)}</dd>` : `<dd class="full${l.muted ? " m" : ""}">${esc(l.v)}</dd>`).join("")}</dl>` : ""}${s.table ? `<table><thead><tr>${s.table.head.map((t) => `<th>${esc(t)}</th>`).join("")}</tr></thead><tbody>${s.table.rows.map((r) => `<tr>${r.map((c, i) => `<td${i === s.table!.statusCol ? ` class="st st-${esc(c)}"` : ""}>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>` : ""}</section>`).join("");
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>전주대학교 · ${esc(x.student.name)} · CareerMatri</title><style>
@page{size:A4;margin:13mm 14mm 15mm}
:root{--ink:#0f1b2d;--ink2:#3d4d66;--line:#dde3ec;--navy:#0f2a4a;--teal:#0f766e}
body{font-family:"Noto Sans CJK KR","Noto Sans KR","WenQuanYi Zen Hei",sans-serif;color:var(--ink);font-size:9.8pt;line-height:1.55;margin:0;background:#fff}
.cover{background:var(--navy);color:#fff;padding:14px 16px 12px;border-radius:6px;margin-bottom:10px}
.cover p{margin:0;font-size:8.5pt;opacity:.85}.cover h1{margin:4px 0 6px;font-size:17pt;letter-spacing:-.01em}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}.chips span{background:rgba(255,255,255,.12);border-radius:999px;padding:2px 10px;font-size:8.5pt}
.chips b{font-weight:700;margin-left:4px}
.demo{margin:0 0 10px;padding:5px 9px;background:#fff7ea;border-left:3px solid #d99a2b;color:#6b4300;font-size:8.4pt}
section{margin:0 0 11px;break-inside:auto}
h2{font-size:11.5pt;margin:0 0 5px;display:flex;gap:8px;align-items:center;border-bottom:1px solid var(--line);padding-bottom:3px}
h2 span{display:inline-block;min-width:19px;height:19px;border-radius:4px;background:var(--navy);color:#fff;font-size:8.5pt;text-align:center;line-height:19px}
.lead{margin:0 0 5px;font-size:10.6pt;font-weight:600}
dl{margin:0;display:grid;grid-template-columns:42mm minmax(0,1fr);gap:3px 10px}dt{color:var(--ink2);font-size:8.9pt}dd{margin:0;min-width:0;overflow-wrap:anywhere}
dd.full{grid-column:1/-1}dd.m{color:#5b677a;font-size:8.6pt}
table{width:100%;border-collapse:collapse;margin-top:6px;font-size:8.8pt}th{text-align:left;color:var(--ink2);font-weight:600;border-bottom:1px solid var(--line);padding:3px 4px}
td{border-bottom:1px solid #eef1f5;padding:3px 4px;vertical-align:top}
td.st{font-weight:700;white-space:nowrap}td{word-break:keep-all}td.st-측정{color:var(--teal)}td.st-미측정{color:#9a3412}td.st-교육과정만{color:#6b4300}td.st-자기보고만{color:#5b677a}
footer{margin-top:12px;font-size:7.8pt;color:#5b677a;border-top:1px solid var(--line);padding-top:6px}
@media screen{body{max-width:820px;margin:0 auto;padding:20px 16px}}
@media screen and (max-width:600px){dl{grid-template-columns:minmax(0,1fr)}table{display:block;overflow-x:auto}dt{margin-top:6px}.cover h1{font-size:15pt}}
</style></head><body>
<div class="cover"><p>전주대학교 ${esc(x.program?.name ?? "AI 부트캠프")} · CareerMatri 학생 리포트</p>
<h1>${esc(x.student.name)} · ${esc(x.student.track)}</h1>
<div class="chips">${chips.map(([k, v]) => `<span>${esc(k)}<b>${esc(v)}</b></span>`).join("")}</div></div>
${opts.draft !== false ? `<p class="demo">합성 QA 학생 · 트랙은 시연용 분류 · 검사는 전공자 검수 전입니다. 이 종이를 학생 진단이나 사업 성과로 쓰지 않습니다.</p>` : ""}
${body}<footer>점수·백분위·적합도·합격 가능성을 만들지 않습니다. 모든 값은 공통 엔진이 굳힌 결과와 문항 커버리지에서 옵니다 · ${JJU_REPORT_VERSION}</footer></body></html>`;
}
