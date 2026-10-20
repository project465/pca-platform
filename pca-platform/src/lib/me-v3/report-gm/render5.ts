/**
 * **CareerMatri PRO 80쪽 설계 · 핵심 디자인 쪽(설계안).** 80쪽을 다시 뽑지 않고, 설계표
 * (`data/report-gm/biz-pro-toc.v1.json`)에서 새 쪽 틀이 필요한 자리 가운데 대표 여덟 쪽만 그린다.
 * 운영 PDF 경로와 v3·v4 템플릿은 그대로다. v4 의 활자·색·쪽 틀(`render4.ts` 의 CSS)을 그대로 쓴다.
 *
 *   25 경영학 직무 지도 · 28 사업보고서로 산업·회사 읽기 · 36 산업 구조도 · 37 공시로 본 지역 기업
 *   43 기업 ① 사업과 위치 · 44 기업 ① 일의 체계 · 56 기업 ① 지원 전략 · 79 출처와 판본
 *
 * 값의 층을 섞지 않는다:
 * - **공시**(OpenDART 가 돌려준 값, `dart-checks` · `dart-overview`)는 `공식 원문 직접 확인` 으로 적는다.
 *   원문은 인용으로만 옮기고 바꿔 쓰지 않는다. 금액은 원 단위 공시값을 억 원으로 나눠 적고 그 사실을 적는다.
 * - **직무 일반 안내**(`biz-role-guide`)는 특정 기업의 요건이 아니다. 쪽마다 그렇게 적는다.
 * - **리포트 해석**은 해석이라고 적는다. 채용 여부는 어디에서도 단정하지 않는다.
 * - 공식 통계가 없는 자리는 숫자를 지어내지 않고 **빈 칸에 ‘확인 필요’ 와 부족 자료 번호**를 세운다.
 */
import { withJosa } from "../result/josa";
import type { Report3, CompanyDeep } from "./report3";
import { esc, opener, CSS, faces, type Fonts } from "./render4";

/* ── 자료 ──────────────────────────────────────────────────────── */

type Fin = { year: number; report: string; unit: string; consolidated: Record<string, number>; separate: Record<string, number> } | null;
export type DartOrg = {
  id: string; name: string; matched_by?: string; note?: string;
  dart: null | { corp_code: string; corp_name: string; corp_cls: string; stock_code: string | null; bizr_no: string; jurir_no: string; adres: string; induty_code: string; est_dt: string; hm_url: string | null };
  compare?: { bizno: string; corpno: string; hq_region: string };
  annual_reports?: { report: string; rcept_no: string; rcept_dt: string; url: string }[];
  financials?: Fin; staff?: { year: number; by_segment: { segment: string; count: number }[] } | null; checked_on?: string;
};
export type Lib = {
  toc: { pages: { n: number; part: number; title: string; verify: string; feasible: string; missing: string[] }[]; parts: Record<string, { title: string; pages: number }>; missing: Record<string, { what: string; status: string; pages: number[] }> };
  dart: { checked_on: string; orgs: DartOrg[] };
  overview: { checked_on: string; orgs: { id: string; report: string; rcept_no: string; rcept_dt: string; section: string; excerpt: string | null }[] };
  roles: { roles: Record<string, { summary: string; lens: Record<string, { mode: string }> }> };
  orgs: { orgs: { id: string; name: string; region: string; industry_line: string; verify: string; jobs: { role: string; status: string }[] }[]; region_facts: { text: string; region: string; source: { title: string; checked_on: string } }[] };
  domains: { code: string; name: string }[];
  versions: Record<string, string>;
};

export const DESIGN5_PAGES = [25, 28, 36, 37, 43, 44, 56, 79] as const;

export const eok = (n: number | undefined) => (n === undefined || !Number.isFinite(n) ? "—" : (n / 1e8).toLocaleString("ko-KR", { maximumFractionDigits: 1, minimumFractionDigits: 1 }));
export const ymd = (s: string) => (s && s.length === 8 ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6)}` : s);
export const tag = (k: "OFFICIAL_DIRECT" | "THIRD_PARTY" | "SEARCH_ONLY" | "CONFLICTING" | "UNVERIFIED" | "GENERAL" | "READ", t?: string) => {
  const T = { OFFICIAL_DIRECT: "공식 원문 직접 확인", THIRD_PARTY: "제3자 자료 확인", SEARCH_ONLY: "검색 결과만 확인", CONFLICTING: "상충 정보 존재", UNVERIFIED: "검증되지 않음", GENERAL: "직무 일반", READ: "리포트 해석" } as const;
  return `<span class="vt vt-${k}">${esc(t ?? T[k])}</span>`;
};
export const ROLE_SHORT: Record<string, string> = {
  ROLE_PLAN_V1: "경영기획", ROLE_ANALYTICS_V1: "데이터 기반 경영", ROLE_FINACC_V1: "재무·회계", ROLE_OPS_V1: "운영관리",
  ROLE_CS_V1: "서비스·고객", ROLE_SALES_V1: "사업개발·영업", ROLE_MKT_V1: "마케팅", ROLE_HR_V1: "인사",
};
export const ROLE_ORDER = ["ROLE_PLAN_V1", "ROLE_MKT_V1", "ROLE_HR_V1", "ROLE_FINACC_V1", "ROLE_SALES_V1", "ROLE_OPS_V1", "ROLE_ANALYTICS_V1", "ROLE_CS_V1"];
export const pick = (fin: Fin) => (fin && Object.keys(fin.consolidated).length ? { kind: "연결", v: fin.consolidated } : fin ? { kind: "별도", v: fin.separate } : null);

function frame(r: Report3, lib: Lib, n: number, body: string): string {
  const head = [r.meta.school, r.meta.department].filter(Boolean).join(" · ");
  const p = lib.toc.pages.find((x) => x.n === n)!;
  return `<section class="pg" data-page="${n}">
  <header class="rh"><span>${esc(head)}</span><span>CareerMatri PRO 진로·취업 전략 보고서</span></header>
  <div class="bd">${body}</div>
  <footer class="rf"><b>${esc(lib.toc.parts[String(p.part)].title)}</b><span class="rv">80쪽 설계 · 핵심 쪽 시안 · 배포 전</span><span>설계 ${n} / 80</span></footer>
