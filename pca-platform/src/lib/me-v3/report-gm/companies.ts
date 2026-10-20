/**
 * **PDF GOLD MASTER 2차 · 기업·직무 탐색 분석.**
 *
 * 법적 범위(직업정보제공사업 신고)에 맞춰 이름을 고른다: `진로 탐색 기업` ·
 * `직무 연관 기업` · `분석 결과와의 연결 근거` · `직무 요구역량 대비 보유 근거 분석`.
 * 기업이 이 학생을 뽑거나 이 직무를 모집한다는 뜻을 적지 않고, 적합도 숫자를
 * 만들지 않는다. 차례는 이어지는 까닭의 수로만 세운다.
 *
 * 한 기업의 내용을 세 층으로 가른다(규격 §2): **확인된 사실**(출처와 확인일) ·
 * **분석적 해석**(이 리포트가 덧붙이는 말) · **추가 확인 필요**. KODATA 는 제3자
 * 기업정보이므로 공식 홈페이지·공시와 같은 층으로 적지 않는다.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import type { ResultModel } from "../result/model";
import { coreOf } from "../result/model";
import { domainName } from "../runtime/session";
import { axisWord } from "./lexicon";
import { industryPacks, rolePacks, type Direction } from "./profile";
import type { Axis } from "../scoring/types";
import type { VerifyLevel } from "./words";

export type SourceKind = "OFFICIAL" | "DART" | "KODATA" | "NEWS" | "DIRECTORY" | "COMMUNITY" | "SEARCH";
export type Source = { kind: SourceKind; title: string; url?: string | null; checked_on: string };
export type Fact = { text: string; src: number[] };
export type JobStatus = "POSTING_SEEN" | "ORG_PAGE" | "INDUSTRY_EXAMPLE";
export type OrgJob = { role: string; status: JobStatus; evidence?: string; src?: number[]; tasks: string };
export type Region = "DAEJEON" | "SEJONG" | "CHUNGNAM" | "CHUNGBUK" | "NATIONAL";

export type Org2 = {
  id: string; name: string; origin: "KODATA_NEW" | "EXISTING_V1";
  identifiers: { bizno: string | null; corpno: string | null; listing: string | null; src: number[] };
  region: Region; region_basis: string;
  hq: Fact; sites: string[];
  facts: Fact[];
  industry_line: string;
  industries: string[];
  jobs: OrgJob[];
  interpretation: string[];
  to_check: string[];
  sources: Source[];
  hiring: { status: "UNVERIFIED"; note: string };
  verify: "OFFICIAL_CROSSCHECKED" | "THIRD_PARTY_ONLY" | "SECONDARY_ONLY" | "CONFLICTING";
};
export type OrgSet2 = {
  schema: string; checked_on: string; status: string; note: string;
  region_facts: { text: string; region?: string; source: Source }[];
  orgs: Org2[];
};

export function orgSet2(file = "data/region/kr-chungcheong-orgs.v2.json"): OrgSet2 {
  return JSON.parse(readFileSync(path.join(process.cwd(), file), "utf8")) as OrgSet2;
}

export const REGION_KO: Record<Region, string> = {
  DAEJEON: "대전", SEJONG: "세종", CHUNGNAM: "충남", CHUNGBUK: "충북", NATIONAL: "전국",
};
export const JOB_STATUS_KO: Record<JobStatus, string> = {
  POSTING_SEEN: "채용 공고에서 본 직무",
  ORG_PAGE: "기업 자료에 적힌 조직",
  INDUSTRY_EXAMPLE: "탐색 가능한 직무군(산업 일반 예시)",
};
export const VERIFY_KO: Record<Org2["verify"], string> = {
  OFFICIAL_CROSSCHECKED: "공식·공시 자료와 대조함",
  THIRD_PARTY_ONLY: "제3자 기업정보(KODATA)만 확인",
  SECONDARY_ONLY: "검색·보도 자료만 확인",
  CONFLICTING: "출처끼리 다름",
};
export const SOURCE_KO: Record<SourceKind, string> = {
  OFFICIAL: "공식 홈페이지", DART: "전자공시", KODATA: "KODATA 기업종합보고서(제3자)",
  NEWS: "언론 보도", DIRECTORY: "기업정보 사이트", COMMUNITY: "커뮤니티 글", SEARCH: "검색 결과 요약",
};

/* ── 고르기 ──────────────────────────────────────────────────── */

