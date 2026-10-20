/**
 * 전주대 개인 리포트 Gold Master — **분석 층**(Track B).
 *
 * 화면이나 종이를 그리지 않는다. 결과 모델(`v3_snapshots.result_model`) ·
 * 그 Core 의 영역 사전과 관계표 · 문항 커버리지 · 출처가 붙은 사업 사실을
 * 읽어 **장(章)마다 무엇을 말할지**만 정한다. 그리는 일은 `gold-html.ts`,
 * 실행 워크북은 `gold-workbook.ts` 가 맡는다.
 *
 * **네 층을 섞지 않는다.** 모든 주장은 층 하나를 든다:
 * - `JUDGED`  검사 판정 — 문항 응답을 공통 엔진이 판정한 축 상태
 * - `SELF`    자기보고 — 학생이 고른 근거 문구 · 관심/경험/학습 의향 · 고른 직무
 * - `READ`    해석 — 그 Core 의 관계표로 판정을 직무·산업에 이은 것
 * - `ADVICE`  권고 — 결과 모델이 낸 할 일
 * 출처가 붙은 바깥 사실은 `SOURCE` 로 따로 들고 검증 상태를 함께 적는다.
 *
 * **새 판정·점수를 만들지 않는다.** 여기서 세는 수(확인된 축 · 고른 근거)는
 * 결과 모델의 칸을 센 것이고, 적합도 · 백분위 · 합격 가능성은 없다. 재지
 * 않은 AI 역량(LLM · 딥러닝 · MLOps 등)은 `미측정` 으로만 적는다.
 */
import {
  domainName, industryChoices, orgChoices, roleName, rolesFromDomains,
  industriesFromDomains,
} from "@/lib/me-v3/runtime/session";
import type { ResultDomain, ResultModel } from "@/lib/me-v3/result/model";
import {
  AXIS_DID_KO, AXIS_KO, AXIS_STATE_SHORT_KO, AXIS_WHAT_KO, actionKo, gapKo,
  headlineBadgeKo, headlineKo, needKo,
} from "@/lib/me-v3/result/text.ko";
import { coreFile } from "@/lib/me-v3/core-registry";
import type { Axis } from "@/lib/me-v3/scoring/types";
import { andList, withJosa } from "@/lib/me-v3/result/josa";
import { answeredIn, CAP_STATUS_KO } from "@/lib/jju/coverage";
import type { JjuReportInput, RegionFact } from "@/lib/jju/report";

export const GOLD_VERSION = "jju-report.5-gold";

export type Layer = "JUDGED" | "SELF" | "READ" | "ADVICE" | "SOURCE";
export const LAYER_KO: Record<Layer, string> = {
  JUDGED: "검사 판정", SELF: "자기보고", READ: "해석", ADVICE: "권고", SOURCE: "출처",
};

export const AXES: Axis[] = ["J1", "J2", "J3", "J4", "J5", "J6", "J7", "J8"];
const BAND_KO = { HIGH: "높음", MID: "보통", LOW: "낮음" } as const;
const EXP_KO = { NONE: "해 본 적 없음", ONCE_OR_TWICE: "1~2회", SEVERAL: "여러 번" } as const;
const ZONE_KO: Record<string, string> = {
  Z1_EVIDENCE_ESTABLISHED: "설명할 근거가 있음",
  Z2_EVIDENCE_INCOMPLETE: "해 봤고 정리가 남음",
  Z3_EVIDENCE_LOW_INTEREST: "근거는 있고 관심이 낮음",
  Z4_INSUFFICIENT_EVIDENCE: "판단할 근거가 아직 적음",
  NOT_EXPLORED: "이번 검사에서 깊게 묻지 않음",
};
const RQ_KO: Record<string, string> = {
  OK: "특이 사항 없음",
  REVIEW: "근거 문구와 응답 사이에 다시 볼 자리가 있음",
  LOW_VARIANCE: "답이 한 값으로 고르게 모였음",
  INCONSISTENT: "앞뒤가 맞지 않는 응답이 있음",
};