</section>`;
}
/** 설계표의 부족 자료 번호를 쪽 아래에 그대로 적는다 */
export function gaps(lib: Lib, n: number): string {
  const p = lib.toc.pages.find((x) => x.n === n)!;
  if (!p.missing.length) return "";
  return `<p class="gap">부족한 조사 자료 — ${p.missing.map((k) => `<b>${esc(k)}</b> ${esc(lib.toc.missing[k]?.what ?? "")}`).join(" · ")}</p>`;
}
export const focusCompany = (r: Report3): CompanyDeep => r.companies.find((x) => x.jobs[0]?.role === r.strategy.roleCode) ?? r.companies[0];
export const dartOf = (lib: Lib, id: string) => lib.dart.orgs.find((x) => x.id === id);

/* ── 25 경영학 직무 지도 ─────────────────────────────────────────── */

export function d25(r: Report3, lib: Lib): string {
  const goal = r.strategy.roleCode;
  const roles = ROLE_ORDER.filter((k) => lib.roles.roles[k]);
  const mapBy = new Map(r.map.map((m) => [m.code, m]));
  const cell = (role: string, td: string) => {
    const lens = lib.roles.roles[role].lens;
    const keys = Object.keys(lens);
    if (!lens[td]) return `<td class="e"></td>`;
    const k = lens[td].mode === "role" ? "rl" : keys[0] === td ? "core" : "dom";
    return `<td class="${k}${role === goal ? " gl" : ""}"><i></i></td>`;
  };
  const depth = (td: string) => {
    const m = mapBy.get(td);
    if (!m || m.depth === null) return `<span class="dp na">묻지 않음</span>`;
    return `<span class="dp d${m.depth}">${["해 본 적 없음", "지시받아 해 봄", "스스로 해 봄", "기준까지 정함"][m.depth]}</span>`;
  };
  return frame(r, lib, 25, `
  ${opener("04", "전공 직무 심층", "경영학 직무 지도", "경영학과에서 많이 가는 여덟 직무가 열두 업무 영역 가운데 어디서 일하는지 한 장에 놓았습니다. 오른쪽 칸은 이 학생이 그 영역을 어디까지 해 봤다고 답했는지입니다.")}
  <table class="jm"><thead><tr><th class="dn">업무 영역</th>${roles.map((k) => `<th class="${k === goal ? "gl" : ""}">${esc(ROLE_SHORT[k])}${k === goal ? `<em>목표</em>` : ""}</th>`).join("")}<th class="me">내 응답</th></tr></thead>
  <tbody>${lib.domains.map((d) => `<tr class="${mapBy.get(d.code)?.zone === "Z1_EVIDENCE_ESTABLISHED" ? "z1" : ""}"><th class="dn">${esc(d.name)}</th>${roles.map((k) => cell(k, d.code)).join("")}<td class="me">${depth(d.code)}</td></tr>`).join("")}</tbody></table>
  <div class="jm-key"><span><i class="k core"></i>그 직무의 중심 영역</span><span><i class="k dom"></i>함께 다루는 영역</span><span><i class="k rl"></i>역할로 걸치는 영역</span><span><i class="k z1"></i>근거가 선 영역(내 응답)</span></div>
  <div class="jm-sum">${roles.map((k) => `<div class="${k === goal ? "gl" : ""}"><b>${esc(ROLE_SHORT[k])}</b><p>${esc(lib.roles.roles[k].summary)}</p></div>`).join("")}</div>
  <p class="src">${tag("GENERAL")} 직무 일반 안내(특정 기업의 직무기술서나 채용 요건이 아님) · 내 응답 칸은 검사 응답 그대로 · 점수와 적합도를 계산하지 않았습니다.</p>
  ${gaps(lib, 25)}`);
}

/* ── 28 사업보고서로 산업·회사 읽기 ────────────────────────────── */

export function d28(r: Report3, lib: Lib): string {
  const c = focusCompany(r);
  const ov = lib.overview.orgs.find((x) => x.id === c.id && x.excerpt) ?? lib.overview.orgs.find((x) => x.excerpt)!;
  const name = lib.dart.orgs.find((x) => x.id === ov.id)?.name ?? c.name;
  const dart = dartOf(lib, ov.id);
  const fin = pick(dart?.financials ?? null);
  const seg = dart?.staff?.by_segment ?? [];
  const first = r.priorities[0];
  // 목표 직무는 학생마다 다르다: 경영기획으로 못 박지 않는다
  const role = r.strategy.roleName || "경영 직무";
  const quote = (ov.excerpt ?? "").slice(0, 560).replace(/\s+\S*$/, "") + " …";
  const steps: [string, string, string][] = [
    ["무엇을 팔아 돈을 버나", "사업 부문과 수익이 들어오는 길을 한 줄로 적습니다. 제품을 파는지, 기술이나 권리를 계약으로 파는지가 첫 갈림길입니다.", "‘사업의 개요’ · ‘주요 제품’"],
    ["숫자로 맞춰 보나", `같은 보고서의 재무 쪽에서 매출과 영업이익을 찾아 위의 한 줄과 맞는지 봅니다.${fin ? ` 이 회사의 ${dart!.financials!.year}년 ${fin.kind} 매출은 ${eok(fin.v["매출액"])}억 원, 영업이익은 ${eok(fin.v["영업이익"])}억 원입니다.` : ""}`, "‘재무에 관한 사항’"],
    ["사람은 어디에 있나", `직원 현황을 사업부문별로 봅니다.${seg.length ? ` ${seg.map((s) => `${s.segment} ${s.count}명`).join(" · ")}.` : ""} 인원이 많은 부문이 회사가 돈과 시간을 쓰는 곳입니다.`, "‘직원 등의 현황’"],
    [`${withJosa(role, "은는")} 무엇으로 재나`, `위 셋을 읽고 나면 ${role}의 일에서 이 회사를 볼 지표를 두세 개 적어 봅니다. 정답이 있는 문제가 아니라, 적은 지표마다 그 까닭을 한 줄씩 남기는 연습입니다.`, "학생이 적는 칸"],
  ];
  return frame(r, lib, 28, `
  ${opener("04", "목표 직무 실무 가이드 ②", "사업보고서로 산업과 회사를 읽는 법", `${withJosa(role, "은는")} 회사가 스스로 공시한 문서에서 사업 구조를 읽는 데서 출발합니다. 아래 원문은 ${withJosa(name, "이가")} 금융감독원 전자공시에 낸 사업보고서의 첫 대목입니다.`)}
  <div class="g28">
    <figure class="quote"><span class="q-k">원문 인용</span><blockquote>${esc(quote)}</blockquote>
      <figcaption>${esc(name)} · ${esc(ov.report)} · 접수번호 ${esc(ov.rcept_no)} · ${esc(ov.section)}<br>${tag("OFFICIAL_DIRECT")} OpenDART 원문(${esc(lib.overview.checked_on)}) · 앞부분을 그대로 옮겼고 바꿔 쓰지 않았습니다.</figcaption></figure>
    <ol class="read">${steps.map(([h, t, w], i) => `<li><span class="rn">${i + 1}</span><div><b>${esc(h)}</b><p>${esc(t)}</p><em>보는 곳 — ${esc(w)}</em></div></li>`).join("")}</ol>
  </div>
  <div class="ws"><h3 class="eyebrow">직접 해 볼 것 <span>실행 전략 첫 과제와 이어집니다</span></h3>
    <div class="ws-g"><div><b>이번 과제</b><p>${esc(first ? first.title : "목표를 숫자로 재는 지표로 옮겨 적기")}</p></div>
    <div><b>남길 것</b><p>${esc(first ? first.output : "목표·지표 정의표")} — 위 회사 하나로 지표 세 개와 각각을 고른 까닭 한 줄</p></div>
    <div><b>확인 질문</b><p>지표마다 재는 방법과 기간이 적혀 있는가, 공시 숫자와 같은 단위로 놓였는가</p></div></div></div>
  <p class="src">${tag("GENERAL", "가이드 본문 · 검토 전")} 읽는 순서와 설명은 이 리포트의 안내 초안입니다(현직자·교수 검토 전). 공시 숫자는 OpenDART 가 돌려준 원 단위 값을 억 원으로 나눠 적었습니다.</p>
  ${gaps(lib, 28)}`);
}

/* ── 36 산업 구조도 ─────────────────────────────────────────────── */

export function d36(r: Report3, lib: Lib): string {
  const strategic = lib.orgs.region_facts.find((f) => f.text.includes("전략산업"));
  const local = lib.orgs.orgs.filter((o) => o.region !== "NATIONAL");
  const groups = new Map<string, typeof local>();
  const bucket = (o: (typeof local)[number]) => /소프트웨어/.test(o.industry_line) ? "공공 소프트웨어" : /공기업|공공기관|지방공기업/.test(o.industry_line) ? "공공기관·공기업" : /바이오|백신|신약/.test(o.industry_line) ? "바이오헬스" : /방산|센서|안테나/.test(o.industry_line) ? "국방·센서 제조" : /소프트웨어/.test(o.industry_line) ? "공공 소프트웨어" : /장비|공정/.test(o.industry_line) ? "장비 제조" : /건설/.test(o.industry_line) ? "건설" : /디스플레이/.test(o.industry_line) ? "디스플레이" : /항공/.test(o.industry_line) ? "항공" : "소비·서비스";
  for (const o of local) { const k = bucket(o); groups.set(k, [...(groups.get(k) ?? []), o]); }
  const goal = r.strategy.roleCode;
  const row = ([k, os]: [string, typeof local]) => {
    const roles = [...new Set(os.flatMap((o) => o.jobs.map((j) => j.role)))].sort((a, b) => ROLE_ORDER.indexOf(a) - ROLE_ORDER.indexOf(b));
    return `<div class="sr"><div class="s1">${esc(k)}</div><div class="arr"></div>
      <div class="s2">${os.map((o) => { const d = dartOf(lib, o.id); const st = o.verify === "CONFLICTING" ? "CONFLICTING" : d?.dart ? "OFFICIAL_DIRECT" : "SEARCH_ONLY"; return `<span class="co c-${st}">${esc(o.name.replace(/\s—.*$/, ""))}</span>`; }).join("")}</div><div class="arr"></div>
      <div class="s3">${roles.map((x) => `<span class="rl${x === goal ? " gl" : ""}">${esc(ROLE_SHORT[x])}</span>`).join("")}</div></div>`;
  };
  const order = ["바이오헬스", "국방·센서 제조", "장비 제조", "공공 소프트웨어", "건설", "디스플레이", "항공", "공공기관·공기업", "소비·서비스"];
  return frame(r, lib, 36, `
  ${opener("05", "지역 산업", "산업 구조도: 지역 산업에서 경영 직무까지", "대전·세종·충청권에서 이 리포트가 살펴본 기업을 산업으로 묶고, 그 기업들에서 경영 직무가 어디에 있는지 이었습니다. 지역 전체 통계는 아직 공식 자료로 확인하지 못해 숫자를 적지 않았습니다.")}
  <div class="top36">
    <div class="sb"><span class="sb-k">대전시가 내세운 전략산업</span><p>${esc(strategic?.text.replace(/^.*?:\s*/, "") ?? "확인 필요")}</p><span class="small">${tag("SEARCH_ONLY")} ${esc(strategic?.source.title ?? "")} · 시청 정책 원문 확인 전</span></div>
    <div class="slot"><span class="sb-k">산업별 사업체·종사자 수</span><p>공식 통계 미확보 — 숫자를 적지 않았습니다</p><span class="small">확인 필요 · R2 (KOSIS 전국사업체조사)</span></div>
    <div class="slot"><span class="sb-k">경제활동별 지역내총생산</span><p>공식 통계 미확보 — 보도 인용만 있습니다</p><span class="small">확인 필요 · R3 (KOSIS 지역계정)</span></div>
  </div>
  <div class="sh"><span>산업 묶음</span><span></span><span>살펴본 기업</span><span></span><span>그 기업들에서 본 경영 직무</span></div>
  <div class="sm">${order.filter((k) => groups.has(k)).map((k) => row([k, groups.get(k)!])).join("")}</div>
  <div class="jm-key"><span><i class="k ko"></i>공시로 기업 확인(OpenDART)</span><span><i class="k ks"></i>검색 결과만 확인</span><span><i class="k kc"></i>출처끼리 다름</span><span><i class="k kg"></i>목표 직무</span></div>
  <p class="src">${tag("READ")} 산업 묶음은 이 리포트가 기업 설명으로 나눈 것이고 공식 산업 분류가 아닙니다. 직무 칸은 공고·기관 소개에서 본 직무와 산업 일반 예시를 함께 적었습니다. 채용 여부는 확인하지 않았습니다.</p>
  ${gaps(lib, 36)}`);
}

/* ── 37 공시로 본 지역 기업 ────────────────────────────────────── */

export function d37(r: Report3, lib: Lib): string {
  const v2 = new Map(lib.orgs.orgs.map((o) => [o.id, o]));
  const listed = lib.dart.orgs.filter((o) => o.dart?.stock_code && v2.get(o.id)?.region !== "NATIONAL");
  const other = lib.dart.orgs.filter((o) => o.dart && !o.dart.stock_code && v2.get(o.id)?.region !== "NATIONAL");
  const none = lib.dart.orgs.filter((o) => !o.dart);
  const maxSeg = Math.max(...listed.flatMap((o) => o.staff?.by_segment.map((s) => s.count) ?? [0]));
  const hq = (o: DartOrg) => o.compare?.hq_region === "DIFFERENT_SIDO" ? `<span class="warn">${esc(o.dart!.adres.split(" ").slice(0, 2).join(" "))}</span>` : esc(o.dart!.adres.split(" ").slice(0, 2).join(" "));
  return frame(r, lib, 37, `
  ${opener("05", "지역 산업", "공시로 본 대전·충청권 기업", "금융감독원 전자공시(OpenDART)에서 이 리포트가 살펴본 기업의 개황과 최근 사업보고서를 받아 한 표에 놓았습니다. 숫자는 공시값 그대로이고, 회사가 공시하지 않은 칸은 비워 두었습니다.")}
  <h3 class="eyebrow">상장사 — 최근 사업보고서 <span>금액 억 원(원 단위 공시값 ÷ 1억, 소수 첫째 자리)</span></h3>
  <table class="dt"><thead><tr><th>기업 · 시장</th><th>본점(공시)</th><th>설립</th><th class="nm">매출</th><th class="nm">영업이익</th><th>사업부문별 직원</th></tr></thead><tbody>
  ${listed.map((o) => { const f = pick(o.financials ?? null); const v = v2.get(o.id); return `<tr><td><b>${esc(o.name)}</b><span class="small">${esc(o.dart!.corp_cls)} · ${esc(v?.industry_line ?? "")}</span></td><td>${hq(o)}</td><td>${esc(ymd(o.dart!.est_dt).slice(0, 4))}</td><td class="nm">${eok(f?.v["매출액"])}<em>${esc(f ? `${o.financials!.year} ${f.kind}` : "")}</em></td><td class="nm${(f?.v["영업이익"] ?? 0) < 0 ? " neg" : ""}">${eok(f?.v["영업이익"])}</td><td>${(o.staff?.by_segment ?? []).map((s) => `<div class="sg"><span>${esc(s.segment)}</span><i style="width:${Math.max(2, Math.round(26 * s.count / maxSeg))}mm"></i><b>${s.count.toLocaleString("ko-KR")}</b></div>`).join("") || "—"}</td></tr>`; }).join("")}
  </tbody></table>
  <h3 class="eyebrow">비상장·공공 — 기업개황만 <span>재무는 이 표에 적지 않음(공시 의무와 범위가 다름)</span></h3>
  <table class="dt dt2"><thead><tr><th>기업</th><th>공시 등록명</th><th>본점(공시)</th><th>설립</th><th>v2 자료와 대조</th></tr></thead><tbody>
  ${other.map((o) => `<tr><td><b>${esc(o.name.replace(/\s—.*$/, ""))}</b></td><td>${esc(o.dart!.corp_name)}</td><td>${hq(o)}</td><td>${esc(ymd(o.dart!.est_dt).slice(0, 4))}</td><td>${o.compare?.bizno === "SAME" ? "사업자·법인번호 일치" : "번호 대조 안 함"}${o.compare?.hq_region === "DIFFERENT_SIDO" ? ` · ${tag(v2.get(o.id)?.verify === "CONFLICTING" ? "CONFLICTING" : "READ", v2.get(o.id)?.verify === "CONFLICTING" ? "본점 상충" : "본점은 다른 시도 · 사업장 기준")}` : ""}</td></tr>`).join("")}
  </tbody></table>
  <p class="small none">공시 목록에 없음: ${esc(none.map((o) => o.name).join(" · "))} — 공공기관은 ALIO(R5), 비상장사는 제3자 자료만 있습니다.</p>
  <p class="src">${tag("OFFICIAL_DIRECT")} OpenDART 기업개황 · 공시검색 · 주요계정 · 직원현황(${esc(lib.dart.checked_on)}). 붉은 글씨 본점은 리포트 자료(v2)가 적은 지역과 시도가 다른 곳입니다. 직원 수는 회사가 나눈 사업부문 이름 그대로입니다.</p>
  ${gaps(lib, 37)}`);
}

/* ── 43 기업 ① 사업과 위치 ─────────────────────────────────────── */

/** 손익 부호에 따라 읽는 법 한 줄을 고른다. 까닭을 단정하지 않고 어디서 확인할지만 적는다 */
export function readSigns(op: number | undefined, ni: number | undefined): string {
  if (op === undefined || ni === undefined) return "공시 계정이 비어 있어 읽는 법을 적지 않았습니다.";
  if (op < 0 && ni >= 0) return "영업이익은 마이너스인데 당기순이익은 플러스입니다. 본업 밖(금융 수익 등)에서 이익이 났을 수 있으니 손익계산서 주석에서 확인합니다.";
  if (op < 0 && ni < 0) return "영업이익과 당기순이익이 모두 마이너스입니다. 연구개발비처럼 미리 쓰는 비용이 매출보다 큰 해인지, 보고서의 비용 구성에서 확인합니다.";
  if (op >= 0 && ni < 0) return "영업이익은 플러스인데 당기순이익은 마이너스입니다. 본업 밖의 비용이나 손실이 있었을 수 있으니 영업외손익 주석에서 확인합니다.";
  return "영업이익과 당기순이익이 모두 플러스입니다. 지난해와 견주어 늘었는지 줄었는지를 같은 보고서의 비교 칸에서 봅니다.";
}

export function d43(r: Report3, lib: Lib, c: CompanyDeep = focusCompany(r), n = 43, no = "①"): string {
  const d = dartOf(lib, c.id);
  const ov = lib.overview.orgs.find((x) => x.id === c.id);
  const f = pick(d?.financials ?? null);
  const rev = f?.v["매출액"], op = f?.v["영업이익"], ni = f?.v["당기순이익"];
  const max = Math.max(...[rev, op, ni].filter((x): x is number => typeof x === "number").map(Math.abs), 1);
  const bar = (label: string, v: number | undefined) => `<div class="fb"><span>${esc(label)}</span><div class="fb-t"><i class="${(v ?? 0) < 0 ? "neg" : ""}" style="width:${v === undefined ? 0 : Math.max(1.5, 100 * Math.abs(v) / max)}%"></i></div><b class="${(v ?? 0) < 0 ? "neg" : ""}">${eok(v)}억</b></div>`;
  const id = d?.dart;
  const quote = (ov?.excerpt ?? "").slice(0, 330).replace(/\s+\S*$/, "") + " …";
  return frame(r, lib, n, `
  ${opener("06", `기업 ${no} 사업과 위치`, c.name, c.headline)}
  <div class="idg">${id ? [
    ["공시 등록명", id.corp_name], ["시장", `${id.corp_cls}${id.stock_code ? ` · ${id.stock_code}` : ""}`], ["본점", id.adres], ["설립", ymd(id.est_dt)],
    ["사업자등록번호", `${id.bizr_no.replace(/(\d{3})(\d{2})(\d{5})/, "$1-$2-$3")}${d?.compare?.bizno === "SAME" ? " · 자료와 일치" : ""}`], ["홈페이지", id.hm_url ?? "공시에 없음"],
  ].map(([k, v]) => `<div><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join("") : `<div><span>공시</span><b>공시 목록에 없음</b></div>`}</div>
  <p class="small idsrc">${id ? `${tag("OFFICIAL_DIRECT")} 위 여섯 칸은 OpenDART 기업개황(${esc(d?.checked_on ?? "")})` : `${tag("UNVERIFIED", "공시 개황 없음")} OpenDART 고유번호 목록에서 이 회사를 찾지 못했습니다(${esc(lib.dart.checked_on)}). 식별 정보는 공식 원문으로 확인하지 못했습니다.`}</p>
  <div class="g43">
    <div><h3 class="eyebrow">① 무엇을 하는 회사인가 <span>공시 원문</span></h3>
      ${ov?.excerpt ? `<blockquote class="bq">${esc(quote)}</blockquote><p class="small">${esc(ov.report)} · 접수번호 ${esc(ov.rcept_no)} · ‘사업의 개요’ 앞부분 그대로</p>` : `<p class="slot1">공시 원문 없음 — 확인 필요</p>`}
      <h3 class="eyebrow">② 제품·서비스 <span>리포트 자료</span></h3>
      <div class="prod">${c.products.map((x) => `<b>${esc(x)}</b>`).join("")}</div>
      <p class="interp">${esc(c.interpret[0] ?? "")} ${tag("READ")}</p></div>
    <div><h3 class="eyebrow">숫자로 본 회사 <span>${esc(f ? `${d!.financials!.year} 사업보고서 · ${f.kind}` : "공시 재무 없음")}</span></h3>
      ${f ? `${bar("매출액", rev)}${bar("영업이익", op)}${bar("당기순이익", ni)}
      <div class="calc"><span>공시로 계산한 영업이익률</span><b>${rev && op !== undefined ? ((100 * op) / rev).toFixed(1) : "—"}%</b><em>영업이익 ÷ 매출액 × 100 · 리포트가 계산</em></div>
      <p class="small">${esc(readSigns(op, ni))}</p>` : `<p class="slot1">비상장 · 공시 재무 없음</p>`}
      <h3 class="eyebrow">경영 쪽에서 볼 자리 <span>리포트 해석</span></h3>
      <p>${esc(c.interpret[1] ?? c.why)}</p></div>
  </div>
  <p class="src">${tag("OFFICIAL_DIRECT")} 개황·원문·재무는 OpenDART · ${tag("THIRD_PARTY")}·${tag("SEARCH_ONLY")} 제품과 해석은 리포트 자료(v2)에서 왔고 줄마다 출처가 있습니다 · 채용 여부는 확인하지 않았습니다.</p>
  ${gaps(lib, n)}`);
}

