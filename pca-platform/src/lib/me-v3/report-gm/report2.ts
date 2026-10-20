/**
 * **PDF GOLD MASTER 2차 · 리포트 조립.** 장(章)마다 쓸 값을 한 객체로 모은다.
 *
 * 판단은 결과 모델이 하고, 여기서는 그것을 읽는 차례와 해석을 붙인다. 모든
 * 결론 줄은 `trace` 에 어디서 왔는지(결과 모델 칸 · 경험 기록 · 직무 팩 · 기업
 * 출처 · 실행 계획)를 함께 적는다. DB 계약을 바꾸지 않는다: 이 객체는 리포트를
 * 뽑을 때만 만들어지고 저장되지 않는다.
 */
import type { ResultModel } from "../result/model";
import { coreOf } from "../result/model";
import { withJosa } from "../result/josa";
import { actionKo, draftFrameKo } from "../result/text.ko";
import { domainName } from "../runtime/session";
import { core as coreEntry } from "../core-registry";
import { axisWord } from "./lexicon";
import {
  cross, directions, interestEvidenceMap, priorities, radar, reading, strengths,
  type DomainCross, type Direction, type ExpRead, type MapCell, type Priority,
  type Radar, type Reading, type Strength, type Experience,
} from "./profile";
import { explore, orgSet2, type Explore, type OrgSet2, type Region } from "./companies";

export type Meta = {
  school: string | null; department: string | null; major: string | null;
  specialization: string | null; answeredOn: string | null; tier: string;
};
export type PlanRow = { period: string; what: string; why: string; how: string; due: string; output: string; link: string };
export type Trace = { section: string; claim: string; from: string[]; job?: string; company?: string; action?: string };

export type Report2 = {
  core: string; meta: Meta; majorName: string;
  opinion: string[];
  radar: Radar; map: MapCell[]; reading: Reading;
  cross: { domains: DomainCross[]; records: ExpRead[] };
  strengths: Strength[]; priorities: Priority[]; directions: Direction[];
  explore: ReturnType<typeof explore>;
  application: {
    frame: { label: string; hint: string; items: string[] }[];
    stories: { domain: string; lines: { label: string; text: string; filled: boolean }[] }[];
    portfolio: { name: string; domain: string; note: string }[];
    interview: { q: string; from: string; prepare: string }[];
  };
  plan: PlanRow[];
  final: { no: number; text: string; why: string }[];
  worksheet: { title: string; prefill: Record<string, string> }[];
  regionFacts: OrgSet2["region_facts"]; checkedOn: string;
  sources: { kind: string; title: string; url: string | null; checked_on: string }[];
  verifyTable: { name: string; bizno: string; region: string; origin: string; verify: string; checked: string }[];
  trace: Trace[];
  versions: Record<string, string>;
  quality: { flag: string; text: string | null };
};

