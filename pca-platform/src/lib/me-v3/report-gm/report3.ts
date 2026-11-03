/**
 * **PDF GOLD MASTER 3차 · 리포트 조립.** 장마다 쓸 값을 한 객체로 모은다.
 *
 * 판단은 결과 모델이 하고, 문장은 `analysis3.ts` 가, 직무·기업 설명은 손으로 쓴
 * 안내 자료(`guide.ts`)가 든다. 여기서는 그것을 학생 한 사람의 응답에 맞춰 엮는다.
 * 모든 결론 줄은 `trace` 에 어디서 왔는지를 함께 적는다. 저장하지 않는다.
 */
import type { ResultModel } from "../result/model";
import { coreOf } from "../result/model";
import { withJosa } from "../result/josa";
import { content, domainName } from "../runtime/session";
import { core as coreEntry } from "../core-registry";
import { interestEvidenceMap, radar, asked, rolePacks, industryPacks, type MapCell, type Radar } from "./profile";
import {
  andJoin, crossRows, directions3, domainRead, evidenceOf, growth, profileRead, recordRead, strategy3, strengths3, verifyTasks,
  type CrossRow, type Direction3, type DomainRead, type Growth, type Outside, type Priority3, type ProfileRead, type RecordRead,
  type Strength3, type Verify, type Experience,
} from "./analysis3";
import { explore, orgSet2, verifyLevel, factLevel, JOB_STATUS_KO, type Explore, type Org2, type OrgSet2, type Region } from "./companies";
import { companyGuide, roleGuide, type GuideSource } from "./guide";
import { JUDGE, VERIFY5, type VerifyLevel } from "./words";