export type Link = { kind: "GOAL_INDUSTRY" | "INDUSTRY" | "GOAL_ROLE" | "ROLE" | "DIRECTION" | "EVIDENCE"; text: string };
export type Explore = {
  org: Org2; links: Link[]; depth: "DEEP" | "BRIEF";
  /** 이 학생에게 이어지는 직무 (기업 직무와 학생 방향의 겹침) */
  jobs: (OrgJob & { name: string })[];
  /** 직무 요구역량 대비 보유 근거 */
  have: string[]; lack: string[];
  /** 10문항 */
  q: CompanyQA | null;
  /** 3~6개월 로드맵 */
  roadmap: { when: string; what: string; keep: string }[];
  industryGeneral: string[]; companySpecific: string[];
};
export type CompanyQA = {
  business: string; jobs: string; tasks: string[]; links: string[]; current: string[];
  needs: string[]; campus: string[]; projects: string[]; prove: { doc: string; portfolio: string; interview: string };
  firstCheck: string[];
};

export function explore(m: ResultModel, dirs: Direction[] | { code: string }[], set: OrgSet2 = orgSet2(), deepN = 3):
  { groups: { region: Region; items: Explore[] }[]; deep: Explore[]; note: string; few: string | null } {
  const core = coreOf(m);
  const roles = rolePacks(core);
  const inds = industryPacks(core);
  const goalInd = m.targets.goal.industry;
  const intInd = new Set(m.targets.industries);
  const goalRole = m.targets.goal.role;
  const intRole = new Set(m.targets.roles);
  const dirCodes = dirs.map((d) => d.code);
  const byCode = new Map(m.domains.map((d) => [d.code, d]));
  const roleName = (c: string) => roles.find((r) => r.code === c)?.name_ko ?? c;
  const indName = (c: string) => inds.find((p) => p.code === c)?.name_ko ?? c;

  const rows = set.orgs.map((o) => {
    const links: Link[] = [];
    let w = 0;
    if (goalInd && o.industries.includes(goalInd)) { links.push({ kind: "GOAL_INDUSTRY", text: `목표 산업 ${indName(goalInd)}` }); w += 4; }
    for (const c of o.industries) if (c !== goalInd && intInd.has(c)) { links.push({ kind: "INDUSTRY", text: `관심 산업 ${indName(c)}` }); w += 1; }
    const oRoles = o.jobs.map((j) => j.role);
    if (goalRole && oRoles.includes(goalRole)) {
      const seen = o.jobs.find((j) => j.role === goalRole)!.status !== "INDUSTRY_EXAMPLE";
      links.push({ kind: "GOAL_ROLE", text: `목표 직무 ${roleName(goalRole)}${seen ? "(이 기업 자료에서 본 직무)" : ""}` });
      w += seen ? 5 : 3;
    }
    for (const c of oRoles) if (c !== goalRole && intRole.has(c)) { links.push({ kind: "ROLE", text: `관심 직무 ${roleName(c)}` }); w += 1; }
    const viaDir = oRoles.filter((c) => dirCodes.includes(c) && c !== goalRole && !intRole.has(c));
    if (viaDir.length) { links.push({ kind: "DIRECTION", text: `분석된 탐색 방향 ${viaDir.map(roleName).join(" · ")}` }); w += 2; }
    const evTds = [...new Set(oRoles.flatMap((c) => roles.find((r) => r.code === c)?.core_ref?.td ?? []))]
      .filter((td) => (byCode.get(td)?.confirmed.length ?? 0) > 0);
    if (evTds.length) { links.push({ kind: "EVIDENCE", text: `확인된 경험 ${evTds.map((td) => domainName(core, td)).join(" · ")}` }); w += evTds.length; }
    if (o.verify === "CONFLICTING") w -= 2;
    /* 확인된 자료가 많은 기업이 앞에 선다: 공식 자료와 대조했는가 · 그 직무를 공고·기업 자료에서 봤는가 */
    if (o.verify === "OFFICIAL_CROSSCHECKED") w += 2;
    w += o.jobs.filter((j) => j.status !== "INDUSTRY_EXAMPLE" && [goalRole, ...intRole, ...dirCodes].includes(j.role)).length;
    return { o, links, w, evTds };
  }).filter((r) => r.links.some((l) => l.kind !== "EVIDENCE") || r.links.length >= 2)
    .sort((a, b) => b.w - a.w);

  const want = [...new Set([goalRole, ...dirCodes, ...m.targets.roles].filter(Boolean) as string[])];
  const mk = (r: (typeof rows)[number], depth: Explore["depth"]): Explore => {
    const jobs = r.o.jobs.filter((j) => want.includes(j.role)).map((j) => ({ ...j, name: roleName(j.role) }));
    const useJobs = jobs.length ? jobs : r.o.jobs.slice(0, 2).map((j) => ({ ...j, name: roleName(j.role) }));
    const req = [...new Set(useJobs.flatMap((j) => roles.find((x) => x.code === j.role)?.required_axes ?? []))] as Axis[];
    const tds = [...new Set(useJobs.flatMap((j) => roles.find((x) => x.code === j.role)?.core_ref?.td ?? []))];
    /* 같은 영역·같은 수준으로 확인된 판단은 한 줄로 묶는다: 축마다 한 줄씩 세우면
       `영업·사업개발에서 직접 해 봤다고 답함` 이 세 번 되풀이된다 */
    const haveBy = new Map<string, string[]>(), lackAx: string[] = [];
    for (const ax of req) {
      const hit = tds.map((td) => byCode.get(td)).find((d) => d && (d.owned.includes(ax) || d.confirmed.includes(ax)));
      if (!hit) { lackAx.push(axisWord(core, ax)); continue; }
      const key = `${domainName(core, hit.code)}에서 ${hit.owned.includes(ax) ? "직접 기준을 정했다고 답함" : "직접 해 봤다고 답함"}`;
      haveBy.set(key, [...(haveBy.get(key) ?? []), axisWord(core, ax)]);
    }
    const have = [...haveBy].map(([k, axes]) => `${axes.join(" · ")} — ${k}`);
    const lack = lackAx.length ? [`${lackAx.join(" · ")} — ${tds.map((td) => domainName(core, td)).slice(0, 2).join(" · ")} 쪽에서 아직 확인되지 않음`] : [];
    const pack = inds.find((p) => p.code === r.o.industries[0]);
    return {
      org: r.o, links: r.links, depth, jobs: useJobs, have, lack, q: null, roadmap: [],
      industryGeneral: (pack?.demands ?? []).slice(0, 3),
      companySpecific: r.o.interpretation.slice(0, 3),
    };
  };
  /* 심층 분석은 **공식 자료와 대조한 지역 기업**만 맡는다. 2차 출처뿐인 곳을 깊게 쓰면
     확인되지 않은 내용이 가장 긴 글이 된다 */
  const local = rows.filter((r) => r.o.region !== "NATIONAL" && r.o.verify === "OFFICIAL_CROSSCHECKED");
  const pickDeep = local.slice(0, deepN);
  /* 목표 직무가 실제로 보인 기업이 심층에 하나는 선다: 근거가 있는 쪽만 앞에 세우면
     학생이 고른 목표가 기업 분석에서 사라진다 */
  const goalHit = local.find((r) => r.links.some((l) => l.kind === "GOAL_ROLE"));
  if (goalHit && !pickDeep.includes(goalHit)) pickDeep[Math.min(deepN, pickDeep.length) - 1] = goalHit;
  const deep = pickDeep.map((r) => mk(r, "DEEP"));
  for (const e of deep) { e.q = qa(m, e); e.roadmap = roadmap(m, e); }
  const rest = rows.filter((r) => !deep.some((d) => d.org.id === r.o.id)).filter((r) => r.o.region !== "NATIONAL").slice(0, 8).map((r) => mk(r, "BRIEF"))
    .concat(rows.filter((r) => r.o.region === "NATIONAL").slice(0, 3).map((r) => mk(r, "BRIEF")));
  const all = [...deep, ...rest];
  const order: Region[] = ["DAEJEON", "SEJONG", "CHUNGNAM", "CHUNGBUK", "NATIONAL"];
  const groups = order.map((region) => ({ region, items: all.filter((e) => e.org.region === region) }))
    .filter((g) => g.items.length);
  const sj = groups.find((g) => g.region === "SEJONG");
  return {
    groups, deep,
    note: "직업정보 제공이며 취업 알선이 아닙니다. 아래 기업이 이 직무를 지금 모집한다는 뜻이 아니고, 이 학생을 선발한다는 뜻도 아닙니다. 채용 여부는 확인하지 않았습니다.",
    few: !sj ? "세종 소재로 확인된 기업은 아직 이 자료에 없습니다. 세종은 중앙행정기관과 국책연구기관이 모인 곳이라, 공공기관 채용 정보(공공기관 경영정보 공개시스템)를 따로 보셔야 합니다." : null,
  };
}

