/**
 * 전주대학교 부트캠프 학생 한 사람의 리포트 **구조**.
 *
 * **새 판정을 만들지 않는다.** 아홉 절의 값은 전부 공통 엔진이 굳혀 둔
 * 결과 모델(`v3_snapshots.result_model`)과 결과지가 쓰는 문장 함수
 * (`text.ko.ts`)에서 오고, 여기서 하는 일은 그 값을 사업단이 받기로 한
 * 차례로 다시 묶는 것뿐이다. 점수 · 백분위 · 적합도 · 합격 가능성을 만들지
 * 않는다.
 *
 * **공통 PDF 엔진을 고치지 않는다.** 제품의 종이(`/v3/{id}/result/pdf`)는
 * 결과지 화면을 그대로 뽑는 공통 길이고, 이 파일은 그 길을 건드리지 않는
 * 학교 전용 묶음이다. 공통 길에 학교별 절을 넣는 일은 Core 담당 세션에
 * 요청한다(`docs/jju/CHANGE_REQUESTS.md` C9).
 *
 * **기업을 추천하지 않는다.** 직업정보제공사업 신고로 할 수 있는 것은
 * 정보 제공까지이고(CLAUDE.md 법적 범위), 지역 기업 자료는 아직 0줄이다.
 * 4절은 조직 유형과 그 까닭까지만 적는다.
 */
import {
  domainName, industriesFromDomains, industryChoices, orgChoices, roleName,
  rolesFromDomains,
} from "@/lib/me-v3/runtime/session";
import type { ResultModel } from "@/lib/me-v3/result/model";
import {
  actionKo, draftFrameKo, evidenceStoryKo, gapKo, headlineBadgeKo,
  headlineKo,
} from "@/lib/me-v3/result/text.ko";
import type { OfficialProgram } from "@/lib/jju/program";

export const JJU_REPORT_VERSION = "jju-report-structure.1";

export type JjuReportInput = {
  model: ResultModel;
  core: string;
  student: { name: string; track: string; cohort: string; field: string; spec: string | null };
  program: OfficialProgram | null;
  /** 그 트랙이 어디까지 실제로 열린 검사인가. `DEMO` 면 결과를 진단으로 쓰지 않는다 */
  mode: "LIVE" | "DEMO" | "PREPARING";
  /** 이 검사가 재지 않는 AI 쪽 영역. 트랙-검사 감사(`TRACK_CORE_AUDIT.md`)에서 온다 */
  notMeasured: string[];
};

export type Section = { no: number; title: string; lines: { k?: string; v: string; muted?: boolean }[] };

const ZONE_KO: Record<string, string> = {
  Z1_EVIDENCE_ESTABLISHED: "설명할 근거가 있음",
  Z2_EVIDENCE_INCOMPLETE: "해 봤고 정리가 남음",
  Z3_EVIDENCE_LOW_INTEREST: "근거는 있고 관심이 낮음",
  Z4_INSUFFICIENT_EVIDENCE: "아직 판단할 근거가 적음",
};