const j = withJosa;
/* 제목에 이미 따옴표가 있으면 바깥 따옴표를 겹쳐 두지 않는다(‘…'…'…’). 안쪽 ASCII 따옴표는 ‘ ’ 로 바꾼다 */
const qt = (s: string) => /['‘’]/.test(s) ? s.replace(/'([^']+)'/g, "‘$1’") : `‘${s}’`;
export type Meta = {
  school: string | null; department: string | null; major: string | null;
  specialization: string | null; answeredOn: string | null; tier: string;
};
export type Trace = { section: string; claim: string; from: string[]; evidence?: string[] };

export type CompanyJob = {
  /** 학생의 탐색 직무 밖에서, 이 회사 안내가 함께 다루는 직무 */
  extra?: boolean;
  role: string; name: string; status: string; posted: string | null; tasks: string;
  flow: string[]; knowledge: string[]; tools: string[];
  have: string[]; need: string[];
  learn: string[]; project: { title: string; steps: string[]; output: string };
  portfolio: string; develop: string; selfIntro: string; interview: string[]; posting: string[];
  /** develop 문장이 기록·응답의 문장과 이 회사 직무의 한 단계를 짝지었는가 — 짝은 같은 판단(축)일 때만 짓는다 */
  pair: { axis: string | null; from: string; step: string | null } | null;
};
export type CompanyDeep = {
  id: string; name: string; region: Region; regionBasis: string; verify: VerifyLevel;
  bizno: string | null; listing: string | null; hq: string; sites: string[];
  headline: string; facts: { text: string; level: VerifyLevel }[]; market: string; products: string[];
  interpret: string[]; why: string; links: string[]; jobs: CompanyJob[];
  toCheck: string[]; sources: GuideSource[]; hiring: string;
};
/** `label` 은 한눈에 보기·로드맵 칸에 쓰는 짧은 이름이다. 긴 설명은 `what` */
export type PlanRow = { label: string; period: string; what: string; why: string; how: string; output: string; check: string };
export type Story = { from: string; fits: string[]; parts: { label: string; text: string; filled: boolean }[]; add: string };

/**
 * 면접 질문 한 줄. **질문이 묻는 판단(축)과 그 옆에 붙는 ‘내가 정한 것’ 은 같은 축이어야 한다.**
 * v7 은 질문과 상관없이 그 영역의 첫 문장을 붙여 ‘목표를 숫자로 정해 본 경험’ 옆에 ‘예산을 항목별로 나눴다’ 가 섰다.
 * `pick` 은 그 축에서 학생이 실제로 고른 문장이고, 없으면 비워 두어 화면이 직접 기입 칸을 세운다.
 */
export type Interview3 = { q: string; why: string; material: string; axis?: string; domain?: string; pick?: string };

export type Report3 = {
  core: string; meta: Meta; majorName: string;
  kind: "EVIDENCE" | "EARLY" | "MIXED";
  summary: { lead: string; points: { label: string; fact: string; meaning: string; limit: string; action: string }[]; glance: { label: string; value: string }[] };
  radar: Radar; map: MapCell[]; profile: ProfileRead;
  domains: DomainRead[]; records: RecordRead[]; cross: CrossRow[]; verify: Verify | null;
  strengths: Strength3[]; priorities: Priority3[]; directions: Direction3[]; growth: Growth | null;
  /** 실행 전략의 목표 직무와, 그 사슬에 걸리지 않아 이번 전략에서 뺀 빈자리 */
  strategy: { roleCode: string | null; roleName: string; outside: Outside[] };
  region: { facts: OrgSet2["region_facts"]; groups: { region: Region; items: Explore[] }[]; note: string; few: string | null };
  companies: CompanyDeep[];
  application: { stories: Story[]; portfolio: { title: string; include: string; from: string; status: "보유" | "새로 만들기" }[]; interview: Interview3[] };
  plan: PlanRow[];
  final: { text: string; label: string; why: string; when: string }[];
  worksheet: { title: string; prefill: Record<string, string> }[];
  verifyTable: { name: string; bizno: string; region: string; level: VerifyLevel; tag: string; used: "심층" | "목록"; checked: string }[];
  trace: Trace[];
  versions: Record<string, string>;
  checkedOn: string;
};

export function build3(m: ResultModel, meta: Meta, exps: Experience[], set: OrgSet2 = orgSet2()): Report3 {
  const core = coreOf(m);
  const nm = (td: string) => domainName(core, td);
  const trace: Trace[] = [];
  const prof = profileRead(m, exps);
  const st = strengths3(m);
  const strat = strategy3(m);
  const pr = strat.rows;
  const dirs = directions3(m);
  const gr = growth(m);
  const ex = explore(m, dirs, set, 4);
  const z1 = m.domains.filter((d) => d.zone === "Z1_EVIDENCE_ESTABLISHED");
  const z2 = m.domains.filter((d) => d.zone === "Z2_EVIDENCE_INCOMPLETE" || d.zone === "Z3_EVIDENCE_LOW_INTEREST");
  const kind: Report3["kind"] = z1.length ? "EVIDENCE" : z2.length ? "MIXED" : "EARLY";

  /* 영역 해설: 깊게 물은 영역 → 핵심만 물은 영역 → 관심이 높은데 묻지 않은 영역 */
  const order = [...m.domains.filter((d) => d.opened.deep), ...m.domains.filter((d) => !d.opened.deep && d.opened.probe)];
  const domains = order.map((d) => domainRead(m, d, exps));
  const unaskedHigh = m.domains.filter((d) => !asked(d) && d.interest === "HIGH").map((d) => domainRead(m, d, exps));
  const records = exps.map((e) => recordRead(m, e));
  const cross = crossRows(m, exps);
  const vt = verifyTasks(m, exps);
  for (const d of domains) trace.push({ section: "영역별 심층 해설", claim: `${d.name}: ${d.zoneTag}`, from: [`domains[${d.code}].zone`, `domains[${d.code}].axes`], evidence: [...d.decisions, ...d.artifacts, ...d.comparisons].slice(0, 6) });
  for (const r of records) trace.push({ section: "경험 기록 해설", claim: r.title, from: ["v3_experiences"], evidence: [...r.decisions, ...r.artifacts] });
  for (const c of cross) trace.push({ section: "검사·경험 교차", claim: `${c.name}: ${c.kind}`, from: [`domains[${c.code}]`, "v3_experiences.td_codes"] });

  /* 01 종합 의견 */
  const goalDir = dirs.find((d) => d.goal) ?? dirs[0];
  const points: Report3["summary"]["points"] = [];
  if (st[0]) {
    // 의미 문장은 고른 근거가 있는 만큼만 말한다: 결과물을 고르지 않은 학생에게 ‘문서로 남겼다’고 적지 않는다
    const s0 = st[0];
    const meaning0 = s0.artifacts.length
      ? `${s0.name}의 일을 스스로 맡아 해 봤고, 그 결과를 ${s0.artifacts[0]} 같은 결과물로 남겼다는 점이 이 결과에서 가장 분명하게 확인됩니다.`
      : s0.decisions.length || s0.acts.length
        ? `${s0.name}에서 스스로 해 본 일은 체크리스트 항목으로도 확인됩니다. 다만 그 일을 보여 줄 결과물은 아직 고르지 않았습니다.`
        : `${withJosa(s0.name, "은는")} 이 결과에서 가장 많은 판단을 스스로 해 봤다고 답한 영역입니다. 다만 그 장면을 보여 줄 체크리스트 항목과 결과물은 고르지 않아, 지금은 응답으로만 확인된 상태입니다. 그 영역의 수업 과제 하나를 골라 내가 정한 것과 남은 결과물을 경험 기록에 적으면 서류에 쓸 근거가 됩니다.`;
    points.push({ label: s0.artifacts.length || s0.decisions.length ? "가장 분명한 강점" : "가장 많이 해 봤다고 답한 영역", fact: s0.story, meaning: meaning0,
      limit: st[0].comparisons.length ? "결과물의 완성도와 실제 성과 수치는 이 검사로 확인하지 않았습니다." : "결과를 무엇과 비교했는지는 아직 응답에 없습니다.",
      action: st[0].show });
    trace.push({ section: "01 종합 의견", claim: points[points.length - 1].label, from: [`domains[${st[0].code}].zone`, `domains[${st[0].code}].decided`, `domains[${st[0].code}].artifacts`], evidence: [...st[0].decisions, ...st[0].artifacts] });
  } else if (gr) {
    points.push({ label: "지금의 출발점", fact: `관심은 ${gr.domains.join(", ")}에서 높게 나왔고, 이 영역들의 일을 스스로 맡아 해 본 경험은 아직 적다고 답했습니다.`,
      meaning: "관심이 분명한 영역이 있다는 것은 방향을 정하기 좋은 출발점입니다. 지금은 잘하는 일을 찾기보다 처음 해 볼 일을 고르는 단계입니다.",
      limit: "관심 응답은 그 일이 실제로 맞는지까지 말해 주지 않습니다. 직접 해 본 뒤에 다시 확인해야 합니다.",
      action: `첫 실무형 프로젝트로 ${withJosa(qt(gr.project.title), "을를")} 권합니다. 만드는 차례는 ‘포트폴리오 한 건 설계’ 쪽에 있습니다.` });
    trace.push({ section: "01 종합 의견", claim: "출발점", from: ["domains.interest=HIGH", "domains.zone=Z4"] });
  }
  if (prof.caution) points.push({ label: "응답을 읽을 때 주의할 점", fact: "판단을 묻는 질문에는 높게 답했지만, 그 장면을 체크리스트에서는 고르지 않은 영역이 있습니다.", meaning: "이 보고서는 그 판단들을 ‘직접 수행’ 단계까지만 반영했습니다.", limit: "응답이 틀렸다는 뜻이 아니라, 아직 확인할 자료가 없다는 뜻입니다.", action: "‘응답을 어떻게 읽었나’ 쪽의 확인 과제로 어느 쪽이 맞는지 스스로 확인할 수 있습니다." });
  if (pr[0]) {
    // 사실은 그 자리의 응답, 뜻은 목표 직무와의 연결 이유, 할 일은 목표 직무의 말로 쓴 과제와 산출물(실행 전략의 첫 줄)
    points.push({ label: "먼저 채울 부분", fact: pr[0].fact, meaning: /[.]$/.test(pr[0].link) ? pr[0].link : pr[0].link + ".",
      limit: pr[0].chain.result.includes("묻지 않았") ? "묻지 않았다는 것은 경험이 없다는 뜻이 아닙니다. 해 본 일이 있다면 기록부터 남기면 됩니다." : "확인되지 않았다는 것이 할 수 없다는 뜻은 아닙니다.",
      action: `${pr[0].how} 남길 것은 ${pr[0].output}입니다.` });
    trace.push({ section: "01 종합 의견", claim: `실행 전략 1 ${pr[0].domain}/${pr[0].title}`, from: ["targets.goal.role", "role.core_ref.td", "role.required_axes", `domains[${pr[0].code}].axes`, "role guide practice/lens"], evidence: [pr[0].chain.result, pr[0].chain.evidence] });
  }
  if (goalDir) {
    points.push({ label: "목표 직무 준비 상태", fact: `목표로 고른 직무는 ${goalDir.name}입니다. 이 직무의 핵심 판단을 기준으로 보면 지금은 ‘${goalDir.readiness}’ 단계입니다.`, meaning: goalDir.summary, limit: "직무 적합도나 합격 가능성을 계산한 것이 아닙니다.", action: pr.length
      ? `실행 전략은 ${pr.slice(0, 3).map((p) => `‘${p.title}’`).join(" → ")} 차례입니다. 모두 ${goalDir.name}의 업무 영역이나 핵심 판단에서 골랐습니다(‘역량 개발 우선순위’ 장).`
      : "지금 경험을 이 직무의 말로 정리하는 일이 남았습니다(‘단계별 실행 계획’ 장)." });
    trace.push({ section: "01 종합 의견", claim: `방향 ${goalDir.name} ${goalDir.readiness}`, from: ["targets.goal.role", "role.required_axes × domains.axes"], evidence: goalDir.have.map((h) => `${h.domain} — ${h.text}`) });
  }
  const lead = kind === "EVIDENCE"
    ? `${andJoin(z1.map((d) => nm(d.code)))}에서 직접 판단하고 결과물로 남긴 경험이 확인됩니다. 이 경험을 ${goalDir?.name ?? "목표 직무"}의 말로 정리하고, 비어 있는 판단 한두 가지를 채우는 것이 다음 6개월의 중심입니다.`
    : kind === "MIXED"
      ? `${z2.map((d) => nm(d.code)).join(", ")}에서 해 본 일은 응답으로 확인되지만, 그 경험을 보여 줄 근거가 아직 부족합니다. 해 본 일을 확인 가능한 기록으로 바꾸는 것이 첫 과제입니다.`
      : `${gr?.domains.join(", ") ?? "몇몇 영역"}에 관심이 분명하게 나왔습니다. 이 보고서는 그 관심을 첫 경험과 첫 포트폴리오로 바꾸는 순서를 담았습니다.`;
  /* 빈 칸은 무엇이 비었고 무엇을 하면 채워지는지를 적는다: ‘아직 없음’ 만 적으면 다음 줄을 읽어야 뜻이 선다 */
  const mapRows = interestEvidenceMap(m);
  const told = mapRows.filter((x) => x.depth === 1).map((x) => x.name);
  const glance = [
    { label: "직접 판단한 경험이 확인된 영역", value: z1.map((d) => nm(d.code)).join(" · ") || (pr[0] ? "없음 — 첫 근거는 실행 과제 1번에서" : "없음 — 직접 판단했다고 답한 영역 없음") },
    { label: "해 본 일은 있고 근거가 더 필요한 영역", value: z2.map((d) => nm(d.code)).join(" · ") || (told.length ? `없음 — ${told.length > 2 ? `${told.slice(0, 2).join(" · ")} 등 ${told.length}곳은` : withJosa(told.join(" · "), "은는")} 지시받아 해 본 단계` : "없음 — 스스로 해 봤다고 답한 영역 없음") },
    { label: "관심은 높고 경험이 적은 영역", value: m.domains.filter((d) => d.zone === "Z4_INSUFFICIENT_EVIDENCE").map((d) => nm(d.code)).join(" · ") || "없음" },
    { label: "목표 직무 · 준비 상태", value: goalDir ? `${goalDir.name} · ${goalDir.readiness}` : "—" },
    { label: "먼저 할 일", value: pr[0] ? `${pr[0].domain} · ${pr[0].title}` : "—" },
    { label: "먼저 살펴볼 진로 탐색 기업", value: ex.deep.map((e) => e.org.name).join(" · ") || "—" },
  ];

  /* 기업 심층 */
  const companies = ex.deep.map((e) => companyDeep(m, e, dirs, exps));
  for (const c of companies) trace.push({ section: "기업 심층 분석", claim: c.name, from: [...c.links], evidence: c.jobs.flatMap((x) => x.have).slice(0, 4) });

  /* 서류·면접 */
  const stories: Story[] = [];
  for (const s of st.slice(0, 2)) {
    stories.push({ from: `${s.name} — 검사 응답`, fits: s.jobs,
      parts: [
        { label: "상황과 내 역할", text: "직접 기입 — 어떤 수업·활동이었고, 팀에서 무엇을 맡았는지", filled: false },
        { label: "내가 정한 것", text: s.decisions[0] ?? s.acts[0] ?? "직접 기입", filled: !!(s.decisions[0] ?? s.acts[0]) },
        { label: "그 결과 남긴 것", text: s.artifacts[0] ?? "직접 기입", filled: !!s.artifacts[0] },
        { label: "무엇과 비교했고 무엇이 달라졌나", text: s.comparisons[0] ? `${withJosa(s.comparisons[0], "과와")} 비교 — 결과 수치는 직접 기입` : "직접 기입 — 목표·지난 실적·다른 안 가운데 하나와 비교", filled: !!s.comparisons[0] },
      ],
      add: s.comparisons.length ? "결과 수치와 기간을 넣으면 한 문단이 완성됩니다." : "결과를 무엇과 비교했는지가 비어 있어, 이 부분을 채워야 성과를 말할 수 있습니다." });
  }
  for (const r of records.slice(0, 2)) {
    if (stories.some((x) => x.from.includes(r.title))) continue;
    stories.push({ from: `${r.title} — 경험 기록`, fits: r.jobs.map((x) => x.name),
      parts: [
        { label: "상황과 내 역할", text: `${r.kind} · ${r.period}${r.usedWhere.length ? ` · ${r.usedWhere.join(", ")}` : ""} — 맡은 역할은 직접 기입`, filled: true },
        { label: "내가 정한 것", text: r.decisions[0] ?? "직접 기입 — 기록의 ‘직접 정한 것’ 칸이 비어 있습니다. 그 활동에서 내가 고른 것 하나를 적습니다", filled: !!r.decisions[0] },
        { label: "그 결과 남긴 것", text: r.artifacts.join(" · ") || "직접 기입 — 기록에 남은 결과물이 없습니다. 과제 파일·발표 자료의 이름을 적습니다", filled: !!r.artifacts.length },
        { label: "무엇과 비교했고 무엇이 달라졌나", text: r.comparisons[0] ?? "직접 기입 — 기록의 ‘비교 대상’ 칸이 비어 있습니다. 목표·지난 결과·다른 안 가운데 무엇과 비교했는지 적습니다", filled: !!r.comparisons[0] },
      ],
      add: r.check.slice(0, 2).join(", ") + "을 먼저 채워 두세요." });
  }
  const have = new Set(m.domains.flatMap((d) => d.artifacts).concat(exps.flatMap((e) => e.artifacts)));
  const portfolio: Report3["application"]["portfolio"] = [];
  for (const a of have) portfolio.push({ title: a, include: "결과물 한 장과, 그 안에서 내가 정한 것 한 줄·비교한 대상 한 줄", from: "검사·경험 기록에서 고른 결과물", status: "보유" });
  const goalGuide = goalDir ? roleGuide(goalDir.code) : null;
  for (const p of (goalGuide?.portfolio ?? []).slice(0, 3)) if (!portfolio.some((x) => x.title === p)) portfolio.push({ title: p, include: "목표 직무에서 흔히 보는 결과물(직무 일반)", from: `${goalDir!.name} 직무 안내`, status: "새로 만들기" });
  for (const c of companies.slice(0, 2)) for (const jb of c.jobs.slice(0, 1)) portfolio.push({ title: jb.project.title.replace(/^‘|’$/g, ""), include: jb.project.output, from: `${c.name} 탐색 프로젝트`, status: "새로 만들기" });
  const interview: Report3["application"]["interview"] = [];
  /* 고른 문장의 축: 그 영역 체크리스트에서 그 문장이 어느 판단(J1~J8) 아래 있는지 */
  const ckl = content(core).checklists.domains;
  const axisOfPick = (td: string, text: string): string | undefined =>
    Object.entries(ckl[td] ?? {}).find(([, list]) => list.some((x) => x.text === text))?.[0];
  const pickPool = [...st.map((s) => s.code), ...m.domains.map((d) => d.code)]
    .filter((c, i, a) => a.indexOf(c) === i)
    .flatMap((code) => { const d = m.domains.find((x) => x.code === code); if (!d) return []; const ev = evidenceOf(d);
      return [...ev.decisions, ...ev.acts].map((t) => ({ td: code, name: domainName(core, code), text: t, axis: axisOfPick(code, t) })); });
  const usedPick = new Set<string>();
  for (const s of st.slice(0, 2)) {
    const pick = s.decisions[0] ?? s.acts[0];
    if (pick) usedPick.add(`${s.code}|${pick}`);
    interview.push({ q: s.question, why: pick ? `${s.name}에서 고르신 판단을 면접관이 다시 묻는 질문입니다` : `${s.name}에서 스스로 해 봤다고 답한 장면을 다시 묻는 질문입니다 — 체크리스트에서 고른 문장이 없어, 답의 장면은 직접 적습니다`, material: [s.decisions[0], s.artifacts[0], s.comparisons[0]].filter(Boolean).join(" · ") || "직접 기입",
      // 고른 문장이 없으면 질문이 ‘결과가 기대와 달랐던 적’(실패·수정)을 묻는다
      axis: pick ? axisOfPick(s.code, pick) : "J7", domain: s.code, pick });
  }
  // 아직 확인되지 않은 자리의 질문은 목표 직무가 그 판단을 묻는 문항(역할팩)에서 고른다: 다른 직무의 장면으로 묻지 않는다
  for (const p of pr.slice(0, 2)) interview.push({
    q: p.ask ? `“${p.ask}”` : `“${p.domain} 과제에서 ${j(p.what, "을를")} 직접 맡아 본 적이 있나요?”`,
    why: `${strat.roleName}에서 ‘${p.title}’ 장면을 묻는 질문입니다. 아직 응답에서 확인되지 않아 미리 준비합니다`,
    material: `준비 — ${p.todo} → ${p.output}` });
  /* 직무 일반 질문은 그 질문이 묻는 판단(축)에서 학생이 고른 문장을 붙인다. 없으면 직접 기입이다 */
  /* 같은 판단 안에서도 질문의 말과 가장 가까운 문장을 고른다(두 글자 묶음 겹침). 이미 앞 질문이 그 장면을 물었으면 그 질문은 건너뛴다 */
  const bi = (t: string) => { const z = t.replace(/[\s“”‘’.,?·]/g, ""); const o = new Set<string>(); for (let i = 0; i < z.length - 1; i++) o.add(z.slice(i, i + 2)); return o; };
  const near = (a: string, b: string) => { const A = bi(a), B = bi(b); let n = 0; for (const x of A) if (B.has(x)) n++; return n / Math.max(1, Math.min(A.size, B.size)); };
  let guideN = 0;
  for (const q of (goalGuide?.interview ?? []) as { q: string; why: string; axis?: string }[]) {
    if (guideN >= 2) break;
    const same = q.axis ? pickPool.filter((x) => x.axis === q.axis) : [];
    const usedNear = same.filter((x) => usedPick.has(`${x.td}|${x.text}`)).some((x) => near(q.q, x.text) >= 0.3);
    if (usedNear) continue;
    const hit = same.filter((x) => !usedPick.has(`${x.td}|${x.text}`)).sort((a, b) => near(q.q, b.text) - near(q.q, a.text))[0];
    if (hit) usedPick.add(`${hit.td}|${hit.text}`);
    guideN++;
    interview.push({ q: `“${q.q}”`, why: q.why,
      material: hit ? `${hit.name}의 ${hit.text}` : `직접 기입 — 이 질문이 묻는 판단${q.axis && JUDGE[q.axis as keyof typeof JUDGE] ? `(${JUDGE[q.axis as keyof typeof JUDGE].name})` : ""}에서 고른 문장이 없습니다. 해 본 장면이 없으면 실행 과제의 결과물로 답합니다`,
      axis: q.axis, domain: hit?.td, pick: hit?.text });
  }

  /* 실행 계획 */
  const plan: PlanRow[] = [];
  /* 확인할 기업은 목표 직무의 일이 있는 곳을 먼저 */
  const goalCode = strat.roleCode;
  const goalJob = companies.flatMap((c) => c.jobs.map((jb) => ({ c, jb }))).find((x) => x.jb.role === goalCode);
  const c0 = goalJob?.c ?? companies[0];
  // 계획의 30·60일은 실행 전략의 첫 두 줄을 그대로 옮긴다: 무엇을=과제 · 왜=목표 직무와의 연결 · 어떻게=어디서
  const where = (p: Priority3) => p.where || "진행 중인 수업 과제나 팀 과제에서";
  if (pr[0]) plan.push({ label: pr[0].title, period: "30일", what: pr[0].todo, why: pr[0].link, how: where(pr[0]), output: pr[0].output, check: pr[0].check });
  else if (gr) plan.push({ label: gr.learn[0]?.step ?? "직무 기초 익히기", period: "30일", what: gr.learn[0]?.step ?? "직무 기초 익히기", why: gr.learn[0]?.why ?? "", how: "수업·온라인 강의", output: "학습 메모", check: "직무 공고 다섯 건의 담당 업무를 설명할 수 있는가" });
  plan.push({ label: records.length ? `경험 기록 ‘${records[0].title}’ 빈칸 채우기` : "최근 과제를 경험 기록으로 남기기", period: "30일", what: records.length ? `경험 기록 ‘${records[0].title}’의 빈칸 채우기 — ${records[0].check.slice(0, 2).join(" · ")}` : "가장 최근 수업 과제 하나를 경험 기록으로 처음 남기기", why: "기록이 있어야 검사 응답을 면접에서 장면으로 말할 수 있습니다", how: "내 CareerMatri의 경험 추가·고치기", output: "갱신된 경험 기록", check: "역할·정한 것·결과물·비교 대상 네 칸이 찼는가" });
  if (c0) plan.push({ label: `${c0.name} 공식 자료 직접 확인`, period: "60일", what: `${c0.name}의 공식 홈페이지·공시·채용 페이지를 직접 열람해 이 보고서의 기업 정보를 확인하기`, why: "이 보고서의 기업 정보는 제3자 자료와 검색 결과이며, 공식 원문을 직접 확인하지 않았습니다", how: "‘정리 워크시트’ 장의 기업 확인 메모에 출처와 확인일 적기", output: "기업 확인 메모", check: "사업·직무·근무지를 원문으로 확인했는가" });
  if (pr[1]) plan.push({ label: pr[1].title, period: "60일", what: pr[1].todo, why: pr[1].link, how: where(pr[1]), output: pr[1].output, check: pr[1].check });
  else if (gr) plan.push({ label: gr.entry[0], period: "60일", what: gr.entry[0], why: "첫 경험을 만들 수 있는 가장 가까운 곳입니다", how: "교내 수업·동아리·학회", output: "활동 기록 한 건", check: "그 활동에서 내가 정한 것이 하나 이상 있는가" });
  /* 90일 프로젝트: 깊게 본 기업 가운데 목표 직무의 일을 먼저 고르고, 없으면 목표 직무 안내의 첫 프로젝트 */
  const proj = goalJob?.jb.project ?? (goalCode ? roleGuide(goalCode)?.firstProject : undefined) ?? gr?.project;
  const projFrom = goalJob ? `${goalJob.c.name} · ${goalJob.jb.name}` : `${strat.roleName || "목표 직무"} 직무 안내`;
  if (proj) plan.push({ label: qt(proj.title), period: "90일", what: `실무형 프로젝트 ${qt(proj.title)} 완료(${projFrom})`, why: `${strat.roleName || "목표 직무"}의 일을 결과물로 남겨야 서류에서 쓰입니다`, how: (proj as { steps: string[] }).steps.slice(0, 2).join(" → ") + " …", output: proj.output, check: "다른 사람이 그 결과물만 보고 내가 무엇을 판단했는지 알 수 있는가" });
  plan.push({ label: stories[0] ? `${stories[0].from.split(" — ")[0]} 경험을 자기소개서·면접 답변으로` : "새 경험을 자기소개서 문단으로", period: "90일", what: stories[0] ? `${stories[0].from.split(" — ")[0]} 경험을 자기소개서 문단 하나와 면접 답변 하나로 정리하기` : "새로 만든 경험을 문단 하나로 정리하기", why: "경험이 문장으로 옮겨지지 않으면 서류에서 쓰이지 않습니다", how: "‘자기소개서·포트폴리오·면접 전략’ 장의 네 칸 구조에 맞춰 쓰고 수치·기간을 직접 넣기", output: "자기소개서 문단 초안과 답변 메모", check: "문단에 ‘내가 정한 것’과 ‘비교한 결과’가 들어 있는가" });
    /* 무엇을 남기는지까지 적는다: 목표 직무에서 흔히 보는 결과물 하나를 그 과제의 산출물로 */
  const outside = goalGuide?.portfolio?.[0];
  plan.push({ label: "학교 밖 과제 경험 하나 만들기", period: "6개월", what: `현장실습·공모전·학회 가운데 하나에서 팀 과제 하나를 맡아${outside ? ` ${j(outside, "을를")}` : " 결과물 한 건을"} 남기기(팀 3~5명 · 4~8주 규모)`, why: "학교 밖 과제의 결과물은 수업 과제보다 직무에 가깝게 보입니다", how: "교내 현장실습지원센터·취업지원 프로그램·학과 공모전 공지", output: outside ?? "실전 과제 결과물", check: "결과물에 고객·의뢰 기관의 의견이 남았는가" });
  /* **가진 결과물 수에 맞춰 적는다.** 고른 결과물이 0건인 학생에게 ‘3건을 묶기’ 를 적으면 없는 결과물을 있는 것처럼 읽힌다 */
  const owned = portfolio.filter((p) => p.status === "보유").length;
  const made = proj ? `90일 프로젝트 ${qt(proj.title)}의 결과물` : "90일 안에 만든 결과물";
  plan.push(owned === 0
    ? { label: "첫 결과물 한 건으로 포트폴리오 시작하기", period: "6개월", what: `${made}을 포트폴리오 첫 장으로 정리하기(지금은 고른 결과물이 0건이라 이것이 첫 장입니다)`, why: "결과물이 한 건이라도 있어야 서류에서 보여 줄 것이 생깁니다", how: "결과물 한 장에 ‘내가 정한 것’ 한 줄과 ‘무엇과 비교했나’ 한 줄 붙이기", output: "포트폴리오 첫 장", check: "그 한 장만 보고 내가 무엇을 판단했는지 알 수 있는가" }
    : owned < 3
      ? { label: `가진 결과물 ${owned}건에 새 결과물 하나를 더해 묶기`, period: "6개월", what: `고른 결과물 ${owned}건과 ${made}을 하나의 포트폴리오로 정리`, why: "흩어진 결과물은 지원 시점에 다시 찾기 어렵습니다", how: "결과물마다 ‘내가 정한 것·비교한 대상’ 한 줄 붙이기", output: `포트폴리오(${owned + 1}건)`, check: "결과물마다 내 역할이 한 줄로 적혀 있는가" }
      : { label: `결과물 ${owned}건을 포트폴리오로 묶기`, period: "6개월", what: `고른 결과물 ${owned}건을 하나의 포트폴리오로 정리`, why: "흩어진 결과물은 지원 시점에 다시 찾기 어렵습니다", how: "결과물마다 ‘내가 정한 것·비교한 대상’ 한 줄 붙이기", output: "포트폴리오", check: "결과물마다 내 역할이 한 줄로 적혀 있는가" });
  plan.push({ label: "지원 방향 정하고 공고 다섯 건과 대조", period: "12개월", what: `${andJoin(dirs.slice(0, 2).map((d) => d.name))} 가운데 지원할 방향을 정하고, 공고 다섯 건의 요구 조건을 이 보고서와 대조하기`, why: "1년이면 학년이 바뀌고 지원 시점이 가까워집니다", how: "공고의 담당 업무·우대 조건을 ‘직무별 실제 업무와 요구 역량’ 장의 ‘아직 확인되지 않은 요구’와 비교하기", output: "직무별 요구 조건 대조표", check: "공고 요구 가운데 아직 근거가 없는 항목을 셀 수 있는가" });
  plan.push({ label: "재검사로 이번 결과와 비교", period: "12개월", what: "CareerMatri 검사를 다시 보고 이번 결과와 비교하기", why: "근거가 늘었는지를 같은 기준으로 확인합니다", how: "담당자에게 재응시를 요청", output: "두 결과의 비교", check: "‘직접 수행’에서 ‘기준까지 직접 결정’으로 바뀐 판단이 있는가" });

  const final = [
    pr[0] && { text: pr[0].todo, label: pr[0].title, why: `${strat.roleName} 준비 — ${pr[0].link.replace(/[.]$/, "")}`, when: pr[0].when },
    !pr[0] && gr && { text: gr.entry[0], label: gr.entry[0], why: "첫 경험을 만드는 가장 가까운 활동입니다", when: "1~30일" },
    { text: records.length ? `경험 기록 ‘${records[0].title}’의 빈칸을 채운다` : "최근 과제 하나를 경험 기록으로 남긴다", label: records.length ? `경험 기록 ‘${records[0].title}’ 빈칸 채우기` : "최근 과제를 경험 기록으로 남기기", why: "검사 응답을 면접 장면으로 말할 재료입니다", when: "1~30일" },
    c0 && { text: `${c0.name}의 공식 자료를 직접 확인하고 확인 메모를 남긴다`, label: `${c0.name} 공식 자료 확인 메모`, why: "기업 정보는 공식 원문 확인 전입니다", when: "31~60일" },
    proj && { text: `${withJosa(qt(proj.title), "을를")} 끝까지 만들어 결과물로 남긴다`, label: `${qt(proj.title)} 완성`, why: "기업·직무 탐색을 결과물로 바꾸는 일입니다", when: "61~90일" },
  ].filter(Boolean).slice(0, 4) as Report3["final"];

  const worksheet = [
    ...(st.length ? st.slice(0, 1) : []).map((s) => ({ title: `${s.name} 경험 정리`, prefill: { decided: s.decisions[0] ?? s.acts[0] ?? "", artifact: s.artifacts[0] ?? "", verify: s.comparisons[0] ?? "" } })),
    ...records.slice(0, 1).map((r) => ({ title: `‘${r.title}’ 정리`, prefill: { decided: r.decisions[0] ?? "", artifact: r.artifacts[0] ?? "", verify: r.comparisons[0] ?? "" } })),
    { title: "새로 정리할 경험", prefill: {} as Record<string, string> },
  ].slice(0, 2);

  const usedDeep = new Set(ex.deep.map((e) => e.org.id));
  const usedAll = new Set(ex.groups.flatMap((g) => g.items.map((e) => e.org.id)));
  const verifyTable = set.orgs.filter((o) => usedAll.has(o.id)).map((o) => {
    const lv = verifyLevel(o);
    return { name: o.name, bizno: o.identifiers.bizno ?? "미확인", region: o.region, level: lv, tag: VERIFY5[lv].tag, used: usedDeep.has(o.id) ? "심층" as const : "목록" as const, checked: o.sources.map((s) => s.checked_on).sort().slice(-1)[0] ?? "" };
  });
  for (const s of st) trace.push({ section: "강점 활용", claim: s.name, from: [`domains[${s.code}].zone`, `domains[${s.code}].decided`], evidence: [...s.decisions, ...s.artifacts] });
  for (const p of pr) trace.push({ section: "개발 우선순위", claim: `${p.order}. [${p.relation}] ${p.domain}/${p.title}`, from: ["targets.goal.role", "role.core_ref.td", "role.required_axes", "gaps", "role guide practice/lens"], evidence: [p.chain.result, p.chain.evidence] });
  for (const d of dirs) trace.push({ section: "직무 분석", claim: `${d.name} ${d.readiness}`, from: ["role.core_ref.td × domains.zone", "role.required_axes × axes"], evidence: d.have.map((h) => `${h.domain} — ${h.text}`) });
  for (const p of plan) trace.push({ section: "실행 계획", claim: `${p.period} ${p.what.slice(0, 32)}`, from: ["priorities", "records", "companies", "growth"] });

  return {
    core, meta, majorName: coreEntry(core).name_ko ?? core, kind,
    summary: { lead, points, glance },
    radar: radar(m), map: interestEvidenceMap(m), profile: prof,
    domains: [...domains, ...unaskedHigh], records, cross, verify: vt,
    strengths: st, priorities: pr, directions: dirs, growth: gr,
    strategy: { roleCode: strat.roleCode, roleName: strat.roleName, outside: strat.outside },
    region: { facts: set.region_facts, groups: ex.groups, note: ex.note, few: ex.few },
    companies, application: { stories, portfolio: portfolio.slice(0, 8), interview: interview.slice(0, 8) },
    plan, final, worksheet, verifyTable, trace,
    versions: {
      major: coreEntry(core).name_ko ?? core,
      ...Object.fromEntries(Object.entries(m.provenance.module_versions).map(([k, v]) => [k, String(v)])),
      result_model: m.provenance.result_model_version,
    },
    checkedOn: set.checked_on,
  };
}

/* ── v9: 기록의 판단 ↔ 회사 직무 단계 짝짓기 ─────────────────────────────
 * v8 은 기록의 첫 ‘직접 정한 것’ 을 회사 직무 차례의 둘째 단계(`flow[1]`)에 무조건 붙였다.
 * 그래서 ‘여러 안 가운데 하나를 근거를 들어 골랐다’(기준과 배분) 가 ‘개발 단계와 다음 마일스톤을
 * 정리한다’(문서 정리) 와 ‘가까운 장면’ 으로 섰다. 짝은 **같은 판단(축)을 쓰는 단계**에만 짓는다:
 * 문장의 축은 체크리스트에서 그 문장이 서 있는 자리로 정하고, 단계의 축은 그 단계가 쓰는 동사로 본다.
 * 맞는 단계가 없으면 짝을 짓지 않고 그 사실을 적는다. */
const STEP_CUE: Record<string, string[]> = {
  J1: ["나눈다", "범위", "구성", "요구 사항"],
  J2: ["목표", "지표", "수치", "조건으로", "사양"],
  J3: ["고른", "고르", "정한다", "정하고", "선정", "배분", "가격안", "기준을 적용", "결정", "우선"],
  J4: ["검토", "조사", "분석", "시장 규모", "살핀다", "파악", "데이터"],
  J5: ["만든다", "쓴다", "작성", "보고서", "제안서", "자료를", "카탈로그", "서류", "기획한다"],
  J6: ["견준다", "비교", "대조", "본다", "확인", "추적"],
  J7: ["원인", "좁혀", "조정", "대체", "지연", "바꾼"],
  J8: ["보고", "잇는다", "연결", "넘긴다", "계약을 맺는다", "반영"],
};
export function stepForAxis(axis: string | null | undefined, flow: string[]): string | null {
  if (!axis || !STEP_CUE[axis]) return null;
  let best: string | null = null, bestN = 0;
  for (const st of flow) { const n = STEP_CUE[axis].filter((k) => st.includes(k)).length; if (n > bestN) { best = st; bestN = n; } }
  return best;
}
export function axisOfText(core: string, tds: string[], text: string): string | null {
  const ck = content(core).checklists.domains;
  for (const td of tds) { const hit = Object.entries(ck[td] ?? {}).find(([, list]) => list.some((x) => x.text === text)); if (hit) return hit[0]; }
  return null;
}

function companyDeep(m: ResultModel, e: Explore, dirs: Direction3[], exps: Experience[]): CompanyDeep {
  const core = coreOf(m);
  const o: Org2 = e.org;
  const g = companyGuide(o.id);
  const roles = rolePacks(core);
  const byCode = new Map(m.domains.map((d) => [d.code, d]));
  const facts = g?.facts.map((f) => ({ text: f.text, level: f.kind })) ?? o.facts.map((f) => ({ text: f.text, level: factLevel(o, f.src) }));
  const extraSrc = (g?.facts ?? []).map((f) => f.src).filter(Boolean) as GuideSource[];
  const sources: GuideSource[] = [...o.sources.map((s) => ({ kind: s.kind, title: s.title, url: s.url ?? null, checked_on: s.checked_on })), ...extraSrc]
    .filter((s, i, xs) => xs.findIndex((y) => y.title === s.title) === i);
  // 탐색 직무가 하나뿐인 회사는 그 회사 안내가 다루는 직무 하나를 더 본다: 같은 회사 안에서 경영 직무가 어떻게 갈리는지가 보여야 한다
  // 목표 직무의 일을 먼저 읽는다
  const goal = m.targets.goal.role;
  const pick = [...e.jobs].sort((a, b) => Number(b.role === goal) - Number(a.role === goal)).slice(0, 3).map((jb) => ({ ...jb, extra: false }));
  if (pick.length < 2 && g) {
    const add = o.jobs.find((x) => !pick.some((y) => y.role === x.role) && g.jobs[x.role]);
    if (add) pick.push({ ...add, name: roles.find((r) => r.code === add.role)?.name_ko ?? add.role, extra: true });
  }
  const jobs: CompanyJob[] = pick.map((jb) => {
    const rp = roles.find((r) => r.code === jb.role);
    const rg = roleGuide(jb.role);
    const cg = g?.jobs[jb.role];
    const tds = rp?.core_ref?.td ?? [];
    const req = rp?.required_axes ?? [];
    const have: string[] = [], need: string[] = [];
    for (const ax of req) {
      const hit = tds.map((td) => byCode.get(td)).find((d) => d && (d.owned.includes(ax) || d.confirmed.includes(ax)));
      if (hit) {
        const ev = evidenceOf(hit);
        // 그 판단의 체크리스트에서 고른 문장만 인용한다: 판단마다 같은 첫 문장을 붙이면 다른 판단의 근거가 된다
        const list = content(core).checklists.domains[hit.code]?.[ax] ?? [];
        const item = [...ev.decisions, ...ev.acts].find((t) => list.some((x) => x.text === t));
        have.push(`${JUDGE[ax].name} — ${domainName(core, hit.code)}에서 ${hit.owned.includes(ax) ? "기준까지 직접 정했다고 답함" : "스스로 해 봤다고 답함"}${item ? ` (‘${item}’)` : " (체크리스트에서 고른 항목 없음)"}`);
      } else need.push(`${JUDGE[ax].name} — ${JUDGE[ax].plain}`);
    }
    const rec = exps.find((x) => x.td_codes.some((td) => tds.includes(td)));
    const strongD = tds.map((td) => byCode.get(td)).find((d) => d && d.zone === "Z1_EVIDENCE_ESTABLISHED") ?? tds.map((td) => byCode.get(td)).find((d) => d && d.confirmed.length);
    const sev = strongD ? evidenceOf(strongD) : null;
    const flowAll = cg?.flow ?? (rg?.process.map((p) => p.what) ?? []);
    const roleKo = rp?.name_ko ?? jb.name;
    let pair: CompanyJob["pair"] = null;
    let develop: string;
    if (rec && rec.decisions[0]) {
      const ax = axisOfText(core, rec.td_codes, rec.decisions[0]) ?? "J3";
      const st = stepForAxis(ax, flowAll);
      pair = { axis: ax, from: rec.decisions[0], step: st };
      develop = st
        ? `경험 기록 ‘${rec.title}’의 ${withJosa(`‘${rec.decisions[0]}’`, "은는")} ${JUDGE[ax as keyof typeof JUDGE].name}의 장면입니다. 이 회사 ${roleKo} 일에서 같은 판단을 쓰는 단계는 ‘${st}’ 입니다. 면접에서는 이 둘을 나란히 놓고 말할 수 있습니다.`
        : `경험 기록 ‘${rec.title}’의 ${withJosa(`‘${rec.decisions[0]}’`, "은는")} ${JUDGE[ax as keyof typeof JUDGE].name}의 장면인데, 이 회사 ${roleKo} 일의 차례(${flowAll.length}단계)에는 같은 판단을 쓰는 단계가 적혀 있지 않아 짝을 짓지 않았습니다. 면접에서는 기록의 장면 그대로 설명하고, 이 회사 일과의 연결은 공고를 확인한 뒤 직접 적습니다.`;
    } else if (rec) {
      const shared = rec.td_codes.find((td) => tds.includes(td));
      develop = `경험 기록 ${withJosa(`‘${rec.title}’`, "은는")} 이 직무가 쓰는 ${shared ? domainName(core, shared) : "같은"} 영역의 기록이지만 ‘직접 정한 것’ 칸이 비어 있어, 아직 이 회사 ${roleKo} 일에 대어 말할 장면이 없습니다. 그 활동에서 내가 고른 것 하나(대상·기준·방법 가운데)를 기록에 먼저 적습니다.`;
    } else if (sev && (sev.decisions[0] ?? sev.acts[0])) {
      const from = sev.decisions[0] ?? sev.acts[0];
      const ax = axisOfText(core, [strongD!.code], from);
      const st = stepForAxis(ax, flowAll);
      pair = { axis: ax, from, step: st };
      develop = st
        ? `${domainName(core, strongD!.code)}에서 고른 ${withJosa(`‘${from}’`, "을를")} 이 회사의 ${withJosa(`‘${st}’`, "과와")} 같은 판단(${JUDGE[ax as keyof typeof JUDGE].name})으로 비교해 설명해 보세요. 같은 판단을 이 산업의 장면으로 옮기는 연습이 됩니다.`
        : `${domainName(core, strongD!.code)}에서 고른 ${withJosa(`‘${from}’`, "은는")} 이 회사 ${roleKo} 일의 차례에 같은 판단을 쓰는 단계가 적혀 있지 않아 짝을 짓지 않았습니다. 고른 장면 그대로 설명합니다.`;
    } else develop = `이 직무와 이어지는 경험 기록도, 체크리스트에서 고른 근거도 없습니다. 아래 프로젝트의 결과물이 이 회사·직무를 겨냥한 첫 경험이 됩니다.`;
    const selfIntro = sev && sev.artifacts[0]
      ? `자기소개서에서는 ${(sev.decisions[0] ?? sev.acts[0]) ? `${withJosa(`‘${sev.decisions[0] ?? sev.acts[0]}’`, "을를")} 중심 장면으로, ` : ""}${withJosa(sev.artifacts[0], "을를")} 결과로 두고, 이 회사의 ${o.industry_line} 맥락에서 그 판단이 왜 필요한지 한 문장을 덧붙이는 구성이 맞습니다.`
      : `지금은 자기소개서에 쓸 직접 경험이 부족합니다. 아래 프로젝트의 결과물(${cg?.project.output ?? rg?.firstProject.output ?? "결과물"})이 그 빈칸을 채웁니다.`;
    return {
      extra: jb.extra, role: jb.role, name: jb.name, status: JOB_STATUS_KO[jb.status], posted: jb.evidence ?? null, tasks: jb.tasks,
      flow: cg?.flow ?? (rg?.process.map((p) => `${p.step} — ${p.what}`) ?? []),
      knowledge: [...(cg?.learn ?? []), ...(rg?.knowledge.slice(0, 2) ?? [])].slice(0, 5), tools: rg?.tools.slice(0, 3) ?? [],
      have, need,
      learn: cg?.learn ?? rg?.knowledge ?? [],
      project: cg?.project ?? { title: rg?.firstProject.title ?? "", steps: rg?.firstProject.steps ?? [], output: rg?.firstProject.output ?? "" },
      portfolio: cg?.portfolio ?? rg?.portfolio[0] ?? "", develop, selfIntro, pair,
      interview: [...(cg?.interview ?? []), ...(rg?.interview.slice(0, 1).map((x) => x.q) ?? [])].slice(0, 3),
      posting: [...(cg?.posting ?? []), ...(rg?.postingCheck.slice(0, 1) ?? [])].slice(0, 4),
    };
  });
  const inds = industryPacks(core);
  const links = e.links.map((l) => l.text);
  return {
    id: o.id, name: o.name, region: o.region, regionBasis: o.region_basis, verify: verifyLevel(o),
    bizno: o.identifiers.bizno, listing: o.identifiers.listing, hq: o.hq.text, sites: o.sites,
    headline: g?.headline ?? o.industry_line, facts, market: g?.market ?? "", products: g?.products ?? [],
    interpret: g?.interpret ?? o.interpretation, why: g?.why ?? "", links,
    jobs, toCheck: o.to_check, sources, hiring: o.hiring.note,
  };
  void inds;
}

export { JUDGE };
