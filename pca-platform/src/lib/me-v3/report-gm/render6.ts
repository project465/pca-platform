/**
 * **CareerMatri PRO · BIZ 전체 보고서(70~80쪽) 검토판.** 80쪽 설계표(`data/report-gm/biz-pro-toc.v1.json`)의
 * 쪽마다 한 장씩, 학생 한 사람의 굳은 결과(`Report3`)와 자료 묶음(`Lib`)으로 그린다. 운영 PDF 경로와 연결하지 않는다.
 *
 * 쪽이 서는 규칙:
 * - **조건(`when`)이 맞지 않으면 그 쪽을 빼고 다른 쪽으로 채우지 않는다.** 뺀 쪽과 까닭은 마지막 쪽에 그대로 적는다.
 * - **조사 자료가 없어 쪽의 중심이 비는 자리(RESEARCH)는 세우지 않는다.** 일부만 비면 그 칸에 ‘자료 없음’ 과 부족 자료 번호를 둔다.
 * - **값을 만들지 않는다.** 점수·순위·적합도·합격 가능성·채용 여부는 어느 쪽에도 없다. 숫자는 응답의 개수와 공시 원문 값뿐이다.
 * - 층을 섞지 않는다: 검사 응답 · 학생 기록 · 직무 일반 안내 · 공시 원문 · 제3자 자료 · 검색 결과 · 리포트 해석을 쪽마다 표시한다.
 *
 * v4 대표 쪽(`render4.ts`)과 v5 핵심 쪽(`render5.ts`)은 그대로 다시 쓰고, 그 밖의 쪽은 같은 활자·색·쪽 틀로 여기서 그린다.
 * 새로 지은 이름은 모두 `x-` 로 시작한다(v4·v5 CSS 와 겹치지 않게).
 */
import type { Report3, CompanyDeep, Story } from "./report3";
import type { DomainRead } from "./analysis3";
import { CROSS_TAG } from "./analysis3";
import { roleGuide } from "./guide";
import { JUDGE, STEP, VERIFY5, ZONE_SAID } from "./words";
import { REGION_KO } from "./companies";
import type { Level } from "./profile";
import { withJosa } from "../result/josa";
import { esc, opener, CSS, faces, signature, p2, p3, p5, type Fonts } from "./render4";
import {
  CSS5, d25, d28, d36, d37, d43, d44, d56, d79, tag, eok, pick, dartOf, readSigns, ROLE_SHORT, ROLE_ORDER,
  type Lib,
} from "./render5";

/* ── 틀 ────────────────────────────────────────────────────────── */

type Built = { n: number; html: string } | { n: number; skip: string };
const skip = (n: number, why: string): Built => ({ n, skip: why });
const H = (t: string, s = "") => `<h3 class="eyebrow">${esc(t)}${s ? ` <span>${esc(s)}</span>` : ""}</h3>`;
const UL = (xs: (string | null | undefined)[], cls = "x-ul", none = "없음") => {
  const ys = xs.filter((x): x is string => !!x);
  return ys.length ? `<ul class="${cls}">${ys.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : `<p class="none">${esc(none)}</p>`;
};
/** 칸의 값은 이미 이스케이프한 HTML 이다 */
const TB = (head: string[], rows: string[][], cls = "") => `<table class="x-tb ${cls}"><thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
const E = (s: unknown) => esc(s);
const nonePick = "고른 항목 없음";
const lvWord = (lv: Level | null) => (lv === null ? "묻지 않음" : STEP[lv].tag);

function pg(r: Report3, n: number, body: string): string {
  const head = [r.meta.school, r.meta.department].filter(Boolean).join(" · ");
  return `<section class="pg" data-page="${n}"><header class="rh"><span>${esc(head)}</span><span>CareerMatri PRO 진로·취업 전략 보고서</span></header><div class="bd">${body}</div><footer class="rf"></footer></section>`;
}
function miss(lib: Lib, codes: string[], text: string): string {
  return `<div class="x-miss"><b>자료 없음 — 이 칸은 비워 둡니다</b><p>${esc(text)}</p><ul>${codes.map((k) => `<li><span>${esc(k)}</span>${esc(lib.toc.missing[k]?.what ?? "")} <em>· ${esc(lib.toc.missing[k]?.status === "BLOCKED_NETWORK" ? "이 작업 환경에서 출처에 접속하지 못함" : (lib.toc.missing[k]?.status ?? ""))}</em></li>`).join("")}</ul></div>`;
}
const gapsOf = (lib: Lib, n: number) => {
  const p = lib.toc.pages.find((x) => x.n === n);
  return p?.missing.length ? `<p class="gap">부족한 조사 자료 — ${p.missing.map((k) => `<b>${esc(k)}</b> ${esc(lib.toc.missing[k]?.what ?? "")}`).join(" · ")}</p>` : "";
};
const asked = (d: DomainRead) => d.askedHow !== "NONE";
const NO = ["①", "②", "③", "④"];
const roleName = (code: string) => ({
  ROLE_PLAN_V1: "경영기획", ROLE_ANALYTICS_V1: "데이터·분석", ROLE_FINACC_V1: "재무·회계", ROLE_OPS_V1: "운영관리",
  ROLE_CS_V1: "서비스·고객운영", ROLE_SALES_V1: "영업·사업개발", ROLE_MKT_V1: "마케팅", ROLE_HR_V1: "인사",
} as Record<string, string>)[code] ?? ROLE_SHORT[code] ?? code;

/** 자기소개서 재료 가운데 이 회사 직무에 맞는 것을 고른다. 없으면 차례대로 돌려 쓰지 않고 첫 재료를 쓴다 */
const storyFor = (r: Report3, c: CompanyDeep) => r.application.stories.find((s) => s.fits.some((f) => c.jobs.some((j) => j.name === f))) ?? r.application.stories[0];

/* ── v7: 학생의 근거·빈자리·실행 과제를 기업·면접·자기소개서 쪽에 잇는 조각 ───────────────────
 * 이 조각들은 모두 이미 굳은 값(`Report3`)을 다시 읽기만 한다. 새 판단·수치·채용 정보를 만들지 않고,
 * 학생이 채워야 하는 자리는 ‘직접 기입’ 칸으로 남긴다. */

/** 직무 줄의 판단 이름(“문서와 결과물 만들기 — …” 의 앞 토막) */
const head = (s: string) => s.split(" — ")[0].trim();
/** 응답에서 확인된 판단 줄을 “판단 — ‘고른 문장’” 으로 줄인다 */
const shortHave = (s: string) => { const q = /(‘[^’]+’)/.exec(s)?.[1]; return q ? `${head(s)} — ${q}` : /고른 항목 없음/.test(s) ? `${head(s)} (응답만 · 고른 항목 없음)` : head(s); };
/** 이 직무의 아직 확인되지 않은 판단과 같은 판단을 다루는 실행 과제 */
const priorityFor = (r: Report3, needs: string[]) => r.priorities.find((p) => needs.some((n) => head(n) === p.what || n.includes(p.what)));
const SLOT = (t: string) => `<span class="x-slot">${E(t)}</span>`;

/** 기업 전략 쪽(설계 56·58·60·62)의 아래 칸: 이 회사에 먼저 꺼낼 내 근거 · 지원 전에 메울 빈자리 · 직접 기입할 것 */
function coLink(r: Report3, c: CompanyDeep): string {
  const j = c.jobs[0];
  if (!j) return "";
  const p = priorityFor(r, j.need);
  const have = j.have.slice(0, 2).map(shortHave);
  return `<div class="x-link">${H(`${c.name}에 쓰는 내 근거와 빈자리`, `${j.name} · 응답 그대로`)}<div class="x-g3">
    <div><b>먼저 꺼낼 내 근거</b>${UL(have, "x-ul x-have", `이 직무에 걸리는 근거가 아직 없습니다 — 위 프로젝트가 첫 근거입니다`)}</div>
    <div><b>지원 전에 메울 빈자리</b>${UL(j.need.slice(0, 2).map(head), "x-ul x-need", j.have.length && j.have.every((h) => /고른 항목 없음/.test(h)) ? "핵심 판단은 응답에서 확인됐지만 고른 근거 항목이 없음 — 장면 하나를 골라 근거로 남기는 일이 먼저" : "이 직무의 핵심 판단은 응답에서 모두 확인됨 — 남은 일은 결과 수치를 직접 채우는 것")}${p ? `<p class="x-sm">실행 과제 ${p.order}번 ${E(withJosa(`‘${p.title}’`, "과와"))} 같은 판단 — 남길 것 ${E(p.output)}</p>` : ""}</div>
    <div><b>직접 기입할 것</b><ul class="x-fill"><li>과목·학기·팀 인원 ${SLOT("직접 기입")}</li><li>내가 맡은 몫 ${SLOT("직접 기입")}</li><li>결과 수치·기간 ${SLOT("직접 기입")}</li></ul></div>
  </div></div>`;
}

/** 면접 질문 ① 의 답 재료: 질문마다 같은 영역이라도 다른 고른 문장을 쓴다(같은 줄을 되풀이하지 않게) */
function kitConfirmed(r: Report3) {
  const used = new Map<string, number>();
  return (x: QA) => {
    // 질문이 묻는 판단(axis)이 정해져 있으면 그 판단에서 고른 문장(pick)만 쓴다. 고른 문장이 없으면 다른 판단의 문장으로 채우지 않고 직접 기입 칸을 둔다
    const d = (x.domain ? r.domains.find((d) => d.code === x.domain) : undefined)
      ?? (x.axis ? undefined : r.domains.find((d) => x.why.startsWith(d.name) || x.material.startsWith(d.name)) ?? r.domains.find((d) => d.decisions.length + d.acts.length));
    if (!d && !x.axis) return "";
    const k = d ? (used.get(d.code) ?? 0) : 0; if (d) used.set(d.code, k + 1);
    const at = (xs: string[]) => xs[k] ?? xs[xs.length - 1];
    const dec = x.pick ?? (x.axis ? undefined : d ? at(d.decisions) ?? at(d.acts) : undefined);
    const art = d ? at(d.artifacts) : undefined, cmp = d ? at(d.comparisons) : undefined;
    return `<dl class="x-kit"><div><dt>장면</dt><dd>${d ? `${E(d.name)} · ` : ""}${SLOT("과목·학기·팀 인원 직접 기입")}</dd></div>
      <div><dt>내가 정한 것</dt><dd>${dec ? E(dec) : SLOT("이 질문에 맞는 장면 직접 기입")}</dd></div>
      <div><dt>남긴 것</dt><dd>${art ? E(art) : SLOT("결과물 이름 직접 기입")}</dd></div>
      <div><dt>비교와 결과</dt><dd>${cmp ? `${E(cmp)} · ${SLOT("수치 직접 기입")}` : SLOT("무엇과 견줬고 얼마나 달라졌나 직접 기입")}</dd></div></dl>`;
  };
}
/** 면접 질문 ② 의 답 재료: 아직 확인되지 않은 판단이라 지금 할 말과 면접 전에 만들 것을 가른다 */
/** 빈자리 질문: 결과 모델이 고른 둘에 더해, 실행 과제의 나머지 판단도 같은 꼴로 묻는다(목표 직무 역할팩 문항이 있으면 그 말로) */
function gapQs(r: Report3): QA[] {
  const xs = r.application.interview.filter((x) => /^준비 —/.test(x.material));
  for (const p of r.priorities) {
    if (xs.length >= 4) break;
    if (xs.some((x) => x.material.includes(p.todo) || x.why.includes(p.title))) continue;
    xs.push({ q: p.ask ? `“${p.ask}”` : `“${p.domain} 과제에서 ${withJosa(p.what, "을를")} 직접 맡아 본 적이 있나요?”`, why: `${r.strategy.roleName}에서 ‘${p.title}’ 장면을 묻는 질문입니다. 아직 응답에서 확인되지 않아 미리 준비합니다`, material: `준비 — ${p.todo} → ${p.output}` });
  }
  return xs;
}
function kitGap(r: Report3) {
  return (x: { q: string; why: string; material: string }) => {
    const p = r.priorities.find((p) => x.material.includes(p.todo) || x.why.includes(p.title));
    if (!p) return "";
    return `<dl class="x-kit"><div><dt>지금 답할 것</dt><dd>${E(`아직 맡아 본 적은 없다고 먼저 말하고, ${withJosa(p.what, "이가")} 왜 필요한지를 이해한 만큼 한 문장으로`)}</dd></div>
      <div><dt>면접 전에 만들 것</dt><dd>${E(`실행 과제 ${p.order}번 ‘${p.title}’ — ${p.output}`)}</dd></div>
      <div><dt>언제 · 어디서</dt><dd>${E(`${p.when} · ${p.where || "수업·팀 과제"}`)}</dd></div>
      <div><dt>만든 날</dt><dd>${SLOT("결과물 이름과 날짜 직접 기입")}</dd></div></dl>`;
  };
}
/** 면접 질문 ③ 의 답 재료: 그 회사에서 확인된 사실 한 줄 + 내 근거 가운데 가장 가까운 것 */
function kitCompany(r: Report3) {
  const seen = new Map<string, number>();
  const usedHave = new Set<string>();
  return (x: { q: string; why: string; material: string }) => {
    const c = r.companies.find((c) => x.why.startsWith(c.name));
    if (!c) return "";
    const k = seen.get(c.id) ?? 0; seen.set(c.id, k + 1);
    const j = c.jobs[0];
    const f = c.facts.find((f) => f.level === "OFFICIAL_DIRECT") ?? c.facts[0];
    // 같은 근거를 회사마다 되풀이하지 않는다: 앞 질문에서 아직 쓰지 않은 근거를 고르고, 다 썼으면 그 회사의 결과물로 잇는다
    const have = j?.have.find((h) => !usedHave.has(shortHave(h))) ?? null;
    if (have) usedHave.add(shortHave(have));
    // 같은 회사의 둘째 질문부터는 회사 사실을 다시 적지 않고, 다른 근거나 만들 결과물로 잇는다
    return `<dl class="x-kit">${k === 0 ? `<div><dt>회사 사실 한 줄</dt><dd>${f ? `${E(f.text)} ${tag(f.level as "OFFICIAL_DIRECT")}` : SLOT("공식 원문에서 확인해 직접 기입")}</dd></div>` : ""}
      <div><dt>${have ? "잇는 내 근거" : "만들 결과물"}</dt><dd>${have ? E(shortHave(have)) : E(`${j?.project.title ?? "첫 프로젝트"} — ${j?.project.output ?? ""}`)}</dd></div></dl>`;
  };
}

/* ── 1부 표지·진단·요약 ─────────────────────────────────────────── */

function cover(r: Report3, lib: Lib, idx: Map<number, number>, total: number): string {
  const parts = Object.entries(lib.toc.parts).map(([k, v]) => {
    const ns = lib.toc.pages.filter((p) => String(p.part) === k && idx.has(p.n)).map((p) => idx.get(p.n)!);
    return { k, title: v.title, from: ns.length ? Math.min(...ns) : null, cnt: ns.length };
  });
  const goal = r.priorities[0]?.chain.goal ?? r.strategy.roleName;
  const ready = r.directions.find((d) => d.goal)?.readiness ?? "";
  const figs = [
    { n: r.domains.filter(asked).length, u: "개 영역", l: "판단을 자세히 물은 영역" },
    { n: r.profile.picks, u: "개", l: "체크리스트에서 고른 근거" },
    { n: r.records.length, u: "건", l: "함께 읽은 경험 기록" },
    { n: r.companies.length, u: "곳", l: "깊게 본 지역 기업" },
  ];
  return `<section class="pg cover" data-page="1">
  <div class="cv-top">
    <div class="cv-brand"><b>CareerMatri</b><span>PRO 진로·취업 전략 보고서</span></div>
    <div class="cv-main">
      <div class="cv-id"><p class="cv-school">${E(r.meta.school ?? "")}</p><h1 class="cv-title">${E(r.meta.department ?? r.meta.major ?? "")}</h1>
        <p class="cv-sub">${E(r.majorName)} 전공 기준 · 응답일 ${E(r.meta.answeredOn ?? "—")} · 전체 ${total}쪽</p>
        <dl class="cv-goal"><div><dt>목표</dt><dd>${E(goal)}</dd></div>${ready ? `<div><dt>목표 직무 준비 상태</dt><dd>${E(ready)}</dd></div>` : ""}</dl></div>
      <figure class="cv-sig">${signature(r)}<figcaption>열두 영역 — 선의 길이는 관심, 점의 채움은 스스로 해 본 깊이입니다. 빈 점은 이번에 자세히 묻지 않은 영역입니다.</figcaption></figure>
    </div>
  </div>
  <div class="cv-low">
    <p class="cv-lead">${E(r.summary.lead)}</p>
    <div class="figs">${figs.map((f) => `<div><span class="fg-n">${f.n}<small>${E(f.u)}</small></span><b>${E(f.l)}</b></div>`).join("")}</div>
    <ol class="x-parts">${parts.map((p) => `<li class="${p.cnt ? "" : "off"}"><span>${p.k}</span><b>${E(p.title)}</b><em>${p.from ? `${p.from}쪽 · ${p.cnt}쪽` : "이 판에 없음"}</em></li>`).join("")}</ol>
    <p class="cv-review">검토용 · 학생 배포 전 · 기업 자료(KODATA 포함)의 배포 범위가 확정되기 전에는 학생에게 배포하지 않습니다 · 점수·순위·합격 가능성·채용 여부를 내지 않습니다</p>
  </div></section>`;
}

function guide2(r: Report3, lib: Lib, idx: Map<number, number>, skipped: { n: number; why: string }[]): string {
  const rows = Object.entries(lib.toc.parts).map(([k, v]) => {
    const ps = lib.toc.pages.filter((p) => String(p.part) === k && idx.has(p.n));
    const names = [...new Set(ps.map((p) => p.title.replace(/^기업 [①②③④] /, "기업 ").replace(/\(예:[^)]*\)\s*—?\s*/g, "").replace(/ [①②③]$/, "").replace(/ — .*$/, "")))];
    return `<tr><td><b>${k}</b></td><td><b>${E(v.title)}</b><span class="x-pg">${ps.length ? `${idx.get(ps[0].n)}~${idx.get(ps[ps.length - 1].n)}쪽` : "—"}</span></td><td class="x-sm">${E(names.join(" · "))}</td></tr>`;
  }).join("");
  const lv: [string, string][] = [
    ["자기보고 · 검사 응답", "답한 내용과 고른 문장. 응시한 날 굳습니다."],
    ["자기보고 · 학생 기록", "학생이 직접 적은 경험 기록."],
    ["직무 일반 해석", "경영 직무 일반 안내. 특정 기업 요건이 아닙니다."],
    ["추천 전략 · 해석", "이 보고서가 붙인 설명과 권하는 과제. 사실이 아닙니다."],
  ];
  return pg(r, 2, `${opener("01", "차례와 읽는 법", "이 보고서를 읽는 법", "장마다 무엇을 다루는지, 줄마다 붙은 표시가 무엇인지, 이 보고서에서 쓰는 말이 무엇을 뜻하는지 먼저 적었습니다.")}
  ${H("차례", `이 학생 판 ${idx.size}쪽`)}<table class="x-tb x-toc"><tbody>${rows}</tbody></table>
  <div class="x-g2">
    <div>${H("줄마다 붙은 표시")}<ul class="x-kv">${lv.map(([a, b]) => `<li><b>${E(a)}</b>${E(b)}</li>`).join("")}${(["OFFICIAL_DIRECT", "THIRD_PARTY", "SEARCH_ONLY", "CONFLICTING", "UNVERIFIED"] as const).map((k) => `<li>${tag(k)}${k === "OFFICIAL_DIRECT" ? "공시 확인 — " : ""}${E(VERIFY5[k].said)}</li>`).join("")}</ul></div>
    <div>${H("이 보고서에서 쓰는 말", "판단의 네 단계")}<ul class="x-kv">${([0, 1, 2, 3] as Level[]).map((l) => `<li><b>${E(STEP[l].tag)}</b>${E(STEP[l].said)}</li>`).join("")}</ul>
      ${H("영역의 상태")}<ul class="x-kv">${Object.values(ZONE_SAID).map((z) => `<li><b>${E(z.tag)}</b>${E(z.said)}</li>`).join("")}</ul></div>
  </div>
  <p class="src">설계 80쪽 가운데 이 학생의 응답과 자료로 서지 않는 ${skipped.length}쪽은 빼고 다른 쪽으로 채우지 않았습니다. 뺀 쪽과 까닭은 마지막 쪽에 있습니다.</p>`);
}