export type Claim = { text: string; layer: Layer; basis: string; status: string };
export type DomainRow = {
  code: string; name: string; zone: string; zoneKo: string; explored: boolean;
  interest: string; experience: string; learning: string;
  /** 여덟 축의 판정 상태. 묻지 않은 영역은 빈 배열 */
  axes: { axis: Axis; state: string }[];
  confirmed: number; owned: number; picks: number;
};
export type RoleCard = {
  code: string; name: string; from: "SELF" | "READ";
  /** 그 일의 중심 영역과 이 학생의 판정 */
  centers: { name: string; hit: boolean; state: string }[];
  /** 그 일이 실제로 하는 차례(그 Core 사전의 업무 흐름) */
  work: { name: string; detail: string }[];
  /** 그 자리가 보는 판단 */
  watched: { axis: Axis; hit: boolean }[];
  condition: string;
};
export type IndustryRow = { name: string; from: "SELF" | "READ"; centers: string; status: string };

export type GoldDoc = {
  id: string; submitted: string; version: string; demo: boolean;
  student: JjuReportInput["student"]; program: string;
  /** 표지와 요약의 큰 문장 — 결과 모델의 머리글(묶음 + 그 학생이 고른 답) */
  title: string; lead: string; badge: string;
  numbers: { k: string; v: string; sub: string; layer: Layer }[];
  brief: { k: string; v: string; layer: Layer; note?: string }[];
  ledger: Claim[];
  domains: DomainRow[];
  tools: { domain: string; tools: string[] }[];
  ai: { name: string; status: string; how: string; measured: boolean }[];
  notMeasured: string[];
  roles: RoleCard[];
  industries: IndustryRow[];
  region: (RegionFact & { label: string; verified: boolean })[];
  gaps: { domains: string[]; title: string; why: string; layer: Layer }[];
  constraints: string[];
  quality: string;
  sources: { id: string; label: string; url: string }[];
  facts: { id: string; text: string; status: string; source: string; caution?: string }[];
  checkedOn: string; verificationNote: string;
  versions: { k: string; v: string }[];
};

type Dom = { code: string; tools: string[]; artifacts: string[]; verify_targets: string[];
  org_outcomes: Record<string, string>; workflow: { step: number; name: string; detail: string }[] };
type Rel = { td: string; strength: string; axes_watched?: Axis[] };

const has = (d: ResultDomain) => d.confirmed.length > 0 || d.owned.length > 0;
const axesOf = (d: ResultDomain) => new Set([...d.confirmed, ...d.owned]).size;
const picksOf = (d: ResultDomain) => d.axes.reduce((n, a) => n + a.picks.length, 0);

/** 같은 판단을 확인한 영역은 한 번에 묶어 적는다(같은 말을 영역마다 되풀이하지 않는다) */
function strengthKo(xs: { name: string; did: string[] }[]): string {
  const by = new Map<string, string[]>();
  for (const x of xs) { const k = x.did.map((d) => `${d} 경험`).join("과 "); by.set(k, [...(by.get(k) ?? []), x.name]); }
  return [...by.entries()].map(([did, ns]) => `${andList(ns)}에서 ${did}`).join(", ");
}

/** 빈자리의 까닭에서 제목을 되풀이하는 문장은 뺀다 */
function gapLine(title: string, why: string): string {
  const t = title.replace(/\s/g, "");
  const rest = why.split(/(?<=[.다])\s+/).filter((x) => !t.includes(x.replace(/\s/g, "").slice(0, 5)));
  return [title.replace(/[.\s]+$/, "") + ".", ...rest].join(" ").replace(/([^.?!])$/, "$1.");
}

