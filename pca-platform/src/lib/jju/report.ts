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
  headlineKo,
} from "@/lib/me-v3/result/text.ko";
import type { OfficialProgram } from "@/lib/jju/program";
import { answeredIn, CAP_STATUS_KO, type CapCell } from "@/lib/jju/coverage";

export const JJU_REPORT_VERSION = "jju-report.3";

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
};

type Line = { k?: string; v: string; muted?: boolean };
type Table = { head: string[]; rows: string[][] };
export type Section = { no: number; title: string; lead?: string; lines: Line[]; table?: Table };

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
    { k: "센 수", v: `확인된 판단 ${m.overview.counts.confirmed_axes}칸 · 직접 정한 것 ${m.overview.counts.owned_axes}칸 · 고른 근거 ${m.overview.counts.evidence_items}개 (점수가 아니라 센 수입니다)` },
    ...(x.mode !== "LIVE" ? [{ v: "이 트랙의 검사는 전공자 검수 전 시연 전용입니다. 이 리포트를 학생 진단이나 사업 성과로 쓰지 않습니다.", muted: true }] : []),
  ] });

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
      v: `${ZONE_KO[d.zone] ?? d.zone} · 확인된 판단 ${d.confirmed.length + d.owned.length}칸(직접 정함 ${d.owned.length})${d.decided[0] ?? d.did[0] ? ` · 예: ${d.decided[0] ?? d.did[0]}` : ""}`,
    })),
  ], table: { head: ["AI 역량", "이 검사에서", "이 학생"], rows: capRows } });

  /* 3. 근거가 있는 영역에서만 잇는다 */
  const roles = confirmed.length ? rolesFromDomains(core, confirmed).slice(0, 4) : [];
  const inds = confirmed.length ? industriesFromDomains(core, confirmed).slice(0, 4) : [];
  S.push({ no: 3, title: "산업·직무 탐색", lines: [
    ...(roles.length ? roles.map((r) => ({
      k: roleName(core, r.code),
      v: `근거: ${[...r.core_domains.map((d) => `${nm(d)}(중심)`), ...r.seen_domains.map((d) => `${nm(d)}(있음)`)].join(" · ")}`,
    })) : [{ v: "확인된 판단이 있는 영역이 아직 없어 이어 볼 일을 적지 않습니다. 관심만으로 직무를 잇지 않습니다." }]),
    ...(inds.length ? [{ k: "이어 볼 산업", v: inds.map((r) => `${ind.get(r.code) ?? r.code}(${r.core_domains.length + r.seen_domains.length}개 영역 겹침)`).join(" / ") }] : []),
    { k: "학생이 고른 산업·직무", v: [...m.targets.industries.map((c) => ind.get(c) ?? c), ...m.targets.roles.map((c) => roleName(core, c))].join(" / ") || "고르지 않음" },
    { v: "이 연결은 적합도나 합격 가능성이 아니라, 확인된 판단이 그 일의 중심 영역과 겹치는지를 적은 것입니다. 산업 근거는 그 Core 의 관계표이고 기업 자료가 아닙니다.", muted: true },
  ] });

  const orgs = m.targets.orgs.map((c) => org.get(c)).filter(Boolean) as { name: string; first: string }[];
  S.push({ no: 4, title: "조직 유형과 그 근거", lines: [
    ...(orgs.length ? orgs.map((o) => ({ k: o.name, v: o.first })) : [{ v: "관심 조직 유형을 고르지 않았습니다." }]),
    { v: "기업 이름을 추천하지 않습니다. 전북권 기업·기관 자료는 출처와 사용 권리를 확인하기 전이라 0줄입니다.", muted: true },
  ] });

  S.push({ no: 5, title: "Evidence / Gap", lines: [
    ...[...new Set(m.evidence.ready.map((g) => g.domain))].map((td) => ({ k: `근거 · ${nm(td)}`, v: m.evidence.ready.filter((g) => g.domain === td).flatMap((g) => g.picks).slice(0, 4).join(" / ") || "—" })),
    ...(m.evidence.ready.length ? [] : [{ v: "근거가 선 영역은 아직 없습니다. 아래 빈자리가 무엇을 적으면 근거가 되는지 말합니다.", muted: true }]),
    ...groupGaps(m.gaps, nm),
  ] });

  /* 6. AI 학습·프로젝트 전략: 측정되는 것과 아닌 것을 나눠서 권한다 */
  const lead = opened.find((d) => d.did.length || d.decided.length);
  const story = lead ? evidenceStoryKo(core, lead.code, { did: lead.did[0], decided: lead.decided[0], artifacts: lead.artifacts, verifications: lead.verifications }, "lead", nm(lead.code)) : null;
  const ai = x.program?.courses.find((c) => c.status !== "EXISTS_DETAIL_UNVERIFIED");
  const measured = x.coverage.filter((c) => c.status === "MEASURED");
  const offList = x.coverage.filter((c) => c.status === "CURRICULUM" || c.status === "NOT_MEASURED");
  const weak = measured.find((c) => answeredIn(c, x.answered).length === 0) ?? measured[0];
  S.push({ no: 6, title: "AI 학습·프로젝트 경험 활용", lines: [
    ...(story ? [
      { k: "꺼내 쓸 경험", v: `${story.domain} — ${story.action}` },
      ...(story.outputs.length ? [{ k: "남은 결과물", v: story.outputs.join(" / ") }] : []),
    ] : [{ v: "아직 꺼내 쓸 경험이 확인되지 않았습니다." }]),
    ...(ai ? [{ k: "공식 과정에서 남길 것", v: `${ai.name} 과제 하나를 끝까지 하고, 무엇을 직접 정했고 무엇과 견줬는지를 경험으로 적습니다. 과정 이수 자체를 역량 확인으로 세지 않습니다.` }] : []),
    ...(weak ? [{ k: "판정에 들어가는 쪽", v: `${weak.cap.name}: 이 경험을 적으면 다시 볼 때 이 검사의 문항(${[...weak.core].slice(0, 4).join(", ")}${weak.core.length > 4 ? " 등" : ""})이 묻는 축과 맞춰 봅니다.` }] : []),
    ...(offList.length ? [{ k: "판정 밖에 두는 쪽", v: `${offList.map((c) => c.cap.name).join(" · ")} — 프로젝트 결과물(코드·보고서·시연)로 포트폴리오에 남깁니다. 이 검사는 이것을 재지 않습니다.`, muted: true }] : []),
  ] });

  const frame = m.translation ? draftFrameKo(m.translation.steps) : [];
  S.push({ no: 7, title: "자기소개서·면접·포트폴리오 전략", lines: [
    ...(story ? [{ k: "지원서에서 먼저 쓸 것", v: story.application }, { k: "면접에서 받을 질문", v: story.interview }] : []),
    ...frame.map((f) => ({ k: `지원서 뼈대 · ${f.label}`, v: f.items.join(" / ") })),
    { v: "수치·기간·결과는 학생이 직접 적습니다. 이 리포트는 문장을 대신 써 주지 않습니다.", muted: true },
  ] });

  S.push({ no: 8, title: "우선순위 Career Action", lines: m.actions.slice(0, 3).map((a, i) => {
    const t = actionKo(a, a.domain ? nm(a.domain) : "", m.stage);
    return { k: `${i + 1}${a.horizon === "NOW" ? " · 지금" : a.horizon === "NEXT" ? " · 다음" : " · 나중"}`, v: `${t.do} ${t.note}` };
  }) });

  S.push({ no: 9, title: "근거 출처와 검증 상태", lines: [
    ...(x.program ? x.program.facts.map((f) => ({ k: `${f.id} · ${f.status === "EXISTS_DETAIL_UNVERIFIED" ? "있음·세부 미확인" : "공식 출처·사업주 확인"}`, v: `${f.text}${f.caution ? ` (${f.caution})` : ""} [${f.source}]` })) : []),
    ...(x.program ? [{ k: "출처", v: x.program.sources.map((s) => `${s.id} ${s.url}`).join(" / ") }, { v: `확인한 날 ${x.program.checked_on}. ${x.program.verification_note}`, muted: true }] : []),
    { k: "트랙·기수", v: "CareerMatri 시연용 분류이며 사업단 공식 트랙이 아닙니다." },
    { k: "검사", v: `${core} · 문항 ${m.provenance.module_versions.item_bank_version ?? "?"} · 채점 ${m.provenance.module_versions.scoring_version ?? "?"} · 규준·인지면접 전이라 검증된 검사가 아닙니다` },
    { k: "응답 품질", v: m.response_quality.flag },
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
    l.k ? `<dt>${esc(l.k)}</dt><dd${l.muted ? ' class="m"' : ""}>${esc(l.v)}</dd>` : `<dd class="full${l.muted ? " m" : ""}">${esc(l.v)}</dd>`).join("")}</dl>` : ""}${s.table ? `<table><thead><tr>${s.table.head.map((t) => `<th>${esc(t)}</th>`).join("")}</tr></thead><tbody>${s.table.rows.map((r) => `<tr>${r.map((c, i) => `<td${i === 1 ? ` class="st st-${esc(c)}"` : ""}>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>` : ""}</section>`).join("");
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
dl{margin:0;display:grid;grid-template-columns:42mm 1fr;gap:3px 10px}dt{color:var(--ink2);font-size:8.9pt}dd{margin:0}
dd.full{grid-column:1/-1}dd.m{color:#5b677a;font-size:8.6pt}
table{width:100%;border-collapse:collapse;margin-top:6px;font-size:8.8pt}th{text-align:left;color:var(--ink2);font-weight:600;border-bottom:1px solid var(--line);padding:3px 4px}
td{border-bottom:1px solid #eef1f5;padding:3px 4px;vertical-align:top}
td.st{font-weight:700;white-space:nowrap}td.st-측정{color:var(--teal)}td.st-미측정{color:#9a3412}td.st-교육과정만{color:#6b4300}td.st-자기보고만{color:#5b677a}
footer{margin-top:12px;font-size:7.8pt;color:#5b677a;border-top:1px solid var(--line);padding-top:6px}
@media screen{body{max-width:820px;margin:0 auto;padding:20px 16px}}
@media screen and (max-width:600px){dl{grid-template-columns:1fr}dt{margin-top:6px}.cover h1{font-size:15pt}}
</style></head><body>
<div class="cover"><p>전주대학교 ${esc(x.program?.name ?? "AI 부트캠프")} · CareerMatri 학생 리포트</p>
<h1>${esc(x.student.name)} · ${esc(x.student.track)}</h1>
<div class="chips">${chips.map(([k, v]) => `<span>${esc(k)}<b>${esc(v)}</b></span>`).join("")}</div></div>
${opts.draft !== false ? `<p class="demo">합성 QA 학생 · 트랙은 시연용 분류 · 검사는 전공자 검수 전입니다. 이 종이를 학생 진단이나 사업 성과로 쓰지 않습니다.</p>` : ""}
${body}<footer>점수·백분위·적합도·합격 가능성을 만들지 않습니다. 모든 값은 공통 엔진이 굳힌 결과와 문항 커버리지에서 옵니다 · ${JJU_REPORT_VERSION}</footer></body></html>`;
}