/* ── 44 기업 ① 일의 체계와 실제 업무 ──────────────────────────── */

export function d44(r: Report3, lib: Lib, c: CompanyDeep = focusCompany(r), n = 44, no = "①"): string {
  const d = dartOf(lib, c.id);
  const seg = d?.staff?.by_segment ?? [];
  const tot = seg.reduce((a, s) => a + s.count, 0);
  const goal = c.jobs[0];
  const ST: Record<string, string> = { "채용 공고에서 본 직무": "SEARCH_ONLY", "기관 소개에서 본 직무": "SEARCH_ONLY" };
  return frame(r, lib, n, `
  ${opener("06", `기업 ${no} 일의 체계와 실제 업무`, c.name, "공시의 사업부문별 인원으로 회사의 일이 어디에 몰려 있는지 보고, 그 위에 공고에서 본 경영 직무와 학생의 검사 응답을 겹쳤습니다.")}
  <div class="g44">
    <div><h3 class="eyebrow">③ 사람은 어디에 있나 <span>${esc(d?.staff ? `${d.staff.year} 사업보고서 직원 현황` : "공시 없음")}</span></h3>
      ${seg.length ? `<div class="stk">${seg.map((s, i) => `<div class="stk-s sg${i}" style="flex:${s.count}"><b>${s.count}</b></div>`).join("")}</div>
      <ul class="stk-l">${seg.map((s, i) => `<li><i class="sg${i}"></i>${esc(s.segment)} ${s.count}명 (${((100 * s.count) / tot).toFixed(0)}%)</li>`).join("")}</ul>
      <p class="small">${tag("OFFICIAL_DIRECT")} 회사가 공시에 나눈 부문 이름 그대로입니다. 경영지원 인원이 따로 나뉘어 있지 않으면 경영 직무 인원은 공시로 알 수 없습니다.</p>` : `<p class="slot1">공시 직원 현황 없음 — 확인 필요</p>`}
      <h3 class="eyebrow">④ 이 회사에서 본 경영 직무 <span>공고·기관 소개</span></h3>
      <table class="jt"><tbody>${c.jobs.slice(0, 4).map((j) => `<tr class="${j.role === r.strategy.roleCode ? "gl" : ""}"><th>${esc(j.name)}</th><td>${esc(j.tasks)}<span class="small">${tag((ST[j.status] ?? "SEARCH_ONLY") as "SEARCH_ONLY", j.status)}</span></td></tr>`).join("")}</tbody></table></div>
    <div><h3 class="eyebrow">⑤ 실제 업무 — 본 것과 일반을 가름 <span>${esc(goal.name)}</span></h3>
      <div class="two"><div><b>이 회사 공고에서 본 일</b><p>${esc(goal.tasks)}</p>${tag("SEARCH_ONLY")}</div>
      <div><b>이 직무가 일반적으로 하는 차례</b><ol>${goal.flow.slice(0, 3).map((s) => `<li>${esc(s)}</li>`).join("")}</ol>${tag("GENERAL")}</div></div>
      <h3 class="eyebrow">⑥ 내 검사 응답과 맞물리는 곳 <span>응답 그대로</span></h3>
      <ul class="fit5">${goal.have.map((h) => `<li class="have"><em>응답에서 확인</em>${esc(h)}</li>`).join("")}${goal.need.map((h) => `<li class="need"><em>아직 확인 안 됨</em>${esc(h)}</li>`).join("")}</ul>
      <p class="small">이 표는 직무 적합도나 합격 가능성이 아닙니다. 직무의 핵심 판단 가운데 지금 응답에서 확인된 것과 아닌 것을 갈랐습니다.</p></div>
  </div>
  <p class="src">조직도·직무 소개 원문(R7)과 공식 채용 공고(R8)를 읽기 전이라, ④·⑤의 ‘본 일’ 은 검색 결과 수준입니다 · 채용 여부는 확인하지 않았습니다.</p>
  ${gaps(lib, n)}`);
}

