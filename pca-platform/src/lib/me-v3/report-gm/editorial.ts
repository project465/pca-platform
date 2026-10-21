/**
 * **BIZ 진로·직무 분석 결과지 4차(편집 재설계)의 쪽 모델.** 굳은 결과(`Report3`)와 직무 일반 안내
 * (`data/report-gm/biz-editorial.v1.json`)만 읽는다. 새 판단을 만들지 않고, 점수·순위·합격 가능성을 만들지 않는다.
 *
 * **기업 자료를 읽지 않는다.** `Report3.companies` · `plan` 의 기업 줄 · `region` · `final` 은 이 모델에 들어오지 않는다
 * (4차 지시 §2: 학생용 본문에서 공시·재무·접수번호·기업 개요를 뺀다). 조직은 유형까지만 적는다.
 *
 * 줄마다 근거의 층을 하나 붙인다(`Src`). 학생이 고른 응답과 직접 쓴 기록을 검증된 사실로 적지 않는다.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { withJosa } from "../result/josa";
import type { Report3 } from "./report3";
import { JUDGE, STEP, UNASKED } from "./words";

export type Src = "응답 확인" | "학생 자기기록" | "일반 직무 안내" | "분석 제안";
export type Line = { text: string; src: Src };

type Phase = { phase: string; scene: string; input: string; decide: string; with: string; output: string };
type Art = { key: string; title: string; use: string; fields: string[]; judge: string[] };
export type RoleGuide = {
  name: string; line: string; cycle: Phase[]; situations: { when: string; decide: string }[]; notThis: string;
  org: { type: string; how: string }[]; artifacts: Art[]; posting: string[]; probes: string[];
};
type Confusion = { a: string; b: string; a_does: string; b_does: string; a_output: string; b_output: string; same: string; tell: string };
type Lib = { roles: Record<string, RoleGuide>; confusions: Confusion[] };

let LIB: Lib | null = null;
export function editorialLib(): Lib {
  if (!LIB) LIB = JSON.parse(readFileSync(path.join(process.cwd(), "data/report-gm/biz-editorial.v1.json"), "utf8")) as Lib;
  return LIB;
}

/** 직무가 일하는 중심 영역(그 직무 쪽 판단을 이번 검사가 물었는지 볼 때 쓴다) */
const ROLE_TD: Record<string, string> = {
  ROLE_PLAN_V1: "TD01", ROLE_ANALYTICS_V1: "TD08", ROLE_FINACC_V1: "TD05", ROLE_OPS_V1: "TD07",
  ROLE_CS_V1: "TD09", ROLE_SALES_V1: "TD03", ROLE_MKT_V1: "TD02", ROLE_HR_V1: "TD06",
};
const NAME_CODE: Record<string, string> = {
  경영기획: "ROLE_PLAN_V1", "데이터·분석": "ROLE_ANALYTICS_V1", "재무·회계": "ROLE_FINACC_V1", "운영관리·총무": "ROLE_OPS_V1",
  "총무·경영지원": "ROLE_OPS_V1", "서비스·고객운영": "ROLE_CS_V1", "영업·사업개발": "ROLE_SALES_V1", 마케팅: "ROLE_MKT_V1", 인사: "ROLE_HR_V1",
};

export type MapRow = { code: string; name: string; interest: "HIGH" | "MID" | "LOW"; depth: number | null };
export type DnaDomain = {
  code: string; name: string; tag: string; levels: { axis: string; name: string; level: number | null }[];
  decided: string[]; did: string[]; left: string[]; compared: string[]; open: string[];
  flow: { step: number; name: string; detail: string; cover: string }[];
};
export type RoleView = {
  code: string; name: string; guide: RoleGuide; target: boolean; readiness: string;
  have: Line[]; need: string[]; td: string; tdName: string; tdDepth: number | null;
};
export type ConfView = Confusion & { aDepth: number | null; bDepth: number | null; aTd: string; bTd: string; leans: string };
export type Chain = {
  title: string; kind: string; period: string; claim: Line | null;
  rows: { label: string; items: string[]; empty: string }[]; tests: string[]; check: string[];
};
export type Tpl = { title: string; use: string; fields: string[]; judge: string[]; status: "비슷한 기록 있음" | "새로 만들기"; mine: string[] };
export type Probe = { q: string; why: string; have: Line | null; prep: Line | null; axis: string };
export type PlanItem = { when: string; title: string; task: string; output: string; check: string; where: string; domain: string };