function g3(r: Report3): string {
  return pg(r, 3, `${opener("01", "요약", "한눈에 보기", "이 보고서 전체를 한 쪽에 줄였습니다. 칸마다 자세한 내용은 뒤의 장에 있습니다.")}
  <dl class="x-glance">${r.summary.glance.map((g) => `<div><dt>${E(g.label)}</dt><dd>${E(g.value)}</dd></div>`).join("")}</dl>
  ${H("결과의 요점", "확인된 사실 그대로")}
  <ol class="x-pts">${r.summary.points.map((p) => `<li><b>${E(p.label)}</b><p>${E(p.fact)}</p></li>`).join("")}</ol>
  ${H("지금 바로 할 일", "자세한 차례는 ‘실행 로드맵’ 쪽")}
  <ol class="now">${r.final.map((x, i) => `<li><span>${i + 1}</span><div><b>${E(x.label)}</b><em>${E(x.when)} · ${E(x.why)}</em></div></li>`).join("")}</ol>
  <p class="src">${tag("GENERAL", "검사 응답")} 이 쪽의 값은 모두 검사 응답과 경험 기록에서 왔습니다. 점수나 다른 학생과 견준 값이 아닙니다.</p>`);
}

const pointCard = (p: Report3["summary"]["points"][number]) => `<article class="x-pt">
  <h2>${E(p.label)}</h2><dl>
  <div><dt>확인된 사실</dt><dd>${E(p.fact)}</dd></div><div><dt>이것이 뜻하는 것</dt><dd>${E(p.meaning)}</dd></div>
  <div><dt>여기까지만 말할 수 있음</dt><dd>${E(p.limit)}</dd></div><div><dt>할 일</dt><dd>${E(p.action)}</dd></div></dl></article>`;
const LATE = ["목표 직무 준비 상태", "먼저 채울 부분"];

function g4(r: Report3): Built {
  const ps = r.summary.points.filter((p) => !LATE.includes(p.label));
  if (!ps.length) return skip(4, "종합 의견에 적을 확인된 사실이 없음");
  return { n: 4, html: pg(r, 4, `${opener("01", "종합 의견 ①", "지금 설명할 수 있는 것", r.summary.lead)}${ps.map(pointCard).join("")}
  ${r.profile.paragraphs[0] ? `<p class="interp">${E(r.profile.paragraphs[0])} ${tag("READ")}</p>` : ""}`) };
}
function g5(r: Report3): Built {
  const ps = r.summary.points.filter((p) => LATE.includes(p.label));
  const rows = r.directions.slice(0, 4).map((d) => [`<b>${E(d.name)}</b>${d.goal ? ' <span class="js">목표</span>' : ""}`, E(d.readiness), E(d.have.length ? d.have.map((h) => h.domain).filter((x, i, xs) => xs.indexOf(x) === i).join(" · ") : "—"), E(d.need.slice(0, 3).map((x) => x.name).join(" · ") || "—")]);
  return { n: 5, html: pg(r, 5, `${opener("01", "종합 의견 ②", "목표 직무 준비 상태와 한계", "목표로 고른 직무의 핵심 판단에 지금 응답을 대어 봤습니다. 합격 가능성이나 적합도를 계산한 것이 아닙니다.")}${ps.map(pointCard).join("")}
  ${H("함께 본 직무", "핵심 판단 기준 · 응답 그대로")}${TB(["직무", "준비 상태", "근거가 나온 영역", "아직 확인되지 않은 판단"], rows)}
  <p class="src">‘준비 근거 있음 · 일부 있음 · 아직 적음’ 은 그 직무의 핵심 판단을 응답에서 몇 가지 확인했는지만 말합니다.</p>`) };
}

/* ── 2부 개인 역량 ─────────────────────────────────────────────── */

function g7(r: Report3): string {
  const ROWS: [string | null, string][] = [["HIGH", "관심 높음"], ["MID", "관심 보통"], ["LOW", "관심 낮음"], [null, "관심 응답 없음"]];
  const COLS: [Level | null, string][] = [[null, "자세히 묻지 않음"], [0, "해 본 적 없음"], [1, "지시받아 수행"], [2, "직접 수행"], [3, "기준까지 직접 결정"]];
  const cell = (b: string | null, lv: Level | null) => r.map.filter((m) => m.interest === b && m.depth === lv).map((m) => `<b class="z-${m.zone.slice(0, 2)}">${E(m.name)}</b>`).join("");
  const cnt = (z: string) => r.map.filter((m) => m.zone === z).length;
  return pg(r, 7, `${opener("02", "개인 역량", "열두 영역 지도", "가로는 그 영역의 일을 어디까지 해 봤다고 답했는지, 세로는 관심입니다. 칸의 이름은 이 학생의 응답으로 놓였습니다.")}
  <table class="x-map"><thead><tr><th></th>${COLS.map(([, t]) => `<th>${E(t)}</th>`).join("")}</tr></thead><tbody>
  ${ROWS.map(([b, t]) => `<tr><th>${E(t)}</th>${COLS.map(([lv]) => `<td>${cell(b, lv)}</td>`).join("")}</tr>`).join("")}</tbody></table>
  ${H("영역의 상태별 개수")}<ul class="x-zc">${Object.entries(ZONE_SAID).map(([k, z]) => `<li class="z-${k.slice(0, 2)}"><span>${cnt(k)}</span><b>${E(z.tag)}</b><em>${E(z.said)}</em></li>`).join("")}</ul>
  ${H("이 지도에서 읽는 것", "이 학생의 칸 그대로")}${UL(mapRead(r), "x-ul")}
  <p class="src">${tag("GENERAL", "검사 응답")} 이 그림은 응답의 위치일 뿐 다른 학생과 견준 값이 아닙니다. 자세히 묻지 않은 영역은 경험이 없다는 뜻이 아닙니다.</p>`);
}
/** 열두 영역 지도를 칸 그대로 읽는 세 줄: 해 본 곳 · 관심은 높은데 아직인 곳 · 관심은 높은데 묻지 않은 곳 */
function mapRead(r: Report3): string[] {
  const nm = (xs: typeof r.map) => xs.map((m) => m.name).slice(0, 3).join(" · ");
  const did = r.map.filter((m) => (m.depth ?? -1) >= 2), hiLow = r.map.filter((m) => m.interest === "HIGH" && (m.depth === 0 || m.depth === 1)), hiUn = r.map.filter((m) => m.interest === "HIGH" && m.depth === null);
  const out: string[] = [];
  const noPick = did.filter((m) => { const d = r.domains.find((x) => x.code === m.code); return d && !(d.decisions.length + d.acts.length + d.artifacts.length + d.comparisons.length); });
  out.push(did.length ? `직접 해 봤다고 답한 영역은 ${nm(did)}입니다. 서류의 첫 근거는 이 칸에서 고릅니다.${noPick.length ? ` 다만 ${withJosa(nm(noPick), "은는")} 체크리스트에서 고른 근거 항목이 없어, 응답만으로는 서류에 쓸 장면이 아직 없습니다. 장면 하나를 골라 근거로 남기는 일이 먼저입니다.` : ""}` : "직접 해 봤다고 답한 영역은 아직 없습니다. 첫 근거는 실행 과제 1번에서 만듭니다.");
  if (hiLow.length) out.push(`${withJosa(nm(hiLow), "은는")} 관심은 높지만 해 본 일이 적다고 답했습니다. 짧은 과제 하나로 실제로 맞는 일인지 먼저 확인합니다.`);
  if (hiUn.length) out.push(`${withJosa(nm(hiUn), "은는")} 관심이 높은데 이번 검사에서 자세히 묻지 않았습니다. 해 본 장면이 있다면 경험 기록에 먼저 적어 두면 다음 검사에서 판단 질문을 받습니다.`);
  return out;
}

function g8(r: Report3): string {
  const ds = r.domains.filter(asked);
  const axes = ds[0]?.levels.map((l) => l.axis) ?? [];
  const pip = (lv: Level | null) => lv === null ? `<span class="mx-na">—</span>` : `<span class="pips l${lv}">${[1, 2, 3].map((k) => `<i class="${k <= lv ? "on" : ""}"></i>`).join("")}</span>`;
  return pg(r, 8, `${opener("02", "개인 역량", "영역마다 본 여덟 판단", "자세히 물은 영역마다 여덟 가지 판단을 어디까지 해 봤다고 답했는지 적었습니다. 줄표는 그 영역에서 묻지 않은 판단입니다.")}
  <table class="mx"><thead><tr><th></th>${axes.map((a) => `<th>${E(JUDGE[a].name)}</th>`).join("")}</tr></thead>
  <tbody>${ds.map((d) => `<tr><th>${E(d.name)}<span class="x-sub">${E(d.zoneTag)}</span></th>${d.levels.map((l) => `<td>${pip(l.level)}</td>`).join("")}</tr>`).join("")}</tbody></table>
  ${H("여덟 판단과 내 응답", "판단마다 직접 해 본 영역 · 아직인 영역")}
  <ol class="x-ax">${axes.map((a) => { const lv = (d: DomainRead) => d.levels.find((l) => l.axis === a)?.level ?? null; const ok = ds.filter((d) => (lv(d) ?? -1) >= 2).map((d) => d.name); const part = ds.filter((d) => lv(d) === 1).map((d) => d.name); const none = ds.filter((d) => lv(d) === 0).map((d) => d.name); const few = (xs: string[]) => xs.length > 3 ? `${xs.slice(0, 3).join(" · ")} 외 ${xs.length - 3}곳` : xs.join(" · ");
    const segs = [ok.length ? `직접 해 봄 — ${few(ok)}` : "", part.length ? `지시받아 해 봄 — ${few(part)}` : "", none.length ? `해 본 적 없음 — ${few(none)}` : ""].filter(Boolean);
    return `<li><b>${E(JUDGE[a].name)}</b><p>${E(JUDGE[a].plain)}</p><em class="${ok.length ? "x-ok" : "x-no"}">${E(segs.join(" · ") || "이 판단은 자세히 묻지 않음")}</em></li>`; }).join("")}</ol>
  <p class="src">눈금 하나 ${E(STEP[1].tag)} · 둘 ${E(STEP[2].tag)} · 셋 ${E(STEP[3].tag)}. ‘기준까지 직접 결정’ 은 응답과 체크리스트 근거가 함께 있을 때만 셉니다.</p>`);
}

function g11(r: Report3): Built {
  const ds = r.domains.filter((d) => d.zone === "Z2_EVIDENCE_INCOMPLETE" || d.zone === "Z3_EVIDENCE_LOW_INTEREST").slice(0, 3);
  if (!ds.length) return skip(11, "해 봤고 정리가 남은 영역(근거 일부·관심 낮음)이 응답에 없음");
  const card = (d: DomainRead) => {
    const gap = d.flow.filter((f) => f.cover === "none" || f.cover === "unasked").map((f) => f.name);
    const dv = d.develop[0];
    return `<article class="x-dm"><div class="x-dmh"><h2>${E(d.name)}</h2><span class="zt">${E(d.zoneTag)}</span></div><p class="x-hl">${E(d.headline)}</p>
    <div class="x-g3"><div><b>고른 근거</b>${UL([...d.decisions.slice(0, 2), ...d.acts.slice(0, 2)], "x-ul", nonePick)}</div>
    <div><b>아직 비어 있는 단계</b>${UL(gap.slice(0, 4), "x-ul", "없음")}</div>
    <div><b>다음에 할 일</b>${dv ? `<p>${E(dv.what)}</p><em>어떻게 — ${E(dv.how)} · 남길 것 ${E(dv.output)}</em>` : `<p class="none">—</p>`}${d.developNote ? `<p class="x-sm">${E(d.developNote)}</p>` : ""}</div></div></article>`;
  };
  return { n: 11, html: pg(r, 11, `${opener("02", "개인 역량", "해 봤고 정리가 남은 영역", "해 본 일은 응답으로 확인되지만, 그 일을 보여 줄 결과물이나 비교 기록이 아직 부족한 영역입니다.")}${ds.map(card).join("")}
  <p class="src">${tag("GENERAL", "검사 응답")} ‘다음에 할 일’ 은 그 영역 안의 일입니다. 목표 직무의 실행 전략에 넣은 것은 ‘역량 개발 우선순위’ 쪽에 따로 있습니다.</p>`) };
}