/* ── 56 기업 ① 지원 전략 ───────────────────────────────────────── */

export function d56(r: Report3, lib: Lib, c: CompanyDeep = focusCompany(r), n = 56, no = "①", story = r.application.stories[0], withCal = true): string {
  const g = c.jobs[0];
  const d = dartOf(lib, c.id);
  const listed = Boolean(d?.dart?.stock_code);
  const cal: [string, string, string][] = [
    ["지금 ~ 3개월", g.project.title.replace(/'([^']+)'/g, "‘$1’"), `남길 것 — ${g.project.output}`],
    ["3 ~ 6개월", listed ? "반기보고서(사업연도 시작 후 6개월이 끝나고 45일 안 공시)로 숫자 다시 맞추기" : "기업 누리집·보도로 사업 변화 다시 확인하기", "남길 것 — 바뀐 숫자 한 줄과 그 까닭"],
    ["6 ~ 12개월", "공식 채용 공고 원문에서 이 직무의 요건 확인하고, 내 결과물과 한 줄씩 대조하기", "남길 것 — 요건 대조표(공고 원문 주소와 확인일 포함)"],
  ];
  return frame(r, lib, n, `
  ${opener("07", `기업 ${no} 지원 전략`, `${c.name} · ${g.name}`, "앞 쪽에서 본 회사의 일과 학생의 근거를 서류와 면접에서 어떻게 쓸지, 그리고 3개월에서 12개월 사이에 무엇을 할지 적었습니다.")}
  <div class="g56">
    <div><h3 class="eyebrow">⑩ 자기소개서 문단 재료 <span>고른 근거 그대로 · 수치는 직접</span></h3>
      ${story ? `<dl class="sty">${story.parts.map((p) => `<div class="${p.filled ? "" : "empty"}"><dt>${esc(p.label)}</dt><dd>${esc(p.text)}</dd></div>`).join("")}</dl><p class="small">${esc(g.selfIntro)}</p>` : `<p class="slot1">고른 근거가 없어 문단 재료를 세우지 않았습니다</p>`}</div>
    <div><h3 class="eyebrow">포트폴리오 한 건 <span>이 회사의 장면으로</span></h3>
      <p class="pj">${esc(g.project.title)}</p><ol class="pj-s">${g.project.steps.slice(0, 4).map((s) => `<li>${esc(s)}</li>`).join("")}</ol><p class="small">${esc(g.portfolio)}</p>
      <h3 class="eyebrow">받을 질문</h3><ul class="qs">${g.interview.slice(0, 3).map((q) => `<li>“${esc(q)}”</li>`).join("")}</ul></div>
  </div>
  ${withCal ? `<h3 class="eyebrow">⑫ 3 · 6 · 12개월 <span>${listed ? "상장사 정기공시 일정에 맞춤" : "공시 의무 없는 회사"}</span></h3>
  <div class="cal">${cal.map(([w, t, o]) => `<div><span>${esc(w)}</span><b>${esc(t)}</b><em>${esc(o)}</em></div>`).join("")}</div>` : ""}
  <div class="chk"><b>⑪ 공식 채용 정보 확인 방법</b><span>${esc(c.toCheck.slice(0, 2).join(" · ") || "신입 채용 이력이 있는 부서")}</span><span>회사 채용 쪽과 공고 원문의 주소·확인일을 함께 적어 두세요. 이 리포트는 채용 여부를 확인하지 않았습니다.</span></div>
  ${gaps(lib, n)}`);
}