export function build(m: ResultModel, meta: Meta, exps: Experience[], set: OrgSet2 = orgSet2()): Report2 {
  const core = coreOf(m);
  const nm = (td: string) => domainName(core, td);
  const rad = radar(m);
  const rd = reading(m, exps);
  const cx = cross(m, exps);
  const st = strengths(m);
  const pr = priorities(m);
  const dirs = directions(m);
  const ex = explore(m, dirs, set);
  const trace: Trace[] = [];

  /* A 종합 분석 의견 */
  const z1 = m.domains.filter((d) => d.zone === "Z1_EVIDENCE_ESTABLISHED").map((d) => nm(d.code));
  const z4 = m.domains.filter((d) => d.zone === "Z4_INSUFFICIENT_EVIDENCE").map((d) => nm(d.code));
  const goalDir = dirs.find((d) => d.goal) ?? dirs[0];
  const opinion: string[] = [];
  if (z1.length) {
    opinion.push(`이번 응답에서 근거가 가장 단단한 곳은 ${z1.join(" · ")}입니다. ${st[0]?.shown[0] ? `‘${st[0].shown[0]}’처럼 기준을 직접 정한 장면을 골라 두었고, ` : ""}${st[0]?.artifacts.length ? `${withJosa(st[0].artifacts.join(" · "), "을를")} 남겼다고 답했습니다.` : "남긴 결과물은 아직 고르지 않았습니다."}`);
    trace.push({ section: "A 종합 의견", claim: "근거가 단단한 영역", from: z1.map((n) => `domains[${n}].zone=Z1`).concat(st[0] ? [`domains[${st[0].code}].decided`, `domains[${st[0].code}].artifacts`] : []) });
  } else if (z4.length) {
    opinion.push(`${z4.join(" · ")}에 관심이 높게 나왔지만, 그 관심을 받쳐 줄 경험과 근거는 아직 적습니다. 지금 리포트가 하는 일은 ‘잘하는 것’을 찾기보다 ‘처음 해 볼 것’을 고르는 일에 가깝습니다.`);
    trace.push({ section: "A 종합 의견", claim: "관심은 높고 근거가 적은 영역", from: z4.map((n) => `domains[${n}].zone=Z4`) });
  } else {
    const z2 = m.domains.filter((d) => d.zone === "Z2_EVIDENCE_INCOMPLETE" || d.zone === "Z3_EVIDENCE_LOW_INTEREST").map((d) => nm(d.code));
    opinion.push(`${z2.join(" · ")}에서 해 본 일이 응답으로 확인되지만, 그 일을 받쳐 줄 체크리스트 근거와 결과물이 비어 있어 ‘근거가 섰다’고 적지 않았습니다.`);
    trace.push({ section: "A 종합 의견", claim: "해 봤지만 근거가 빈 영역", from: z2.map((n) => `domains[${n}].zone`) });
  }
  if (rd.caution) opinion.push(rd.caution);
  if (pr[0]) {
    opinion.push(`먼저 채울 것은 ${pr[0].domain}의 ‘${pr[0].what}’입니다. ${pr[0].why[0]}.`);
    trace.push({ section: "A 종합 의견", claim: `우선순위 1 ${pr[0].domain}/${pr[0].what}`, from: ["gaps[rank]", "targets.goal.role", "role.required_axes"] });
  }
  if (goalDir) {
    opinion.push(`목표로 고른 방향은 ${goalDir.name}이고, 지금 응답 기준 취업 준비 현황은 ‘${goalDir.readiness}’입니다. ${goalDir.prereq}`);
    trace.push({ section: "A 종합 의견", claim: `방향 ${goalDir.name} 준비 현황`, from: ["targets.goal.role", "role.required_axes × domains.axes"], job: goalDir.code });
  }
  if (ex.deep[0]) opinion.push(`지역에서 먼저 살펴볼 진로 탐색 기업은 ${ex.deep.map((e) => e.org.name).join(" · ")}입니다. 연결 근거는 ${ex.deep[0].links.map((l) => l.text).join(", ")}이고, 채용 여부는 확인하지 않았습니다.`);
  opinion.push("이 의견은 검사 응답과 적어 둔 경험 기록을 정해 둔 규칙으로 읽은 분석입니다. 상담자가 직접 만나 확인한 내용이 아니며, 성과와 수치는 만들지 않았습니다.");

  /* 지원서·면접 */
  const frame = m.translation ? draftFrameKo(m.translation.steps) : [];
  const stories = st.slice(0, 2).map((s) => {
    const d = m.domains.find((x) => x.code === s.code)!;
    const line = (label: string, text: string | undefined) => ({ label, text: text ?? "직접 기입", filled: !!text });
    return {
      domain: s.name,
      lines: [
        line("상황·내 역할", undefined),
        line("내가 정한 것", s.shown[0]),
        line("쓴 방법", d.did.find((t) => !s.shown.includes(t))),
        line("남긴 것", s.artifacts[0]),
        line("무엇과 견줬나", s.verifications[0]),
        line("결과·수치·기간", undefined),
      ],
    };
  });
  const portfolio = m.domains.flatMap((d) => d.artifacts.map((a) => ({
    name: a, domain: nm(d.code),
    note: d.verifications.length ? `${withJosa(d.verifications[0], "과와")} 견준 기록을 함께 둡니다` : "무엇과 견줬는지를 한 줄 붙여 둡니다",
  }))).slice(0, 6);
  const interview: Report2["application"]["interview"] = [];
  for (const s of st.slice(0, 2)) interview.push({ q: s.question, from: `${s.name} — 고른 판단`, prepare: s.verifications[0] ? `${withJosa(s.verifications[0], "과와")} 견준 결과를 수치로` : "다른 안을 버린 까닭과 결과를 수치로" });
  for (const p of pr.slice(0, 2)) interview.push({ q: `“${p.domain}에서 ${withJosa(p.what, "을를")} 해 본 적이 있나요?”`, from: "아직 확인되지 않은 판단 — 미리 준비할 질문", prepare: p.method.split(".")[0] });
  for (const d of dirs.slice(0, 1)) for (const a of d.asks.slice(0, 2)) interview.push({ q: `“${a}”`, from: `${d.name} 직무 질문`, prepare: "그 몫을 맡았던 장면 하나 · 맡지 않았다면 맡을 준비" });

  /* 실행 계획 */
  const firstAction = m.actions[0];
  const keepOf = (i: number) => pr[i]?.keep ?? "정리한 문서";
  const deep0 = ex.deep[0];
  const plan: PlanRow[] = [];
  if (pr[0]) plan.push({ period: "30일", what: pr[0].method, why: pr[0].why.join(" · "), how: pr[0].learn || "진행 중인 수업 과제에서", due: "리포트를 받은 날부터 30일", output: keepOf(0), link: pr[0].jobs.join(" · ") || pr[0].domain });
  else if (firstAction) plan.push({ period: "30일", what: actionKo(firstAction, nm(firstAction.domain ?? ""), m.stage).do, why: "결과 모델이 먼저 할 일로 고른 것입니다", how: "진행 중인 수업 과제에서", due: "30일", output: keepOf(0), link: "" });
  if (deep0) plan.push({ period: "30일", what: `${deep0.org.name} 공식 홈페이지와 공시에서 사업·조직·채용 페이지를 직접 확인`, why: "이 리포트의 기업 정보는 제3자·검색 자료라 공식 확인이 먼저입니다", how: "기업 확인 메모 서식(부록)에 출처와 확인일을 적기", due: "30일", output: "기업 확인 메모", link: deep0.jobs.map((j) => j.name).join(" · ") });
  if (pr[1]) plan.push({ period: "60일", what: pr[1].method, why: pr[1].why.join(" · "), how: pr[1].learn || "다음 과제에서", due: "60일", output: keepOf(1), link: pr[1].jobs.join(" · ") || pr[1].domain });
  plan.push({ period: "60일", what: cx.records.length ? `적어 둔 경험 ${cx.records.length}건의 빈칸(${cx.records[0].needs[0].split("(")[0]})을 채워 경험 기록을 고치기` : "가장 최근 과제 하나를 경험 기록으로 처음 남기기", why: "경험 기록이 있어야 검사 응답을 면접 장면으로 말할 수 있습니다", how: "내 CareerMatri의 경험 추가·고치기", due: "60일", output: "갱신된 경험 기록", link: "" });
  if (pr[2]) plan.push({ period: "90일", what: pr[2].method, why: pr[2].why.join(" · "), how: pr[2].learn || "과제 한 번 더", due: "90일", output: keepOf(2), link: pr[2].jobs.join(" · ") || pr[2].domain });
  plan.push({ period: "90일", what: st[0] ? `${st[0].name} 경험을 부록 워크시트에 옮겨 지원서 문단 하나와 면접 답변 하나로 정리` : "새로 해 본 경험을 워크시트에 옮겨 문단 하나로 정리", why: "경험이 문장으로 옮겨지지 않으면 서류에서 쓰이지 않습니다", how: "워크시트의 여섯 칸을 채우고 수치·기간을 직접 적기", due: "90일", output: "지원서 문단 초안 · 답변 메모", link: goalDir?.name ?? "" });
  plan.push({ period: "6개월", what: deep0 ? deep0.roadmap[2].what : "현장실습·공모전·학회 가운데 하나에 참여", why: "학교 밖 과제에서 남긴 결과물은 수업 과제보다 직무에 가깝게 읽힙니다", how: "교내 현장실습지원센터·취업지원 프로그램 확인", due: "4~6개월 사이", output: "실전 과제 결과물 한 장", link: deep0?.jobs[0]?.name ?? goalDir?.name ?? "" });
  plan.push({ period: "6개월", what: `결과물 ${Math.max(2, portfolio.length)}개를 골라 한 묶음의 포트폴리오로 정리`, why: "흩어진 결과물은 지원 시점에 다시 찾기 어렵습니다", how: "결과물마다 ‘내가 정한 것 · 견준 대상’ 한 줄을 붙이기", due: "6개월", output: "포트폴리오 묶음", link: goalDir?.name ?? "" });
  plan.push({ period: "12개월", what: `${dirs.map((d) => d.name).slice(0, 2).join("과 ")} 가운데 어느 쪽으로 지원할지 정하고, 그 직무의 공고 세 건을 모아 요구 조건을 대조`, why: "1년이면 학년이 바뀌고 지원 시점이 가까워집니다", how: "공고의 담당 업무·우대 조건을 이 리포트의 ‘추가 확보가 필요한 역량’과 견주기", due: "12개월", output: "직무별 요구 조건 대조표", link: "" });
  plan.push({ period: "12개월", what: "CareerMatri 검사를 다시 보고 이번 결과와 견주기", why: "근거가 늘었는지를 같은 자로 확인합니다", how: "담당자에게 재응시를 요청", due: "12개월", output: "두 결과의 비교", link: "" });

  /* F 최종 행동 */
  const final = [
    pr[0] && { text: pr[0].method, why: `${pr[0].domain}의 ‘${pr[0].what}’ — ${pr[0].why[0]}` },
    deep0 && { text: `${deep0.org.name}의 공식 자료를 직접 확인하고 확인 메모를 남긴다`, why: "기업 정보는 공식 확인 전입니다" },
    cx.records.length ? { text: `적어 둔 경험 ‘${cx.records[0].title}’에 ${withJosa(cx.records[0].needs[0].split("(")[0], "을를")} 채운다`, why: "검사 응답을 장면으로 말할 재료입니다" } : { text: "최근 과제 하나를 경험 기록으로 남긴다", why: "기록이 없으면 응답을 장면으로 말할 수 없습니다" },
    pr[1] && { text: pr[1].method, why: `${pr[1].domain}의 ‘${pr[1].what}’` },
  ].filter(Boolean).slice(0, 4).map((x, i) => ({ no: i + 1, ...(x as { text: string; why: string }) }));

  /* E 워크시트 */
  const worksheet = [
    ...st.slice(0, 2).map((s) => ({ title: `${s.name} 경험`, prefill: { decided: s.shown[0] ?? "", artifact: s.artifacts[0] ?? "", verify: s.verifications[0] ?? "" } })),
    { title: "새로 정리할 경험", prefill: {} as Record<string, string> },
  ].slice(0, 3);

  /* 출처 · 검증표 */
  const sources = set.orgs.flatMap((o) => o.sources.map((s) => ({ kind: s.kind, title: `${o.name} — ${s.title}`, url: s.url ?? null, checked_on: s.checked_on })))
    .concat(set.region_facts.map((f) => ({ kind: f.source.kind, title: f.source.title, url: f.source.url ?? null, checked_on: f.source.checked_on })));
  const usedIds = new Set(ex.groups.flatMap((g) => g.items.map((e) => e.org.id)));
  const verifyTable = set.orgs.filter((o) => usedIds.has(o.id)).map((o) => ({
    name: o.name, bizno: o.identifiers.bizno ?? "미확인", region: o.region as Region, origin: o.origin,
    verify: o.verify, checked: o.sources.map((s) => s.checked_on).sort().slice(-1)[0] ?? "",
  }));
  for (const e of ex.deep) trace.push({ section: "기업·직무 탐색 분석", claim: `${e.org.name} 심층`, from: e.links.map((l) => l.kind), company: e.org.id, job: e.jobs[0]?.role });
  for (const p of pr) trace.push({ section: "역량 개발 우선순위", claim: `${p.order}. ${p.domain}/${p.what}`, from: ["gaps", "actions", "role.required_axes", "industry.judgement_dimensions"], action: p.method.slice(0, 40) });
  for (const s of st) trace.push({ section: "강점 활용 전략", claim: s.name, from: [`domains[${s.code}].zone=${s.zone}`, `domains[${s.code}].decided`, `domains[${s.code}].artifacts`] });
  for (const d of dirs) trace.push({ section: "진로 탐색 방향", claim: `${d.name} ${d.readiness}`, from: ["role.core_ref.td × domains.zone", "role.required_axes × axes"], job: d.code });
  for (const c of cx.domains) trace.push({ section: "검사×경험 교차", claim: `${c.name} ${c.kind}`, from: [`domains[${c.code}]`, "v3_experiences.td_codes"] });
  for (const p of plan) trace.push({ section: "실행 계획", claim: `${p.period} ${p.what.slice(0, 30)}`, from: ["priorities", "explore.deep", "experiences"], action: p.output });

  return {
    core, meta, majorName: coreEntry(core).name_ko ?? core,
    opinion, radar: rad, map: interestEvidenceMap(m), reading: rd, cross: cx,
    strengths: st, priorities: pr, directions: dirs, explore: ex,
    application: { frame, stories, portfolio, interview: interview.slice(0, 7) },
    plan, final, worksheet,
    regionFacts: set.region_facts, checkedOn: set.checked_on,
    sources: sources.filter((s, i, xs) => xs.findIndex((y) => y.title === s.title) === i),
    verifyTable, trace,
    versions: {
      major: coreEntry(core).name_ko ?? core,
      ...Object.fromEntries(Object.entries(m.provenance.module_versions).map(([k, v]) => [k, String(v)])),
      result_model: m.provenance.result_model_version,
    },
    quality: { flag: m.response_quality.flag, text: rd.caution },
  };
}

export { axisWord };