function g12(r: Report3): Built {
  const ds = r.domains.filter((d) => d.interest === "HIGH" && (d.zone === "Z4_INSUFFICIENT_EVIDENCE" || !asked(d))).slice(0, 3);
  if (!ds.length) return skip(12, "관심은 높고 아직 해 보지 않은 영역이 응답에 없음");
  const g = r.growth;
  // 영역마다 같은 해석 문장이면 한 번만 위에 적는다(같은 말을 세 번 되풀이하지 않는다)
  const sameMeaning = ds.length > 1 && !!ds[0].meaning[0] && ds.every((d) => d.meaning[0] === ds[0].meaning[0]);
  return { n: 12, html: pg(r, 12, `${opener("02", "개인 역량", "관심은 있고 아직 해 보지 않은 영역", "관심이 높게 나왔지만 스스로 맡아 해 본 일은 아직 적다고 답한 영역입니다. 지금은 잘하는 일을 찾기보다 처음 해 볼 일을 고르는 단계입니다.")}
  ${sameMeaning ? `<p class="interp">${E(ds[0].meaning[0])} ${tag("READ")}</p>` : ""}
  ${ds.map((d) => `<article class="x-dm"><div class="x-dmh"><h2>${E(d.name)}</h2><span class="zt">${E(d.zoneTag)}</span><span class="meta">${d.askedHow === "NONE" ? "이번에 자세히 묻지 않음" : "핵심 판단까지 물음"}</span></div>
    <p class="x-hl">${E(d.headline)}</p>${d.meaning[0] && !sameMeaning ? `<p>${E(d.meaning[0])}</p>` : ""}
    <div class="x-g2"><div><b>이 영역을 쓰는 직무</b>${UL(d.jobs.slice(0, 3).map((j) => `${j.name} — ${j.work}`))}</div><div><b>처음 해 볼 일</b>${d.develop[0] ? `<p><b>${E(d.develop[0].what)}</b> — ${E(d.develop[0].how)}</p><em>남길 것 — ${E(d.develop[0].output)} · 규모 — 수업 과제나 팀 과제 하나(2~4주)</em>` : `<p>${E(d.askedHow === "NONE" ? "이 영역의 판단은 이번에 묻지 않았습니다. 해 본 장면이 있다면 경험 기록에 먼저 적어 두고, 다음 검사에서 판단 질문을 받습니다." : "이 영역의 수업 과제 하나를 골라 그 안에서 무엇을 정해야 하는지 적어 봅니다.")}</p>`}</div></div></article>`).join("")}
  ${g ? `${H("첫 경험을 만드는 자리", `${g.role} 직무 일반`)}<div class="x-g2"><div>${UL(g.entry.slice(0, 4))}</div><div><ol class="x-ol">${g.learn.slice(0, 3).map((l) => `<li><b>${E(l.step)}</b> — ${E(l.why)}</li>`).join("")}</ol></div></div>` : ""}
  <p class="src">${tag("GENERAL")} 관심 응답은 그 일이 실제로 맞는지까지 말해 주지 않습니다. 직접 해 본 뒤에 다시 확인해야 합니다.</p>`) };
}

function g13(r: Report3): string {
  const ds = r.domains;
  const deep = ds.filter((d) => d.askedHow === "DEEP").length, probe = ds.filter((d) => d.askedHow === "PROBE").length;
  const kinds = Object.entries(r.cross.reduce((a, c) => ({ ...a, [c.kind]: (a[c.kind] ?? 0) + 1 }), {} as Record<string, number>));
  return pg(r, 13, `${opener("02", "개인 역량", "응답을 어떻게 읽었나", "이 보고서가 어떤 응답을 어떤 규칙으로 읽었는지 적었습니다. 같은 응답이면 언제 다시 뽑아도 같은 내용이 나옵니다.")}
  <dl class="x-glance x-4">${[["여덟 판단을 모두 물은 영역", `${deep}개`], ["핵심 판단 넷만 물은 영역", `${probe}개`], ["체크리스트에서 고른 근거", `${r.profile.picks}개 · 결과물 ${r.profile.artifacts}개`], ["함께 읽은 경험 기록", `${r.records.length}건`]].map(([a, b]) => `<div><dt>${E(a)}</dt><dd>${E(b)}</dd></div>`).join("")}</dl>
  ${H("판단의 단계를 정한 규칙")}<ol class="x-ol">${([0, 1, 2, 3] as Level[]).map((l) => `<li><b>${E(STEP[l].tag)}</b> — ${E(STEP[l].said)}</li>`).join("")}</ol>
  <p class="x-sm">‘기준까지 직접 결정’ 은 질문에 그렇게 답한 것만으로 세우지 않습니다. 같은 판단의 체크리스트 문장을 함께 골랐을 때만 셋째 단계로 둡니다.</p>
  ${H("응답을 읽을 때 주의한 점")}${r.profile.caution ? `<p class="interp">${E(r.profile.caution)}</p>` : `<p>응답과 고른 근거가 서로 어긋나는 자리는 크게 나오지 않았습니다.</p>`}
  ${r.verify ? `<p>${E(r.verify.lead)}</p>${TB(["영역", "응답", "고른 근거", "스스로 확인할 일"], r.verify.items.slice(0, 4).map((x) => [E(x.domain), E(x.said), E(x.picked), E(x.task)]))}` : ""}
  ${kinds.length ? `${H("검사 응답과 경험 기록의 겹침")}<ul class="x-zc">${kinds.map(([k, v]) => `<li><span>${v}</span><b>${E(CROSS_TAG[k as keyof typeof CROSS_TAG])}</b></li>`).join("")}</ul>` : ""}
  <p class="src">${E(r.profile.evidenceLine)}</p>`);
}

function g14(r: Report3): Built {
  const st = r.strengths.slice(0, 3);
  if (!st.length) return skip(14, "스스로 해 본 판단이 확인된 영역이 없어 강점 활용 전략을 세울 근거가 응답에 없음");
  return { n: 14, html: pg(r, 14, `${opener("02", "개인 역량", "강점 활용 전략", "스스로 해 본 판단이 확인된 영역을, 서류와 면접에서 어떻게 보여 줄지까지 이어 적었습니다.")}
  ${st.map((s, i) => `<article class="x-dm"><div class="x-dmh"><span class="st-n">${i + 1}</span><h2>${E(s.name)}</h2><span class="zt">${E(ZONE_SAID[s.zone]?.tag ?? "")}</span></div>
    <p class="x-hl">${E(s.story)}</p>
    <div class="x-g3"><div><b>어떻게 보여 줄까</b><p>${E(s.show)}</p></div><div><b>다음에 더할 것</b><p>${E(s.next)}</p></div><div><b>받을 질문</b><p class="x-q">${E(s.question)}</p></div></div>
    <p class="x-sm">이 경험이 쓰이는 직무 — ${E(s.jobs.join(" · ") || "—")}${s.industryLines.length ? ` · 산업 장면 — ${E(s.industryLines.slice(0, 2).join(" · "))}` : ""}</p></article>`).join("")}
  <p class="src">${tag("GENERAL", "검사 응답")} 강점은 다른 학생과 견준 순위가 아니라, 이 학생이 스스로 해 봤다고 답하고 근거를 고른 자리입니다.</p>`) };
}

function g15(r: Report3): Built {
  const pr = r.priorities.slice(0, 4);
  if (!pr.length) return skip(15, "목표 직무 기준으로 먼저 채울 판단이 응답에서 잡히지 않음");
  const role = r.strategy.roleName;
  return { n: 15, html: pg(r, 15, `${opener("02", "역량 개발 우선순위", `${withJosa(role, "을를")} 향한 실행 과제`, `목표로 고른 ${role}에서 거꾸로 세운 과제입니다. 모두 ${role}의 업무 영역이나 핵심 판단에서 골랐습니다.`)}
  ${pr.map((x) => `<article class="x-pr"><div class="x-prn">${x.order}</div><div>
    <div class="x-prh"><span class="rel">${E(x.relationTag)}</span><span class="meta">${E(x.domain)} · 판단: ${E(x.what)}</span></div>
    <h2>${E(x.title)}</h2><p>${E(x.link.replace(/([^.?!])$/, "$1."))} <span class="x-now">지금 응답 — ${E(x.chain.result.replace(`${x.domain} · `, ""))}</span></p>
    <ol class="x-chain x-c3"><li><span>할 일</span>${E(x.todo)}</li><li><span>남길 것</span>${E(x.output)}</li><li><span>확인</span>${E(x.check)}</li></ol>
    <p class="x-sm">어디서 · 언제 — ${E(x.where || "수업·팀 과제")} · ${E(x.when)}${x.ask ? " · 면접 질문은 ‘면접 질문 ② 빈자리에서’ 쪽에" : ""}</p></div></article>`).join("")}
  <p class="src">${tag("READ", "추천 전략")} ${tag("GENERAL", "검사 응답 + 직무 일반")} 과제 문장은 ${E(role)} 직무 안내(검토 전)의 말로 적었습니다. 목표 직무 밖의 빈자리는 ‘이번 전략에서 뺀 것’ 쪽에 있습니다.</p>`) };
}

/* ── 3부 Evidence ──────────────────────────────────────────────── */

const pickDomains = (r: Report3) => r.domains.filter((d) => asked(d) && (d.decisions.length + d.acts.length + d.artifacts.length + d.comparisons.length));

function g16(r: Report3): Built {
  const ds = pickDomains(r).filter((d) => d.decisions.length + d.acts.length);
  if (!ds.length) return skip(16, "체크리스트에서 고른 ‘직접 정한 것 · 해 본 일’ 이 없음");
  return { n: 16, html: pg(r, 16, `${opener("03", "Evidence", "근거 원장 ① 직접 정한 것 · 해 본 일", "학생이 체크리스트에서 직접 고른 문장을 영역마다 그대로 옮겼습니다. 이 보고서의 판단은 모두 이 원장에서 출발합니다.")}
  ${TB(["영역", "직접 정한 것", "해 본 일"], ds.map((d) => [`<b>${E(d.name)}</b><span class="x-sub">${E(d.zoneTag)}</span>`, UL(d.decisions, "x-ul", nonePick), UL(d.acts, "x-ul", nonePick)]), "x-ledger")}
  <p class="src">${tag("GENERAL", "검사 응답")} 문장은 바꿔 쓰지 않았습니다. 고르지 않은 칸은 해 본 적이 없다는 뜻이 아니라 이번에 고르지 않았다는 뜻입니다.</p>`) };
}
function g17(r: Report3): Built {
  const ds = pickDomains(r);
  if (!ds.length) return skip(17, "체크리스트에서 고른 근거가 없음");
  const lad = (d: DomainRead) => [["해 본 일", d.acts.length], ["직접 정한 것", d.decisions.length], ["남긴 결과물", d.artifacts.length], ["비교한 대상", d.comparisons.length]] as [string, number][];
  return { n: 17, html: pg(r, 17, `${opener("03", "Evidence", "근거 원장 ② 결과물 · 비교 대상과 증거 사다리", "남긴 결과물과 결과를 견준 대상을 옮기고, 영역마다 근거가 사다리의 어디까지 올라왔는지 셌습니다.")}
  ${TB(["영역", "남긴 결과물", "비교한 대상"], ds.map((d) => [`<b>${E(d.name)}</b>`, UL(d.artifacts, "x-ul", nonePick), UL(d.comparisons, "x-ul", nonePick)]), "x-ledger")}
  ${H("증거 사다리", "해 본 일 → 직접 정한 것 → 결과물 → 비교 · 고른 개수")}
  <div class="x-lad">${ds.map((d) => `<div><b>${E(d.name)}</b><ol>${lad(d).map(([t, v]) => `<li class="${v ? "on" : ""}"><span>${v}</span>${E(t)}</li>`).join("")}</ol></div>`).join("")}</div>
  <p class="src">${tag("GENERAL", "검사 응답")} 사다리는 위로 갈수록 서류에서 증명하기 쉬운 근거입니다. 개수는 점수가 아니며 영역끼리 더하지 않았습니다.</p>`) };
}

function recCard(x: Report3["records"][number]): string {
  return `<article class="rec x-rec"><h4>${E(x.kind)} · ${E(x.period)}</h4><b>${E(x.title)}</b><span>${E(x.domains.join(" · "))}${x.usedWhere.length ? ` · ${E(x.usedWhere.join(", "))}` : ""}</span>
  <dl><div><dt>목적</dt><dd>${E(x.purpose || "적지 않음")}</dd></div><div><dt>맡은 역할</dt><dd>${E(x.role || "적지 않음")}</dd></div><div><dt>직접 정한 것</dt><dd>${E(x.decisions.join(" · ") || "적지 않음")}</dd></div>
  <div><dt>남은 결과물</dt><dd>${E(x.artifacts.join(" · ") || "적지 않음")}</dd></div><div><dt>비교한 것</dt><dd>${E(x.comparisons.join(" · ") || "적지 않음")}</dd></div></dl></article>`;
}
function g18(r: Report3): Built {
  const both = r.cross.filter((c) => c.kind === "BOTH");
  if (!r.records.length) return skip(18, "경험 기록이 없음");
  if (!both.length) return skip(18, "검사 응답과 경험 기록이 같은 영역을 가리키는 자리가 없음");
  const recs = r.records.filter((x) => both.some((b) => x.domains.includes(b.name))).slice(0, 2);
  return { n: 18, html: pg(r, 18, `${opener("03", "Evidence", "경험 기록과 응답 ① 같은 곳을 가리키는 기록", "학생이 적은 경험 기록과 검사 응답이 같은 영역을 가리키는 자리입니다. 두 자료가 겹치는 경험은 서류에서 가장 먼저 쓸 수 있습니다.")}
  ${TB(["영역", "검사 응답", "경험 기록", "읽는 법"], both.map((c) => [`<b>${E(c.name)}</b>`, E(c.test), E(c.record), E(c.reading)]))}
  <div class="x-g2">${recs.map(recCard).join("")}</div>
  ${recs.map((x) => x.testSays.length ? `<p class="x-sm"><b>${E(x.title)}</b> — 검사에서는 ${E(x.testSays.map((t) => `${t.domain}: ${t.text}`).join(" · "))}</p>` : "").join("")}
  <p class="src">${tag("GENERAL", "학생 기록 + 검사 응답")} 경험 기록은 학생이 직접 적은 자기보고이며, 이 보고서가 사실을 따로 확인하지 않았습니다.</p>`) };
}
function g19(r: Report3): Built {
  const rows = r.cross.filter((c) => c.kind !== "BOTH");
  if (!rows.length) return skip(19, "검사 응답과 경험 기록이 엇갈리는 자리가 없음");
  return { n: 19, html: pg(r, 19, `${opener("03", "Evidence", "경험 기록과 응답 ② 서로 다른 곳", "응답에만 있거나, 기록에만 있거나, 응답은 높은데 고른 근거가 없는 자리입니다. 어느 쪽이 틀렸다는 뜻이 아니라 확인할 거리입니다.")}
  ${TB(["영역", "겹침", "검사 응답", "경험 기록", "확인할 일"], rows.slice(0, 7).map((c) => [`<b>${E(c.name)}</b>`, `<span class="js">${E(CROSS_TAG[c.kind])}</span>`, E(c.test), E(c.record), E(c.verify)]))}
  ${r.verify ? `${H("스스로 확인하는 차례")}<ol class="x-ol">${r.verify.steps.map((s) => `<li>${E(s)}</li>`).join("")}</ol>` : ""}
  <p class="src">${tag("READ")} 엇갈림은 응답을 고치라는 뜻이 아닙니다. 다음 경험 기록에서 그 자리를 채우면 같은 기준으로 다시 읽을 수 있습니다.</p>`) };
}

function g20(r: Report3): Built {
  const ds = pickDomains(r).slice(0, 4);
  if (!ds.length) return skip(20, "체크리스트에서 고른 근거가 없어 행동에서 결과물까지 이을 재료가 없음");
  const step = (t: string | undefined) => t ? `<p>${E(t)}</p>` : `<p class="none">아직 고르지 않음</p>`;
  const lack = ds.map((d) => !d.artifacts.length ? "결과물" : !d.comparisons.length ? "비교 대상" : "").filter(Boolean);
  return { n: 20, html: pg(r, 20, `${opener("03", "Evidence", "행동에서 결과물까지", "영역마다 해 본 일 → 직접 정한 것 → 남긴 결과물 → 결과를 견준 대상을 한 줄로 이었습니다. 끊긴 칸이 다음에 채울 자리입니다.")}
  ${ds.map((d) => `<div class="x-flow"><b>${E(d.name)}</b><ol><li><span>해 본 일</span>${step(d.acts[0])}</li><li><span>직접 정한 것</span>${step(d.decisions[0])}</li><li><span>남긴 결과물</span>${step(d.artifacts[0])}</li><li><span>비교한 대상</span>${step(d.comparisons[0])}</li></ol></div>`).join("")}
  <p class="interp">${E(lack.length ? `${lack.filter((x, i, xs) => xs.indexOf(x) === i).join("과 ")} 칸이 끊긴 영역이 있습니다. 서류에서는 ‘무엇을 정했고 무엇을 남겼고 무엇과 비교했나’ 가 이어질 때 한 문단이 됩니다.` : "네 칸이 모두 이어진 영역이 있습니다. 이 줄이 자기소개서 한 문단의 뼈대가 됩니다.")} ${tag("READ")}</p>
  <p class="src">${tag("GENERAL", "검사 응답")} 칸마다 첫 문장만 옮겼습니다. 전체 문장은 근거 원장 쪽에 있습니다.</p>`) };
}