/* ── 79 출처와 판본 ────────────────────────────────────────────── */

export function d79(r: Report3, lib: Lib, built?: number[]): string {
  const parts = Object.entries(lib.toc.parts);
  const cnt = (k: string) => lib.toc.pages.filter((p) => (!built || built.includes(p.n)) && p.verify.includes(k)).length;
  const libs: [string, string, string, string][] = [
    ["검사 응답 · 결과 모델", "학생 응답 · 고른 근거", "판본 고정(굳은 결과)", Object.entries(r.versions).filter(([k]) => /bank|scor|result_model/i.test(k)).map(([, v]) => v).join(" · ") || "판본 표 참고"],
    ["경험 기록", "학생이 적은 기록(자기보고)", "응시 뒤 갱신 가능", "기록마다 적은 날"],
    ["경영 직무 안내", "biz-role-guide.json", "직무 일반 · 검토 전", "PREVIEW"],
    ["기업별 직무 해석", "biz-company-guide.json", "리포트 해석", "PREVIEW"],
    ["지역 기업 자료", "kr-chungcheong-orgs.v2.json", "줄마다 출처·확인일", "2026-10-20"],
    ["공시 대조", "dart-checks.v1.json", "공식 원문 직접 확인", lib.dart.checked_on],
    ["공시 원문 발췌", "dart-overview.v1.json", "공식 원문 직접 확인", lib.overview.checked_on],
    ["지역 공식 통계", "미확보(R2 · R3 · R4)", "—", "—"],
    ["학과 교육과정", "미확보(R1)", "—", "—"],
  ];
  return frame(r, lib, 79, `
  ${opener("09", "근거와 출처 ②", "출처 · 확인 수준 · 판본", "이 보고서의 줄마다 어디서 왔는지와 언제 확인했는지를 적었습니다. 학생의 검사 결과는 응시한 날 굳어 바뀌지 않고, 기업·지역 자료는 판본과 확인일을 달고 따로 고칩니다.")}
  <table class="lb"><thead><tr><th>자료</th><th>파일 · 출처</th><th>확인 수준</th><th>판본 · 확인일</th></tr></thead><tbody>
  ${libs.map(([a, b, c, d]) => `<tr class="${b.startsWith("미확보") ? "miss" : ""}"><td><b>${esc(a)}</b></td><td>${esc(b)}</td><td>${esc(c)}</td><td>${esc(d)}</td></tr>`).join("")}</tbody></table>
  <div class="g79">
    <div><h3 class="eyebrow">확인 수준 다섯 단계</h3><ul class="lv">
      <li>${tag("OFFICIAL_DIRECT")} 공식 원문을 이 환경에서 직접 받아 대조함 — 지금은 OpenDART 하나</li>
      <li>${tag("THIRD_PARTY")} 제3자 자료(KODATA) — 학생 배포 권리 확정 전</li>
      <li>${tag("SEARCH_ONLY")} 검색·보도 결과만 봄</li>
      <li>${tag("CONFLICTING")} 출처끼리 다름 — 예: 본점 소재지가 자료와 공시에서 다른 곳</li>
      <li>${tag("UNVERIFIED")} 확인하지 못함</li></ul></div>
    <div><h3 class="eyebrow">${built ? "이 보고서의 쪽마다 걸린 수준" : "80쪽 설계에서 쪽마다 걸린 수준"} <span>쪽 수</span></h3><ul class="vc">
      ${[["MEASURED", "검사 응답"], ["GENERAL", "직무 일반"], ["OFFICIAL_DIRECT", "공식 원문"], ["THIRD_PARTY", "제3자 자료"], ["SEARCH_ONLY", "검색 결과"], ["NEEDS_OFFICIAL", "공식 자료 필요"]].map(([k, t]) => `<li><span>${esc(t)}</span><i style="width:${(cnt(k) * 1.6).toFixed(1)}mm"></i><b>${cnt(k)}</b></li>`).join("")}</ul>
      <p class="small">한 쪽에 수준이 여럿이면 각각 셉니다. 장 ${parts.length}개 · ${built ? `이 학생 판 ${built.length}쪽` : "80쪽"}.</p></div>
  </div>
  <p class="src">이 리포트는 점수 · 순위 · 합격 가능성 · 채용 여부를 내지 않습니다. 공식 통계와 공고 원문을 확보하면 그 칸의 확인 수준과 확인일이 바뀌고, 학생의 검사 결과는 바뀌지 않습니다.</p>`);
}