export function buildGold(x: JjuReportInput & { attemptId: string; submitted: string }): GoldDoc {
  const { model: m, core } = x;
  const nm = (td: string) => domainName(core, td);
  const h = headlineKo(m, nm);
  const byCode = new Map(m.domains.map((d) => [d.code, d]));
  const opened = m.domains.filter((d) => d.zone !== "NOT_EXPLORED");
  const evidenced = m.domains.filter(has);
  const confirmedTds = evidenced.map((d) => d.code);
  const dict = new Map(coreFile<{ domains: Dom[] }>(core, "domains").domains.map((d) => [d.code, d]));
  const rel = coreFile<{ td_role: (Rel & { role: string })[]; td_industry: (Rel & { industry: string })[] }>(core, "relations");
  const ind = new Map(industryChoices(core).map((v) => [v.code, v.name]));
  void orgChoices;

  /* ── 영역 표 ── */
  const domains: DomainRow[] = m.domains.map((d) => ({
    code: d.code, name: nm(d.code), zone: d.zone, zoneKo: ZONE_KO[d.zone] ?? d.zone,
    explored: d.zone !== "NOT_EXPLORED",
    interest: d.interest ? BAND_KO[d.interest] : "답 없음",
    experience: d.experience ? EXP_KO[d.experience] : "답 없음",
    learning: d.learning ? BAND_KO[d.learning] : "답 없음",
    axes: d.zone === "NOT_EXPLORED" ? [] : AXES.map((a) => ({ axis: a, state: d.axes.find((v) => v.axis === a)?.state ?? "NOT_OBSERVED" })),
    confirmed: axesOf(d), owned: d.owned.length, picks: picksOf(d),
  }));

  /* ── 직무: 학생이 고른 것 + 확인된 판단에서 이어진 것 ── */
  const centers = (role: string) => rel.td_role.filter((r) => r.role === role && r.strength === "중심");
  const roleCodes = [...new Set([...m.targets.roles,
    ...(confirmedTds.length ? rolesFromDomains(core, confirmedTds).map((r) => r.code) : [])])].slice(0, 3);
  const roles: RoleCard[] = roleCodes.map((code) => {
    const cs = centers(code);
    const watchedAxes = [...new Set(cs.flatMap((c) => c.axes_watched ?? []))];
    const hitAxis = (a: Axis) => cs.some((c) => { const d = byCode.get(c.td); return !!d && (d.confirmed.includes(a) || d.owned.includes(a)); });
    const hits = cs.filter((c) => confirmedTds.includes(c.td));
    const lead = cs.find((c) => confirmedTds.includes(c.td)) ?? cs[0];
    const work = lead ? (dict.get(lead.td)?.workflow ?? []).slice(0, 4).map((w) => ({ name: w.name, detail: w.detail })) : [];
    const miss = watchedAxes.filter((a) => !hitAxis(a));
    return {
      code, name: roleName(core, code), from: m.targets.roles.includes(code) ? "SELF" : "READ",
      centers: cs.map((c) => ({ name: nm(c.td), hit: confirmedTds.includes(c.td), state: ZONE_KO[byCode.get(c.td)?.zone ?? "NOT_EXPLORED"] ?? "" })),
      work, watched: watchedAxes.map((a) => ({ axis: a, hit: hitAxis(a) })),
      condition: !cs.length ? "그 Core 관계표에 이 직무의 중심 영역이 없습니다."
        : hits.length === 0 ? `중심 영역 ${cs.length}곳에 확인된 판단이 아직 없습니다. 관심만으로 이 직무를 잇지 않습니다 — 먼저 ${nm(cs[0].td)}에서 경험 하나가 필요합니다.`
        : miss.length ? `중심 영역 ${cs.length}곳 가운데 ${hits.length}곳에 확인된 판단이 있습니다. 이 자리가 보는 판단 가운데 ${withJosa(miss.slice(0, 2).map((a) => AXIS_KO[a]).join(" · "), "이가")} 아직 비어 있어 그것을 채우는 조건으로 봅니다.`
        : `중심 영역 ${hits.length}/${cs.length}곳에 확인된 판단이 있고 이 자리가 보는 판단이 모두 한 번 이상 확인됐습니다. 지원 가능성이나 합격을 뜻하지 않습니다.`,
    };
  });
  const indCodes = [...new Set([...m.targets.industries,
    ...(confirmedTds.length ? industriesFromDomains(core, confirmedTds).map((r) => r.code) : [])])].slice(0, 4);
  const industries: IndustryRow[] = indCodes.map((c) => {
    const cs = rel.td_industry.filter((r) => r.industry === c && r.strength === "중심").map((r) => r.td);
    const sp = cs.length ? cs : rel.td_industry.filter((r) => r.industry === c && r.strength === "있음").map((r) => r.td);
    const hit = sp.filter((t) => confirmedTds.includes(t));
    return { name: ind.get(c) ?? c, from: m.targets.industries.includes(c) ? "SELF" : "READ",
      centers: cs.length ? cs.map(nm).join(" · ") : `중심 영역 없이 ${sp.length}개 영역에 고르게`,
      status: hit.length ? `${hit.length}/${sp.length}곳에 확인된 판단` : "그 영역들에 확인된 판단 아직 없음" };
  });

  /* ── AI 역량: 문항이 있는가로 세 층 ── */
  const ai = x.coverage.map((c) => {
    const got = answeredIn(c, x.answered);
    const how = c.status === "MEASURED"
      ? (got.length ? `이 응시에서 판정 문항 ${got.length}개에 답함` : !c.core.length ? "그 산업·직무 팩을 고른 사람만 받음 · 이 응시는 받지 않음" : "문항은 있으나 이 응시에서 받지 않음")
      : c.status === "SELF_REPORT" ? "근거 문구에만 있음 · 판정 밖"
      : c.status === "CURRICULUM" ? "공식 과정이 다룸 · 문항 없음"
      : "검사·과정 어디에도 없음";
    return { name: c.cap.name, status: c.status === "MEASURED" && !c.core.length ? "측정(팩만)" : CAP_STATUS_KO[c.status], how, measured: c.status === "MEASURED" && got.length > 0 };
  });
  const notMeasured = x.coverage.filter((c) => c.status === "NOT_MEASURED" || c.status === "CURRICULUM").map((c) => c.cap.name);

  /* ── 요약 ── */
  const top = m.gaps[0];
  const topAct = m.actions[0];
  const strongest = [...opened].sort((a, b) => axesOf(b) - axesOf(a))[0];
  const tried = m.domains.filter((d) => d.experience && d.experience !== "NONE");
  const role0 = roles.find((r) => r.centers.some((c) => c.hit)) ?? roles[0];
  const brief: GoldDoc["brief"] = [
    { k: "지금 상태", v: `${headlineBadgeKo(m)} — ${h.lead || h.title}`, layer: "JUDGED" },
    evidenced.length
      ? { k: "강점", v: `${strengthKo(evidenced.slice(0, 2).map((d) => ({ name: nm(d.code), did: [...d.owned, ...d.confirmed].filter((a, i, s) => s.indexOf(a) === i).slice(0, 2).map((a) => AXIS_DID_KO[a]) })))}이 판정으로 확인됐습니다.`, layer: "JUDGED" }
      : { k: "강점", v: tried.length ? `판정으로 확인된 강점은 아직 없습니다. ${withJosa(tried.slice(0, 3).map((d) => nm(d.code)).join(" · "), "을를")} 해 본 적이 있다고 답했습니다.` : "판정으로 확인된 강점도, 해 본 적이 있다고 답한 영역도 아직 없습니다.", layer: tried.length ? "SELF" : "JUDGED" },
    { k: "가장 중요한 빈자리", v: top ? `${nm(top.domain)} — ${gapLine(gapKo(top, "").title.replace(/^\s*·\s*/, ""), gapKo(top, "").why)}` : "결과 모델이 적은 빈자리가 없습니다.", layer: "JUDGED" },
    { k: "먼저 볼 직무", v: role0 ? `${role0.name} — ${role0.condition}` : "고른 직무도, 판정에서 이어진 직무도 아직 없습니다.", layer: "READ",
      note: role0?.from === "SELF" ? "직무는 학생이 고른 것(자기보고) · 문장은 관계표를 대 본 해석" : "확인된 판단에서 관계표로 이은 해석" },
    { k: "다음 행동", v: topAct ? actionKo(topAct, topAct.domain ? nm(topAct.domain) : "", m.stage).do : "결과 모델이 낸 할 일이 없습니다.", layer: "ADVICE" },
  ];
  void strongest;

  /* ── 근거 장부: 주장마다 층 · 근거 · 상태 ── */
  const ledger: Claim[] = [];
  for (const d of opened) {
    const conf = [...new Set([...d.owned, ...d.confirmed])];
    const items = d.axes.reduce((n, a) => n + a.from.length, 0);
    ledger.push({ text: `${nm(d.code)}: ${ZONE_KO[d.zone]}`, layer: "JUDGED",
      basis: `판정 문항 ${items}개 · 고른 근거 ${picksOf(d)}개`, status: `여덟 축 중 ${conf.length}칸 확인${d.owned.length ? ` · 직접 결정 ${d.owned.length}` : ""}` });
    for (const a of conf.slice(0, 1)) {
      const v = d.axes.find((q) => q.axis === a);
      ledger.push({ text: `${nm(d.code)} · ${AXIS_DID_KO[a]} 경험`, layer: "JUDGED",
        basis: v?.picks[0] ? `고른 문구 “${v.picks[0]}”${v.picks.length > 1 ? ` 외 ${v.picks.length - 1}` : ""}` : `판정 문항 ${v?.from.length ?? 0}개`,
        status: AXIS_STATE_SHORT_KO[(v?.state ?? "NOT_OBSERVED") as keyof typeof AXIS_STATE_SHORT_KO] });
    }
  }
  for (const d of tried.filter((t) => !has(t)).slice(0, 3)) {
    ledger.push({ text: `${withJosa(nm(d.code), "을를")} ${d.experience ? EXP_KO[d.experience] : ""} 해 봤다`, layer: "SELF",
      basis: "영역 훑기 격자의 경험 칸", status: "판정으로는 아직 확인 전" });
  }
  for (const r of roles) ledger.push({ text: `${r.name} 직무와 이어짐`, layer: r.from === "SELF" ? "SELF" : "READ",
    basis: r.from === "SELF" ? "학생이 고른 관심 직무" : `관계표의 중심 영역 ${r.centers.length}곳`, status: `${r.centers.filter((c) => c.hit).length}/${r.centers.length}곳 판정 있음` });
  const measuredN = ai.filter((a) => a.measured).length;
  ledger.push({ text: `AI 역량 ${ai.length}가지 가운데 이 응시에서 문항으로 잰 것`, layer: "JUDGED",
    basis: "문항 커버리지(문항 번호 대조)", status: `${measuredN}가지 · 나머지는 미측정 또는 판정 밖` });
  /* 바깥 사실은 장부에서 한 줄로 세고 본문(4장)과 부록에 출처를 둔다: 긴 사실 문장이 장부를 밀어 쪽을 하나 더 연다 */
  const rg = x.region ?? [];
  if (rg.length) ledger.push({ text: `이 트랙에 걸리는 지역·산업 사실 ${rg.length}건`, layer: "SOURCE",
    basis: rg.map((r) => r.id).join(" · "), status: rg.every((r) => r.how === "FETCHED_PAGE") ? "원문 확인" : "검색 결과만 · 원문 확인 전" });
  if (topAct) ledger.push({ text: "다음 행동", layer: "ADVICE", basis: "결과 모델의 할 일(그 영역의 업무 흐름 재료)", status: "본문 01 · 08에 전문" });

  /* ── 빈자리: 같은 까닭은 한 줄로 ── */
  const gb = new Map<string, { domains: string[]; title: string; why: string }>();
  for (const g of m.gaps) {
    const t = gapKo(g, "");
    const k = `${t.title}|${t.why}`;
    const e = gb.get(k) ?? { domains: [], title: t.title.replace(/^\s*·\s*/, ""), why: t.why };
    if (!e.domains.includes(nm(g.domain))) e.domains.push(nm(g.domain));
    gb.set(k, e);
  }

  const region = (x.region ?? []).map((r) => ({ ...r, verified: r.how === "FETCHED_PAGE",
    label: r.how === "FETCHED_PAGE" && r.status === "FACT" ? "사실 · 원문 확인" : r.status === "INTERPRETATION" ? "해석 · 원문 확인 전" : "보도·자료 요지 · 원문 확인 전" }));

  const tdsForTools = (m.overview.focus.length ? m.overview.focus : opened.map((d) => d.code)).slice(0, 3);
  const counts = m.overview.counts;
  return {
    id: `J-${x.attemptId.padStart(4, "0")}`, submitted: x.submitted, version: GOLD_VERSION, demo: x.mode !== "LIVE",
    student: x.student, program: x.program?.name ?? "AI 분야 첨단산업 인재양성 부트캠프",
    title: h.title, lead: h.lead, badge: headlineBadgeKo(m),
    numbers: [
      { k: "확인된 판단", v: String(counts.confirmed_axes), sub: `깊게 물은 ${opened.length}개 영역 × 여덟 축 가운데`, layer: "JUDGED" },
      { k: "직접 결정", v: String(counts.owned_axes), sub: "조건·기준까지 직접 정한 축", layer: "JUDGED" },
      { k: "고른 근거", v: String(counts.evidence_items), sub: "학생이 고른 근거 문구", layer: "SELF" },
      { k: "근거가 선 영역", v: String(new Set(m.evidence.ready.map((g) => g.domain)).size), sub: `${m.domains.length}개 영역 가운데`, layer: "JUDGED" },
    ],
    brief, ledger, domains,
    tools: tdsForTools.map((td) => ({ domain: nm(td), tools: (dict.get(td)?.tools ?? []).slice(0, 5) })),
    ai, notMeasured, roles, industries, region,
    gaps: [...gb.values()].slice(0, 5).map((g) => ({ ...g, layer: "JUDGED" as Layer })),
    constraints: [
      "적합도 · 합격 가능성 · 순위 · 백분위를 만들지 않습니다. 규준이 없는 검사입니다.",
      "관심만으로 직무를 잇지 않습니다. 직무는 학생이 고른 것과 판정에서 관계표로 이은 것만 적습니다.",
      "기업을 추천하지 않습니다. 지역 기업·채용 자료는 아직 받지 않았습니다.",
      ...(x.mode !== "LIVE" ? ["이 트랙의 검사는 전공자 검수 전 시연 전용입니다. 이 종이를 학생 진단이나 사업 성과로 쓰지 않습니다."] : []),
    ],
    quality: RQ_KO[m.response_quality.flag] ?? "다시 볼 것이 있음",
    sources: [...(x.program?.sources ?? []).map((s) => ({ id: s.id, label: s.id, url: s.url })),
      ...region.map((r) => ({ id: r.id, label: `${r.id} · ${r.label}`, url: r.url }))],
    facts: (x.program?.facts ?? []).map((f) => ({ id: f.id, text: f.text, source: f.source, caution: f.caution,
      status: f.status === "EXISTS_DETAIL_UNVERIFIED" ? "있음 · 세부 미확인" : "공식 출처 · 사업주 확인 · 원문 미대조" })),
    checkedOn: x.program?.checked_on ?? "", verificationNote: x.program?.verification_note ?? "",
    versions: [
      { k: "검사", v: `${core} · 문항 ${m.provenance.module_versions.item_bank_version ?? "?"} · 채점 ${m.provenance.module_versions.scoring_version ?? "?"}` },
      { k: "결과 모델", v: String(m.provenance.result_model_version ?? "?") },
      { k: "리포트", v: GOLD_VERSION },
    ],
  };
}

/** 축 하나를 묻는 말. 면접 질문과 근거 장부가 쓴다 */
export const askOf = (a: Axis) => AXIS_WHAT_KO[a];
export { AXIS_KO, AXIS_DID_KO, needKo };