function g21(r: Report3): Built {
  const rs = r.records.filter((x) => x.check.length);
  if (!rs.length) return skip(21, r.records.length ? "경험 기록에 빈칸이 없음" : "경험 기록이 없음");
  return { n: 21, html: pg(r, 21, `${opener("03", "Evidence", "아직 말로 옮기지 않은 경험", "학생이 적은 경험 기록 가운데 아직 비어 있는 칸입니다. 이 칸이 차야 그 경험을 면접에서 장면으로 말할 수 있습니다.")}
  ${rs.slice(0, 3).map((x) => `<article class="x-dm"><div class="x-dmh"><h2>${E(x.title)}</h2><span class="meta">${E(x.kind)} · ${E(x.period)}</span></div>
    <div class="x-g2"><div><b>비어 있는 칸</b>${UL(x.check)}</div><div><b>이 경험이 이어지는 직무</b>${UL(x.jobs.slice(0, 3).map((j) => `${j.name} — ${j.why}`))}</div></div>
    ${x.problems.length ? `<p class="x-sm">기록에 적은 문제 — ${E(x.problems.join(" · "))}</p>` : ""}<p class="interp">${E(x.application)} ${tag("READ")}</p></article>`).join("")}
  <p class="src">${tag("GENERAL", "학생 기록")} 빈칸은 내 CareerMatri의 ‘경험 고치기’ 에서 채울 수 있습니다. 채운 뒤에도 이 보고서의 검사 결과는 바뀌지 않습니다.</p>`) };
}

function g22(r: Report3): Built {
  const gd = r.directions.find((d) => d.goal) ?? r.directions[0];
  if (!gd) return skip(22, "목표 직무가 응답에 없음");
  return { n: 22, html: pg(r, 22, `${opener("03", "Evidence", "빈자리 지도 ① 목표 직무 기준", `${gd.name}의 핵심 판단과 업무 영역에 지금 응답을 대어, 확인된 것과 아직 확인되지 않은 것을 갈랐습니다.`)}
  <div class="x-g2"><div>${H("응답에서 확인된 것", `${gd.have.length}가지`)}${UL(gd.have.map((h) => `${h.domain} — ${h.text}`), "x-ul x-have")}</div>
  <div>${H("아직 확인되지 않은 것", `${gd.need.length}가지`)}${gd.need.length ? `<ul class="x-ul x-need">${gd.need.map((n) => `<li><b>${E(n.name)}</b> — ${E(n.why)}</li>`).join("")}</ul>` : `<p class="none">없음</p>`}</div></div>
  ${H("빈자리에서 세운 과제", "실행 전략")}${TB(["순서", "빈자리", "과제", "남길 것"], r.priorities.slice(0, 5).map((p) => [String(p.order), E(`${p.domain} · ${p.what}`), E(p.title), E(p.output)]))}
  <p class="src">${tag("GENERAL", "검사 응답 + 직무 일반")} 확인되지 않았다는 것은 할 수 없다는 뜻이 아니라, 이번 응답에서 그 장면이 나오지 않았다는 뜻입니다.</p>`) };
}
function g23(r: Report3): Built {
  const os = r.strategy.outside;
  if (!os.length) return skip(23, "목표 직무 밖에서 남는 빈자리가 없음");
  return { n: 23, html: pg(r, 23, `${opener("03", "Evidence", "빈자리 지도 ② 이번 전략에서 뺀 것", `아래는 아직 응답에서 확인되지 않았지만 ${r.strategy.roleName}의 업무 영역이 아니어서 이번 실행 전략에 넣지 않은 판단입니다.`)}
  ${TB(["영역", "비어 있는 판단", "참고", "이 영역을 쓰는 직무"], os.map((o) => [`<b>${E(o.domain)}</b>`, E(o.what), E(o.note), E(o.jobs.join(" · ") || "—")]))}
  <p class="interp">목표 직무를 바꾸거나 둘째로 볼 직무를 함께 준비할 때 이 표에서 과제를 고르면 됩니다. 한 번에 모든 빈자리를 채우려 하면 목표 직무의 과제가 밀립니다. ${tag("READ")}</p>`) };
}
function g24(r: Report3): string {
  const can = r.domains.filter((d) => d.zone === "Z1_EVIDENCE_ESTABLISHED" || d.zone === "Z2_EVIDENCE_INCOMPLETE").map((d) => `${d.name} — ${d.headline}`);
  const lim = [...new Set(r.domains.flatMap((d) => d.limits))].slice(0, 6);
  return pg(r, 24, `${opener("03", "Evidence", "지금 말할 수 있는 범위", "이 결과로 지금 말할 수 있는 것과, 아직 말할 수 없는 것을 갈랐습니다. 서류와 면접에서 이 선을 넘지 않는 것이 신뢰를 지킵니다.")}
  <div class="x-g2"><div>${H("지금 말할 수 있는 것")}${UL(can, "x-ul x-have", "응답에서 직접 판단한 경험이 아직 확인되지 않았습니다. 관심이 높은 영역을 말할 수 있습니다.")}</div>
  <div>${H("아직 말할 수 없는 것")}${UL(lim, "x-ul x-need")}</div></div>
  ${H("이 검사가 확인하지 않은 것")}<ul class="lim">${["결과물의 완성도와 실제 성과 수치", "함께 일한 사람들의 평가", "다른 학생과 견준 순위·점수", "특정 기업의 채용 가능성"].map((t) => `<li>${E(t)}</li>`).join("")}</ul>
  <p class="src">${tag("READ")} 서류에 수치를 쓸 때는 학생이 직접 가진 기록(보고서·성적표·결과물)에서 가져와야 하고, 이 보고서에서 가져오지 않습니다.</p>`);
}

/* ── 4부 전공 직무 심층 ─────────────────────────────────────────── */

function g26(r: Report3): string {
  const ds = r.directions.slice(0, 4);
  return pg(r, 26, `${opener("04", "전공 직무 심층", "직무 간 차이: 같은 판단, 다른 결과물", "경영 직무는 비슷한 판단을 쓰지만 맡는 일과 남기는 결과물이 다릅니다. 이 학생이 함께 본 직무를 나란히 놓았습니다.")}
  ${TB(["직무", "맡는 것", "직접 정하는 것", "남기는 결과물", "다른 직무와 다른 점"], ds.map((d) => [`<b>${E(d.name)}</b>${d.goal ? ' <span class="js">목표</span>' : ""}`, E(d.owns), UL(d.decides.slice(0, 3)), UL(d.material.slice(0, 3)), UL(d.differs.slice(0, 2))]))}
  <p class="src">${tag("GENERAL")} 직무 일반 안내입니다(특정 기업의 직무기술서가 아님). 현직자 검토 전 초안입니다.</p>${""}`);
}

function guidePages(r: Report3, lib: Lib, n: number, code: string | undefined, label: string, first: boolean): Built {
  const g = code ? roleGuide(code) : null;
  if (!g || !code) return skip(n, "직무 안내 자료가 없음");
  const name = roleName(code);
  const dir = r.directions.find((d) => d.code === code);
  if (first) return { n, html: pg(r, n, `${opener("04", label, `${name} — 하는 일과 차례`, g.summary)}
  <div class="x-g2"><div>${H("맡는 일")}${UL(g.responsibilities.slice(0, 5))}${H("익힐 지식")}${UL(g.knowledge.slice(0, 4))}</div>
  <div>${H("일의 차례")}<ol class="jflow">${g.process.slice(0, 6).map((p, i) => `<li><span>${i + 1}</span><div><b>${E(p.step)}</b> — ${E(p.what)}</div></li>`).join("")}</ol>${H("쓰는 도구")}${UL(g.tools.slice(0, 4))}</div></div>
  ${dir ? `${H("내 응답과 맞물리는 곳", dir.readiness)}<div class="x-g2"><div>${UL(dir.have.map((h) => `${h.domain} — ${h.text}`), "x-ul x-have", "아직 확인된 판단 없음")}</div><div>${UL(dir.need.map((x) => `${x.name} — ${x.why}`), "x-ul x-need", "없음")}</div></div>` : ""}
  <p class="src">${tag("GENERAL")} 직무 일반 안내(검토 전)입니다. ${E(g.watch)}</p>${gapsOf(lib, n)}`) };
  return { n, html: pg(r, n, `${opener("04", label, `${name} — 첫 실무 과제`, `${name}의 일을 학교 안에서 처음 해 볼 수 있게 과제 하나와 그 앞뒤를 적었습니다.`)}
  <article class="x-pj"><span class="tagx">첫 프로젝트</span><h2>${E(g.firstProject.title)}</h2><p>${E(g.firstProject.goal)}</p>
  <ol class="pj-s">${g.firstProject.steps.map((s) => `<li>${E(s)}</li>`).join("")}</ol><p class="x-sm">남길 것 — ${E(g.firstProject.output)} · 확인 — ${E(g.firstProject.check)}</p></article>
  <div class="x-g2"><div>${H("배우는 차례")}<ol class="x-ol">${g.learnOrder.slice(0, 4).map((l) => `<li><b>${E(l.step)}</b> — ${E(l.why)}</li>`).join("")}</ol></div>
  <div>${H("경험을 만드는 자리")}${UL(g.entry.slice(0, 4))}${H("면접에서 묻는 것")}<ul class="qs x-ul">${g.interview.slice(0, 2).map((q) => `<li>“${E(q.q)}”</li>`).join("")}</ul></div></div>
  ${dir ? `${H(`이 과제와 내 응답`, `${name} · ${dir.readiness}`)}<div class="x-g2"><div><b>가져올 내 근거</b>${UL(dir.have.slice(0, 2).map((h) => `${h.domain} — ${h.text}`), "x-ul x-have", "아직 확인된 판단이 없어 이 과제가 첫 근거가 됩니다")}</div><div><b>이 과제로 채울 판단</b>${UL(dir.need.slice(0, 2).map((x) => x.name), "x-ul x-need", "없음")}</div></div>` : ""}
  <p class="src">${tag("GENERAL")} 직무 일반 안내(검토 전)입니다. 특정 기업의 요건이 아닙니다.</p>${gapsOf(lib, n)}`) };
}

/** 사업보고서 읽기 쪽 아래: 이 학생이 깊게 본 기업마다 읽을 원문이 있는지(공시 접수번호 · 공시 개황만 · 공시 없음) */
function mine28(r: Report3, lib: Lib): string {
  const rows = r.companies.map((c) => { const d = dartOf(lib, c.id); const rep = d?.annual_reports?.[0];
    return [`<b>${E(c.name)}</b>`, rep ? `${E(rep.report)} <span class="meta">· 접수번호 ${E(rep.rcept_no)}</span>` : E(d?.dart ? "공시 개황만 있음 — 사업보고서 의무 없음" : "공시 없음 — 회사 소개·보도로 대신"), rep ? tag("OFFICIAL_DIRECT") : tag(d?.dart ? "OFFICIAL_DIRECT" : "UNVERIFIED", d?.dart ? "개황" : undefined)]; });
  return `${H("내가 깊게 본 기업에서 읽을 원문", `${rows.length}곳 · 같은 네 단계로`)}${TB(["기업", "읽을 원문", "확인 수준"], rows)}`;
}
function g30(r: Report3, lib: Lib): Built {
  const code = r.strategy.roleCode ?? r.directions[0]?.code;
  const g = code ? roleGuide(code) : null;
  if (!g || !code) return skip(30, "목표 직무 안내 자료가 없음");
  const prac = Object.entries(g.practice).slice(0, 5);
  return { n: 30, html: pg(r, 30, `${opener("04", "목표 직무 실무 가이드 ④", `${roleName(code)} — 결과물로 옮기는 법`, `${roleName(code)}의 판단을 어떤 결과물로 남기는지, 그 결과물을 무엇으로 확인하는지를 판단마다 적었습니다.`)}
  ${TB(["판단", "과제", "남길 것", "확인 질문"], prac.map(([ax, p]) => [`<b>${E(JUDGE[ax as keyof typeof JUDGE]?.name ?? ax)}</b>`, E(p.task), E(p.output), E(p.check)]))}
  <div class="x-g2"><div>${H("포트폴리오로 쓰는 결과물")}${UL(g.portfolio.slice(0, 5))}</div><div>${H("공고에서 확인할 것")}${UL(g.postingCheck.slice(0, 5))}</div></div>
  <p class="src">${tag("GENERAL")} 직무 일반 안내(검토 전) · 특정 기업의 요건이 아닙니다.</p>${gapsOf(lib, 30)}`) };
}

function g29(r: Report3, lib: Lib): Built {
  const listed = lib.dart.orgs.filter((o) => o.financials && pick(o.financials));
  if (!listed.length) return skip(29, "공시 재무가 있는 회사가 자료에 없음");
  const mine = new Set(r.companies.map((c) => c.id));
  const ord = [...listed].sort((a, b) => Number(mine.has(b.id)) - Number(mine.has(a.id)));
  const sgn = (o: (typeof listed)[number]) => { const v = pick(o.financials!)!.v; return `${(v["영업이익"] ?? 0) < 0 ? "-" : "+"}${(v["당기순이익"] ?? 0) < 0 ? "-" : "+"}`; };
  const a = ord[0], b = ord.find((x) => sgn(x) !== sgn(a)) ?? ord[1];
  const ex = [a, b].filter(Boolean).map((o) => {
    const f = pick(o.financials!)!; const rev = f.v["매출액"], op = f.v["영업이익"], ni = f.v["당기순이익"];
    return `<article class="x-fin"><h2>${E(o.name)}</h2><p class="x-sm">${E(o.financials!.year)} 사업보고서 · ${E(f.kind)} · 원 단위 공시값을 억 원으로 나눔</p>
    <dl><div><dt>매출액</dt><dd>${eok(rev)}억</dd></div><div><dt>영업이익</dt><dd>${eok(op)}억</dd></div><div><dt>당기순이익</dt><dd>${eok(ni)}억</dd></div>
    <div><dt>영업이익률</dt><dd>${rev && op !== undefined ? ((100 * op) / rev).toFixed(1) : "—"}%</dd></div><div><dt>순이익률</dt><dd>${rev && ni !== undefined ? ((100 * ni) / rev).toFixed(1) : "—"}%</dd></div></dl>
    <p>${E(readSigns(op, ni))}</p></article>`;
  }).join("");
  return { n: 29, html: pg(r, 29, `${opener("04", "목표 직무 실무 가이드 ③", "재무제표와 지표 읽기", "공시 숫자 셋으로 비율 둘을 직접 계산하고, 손익의 부호가 무엇을 묻게 하는지 두 회사로 견주었습니다.")}
  <div class="x-g2">${ex}</div>
  ${H("계산하는 법", "리포트가 계산 · 공시 두 값으로만")}<ol class="x-ol"><li><b>영업이익률</b> — 영업이익 ÷ 매출액 × 100. 본업으로 남긴 몫입니다.</li><li><b>순이익률</b> — 당기순이익 ÷ 매출액 × 100. 본업 밖 손익까지 더한 몫입니다.</li><li><b>둘이 다를 때</b> — 차이는 영업외손익·법인세에서 납니다. 같은 보고서의 주석에서 확인합니다.</li></ol>
  ${(() => { const myL = r.companies.filter((c) => listed.some((o) => o.id === c.id)); const myU = r.companies.filter((c) => !listed.some((o) => o.id === c.id));
    const rows = ["TD04", "TD05", "TD08"].map((code) => r.map.find((m) => m.code === code)).filter((m): m is NonNullable<typeof m> => !!m);
    return `${H("내 응답에서 이 숫자가 걸리는 자리", `${r.strategy.roleName} 기준`)}<ul class="x-ul">${rows.map((m) => `<li><b>${E(m.name)}</b> — ${E(m.depth === null ? `이번에 자세히 묻지 않음${m.interest === "HIGH" ? " · 관심은 높음" : ""}` : `${lvWord(m.depth)} · ${ZONE_SAID[m.zone as keyof typeof ZONE_SAID]?.tag ?? ""}`)}</li>`).join("")}</ul>
    ${H("직접 해 볼 것")}<p>${E(myL.length ? `깊게 본 기업 가운데 상장사인 ${myL.map((c) => c.name).join(" · ")}에서 같은 두 비율을 계산하고, 지난해 값과 견준 한 줄을 남깁니다. 지난해 값은 같은 사업보고서의 비교 칸에 있습니다.` : `깊게 본 기업에 공시 재무가 있는 상장사가 없습니다. 위 두 회사로 계산을 연습하고, ${withJosa(myU.map((c) => c.name).slice(0, 2).join(" · ") || "비상장 후보", "은는")} 공시 개황과 회사 소개까지만 확인합니다.`)}${myU.length && myL.length ? ` ${E(`${withJosa(myU.map((c) => c.name).slice(0, 2).join(" · "), "은는")} 공시 재무가 없어 이 계산을 할 수 없습니다.`)}` : ""}</p>`; })()}
  <p class="src">${tag("OFFICIAL_DIRECT")} 숫자는 OpenDART 주요 계정(${E(lib.dart.checked_on)}) · ${tag("GENERAL", "읽는 법")} 설명은 리포트 안내 초안(검토 전)입니다. 투자 판단이 아닙니다.</p>${gapsOf(lib, 29)}`) };
}