export type Ed = {
  who: { school: string; department: string; specialization: string; answeredOn: string; tier: string };
  kind: "EVIDENCE" | "EARLY" | "MIXED";
  verdict: { head: string; sub: string; have: Line[]; unknown: Line[] };
  map: { rows: MapRow[]; notes: Line[] };
  goal: { role: string; pick: Line | null; context: string | null };
  first: PlanItem & { why: string };
  dna: { domains: DnaDomain[]; lead: string; strong: string[]; weak: string[]; unasked: string[] };
  roles: RoleView[];
  confusion: ConfView | null;
  chains: Chain[];
  cross: { name: string; test: string; record: string; reading: string }[];
  org: { type: string; how: string }[];
  templates: Tpl[];
  story: { from: string; parts: { label: string; text: string; filled: boolean }[] } | null;
  probes: Probe[];
  plan: { when: string; items: PlanItem[] }[];
  limits: string[];
  versions: string[];
};

const q = (s: string) => `‘${s}’`;
const uniq = <T>(a: T[]) => [...new Set(a)];
const and = (a: string[]) => (a.length <= 1 ? a.join("") : a.length === 2 ? `${withJosa(a[0], "과와")} ${a[1]}` : `${a.slice(0, -1).join(", ")}, ${a[a.length - 1]}`);
const DIRECT = "직접 기입";
const isBlank = (s: string) => !s || s.startsWith(DIRECT) || s.startsWith("준비");
/** 결과물 이름끼리 같은 것을 가리키는지 본다: 두 글자 이상 낱말 하나가 겹치면 후보로 둔다(확정하지 않는다) */
const STOPW = ["한벌", "한장", "메모", "기록", "비교표", "정의표", "점검표", "기준표", "요건표", "보고", "보고서", "계획", "분석", "양식", "결정", "근거"];
const words = (s: string) => s.replace(/[·,()‘’“”]/g, " ").split(/\s+|와|과/).filter((w) => w.length >= 2 && !STOPW.includes(w));
const overlaps = (a: string, b: string) => words(a).some((w) => words(b).includes(w));