export function buildJjuReport(x: JjuReportInput): Section[] {
  const { model: m, core } = x;
  const nm = (td: string) => domainName(core, td);
  const h = headlineKo(m, nm);
  const opened = m.domains.filter((d) => d.zone !== "NOT_EXPLORED");
  const confirmed = m.domains.filter((d) => d.confirmed.length || d.owned.length).map((d) => d.code);
  const base = confirmed.length ? confirmed : m.overview.focus;
  const ind = new Map(industryChoices(core).map((v) => [v.code, v.name]));
  const org = new Map(orgChoices(core).map((v) => [v.code, v]));
  const S: Section[] = [];

  S.push({ no: 1, title: "개인 진단 요약", lines: [
    { k: "트랙", v: `${x.student.track} · ${x.student.field}${x.student.spec ? ` · 검사 갈래 ${x.student.spec}` : ""}` },
    { k: "기수", v: x.student.cohort },
    { k: "지금 상태", v: `${headlineBadgeKo(m)} — ${h.title}` },
    { v: h.lead, muted: true },
    { k: "먼저 볼 영역", v: m.overview.focus.map(nm).join(" / ") || "아직 앞선 영역이 없습니다" },
    { k: "확인된 판단", v: `${m.overview.counts.confirmed_axes}칸 · 직접 정한 것 ${m.overview.counts.owned_axes}칸 · 고른 근거 ${m.overview.counts.evidence_items}개 (점수가 아니라 센 수입니다)` },
    ...(x.mode !== "LIVE" ? [{ v: "이 트랙의 검사는 전공자 검수 전 시연 전용입니다. 이 리포트를 학생 진단이나 사업 성과로 쓰지 않습니다.", muted: true }] : []),
  ] });

  S.push({ no: 2, title: "전공·AI 지식과 실무역량", lines: [
    ...opened.map((d) => ({
      k: nm(d.code),
      v: `${ZONE_KO[d.zone] ?? d.zone} · 확인된 판단 ${d.confirmed.length + d.owned.length}칸(직접 정함 ${d.owned.length})${d.decided[0] ?? d.did[0] ? ` · 예: ${d.decided[0] ?? d.did[0]}` : ""}`,
    })),
    { k: "이 검사가 재지 않는 AI 영역", v: x.notMeasured.join(" / ") || "—", muted: true },
  ] });

  const roles = rolesFromDomains(core, base).slice(0, 4);
  const inds = industriesFromDomains(core, base).slice(0, 4);
  S.push({ no: 3, title: "산업·직무 탐색", lines: [
    { k: "확인된 영역에서 이어 볼 일", v: roles.map((r) => `${roleName(core, r.code)}(${[...r.core_domains, ...r.seen_domains].map(nm).join("·")})`).join(" / ") || "아직 이어 볼 근거가 없습니다" },
    { k: "이어 볼 산업", v: inds.map((r) => ind.get(r.code) ?? r.code).join(" / ") || "—" },
    { k: "고른 산업·직무", v: [...m.targets.industries.map((c) => ind.get(c) ?? c), ...m.targets.roles.map((c) => roleName(core, c))].join(" / ") || "고르지 않음" },
    { v: "이 연결은 적합도나 합격 가능성이 아니라, 확인된 판단이 그 일의 중심 영역과 겹치는지를 적은 것입니다.", muted: true },
  ] });

  const orgs = m.targets.orgs.map((c) => org.get(c)).filter(Boolean) as { name: string; first: string }[];
  S.push({ no: 4, title: "조직 유형과 그 근거", lines: [
    ...(orgs.length ? orgs.map((o) => ({ k: o.name, v: o.first })) : [{ v: "관심 조직 유형을 고르지 않았습니다." }]),
    { v: "기업 이름을 추천하지 않습니다. 전북권 기업·기관 자료는 출처와 사용 권리를 확인하기 전이라 0줄입니다.", muted: true },
  ] });

  S.push({ no: 5, title: "Evidence / Gap", lines: [
    ...[...new Set(m.evidence.ready.map((g) => g.domain))].map((td) => ({ k: `근거 있음 · ${nm(td)}`, v: m.evidence.ready.filter((g) => g.domain === td).flatMap((g) => g.picks).slice(0, 4).join(" / ") || "—" })),
    ...m.gaps.slice(0, 5).map((g) => { const t = gapKo(g, nm(g.domain)); return { k: "채울 부분", v: `${t.title} — ${t.why}` }; }),
  ] });

  const lead = opened.find((d) => d.did.length || d.decided.length);
  const story = lead ? evidenceStoryKo(core, lead.code, { did: lead.did[0], decided: lead.decided[0], artifacts: lead.artifacts, verifications: lead.verifications }, "lead", nm(lead.code)) : null;
  const ai = x.program?.courses.find((c) => c.status !== "EXISTS_DETAIL_UNVERIFIED");
  S.push({ no: 6, title: "학습·프로젝트 경험 활용", lines: [
    ...(story ? [
      { k: "꺼내 쓸 경험", v: `${story.domain} — ${story.action}` },
      ...(story.outputs.length ? [{ k: "남은 결과물", v: story.outputs.join(" / ") }] : []),
    ] : [{ v: "아직 꺼내 쓸 경험이 확인되지 않았습니다." }]),
    ...(ai ? (() => {
      /* 과정 주제 가운데 이 검사가 재지 않는 것은 근거가 된다고 적지 않는다 */
      const off = ai.topics.filter((tp) => x.notMeasured.some((n) => n.includes(tp.replace(/ 기초$/, ""))));
      const on = ai.topics.filter((tp) => !off.includes(tp));
      return [
        { k: "공식 과정과 잇기", v: `${ai.name}에서 ${on.join("·")} 과제를 경험으로 적으면 이 검사의 데이터·분석 쪽 근거로 다시 볼 수 있습니다. 과정 이수 자체를 역량 확인으로 세지 않습니다.` },
        ...(off.length ? [{ v: `${off.join("·")}는 이 검사가 재지 않습니다. 그 과제는 경험으로 적어 둘 수는 있지만 판정에 들어가지 않습니다.`, muted: true }] : []),
      ];
    })() : []),
  ] });

  const frame = m.translation ? draftFrameKo(m.translation.steps) : [];
  S.push({ no: 7, title: "자기소개서·면접·포트폴리오 전략", lines: [
    ...(story ? [{ k: "지원서", v: story.application }, { k: "면접에서 받을 질문", v: story.interview }] : []),
    ...frame.map((f) => ({ k: `지원서 뼈대 · ${f.label}`, v: f.items.join(" / ") })),
    { v: "수치·기간·결과는 학생이 직접 적습니다. 이 리포트는 문장을 대신 써 주지 않습니다.", muted: true },
  ] });

  S.push({ no: 8, title: "우선순위 Career Action", lines: m.actions.slice(0, 3).map((a, i) => {
    const t = actionKo(a, a.domain ? nm(a.domain) : "", m.stage);
    return { k: `${i + 1}`, v: `${t.do} ${t.note}` };
  }) });

  S.push({ no: 9, title: "근거 출처와 검증 상태", lines: [
    ...(x.program ? x.program.facts.map((f) => ({ k: `${f.id} · ${f.status === "EXISTS_DETAIL_UNVERIFIED" ? "있음·세부 미확인" : "공식 출처·사업주 확인"}`, v: `${f.text}${f.caution ? ` (${f.caution})` : ""} [${f.source}]` })) : []),
    ...(x.program ? [{ k: "출처", v: x.program.sources.map((s) => `${s.id} ${s.url}`).join(" / ") }, { v: `확인한 날 ${x.program.checked_on}. ${x.program.verification_note}`, muted: true }] : []),
    { k: "트랙·기수", v: "CareerMatri 시연용 분류이며 사업단 공식 트랙이 아닙니다." },
    { k: "검사", v: `${core} · 문항 ${m.provenance.module_versions.item_bank_version ?? "?"} · 채점 ${m.provenance.module_versions.scoring_version ?? "?"} · 규준·인지면접 전이라 검증된 검사가 아닙니다` },
    { k: "응답 품질", v: m.response_quality.flag },
    { k: "리포트 구조", v: JJU_REPORT_VERSION },
  ] });
  return S;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** A4 한 벌의 HTML. 뽑는 쪽은 브라우저 인쇄다 */
export function jjuReportHtml(x: JjuReportInput, S: Section[]): string {
  const body = S.map((s) => `<section><h2><span>${s.no}</span>${esc(s.title)}</h2><dl>${s.lines.map((l) =>
    l.k ? `<dt>${esc(l.k)}</dt><dd${l.muted ? ' class="m"' : ""}>${esc(l.v)}</dd>` : `<dd class="full${l.muted ? " m" : ""}">${esc(l.v)}</dd>`).join("")}</dl></section>`).join("");
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>전주대학교 · ${esc(x.student.name)} · CareerMatri</title><style>
@page{size:A4;margin:14mm 14mm 16mm}
body{font-family:"Noto Sans CJK KR","Noto Sans KR","WenQuanYi Zen Hei",sans-serif;color:#0f1b2d;font-size:10pt;line-height:1.5;margin:0}
header{border-bottom:2px solid #0f2a4a;padding-bottom:8px;margin-bottom:10px}
header p{margin:0;font-size:8.5pt;color:#4a5568}header h1{margin:2px 0 0;font-size:16pt}
.demo{margin:6px 0 0;padding:4px 8px;background:#fff3df;border:1px solid #f2d39a;color:#7a4b00;font-size:8.5pt}
section{margin:0 0 9px;break-inside:auto}h2{font-size:11.5pt;margin:0 0 4px;display:flex;gap:8px;align-items:center}
h2 span{display:inline-block;min-width:18px;height:18px;border-radius:9px;background:#0f2a4a;color:#fff;font-size:8.5pt;text-align:center;line-height:18px}
dl{margin:0;display:grid;grid-template-columns:44mm 1fr;gap:2px 10px}dt{color:#3d4d66;font-size:9pt}dd{margin:0}
dd.full{grid-column:1/-1}dd.m{color:#5b677a;font-size:8.8pt}
footer{margin-top:10px;font-size:8pt;color:#5b677a;border-top:1px solid #dde3ec;padding-top:6px}
</style></head><body><header><p>전주대학교 ${esc(x.program?.name ?? "AI 부트캠프")} · CareerMatri 학생 리포트</p>
<h1>${esc(x.student.name)} · ${esc(x.student.track)}</h1>
<p class="demo">구조 시안 · 합성 QA 학생 · 제품 PDF 경로(/v3/{id}/result/pdf)가 아닌 학교 전용 묶음입니다. 트랙은 시연용 분류입니다.</p></header>
${body}<footer>점수·백분위·적합도·합격 가능성을 만들지 않습니다. 모든 값은 공통 엔진이 굳힌 결과에서 옵니다 · ${JJU_REPORT_VERSION}</footer></body></html>`;
}