function g33(r: Report3, n: number, part: 1 | 2, lib: Lib): Built {
  const used = new Set(r.directions.slice(0, 2).map((d) => d.code));
  const rest = ROLE_ORDER.filter((k) => !used.has(k) && roleGuide(k));
  const xs = part === 1 ? rest.slice(0, 3) : rest.slice(3, 6);
  if (!xs.length) return skip(n, "더 볼 직무 안내가 없음");
  const body = xs.map((k) => { const g = roleGuide(k)!; return `<article class="x-dm"><div class="x-dmh"><h2>${E(roleName(k))}</h2></div><p>${E(g.summary)}</p>
    <div class="x-g3"><div><b>맡는 일</b>${UL(g.responsibilities.slice(0, 3))}</div><div><b>남기는 결과물</b>${UL(g.portfolio.slice(0, 3))}</div><div><b>경험을 만드는 자리</b>${UL(g.entry.slice(0, 2))}</div></div></article>`; }).join("");
  const cur = part === 2 ? `${H("학과 수업과 이어지는 자리")}${miss(lib, ["R1"], "배재대학교 경영학과의 공식 교육과정표를 이 작업 환경에서 열지 못했습니다. 확인되지 않은 과목 이름을 만들지 않으려고 이 칸을 비워 둡니다. 교육과정표를 확보하면 직무마다 이어지는 과목과 학년을 여기에 적습니다.")}` : "";
  return { n, html: pg(r, n, `${opener("04", `나머지 직무 개관 ${part === 1 ? "①" : "②"}`, "그 밖의 경영 직무", "목표와 둘째로 본 직무 밖의 경영 직무를 짧게 적었습니다. 방향을 넓힐 때 읽습니다.")}${body}${cur}
  <p class="src">${tag("GENERAL")} 직무 일반 안내(검토 전)입니다.</p>${gapsOf(lib, n)}`) };
}

/* ── 5부 지역 산업 ─────────────────────────────────────────────── */

/** 산업 구조도 아래 한 줄: 이 학생의 목표 직무와 깊게 본 기업이 구조도의 어느 줄에 있는가 */
function mine36(r: Report3, lib: Lib): string {
  const cs = r.companies.map((c) => { const o = lib.orgs.orgs.find((x) => x.id === c.id); return `${c.name.replace(/\s—.*$/, "")} — ${(o?.industry_line ?? c.headline).split(/[·,(]/)[0].trim()}`; });
  return `<div class="x-mine"><b>내 자리</b><span>목표 직무 <em>${E(r.strategy.roleName)}</em></span><span>깊게 본 기업 ${cs.length}곳 — ${E(cs.join(" / ") || "없음")}</span></div>`;
}

function g35(r: Report3, lib: Lib): string {
  const facts = lib.orgs.region_facts;
  return pg(r, 35, `${opener("05", "지역 산업", "대전·세종·충청권 경제 구조", "공식 통계를 이 환경에서 받지 못해, 보도로 확인한 사실만 출처와 함께 옮기고 통계 칸은 비워 두었습니다.")}
  ${H("보도로 확인한 사실", "검색 결과 · 줄마다 출처")}${TB(["지역", "내용", "출처"], facts.map((f) => [E(REGION_KO[(f.region ?? "NATIONAL") as keyof typeof REGION_KO] ?? f.region ?? ""), E(f.text), `${E(f.source.title)}<span class="x-sub">${tag("SEARCH_ONLY")} ${E(f.source.checked_on)}</span>`]))}
  ${H("공식 통계로 채울 칸")}<table class="x-tb x-blank"><thead><tr><th>지역</th><th>산업별 사업체 수</th><th>종사자 수</th><th>지역내총생산(GRDP)</th></tr></thead><tbody>${["대전", "세종", "충남", "충북"].map((x) => `<tr><td><b>${x}</b></td><td>확인 필요 · R2</td><td>확인 필요 · R2</td><td>확인 필요 · R3</td></tr>`).join("")}</tbody></table>
  ${miss(lib, ["R2", "R3"], "보도에 실린 숫자(예: 유성구 비중)는 공식 통계와 기준 연도가 다를 수 있어 표의 숫자로 옮기지 않았습니다.")}`);
}

function g39(r: Report3, lib: Lib): Built {
  const os = lib.orgs.orgs.filter((o) => o.region === "CHUNGNAM" || o.region === "CHUNGBUK" || o.id === "KR-DJ-JEIOTECH");
  if (!os.length) return skip(39, "충남·충북 기업 자료가 없음");
  const rows = os.map((o) => {
    const d = dartOf(lib, o.id);
    const conf = d?.compare?.hq_region === "DIFFERENT_SIDO";
    return [`<b>${E(o.name)}</b><span class="x-sub">${E(REGION_KO[o.region as keyof typeof REGION_KO] ?? o.region)} · 리포트 자료</span>`, E(o.industry_line),
      d?.dart ? `${E(d.dart.adres)}<span class="x-sub">${tag(conf ? "CONFLICTING" : "OFFICIAL_DIRECT", conf ? "자료와 공시 본점 다름" : "공시 개황")}</span>` : `<span class="none">공시 개황 없음</span>`,
      E(d?.dart?.corp_cls ?? "—"), E(o.jobs.map((j) => roleName(j.role)).join(" · "))];
  });
  return { n: 39, html: pg(r, 39, `${opener("05", "지역 산업", "충남·충북: 본점과 사업장", "충청권 기업은 본점과 실제 사업장이 다른 경우가 많습니다. 리포트 자료의 지역과 공시 개황의 본점 주소를 나란히 놓았습니다.")}
  ${TB(["기업", "하는 일", "공시 본점", "공시 구분", "자료에서 본 경영 직무"], rows)}
  <p class="interp">공시의 본점은 법인 등기상의 주소이고, 학생이 일하게 될 사업장과 다를 수 있습니다. 근무지는 채용 공고 원문에서 따로 확인해야 하며 이 보고서는 근무지를 적지 않습니다. ${tag("READ")}</p>
  <p class="src">${tag("OFFICIAL_DIRECT")} 본점 주소는 OpenDART 기업개황(${E(lib.dart.checked_on)}) · 업종과 직무는 리포트 자료(검토용) · 채용 여부는 확인하지 않았습니다.</p>`) };
}

/* ── 6부 기업 분석 ─────────────────────────────────────────────── */

/* 후보마다 같은 목표 산업·목표 직무 이름을 되풀이하지 않는다: 이름은 쪽 위에 한 번 적고, 줄에는 이어지는 갈래만 짧게 */
const LINK_SHORT: Record<string, string> = { GOAL_INDUSTRY: "목표 산업", GOAL_ROLE: "목표 직무" };
function short41(links: { kind: string; text: string }[]): string {
  if (!links.length) return "—";
  return links.map((l) => {
    if (l.kind === "GOAL_ROLE") return `<i class="ck">${E(LINK_SHORT.GOAL_ROLE)}${/이 기업 자료에서 본 직무/.test(l.text) ? "·자료에서 봄" : ""}</i>`;
    if (LINK_SHORT[l.kind]) return `<i class="ck">${E(LINK_SHORT[l.kind])}</i>`;
    return `<i class="ck ck2">${E(l.text.replace(/^분석된 탐색 방향 /, "탐색 방향 ").replace(/^확인된 경험 /, "경험 "))}</i>`;
  }).join(" ");
}
function g41(r: Report3): string {
  const gs = r.region.groups;
  const all = gs.flatMap((g) => g.items.flatMap((e) => e.links));
  const named = (k: string, pre: string) => all.find((l) => l.kind === k)?.text.replace(pre, "").replace(/\(이 기업 자료에서 본 직무\)/, "").trim();
  const gInd = named("GOAL_INDUSTRY", "목표 산업 "), gRole = named("GOAL_ROLE", "목표 직무 ");
  return pg(r, 41, `${opener("06", "기업 분석", "기업 후보를 고른 까닭", "지역 기업 자료 가운데 이 학생의 목표 산업·관심 직무·확인된 경험과 이어지는 곳을 골랐습니다. 이어지는 까닭을 숫자로 바꾸지 않고 글로 적었습니다.")}
  ${gInd || gRole ? `<p class="x-legend">${gInd ? `<i class="ck">목표 산업</i> ${E(gInd)}` : ""}${gInd && gRole ? " · " : ""}${gRole ? `<i class="ck">목표 직무</i> ${E(gRole)}` : ""} · ‘자료에서 봄’ 은 그 기업 자료에 목표 직무가 적혀 있다는 뜻</p>` : ""}
  ${gs.map((g) => `${H(REGION_KO[g.region], `${g.items.length}곳`)}<ul class="x-cand">${g.items.map((e) => `<li class="${e.depth === "DEEP" ? "deep" : ""}"><b>${E(e.org.name)}</b>${e.depth === "DEEP" ? '<span class="js">깊게 봄</span>' : ""}<span>${E(e.org.industry_line)}</span><em>${short41(e.links)}</em></li>`).join("")}</ul>`).join("")}
  <p class="interp">${E(r.region.note)}${r.region.few ? ` ${E(r.region.few)}` : ""} ${tag("READ")}</p>
  <p class="src">‘추천 기업’ 이 아니라 검토할 후보입니다. 채용 여부와 근무지는 확인하지 않았습니다.</p>`);
}
function g42(r: Report3, lib: Lib): Built {
  if (!r.companies.length) return skip(42, "깊게 본 기업이 없음");
  const rows = r.companies.map((c, i) => {
    const d = dartOf(lib, c.id); const f = pick(d?.financials ?? null);
    return [`<b>${NO[i]} ${E(c.name)}</b><span class="x-sub">${E(REGION_KO[c.region])}</span>`, E(d?.dart ? `${d.dart.corp_cls}${d.dart.stock_code ? ` · ${d.dart.stock_code}` : ""}` : "공시 없음"),
      f ? `${eok(f.v["매출액"])}억<span class="x-sub">${E(d!.financials!.year)} ${E(f.kind)}</span>` : `<span class="none">공시 재무 없음</span>`,
      tag(d?.compare?.hq_region === "DIFFERENT_SIDO" ? "CONFLICTING" : d?.dart ? "OFFICIAL_DIRECT" : (c.verify as "THIRD_PARTY"), d?.dart ? (d.compare?.hq_region === "DIFFERENT_SIDO" ? "본점 상충" : "개황 대조") : undefined),
      E(c.jobs.map((j) => j.name).join(" · ")), E(c.links.slice(0, 2).join(" · "))];
  });
  return { n: 42, html: pg(r, 42, `${opener("06", "기업 분석", "후보 비교", "깊게 볼 기업을 공시·자료의 확인 수준, 이어지는 직무, 이어지는 까닭으로 나란히 놓았습니다. 순위가 아닙니다.")}
  ${TB(["기업", "공시 구분", "매출(공시)", "확인 수준", "이어지는 직무", "이어지는 까닭"], rows)}
  ${H("읽는 법")}<ul class="lim"><li>${E("상장사는 사업보고서로 사업과 숫자를 직접 확인할 수 있고, 비상장사는 공시 개황과 제3자 자료까지만 확인할 수 있습니다.")}</li><li>${E("매출 규모는 회사의 크기일 뿐, 신입 경영 직무의 자리 수나 채용 여부를 말해 주지 않습니다.")}</li></ul>
  <p class="src">${tag("OFFICIAL_DIRECT")} 공시 구분·매출은 OpenDART · ${tag("THIRD_PARTY")} 그 밖의 자료는 리포트 자료(검토용) · 채용 여부는 확인하지 않았습니다.</p>`) };
}

function coPage3(r: Report3, lib: Lib, c: CompanyDeep, n: number, no: string): string {
  const jobs = c.jobs.slice(0, 2);
  return pg(r, n, `${opener("06", `기업 ${no} 준비 상태와 확인할 것`, c.name, `${c.name}에서 본 ${jobs.map((j) => j.name).join(" · ")} 직무의 핵심 판단에 지금 응답을 대어 보고, 지원 전에 공식 원문으로 확인할 것 ${c.toCheck.length}가지를 적었습니다.`)}
  ${jobs.map((j) => `<article class="x-dm"><div class="x-dmh"><h2>${E(j.name)}</h2><span class="js">${E(j.status)}</span>${j.extra ? '<span class="meta">이 회사 안내가 함께 다루는 직무</span>' : ""}</div>
    <div class="x-g2"><div><b>응답에서 확인된 판단</b>${UL(j.have, "x-ul x-have", "아직 없음")}</div><div><b>아직 확인되지 않은 판단</b>${UL(j.need, "x-ul x-need", "없음")}</div></div>
    <p class="interp">${E(j.develop)} ${tag("READ")}</p>${(() => { const p = priorityFor(r, j.need); return p ? `<p class="x-tie">실행 과제 ${p.order}번 ${E(withJosa(`‘${p.title}’`, "이가"))} 이 자리의 ${E(withJosa(`‘${p.what}’`, "을를"))} 채웁니다 — 이 회사 준비와 목표 직무 준비가 같은 과제입니다.</p>` : ""; })()}<p class="x-sm">먼저 익힐 것 — ${E(j.learn.slice(0, 3).join(" · ") || "—")}</p></article>`).join("")}
  <div class="x-g2"><div>${H("공식 원문으로 확인할 것")}${UL(c.toCheck.slice(0, 5), "x-ul", "—")}<p class="x-sm">${E(c.hiring)}</p></div>
  <div>${H("이 쪽들의 출처", `${c.sources.length}건`)}<ul class="x-ul x-src">${c.sources.slice(0, 6).map((s) => `<li>${E(s.title)} <em>${E(s.kind)} · ${E(s.checked_on)}</em></li>`).join("")}</ul></div></div>
  <p class="src">${tag((c.verify as "THIRD_PARTY") ?? "UNVERIFIED")} 직무와 판단은 검사 응답과 직무 안내에서, 회사 정보는 리포트 자료에서 왔습니다 · 채용 여부는 확인하지 않았습니다.</p>${gapsOf(lib, n)}`);
}

/* ── 7부 기업별 전략 ────────────────────────────────────────────── */

function g55(r: Report3): Built {
  if (!r.companies.length) return skip(55, "깊게 본 기업이 없음");
  const rows = r.companies.map((c, i) => { const j = c.jobs[0]; const s = storyFor(r, c); return [`<b>${NO[i]} ${E(c.name)}</b>`, E(j?.name ?? "—"), E(s ? s.from : "새로 만들 경험"), E(j?.project.title ?? "—"), E(c.toCheck[0] ?? "공식 채용 쪽")]; });
  return { n: 55, html: pg(r, 55, `${opener("07", "기업별 전략", "지원 전략 개관", "깊게 본 기업마다 겨냥할 직무, 서류에 쓸 근거, 만들 결과물, 먼저 확인할 것을 한 줄로 모았습니다.")}
  ${TB(["기업", "겨냥할 직무", "서류에 쓸 근거", "만들 결과물", "먼저 확인할 것"], rows)}
  <p class="interp">근거는 회사마다 새로 만들지 않고, 한 경험을 회사의 장면에 맞춰 다시 말합니다. 회사마다 갈리는 것은 결과물과 확인할 것입니다(‘함께 쓰는 근거 · 갈리는 근거’ 쪽). ${tag("READ")}</p>`) };
}

function plan12(r: Report3, lib: Lib, c: CompanyDeep, n: number, no: string, inner = false): string {
  const j = c.jobs[0];
  const d = dartOf(lib, c.id);
  const listed = Boolean(d?.dart?.stock_code);
  const steps = j.project.steps;
  const rows: [string, string, string][] = [
    ["1개월", `먼저 익힐 것 — ${j.learn.slice(0, 2).join(" · ") || "직무 기초"}`, "학습 메모 한 장"],
    ["2~3개월", `${j.project.title.replace(/'([^']+)'/g, "‘$1’")} — ${steps.slice(0, 2).join(" → ")}`, `남길 것 — ${j.project.output}`],
    ["4~6개월", listed ? "반기보고서·분기보고서로 숫자와 사업 변화 다시 맞추기(정기공시 일정)" : "공시 개황·기업 누리집·보도로 사업 변화 다시 확인", "바뀐 사실 한 줄과 그 출처·확인일"],
    ["6~9개월", `공고에서 확인할 것 — ${j.posting.slice(0, 2).join(" · ") || "담당 업무와 우대 조건"}`, "공고 원문 주소와 확인일"],
    ["9~12개월", "내 결과물과 공고 요건을 한 줄씩 대조하고, 비는 요건 하나를 골라 채우기", "요건 대조표"],
  ];
  const cal = `${H("3~12개월", listed ? "상장사 정기공시 일정에 맞춤 · 시기는 권장" : "공시 의무 없는 회사 · 시기는 권장")}<ol class="x-cal">${rows.map(([w, t, o]) => `<li><span>${E(w)}</span><b>${E(t)}</b><em>${E(o)}</em></li>`).join("")}</ol>`;
  if (inner) return cal;
  return pg(r, n, `${opener("07", `기업 ${no} 전략 — 3~12개월`, `${c.name} · ${j.name}`, "이 회사의 직무를 겨냥해 1년 동안 할 일을 시기마다 적었습니다. 시기는 권장이며 학기 일정에 맞춰 옮겨도 됩니다.")}
  <ol class="x-cal">${rows.map(([w, t, o]) => `<li><span>${E(w)}</span><b>${E(t)}</b><em>${E(o)}</em></li>`).join("")}</ol>
  <div class="x-g2"><div>${H("프로젝트 차례", "이 회사의 장면으로")}<ol class="pj-s">${steps.slice(0, 5).map((s) => `<li>${E(s)}</li>`).join("")}</ol></div>
  <div>${H("시기마다 확인 질문")}<ul class="x-ul"><li>${E("결과물만 보고 내가 무엇을 판단했는지 알 수 있는가")}</li><li>${E(`이 회사의 ${c.headline} 맥락이 결과물에 한 줄이라도 들어갔는가`)}</li><li>${E("공고 원문의 주소와 확인일을 적어 두었는가")}</li></ul></div></div>
  <p class="src">${tag(listed ? "OFFICIAL_DIRECT" : "UNVERIFIED", listed ? "상장사 정기공시" : "공시 의무 없음")} 정기공시 일정은 자본시장법의 일반 기한입니다 · 프로젝트와 공고 확인 항목은 리포트 안내(검토 전) · 채용 여부는 확인하지 않았습니다.</p>${gapsOf(lib, n)}`);
}