/* ── 기업별 10문항 ─────────────────────────────────────────────── */

function qa(m: ResultModel, e: Explore): CompanyQA {
  const core = coreOf(m);
  const roles = rolePacks(core);
  const byCode = new Map(m.domains.map((d) => [d.code, d]));
  const j0 = e.jobs[0];
  const pack = roles.find((r) => r.code === j0?.role);
  const tds = pack?.core_ref?.td ?? [];
  const confirmed = tds.map((td) => byCode.get(td)).filter((d) => d && d.confirmed.length);
  const current = confirmed.flatMap((d) => d!.decided.slice(0, 1).concat(d!.artifacts.slice(0, 1)))
    .filter(Boolean).slice(0, 3);
  const projects = (pack?.application_material ?? []).slice(0, 3);
  return {
    business: e.org.facts[0]?.text ?? "",
    jobs: e.jobs.map((j) => `${j.name}(${JOB_STATUS_KO[j.status]})`).join(" · "),
    tasks: e.jobs.map((j) => `${j.name}: ${j.tasks}`),
    links: e.links.map((l) => l.text),
    /* 고른 근거 항목이 없어도 응답으로 확인된 판단은 있다. 둘을 섞지 않고, 없을 때는
       응답 쪽을 그 이름으로 적는다(왼쪽 상자와 같은 사실을 다른 말로 적지 않는다) */
    current: current.length ? current
      : e.have.length ? e.have.map((h) => `응답으로 확인: ${h} (체크리스트에서 고른 항목은 없음)`)
      : ["없음 — 이 직무와 이어지는 영역의 판단을 ‘직접 수행’ 이상으로 답한 것이 없습니다. 이 회사 직무를 겨냥한 첫 과제의 결과물이 첫 근거가 됩니다"],
    needs: e.lack.length ? e.lack : [`이 직무가 요구하는 판단은 응답에서 확인됐습니다. 남은 것은 그 판단을 ${e.org.industry_line} 쪽 사례 하나에 대어 설명하는 일입니다`],
    campus: campusFor(pack?.code ?? ""),
    projects,
    prove: {
      doc: pack?.owns ? `자기소개서: ‘${pack.owns}’ 쪽 일에서 내가 정한 것 하나와 그 근거` : "자기소개서: 내가 정한 것 하나와 그 근거",
      portfolio: projects[0] ? `포트폴리오: ${projects[0]}` : "포트폴리오: 결과물 한 장",
      interview: pack?.items?.[0]?.ask ? `면접: “${pack.items[0].ask}”에 장면으로 답할 준비` : "면접: 결과가 기대와 달랐던 장면",
    },
    firstCheck: [
      "공고의 담당 업무가 위 ‘수행 업무’와 같은지(이름만 같고 일이 다른 경우가 많습니다)",
      "근무지가 본점인지 다른 사업장인지",
      "우대 조건에 적힌 자격·도구가 지금 가진 것과 어디가 다른지",
    ].concat(e.org.to_check.slice(0, 1)),
  };
}