/* ── 조립 ──────────────────────────────────────────────────────── */

export function design5(r: Report3, lib: Lib, f: Fonts): string {
  const pages = [d25, d28, d36, d37, d43, d44, d56, d79].map((fn) => fn(r, lib));
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>CareerMatri PRO · 80쪽 설계 핵심 쪽</title>
<style>${faces(f)}${CSS.replace(/__FONT__/g, f.family)}${CSS5}</style></head><body>${pages.join("\n")}</body></html>`;
}

export const CSS5 = `
.vt-GENERAL{background:#EFEAF8;color:#4B3A78}.vt-READ{background:#F7EEDF;color:#7A5418}
.gap{font-size:7.8pt;color:#7A5418;background:var(--amber-t);padding:1.4mm 2.4mm;margin-top:2mm;line-height:1.5}
.gap b{color:#5E3E0F}
.slot,.slot1{border:.8pt dashed #C9CFD9;background:#fff;color:var(--muted)}
.slot1{padding:3mm;font-size:9pt;text-align:center;margin:0 0 3mm}
/* 25 직무 지도 */
.jm{width:100%;border-collapse:collapse;font-size:8.4pt;margin-bottom:2.5mm}
.jm th,.jm td{border-bottom:.5pt solid var(--rule);padding:1.2mm .6mm;text-align:center;vertical-align:middle}
.jm thead th{font-weight:700;color:var(--navy);line-height:1.3;border-bottom:1.2pt solid var(--navy);font-size:8pt}
.jm thead th em{display:block;font-style:normal;font-size:6.8pt;color:#fff;background:var(--navy);border-radius:5pt;margin:.6mm auto 0;width:9mm}
.jm .dn{text-align:left;width:34mm;font-weight:600;color:var(--ink)}
.jm td i{display:inline-block;width:3.4mm;height:3.4mm;border-radius:50%}
.jm td.core i{background:var(--navy)}.jm td.dom i{background:#8FA8D3}.jm td.rl i{border:1pt solid #8FA8D3;width:3mm;height:3mm}
.jm .gl{background:#EEF3FB}
.jm tr.z1 th.dn{color:var(--blue)}.jm tr.z1 th.dn:before{content:"";display:inline-block;width:1.4mm;height:3mm;background:var(--amber);margin-right:1.4mm;vertical-align:-.5mm}
.jm .me{width:26mm;text-align:left}
.dp{font-size:7.6pt;font-weight:600}.dp.na{color:#A6ADBA;font-weight:400}.dp.d0{color:#8A93A3}.dp.d1{color:#5D86C4}.dp.d2{color:var(--blue)}.dp.d3{color:var(--navy)}
.jm-key{display:flex;flex-wrap:wrap;gap:2mm 5mm;font-size:7.8pt;color:var(--muted);margin-bottom:3mm}
.jm-key .k{display:inline-block;width:3mm;height:3mm;border-radius:50%;margin-right:1.2mm;vertical-align:-.4mm}
.k.core{background:var(--navy)}.k.dom{background:#8FA8D3}.k.rl{border:1pt solid #8FA8D3}.k.z1{background:var(--amber);border-radius:0;width:1.4mm}
.k.ko{background:#DFF2E6;border:1pt solid #1D6B3B;border-radius:1pt}.k.ks{background:#EEF0F4;border:1pt solid #8A93A3;border-radius:1pt}.k.kc{background:#FDE6E1;border:1pt solid #8A2F1D;border-radius:1pt}.k.kg{background:var(--navy);border-radius:1pt}
.jm-sum{display:grid;grid-template-columns:1fr 1fr;gap:1.6mm 5mm}
.jm-sum div{border-top:.5pt solid var(--rule);padding-top:1.2mm}.jm-sum div.gl{border-top:1.4pt solid var(--navy)}
.jm-sum b{font-size:8.8pt;color:var(--navy)}.jm-sum p{font-size:8.4pt;line-height:1.45;margin:.4mm 0 0}
/* 28 사업보고서 */
.g28{display:grid;grid-template-columns:1.05fr 1fr;gap:6mm;margin-bottom:4mm}
.quote{margin:0;background:var(--tint);padding:4mm 4.5mm;border-left:2.4pt solid var(--navy)}
.q-k{font-size:7.6pt;font-weight:700;color:var(--blue);letter-spacing:.4pt}
.quote blockquote{margin:1.5mm 0 3mm;font-size:9.3pt;line-height:1.72;color:var(--ink)}
.quote figcaption{font-size:7.6pt;color:var(--muted);line-height:1.6}
.read li{display:grid;grid-template-columns:7mm 1fr;gap:1mm;padding:2mm 0;border-top:.5pt solid var(--rule)}
.rn{font-size:15pt;font-weight:800;color:var(--navy);line-height:1}
.read b{font-size:10pt;color:var(--navy)}.read p{font-size:9pt;line-height:1.55;margin:.6mm 0 .6mm}.read em{font-style:normal;font-size:7.8pt;color:var(--blue)}
.ws-g{display:grid;grid-template-columns:1fr 1.3fr 1.2fr;gap:4mm}
.ws-g div{border:.8pt dashed #B9C3D3;padding:2.4mm 3mm;min-height:20mm}.ws-g b{font-size:8pt;color:var(--blue)}.ws-g p{font-size:9pt;line-height:1.5;margin:.6mm 0 0}
/* 36 구조도 */
.top36{display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:3.5mm;margin-bottom:4mm}
.top36>div{padding:2.6mm 3mm}.sb{background:var(--navy);color:#fff}.sb p{font-size:10.4pt;font-weight:700;margin:1mm 0 1.4mm;line-height:1.45}
.sb .small{color:rgba(255,255,255,.75);font-size:7.6pt}.sb-k{font-size:7.6pt;letter-spacing:.3pt;font-weight:700}.sb .sb-k{color:#C9D6EC}
.slot p{font-size:9pt;margin:1mm 0;color:var(--ink)}.slot .sb-k{color:var(--muted)}.slot .small{font-size:7.6pt;color:#9A6A22}
.sh,.sr{display:grid;grid-template-columns:32mm 6mm 1fr 6mm 52mm;align-items:center}
.sh{font-size:7.8pt;color:var(--muted);font-weight:700;border-bottom:1.2pt solid var(--navy);padding-bottom:1mm;margin-bottom:.6mm}
.sr{padding:1.5mm 0;border-bottom:.5pt solid var(--rule)}
.s1{font-size:9pt;font-weight:700;color:var(--navy)}
.arr{height:0;border-top:1pt solid #9DB0CF;position:relative;margin:0 1mm}.arr:after{content:"";position:absolute;right:-1pt;top:-2.6pt;border:2.4pt solid transparent;border-left:3.4pt solid #9DB0CF}
.s2,.s3{display:flex;flex-wrap:wrap;gap:1mm}
.co{font-size:8pt;padding:.3mm 2mm;border-radius:2pt;line-height:1.5;border:.6pt solid}
.c-OFFICIAL_DIRECT{background:#DFF2E6;border-color:#9BC9AC;color:#164F2C}.c-SEARCH_ONLY{background:#EEF0F4;border-color:#C9CFD9;color:#3D4757}.c-CONFLICTING{background:#FDE6E1;border-color:#E6A99B;color:#8A2F1D}
.s3 .rl{font-size:7.8pt;padding:.2mm 1.6mm;border-radius:7pt;background:var(--tint);color:var(--navy)}.s3 .rl.gl{background:var(--navy);color:#fff}
/* 37 공시 표 */
.dt{width:100%;border-collapse:collapse;font-size:8.4pt;margin-bottom:4mm}
.dt th{text-align:left;font-size:7.8pt;color:var(--muted);font-weight:700;border-bottom:1pt solid var(--navy);padding:1mm 1.4mm}
.dt td{border-bottom:.5pt solid var(--rule);padding:1.6mm 1.4mm;vertical-align:top;line-height:1.45}
.dt td b{display:block;color:var(--navy);font-size:8.8pt}.dt .small{display:block;font-size:7.6pt}
.dt .nm{text-align:right;white-space:nowrap;font-weight:700;color:var(--navy)}.dt td.nm em{display:block;font-style:normal;font-weight:400;font-size:7pt;color:var(--muted)}
.dt .neg,.fb .neg{color:#A33B22}
.sg{display:grid;grid-template-columns:18mm auto 1fr;align-items:center;gap:1.4mm;font-size:7.6pt;line-height:1.5}
.sg i{display:block;height:2.6mm;background:#8FA8D3}.sg b{font-size:7.8pt;color:var(--navy)}
.warn{color:#A33B22;font-weight:600}
.dt2 td b{display:inline}
.none{margin:-1.5mm 0 1mm}
/* 43 기업 */
.idg{display:grid;grid-template-columns:repeat(3,1fr);gap:0;border-top:1.2pt solid var(--navy);border-bottom:.5pt solid var(--rule)}
.idg div{padding:1.6mm 2.4mm 1.6mm 0;border-bottom:.5pt dotted var(--rule)}.idg span{display:block;font-size:7.4pt;color:var(--muted)}.idg b{font-size:8.8pt;color:var(--navy);line-height:1.4;font-weight:600}
.idsrc{margin:1mm 0 3.5mm}
.g43{display:grid;grid-template-columns:1.1fr 1fr;gap:6mm}
.bq{margin:0 0 1.4mm;font-size:9.2pt;line-height:1.7;padding-left:3.5mm;border-left:2pt solid var(--navy)}
.prod{display:flex;flex-wrap:wrap;gap:1.4mm;margin-bottom:2mm}.prod b{font-size:8.4pt;padding:.6mm 2.4mm;background:var(--tint);border:.5pt solid var(--rule);font-weight:600;color:var(--navy)}
.interp{font-size:9pt;line-height:1.6;padding-left:3.5mm;border-left:2pt solid var(--blue)}
.fb{display:grid;grid-template-columns:18mm 1fr 22mm;align-items:center;gap:2mm;margin-bottom:1.6mm;font-size:8.4pt}
.fb-t{height:4mm;background:var(--tint)}.fb-t i{display:block;height:100%;background:var(--navy)}.fb-t i.neg{background:#C9735D}
.fb b{text-align:right;color:var(--navy)}
.calc{display:grid;grid-template-columns:1fr auto;border:.8pt solid var(--navy);padding:2mm 3mm;margin:2.4mm 0 1.6mm}
.calc span{font-size:8.4pt;font-weight:600}.calc b{font-size:15pt;color:var(--navy);grid-row:span 2;align-self:center}.calc em{font-style:normal;font-size:7.4pt;color:var(--muted)}
/* 44 */
.g44{display:grid;grid-template-columns:1fr 1.05fr;gap:6mm}
.stk{display:flex;height:9mm;margin:1mm 0 1.6mm}.stk-s{display:flex;align-items:center;justify-content:center;color:#fff;font-size:8.4pt}
.sg0{background:var(--navy)}.sg1{background:#5D86C4}.sg2{background:#8FA8D3}.sg3{background:#C3D2EA}
.stk-l{display:flex;flex-wrap:wrap;gap:1mm 4mm;font-size:8.2pt;margin-bottom:1.6mm}.stk-l i{display:inline-block;width:2.6mm;height:2.6mm;margin-right:1.2mm;vertical-align:-.3mm}
.jt{width:100%;border-collapse:collapse;font-size:8.6pt}.jt th{text-align:left;width:23mm;color:var(--navy);padding:1.6mm 1mm 1.6mm 0;vertical-align:top}
.jt td{padding:1.6mm 0;line-height:1.5;border-bottom:.5pt solid var(--rule)}.jt th{border-bottom:.5pt solid var(--rule)}.jt tr.gl th{color:var(--blue)}.jt .small{display:block;margin-top:.6mm}
.two{display:grid;grid-template-columns:1fr 1fr;gap:3mm;margin-bottom:3mm}.two>div{background:var(--tint);padding:2.4mm 3mm;font-size:8.6pt;line-height:1.5}
.two b{display:block;font-size:8pt;color:var(--blue);margin-bottom:.8mm}.two ol{list-style:decimal;padding-left:4mm;margin-bottom:1mm}.two p{margin-bottom:1mm}
.fit5 li{font-size:8.6pt;line-height:1.5;padding:1.4mm 0;border-top:.5pt solid var(--rule)}.fit5 em{display:block;font-style:normal;font-size:7.6pt;font-weight:700}
.fit5 .have em{color:var(--blue)}.fit5 .need em{color:#9A6A22}
/* 56 */
.g56{display:grid;grid-template-columns:1.05fr 1fr;gap:6mm;margin-bottom:2mm}
.sty{margin:0}.sty>div{display:block;padding:1.6mm 0;border-top:.5pt solid var(--rule);font-size:8.8pt;line-height:1.55}
.sty dt{color:var(--blue);font-weight:700;font-size:8pt;margin-bottom:.4mm}.sty dd{margin:0}.sty .empty dd{color:var(--muted)}
.pj{font-size:10pt;font-weight:700;color:var(--navy);margin-bottom:1mm}
.pj-s{counter-reset:s}.pj-s li{counter-increment:s;font-size:8.6pt;line-height:1.5;padding-left:5mm;position:relative;margin-bottom:.8mm}
.pj-s li:before{content:counter(s);position:absolute;left:0;top:.3mm;width:3.4mm;height:3.4mm;border-radius:50%;background:var(--navy);color:#fff;font-size:6.6pt;text-align:center;line-height:3.4mm}
.qs li{font-size:8.8pt;font-weight:600;color:var(--navy);line-height:1.5;margin-bottom:1mm}
.cal{display:grid;grid-template-columns:repeat(3,1fr);gap:3mm;margin-bottom:3mm}
.cal div{border-top:2.4pt solid var(--blue);background:var(--tint);padding:2mm 3mm}.cal span{font-size:7.8pt;font-weight:700;color:var(--blue)}
.cal b{display:block;font-size:9pt;color:var(--navy);line-height:1.45;margin:.8mm 0}.cal em{font-style:normal;font-size:7.8pt;color:var(--muted)}
.chk{display:grid;grid-template-columns:42mm 1fr;gap:.6mm 4mm;border:.8pt dashed #B9822F;padding:2.4mm 3mm;font-size:8.4pt;line-height:1.5}
.chk b{grid-row:span 2;color:#7A5418}
/* 79 */
.lb{width:100%;border-collapse:collapse;font-size:8.6pt;margin-bottom:4mm}
.lb th{text-align:left;font-size:7.8pt;color:var(--muted);border-bottom:1pt solid var(--navy);padding:1mm 1.4mm}
.lb td{padding:1.5mm 1.4mm;border-bottom:.5pt solid var(--rule)}.lb td b{color:var(--navy)}.lb tr.miss td{color:#9A6A22;background:#FCF7EF}
.g79{display:grid;grid-template-columns:1.1fr 1fr;gap:6mm}
.lv li{font-size:8.6pt;line-height:1.5;padding:1.3mm 0;border-top:.5pt solid var(--rule)}
.vc li{display:grid;grid-template-columns:24mm auto 1fr;align-items:center;gap:2mm;font-size:8.4pt;padding:1mm 0}.vc i{display:block;height:3mm;background:#8FA8D3}.vc b{color:var(--navy)}
`;