/** 판단마다 면접관이 묻는 말과 보는 것(일반 직무 안내) */
export const ASKQ: Record<string, string> = {
  J1: "그 과제에서 다루지 않기로 한 것은 무엇이었고, 왜 뺐나요?",
  J2: "그 목표를 숫자로 바꿀 때 목표값은 어떻게 정했나요?",
  J3: "다른 안은 왜 고르지 않았나요? 무엇을 기준으로 정했나요?",
  J4: "그 방법을 고른 까닭은 무엇이고, 다른 방법이었다면 무엇이 달라졌을까요?",
  J5: "그 결과물을 다음에 누가 받아서 썼나요?",
  J6: "무엇과 비교해서 나아졌다고 판단했나요?",
  J7: "기대와 다른 결과가 나왔을 때 무엇을 바꿨나요?",
  J8: "그 결과가 실제 결정에 쓰였나요? 무엇이 바뀌었나요?",
};
/** 아직 장면이 없는 판단을 묻는 말(‘그 목표’처럼 경험을 전제하지 않는다) */
export const ASKQ0: Record<string, string> = {
  J1: "과제에서 다루지 않기로 한 것을 직접 정해 본 적이 있나요?",
  J2: "막연한 목표를 숫자로 바꿔 본 적이 있나요? 목표값은 어떻게 정했나요?",
  J3: "여러 안 가운데 하나를 고를 때 기준을 먼저 세워 본 적이 있나요?",
  J4: "자료를 모으는 방법을 직접 골라 본 적이 있나요?",
  J5: "다른 사람이 이어 받아 쓴 결과물을 만든 적이 있나요?",
  J6: "결과를 목표나 지난 결과와 같은 조건으로 비교해 본 적이 있나요?",
  J7: "기대와 다른 결과가 나왔을 때 까닭을 좁혀 계획을 바꿔 본 적이 있나요?",
  J8: "내가 만든 결과가 다음 결정에 쓰인 적이 있나요?",
};
export const ASKWHY: Record<string, string> = {
  J1: "일의 범위를 스스로 자르는지 봅니다.", J2: "목표를 잴 수 있게 만드는지 봅니다.", J3: "기준을 먼저 세우고 고르는지 봅니다.",
  J4: "방법을 고른 까닭을 말할 수 있는지 봅니다.", J5: "다른 사람이 쓸 수 있게 남기는지 봅니다.", J6: "나아졌다는 말에 비교 대상이 있는지 봅니다.",
  J7: "틀렸을 때 까닭을 좁히는지 봅니다.", J8: "결과가 실제로 쓰였는지 봅니다.",
};
/** 고른 문장이 어느 판단에서 왔는지: 그 영역의 흐름 단계 이름과 문장 낱말로 가린다(축 정보가 문장에 없으므로 결정 문장→J3, 행동→흐름 순서) */
export function axisOfPick(d: Report3["domains"][number], pick: string): string {
  const has = (re: RegExp) => re.test(pick);
  if (has(/지표|숫자|건수|전환율|도달/)) return "J2";
  if (has(/골랐|나눴|배분|기준을 정|볼 기준/)) return "J3";
  if (has(/분석 틀|분석 방법|도구|방법을 골/)) return "J4";
  if (has(/문서로|남겼|정의표를|기획서/)) return "J5";
  if (has(/견주|비교|같은 조건/)) return "J6";
  if (has(/까닭|뒤집|고쳤|바꿨/)) return "J7";
  if (has(/다룰 것|범위|좁혔|갈라 적|나눠 적/)) return "J1";
  if (has(/반영|결정에 쓰/)) return "J8";
  return d.levels.find((l) => (l.level ?? 0) >= 2)?.axis ?? "J3";
}