const CAMPUS: Record<string, string[]> = {
  ROLE_PLAN_V1: ["경영전략·사업계획 수업의 팀 과제에서 목표와 지표를 내가 맡기", "창업 동아리·경진대회의 사업계획서 작성"],
  ROLE_ANALYTICS_V1: ["경영통계·데이터 분석 수업 과제를 실제 공개 데이터로 해 보기", "학회 데이터 분석 프로젝트"],
  ROLE_FINACC_V1: ["회계원리·원가회계 과제에서 계산표를 직접 만들기", "전산회계 자격 준비와 실습"],
  ROLE_OPS_V1: ["생산·운영관리 수업의 공정 개선 과제", "학생회·행사 운영에서 일정과 역할 배분표 맡기"],
  ROLE_CS_V1: ["교내 서비스 부서 근로장학에서 응대 기준 정리하기", "고객 불만 사례를 모아 처리 기준을 만들어 보는 과제"],
  ROLE_SALES_V1: ["영업·협상 수업의 제안서 과제", "지역 기업 연계 현장실습에서 견적·제안 자료 정리"],
  ROLE_MKT_V1: ["마케팅 수업의 캠페인 기획 과제를 실제 채널 성과로 비교해 보기", "교내 행사·동아리 홍보를 맡아 채널별 반응 기록"],
  ROLE_HR_V1: ["인사관리 수업에서 직무 기준·면접 평가표 만들어 보기", "동아리 신입 모집을 맡아 선발 기준 정하기"],
};
function campusFor(role: string): string[] { return CAMPUS[role] ?? ["전공 수업의 팀 과제에서 내가 정하는 몫을 맡기"]; }