function g64(r: Report3): Built {
  if (r.companies.length < 2) return skip(64, "견줄 기업이 둘 미만");
  const key = (h: string) => h.replace(/\s*\(.*$/, "");
  const all = r.companies.map((c) => new Set(c.jobs.flatMap((j) => j.have.map(key))));
  const cnt = new Map<string, number[]>();
  all.forEach((set, i) => set.forEach((h) => cnt.set(h, [...(cnt.get(h) ?? []), i])));
  const shared = [...cnt.entries()].filter(([, is]) => is.length >= 2).map(([h, is]) => `${h} — ${is.map((i) => NO[i]).join(" ")}`);
  const sharedKeys = new Set([...cnt.entries()].filter(([, is]) => is.length >= 2).map(([h]) => h));
  const rows = r.companies.map((c, i) => [`<b>${NO[i]} ${E(c.name)}</b>`, UL([...all[i]].filter((h) => !sharedKeys.has(h)).slice(0, 3), "x-ul", "이 회사에만 걸리는 근거 없음"), E(c.jobs[0]?.project.output ?? "—"), E(c.headline)]);
  return { n: 64, html: pg(r, 64, `${opener("07", "기업별 전략", "여러 회사에 함께 쓰는 근거 · 회사마다 갈리는 근거", "같은 경험을 여러 회사에 쓸 수 있는 부분과, 회사마다 다시 골라야 하는 부분을 갈랐습니다.")}
  ${H("두 회사 이상에 함께 쓰는 근거", `${shared.length}가지 · 걸리는 회사 번호`)}${UL(shared, "x-ul x-have", "두 회사 이상에 걸치는 근거는 아직 없습니다")}
  ${H("회사마다 갈리는 것")}${TB(["기업", "그 회사에만 걸리는 근거", "만들 결과물", "회사의 장면"], rows)}
  <p class="interp">공통 근거는 자기소개서의 뼈대로 두고, 회사마다 갈리는 근거와 결과물을 그 회사의 장면에 맞춰 바꿔 끼웁니다. ${tag("READ")}</p>`) };
}

/* ── 8부 자소서·면접·포트폴리오 ─────────────────────────────────── */

function g65(r: Report3): string {
  const ss = r.application.stories;
  return pg(r, 65, `${opener("08", "자소서·면접·포트폴리오", "자기소개서 구성", "한 경험을 네 칸으로 나눠 문단을 짓습니다. 칸마다 무엇을 쓰는지와, 이 학생이 지금 가진 재료를 함께 적었습니다.")}
  <ol class="x-four">${[["상황과 내 역할", "어떤 수업·활동이었고 팀에서 무엇을 맡았는지"], ["내가 정한 것", "여러 안 가운데 무엇을 어떤 기준으로 골랐는지"], ["그 결과 남긴 것", "결과물의 이름과 그 안에서 내가 만든 부분"], ["무엇과 비교했고 무엇이 달라졌나", "목표·지난 실적·다른 안과 견준 결과(수치는 직접)"]].map(([a, b], i) => `<li><span>${i + 1}</span><b>${E(a)}</b><p>${E(b)}</p></li>`).join("")}</ol>
  ${H("지금 가진 재료", `${ss.length}개`)}${ss.length ? TB(["재료", "쓰이는 직무", "채워진 칸", "남은 일"], ss.map((s) => [`<b>${E(s.from)}</b>`, E(s.fits.slice(0, 3).join(" · ") || "—"), `${s.parts.filter((p) => p.filled).length} / ${s.parts.length}`, E(s.add)])) : `<p class="none">아직 재료가 없습니다. 첫 프로젝트의 결과가 첫 재료가 됩니다.</p>`}
  ${H("쓰지 않는 것")}<ul class="lim"><li>${E("이 보고서의 단계 이름(예: ‘기준까지 직접 결정’)을 문장에 그대로 옮기지 않습니다. 장면으로 바꿔 씁니다.")}</li><li>${E("가지지 않은 수치를 쓰지 않습니다. 수치는 학생이 가진 결과물에서 옮깁니다.")}</li></ul>`);
}
function storyPage(r: Report3, n: number, s: Story | undefined, label: string): Built {
  if (!s) return skip(n, n === 66 ? "문단 재료로 쓸 근거가 없음" : "둘째 문단 재료로 쓸 근거가 없음");
  if (!s.parts.some((p) => p.filled && !/^직접 기입/.test(p.text))) return skip(n, "재료의 칸이 모두 비어 있어 문단을 세울 근거가 없음");
  return { n, html: pg(r, n, `${opener("08", label, s.from.split(" — ")[0], `이 재료는 ${s.from.split(" — ")[1] ?? "응답"}에서 왔습니다. 채워진 칸은 학생이 고른 문장 그대로이고, 빈칸은 학생이 직접 적어야 합니다.`)}
  <dl class="sty x-sty">${s.parts.map((p) => `<div class="${p.filled ? "" : "empty"}"><dt>${E(p.label)}</dt><dd>${E(p.text)}</dd></div>`).join("")}</dl>
  <p class="interp">${E(s.add)} ${tag("READ")}</p>
  ${H("이 재료가 쓰이는 직무")}${UL(s.fits.slice(0, 4))}
  ${(() => { const cs = r.companies.filter((c) => c.jobs.some((j) => s.fits.includes(j.name))); return cs.length ? `${H("이 재료를 쓸 회사", "회사마다 바꿔 끼울 한 줄")}${TB(["회사", "겨냥할 직무", "바꿔 끼울 장면"], cs.slice(0, 3).map((c) => [`<b>${E(c.name)}</b>`, E(c.jobs.find((j) => s.fits.includes(j.name))!.name), E(c.headline)]))}` : ""; })()}
  ${H("문단으로 옮겨 적는 칸", "학생이 직접 씀")}<div class="x-lines">${Array.from({ length: 5 }, () => "<i></i>").join("")}</div>
  <p class="src">${tag("GENERAL", "검사 응답 · 학생 기록")} 문장을 대신 써 주지 않습니다. 고른 문장을 학생의 말로 옮겨 적는 칸입니다.</p>`) };
}
function g68(r: Report3): string {
  const pf = r.application.portfolio;
  return pg(r, 68, `${opener("08", "자소서·면접·포트폴리오", "포트폴리오 구성", "이미 가진 결과물과 새로 만들 결과물을 한 묶음으로 놓았습니다. 결과물마다 무엇을 함께 넣을지 적었습니다.")}
  ${H("결과물마다 함께 넣을 것")}<p>${E(pf.find((p) => p.status === "보유")?.include ?? "결과물 한 장과, 그 안에서 내가 정한 것 한 줄·비교한 대상 한 줄")}</p>
  ${TB(["결과물", "고른 자리", "새로 만들 때 담을 것", "상태"], pf.map((p) => [`<b>${E(p.title)}</b>`, E(p.status === "보유" ? (r.domains.filter((d) => d.artifacts.includes(p.title)).map((d) => d.name).join(" · ") || r.records.filter((x) => x.artifacts.includes(p.title)).map((x) => `경험 기록 ‘${x.title}’`).join(" · ") || p.from) : p.from), E(p.status === "보유" ? "—" : p.include), `<span class="js">${E(p.status)}</span>`]))}
  ${H("묶는 법")}<ol class="x-ol"><li>${E("결과물마다 한 장 — 결과물 사진·표 한 장과 ‘내가 정한 것’ 한 줄, ‘비교한 대상’ 한 줄")}</li><li>${E("목표 직무의 결과물을 앞에 두고, 다른 직무에 걸리는 결과물을 뒤에 둡니다")}</li><li>${E("팀 결과물은 내가 만든 부분을 따로 표시합니다")}</li></ol>
  <p class="src">${tag("GENERAL", "검사 응답 + 직무 일반")} ‘보유’ 는 학생이 체크리스트나 경험 기록에서 고른 결과물입니다. 결과물의 실물은 이 보고서가 확인하지 않았습니다.</p>`);
}
function g69(r: Report3): Built {
  const code = r.strategy.roleCode ?? r.directions[0]?.code;
  const g = code ? roleGuide(code) : null;
  if (!g || !code) return skip(69, "목표 직무 안내 자료가 없음");
  const p = g.firstProject;
  return { n: 69, html: pg(r, 69, `${opener("08", "자소서·면접·포트폴리오", "포트폴리오 한 건 설계", `${roleName(code)}의 첫 프로젝트를 포트폴리오 한 건으로 만드는 차례입니다. 한 건은 A4 한두 장이면 충분합니다.`)}
  <article class="x-pj"><span class="tagx">${E(roleName(code))}</span><h2>${E(p.title)}</h2><p>${E(p.goal)}</p></article>
  <ol class="x-four">${[["문제", "무엇을 풀려고 했나 — 과제의 범위와 다루지 않은 것"], ["내가 정한 것", "기준·가정·배분 가운데 내가 고른 것과 그 까닭"], ["결과물", p.output], ["확인", p.check]].map(([a, b], i) => `<li><span>${i + 1}</span><b>${E(a)}</b><p>${E(b)}</p></li>`).join("")}</ol>
  ${H("만드는 차례")}<ol class="pj-s">${p.steps.map((s) => `<li>${E(s)}</li>`).join("")}</ol>
  <p class="src">${tag("GENERAL")} 직무 일반 안내(검토 전)의 첫 프로젝트입니다. 특정 기업의 과제가 아닙니다.</p>`) };
}
type QA = { q: string; why: string; material: string; axis?: string; domain?: string; pick?: string };
function qPage(r: Report3, n: number, label: string, xs: QA[], dek: string, how: [string, string], kit?: (x: QA) => string): Built {
  if (!xs.length) return skip(n, "준비할 질문이 없음");
  return { n, html: pg(r, n, `${opener("08", label, "면접 질문", dek)}
  <ol class="x-qa">${xs.map((x, i) => { const k = kit?.(x) ?? ""; return `<li><span>${i + 1}</span><div><b>${E(x.q.replace(/^“|”$/g, ""))}</b><p>${E(x.why)}</p>${k || `<em>준비 재료 — ${E(x.material)}</em>`}</div></li>`; }).join("")}</ol>
  ${H(how[0])}<p>${E(how[1])}</p>
  <p class="src">${tag("GENERAL", "검사 응답 + 직무 일반")} 질문은 실제 면접 문항이 아니라 준비용 예시입니다.</p>`) };
}
function g72(r: Report3): Built {
  const xs = r.companies.flatMap((c) => c.jobs.slice(0, 1).flatMap((j) => j.interview.slice(0, 2).map((q) => ({ q, why: `${c.name} · ${j.name} 장면의 질문입니다`, material: j.project.output }))));
  return qPage(r, 72, "면접 질문 ③ 직무·기업 장면에서", xs.slice(0, 7), "깊게 본 기업의 직무 장면에서 나올 수 있는 질문입니다. 회사 안내(검토 전)에서 골랐습니다.", ["회사 장면 질문을 준비하는 법", "그 회사의 사업 한 줄(공시나 회사 소개에서 확인한 것)을 먼저 말하고, 내 결과물 가운데 그 장면에 가장 가까운 것 하나를 잇습니다. 확인한 출처가 없는 회사 사정이나 채용 계획은 짐작으로 말하지 않습니다."], kitCompany(r));
}
function g73(r: Report3): string {
  const code = r.strategy.roleCode ?? r.directions[0]?.code;
  const g = code ? roleGuide(code) : null;
  const items = [
    ...r.application.stories.slice(0, 2).flatMap((s) => s.parts.filter((p) => !p.filled).map((p) => `${s.from.split(" — ")[0]}: ‘${p.label}’ 칸을 채웠는가`)),
    ...(g?.postingCheck.slice(0, 3).map((x) => `공고 확인 — ${x}`) ?? []),
    ...r.companies.slice(0, 2).map((c) => `${c.name}: 공식 채용 쪽에서 직무와 근무지를 원문으로 확인했는가`),
    "자기소개서의 수치가 학생이 가진 결과물에서 왔는가",
    "포트폴리오 결과물마다 내가 정한 것 한 줄이 붙어 있는가",
  ];
  return pg(r, 73, `${opener("08", "자소서·면접·포트폴리오", "지원 전 점검표", "지원서를 내기 전에 하나씩 지워 가는 표입니다. 이 학생의 빈칸과 깊게 본 기업에서 골랐습니다.")}
  <ul class="x-chk">${items.slice(0, 12).map((t) => `<li><i></i>${E(t)}</li>`).join("")}</ul>
  <p class="src">${tag("READ")} 점검표는 합격 기준이 아닙니다. 지원서가 이 보고서의 근거 밖으로 나가지 않았는지 확인하는 표입니다.</p>`);
}

/* ── 9부 계획·워크시트·출처 ─────────────────────────────────────── */

/** 재검사 때 견줄 기준을 지금 응답에서 고른다: 단계 · 결과물 수 · 묻지 않은 관심 영역 · 1번 과제 */
function recheck(r: Report3): string[] {
  const d2 = r.map.filter((m) => m.depth === 2).map((m) => m.name);
  const un = r.map.filter((m) => m.depth === null && m.interest === "HIGH").map((m) => m.name);
  const p = r.priorities[0];
  return [
    d2.length ? `지금 ‘직접 수행’ 인 ${d2.slice(0, 3).join(" · ")}에서 기준까지 직접 정한 장면이 생겼는가` : "‘해 본 적 없음’ 이던 영역 가운데 한 곳이라도 ‘직접 수행’ 으로 올라왔는가",
    `고른 결과물이 지금 ${r.profile.artifacts}개에서 늘었는가 — 늘었다면 그 이름을 경험 기록에 적었는가`,
    un.length ? `이번에 자세히 묻지 않은 관심 영역(${un.slice(0, 2).join(" · ")})에서 새로 해 본 일이 생겼는가` : "이번에 자세히 묻지 않은 영역 가운데 새로 해 본 영역이 생겼는가",
    p ? `실행 과제 1번 ‘${p.title}’ 의 결과물(${p.output})을 경험 기록에 올렸는가` : "첫 프로젝트의 결과물을 경험 기록에 올렸는가",
  ];
}
function g75(r: Report3): string {
  const rows = r.plan.filter((p) => p.period === "6개월" || p.period === "12개월");
  return pg(r, 75, `${opener("09", "계획", "6 · 12개월 계획과 다시 검사할 때", "90일 뒤의 계획입니다. 6개월에는 학교 밖 경험과 포트폴리오, 12개월에는 지원 방향과 재검사를 둡니다.")}
  ${rows.map((p) => `<article class="x-pr"><div class="x-prn x-per">${E(p.period)}</div><div><h2>${E(p.label)}</h2><p>${E(p.what)}</p>
    <ol class="x-chain"><li><span>왜</span>${E(p.why)}</li><li><span>어떻게</span>${E(p.how)}</li><li><span>남길 것</span>${E(p.output)}</li><li><span>확인</span>${E(p.check)}</li></ol></div></article>`).join("")}
  ${H("다시 검사할 때 볼 것", "지금 응답에서 고른 기준")}<ul class="lim">${recheck(r).map((t) => `<li>${E(t)}</li>`).join("")}</ul>
  <p class="src">${tag("READ", "추천 전략")} 계획은 이 보고서가 권하는 것이고 사실이 아닙니다 · ${tag("GENERAL", "검사 응답")} 재검사는 담당자에게 요청합니다. 이번 결과는 굳어 남고, 두 결과를 같은 기준으로 견줍니다.</p>`);
}
function g76(r: Report3): string {
  const ws = r.worksheet;
  return pg(r, 76, `${opener("09", "워크시트", r.records.length ? "경험 기록 빈칸 채우기" : "첫 경험 기록 쓰기", "칸마다 미리 채운 것은 학생이 고른 문장입니다. 빈칸에 직접 적고, 내 CareerMatri의 경험 기록에도 옮겨 두세요.")}
  ${ws.map((w) => `<article class="x-ws"><h2>${E(w.title)}</h2><dl>${[["상황과 내 역할", ""], ["내가 정한 것", w.prefill.decided ?? ""], ["남긴 결과물", w.prefill.artifact ?? ""], ["비교한 대상과 결과", w.prefill.verify ?? ""], ["기간·수치(직접)", ""]].map(([k, v]) => `<div><dt>${E(k)}</dt><dd>${v ? E(v) : '<i class="x-ln"></i><i class="x-ln"></i>'}</dd></div>`).join("")}</dl></article>`).join("")}
  <p class="src">${tag("GENERAL", "검사 응답 · 학생 기록")} 이 워크시트는 학생이 직접 쓰는 칸입니다. 이 보고서가 대신 채우지 않습니다.</p>`);
}
function g77(r: Report3, lib: Lib): Built {
  if (!r.companies.length) return skip(77, "깊게 본 기업이 없음");
  const rows = r.companies.map((c, i) => { const d = dartOf(lib, c.id); const rep = d?.annual_reports?.[0];
    return [`<b>${NO[i]} ${E(c.name)}</b>`, E(d?.dart?.hm_url ?? "직접 기입"), E(rep ? `${rep.report} · ${rep.rcept_no}` : d?.dart ? "공시 개황만 있음" : "공시 없음"), "", "", ""]; });
  return { n: 77, html: pg(r, 77, `${opener("09", "워크시트", "기업 공식 자료 확인 기록지", "이 보고서의 기업 정보를 학생이 공식 원문으로 직접 확인하고 적는 표입니다. 공시에서 받은 값은 미리 채워 두었습니다.")}
  ${TB(["기업", "공식 홈페이지(공시)", "최근 사업보고서 접수번호", "채용 쪽 주소", "확인한 날", "다르게 적힌 것"], rows, "x-wsb")}
  ${H("확인하는 차례")}<ol class="x-ol"><li>${E("공식 홈페이지의 회사 소개에서 사업과 본점·사업장을 확인합니다")}</li><li>${E("상장사는 전자공시(dart.fss.or.kr)에서 위 접수번호의 보고서를 엽니다")}</li><li>${E("채용 쪽에서 경영 직무의 공고 원문을 찾고 주소와 확인일을 적습니다")}</li><li>${E("이 보고서와 다르게 적힌 것을 오른쪽 칸에 적습니다 — 이 보고서보다 원문이 먼저입니다")}</li></ol>
  <p class="src">${tag("OFFICIAL_DIRECT")} 미리 채운 칸은 OpenDART(${E(lib.dart.checked_on)}) · 나머지는 학생이 직접 적습니다.</p>`) };
}
function g78(r: Report3): string {
  const secs = Object.entries(r.trace.reduce((a, t) => ({ ...a, [t.section]: (a[t.section] ?? 0) + 1 }), {} as Record<string, number>));
  return pg(r, 78, `${opener("09", "근거와 출처 ①", "학생 응답", "이 보고서의 학생 쪽 판단이 어느 응답에서 왔는지와, 응답이 굳은 판본을 적었습니다.")}
  ${H("판본", "응시한 날 굳은 값")}${TB(["항목", "판본"], Object.entries(r.versions).map(([k, v]) => [`${E(({ major: "전공", core_version: "전공 Core", scoring_version: "판단 규칙", item_bank_version: "문항 은행", role_pack_version: "직무 팩", region_layer_version: "지역 층", industry_pack_version: "산업 팩", result_model: "결과 모델" } as Record<string, string>)[k] ?? k)}<span class="x-sub">${E(k)}</span>`, E(v && v !== "null" ? v : "쓰지 않음")]))}
  ${H("결론마다 되짚은 자리", `${r.trace.length}줄`)}${TB(["장", "결론 수"], secs.map(([k, v]) => [E(k), String(v)]))}
  <p class="src">${tag("GENERAL", "검사 응답")} 결론 한 줄마다 결과 모델의 어느 칸과 어느 고른 문장에서 왔는지를 따로 기록해 두었습니다(검토용 추적표).</p>`);
}
/* 같은 까닭으로 뺀 쪽은 한 줄로 묶는다(쪽 번호와 제목은 그대로 다 적는다). 같은 제목이 겹치면 한 번만 */
function groupSkips(xs: { n: number; title: string; why: string }[]) {
  // 까닭 안의 ‘설계 N’ 만 다르면 같은 까닭이다: 번호를 모아 한 줄에 적는다
  const m = new Map<string, { ns: number[]; titles: string[]; why: string; refs: string[] }>();
  for (const x of xs) {
    const key = x.why.replace(/설계 \d+/g, "설계 #");
    const g = m.get(key) ?? { ns: [], titles: [], why: x.why, refs: [] };
    g.ns.push(x.n); if (!g.titles.includes(x.title)) g.titles.push(x.title);
    for (const r of x.why.match(/설계 (\d+)/g) ?? []) if (!g.refs.includes(r.slice(3))) g.refs.push(r.slice(3));
    m.set(key, g);
  }
  return [...m.values()].map((g) => ({ ...g, why: g.refs.length > 1 ? g.why.replace(/설계 \d+/, `설계 ${g.refs.join("·")}`) : g.why }));
}
function g80(r: Report3, skipped: { n: number; title: string; why: string }[]): string {
  return pg(r, 80, `${opener("09", "안내", "이 리포트가 하지 않는 것", "이 보고서가 말하지 않는 것과, 이 학생 판에서 뺀 쪽을 적었습니다.")}
  <ul class="lim lim2">${["점수 · 순위 · 다른 학생과 견준 값을 내지 않습니다", "직무 적합도나 합격 가능성을 계산하지 않습니다", "특정 기업의 채용 여부·근무지를 확인하거나 단정하지 않습니다 — ‘추천 기업’ 이 아니라 검토할 후보입니다", "학생이 답하지 않은 경험이나 성과를 만들지 않습니다", "확인되지 않은 학과 교육과정·과목 이름을 만들지 않습니다", "공식 통계가 없는 자리에 숫자를 지어내지 않습니다"].map((t) => `<li>${E(t)}</li>`).join("")}</ul>
  ${H("이 학생 판에서 뺀 쪽", `${skipped.length}쪽`)}${skipped.length ? TB(["설계 쪽", "제목", "뺀 까닭"], groupSkips(skipped).map((g) => [g.ns.join(" · "), g.titles.map(E).join("<br>"), E(g.why)])) : `<p class="none">뺀 쪽 없음</p>`}
  <p class="src">뺀 쪽을 다른 쪽으로 채우지 않았습니다. 조건이 맞거나 조사 자료가 확보되면 같은 설계로 그 쪽이 다시 섭니다.</p>`);
}

/* ── 조립 ──────────────────────────────────────────────────────── */

const RESEARCH_SKIP: Record<number, string> = {
  38: "세종 공공기관 목록과 채용 방식(R5)을 이 환경에서 확보하지 못해, 쪽의 중심인 표가 서지 않음",
  40: "지역 구인·신입 채용 공식 통계(R4)와 채용 공고 원문(R8)을 확보하지 못해, 쪽의 중심인 통계가 서지 않음",
};

export type Full6 = { html: string; pages: { n: number; i: number; title: string }[]; skipped: { n: number; title: string; why: string }[] };

export function full6(r: Report3, lib: Lib, f: Fonts): Full6 {
  const z1 = r.domains.filter((d) => d.zone === "Z1_EVIDENCE_ESTABLISHED");
  const dirs = r.directions;
  const goalCode = r.strategy.roleCode ?? dirs[0]?.code;
  const second = dirs.find((d) => d.code !== goalCode)?.code;
  const ws = (n: number, html: string): Built => ({ n, html });
  const co = (k: number, n: number, fn: (c: CompanyDeep) => string): Built => r.companies[k] ? ws(n, fn(r.companies[k])) : skip(n, `깊게 본 기업이 ${r.companies.length}곳이라 ${NO[k]} 자리가 없음`);
  const build: Record<number, () => Built> = {
    3: () => ws(3, g3(r)), 4: () => g4(r), 5: () => g5(r),
    6: () => ws(6, p2(r)), 7: () => ws(7, g7(r)), 8: () => ws(8, g8(r)),
    9: () => z1[0] ? ws(9, p3(r, z1[0])) : skip(9, "근거가 선 영역(직접 판단 + 결과물)이 없음"),
    10: () => z1[1] ? ws(10, p3(r, z1[1])) : skip(10, z1.length ? "근거가 선 영역이 하나뿐" : "근거가 선 영역이 없음"),
    11: () => g11(r), 12: () => g12(r), 13: () => ws(13, g13(r)), 14: () => g14(r), 15: () => g15(r),
    16: () => g16(r), 17: () => g17(r), 18: () => g18(r), 19: () => g19(r), 20: () => g20(r), 21: () => g21(r),
    22: () => { const b = g22(r); const os = r.strategy.outside; if ("html" in b && os.length && os.length <= 3) b.html = b.html.replace(/(<p class="src">[^<]*<span class="vt[^"]*">검사 응답 \+ 직무 일반<\/span>)/, `${H("이번 전략에서 뺀 판단", "목표 직무의 업무 영역 밖")}${TB(["영역", "비어 있는 판단", "이 영역을 쓰는 직무"], os.map((o) => [`<b>${E(o.domain)}</b>`, E(o.what), E(o.jobs.join(" · ") || "—")]))}$1`); return b; },
    23: () => r.strategy.outside.length && r.strategy.outside.length <= 3 ? skip(23, "뺀 판단이 세 줄 이하라 앞 쪽(설계 22)에 합침") : g23(r), 24: () => ws(24, g24(r)),
    25: () => ws(25, d25(r, lib)), 26: () => ws(26, g26(r)), 27: () => guidePages(r, lib, 27, goalCode, "목표 직무 실무 가이드 ①", true),
    28: () => r.companies.length ? ws(28, d28(r, lib).replace('<p class="src">', () => mine28(r, lib) + '<p class="src">')) : skip(28, "깊게 본 기업이 없음"), 29: () => g29(r, lib), 30: () => g30(r, lib),
    31: () => guidePages(r, lib, 31, second, "둘째로 볼 직무 ①", true), 32: () => guidePages(r, lib, 32, second, "둘째로 볼 직무 ②", false),
    33: () => g33(r, 33, 1, lib), 34: () => g33(r, 34, 2, lib),
    35: () => ws(35, g35(r, lib)), 36: () => ws(36, d36(r, lib).replace('<p class="src">', () => mine36(r, lib) + '<p class="src">')), 37: () => ws(37, d37(r, lib)),
    38: () => skip(38, RESEARCH_SKIP[38]), 39: () => g39(r, lib), 40: () => skip(40, RESEARCH_SKIP[40]),
    41: () => ws(41, g41(r)), 42: () => g42(r, lib),
    55: () => g55(r), 64: () => g64(r),
    65: () => ws(65, g65(r)), 66: () => storyPage(r, 66, r.application.stories[0], "자기소개서 문단 재료 ①"), 67: () => storyPage(r, 67, r.application.stories[1], "자기소개서 문단 재료 ②"),
    68: () => ws(68, g68(r)), 69: () => g69(r),
    70: () => { const xs = r.application.interview.filter((x) => !/^준비 —/.test(x.material)).slice(0, 5); const any = xs.some((x) => x.pick);
      // 고른 장면이 하나도 없는 학생에게 ‘확인된 경험을 되짚는 질문’ 이라고 적지 않는다
      return qPage(r, 70, any ? "면접 질문 ① 확인된 경험에서" : "면접 질문 ① 목표 직무에서 흔히 받는 질문", xs,
        any ? "이미 응답에서 확인된 경험을 면접관이 되짚는 질문입니다. 질문이 묻는 판단과 같은 판단에서 고른 문장만 붙였습니다." : "아직 응답에서 고른 장면이 없어, 목표 직무에서 흔히 받는 질문에 직접 채울 칸을 붙였습니다.",
        ["답의 뼈대", `장면(언제·무엇) → 내가 정한 것과 그 기준 → 결과와 비교 → 다음에 다르게 할 것. ${any ? "칸에 적힌 문장은 이 학생이 그 판단에서 고른 것이고, 비어 있는 칸은 면접 전에 직접 채웁니다." : "네 칸 모두 면접 전에 직접 채웁니다. 실행 과제를 끝낸 뒤 그 장면으로 채우면 됩니다."} 한 답은 1분 안팎으로 준비합니다.`], kitConfirmed(r)); },
    71: () => qPage(r, 71, "면접 질문 ② 빈자리에서", gapQs(r), "아직 응답에서 확인되지 않은 판단을 묻는 질문입니다. 지금 답할 재료가 없으면 실행 과제로 먼저 만듭니다.", ["아직 재료가 없을 때", "해 보지 않은 일을 해 본 것처럼 답하지 않습니다. 그 판단을 이해하고 있다는 것과, 언제 어떤 과제로 해 볼 계획인지(실행 로드맵의 과제)를 말합니다. 면접 전에 그 과제를 끝내면 첫째 쪽의 질문으로 옮겨 갑니다."], kitGap(r)),
    72: () => g72(r), 73: () => ws(73, g73(r)),
    74: () => ws(74, p5(r)), 75: () => ws(75, g75(r)), 76: () => ws(76, g76(r)), 77: () => g77(r, lib), 78: () => ws(78, g78(r)),
  };
  for (let k = 0; k < 4; k++) {
    const b = 43 + 3 * k;
    build[b] = () => co(k, b, (c) => d43(r, lib, c, b, NO[k]));
    build[b + 1] = () => co(k, b + 1, (c) => d44(r, lib, c, b + 1, NO[k]));
    build[b + 2] = () => co(k, b + 2, (c) => coPage3(r, lib, c, b + 2, NO[k]));
    const s = 56 + 2 * k;
    // 서류·면접 쪽과 3~12개월 쪽은 따로 세우면 둘 다 반 쪽이 빈다: 한 쪽에 모으고 뒤 쪽은 합쳤다고 적는다
    build[s] = () => co(k, s, (c) => d56(r, lib, c, s, NO[k], storyFor(r, c), false).replace(/(<p class="gap">|<\/div>\s*<footer)/, (m) => plan12(r, lib, c, s + 1, NO[k], true) + coLink(r, c) + m));
    build[s + 1] = () => r.companies[k] ? skip(s + 1, `한 쪽 분량이 되지 않아 앞 쪽(설계 ${s}, 서류와 면접)에 합침`) : skip(s + 1, `깊게 본 기업이 ${r.companies.length}곳이라 ${NO[k]} 자리가 없음`);
  }
  const toc = lib.toc.pages;
  const res: Built[] = toc.filter((p) => p.n !== 1 && p.n !== 2 && p.n !== 79 && p.n !== 80).map((p) => (build[p.n] ? build[p.n]() : skip(p.n, "쪽 틀 없음")));
  const ok = new Set([1, 2, 79, 80, ...res.filter((x): x is { n: number; html: string } => "html" in x).map((x) => x.n)]);
  const order = toc.map((p) => p.n).filter((n) => ok.has(n));
  const idx = new Map(order.map((n, i) => [n, i + 1]));
  const skipped = res.filter((x): x is { n: number; skip: string } => "skip" in x).map((x) => ({ n: x.n, title: toc.find((p) => p.n === x.n)!.title, why: x.skip }));
  const htmlBy = new Map<number, string>(res.filter((x): x is { n: number; html: string } => "html" in x).map((x) => [x.n, x.html]));
  htmlBy.set(1, cover(r, lib, idx, order.length));
  htmlBy.set(2, guide2(r, lib, idx, skipped));
  htmlBy.set(79, d79(r, lib, order));
  htmlBy.set(80, g80(r, skipped));
  const total = order.length;
  // 같은 ‘부족한 조사 자료’ 줄이 쪽마다 되풀이되면 읽는 사람이 그 줄을 건너뛴다: 처음 한 번만 풀어 적고 그 뒤는 번호만
  const seenGap = new Map<string, number>();
  const dedupGap = (h: string, i: number) => h.replace(/<p class="gap">[\s\S]*?<\/p>/g, (m) => {
    const first = seenGap.get(m);
    if (first === undefined) { seenGap.set(m, i); return m; }
    const codes = [...m.matchAll(/<b>(R\d+)<\/b>/g)].map((x) => x[1]);
    return `<p class="gap">부족한 조사 자료 ${codes.join(" · ")} — ${first}쪽에 적은 것과 같음</p>`;
  });
  // 같은 실행 과제를 잇는 줄도 처음 한 번만 풀어 적는다
  const seenTie = new Map<string, number>();
  const dedupTie = (h: string, i: number) => h.replace(/<p class="x-tie">실행 과제 (\d+)번[\s\S]*?<\/p>/g, (m, no) => {
    const first = seenTie.get(m);
    if (first === undefined) { seenTie.set(m, i); return m; }
    return `<p class="x-tie">→ 실행 과제 ${no}번 (${first}쪽)</p>`;
  });
  const pages = order.map((n) => dedupTie(dedupGap(reframe(htmlBy.get(n)!, n, idx.get(n)!, total, lib), idx.get(n)!), idx.get(n)!));
  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>CareerMatri PRO · ${esc(r.meta.department ?? "")} 진로·취업 전략 보고서</title>
<style>${faces(f)}${CSS.replace(/__FONT__/g, f.family)}${CSS5}${CSS6}</style></head><body>${pages.join("\n")}</body></html>`;
  return { html, pages: order.map((n) => ({ n, i: idx.get(n)!, title: toc.find((p) => p.n === n)!.title })), skipped };
}

/** 쪽 머리·꼬리를 한 벌로 맞추고, 장 번호와 쪽 번호를 이 학생 판의 차례로 다시 적는다 */
function reframe(html: string, n: number, i: number, total: number, lib: Lib): string {
  const p = lib.toc.pages.find((x) => x.n === n)!;
  const part = lib.toc.parts[String(p.part)].title;
  const foot = `<footer class="rf"><b>${esc(`${p.part}부 ${part}`)}</b><span class="rv">검토용 · 학생 배포 전 · 설계 ${n}쪽</span><span>${i} / ${total}</span></footer>`;
  return html
    .replace(/<footer class="rf">[\s\S]*?<\/footer>/, foot)
    .replace(/CareerMatri PRO 진로·취업 (분석 리포트|전략 보고서)<\/span><\/header>/, "CareerMatri PRO 진로·취업 전략 보고서</span></header>")
    .replace(/<span class="no">\d+<\/span>/, `<span class="no">${String(p.part).padStart(2, "0")}</span>`)
    .replace(/data-page="\d+"/, `data-page="${n}"`);
}

export const CSS6 = `
.x-ul li{font-size:9pt;line-height:1.5;padding:.8mm 0 .8mm 3mm;position:relative}.x-ul li:before{content:"";position:absolute;left:0;top:2.5mm;width:1.2mm;height:1.2mm;background:var(--blue);border-radius:50%}
.x-ul.x-have li:before{background:var(--teal)}.x-ul.x-need li:before{background:var(--amber)}
.x-ol{counter-reset:o}.x-ol li{counter-increment:o;font-size:9pt;line-height:1.5;padding:.9mm 0 .9mm 6mm;position:relative}.x-ol li:before{content:counter(o);position:absolute;left:0;top:1.1mm;width:4mm;height:4mm;border-radius:50%;border:.8pt solid var(--navy);color:var(--navy);font-size:7pt;text-align:center;line-height:3.6mm;font-weight:700}
.x-tb{width:100%;border-collapse:collapse;font-size:8.6pt;margin-bottom:3mm}
.x-tb th{text-align:left;font-weight:700;color:var(--navy);font-size:8.4pt;padding:1.4mm 2mm 1.4mm 0;border-bottom:1pt solid var(--navy);vertical-align:bottom}
.x-tb td{padding:1.6mm 2mm 1.6mm 0;border-bottom:.6pt solid var(--rule);vertical-align:top;line-height:1.48}
.x-tb td b{color:var(--navy)}.x-sub{display:block;font-size:7.6pt;color:var(--muted);margin-top:.4mm}
.x-tb .x-ul li{font-size:8.4pt;padding:.3mm 0 .3mm 2.6mm}.x-tb .x-ul li:before{top:2mm}
.x-toc td{padding:1.2mm 2mm 1.2mm 0}.x-toc .x-pg{display:block;font-size:7.6pt;color:var(--blue)}.x-sm{font-size:8pt;color:var(--muted);line-height:1.5}
.x-g2{display:grid;grid-template-columns:1fr 1fr;gap:6mm}.x-g3{display:grid;grid-template-columns:repeat(3,1fr);gap:4mm}
.x-g2>div>b,.x-g3>div>b{display:block;font-size:8.6pt;color:var(--navy);margin-bottom:1mm}
.x-kv li{font-size:8.6pt;line-height:1.48;padding:1.1mm 0;border-top:.5pt solid var(--rule)}.x-kv li b{color:var(--navy);margin-right:5pt}.x-kv .vt{margin-right:5pt}
.x-miss{border:1pt dashed #C9A264;background:#FCF7EE;border-radius:2pt;padding:2.6mm 3.4mm;margin:2mm 0 3mm}.x-miss b{font-size:9pt;color:#7A5418}.x-miss p{font-size:8.6pt;margin:1mm 0}
.x-miss li{font-size:8.2pt;padding:.6mm 0}.x-miss li span{font-weight:800;color:#7A5418;margin-right:4pt}.x-miss em{font-style:normal;color:var(--muted)}
.x-parts{display:grid;grid-template-columns:repeat(3,1fr);gap:1.5mm 4mm;margin-top:5mm}
.x-parts li{display:grid;grid-template-columns:6mm 1fr;grid-template-rows:auto auto;border-top:.6pt solid var(--rule);padding-top:1.4mm}
.x-parts li span{grid-row:span 2;font-weight:800;color:var(--blue);font-size:11pt}.x-parts li b{font-size:9pt;color:var(--navy)}.x-parts li em{font-style:normal;font-size:7.8pt;color:var(--muted)}.x-parts li.off{opacity:.45}
.x-glance{display:grid;grid-template-columns:repeat(3,1fr);border-top:1.4pt solid var(--navy);margin-bottom:4mm}.x-glance.x-4{grid-template-columns:repeat(4,1fr)}
.x-glance div{padding:2.4mm 3mm 2.6mm 0;border-bottom:.6pt solid var(--rule)}.x-glance dt{font-size:7.8pt;color:var(--muted)}.x-glance dd{margin:.6mm 0 0;font-size:10pt;font-weight:700;color:var(--navy);line-height:1.4}
.x-pts li{padding:1.6mm 0;border-top:.5pt solid var(--rule)}.x-pts b{font-size:9pt;color:var(--blue)}.x-pts p{font-size:9.2pt;margin:.4mm 0 0}
.x-pt{border-top:1.4pt solid var(--navy);padding-top:2.4mm;margin-bottom:4mm}.x-pt h2{font-size:13pt;margin-bottom:1.5mm}
.x-pt dl{display:grid;grid-template-columns:1fr 1fr;gap:2mm 6mm;margin:0}.x-pt dt{font-size:7.8pt;font-weight:700;color:var(--blue)}.x-pt dd{margin:0;font-size:9.2pt;line-height:1.55}
.x-map{width:100%;border-collapse:collapse;table-layout:fixed;margin-bottom:4mm}.x-map th{font-size:8.2pt;color:var(--navy);padding:1.4mm;text-align:center}.x-map tbody th{text-align:right;width:22mm;font-size:8.4pt}
.x-map td{border:.6pt solid var(--rule);height:24mm;vertical-align:top;padding:1.4mm}.x-map td b{display:block;font-size:8.4pt;margin-bottom:1mm;padding:.5mm 1.6mm;border-radius:2pt;background:var(--tint);color:var(--navy)}
.x-map td b.z-Z1{background:var(--navy);color:#fff}.x-map td b.z-Z2{background:var(--sky)}.x-map td b.z-Z3{background:#E7EEE9}.x-map td b.z-Z4{background:var(--amber-t)}
.x-zc{display:grid;grid-template-columns:repeat(5,1fr);gap:3mm}.x-zc li{border-top:2pt solid var(--navy);padding-top:1.4mm}.x-zc span{font-size:20pt;font-weight:800;color:var(--navy);line-height:1}.x-zc b{display:block;font-size:8.6pt;color:var(--navy)}.x-zc em{font-style:normal;font-size:7.6pt;color:var(--muted);line-height:1.4;display:block}
.x-ax{display:grid;grid-template-columns:1fr 1fr;gap:1.5mm 6mm}.x-ax li{border-top:.5pt solid var(--rule);padding:1.4mm 0}.x-ax b{font-size:9pt;color:var(--navy)}.x-ax p{font-size:8.6pt;margin:.3mm 0}.x-ax em{font-style:normal;font-size:8pt;color:var(--muted)}
.x-dm{border-top:1.4pt solid var(--navy);padding-top:2.4mm;margin-bottom:4.4mm}.x-dmh{display:flex;align-items:center;gap:6pt;flex-wrap:wrap;margin-bottom:1.2mm}.x-dmh h2{font-size:13pt}.x-dmh .st-n{font-size:16pt}
.x-hl{font-size:10pt;color:var(--navy);font-weight:700;line-height:1.55}.x-q{color:var(--navy);font-weight:700}
.x-pr{display:grid;grid-template-columns:10mm 1fr;gap:3mm;border-top:1.4pt solid var(--navy);padding-top:1.8mm;margin-bottom:2.8mm}.x-prn{font-size:22pt;font-weight:800;color:var(--navy);line-height:1}.x-prn.x-per{font-size:10pt;color:var(--blue)}
.x-prh{display:flex;gap:6pt;align-items:baseline}.x-pr h2{font-size:12pt;margin:.8mm 0}.x-pr>div>p:not(.x-sm){font-size:8.9pt;line-height:1.5;margin:.6mm 0}
.x-chain{display:grid;grid-template-columns:repeat(4,1fr);gap:1.4mm;margin:1.4mm 0}.x-chain.x-c3{grid-template-columns:1.5fr 1fr 1.2fr}.x-now{color:var(--muted);font-size:8.4pt}.x-chain li{background:var(--tint);border-top:2pt solid var(--blue);padding:1.4mm 2mm;font-size:8.6pt;line-height:1.45}.x-chain li span{display:block;font-size:7.6pt;font-weight:700;color:var(--blue)}
.x-ledger td:first-child{width:34mm}
.x-lad{display:grid;grid-template-columns:repeat(2,1fr);gap:3mm 6mm}.x-lad b{font-size:9pt;color:var(--navy)}.x-lad ol{display:grid;grid-template-columns:repeat(4,1fr);gap:1mm;margin-top:1mm}
.x-lad li{font-size:7.8pt;text-align:center;background:#F0F2F6;color:#9AA2B0;border-radius:2pt;padding:1mm 0}.x-lad li.on{background:var(--sky);color:var(--navy)}.x-lad li span{display:block;font-size:12pt;font-weight:800}
.x-rec dl div{grid-template-columns:18mm 1fr}
.x-flow{margin-bottom:3.4mm}.x-flow>b{font-size:9.6pt;color:var(--navy)}.x-flow ol{display:grid;grid-template-columns:repeat(4,1fr);gap:1.4mm;margin-top:1mm}
.x-flow li{border-top:2pt solid var(--blue);background:var(--tint);padding:1.4mm 2mm;min-height:16mm}.x-flow li span{display:block;font-size:7.6pt;font-weight:700;color:var(--blue)}.x-flow li p{font-size:8.6pt;line-height:1.45;margin:0}
.x-pj{background:var(--tint);border-left:3pt solid var(--navy);padding:3mm 4mm;margin-bottom:4mm}.x-pj h2{font-size:13pt;margin:1.2mm 0}
.x-fin{border-top:1.4pt solid var(--navy);padding-top:2.4mm}.x-fin h2{font-size:12pt}.x-fin dl{display:grid;grid-template-columns:repeat(5,1fr);gap:1mm;margin:2mm 0}.x-fin dl div{background:var(--tint);padding:1.4mm}.x-fin dt{font-size:7.4pt;color:var(--muted)}.x-fin dd{margin:0;font-size:10pt;font-weight:800;color:var(--navy)}
.x-blank td{color:#9A6A22;font-size:8.2pt}
.ck{font-style:normal;display:inline-block;font-size:7.6pt;padding:0 1.4mm;border-radius:1mm;background:var(--tint);color:var(--blue);margin:0 .6mm .4mm 0}.ck2{background:none;border:.5pt solid var(--rule);color:var(--ink)}.x-legend{font-size:8.4pt;margin:0 0 2mm}.lim2{columns:2;column-gap:6mm}.lim2 li{break-inside:avoid}.x-cand li{display:grid;grid-template-columns:40mm 50mm 1fr;gap:0 3mm;padding:1.1mm 0;border-top:.5pt solid var(--rule);align-items:start}.x-cand li b{font-size:9pt;color:var(--navy)}.x-cand li .js{grid-column:1;justify-self:start;margin-top:.5mm}
.x-cand li span:not(.js){grid-column:2;grid-row:1 / span 2;font-size:8.2pt;line-height:1.4}.x-cand li em{grid-column:3;grid-row:1 / span 2;font-style:normal;font-size:8pt;color:var(--muted)}.x-cand li.deep b{color:var(--blue)}
.x-cal{display:grid;grid-template-columns:repeat(5,1fr);gap:1.6mm;margin-bottom:5mm;border-top:1.4pt solid var(--navy)}
.x-cal li{padding:2mm 2mm 2mm 0;border-right:.6pt solid var(--rule)}.x-cal li:last-child{border-right:0}.x-cal span{display:block;font-size:8pt;font-weight:800;color:var(--blue)}.x-cal b{display:block;font-size:8.8pt;line-height:1.45;color:var(--navy);margin:.8mm 0}.x-cal em{font-style:normal;font-size:7.8pt;color:var(--muted);line-height:1.4;display:block}
.x-four{display:grid;grid-template-columns:repeat(4,1fr);gap:2mm;margin-bottom:4mm}.x-four li{border-top:2.4pt solid var(--navy);background:var(--tint);padding:2mm}
.x-four li span{font-size:14pt;font-weight:800;color:var(--blue)}.x-four b{display:block;font-size:9pt;color:var(--navy);margin:.6mm 0}.x-four p{font-size:8.4pt;line-height:1.45;margin:0}
.x-sty div{grid-template-columns:40mm 1fr}
.x-lines{margin-top:2mm}.x-lines i,.x-ln{display:block;height:7.5mm;border-bottom:.6pt solid #C9D2E0}
.x-qa li{display:grid;grid-template-columns:7mm 1fr;gap:2mm;padding:2mm 0;border-top:.5pt solid var(--rule)}.x-qa li>span{width:6mm;height:6mm;border-radius:50%;background:var(--navy);color:#fff;font-weight:800;text-align:center;line-height:6mm;font-size:8.4pt}
.x-qa b{display:block;font-size:10pt;color:var(--navy);line-height:1.45}.x-qa p{font-size:8.6pt;color:var(--muted);margin:.4mm 0}.x-qa em{font-style:normal;font-size:8.4pt;color:var(--ink)}
.x-chk li{display:grid;grid-template-columns:7mm 1fr;align-items:start;font-size:9.4pt;line-height:1.5;padding:2.2mm 0;border-top:.5pt solid var(--rule)}.x-chk i{width:4.2mm;height:4.2mm;border:1pt solid var(--navy);border-radius:1pt;margin-top:.6mm}
.x-ws{border-top:1.4pt solid var(--navy);padding-top:2.4mm;margin-bottom:5mm}.x-ws h2{font-size:12pt;margin-bottom:1.4mm}.x-ws dl{margin:0}.x-ws dl div{display:grid;grid-template-columns:36mm 1fr;padding:1.4mm 0;border-top:.5pt dotted #C9D2E0}.x-ws dt{font-size:8.4pt;color:var(--muted)}.x-ws dd{margin:0;font-size:9pt}
.x-wsb td:nth-child(n+4){min-width:22mm}.x-wsb td{height:12mm}
.x-src em{font-style:normal;color:var(--muted);font-size:7.6pt}
.x-slot{display:inline-block;min-width:22mm;border-bottom:.8pt solid #9AA8BF;color:#7A869A;font-size:7.8pt;padding:0 1mm;line-height:1.3}
.x-link{border-top:1.4pt solid var(--navy);padding-top:2mm;margin-top:3mm}.x-fill li{font-size:8.6pt;padding:1.2mm 0;border-top:.5pt dotted #C9D2E0}
.x-kit{display:grid;grid-template-columns:repeat(2,1fr);gap:.6mm 4mm;margin:1.2mm 0 0;background:var(--tint);padding:1.6mm 2.4mm}.x-kit div{display:grid;grid-template-columns:19mm 1fr;font-size:8.3pt;line-height:1.42}.x-kit dt{color:var(--blue);font-weight:700;font-size:7.6pt}.x-kit dd{margin:0}
.x-tie{font-size:8.6pt;color:var(--navy);border-left:2pt solid var(--teal);padding-left:2mm;margin:1.2mm 0}
.x-ax em.x-ok{color:var(--teal)}.x-ax em.x-no{color:#9A6A22}
.x-mine{display:flex;flex-wrap:wrap;gap:1mm 5mm;align-items:baseline;border-top:1.4pt solid var(--navy);border-bottom:.6pt solid var(--rule);padding:1.8mm 0;margin:2mm 0;font-size:8.6pt}.x-mine b{color:var(--navy)}.x-mine em{font-style:normal;font-weight:700;color:var(--blue)}
`;