export function edit(r: Report3): Ed {
  const lib = editorialLib();
  const map: MapRow[] = r.map.map((m) => ({ code: m.code, name: m.name, interest: m.interest as MapRow["interest"], depth: m.depth ?? null }));
  const depthOf = (td: string) => map.find((m) => m.code === td)?.depth ?? null;
  const nameOf = (td: string) => map.find((m) => m.code === td)?.name ?? td;
  const asked = r.domains.filter((d) => d.levels.some((l) => l.level !== null));
  const unaskedHigh = map.filter((m) => m.depth === null && m.interest === "HIGH").map((m) => m.name);
  const z1 = asked.filter((d) => d.zone === "Z1_EVIDENCE_ESTABLISHED");
  const roleCode = r.strategy.roleCode;
  const roleName = r.strategy.roleName;
  const roleTd = ROLE_TD[roleCode] ?? r.directions[0]?.tds[0] ?? "";
  const p1 = r.priorities[0];

  /* ── 한 문장 진단: 묶음 판단은 결과 모델이 한 것(`kind`)을 그대로 쓰고, 문장만 새로 짓는다 ── */
  let head: string; let sub: string;
  if (r.kind === "EVIDENCE") {
    head = `${and(z1.map((d) => d.name))}에서 기준을 직접 정해 본 경험이 있습니다.`;
    sub = `남은 일은 둘입니다. 그 경험을 ${roleName}의 말로 옮기는 것, 그리고 아직 응답에 없는 ${withJosa(q(p1.what), "을를")} 한 번 직접 해 보는 것.`;
  } else if (r.kind === "EARLY") {
    const top = map.filter((m) => m.interest === "HIGH").map((m) => m.name).slice(0, 3);
    head = "관심은 분명하고, 해 본 일은 아직 적습니다.";
    sub = `${and(top)}에 관심이 높게 나왔습니다. 판단을 스스로 해 봤다는 응답은 아직 없습니다. 지금 필요한 것은 결과물 하나를 처음부터 끝까지 직접 만들어 보는 일입니다.`;
  } else {
    const did = asked.filter((d) => d.levels.some((l) => (l.level ?? 0) >= 2)).map((d) => d.name);
    head = "해 본 일과 가려는 일이 서로 다른 곳에 있습니다.";
    sub = `해 본 일은 ${and(did)} 쪽에서 확인됩니다. 목표로 고른 ${roleName}의 중심 영역인 ${withJosa(nameOf(roleTd), "은는")} 이번 검사에서 판단을 자세히 묻지 않았습니다. 먼저 ${roleName} 일을 작게 한 번 해 보고, 이미 있는 경험 가운데 겹치는 장면을 골라냅니다.`;
  }

  const have: Line[] = [];
  for (const d of z1) if (d.decisions[0]) have.push({ text: `${d.name}: ${q(d.decisions[0])}`, src: "응답 확인" });
  if (r.kind !== "EVIDENCE") {
    for (const d of asked.filter((x) => x.levels.some((l) => (l.level ?? 0) >= 2)).slice(0, 2)) {
      const n = d.levels.filter((l) => (l.level ?? 0) >= 2).length;
      have.push({ text: `${d.name}: 여덟 판단 가운데 ${n}가지를 스스로 해 봤다고 답함`, src: "응답 확인" });
    }
  }
  for (const x of r.records) {
    if (x.decisions.length || x.artifacts.length) have.push({ text: `${x.title}: ${x.artifacts.length ? `결과물 ${x.artifacts.join(" · ")}` : q(x.decisions[0])}`, src: "학생 자기기록" });
  }
  if (!have.length) {
    for (const m of map.filter((m) => m.interest === "HIGH").slice(0, 2)) have.push({ text: `${m.name}: 관심 높음`, src: "응답 확인" });
    for (const x of r.records) have.push({ text: `${x.title}: 기록은 있지만 내용 칸이 비어 있음`, src: "학생 자기기록" });
  }

  const unknown: Line[] = [];
  if (unaskedHigh.length) unknown.push({ text: `${and(unaskedHigh.slice(0, 3))}: 관심은 높지만 판단을 묻지 않아 깊이를 모릅니다`, src: "응답 확인" });
  if (depthOf(roleTd) === null) unknown.push({ text: `목표 직무의 중심 영역 ${nameOf(roleTd)}: 이번 검사에서 묻지 않았습니다`, src: "응답 확인" });
  if (r.records.some((x) => !x.comparisons.length)) unknown.push({ text: "경험 기록의 ‘비교 대상’이 비어 있어, 결과가 나아졌는지는 알 수 없습니다", src: "학생 자기기록" });
  unknown.push({ text: "결과물의 완성도와 실제 수치는 이 검사로 확인하지 않았습니다", src: "분석 제안" });

  /* ── 12영역 지도에 붙이는 읽기 ── */
  const notes: Line[] = [];
  if (unaskedHigh.length) notes.push({ text: `관심이 높은데 묻지 않은 영역 ${unaskedHigh.length}곳: ${unaskedHigh.join(", ")}`, src: "응답 확인" });
  const lowDid = map.filter((m) => m.interest === "LOW" && (m.depth ?? 0) >= 2).map((m) => m.name);
  if (lowDid.length) notes.push({ text: `해 봤지만 관심이 낮게 나온 영역 ${lowDid.length}곳: ${lowDid.join(", ")}`, src: "응답 확인" });
  const hiShallow = map.filter((m) => m.interest === "HIGH" && m.depth !== null && m.depth <= 1).map((m) => m.name);
  if (hiShallow.length) notes.push({ text: `관심은 높고 아직 지시받은 범위까지만 해 본 영역 ${hiShallow.length}곳: ${hiShallow.join(", ")}`, src: "응답 확인" });
  const deep = map.filter((m) => (m.depth ?? 0) >= 3).map((m) => m.name);
  if (deep.length) notes.push({ text: `기준까지 직접 정해 본 영역 ${deep.length}곳: ${deep.join(", ")}`, src: "응답 확인" });

  /* ── 목표 직무와 첫 행동 ── */
  const goalDir = r.directions.find((d) => d.code === roleCode);
  const ctx = p1?.chain?.goal?.split(" · ")[1] ?? null;
  const first: PlanItem & { why: string } = {
    when: p1.when, title: p1.title, task: p1.todo, output: p1.output, check: p1.check, where: p1.where, domain: p1.domain,
    why: p1.fact,
  };

  /* ── 일하는 방식: 응답으로 확인된 판단만 ── */
  const dnaDomains: DnaDomain[] = asked.map((d) => ({
    code: d.code, name: d.name, tag: d.zoneTag,
    levels: d.levels.map((l) => ({ axis: l.axis, name: l.name, level: l.level })),
    decided: d.decisions, did: d.acts, left: d.artifacts, compared: d.comparisons,
    open: d.levels.filter((l) => l.level !== null && l.level <= 1).map((l) => l.name),
    flow: d.flow.map((f) => ({ step: f.step, name: f.name, detail: f.detail, cover: f.cover })),
  }));
  const axes = Object.keys(JUDGE);
  const best = (ax: string) => Math.max(-1, ...dnaDomains.map((d) => d.levels.find((l) => l.axis === ax)?.level ?? -1));
  const strong = axes.filter((a) => best(a) >= 3).map((a) => JUDGE[a as keyof typeof JUDGE].name);
  const weak = axes.filter((a) => best(a) >= 0 && best(a) <= 1).map((a) => JUDGE[a as keyof typeof JUDGE].name);
  let lead: string;
  if (strong.length) lead = `기준까지 직접 정했다고 답한 판단은 ${and(strong)}입니다.${weak.length ? ` 어느 영역에서도 아직 지시받은 범위를 넘지 않은 판단은 ${and(weak)}입니다.` : ""}`;
  else if (dnaDomains.some((d) => d.levels.some((l) => (l.level ?? 0) >= 2))) lead = `스스로 맡아 해 본 판단은 있지만, 기준까지 직접 정했다는 응답은 없습니다.${weak.length ? ` 비어 있는 판단은 ${and(weak)}입니다.` : ""}`;
  else lead = "물어본 영역 모두에서 아직 ‘지시받아 수행’까지만 답했습니다. 판단을 처음으로 직접 맡아 보는 일이 첫 과제입니다.";

  /* ── 직무 세 개: 목표 직무 + 결과 모델이 함께 보라고 고른 두 직무 ── */
  const roles: RoleView[] = r.directions.slice(0, 3).filter((d) => lib.roles[d.code]).map((d) => {
    const td = ROLE_TD[d.code] ?? d.tds[0];
    return {
      code: d.code, name: d.name, guide: lib.roles[d.code], target: d.code === roleCode, readiness: d.readiness,
      have: d.have.map((h) => ({ text: `${h.domain}: ${h.text}`, src: "응답 확인" as Src })),
      need: d.need.map((n) => n.name), td, tdName: nameOf(td), tdDepth: depthOf(td),
    };
  });
  if (!roles.find((x) => x.target) && lib.roles[roleCode]) {
    roles.unshift({ code: roleCode, name: roleName, guide: lib.roles[roleCode], target: true, readiness: goalDir?.readiness ?? "", have: [], need: [], td: roleTd, tdName: nameOf(roleTd), tdDepth: depthOf(roleTd) });
  }

  const conf = lib.confusions.find((c) => NAME_CODE[c.a] === roleCode || NAME_CODE[c.b] === roleCode) ?? null;
  let confusion: ConfView | null = null;
  if (conf) {
    const aTd = ROLE_TD[NAME_CODE[conf.a]]; const bTd = ROLE_TD[NAME_CODE[conf.b]];
    const aDepth = depthOf(aTd); const bDepth = depthOf(bTd);
    let leans: string;
    if (aDepth === null && bDepth === null) leans = `두 직무의 중심 영역(${nameOf(aTd)} · ${nameOf(bTd)}) 모두 이번 검사에서 묻지 않았습니다. 어느 쪽인지는 아래 질문에 직접 답해 보며 가립니다.`;
    else if ((aDepth ?? -1) === (bDepth ?? -1)) leans = `두 영역에서 같은 단계로 답했습니다. 응답만으로는 어느 쪽으로 기우는지 가를 수 없습니다.`;
    else {
      const [hi, hiTd, hiD] = (aDepth ?? -1) > (bDepth ?? -1) ? [conf.a, aTd, aDepth] : [conf.b, bTd, bDepth];
      leans = `응답은 ${hi} 쪽에 가깝습니다. ${nameOf(hiTd)}에서 ${STEP[(hiD ?? 0) as 0 | 1 | 2 | 3].tag}까지 답했습니다.`;
    }
    confusion = { ...conf, aDepth, bDepth, aTd: nameOf(aTd), bTd: nameOf(bTd), leans };
  }

  /* ── 증거: 경험 기록마다 주장 → 한 일 → 정한 것 → 남긴 것 → 견준 것 ── */
  const chains: Chain[] = r.records.map((x) => ({
    title: x.title, kind: x.kind, period: x.period,
    claim: x.decisions[0] ? { text: `${x.title.split(" — ")[0]}에서 ${x.decisions[0].replace(/다$/, "습니다")}`, src: "학생 자기기록" } : null,
    rows: [
      { label: "다룬 문제", items: x.problems, empty: "어떤 문제를 풀었는지 한 줄로 적습니다." },
      { label: "직접 정한 것", items: x.decisions, empty: "그 활동에서 내가 정한 것 하나를 떠올려 적습니다." },
      { label: "남긴 결과물", items: x.artifacts, empty: "과제 파일·발표 자료의 이름을 적습니다." },
      { label: "비교 대상", items: x.comparisons, empty: "목표·지난 결과·다른 안 가운데 무엇과 비교했는지 적습니다." },
      { label: "쓰인 곳", items: x.usedWhere, empty: "결과가 어디에 쓰였는지(발표·제출·운영) 적습니다." },
    ],
    tests: x.testSays.map((t) => t.text.replace(/^검사에서도 /, `${t.domain}: 검사에서도 `)),
    check: x.check,
  }));
  const READ: Record<string, string> = {
    BOTH: "응답과 기록이 같은 쪽을 가리킵니다. 면접에서 장면으로 쓸 수 있습니다.",
    TEST_ONLY: "응답으로는 확인되지만 기록이 없습니다. 그 과제를 기록으로 남깁니다.",
    RECORD_ONLY: "기록은 있지만 이번 검사에서 그 영역을 자세히 묻지 않았습니다.",
    UNBACKED: "해 봤다고 답했지만 고른 근거 문장이 없습니다. 장면을 직접 적어야 합니다.",
    DIFFERENT: "기록이 가리키는 영역을 이번 검사에서 묻지 않았습니다. 기록이 유일한 근거입니다.",
  };
  const cross = r.cross.map((c) => ({ name: c.name, test: c.test, record: c.record, reading: READ[c.kind] ?? c.reading }));

  /* ── 포트폴리오 양식: 목표 직무의 결과물 셋. 학생 결과물과 이름이 겹치면 ‘옮길 것 있음’으로만 둔다 ── */
  const mine = uniq([...asked.flatMap((d) => d.artifacts), ...r.records.flatMap((x) => x.artifacts)]);
  const tg = lib.roles[roleCode];
  const templates: Tpl[] = (tg?.artifacts ?? []).map((a) => {
    const m = mine.filter((x) => overlaps(x, a.title));
    return { title: a.title, use: a.use, fields: a.fields, judge: a.judge, status: m.length ? "비슷한 기록 있음" : "새로 만들기", mine: m };
  });

  /* ── 지원서 한 문단: 채워진 칸이 가장 많은 이야기 하나 ── */
  const st = [...r.application.stories].sort((a, b) => b.parts.filter((p) => p.filled).length - a.parts.filter((p) => p.filled).length)[0];
  const story = st ? { from: st.from.replace(/ — (검사 응답|경험 기록)$/, ""), parts: st.parts.map((p) => ({ label: p.label, text: isBlank(p.text) ? "" : p.text, filled: p.filled && !isBlank(p.text) })) } : null;

  /* ── 면접 질문과 꺼낼 재료: 질문을 판단(축)에서 직접 만든다. 재료는 같은 영역·같은 판단의 응답이나, 같은 판단의 실행 과제뿐 ── */
  const probes: Probe[] = [];
  const seenAx = new Set<string>();
  for (const d of r.domains) {
    for (const l of d.levels) {
      if ((l.level ?? 0) < 2 || seenAx.has(l.axis)) continue;
      const pick = [...d.decisions, ...d.acts].find((x) => axisOfPick(d, x) === l.axis);
      if (!pick) continue;
      seenAx.add(l.axis);
      probes.push({ q: ASKQ[l.axis], why: ASKWHY[l.axis], have: { text: `${d.name}: ${q(pick)}${d.artifacts[0] ? ` · 결과물 ${d.artifacts[0]}` : ""}`, src: "응답 확인" }, prep: null, axis: l.axis });
      if (probes.length >= 3) break;
    }
    if (probes.length >= 3) break;
  }
  for (const p of r.priorities) {
    if (seenAx.has(p.axis) || probes.length >= 6) continue;
    seenAx.add(p.axis);
    probes.push({ q: ASKQ0[p.axis], why: ASKWHY[p.axis], have: null, prep: { text: `${p.when}에 ${p.domain} 쪽에서 ${withJosa(p.output, "을를")} 만들면 이 질문의 답이 됩니다`, src: "분석 제안" }, axis: p.axis });
  }
  for (const ax of Object.keys(ASKQ0)) {
    if (probes.length >= 6 || seenAx.has(ax)) continue;
    const best = Math.max(-1, ...r.domains.map((d) => d.levels.find((l) => l.axis === ax)?.level ?? -1));
    if (best < 0 || best > 1) continue;
    seenAx.add(ax);
    probes.push({ q: ASKQ0[ax], why: ASKWHY[ax], have: null, prep: { text: `${JUDGE[ax as keyof typeof JUDGE].name}: 다음 과제에서 이 판단을 직접 맡아 보고 그 장면을 적어 둡니다`, src: "분석 제안" }, axis: ax });
  }

  const plan = (["1~30일", "31~60일", "61~90일"] as const).map((w) => ({
    when: w,
    items: r.priorities.filter((p) => p.when === w).map((p) => ({ when: p.when, title: p.title, task: p.todo, output: p.output, check: p.check, where: p.where, domain: p.domain })),
  }));

  const limits = [
    "이 결과는 학생이 고른 응답과 직접 적은 경험 기록으로 만들었습니다. 결과물의 완성도, 실제 성과 수치, 기간은 확인하지 않았습니다.",
    `판단을 묻지 않은 영역은 ‘${UNASKED}’으로 두었고, 0이나 ‘없음’으로 바꾸지 않았습니다.`,
    "직무와 조직 설명은 직무 일반을 적은 것이고, 특정 기업의 설명은 아닙니다. 실제 채용 공고와 일은 기업마다 다릅니다.",
    "점수와 순위는 만들지 않았고, 채용 결과를 예측하지 않았습니다.",
    "검사 판본과 응답일은 내부 기록에 남겨, 같은 응답으로 같은 결과를 다시 만들 수 있게 했습니다.",
  ];

  return {
    who: { school: r.meta.school, department: r.meta.department, specialization: r.meta.specialization, answeredOn: r.meta.answeredOn, tier: r.meta.tier },
    kind: r.kind as Ed["kind"],
    verdict: { head, sub, have: have.slice(0, 4), unknown: unknown.slice(0, 4) },
    map: { rows: map, notes },
    goal: { role: roleName, pick: goalDir?.goal ? { text: `검사에서 목표 직무로 ${withJosa(roleName, "을를")} 골랐습니다`, src: "응답 확인" } : null, context: ctx },
    first, dna: { domains: dnaDomains, lead, strong, weak, unasked: unaskedHigh },
    roles, confusion, chains, cross, org: tg?.org ?? [], templates, story, probes, plan, limits,
    versions: Object.entries(r.versions ?? {}).map(([k, v]) => `${k} ${v}`),
  };
}