function roadmap(m: ResultModel, e: Explore): { when: string; what: string; keep: string }[] {
  const j = e.jobs[0]?.name ?? "관심 직무";
  return [
    { when: "1개월", what: `${e.org.name}의 공식 홈페이지·공시에서 사업과 조직을 직접 확인하고, ${j} 쪽 공고 이력을 찾아본다`, keep: "기업 확인 메모(출처·확인일)" },
    { when: "2~3개월", what: e.lack[0] ? `‘${e.lack[0].split(" — ")[0]}’를 다음 수업 과제에서 맡아 본다` : `확인된 경험 하나를 ${j}의 일에 대어 다시 정리한다`, keep: e.q?.projects[0] ?? "결과물 한 장" },
    { when: "4~6개월", what: `현장실습·공모전·학회 가운데 하나에서 ${e.org.industry_line} 쪽 문제를 다뤄 본다`, keep: "지원서 문단 초안과 면접 답변 메모" },
  ];
}

/* ── 3차: 검증 상태 다섯 ─────────────────────────────────────── */

/** 기업 하나의 검증 상태. **공식 원문을 직접 열람한 기업은 이 판에 없다**: 2차 판의
 *  `OFFICIAL_CROSSCHECKED` 는 검색 결과가 KODATA 의 식별자·주소와 맞았다는 뜻이었고,
 *  그것을 `공식 확인` 으로 적으면 거짓이 된다 */
export function verifyLevel(o: Org2): VerifyLevel {
  if (o.verify === "CONFLICTING") return "CONFLICTING";
  if (!o.sources.length) return "UNVERIFIED";
  if (o.sources.some((s) => s.kind === "KODATA")) return "THIRD_PARTY";
  return "SEARCH_ONLY";
}
/** 사실 한 줄의 검증 상태: 그 줄이 기대는 출처 가운데 가장 단단한 것 */
export function factLevel(o: Org2, src: number[]): VerifyLevel {
  const kinds = src.map((i) => o.sources[i]?.kind).filter(Boolean);
  if (!kinds.length) return "UNVERIFIED";
  if (kinds.includes("KODATA")) return "THIRD_PARTY";
  return "SEARCH_ONLY";
}
