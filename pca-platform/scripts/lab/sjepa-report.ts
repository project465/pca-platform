/**
 * **세종일자리경제진흥원 배포용 결과지 예시(PRO · 경영).** 운영 PDF 경로(`/v3/{id}/result/pdf`)와 연결하지 않는다.
 *
 *   ID=8 npx tsx scripts/lab/sjepa-report.ts
 *     → docs/metri/review/pdf-gm/sjepa-sample/CareerMatri_세종일자리경제진흥원_진로분석리포트_이서윤.pdf
 *       pages/p-NN.png · contact.png · BUILD.md
 *
 * 읽는 것은 굳은 결과 하나(`v3_snapshots`)와 그 학생의 경험 기록, 경영 Core 의 사전·관계표·직무 안내, 그리고
 * OpenDART 로 받아 둔 공시 파일이다. **여기서 새 판단을 하지 않는다**: 그래프의 값은 판단 단계(0~3)·영역 묶음·센 개수·공시 금액뿐이다.
 *
 * 외부 배포물이라 둘을 뺀다: 제3자 기업정보(KODATA)에서 온 기업 이름과 그 기업을 가리키는 할 일. 공시(OpenDART)로 확인한 것만 싣는다.
 * 참여자는 지어낸 사람이다(이서윤). 기관 배포용 예시라 실제 상담을 마친 결과지처럼 빈칸을 채워 둔다(FILL).
 */
import { loadEnv } from "../_loop-fixture";
loadEnv();
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { query, queryOne } from "../../src/lib/db";
import type { ResultModel } from "../../src/lib/me-v3/result/model";
import { load3 } from "./gm-report3";
import { JUDGE, STEP, ZONE_SAID as ZONE_BASE } from "../../src/lib/me-v3/report-gm/words";
/* 이 리포트에서는 깊게 묻지 않은 영역을 비워 두지 않는다. 관심·경험 응답과 공통 판단 응답으로 읽어 채운다 */
const ZONE_SAID: Record<string, { tag: string; said: string }> = { ...ZONE_BASE, NOT_EXPLORED: { tag: "넓혀 갈 영역", said: "관심·경험 응답과 공통 판단 응답으로 단계를 읽은 영역" } };
import { C, LEVEL_COLOR, chain, donut, gantt, hbars, heat, moneyBars, quadrant, radar, ring, timeline } from "../../src/lib/me-v3/report-gm/charts";

const ID = process.env.ID ?? "8";
const OUT = process.env.OUT ?? "docs/metri/review/pdf-gm/sjepa-sample";
const NAME = "CareerMatri_세종일자리경제진흥원_진로분석리포트_이서윤";
const PERSON = "이서윤";
const ORG = "세종일자리경제진흥원";
const J = (p: string) => JSON.parse(readFileSync(p, "utf8"));
const E = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
/* eslint-disable @typescript-eslint/no-explicit-any */
type A = any;

const AX = ["J1", "J2", "J3", "J4", "J5", "J6", "J7", "J8"] as const;
const AXN: Record<string, string> = Object.fromEntries(AX.map((a) => [a, JUDGE[a].name]));
const LV = (s: string | undefined, missing?: string): number | null =>
  missing === "NOT_ROUTED" ? null : s === "OWNED" ? 3 : s === "CONFIRMED" ? 2 : s === "PARTICIPATED" ? 1 : 0;
/* 그래프 색. 남색·파랑 한 갈래로만 그리면 쪽이 넘어가도 같은 그림으로 읽힌다.
   뜻이 있는 색(묶음 · 단계 · 관심)은 갈래마다 다른 색상을 쓰고, 영역에는 영역마다 제 색을 준다 */
const PAL = {
  blue: "#2c63d6", teal: "#13a08a", amber: "#f08a24", coral: "#e5566f", violet: "#7b5cd6",
  sky: "#2fa9d6", green: "#5ea34a", gold: "#d8a31a", plum: "#a8488f", brick: "#c8553d", mint: "#3fbfa0", navy: "#1b2f57",
};
const DOMPAL = [PAL.blue, PAL.coral, PAL.amber, PAL.teal, PAL.violet, PAL.sky, PAL.green, PAL.gold, PAL.plum, PAL.brick, PAL.mint, PAL.navy];
const DC = (code: string) => DOMPAL[(Number(String(code).replace(/\D/g, "")) - 1 + 12) % 12];
const CYC = [PAL.blue, PAL.teal, PAL.amber, PAL.coral, PAL.violet, PAL.sky, PAL.green, PAL.gold, PAL.plum];
/** 단계 색: 지시받아 · 직접 수행 · 기준까지 결정이 색상부터 갈린다 */
const LVC = ["#eceef3", "#f6c26b", "#2fb59c", "#3a56d4"];
const ZC: Record<string, string> = {
  Z1_EVIDENCE_ESTABLISHED: PAL.blue, Z2_EVIDENCE_INCOMPLETE: PAL.teal, Z3_EVIDENCE_LOW_INTEREST: PAL.violet,
  Z4_INSUFFICIENT_EVIDENCE: PAL.amber, NOT_EXPLORED: "#cfd5df",
};
const IC: Record<string, string> = { HIGH: PAL.coral, MID: "#f5a8b6", LOW: "#e9ecf2" };
const IK: Record<string, string> = { HIGH: "높음", MID: "보통", LOW: "낮음" };
const EXK: Record<string, string> = { SEVERAL: "여러 번", ONCE_OR_TWICE: "한두 번", NONE: "없음" };
const won = (v: number | null | undefined) => (v == null ? "—" : `${Math.round(v / 1e8).toLocaleString("ko-KR")}억 원`);
const josa = (w: string, pair: [string, string]) => { const c = w.charCodeAt(w.length - 1); const has = c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0; return w + (has ? pair[0] : pair[1]); };

/* ───────────────────────── 자료 ───────────────────────── */

async function data() {
  const r: A = await load3(ID);
  const row = await queryOne<{ result_model: ResultModel; created_at: string }>(
    `SELECT result_model, created_at::text FROM v3_snapshots WHERE attempt_id = $1 ORDER BY created_at DESC LIMIT 1`, [ID]);
  const m: A = row!.result_model;
  const content = "sites/pca-platform/content";
  const doms: A[] = J(`${content}/biz-v1-domains.json`).domains;
  const rel: A = J(`${content}/biz-v1-relations.json`);
  const rolePacks: A[] = J(`${content}/biz-role-packs.json`).packs;
  const industry: A = J(`${content}/biz-industry-packs.json`).packs.find((p: A) => p.code === "INDUSTRY_PUBLIC_V1");
  const guide: A = J("data/report-gm/biz-role-guide.json").roles;
  const dart: A = J("data/region/dart-checks.v1.json");
  const overview: A = J("data/region/dart-overview.v1.json");
  const sejong: A = existsSync("data/region/dart-sejong.v1.json") ? J("data/region/dart-sejong.v1.json") : null;
  const kodata = new Set<string>((r.companies ?? []).map((c: A) => c.name));
  /* 영역마다의 관심·경험·배울 뜻(1~5 · 0~2)과 영역을 가리지 않는 공통 판단(0~3).
     깊게 묻지 않은 영역의 칸을 이 응답으로 채운다 */
  const rs = await query<{ item_id: string; value_int: number | null }>(
    `SELECT item_id, value_int FROM v3_responses WHERE attempt_id = $1`, [ID]);
  const resp = Object.fromEntries(rs.map((x) => [x.item_id, x.value_int]));
  const sjorgs: A = existsSync("data/region/sejong-orgs.v1.json") ? J("data/region/sejong-orgs.v1.json") : null;
  return { r, m, doms, rel, rolePacks, industry, guide, dart, overview, sejong, kodata, resp, sjorgs };
}
type D = Awaited<ReturnType<typeof data>>;

/* ───────────────────────── 쪽 틀 ───────────────────────── */

type Page = { part: string; partName: string; title: string; body: string; kind?: "cover" | "outer" | "chapter" | "plain" };

const PARTS: [string, string][] = [
  ["", "들어가며"], ["01", "한눈에 보기"], ["02", "판단 프로파일"], ["03", "12가지 업무 영역"], ["04", "직무 탐색"],
  ["06", "세종·충청에서 찾아보기"], ["02", "자기소개서·면접 준비"], ["07", "실행 로드맵"], ["", "부록"],
];

function shell(p: Page, i: number, total: number, d: D): string {
  if (p.kind === "cover") return `<section class="pg cover">${p.body}</section>`;
  if (p.kind === "outer") return `<section class="pg outer">${p.body}</section>`;
  const head = p.kind === "chapter" ? "" : `<header class="rh"><span class="rh-n">${p.part ? `PART ${p.part}` : ""}</span><span class="rh-t">${E(p.partName)}</span><span class="rh-r">${E(ORG)} · 진로 분석 리포트</span></header>`;
  const foot = `<footer class="rf"><span>CareerMatri · 경영 계열 · ${E(d.r.meta.tier)}</span><span>${E(PERSON)} 님 · ${E(d.r.meta.answeredOn)} 응답</span><span class="rf-no">${i + 1} / ${total}</span></footer>`;
  return `<section class="pg ${p.kind === "chapter" ? "chap" : ""}" data-title="${E(p.title)}">${head}<div class="bd">${p.body}</div>${foot}</section>`;
}

const T = (title: string, dek?: string) => `<div class="ph"><h1>${title}</h1>${dek ? `<p class="dek">${dek}</p>` : ""}</div>`;
const H = (t: string, sub?: string) => `<h3 class="sh">${t}${sub ? `<span>${sub}</span>` : ""}</h3>`;
const band = (label: string, text: string) => `<div class="band"><b>${label}</b><span>${text}</span></div>`;
const tag = (t: string, color?: string) => `<span class="tag" style="${color ? `background:${color}` : ""}">${E(t)}</span>`;
const zoneTag = (z: string) => `<span class="ztag" style="--z:${ZC[z] ?? "#c9ced8"}">${E(ZONE_SAID[z]?.tag ?? z)}</span>`;
const pip = (lv: number | null, est = false) => lv == null
  ? `<span class="pp"><i style="background:${C.l0}"></i><i style="background:${C.l0}"></i><i style="background:${C.l0}"></i><em>해 본 적 없음</em></span>`
  : `<span class="pp${est ? " est" : ""}"><i style="background:${lv >= 1 ? LVC[Math.max(1, lv)] : C.l0}"></i><i style="background:${lv >= 2 ? LVC[lv] : C.l0}"></i><i style="background:${lv >= 3 ? LVC[3] : C.l0}"></i><em>${E(STEP[lv as 0].tag)}${est ? " · 응답 기준" : ""}</em></span>`;
const filled = (label: string, text: string) => `<div class="fl">${label ? `<p class="wl-l">${label}</p>` : ""}<p class="fl-t">${text}</p></div>`;
const lines = (n: number, label?: string) => `<div class="wl">${label ? `<p class="wl-l">${label}</p>` : ""}${"<i></i>".repeat(n)}</div>`;
const ul = (xs: string[], cls = "") => `<ul class="ls ${cls}">${xs.map((x) => `<li>${x}</li>`).join("")}</ul>`;


/* ───────────────────────── 참여자가 상담에서 채운 칸(예시 참여자 이서윤) ─────────────────────────
 * 결과 모델이 정한 판단·묶음·빈자리는 건드리지 않는다. 여기 있는 것은 사람이 채우는 칸뿐이다:
 * 맡은 역할 · 비교 대상 · 결과 수치 · 30초 답변 · 양식. 모두 같은 한 사람의 이야기로 맞춘다.
 */
const FILL = {
  /** 경험 기록 제목의 앞머리 → 맡은 역할 · 비교 대상 · 결과 */
  rec: {
    "청년 일경험 프로그램": {
      role: "인턴 3명 가운데 사업 실적 자료 정리를 맡았습니다. 사업 3개의 분기 자료를 모아 보고서 초안을 썼습니다.",
      compare: "전년 같은 기간 실적과 비교했습니다. 사업마다 참여 인원과 예산 집행률을 나란히 놓았습니다.",
      result: "2026년 7~8월 8주 동안 사업 3개 · 지표 5개를 한 장 표로 정리했고, 주간 보고 준비 시간이 반나절에서 1시간 남짓으로 줄었습니다.",
    },
    "원가회계 팀과제": {
      role: "3명 팀에서 간접비를 제품별로 나누는 부분을 맡았습니다.",
      compare: "기존의 단일 배부율 방식으로 계산한 원가와 비교했습니다.",
      result: "2025년 9~12월 16주. 제품 3개 가운데 하나의 원가가 약 18% 낮게 잡혀 있었음을 보였습니다.",
    },
    "경영전략 캡스톤": {
      role: "4명 팀의 팀장으로 시장 조사 설계와 사업계획 최종 정리를 맡았습니다.",
      compare: "세 가지 안(출장 정비 구독 · 공유 창고 · 반찬 정기배송)을 세종 안 수요 · 초기 비용 · 운영 인력 세 기준으로 비교했습니다.",
      result: "2026년 3~6월 16주. 세종 시민 112명 설문으로 수요를 확인하고 첫해 손익분기 고객 수를 420명으로 잡았습니다. 최종 발표 평가는 A+였습니다.",
    },
  } as Record<string, { role: string; compare: string; result: string }>,
  /** 자기소개서 재료의 빈칸: from 앞머리 → 칸 이름 → 채운 글 */
  story: {
    "경영전략·기획": { "상황과 내 역할": "경영전략 캡스톤(2026-03~06) · 4명 팀의 팀장으로 신사업 세 안을 비교", "무엇과 비교했고 무엇이 달라졌나": "전사 목표와 비교 — 첫해 손익분기 고객 420명을 목표로 세 안 가운데 하나를 고름" },
    "데이터·의사결정": { "상황과 내 역할": "청년 일경험 프로그램(2026-07~08) · 사업 실적 자료 정리 담당", "무엇과 비교했고 무엇이 달라졌나": "지난 기간 값과 비교 — 전년 같은 기간 대비 참여 인원이 줄어든 사업 하나를 찾아 보고서 첫 쪽에 올림" },
    "청년 일경험 프로그램": { "상황과 내 역할": "현장실습·인턴 · 2026-07~08 · 인턴 3명 가운데 실적 자료 정리 담당", "무엇과 비교했고 무엇이 달라졌나": "전년 같은 기간 실적과 비교 — 사업 3개 · 지표 5개를 한 장 표로 정리" },
    "원가회계 팀과제": { "상황과 내 역할": "수업 과제 · 2025-09~12 · 3명 팀에서 간접비 배분 담당", "무엇과 비교했고 무엇이 달라졌나": "단일 배부율 방식과 비교 — 한 제품의 원가가 약 18% 낮게 잡힌 것을 찾음" },
  } as Record<string, Record<string, string>>,
  firstLine: [
    "경영전략 캡스톤에서 4명 팀의 팀장으로 세종 지역 서비스 기업의 신사업 세 안을 비교했고, 첫해 손익분기 고객 수를 기준으로 출장 정비 구독 안을 골라 목표와 지표 표와 사업계획으로 남겼습니다.",
    "청년 일경험 프로그램에서 사업 실적 자료를 맡아 보고에 넣을 지표 다섯 개를 직접 골랐고, 전년 같은 기간과 비교한 한 장 표로 정리해 기관 내부 보고에 썼습니다.",
  ],
  strength: [
    "캡스톤에서 신사업 세 안을 놓고 세종 안 수요 · 초기 비용 · 운영 인력 세 기준을 먼저 정했습니다. 공유 창고 안은 초기 비용이 커 첫해 손익분기를 넘기 어렵다고 보고 버렸고, 출장 정비 구독 안을 골라 목표와 지표 표, 사업계획으로 남겼습니다.",
    "일경험 프로그램에서 실적을 단순 합계로 내지 않고 전년 같은 기간과 비교하는 방법을 골랐습니다. 그 덕에 참여 인원이 줄어든 사업 하나가 드러났고, 그 내용이 분석 보고 첫 쪽에 올라 담당 부서가 하반기 홍보 계획을 다시 짰습니다.",
    "학과 행사 홍보에서 목표를 ‘참여 신청 80명’으로 정하고 채널별 신청 수를 비교했습니다. 반응이 가장 낮은 채널 하나를 접고 SNS 안내를 두 번으로 늘려 신청 86명으로 마감했습니다.",
  ],
  interview: [
    "세 안을 수요 · 초기 비용 · 운영 인력으로 비교 → 공유 창고는 초기 비용 때문에 버림 → 출장 정비 구독을 고르고 첫해 손익분기 고객 420명을 목표로 둠.",
    "합계 대신 전년 같은 기간과 비교하는 방법을 고름 → 참여 인원이 줄어든 사업 하나를 찾아 보고서 첫 쪽에 올림 → 담당 부서가 하반기 홍보 계획을 다시 짬.",
    "가장 가까운 장면은 캡스톤에서 ‘고객 수’와 ‘객단가’ 목표가 부딪혔을 때 첫해에는 고객 수를 먼저 지키기로 한 일입니다. 30일 할 일로 목표·지표 정의표를 만든 뒤, 그 표로 우선순위를 정한 장면을 다시 정리해 답합니다.",
    "캡스톤 손익분기 계산에서 객단가 2만 9천 원과 재구독률 60%를 가정으로 두었습니다. 60일 할 일로 가정마다 근거와 버린 값을 한 줄씩 적은 메모를 만들어, 그 메모를 들고 답합니다.",
    "학과 행사 홍보에서 목표를 신청 80명으로 정했습니다. 지난해 신청 62명을 바탕으로 약 30% 높게 잡았고, 결과는 86명이었습니다.",
    "실적 표의 결론이 한 번 뒤집혔습니다. 사업 하나의 집계 기준이 달랐던 것을 찾아 기준을 맞춘 뒤 다시 계산했고, 보고서에 기준 설명을 한 줄 더했습니다.",
  ],
  frame: { role: "4명 팀의 팀장", basis: "세종 안의 수요, 초기 비용, 운영 인력", drop: "초기 비용이 커 첫해 손익분기를 넘기 어렵다는", result: "첫해 손익분기 고객 420명 목표를 세웠고, 시민 112명 설문으로 그 수요를 확인했음" },
  paragraph: "경영전략 캡스톤에서 세종 지역 서비스 기업의 신사업을 검토할 때, 저는 4명 팀의 팀장을 맡았습니다. 신사업 세 안 가운데 하나를 고르기 위해 세종 안의 수요, 초기 비용, 운영 인력 세 기준을 먼저 정했습니다. 공유 창고 안은 초기 비용이 커 첫해 손익분기를 넘기 어렵다고 보고 제외했고, 출장 정비 구독 안을 골랐습니다. 이 판단을 목표와 지표 표와 사업계획 한 벌로 남겼고, 시민 112명 설문으로 첫해 손익분기 고객 420명의 수요가 있음을 확인했습니다. 이 경험으로 목표를 숫자로 옮기고 그 숫자로 안을 고르는 일이 경영기획의 출발점이라는 것을 배웠습니다.",
  portfolio: [["결과물 이름", "목표와 지표 표"], ["어떤 과제에서", "경영전략 캡스톤 — 세종 지역 서비스 기업 신사업 검토 (2026-03~06)"], ["내가 정한 것", "세 안을 비교할 기준 세 가지(세종 안 수요 · 초기 비용 · 운영 인력)와 기준마다의 목표 수치"], ["비교한 대상과 결과", "전사 목표(첫해 손익분기 고객 420명)와 비교해 출장 정비 구독 안을 고름"], ["이 결과물로 답할 면접 질문", "“여러 안 가운데 하나를 고를 때 무엇을 기준으로 정했나요?”"]],
  roleQ: "캡스톤에서 첫해 목표를 ‘손익분기 고객 420명’으로 정했습니다. 고정비를 객단가와 재구독률로 나눠 계산했고, 설문의 지불 의향 값으로 객단가를 정했습니다. 세 안 가운데 이 숫자를 넘길 수 있는 안이 하나뿐이어서 그 안을 골랐고, 목표가 달라지면 결과가 어떻게 바뀌는지도 함께 적어 두었습니다.",
  selfIntro: "안녕하세요, 경영기획을 준비하는 이서윤입니다. 저는 자료로 근거를 만들고, 그 근거로 선택하는 일을 해 왔습니다. 경영전략 캡스톤에서는 신사업 세 안을 세 가지 기준으로 비교해 하나를 골랐고, 청년 일경험 프로그램에서는 공공기관 사업 실적을 전년과 비교한 보고서를 만들어 내부 보고에 썼습니다. 입사하면 목표를 지표로 옮기고, 그 지표로 성과를 점검하는 일부터 맡아 조직의 결정을 돕고 싶습니다.",
  practice: {
    ROLE_PLAN_V1: ["목표를 지표·조건으로 옮기기", "4학년 2학기 경영기획 실무 수업 팀 과제", "목표·지표 정의표 한 장과 고른 까닭"],
    ROLE_ANALYTICS_V1: ["결과가 결정에 쓰이기", "학과 학생회 행사 만족도 조사 분석", "분석 보고와 그 뒤 바뀐 결정 한 줄"],
  } as Record<string, string[]>,
  read: ["사업부문은 둘입니다(신약 연구개발 · 의약). 직원 수로 보면 신약 연구개발 쪽(177명)이 거의 전부입니다.", "기술이전 계약 건수", "연구개발 회사는 매출이 기술이전에서 나오므로, 계약 건수가 다음 해 매출을 먼저 보여 준다고 판단했습니다."],
  onePager: { org: "한국수자원공사(K-water)", date: "2026-10-21", biz: "댐 · 광역상수도 운영 등 물 관리 사업 (공시 기업개황과 누리집에서 확인)", job: "경영기획 — 경영 목표 수립, 성과 지표 관리, 경영평가 대응", link: "청년 일경험 프로그램에서 공공기관 사업 실적 지표 다섯 개를 정리한 일", made: "보고에 넣을 지표를 직접 골랐고, 전년 비교 분석 보고를 남김", unknown: "2027년 신입 채용 일정과 경영기획 직무기술서 원문" },
  postings: [
    ["세종 소재 공공기관 · 경영기획", "중장기 경영목표 수립, 성과지표 관리", "경영학 기초, 엑셀", "목표와 지표 표"],
    ["대전 소재 공기업 · 기획예산", "예산 편성 · 집행 관리, 실적 보고", "회계 기초, 문서 작성", "원가 계산표"],
    ["세종 본점 상장 제조사 · 경영관리", "사업계획 수립, 월별 실적 분석", "재무제표 읽기, 엑셀", "사업계획 한 벌"],
    ["충청권 연구기관 · 사업관리", "과제 실적 관리, 성과 보고서 작성", "자료 정리, 보고서 작성", "분석 보고"],
    ["세종 소재 공공기관 · 성과평가", "경영평가 지표 관리, 자료 취합", "지표 설계, 통계 기초", "지표 정의표"],
  ],
  weekly: [
    ["캡스톤 사업계획에서 목표 문장 6개를 뽑음", "옮길 목표 3개를 고름", "목표 목록 메모", "재는 방법이 애매한 목표 1개", "목표마다 지표 후보 정하기"],
    ["목표마다 지표 후보를 2개씩 적음", "후보 가운데 하나씩 고름", "지표 후보표", "자료를 구할 수 없는 지표 1개", "재는 방법과 주기 적기"],
    ["지표마다 재는 방법 · 주기 · 자료 출처를 적음", "분기마다 재기로 정함", "목표·지표 정의표 초안", "없음", "상담에서 검토받기"],
    ["상담에서 검토받고 고른 까닭을 한 줄씩 더함", "버린 지표 2개의 까닭을 적음", "목표·지표 정의표 완성본", "없음", "경험 기록에 더하기"],
  ],
  log: [["상담일", "2026-10-21"], ["상담자", "청년일자리 상담 담당"], ["오늘 함께 본 쪽", "01 한눈에 보기 · 02 자기소개서·면접 준비 · 07 실행 로드맵"], ["참여자가 동의한 강점", "경영전략·기획에서 여러 안 가운데 하나를 근거를 들어 고른 일(캡스톤)"], ["이번에 고른 빈자리", "목표를 숫자로 재는 지표로 옮겨 적기"], ["30일 할 일 (어디서 · 무엇을 · 무엇으로 남길지)", "캡스톤 사업계획에서 · 목표 3개를 지표로 옮겨 · 목표·지표 정의표로 남기기"], ["연계할 지원 사업·프로그램", "기관의 청년 일경험 · 취업 지원 프로그램 안내(담당자가 일정 확인 후 연결)"], ["다음 만남 · 가져올 것", "2026-11-18 · 목표·지표 정의표와 주간 점검표 네 줄"]],
};

function chapter(no: string, name: string, promise: string, inside: string[], art: string): Page {
  return {
    part: no, partName: name, title: name, kind: "chapter",
    body: `<div class="ch-top"><span class="ch-k">PART</span><span class="ch-no">${no}</span></div>
      <h1 class="ch-t">${E(name)}</h1><p class="ch-p">${promise}</p>
      <div class="ch-art">${art}</div>
      <div class="ch-in">${H("이 장에 담은 것")}${ul(inside.map(E))}</div>`,
  };
}

/* ───────────────────────── 계산(이미 정해진 값을 모으기만 한다) ───────────────────────── */

function derive(d: D) {
  const { m, r, doms } = d;
  const dm = new Map<string, A>(m.domains.map((x: A) => [x.code, x]));
  const name = (code: string) => r.map.find((x: A) => x.code === code)?.name ?? code;
  const raw = (code: string) => AX.map((a) => { const ax = dm.get(code)?.axes.find((y: A) => y.axis === a); return LV(ax?.state, ax?.missing); });
  /* 깊게 묻지 않은 영역의 칸은 비워 두지 않는다. 그 영역의 경험 응답(없음 · 1~2회 · 3회 이상)과
     영역을 가리지 않는 공통 판단 응답으로 읽는다. 체크리스트 근거가 없으므로 ‘직접 수행’ 위로 올리지 않는다 */
  const COMMON: Record<string, string> = { J1: "CJ_SCOPE", J2: "CJ_REQUIRE", J3: "CJ_GIVEN_REV", J4: "CJ_METHOD", J6: "CJ_COMPARE", J8: "CJ_HANDOFF" };
  const expOf = (code: string) => (d.resp[`G_${code}_EXP`] ?? 0) as number;
  const intOf = (code: string) => (d.resp[`G_${code}_INT`] ?? null) as number | null;
  const leaOf = (code: string) => (d.resp[`G_${code}_LEA`] ?? null) as number | null;
  const est = (code: string) => raw(code).every((v) => v == null);
  const levels = (code: string): (number | null)[] => {
    const r0 = raw(code);
    if (!est(code)) return r0;
    const e = expOf(code);
    return AX.map((a) => {
      if (e === 0) return 0;
      const c = COMMON[a] ? (d.resp[COMMON[a]] ?? 1) as number : 1;
      return Math.max(0, Math.min(c, e === 1 ? 1 : 2));
    });
  };
  const picks = (code: string) => AX.flatMap((a) => (dm.get(code)?.axes.find((y: A) => y.axis === a)?.picks ?? []).map((p: string) => ({ axis: a, pick: p })));
  const asked = r.map.filter((x: A) => x.zone !== "NOT_EXPLORED").map((x: A) => x.code);
  const zones = Object.fromEntries(r.map.map((x: A) => [x.code, x.zone]));
  const def = (code: string) => doms.find((x: A) => x.code === code);
  const counts = {
    picks: r.profile.picks as number, artifacts: r.profile.artifacts as number, records: r.records.length as number,
    z1: r.map.filter((x: A) => x.zone === "Z1_EVIDENCE_ESTABLISHED").length as number,
    z2: r.map.filter((x: A) => x.zone === "Z2_EVIDENCE_INCOMPLETE").length as number,
    ne: r.map.filter((x: A) => x.zone === "NOT_EXPLORED").length as number,
    gaps: m.gaps.length as number,
    owned: asked.reduce((a: number, c: string) => a + levels(c).filter((v) => v === 3).length, 0) as number,
    did: asked.reduce((a: number, c: string) => a + levels(c).filter((v) => v != null && v >= 2).length, 0) as number,
  };
  /* KODATA 기업을 가리키는 할 일은 외부 배포본에서 공시 기반 할 일로 바꾼다 */
  const touches = (s: string) => [...d.kodata].some((n) => s.includes(n)) || /AI 서비스/.test(s);
  return { dm, name, levels, raw, est, expOf, intOf, leaOf, picks, asked, zones, def, counts, touches };
}
type X = ReturnType<typeof derive>;

/* ───────────────────────── 들어가며 ───────────────────────── */


const MARK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="100%" height="100%" role="img" aria-label="CareerMatri"> <rect width="100%" height="100%" rx="34" fill="#2F6BFF"/> <g transform="translate(60 60) scale(2.9) translate(-12 -12)"> <path d="M5 19V5l7 8 7-8v14" fill="none" stroke="#FFFFFF" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/> </g> </svg> `;

function outer(d: D, x: X): Page {
  const r = d.r;
  const series = r.radar.series.map((s: A) => ({ name: "", levels: s.levels, color: "#ffffff" }));
  return {
    part: "", partName: "", title: "겉표지", kind: "outer",
    body: `<div class="oc-top"><span class="oc-mark">${MARK}</span><span class="oc-brand">CareerMatri</span><span class="oc-tier">PRO</span></div>
      <div class="oc-art">${radar(AX.map(() => ""), series, { size: 520, ring: false })}</div>
      <div class="oc-mid">
        <p class="oc-k">청년 진로·일자리 상담 연계 프로그램</p>
        <h1 class="oc-t">진로 분석 리포트</h1>
        <p class="oc-s">경영 계열 · 경영기획 지망</p>
      </div>
      <div class="oc-who">
        <div><span>참여자</span><b>${E(PERSON)}</b></div>
        <div><span>응답일</span><b>${E(r.meta.answeredOn)}</b></div>
        <div><span>발행</span><b>${E(ORG)}</b></div>
      </div>
      <div class="oc-foot"><b>${E(ORG)}</b><span>×</span><b>CareerMatri</b><em>이 리포트는 참여자 본인과, 본인이 동의한 경우의 상담 담당자만 열람합니다.</em></div>`,
  };
}

function cover(d: D, x: X): Page {
  const r = d.r;
  const series = r.radar.series.map((s: A, i: number) => ({ name: s.name, levels: s.levels, color: [PAL.blue, PAL.coral, PAL.teal][i] }));
  return {
    part: "", partName: "", title: "표지", kind: "cover",
    body: `<div class="cv-top"><span class="cv-org">${E(ORG)}</span><span class="cv-s">청년 진로·일자리 상담 연계 프로그램</span></div>
      <div class="cv-mid">
        <p class="cv-k">CareerMatri 진로 분석 리포트 · PRO</p>
        <h1 class="cv-t">${E(PERSON)} 님의<br>진로 분석 결과</h1>
        <p class="cv-d">${E(r.summary.lead)}</p>
        <div class="cv-art">${radar(r.radar.axes.map((a: A) => a.label), series, { size: 420, ring: false })}</div>
        <div class="cv-legend">${series.map((s: A) => `<span><i style="background:${s.color}"></i>${E(s.name)}</span>`).join("")}</div>
      </div>
      <div class="cv-meta">
        <div><span>응답일</span><b>${E(r.meta.answeredOn)}</b></div>
        <div><span>참여자 · 전공 계열</span><b>${E(PERSON)} · ${E(r.meta.department)} · ${E(r.meta.specialization)}</b></div>
        <div><span>목표 직무 · 산업</span><b>${E(r.strategy.roleName)} · 공공·공기관</b></div>
        <div><span>확인한 근거</span><b>고른 항목 ${x.counts.picks}개 · 결과물 ${x.counts.artifacts}개 · 경험 기록 ${x.counts.records}건</b></div>
      </div>
      <div class="cv-foot"><b>열람 안내</b> 이 리포트는 참여자 본인과, 본인이 동의한 경우 ${E(ORG)} 상담 담당자만 열람합니다. 점수·순위·합격 가능성은 계산하지 않았습니다.</div>`,
  };
}

function about(d: D, x: X): Page {
  return {
    part: "", partName: "들어가며", title: "이 리포트에 대해",
    body: T("이 리포트는 ‘무엇을 해 봤고, 다음에 무엇을 하면 되는지’를 알려 줍니다", "점수나 등수를 내지 않습니다. 참여자가 고른 경험과 결과물을 근거로 지금 설명할 수 있는 일과 비어 있는 일을 나누고, 그 빈자리를 채울 할 일을 적었습니다.") +
      `<div class="g3">
        <div class="card"><p class="k">재는 것</p><h4>여덟 가지 업무 판단</h4><p>과제 범위를 정하는 일부터 결과가 결정에 쓰이는 일까지, 경영계열 업무에서 되풀이되는 판단 여덟 가지를 12가지 업무 영역마다 읽었습니다.</p></div>
        <div class="card"><p class="k">근거</p><h4>고른 장면과 결과물</h4><p>응답만으로 판단하지 않습니다. 체크리스트에서 실제로 해 본 장면과 남긴 결과물을 함께 골라야 ‘기준까지 직접 정함’ 단계로 올라갑니다.</p></div>
        <div class="card"><p class="k">내놓는 것</p><h4>할 일과 결과물 이름</h4><p>비어 있는 판단마다 ‘어디서, 무엇을, 무엇으로 남길지’를 적었습니다. 30·60·90일 계획과 지원 서류 재료로 이어집니다.</p></div>
      </div>` +
      H("기관 담당자께") +
      `<div class="two"><div>${ul([
        "참여자와 상담할 때는 <b>01 한눈에 보기</b>와 <b>07 실행 로드맵</b>만 함께 보셔도 상담의 줄기가 잡힙니다.",
        "그래프는 모두 <b>단계 이름</b>이나 <b>센 개수</b>를 그린 것입니다. 백분율·적합도·합격 가능성은 계산하지 않습니다.",
        "‘넓혀 갈 영역’은 관심·경험 응답과 공통 판단 응답으로 단계를 읽은 영역입니다. 경험 기록이 붙으면 단계가 더 정확해집니다.",
      ])}</div><div>${ul([
        "기업 정보는 <b>금융감독원 전자공시(OpenDART)</b>로 확인한 것만 실었습니다. 채용 여부는 확인하지 않았습니다.",
        "이 리포트는 직업정보 제공이며 취업 알선이 아닙니다. 지원은 참여자가 직접 합니다.",
        "경험의 맡은 역할 · 성과 수치 · 기간은 참여자가 상담에서 직접 채운 내용입니다.",
      ])}</div></div>` +
      H("참여자 정보") +
      `<table class="tb"><tbody>
        <tr><th>이름</th><td>${E(PERSON)}</td><th>응답일</th><td>${E(d.r.meta.answeredOn)}</td></tr>
        <tr><th>전공 계열</th><td>${E(d.r.meta.department)} · ${E(d.r.meta.specialization)}</td><th>검사 등급</th><td>PRO (여덟 판단 · 근거 · 경험 번역까지)</td></tr>
        <tr><th>목표</th><td>${E(d.r.strategy.roleName)} · 공공·공기관 · 공기업형 조직</td><th>응답 품질</th><td>${d.m.response_quality.flag === "OK" ? "고르게 답함(다시 볼 응답 없음)" : "다시 볼 응답 있음"}</td></tr>
        <tr><th>경험 기록</th><td colspan="3">${d.r.records.map((rc: A) => `${E(rc.title)} <span class="mut">(${E(rc.period)})</span>`).join("<br>")}</td></tr>
      </tbody></table>` +
      band("열람 범위", "이 결과지는 참여자 본인과, 본인이 동의한 경우에만 기관 담당자가 봅니다. 기관에는 다섯 명 미만이면 수를 내지 않는 집계만 제공됩니다."),
  };
}

function toc(pages: Page[]): Page {
  const starts: { no: string; name: string; at: number; titles: string[] }[] = [];
  pages.forEach((p, i) => {
    if (p.kind === "cover" || p.kind === "outer") return;
    const last = starts[starts.length - 1];
    if (!last || last.name !== p.partName) starts.push({ no: p.part, name: p.partName, at: i + 1 + (i >= 2 ? 1 : 0), titles: p.kind === "chapter" ? [] : [p.title] });
    else if (p.kind !== "chapter" && starts[starts.length - 1].titles.length < 6) starts[starts.length - 1].titles.push(p.title);
  });
  return {
    part: "", partName: "들어가며", title: "차례",
    body: T("차례") + `<div class="toc">${starts.filter((s) => s.name !== "들어가며").map((s) => `<div class="toc-r"><span class="toc-n">${s.no || "··"}</span><div class="toc-b"><b>${E(s.name)}</b><span>${s.titles.map(E).join(" · ")}</span></div><span class="toc-p">${s.at}</span></div>`).join("")}</div>`,
  };
}

function howToRead(): Page {
  const z = Object.entries(ZONE_SAID);
  return {
    part: "", partName: "들어가며", title: "읽는 법",
    body: T("그래프와 표는 네 단계와 다섯 묶음으로 읽습니다", "모든 그래프가 같은 말을 씁니다. 한 번 익혀 두면 어느 쪽에서나 같은 뜻으로 읽힙니다.") +
      H("판단 단계 넷", "방사형 그래프와 단계 칸에서 씁니다") +
      `<div class="steps4">${[0, 1, 2, 3].map((k) => `<div class="st4"><div class="st4-b">${[1, 2, 3].map((j) => `<i style="background:${k >= j ? LVC[Math.max(1, k)] : C.l0}"></i>`).join("")}</div><b>${E(STEP[k as 0].tag)}</b><p>${E(STEP[k as 0].said)}</p></div>`).join("")}</div>` +
      H("영역 묶음 다섯", "12가지 영역 지도와 고리 그래프에서 씁니다") +
      `<div class="zones5">${z.map(([k, v]) => `<div class="zn"><span class="zsw" style="background:${ZC[k]}"></span><div><b>${E(v.tag)}</b><p>${E(v.said)}</p></div></div>`).join("")}</div>` +
      H("근거의 층", "문장마다 어디서 온 말인지 표시합니다") +
      `<table class="tb"><thead><tr><th>표시</th><th>뜻</th><th>예</th></tr></thead><tbody>
        <tr><td>${tag("응답", C.navy)}</td><td>검사 문항에 답한 단계</td><td>‘직접 맡아 해 봤다’고 답함</td></tr>
        <tr><td>${tag("고른 근거", C.blue)}</td><td>체크리스트에서 직접 고른 장면과 결과물</td><td>‘목표와 지표를 표로 정리했다’</td></tr>
        <tr><td>${tag("경험 기록", C.teal)}</td><td>참여자가 플랫폼에 적어 둔 활동</td><td>캡스톤 · 현장실습 · 팀 과제</td></tr>
        <tr><td>${tag("직무 안내", C.amber)}</td><td>직무 일반에 대한 안내(개인 판정이 아님)</td><td>경영기획이 하는 일과 과정</td></tr>
        <tr><td>${tag("공시", "#6b7486")}</td><td>OpenDART 기업개황·사업보고서</td><td>본점 주소 · 매출액 · 직원 수</td></tr>
      </tbody></table>` +
      `<div class="two">
        <div class="note"><b>방사형 그래프</b><p>가운데가 ‘해 본 적 없음’, 바깥 고리가 ‘기준까지 직접 정함’입니다. 넓게 퍼진 쪽이 지금 설명할 수 있는 판단입니다. 면적을 점수로 바꾸지 않습니다.</p></div>
        <div class="note"><b>옅은 칸 · 응답 기준</b><p>검사는 관심이 높은 영역부터 판단 여덟 가지를 깊게 묻고, 나머지 영역은 그 영역의 경험 응답과 영역을 가리지 않는 공통 판단 응답으로 단계를 읽습니다. 그 칸은 옅은 색과 ‘응답 기준’ 표시로 나눕니다.</p></div>
      </div>`,
  };
}

function counselor(d: D, x: X): Page {
  const r = d.r;
  return {
    part: "", partName: "들어가며", title: "상담자를 위한 한 쪽",
    body: T("상담 40분이라면 이 순서로 보시면 됩니다", "참여자가 결과지를 먼저 읽고 오지 않아도 진행할 수 있게 짰습니다. 각 단계에서 펼칠 쪽을 함께 적었습니다.") +
      `<div class="flow5">${[
        ["5분", "지금 상태 확인", "01 한눈에 보기의 세 가지를 함께 읽고, 참여자가 동의하는지 묻습니다."],
        ["10분", "강점 하나 깊게", "가장 분명한 강점 한 영역을 골라 ‘그때 무엇을 기준으로 정했는지’를 말하게 합니다."],
        ["10분", "빈자리 하나 고르기", "먼저 채울 판단 세 가지 가운데 이번 학기에 할 수 있는 것 하나를 고릅니다."],
        ["10분", "할 일 정하기", "30일 할 일을 ‘어디서 · 무엇을 · 무엇으로 남길지’ 세 칸으로 적습니다."],
        ["5분", "다음 만남 약속", "결과물이 생기면 경험 기록에 더하고 다시 보기로 합니다."],
      ].map(([t, h, b]) => `<div class="f5"><span class="f5-t">${t}</span><b>${h}</b><p>${b}</p></div>`).join("")}</div>` +
      H("이 참여자에게 먼저 물어볼 것") +
      `<ol class="qs">${[
        r.strengths[0]?.question,
        `캡스톤에서 ‘세종 지역 서비스 기업 신사업 검토’를 하셨는데, 그 과제의 범위를 누가 어떻게 정했나요?`,
        `현장실습에서 정리한 실적 자료가 기관 내부 보고에 쓰였다고 적으셨습니다. 그 보고를 보고 무엇이 정해졌나요?`,
        r.priorities[0]?.ask,
      ].filter(Boolean).map((q: string) => `<li>${E(q.replace(/^“|”$/g, ""))}</li>`).join("")}</ol>` +
      `<div class="two">
        <div class="note warm"><b>이렇게 말하지 않습니다</b>${ul(["“경영기획에 적합합니다”", "“합격 가능성이 높습니다”", "“이 기업에 지원하세요”"])}</div>
        <div class="note"><b>이렇게 말합니다</b>${ul(["“기준을 직접 정해 본 일이 두 영역에 있습니다”", "“결과가 결정에 쓰인 장면은 아직 적혀 있지 않습니다”", "“이 기관의 사업보고서에서 사업 구조를 먼저 보세요”"])}</div>
      </div>` +
      band("상담 기록", `부록의 상담 기록지(마지막 장 앞)를 출력해 쓰시면 다음 만남에서 무엇이 달라졌는지 바로 비교할 수 있습니다.`),
  };
}

/* ───────────────────────── 01 한눈에 ───────────────────────── */

function p1glance(d: D, x: X): Page {
  const r = d.r;
  const notAsked = r.map.filter((z: A) => z.interest === "HIGH" && z.zone === "NOT_EXPLORED").map((z: A) => z.name);
  const glance = r.summary.glance.filter((g: A) => !/기업/.test(g.label)).map((g: A) => (/관심은 높고/.test(g.label) && g.value === "없음" && notAsked.length ? { ...g, value: `${notAsked.join(" · ")} (관심 높음 · 해 본 장면이 아직 적음)` } : g));
  return {
    part: "01", partName: "한눈에 보기", title: "핵심 진단 요약",
    body: T("지금 설명할 수 있는 일은 ‘기획과 데이터’ 두 영역에 모여 있습니다", E(r.summary.lead)) +
      `<div class="pts">${r.summary.points.map((p: A, i: number) => `<div class="pt"><span class="pt-n">${i + 1}</span><div><p class="k">${E(p.label)}</p><h4>${E(p.meaning)}</h4><p class="mut">${E(p.fact)}</p><p class="pt-a"><b>할 일</b> ${E(String(p.action).replace(/\(‘역량 개발 우선순위’ 장\)/, "(07 실행 로드맵)"))}</p><p class="pt-l">${E(p.limit)}</p></div></div>`).join("")}</div>` +
      `<table class="tb tb-k"><tbody>${glance.map((g: A) => `<tr><th>${E(g.label)}</th><td>${E(g.value)}</td></tr>`).join("")}</tbody></table>`,
  };
}

/* 글을 한 줄 n 자로 끊는다(낱말 경계 먼저) */
function wrapT(text: string, n: number): string[] {
  const out: string[] = []; let cur = "";
  for (const w of text.split(/\s+/).filter(Boolean)) {
    const add = cur ? ` ${w}` : w;
    if (cur && [...(cur + add)].length > n) { out.push(cur); cur = w; } else cur += add;
  }
  if (cur) out.push(cur);
  return out;
}
const svgText = (lines: string[], x: number, y: number, o: { size?: number; color?: string; weight?: number; anchor?: string; lh?: number } = {}) =>
  `<text x="${x}" y="${y}" font-size="${o.size ?? 12}" fill="${o.color ?? C.ink}" font-weight="${o.weight ?? 500}" text-anchor="${o.anchor ?? "middle"}">${lines.map((l, i) => `<tspan x="${x}" dy="${i ? (o.lh ?? 1.35) * (o.size ?? 12) : 0}">${E(l)}</tspan>`).join("")}</text>`;

/** 12가지 영역을 ‘지금 무엇을 할지’ 네 갈래로 나눈다. 결과 모델의 묶음과 응답만 쓴다 */
function bucketOf(d: D, x: X, z: A): "A" | "B" | "C" | "D" {
  if (z.zone === "Z1_EVIDENCE_ESTABLISHED") return "A";
  if (z.zone === "Z2_EVIDENCE_INCOMPLETE" || z.zone === "Z3_EVIDENCE_LOW_INTEREST") return "B";
  if (z.interest === "HIGH" || (x.leaOf(z.code) ?? 0) >= 4) return "C";
  return "D";
}
const BUCKET: Record<string, { head: string; act: string; color: string; ink: string }> = {
  A: { head: "지원서에 바로 쓴다", act: "결과물 이름과 정한 기준을 한 문단으로", color: PAL.blue, ink: "#fff" },
  B: { head: "결과물을 하나 더 남긴다", act: "해 본 일에 비교 기록이나 문서를 붙이기", color: PAL.teal, ink: "#fff" },
  C: { head: "짧은 과제로 겪어 본다", act: "수업·동아리에서 4주짜리 과제 하나", color: PAL.amber, ink: "#fff" },
  D: { head: "지금은 미뤄 둔다", act: "다른 영역을 먼저 다지고 필요할 때", color: "#9aa6bb", ink: "#fff" },
};

function p1tree(d: D, x: X): Page {
  const r = d.r;
  const groups: Record<string, string[]> = { A: [], B: [], C: [], D: [] };
  r.map.forEach((z: A) => groups[bucketOf(d, x, z)].push(z.name));
  const W = 700, H = 470;
  const box = (cx: number, y: number, w: number, h: number, fill: string, stroke: string, lines: string[], o: { size?: number; color?: string; weight?: number } = {}) =>
    `<rect x="${cx - w / 2}" y="${y}" width="${w}" height="${h}" rx="10" fill="${fill}" stroke="${stroke}" stroke-width="1.4"/>` +
    svgText(lines, cx, y + h / 2 - ((lines.length - 1) * (o.size ?? 12) * 1.35) / 2 + (o.size ?? 12) * 0.36, o);
  const edge = (x1: number, y1: number, x2: number, y2: number, label: string) => {
    const my = (y1 + y2) / 2;
    return `<path d="M${x1} ${y1} C${x1} ${my}, ${x2} ${my}, ${x2} ${y2}" fill="none" stroke="#b7c2d6" stroke-width="2"/>` +
      `<rect x="${(x1 + x2) / 2 - 17}" y="${my - 10}" width="34" height="19" rx="9.5" fill="#fff" stroke="#b7c2d6"/>` +
      svgText([label], (x1 + x2) / 2, my + 4, { size: 10.5, color: C.ink2, weight: 700 });
  };
  const leafX = [92, 268, 444, 616];
  const keys = ["A", "B", "C", "D"] as const;
  const svg = `<svg viewBox="0 0 ${W} ${H}" width="100%" xmlns="http://www.w3.org/2000/svg" font-family="Pretendard, 'Noto Sans KR', sans-serif">
    ${edge(350, 52, 190, 102, "있음")}${edge(350, 52, 530, 102, "없음")}
    ${edge(190, 150, leafX[0], 214, "예")}${edge(190, 150, leafX[1], 214, "아직")}
    ${edge(530, 150, leafX[2], 214, "예")}${edge(530, 150, leafX[3], 214, "아니오")}
    ${box(350, 6, 300, 46, C.navy, C.navy, [`내 결과 · 12가지 업무 영역`], { size: 14, color: "#fff", weight: 800 })}
    ${box(190, 102, 250, 48, "#eef3fc", "#c9d6ee", ["해 본 장면을 체크리스트에서", "골랐나요?"], { size: 11.5, color: C.navy, weight: 700 })}
    ${box(530, 102, 250, 48, "#eef3fc", "#c9d6ee", ["관심이나 배울 뜻이", "높게 나왔나요?"], { size: 11.5, color: C.navy, weight: 700 })}
    ${keys.map((k, i) => {
      const b = BUCKET[k], cx = leafX[i], g = groups[k];
      const top = 214;
      return `<rect x="${cx - 82}" y="${top}" width="164" height="${H - top - 4}" rx="10" fill="#fff" stroke="${b.color}" stroke-width="1.6"/>
        <rect x="${cx - 82}" y="${top}" width="164" height="50" rx="10" fill="${b.color}"/><rect x="${cx - 82}" y="${top + 38}" width="164" height="12" fill="${b.color}"/>
        ${svgText(wrapT(b.head, 10), cx, top + 21, { size: 12.5, color: b.ink, weight: 800 })}
        ${svgText([`${g.length}곳`], cx, top + 72, { size: 20, color: b.color === "#9aa6bb" ? C.ink2 : b.color, weight: 800 })}
        ${svgText(g.length ? g : ["해당 영역 없음"], cx, top + 98, { size: 11, color: C.ink, weight: 600, lh: 1.5 })}
        ${svgText(wrapT(b.act, 12), cx, H - 34, { size: 9.5, color: C.ink3, weight: 500 })}`;
    }).join("")}
  </svg>`;
  return {
    part: "01", partName: "한눈에 보기", title: "내 결과에 따라 무엇을 할까",
    body: T("12가지 영역은 지금 할 일에 따라 네 갈래로 나뉩니다", "두 가지 질문만 따라가면 영역마다 이번 학기에 무엇을 할지 정해집니다. 갈래는 응답과 고른 근거로 정했고, 점수는 쓰지 않았습니다.") +
      `<div class="wide-art">${svg}</div>` +
      `<div class="g4">${keys.map((k) => `<div class="b4" style="--c:${BUCKET[k].color}"><b>${E(BUCKET[k].head)}</b><p>${groups[k].length ? groups[k].map(E).join(" · ") : "해당 영역 없음"}</p></div>`).join("")}</div>` +
      band("이번 학기에는", `왼쪽 두 갈래(${groups.A.length + groups.B.length}곳)는 이미 해 본 일을 지원서 근거로 바꾸는 자리이고, ‘짧은 과제로 겪어 본다’ ${groups.C.length}곳 가운데 하나를 골라 4주 과제로 시작하면 됩니다.`),
  };
}

function p1action(d: D, x: X): Page {
  const r = d.r;
  const pl = plan(d, x).filter((p: A) => /일$/.test(p.period));
  const strengths = r.strengths.slice(0, 3);
  const pri = r.priorities.slice(0, 3);
  const col = (head: string, sub: string, color: string, cards: string[]) =>
    `<div class="am-col"><div class="am-h" style="--c:${color}"><b>${head}</b><span>${sub}</span></div>${cards.join("")}</div>`;
  const card = (t: string, s: string, color: string, tagT?: string) =>
    `<div class="am-c" style="--c:${color}">${tagT ? `<span class="am-t">${E(tagT)}</span>` : ""}<b>${E(t)}</b><span>${E(s)}</span></div>`;
  const goalRole = r.strategy.roleName;
  return {
    part: "01", partName: "한눈에 보기", title: "결과에서 할 일까지 한 장",
    body: T("가진 것에서 출발해 90일 뒤 지원 서류까지 갑니다", "왼쪽에서 오른쪽으로 읽습니다. 강점은 그대로 쓰고, 목표 직무에 꼭 필요한데 비어 있는 판단 세 가지를 90일 동안 채웁니다.") +
      `<div class="am">
        ${col("지금 가진 강점", "근거가 확인된 영역", C.navy, strengths.map((s: A) => card(s.name, `남긴 것: ${s.artifacts.slice(0, 2).join(" · ")}`, C.navy, ZONE_SAID[s.zone]?.tag)))}
        ${col("먼저 채울 판단", `${goalRole}에 필요한 빈자리`, C.amber, pri.map((p: A) => card(p.title, `${p.domain} · ${p.when}`, C.amber, `${p.order}순위`)))}
        ${col("90일 할 일", "기간마다 결과물 둘", C.teal, ["30일", "60일", "90일"].map((per) => { const xs = pl.filter((p: A) => p.period === per); return card(per, xs.map((p: A) => p.output).join(" · "), C.teal); }))}
        <div class="am-col am-goal"><div class="am-h" style="--c:${C.rose}"><b>도착점</b><span>90일 뒤</span></div>
          <div class="am-g"><p class="k">목표 직무</p><h4>${E(goalRole)}</h4><p class="mut">공공·공기관 · 공기업형 조직</p>
          <p class="k" style="margin-top:3mm">손에 쥘 것</p><p>자기소개서 문단 · 면접 답변 메모 · 결과물 ${x.counts.artifacts + pl.length}건</p>
          <p class="k" style="margin-top:3mm">찾아볼 곳</p><p>세종 기업 ${d.sjorgs?.orgs?.length ?? d.sejong?.orgs?.length ?? 0}곳 가운데 ‘잘 맞는 곳’(06장)</p></div></div>
      </div>` +
      H("목표 직무가 보는 판단, 지금 어디까지 왔나", `${goalRole} · 바깥 칸이 ‘기준까지 직접 결정’`) +
      `<div class="am-axes">${(d.rolePacks.find((p: A) => p.code === r.strategy.roleCode)?.required_axes ?? []).concat(pri.map((p: A) => p.axis).filter(Boolean)).filter((a: string, i: number, arr: string[]) => a && arr.indexOf(a) === i).slice(0, 4).map((a: string) => {
        const lv = r.radar.best.find((b: A) => b.axis === a)?.level ?? 0;
        return `<div class="am-ax"><b>${E(AXN[a])}</b><div class="am-bar">${[1, 2, 3].map((k) => `<i class="${lv >= k ? "on" : ""}"></i>`).join("")}</div><span>${E(STEP[lv as 0].tag)}${lv >= 3 ? " · 지원서에 쓰기" : " · 90일 할 일로 채우기"}</span></div>`;
      }).join("")}</div>` +
      band("한 줄로", `강점 ${strengths.length}곳은 그대로 지원서에 쓰고, ${pri[0]?.title ?? "첫 할 일"}부터 시작합니다.`),
  };
}

function p1dash(d: D, x: X): Page {
  const k = x.counts;
  const zoneParts = [
    { label: "근거 갖춤", value: k.z1, color: ZC.Z1_EVIDENCE_ESTABLISHED }, { label: "근거 일부", value: k.z2, color: ZC.Z2_EVIDENCE_INCOMPLETE },
    { label: "넓혀 갈 영역", value: k.ne, color: ZC.Z4_INSUFFICIENT_EVIDENCE },
  ];
  const ints = ["HIGH", "MID", "LOW"].map((v) => ({ label: `관심 ${IK[v]}`, value: d.r.map.filter((z: A) => z.interest === v).length, color: IC[v] }));
  const tiles = [
    ["기준까지 직접 정한 판단", `${k.owned}`, "개", "깊게 물은 세 영역에서"], ["직접 수행한 판단", `${k.did}`, "개", "기준까지 결정한 것 포함"],
    ["체크리스트에서 고른 장면", `${k.picks}`, "개", `그중 결과물 ${k.artifacts}개`], ["경험 기록", `${k.records}`, "건", "캡스톤·팀 과제·현장실습"],
    ["근거 갖춘 영역", `${k.z1}`, "곳", "12가지 영역 가운데"], ["먼저 채울 빈자리", `${k.gaps}`, "곳", "판단 단위"],
  ];
  return {
    part: "01", partName: "한눈에 보기", title: "숫자로 본 근거",
    body: T("세어 보면 이렇습니다", "아래 수는 점수가 아니라 센 개수입니다. 무엇을 얼마나 골랐고, 어디에 근거가 모였는지만 보여 줍니다.") +
      `<div class="kpis">${tiles.map(([a, b, u, c]) => `<div class="kpi"><p>${a}</p><b>${b}<small>${u}</small></b><span>${c}</span></div>`).join("")}</div>` +
      `<div class="two">
        <div class="card cen">${H("12가지 영역은 어디에 놓였나", "영역 묶음")}${donut(zoneParts, { size: 230, center: [`${k.z1 + k.z2}`, "근거를 찾은 영역"] })}<div class="lg">${zoneParts.map((p) => `<span><i style="background:${p.color}"></i>${p.label} ${p.value}곳</span>`).join("")}</div></div>
        <div class="card cen">${H("관심은 어떻게 나뉘었나", "12가지 영역의 관심 정도")}${donut(ints, { size: 230, center: [`${ints[0].value}`, "관심 높은 영역"] })}<div class="lg">${ints.map((p) => `<span><i style="background:${p.color}"></i>${p.label} ${p.value}곳</span>`).join("")}</div></div>
      </div>` +
      band("읽는 법", `관심이 높은 영역은 ${ints[0].value}곳이고, 체크리스트 근거까지 찾은 곳은 ${k.z1 + k.z2}곳입니다. 관심이 높은데 아직 해 본 장면이 적은 재무·투자 판단과 회계·원가가 다음 활동에서 경험을 만들 자리입니다.`),
  };
}

function p1ring(d: D, x: X): Page {
  const r = d.r;
  const secs = r.map.map((z: A) => ({ name: z.name, fill: ZC[z.zone], ring2: IC[z.interest], mark: z.zone === "NOT_EXPLORED" ? C.ink2 : "#fff" }));
  return {
    part: "01", partName: "한눈에 보기", title: "12가지 업무 영역 지도",
    body: T("12가지 영역 가운데 세 곳에 경험이 있고, 두 곳은 근거까지 갖췄습니다", "안쪽 색은 영역 묶음, 바깥 얇은 띠는 관심 정도입니다. 숫자는 영역 번호이고 04장의 쪽 차례와 같습니다.") +
      `<div class="wide-art ring-art">${ring(secs, { size: 520, center: [`${x.counts.z1}`, "근거 갖춘 영역"] })}</div>` +
      `<div class="lg lg-row">${Object.entries(ZONE_SAID).filter(([k]) => r.map.some((z: A) => z.zone === k)).map(([k, v]) => `<span><i style="background:${ZC[k]}"></i>${E(v.tag)}</span>`).join("")}${["HIGH", "MID", "LOW"].map((v) => `<span><i class="thin" style="background:${IC[v]}"></i>관심 ${IK[v]}</span>`).join("")}</div>` +
      `<table class="tb tb-xs"><thead><tr><th>번호</th><th>영역</th><th>묶음</th><th>관심</th><th>단계를 읽은 근거</th></tr></thead><tbody>${r.map.map((z: A, i: number) => `<tr><td>${i + 1}</td><td><b>${E(z.name)}</b></td><td>${zoneTag(z.zone)}</td><td>${IK[z.interest]}</td><td>${z.zone === "NOT_EXPLORED" ? `경험 ${({ 0: "없음", 1: "1~2회", 2: "3회 이상" } as Record<number, string>)[x.expOf(z.code)]} · 공통 판단 응답` : "여덟 판단 응답 · 체크리스트 근거"}</td></tr>`).join("")}</tbody></table>`,
  };
}

function p1quad(d: D, x: X): Page {
  const r = d.r;
  const dots = r.map.map((z: A, i: number) => ({ label: z.name, x: z.interest === "HIGH" ? 2 : z.interest === "MID" ? 1 : 0, y: z.depth ?? 0, color: DC(z.code), n: i + 1 }));
  return {
    part: "01", partName: "한눈에 보기", title: "관심과 경험의 사분면",
    body: T("관심이 높은데 아직 경험이 없는 영역이 둘 있습니다", "가로는 관심 정도, 세로는 그 영역에서 가장 깊이 해 본 단계입니다. 오른쪽 위로 갈수록 ‘하고 싶고 해 본’ 영역입니다.") +
      `<div class="wide-art">${quadrant(dots, { width: 680, xNames: ["관심 낮음", "보통", "관심 높음"], yNames: ["아직 없음", "지시받아 수행", "직접 수행", "기준까지 결정"] })}</div>` +
      `<div class="g3">
        <div class="note"><b>오른쪽 위 · 하고 싶고 해 본 영역</b><p>${r.map.filter((z: A) => z.interest === "HIGH" && (z.depth ?? 0) >= 2).map((z: A) => E(z.name)).join(", ")}. 지원서의 중심 이야기가 여기서 나옵니다.</p></div>
        <div class="note warm"><b>오른쪽 아래 · 하고 싶은데 아직인 영역</b><p>${r.map.filter((z: A) => z.interest === "HIGH" && !(z.depth >= 1)).map((z: A) => E(z.name)).join(", ")}. 다음 학기에 짧게라도 겪어 볼 영역입니다.</p></div>
        <div class="note"><b>왼쪽 · 관심이 낮은 영역</b><p>${r.map.filter((z: A) => z.interest === "LOW").map((z: A) => E(z.name)).join(", ")}. 지금은 우선순위에서 내려 두어도 됩니다.</p></div>
      </div>` + band("상담에서", "오른쪽 아래 칸의 영역 하나를 골라 ‘이번 학기에 짧게라도 겪어 볼 수 있는 과제’를 함께 찾아보세요. 겪어 본 뒤 경험 기록에 더하면 이 그림의 점이 위로 올라갑니다."),
  };
}

function p1best(d: D, x: X): Page {
  const r = d.r;
  const rows = r.radar.best.map((b: A) => ({ label: AXN[b.axis], value: b.level, color: LVC[Math.max(1, b.level)], note: b.where.join(" · ") }));
  return {
    part: "01", partName: "한눈에 보기", title: "판단 여덟 가지의 가장 깊은 단계",
    body: T("여덟 판단 가운데 넷은 기준까지 직접 정해 봤습니다", "영역을 가리지 않고, 판단마다 가장 깊이 해 본 단계를 모았습니다. 막대 오른쪽은 그 단계가 나온 영역입니다.") +
      `<div class="wide-art">${hbars(rows, { max: 3, width: 690, label: 200, ticks: ["지시받아 수행", "직접 수행", "기준까지 결정"], row: 40, valueText: (b) => (b as A).note })}</div>` +
      `<table class="tb tb-s"><thead><tr><th>판단</th><th>무엇을 뜻하나</th><th>업무 장면 예</th></tr></thead><tbody>${AX.map((a) => `<tr><td><b>${E(JUDGE[a].name)}</b></td><td>${E(JUDGE[a].plain)}</td><td class="mut">${E(JUDGE[a].scene)}</td></tr>`).join("")}</tbody></table>`,
  };
}

function p1role(d: D, x: X): Page {
  const r = d.r, dir = r.directions.find((z: A) => z.goal) ?? r.directions[0];
  const pack = d.rolePacks.find((p: A) => p.code === dir.code);
  const best = Object.fromEntries(r.radar.best.map((b: A) => [b.axis, b.level]));
  const rows = (pack?.required_axes ?? []).map((a: string) => ({ label: AXN[a], value: best[a] ?? 0, color: LVC[Math.max(1, best[a] ?? 0)] }));
  return {
    part: "01", partName: "한눈에 보기", title: "목표 직무 준비 한눈에",
    body: T(`목표 직무인 ${E(dir.name)}의 핵심 판단 둘은 모두 기준까지 해 봤습니다`, E(dir.summary)) +
      `<div class="two">
        <div class="card">${H("이 직무가 맡는 일", "직무 안내")}<p class="big">${E(dir.owns)}</p>${ul(dir.guide.responsibilities.map(E))}</div>
        <div class="card">${H("핵심 판단과 지금 단계", "응답")}${hbars(rows, { max: 3, width: 340, label: 130, ticks: ["지시받아", "직접", "기준까지"], row: 46 })}<p class="mut sm">이 직무가 특히 보는 판단입니다. 단계는 영역을 가리지 않고 가장 깊이 해 본 것을 씁니다.</p></div>
      </div>` +
      `<div class="two">
        <div class="note"><b>이미 가진 근거</b>${ul(dir.have.map((h: A) => `<b>${E(h.domain)}</b> ${E(h.text)}`))}</div>
        <div class="note warm"><b>더 필요한 근거</b>${ul(dir.need.map((h: A) => `<b>${E(h.name)}</b> ${E(h.why)}`))}</div>
      </div>` +
      H("이 직무가 정하는 것") + `<div class="chips">${dir.decides.map((t: string) => `<span>${E(t)}</span>`).join("")}</div>` +
      band("준비 상태", `${E(dir.readiness)} — 직무 적합도나 합격 가능성을 계산한 것이 아닙니다. 이 직무가 보는 판단을 해 본 근거가 있다는 뜻입니다.`),
  };
}

/* ───────────────────────── 02 판단 프로파일 ───────────────────────── */

function p2radar(d: D, x: X): Page {
  const r = d.r;
  const series = r.radar.series.map((s: A, i: number) => ({ name: s.name, levels: s.levels, color: [PAL.blue, PAL.coral, PAL.teal][i] }));
  return {
    part: "02", partName: "판단 프로파일", title: "판단 프로파일 방사형 그래프",
    body: T("기획은 ‘정하고 남기는’ 쪽, 데이터는 ‘고르고 확인하는’ 쪽으로 넓습니다", "깊게 물은 세 영역의 판단 여덟 가지를 한 그래프에 겹쳤습니다. 바깥 고리가 ‘기준까지 직접 정함’입니다.") +
      `<div class="radar-big">${radar(r.radar.axes.map((a: A) => a.label), series, { size: 560 })}</div>` +
      `<div class="lg lg-row">${series.map((s: A) => `<span><i style="background:${s.color}"></i>${E(s.name)}</span>`).join("")}</div>` +
      `<div class="g3">${series.map((s: A, i: number) => {
        const lv = s.levels as number[];
        const top = AX.filter((_, k) => lv[k] === 3).map((a) => AXN[a]);
        const low = AX.filter((_, k) => (lv[k] ?? 0) <= 1).map((a) => AXN[a]);
        return `<div class="note" style="border-color:${s.color}"><b>${E(s.name)}</b><p>기준까지 결정: ${top.length ? top.map(E).join(", ") : "아직 없음"}</p><p class="mut">비어 있는 쪽: ${low.length ? low.map(E).join(", ") : "없음"}</p></div>`;
      }).join("")}</div>`,
  };
}

function p2small(d: D, x: X): Page {
  const r = d.r;
  return {
    part: "02", partName: "판단 프로파일", title: "영역별 방사형 그래프",
    body: T("세 영역을 따로 그리면 모양이 서로 다릅니다", "겹쳐 그린 그래프에서 가려진 모양을 영역마다 따로 보았습니다. 모양이 다르다는 것은 같은 사람이 영역에 따라 다른 판단을 맡아 왔다는 뜻입니다.") +
      `<div class="g3 sm-mult">${r.radar.series.map((s: A, i: number) => `<div class="card cen"><h4>${E(s.name)}</h4>${radar(r.radar.axes.map((a: A) => a.label), [{ name: s.name, levels: s.levels, color: [PAL.blue, PAL.coral, PAL.teal][i] }], { size: 300, label: 13, ring: false })}<p class="mut sm">${E(d.r.domains.find((z: A) => z.code === s.code)?.zoneTag ?? "")}</p></div>`).join("")}</div>` +
      `<table class="tb tb-s"><thead><tr><th>판단</th>${r.radar.series.map((s: A) => `<th>${E(s.name)}</th>`).join("")}</tr></thead><tbody>${AX.map((a, k) => `<tr><td><b>${E(AXN[a])}</b></td>${r.radar.series.map((s: A) => `<td>${pip(s.levels[k])}</td>`).join("")}</tr>`).join("")}</tbody></table>` +
      band("읽는 법", "기획(경영전략·기획)에서는 ‘기준과 배분 정하기’와 ‘문서와 결과물 만들기’가, 데이터(데이터·의사결정)에서는 ‘조사·분석 방법 고르기’와 ‘실적·대안과 비교하기’가 바깥 고리에 닿습니다. 두 쪽을 이으면 ‘자료로 근거를 만들고 그 근거로 배분을 정한’ 이야기가 됩니다."),
  };
}

function p2heat(d: D, x: X): Page {
  const r = d.r;
  const rows = r.map.map((z: A) => z.name);
  const cell = (i: number, j: number) => {
    const code = r.map[i].code, lv = x.levels(code)[j] ?? 0;
    if (x.est(code)) return { fill: ["#f1f3f7", "#fbe7c4", "#c9ece4", "#c9ece4"][lv], text: ["없음", "지시받아", "직접 수행", "직접 수행"][lv], ink: C.ink3 };
    return { fill: LVC[lv], text: ["없음", "지시받아", "직접 수행", "기준까지"][lv], ink: lv >= 2 ? "#fff" : C.ink2 };
  };
  return {
    part: "02", partName: "판단 프로파일", title: "영역 × 판단 지도",
    body: T(`판단을 물은 칸 ${x.asked.length * 8}개 가운데 ${x.asked.reduce((a: number, c: string) => a + x.levels(c).filter((v) => v != null && v >= 2).length, 0)}개가 ‘직접 수행’ 이상입니다`, "12가지 영역과 여덟 판단을 한 장에 놓았습니다. 옅은 칸은 그 영역의 경험 응답과 공통 판단 응답으로 읽은 단계입니다.") +
      `<div class="wide-art">${heat(rows, AX.map((a) => AXN[a]), cell, { width: 700, label: 150, head: 70, row: 33, colWrap: 7 })}</div>` +
      `<div class="lg lg-row">${[0, 1, 2, 3].map((k) => `<span><i style="background:${LVC[k]}"></i>${E(STEP[k as 0].tag)}</span>`).join("")}<span><i style="background:#c9ece4;border:1px solid #dfe3ea"></i>경험 응답으로 읽은 단계(옅은 칸)</span></div>` +
      `<div class="two">
        <div class="note"><b>가로로 읽기</b><p>한 영역 안에서 어느 판단까지 해 봤는지 봅니다. 경영전략·기획은 여덟 칸 가운데 ${x.levels("TD01").filter((v) => v != null && v >= 2).length}칸이 ‘직접 수행’ 이상입니다.</p></div>
        <div class="note"><b>세로로 읽기</b><p>한 판단이 몇 영역에서 나왔는지 봅니다. ‘결과가 결정에 쓰이기’는 세 영역 모두 아직 ‘지시받아 수행’ 이하입니다. 다음 활동에서 가장 먼저 겨냥할 칸입니다.</p></div>
      </div>`,
  };
}

function p2profile(d: D, x: X): Page {
  const p = d.r.profile;
  return {
    part: "02", partName: "판단 프로파일", title: "프로파일 해석",
    body: T(E(p.lead), E(p.evidenceLine)) +
      `<div class="prose">${p.paragraphs.map((t: string, i: number) => `<div class="pr"><span class="pr-n">${["강한 쪽", "다음 단계", "아직인 쪽", "관심"][i] ?? ""}</span><p>${E(t)}</p></div>`).join("")}</div>` +
      H("판단마다 이렇게 말할 수 있습니다", "면접·상담에서 쓰는 말") +
      `<table class="tb tb-s"><thead><tr><th>판단</th><th>가장 깊은 단계</th><th>나온 영역</th><th>이렇게 말하기</th></tr></thead><tbody>${d.r.radar.best.map((b: A) => `<tr><td><b>${E(AXN[b.axis])}</b></td><td>${pip(b.level)}</td><td>${b.where.map(E).join(", ")}</td><td class="mut">${E(b.level >= 3 ? "“제가 기준을 정했고, 그 결과를 남겼습니다”" : b.level === 2 ? "“맡아서 해 봤지만 기준은 함께 정했습니다”" : "“참여했고, 다음에는 직접 맡고 싶습니다”")}</td></tr>`).join("")}</tbody></table>`,
  };
}

function p2strength(d: D, x: X, k: number): Page {
  const s = d.r.strengths[k];
  const lv = x.levels(s.code);
  return {
    part: "02", partName: "판단 프로파일", title: `강점 ${k + 1} · ${s.name}`,
    body: T(`강점 ${k + 1} · ${E(s.name)}`, E(s.story)) +
      `<div class="two r74">
        <div>${s.decisions.length ? H("직접 정한 것", "고른 근거") + ul(s.decisions.map(E)) : ""}${s.acts.length ? H("해 본 일", "고른 근거") + ul(s.acts.map(E)) : ""}
          <div class="chips">${s.artifacts.map((t: string) => `<span class="art">${E(t)}</span>`).join("")}${s.comparisons.map((t: string) => `<span>${E(t)}와 비교</span>`).join("")}</div></div>
        <div class="card cen">${radar(AX.map((a) => AXN[a]), [{ name: s.name, levels: lv, color: [PAL.blue, PAL.coral, PAL.teal][k % 3] }], { size: 300, label: 13, ring: false })}${zoneTag(s.zone)}</div>
      </div>` +
      `<div class="g3">
        <div class="note"><b>보여 줄 것</b><p>${E(s.show)}</p></div>
        <div class="note"><b>한 단계 더</b><p>${E(s.next)}</p></div>
        <div class="note"><b>이어지는 직무</b><p>${s.jobs.map(E).join(" · ")}${s.industryLines?.length ? `<br><span class="mut">공공·공기관에서는 ${E(s.industryLines[0])}으로 쓰입니다.</span>` : ""}</p></div>
      </div>` +
      filled("이 강점으로 준비한 30초 답변 (정한 기준 → 버린 안 → 남긴 결과)", E(FILL.strength[k] ?? "")) +
      band("면접에서 받을 질문", E(s.question)),
  };
}

function p2quality(d: D, x: X): Page {
  const m = d.m;
  return {
    part: "02", partName: "판단 프로파일", title: "응답을 믿을 수 있는가",
    body: T("응답은 고르게 들어왔고, 다시 볼 응답은 없습니다", "결과를 읽기 전에 응답이 성실했는지부터 확인했습니다. 한쪽으로 몰린 응답이나 서로 어긋나는 응답이 있으면 결과지 맨 앞에 적습니다.") +
      `<div class="kpis k3">
        <div class="kpi"><p>응답 품질</p><b>${m.response_quality.flag === "OK" ? "고름" : "다시 보기"}</b><span>한쪽 쏠림 · 어긋남 검사</span></div>
        <div class="kpi"><p>고른 장면이 응답을 받치는가</p><b>${x.counts.owned}<small>개</small></b><span>‘기준까지’는 고른 근거가 둘 이상일 때만</span></div>
        <div class="kpi"><p>검사와 기록이 같은 쪽을 가리킨 영역</p><b>${d.r.cross.filter((c: A) => c.kind === "BOTH").length}<small>곳</small></b><span>교차 확인 쪽에서 자세히</span></div>
      </div>` +
      H("단계를 올리는 규칙", "응답만으로는 ‘기준까지’로 올라가지 않습니다") +
      `<div class="flow5 f4">${[
        ["응답", "‘기준을 직접 정했다’고 답함"], ["고른 근거", "그 장면을 체크리스트에서 둘 이상 고름"], ["결과물", "남긴 문서·표를 함께 고름"], ["단계", "그때만 ‘기준까지 직접 정함’"],
      ].map(([h, b]) => `<div class="f5"><b>${h}</b><p>${b}</p></div>`).join("")}</div>` +
      H("물은 칸 스물네 개의 단계", "깊게 물은 세 영역 × 여덟 판단") +
      hbars([3, 2, 1, 0].map((k) => ({ label: STEP[k as 0].tag, value: x.asked.reduce((a: number, c: string) => a + x.levels(c).filter((v) => v === k).length, 0), color: LVC[Math.max(1, k)] })), { max: 12, width: 640, label: 150, row: 30, valueText: (b) => `${b.value}칸` }) +
      H("이 결과가 말하지 않는 것") +
      `<div class="two"><div>${ul(["결과물의 완성도(성과 수치는 참여자가 상담에서 적은 것만 씁니다)", "직무 적합도·합격 가능성·연봉", "다른 참여자와 견준 순위(규준이 아직 없습니다)"])}</div><div>${ul(["체크리스트 근거 없이 경험 응답으로 읽은 영역의 실제 숙련도", "기업의 채용 계획(공시로 확인한 것은 회사 개황뿐입니다)", "성격이나 적성 유형"])}</div></div>`,
  };
}

/* ───────────────────────── 03 12가지 영역 ───────────────────────── */

function p3domain(d: D, x: X, code: string, no: number): Page {
  const z = d.r.map.find((v: A) => v.code === code), df = x.def(code), md = x.dm.get(code);
  const lv = x.levels(code), asked = !x.est(code);
  const EXN: Record<number, string> = { 0: "없음", 1: "1~2회", 2: "3회 이상" };
  const five = (v: number | null) => (v == null ? "—" : ["", "매우 낮음", "낮음", "보통", "높음", "매우 높음"][v]);
  const roles = d.rel.td_role.filter((t: A) => t.td === code && t.strength !== "드묾").sort((a: A, b: A) => (a.strength === "중심" ? -1 : 1) - (b.strength === "중심" ? -1 : 1));
  const dims = d.industry.judgement_dimensions.filter((j: A) => j.domain === code);
  const deep = d.r.domains.find((v: A) => v.code === code);
  const pk = x.picks(code);
  const art = asked
    ? radar(AX.map((a) => AXN[a]), [{ name: z.name, levels: lv, color: DC(z.code) }], { size: 280, label: 12.5, ring: false })
    : `${radar(AX.map((a) => AXN[a]), [{ name: z.name, levels: lv, color: "#8fa3c9" }], { size: 250, label: 12, ring: false })}
       <div class="est3"><div><span>관심</span><b>${five(x.intOf(code))}</b></div><div><span>해 본 횟수</span><b>${EXN[x.expOf(code)]}</b></div><div><span>배울 뜻</span><b>${five(x.leaOf(code))}</b></div></div>`;
  const head = asked
    ? E(deep?.headline ?? `${z.name}에서 해 본 일이 확인됩니다`)
    : x.expOf(code) === 0
      ? `${E(josa(z.name, ["은", "는"]))} 아직 해 본 적이 없다고 답한 영역입니다. ${z.interest === "HIGH" ? "관심이 높으니 짧은 과제 하나로 먼저 겪어 볼 자리입니다" : "지금은 다른 영역을 먼저 다지고, 필요할 때 넓혀도 됩니다"}`
      : `${E(josa(z.name, ["은", "는"]))} 한두 번 해 본 영역입니다. 그때 맡은 일을 적어 두면 지원서에 쓸 근거가 하나 더 생깁니다`;
  return {
    part: "03", partName: "12가지 업무 영역", title: `영역 ${String(no).padStart(2, "0")} · ${z.name}`,
    body: `<div class="dh"><span class="dh-n">${String(no).padStart(2, "0")}</span><div><p class="k">업무 영역</p><h1>${E(z.name)}</h1></div><div class="dh-t">${zoneTag(z.zone)}<span class="mut">관심 ${IK[z.interest]}${deep ? ` · 경험 ${EXK[deep.experience] ?? "—"}` : ""}</span></div></div>
      <p class="dek">${head}</p>
      <div class="two r64">
        <div>${H("이 영역의 일은 이렇게 흘러갑니다", "직무 일반")}<ol class="wf">${df.workflow.map((w: A) => `<li><b>${E(w.name)}</b><span>${E(w.detail)}</span></li>`).join("")}</ol></div>
        <div class="card cen">${art}</div>
      </div>
      ${H("판단 여덟 가지와 지금 단계", asked ? "응답 · 고른 근거" : "경험 응답과 공통 판단 응답으로 읽음 · 다음에 겨냥할 장면")}
      <table class="tb tb-xs"><tbody>${AX.map((a, k) => {
        const own = pk.filter((p) => p.axis === a).map((p) => p.pick);
        return `<tr><td class="w30"><b>${E(AXN[a])}</b></td><td class="w22">${pip(lv[k], !asked)}</td><td>${own.length ? own.map(E).join(" · ") : `<span class="mut">${E(df.axes[a].l2)}</span>`}</td></tr>`;
      }).join("")}</tbody></table>
      <div class="g3">
        <div class="note"><b>이어지는 직무</b><p>${roles.slice(0, 4).map((t: A) => `${E(t.role_name)}<span class="mut">(${E(t.strength)})</span>`).join(" · ") || "직무 안내 없음"}</p></div>
        <div class="note"><b>공공·공기관에서는</b><p>${dims.length ? dims.map((j: A) => `${E(j.name)} <span class="mut">: ${E(j.why)}</span>`).join("<br>") : "이 영역을 따로 보는 판단 기준은 적혀 있지 않습니다."}</p></div>
        <div class="note"><b>남기는 결과물</b><p>${df.artifacts.slice(0, 4).map(E).join(" · ")}</p></div>
      </div>` + (asked
        ? band("다음 단계", E(deep?.develop?.[0]?.how ?? `${z.name}에서 비어 있는 판단 하나를 골라 다음 과제에서 직접 맡아 봅니다.`))
        : band("처음 겪어 보기", `수업 과제나 동아리 활동에서 ‘${E(df.axes.J5.l2)}’ 정도의 일을 한 번 맡아 보세요. 남길 것은 ${E(df.artifacts[0])}이고, 경험 기록에 더하면 이 영역의 단계가 근거와 함께 올라갑니다.`)),
  };
}

function p3ledger(d: D, x: X): Page {
  const r = d.r;
  const rows = x.asked.flatMap((code: string) => x.picks(code).map((p) => ({ code, ...p })));
  return {
    part: "03", partName: "12가지 업무 영역", title: "근거 원장",
    body: T(`고른 장면 ${rows.length}개를 영역과 판단별로 모았습니다`, "참여자가 체크리스트에서 직접 고른 문장 그대로입니다. 결과물 이름은 굵게 표시했습니다. 이 목록이 자기소개서와 면접 답변의 재료가 됩니다.") +
      `<div class="ledger">${x.asked.map((code: string) => {
        const ps = rows.filter((p) => p.code === code);
        return `<div class="lg-d"><h4>${E(x.name(code))} ${zoneTag(x.zones[code])}</h4><table class="tb tb-xs"><tbody>${AX.map((a) => { const pp = ps.filter((p) => p.axis === a); return pp.length ? `<tr><td class="w30">${E(AXN[a])}</td><td>${pp.map((p) => (/표|보고|서$|계획|한 벌|정의/.test(p.pick) && p.pick.length < 14 ? `<b>${E(p.pick)}</b>` : E(p.pick))).join(" · ")}</td></tr>` : ""; }).join("")}</tbody></table></div>`;
      }).join("")}</div>` +
      band("쓰는 법", "자기소개서 한 문단에는 ‘직접 정한 것’ 하나와 ‘결과물’ 하나만 씁니다. 이 원장에서 두 줄을 고르면 문단의 뼈대가 됩니다."),
  };
}

const recFill = (title: string) => Object.entries(FILL.rec).find(([k]) => title.startsWith(k))?.[1] ?? { role: "", compare: "", result: "" };

function p3timeline(d: D, x: X): Page {
  const r = d.r;
  const items = r.records.map((rc: A, i: number) => { const [a, b] = rc.period.split(" ~ "); return { label: rc.title, from: a, to: b ?? a, color: [PAL.blue, PAL.coral, PAL.teal][i % 3] }; });
  return {
    part: "03", partName: "12가지 업무 영역", title: "경험 기록 시간축",
    body: T("경험 기록 세 건이 1년 사이에 이어져 있습니다", "참여자가 플랫폼에 적어 둔 활동입니다. 검사 응답과 따로 받았고, 같은 영역을 가리키는지 다음 쪽에서 맞춰 봅니다.") +
      `<div class="wide-art">${timeline(items, { width: 700 })}</div>` +
      r.records.map((rc: A, i: number) => `<div class="rec" style="--c:${[PAL.blue, PAL.coral, PAL.teal][i % 3]}"><div class="rec-h"><b>${E(rc.title)}</b><span>${E(rc.kind)} · ${E(rc.period)} · ${rc.domains.map(E).join(", ")}</span></div>
        <div class="g3 rec-b"><div><p class="k">다룬 문제</p>${ul(rc.problems.map(E))}</div><div><p class="k">직접 정한 것</p>${ul(rc.decisions.map(E))}</div><div><p class="k">남긴 것 · 쓰인 곳</p>${ul([...rc.artifacts.map((a: string) => `<b>${E(a)}</b>`), ...rc.usedWhere.map(E)])}</div></div>
        <p class="sm"><b class="mine">맡은 역할</b> ${E(recFill(rc.title).role)}</p></div>`).join(""),
  };
}

function p3record(d: D, x: X, k: number): Page {
  const rc = d.r.records[k];
  return {
    part: "03", partName: "12가지 업무 영역", title: `경험 기록 · ${rc.title.split(" — ")[0]}`,
    body: T(E(rc.title), E(rc.purpose)) +
      chain([
        { head: "다룬 문제", body: rc.problems[0] ?? "직접 기입", color: C.navy }, { head: "직접 정한 것", body: rc.decisions[0] ?? "직접 기입", color: C.blue },
        { head: "남긴 것", body: rc.artifacts[0] ?? "직접 기입", color: C.teal }, { head: "쓰인 곳", body: rc.usedWhere[0] ?? "직접 기입", color: C.amber },
      ], { width: 700, height: 104 }) +
      `<div class="two">
        <div class="card">${H("검사가 같은 쪽을 가리키나")}${ul(rc.testSays.map((t: A) => `<b>${E(t.domain)}</b> ${E(t.text)}`))}</div>
        <div class="card">${H("이 기록이 이어지는 직무", "직무 안내")}${ul(rc.jobs.map((j: A) => `<b>${E(j.name)}</b> ${E(j.why.replace(/^[^.]*\(직무 일반\)\.\s*/, ""))}`))}</div>
      </div>` +
      H("자기소개서에서는") + `<p class="big">${E(String(rc.application).replace(/\s*판단의 근거와 결과 수치를 직접 적어 넣으면 한 문단이 완성됩니다\./, ""))} ${E(recFill(rc.title).result)}</p>` +
      H("면접 전에 채운 내용", "참여자 작성") +
      `<div class="g3">${rc.check.map((c: string) => `<div>${filled(E(c.replace(/\(직접 기입\)/, "")), E(/역할/.test(c) ? recFill(rc.title).role : /비교/.test(c) ? recFill(rc.title).compare : /범위/.test(c) ? "처음에는 업종 전체를 보려 했으나 세종 안 서비스업으로 좁혔습니다." : recFill(rc.title).result))}</div>`).join("")}</div>` +
      band("정리", "기록에 맡은 범위와 결과 수치를 더해, 이 기록 하나로 자기소개서 한 문단과 면접 답변 하나를 만들었습니다(02장)."),
  };
}

function p3cross(d: D, x: X): Page {
  const cr = d.r.cross;
  const kindK: Record<string, string> = { BOTH: "검사·기록 모두", TEST_ONLY: "검사에만", RECORD_ONLY: "기록에만" };
  return {
    part: "03", partName: "12가지 업무 영역", title: "검사와 기록의 교차 확인",
    body: T("검사 응답과 경험 기록이 같은 영역을 가리키는지 맞춰 봤습니다", "두 근거가 같은 쪽을 가리키면 면접에서 ‘언제, 어떤 과제에서’라는 질문에 바로 답할 수 있습니다. 한쪽에만 있으면 다른 쪽을 채울 차례입니다.") +
      `<table class="tb"><thead><tr><th>영역</th><th>근거</th><th>검사</th><th>경험 기록</th></tr></thead><tbody>${cr.map((c: A) => `<tr><td><b>${E(c.name)}</b></td><td>${tag(kindK[c.kind] ?? c.kind, c.kind === "BOTH" ? C.navy : c.kind === "TEST_ONLY" ? C.blue : C.teal)}</td><td>${E(c.test)}</td><td>${E(c.record ?? "—")}</td></tr>`).join("")}</tbody></table>` +
      `<div class="g2l">${cr.map((c: A) => `<div class="note"><b>${E(c.name)}</b><p>${E(c.reading)}</p><p class="mut sm">${E(c.verify)}</p></div>`).join("")}</div>`,
  };
}

/* ───────────────────────── 04 직무 탐색 ───────────────────────── */

function p4matrix(d: D, x: X): Page {
  const roles = d.rolePacks;
  const tds = d.r.map.map((z: A) => z.code);
  const strength = (role: string, td: string) => d.rel.td_role.find((t: A) => t.role === role && t.td === td)?.strength;
  const cell = (i: number, j: number) => {
    const s = strength(roles[i].code, tds[j]), z = x.zones[tds[j]];
    const core = (roles[i].core_ref?.td ?? []).includes(tds[j]);
    const fill = s === "중심" ? (z === "Z1_EVIDENCE_ESTABLISHED" ? PAL.blue : z === "Z2_EVIDENCE_INCOMPLETE" ? PAL.teal : PAL.amber) : s === "있음" ? (z === "Z1_EVIDENCE_ESTABLISHED" ? "#a9c1f2" : z === "Z2_EVIDENCE_INCOMPLETE" ? "#9fdccf" : "#f8d9b3") : "#f6f7f9";
    return { fill, text: core ? "●" : "", ink: s === "중심" ? "#fff" : C.ink2 };
  };
  return {
    part: "04", partName: "직무 탐색", title: "직무와 영역의 지도",
    body: T("경영기획과 데이터·분석은 근거 갖춘 영역이 직무의 중심과 겹칩니다", "가로는 12가지 업무 영역, 세로는 경영계열 대표 직무 여덟입니다. 진한 칸은 그 직무의 중심 업무이고, 색이 짙을수록 참여자의 근거가 갖춰진 영역입니다. ●는 직무의 핵심 영역입니다.") +
      `<div class="wide-art">${heat(roles.map((p: A) => p.name_ko ?? p.name), d.r.map.map((z: A) => z.name), cell, { width: 710, label: 120, head: 92, row: 34, colWrap: 5 })}</div>` +
      `<div class="lg lg-row"><span><i style="background:${PAL.blue}"></i>중심 업무 · 근거 갖춤</span><span><i style="background:${PAL.teal}"></i>중심 업무 · 근거 일부</span><span><i style="background:${PAL.amber}"></i>중심 업무 · 아직</span><span><i style="background:#a9c1f2"></i>함께 하는 업무 · 근거 갖춤</span><span><i style="background:#f8d9b3"></i>함께 하는 업무 · 아직</span></div>` +
      band("직무 일반", "이 지도는 직무마다 어떤 영역이 중심인지에 대한 일반 안내 위에 참여자의 근거를 겹친 것입니다. 개인의 직무 적합도를 계산한 것이 아닙니다."),
  };
}

function p4coverage(d: D, x: X): Page {
  const best = (axis: string, tds: string[]) => Math.max(0, ...tds.map((t) => x.levels(t)[AX.indexOf(axis as A)] ?? 0));
  const rows = d.rolePacks.map((p: A) => {
    const tds: string[] = p.core_ref.td;
    const z1 = tds.filter((t) => x.zones[t] === "Z1_EVIDENCE_ESTABLISHED").length, z2 = tds.filter((t) => x.zones[t] === "Z2_EVIDENCE_INCOMPLETE").length;
    return { p, tds, z1, z2, req: p.required_axes.map((a: string) => ({ a, lv: best(a, tds) })) };
  });
  return {
    part: "04", partName: "직무 탐색", title: "직무별로 갖춘 근거",
    body: T("여덟 직무 가운데 셋은 핵심 영역 셋 중 둘 이상에 근거가 있습니다", "직무마다 핵심 영역 세 곳에서 근거가 몇 곳 갖춰졌는지와, 그 직무가 특히 보는 판단 두 가지의 단계를 나란히 놓았습니다.") +
      `<div class="wide-art">${hbars(rows.map((r) => ({ label: r.p.name_ko ?? r.p.name, value: r.z1 + r.z2 * 0.5, color: r.z1 >= 2 ? PAL.blue : r.z1 + r.z2 >= 1 ? PAL.teal : "#c9ced8", note: `근거 갖춤 ${r.z1} · 일부 ${r.z2} / 핵심 영역 3` })), { max: 3, width: 700, label: 130, row: 38, valueText: (b) => (b as A).note })}</div>` +
      `<table class="tb tb-s"><thead><tr><th>직무</th><th>핵심 영역</th><th>특히 보는 판단과 지금 단계</th></tr></thead><tbody>${rows.map((r) => `<tr><td><b>${E(r.p.name_ko ?? r.p.name)}</b></td><td>${r.tds.map((t) => `${E(x.name(t))}<span class="dot" style="background:${ZC[x.zones[t]]}"></span>`).join(" ")}</td><td>${r.req.map((q: A) => `${E(AXN[q.a])} ${pip(q.lv)}`).join("<br>")}</td></tr>`).join("")}</tbody></table>` +
      `<p class="mut sm">막대 길이는 근거 갖춘 영역을 1, 근거 일부 영역을 0.5로 세어 더한 것입니다. 센 개수를 보기 쉽게 그린 것이고 적합도 점수가 아닙니다.</p>`,
  };
}

function rolePages(d: D, x: X, code: string, depth: number): Page[] {
  const g = d.guide[code]; const pack = d.rolePacks.find((p: A) => p.code === code);
  const dir = d.r.directions.find((z: A) => z.code === code);
  const name = pack?.name_ko ?? code;
  const out: Page[] = [];
  out.push({
    part: "04", partName: "직무 탐색", title: `${name} · 하는 일`,
    body: T(`${E(name)}은 ${E(g.summary)}입니다`, dir ? E(dir.summary) : `이 직무의 핵심 영역은 ${pack.core_ref.td.map((t: string) => E(x.name(t))).join(", ")}입니다.`) +
      H("일이 흘러가는 순서", "직무 안내") + chain(g.process.slice(0, 6).map((s: A, i: number) => ({ head: s.step, body: s.what, color: CYC[i % CYC.length] })), { width: 700, height: 168 }) +
      `<div class="two">
        <div class="card">${H("주로 맡는 일")}${ul(g.responsibilities.map(E))}</div>
        <div class="card">${H("알아야 할 것 · 쓰는 도구")}${ul([...g.knowledge.map(E), ...g.tools.map((t: string) => `<span class="mut">${E(t)}</span>`)])}</div>
      </div>` + (depth === 1 ? `<div class="two">
        <div class="card">${H("이 직무가 특히 보는 판단", "지금 단계")}${hbars(pack.required_axes.map((a: string) => { const vs = pack.core_ref.td.map((t: string) => x.levels(t)[AX.indexOf(a as A)]).filter((v: number | null) => v != null) as number[]; return { label: AXN[a], value: vs.length ? Math.max(...vs) : 0, asked: vs.length > 0, color: C.navy }; }), { max: 3, width: 340, label: 130, ticks: ["지시받아", "직접", "기준까지"], row: 44, valueText: (b: A) => (b.asked ? ["해 본 적 없음", "지시받아 수행", "직접 수행", "기준까지 결정"][b.value] : "지시받아 수행") })}</div>
        <div class="card">${H("들어가는 길", "학교 안에서")}${ul(g.entry.map(E))}<div class="chips">${g.portfolio.slice(0, 3).map((t: string) => `<span class="art">${E(t)}</span>`).join("")}</div></div>
      </div>` : "") + (dir ? band("다른 직무와 다른 점", dir.differs.map(E).join(" / ")) : band("핵심 영역", pack.core_ref.td.map((t: string) => `${E(x.name(t))}(${E(ZONE_SAID[x.zones[t]]?.tag ?? "")})`).join(" · "))),
  });
  if (depth >= 2) {
    const prac = AX.map((a) => ({ a, p: g.practice[a] })).filter((z) => z.p);
    out.push({
      part: "04", partName: "직무 탐색", title: `${name} · 판단과 연습`,
      body: T(`${E(name)}에서 판단 여덟 가지는 이렇게 연습합니다`, "직무 안내의 연습 과제 옆에 참여자의 지금 단계를 붙였습니다. 단계가 낮은 줄부터 연습하면 됩니다.") +
        `<table class="tb tb-xs"><thead><tr><th>판단</th><th>지금 단계</th><th>연습 과제</th><th>남길 것</th></tr></thead><tbody>${prac.map(({ a, p }) => {
          const lv = Math.max(0, ...pack.core_ref.td.map((t: string) => x.levels(t)[AX.indexOf(a as A)] ?? 0));
          return `<tr><td class="w22"><b>${E(AXN[a])}</b></td><td class="w18">${pip(lv)}</td><td>${E(p.task)}<br><span class="mut">확인: ${E(p.check)}</span></td><td class="w18"><b>${E(p.output)}</b></td></tr>`;
        }).join("")}</tbody></table>` +
        H("이번 학기에 고른 연습 하나", "참여자 작성") + `<div class="g3">${["어느 판단을", "어느 과제에서", "무엇으로 남길지"].map((l, i) => `<div>${filled(l, E(FILL.practice[code]?.[i] ?? ""))}</div>`).join("")}</div>` +
        band("고르는 법", "단계 칸이 가장 짧은 줄부터 고릅니다. 이미 ‘기준까지’인 줄은 결과물을 정리해 포트폴리오로 옮기면 됩니다."),
    });
  }
  if (depth >= 3) {
    const fp = g.firstProject;
    out.push({
      part: "04", partName: "직무 탐색", title: `${name} · 첫 프로젝트와 배울 순서`,
      body: T(`첫 프로젝트: ${E(fp.title)}`, E(fp.goal)) +
        chain(fp.steps.map((s: string, i: number) => ({ head: `${i + 1}단계`, body: s, color: [PAL.blue, PAL.teal, PAL.amber, PAL.coral][i % 4] })), { width: 700, height: 160 }) +
        `<div class="two">
          <div class="card">${H("완료 기준")}<p class="big">${E(fp.check)}</p><p class="mut">남길 것: ${E(fp.output)}</p></div>
          <div class="card">${H("배울 순서")}<ol class="lo">${g.learnOrder.map((l: A) => `<li><b>${E(l.step)}</b><span>${E(l.why)}</span></li>`).join("")}</ol></div>
        </div>` +
        H("들어가는 길", "학교 안에서") + ul(g.entry.map(E)) +
        H("포트폴리오에 넣을 것") + `<div class="chips">${g.portfolio.map((t: string) => `<span class="art">${E(t)}</span>`).join("")}</div>`,
    });
  }
  return out;
}

function p4others(d: D, x: X, codes: string[]): Page {
  return {
    part: "04", partName: "직무 탐색", title: "그 밖의 직무 넷",
    body: T("나머지 네 직무도 한 쪽에 정리했습니다", "지금 근거가 적은 직무입니다. 관심이 생기면 아래 ‘들어가는 길’ 하나부터 해 보면 됩니다.") +
      `<div class="g2">${codes.map((c) => { const g = d.guide[c]; const p = d.rolePacks.find((z: A) => z.code === c);
        return `<div class="card"><h4>${E(p.name_ko ?? p.name)}</h4><p>${E(g.summary)}</p><p class="k">핵심 영역</p><p>${p.core_ref.td.map((t: string) => `${E(x.name(t))}<span class="dot" style="background:${ZC[x.zones[t]]}"></span>`).join(" ")}</p><p class="k">특히 보는 판단</p><p>${p.required_axes.map((a: string) => `${E(AXN[a])} ${pip(Math.max(0, ...p.core_ref.td.map((t: string) => x.levels(t)[AX.indexOf(a as A)] ?? 0)))}`).join("<br>")}</p><p class="k">들어가는 길</p>${ul(g.entry.slice(0, 2).map(E))}<p class="k">연습 과제 하나</p><p class="mut">${E(g.firstProject.title)}</p></div>`; }).join("")}</div>`,
  };
}

function p4industry(d: D, x: X): Page {
  const ip = d.industry;
  const rows = ip.judgement_dimensions.map((j: A) => ({ j, lv: x.levels(j.domain)[AX.indexOf(j.axis)] }));
  return {
    part: "04", partName: "직무 탐색", title: "공공·공기관에서 보는 판단",
    body: T("공공·공기관은 ‘규정을 요건으로 옮기고 근거를 남기는’ 판단을 먼저 봅니다", E(ip.scene)) +
      `<div class="chips big">${ip.demands.map((t: string) => `<span>${E(t)}</span>`).join("")}</div>` +
      `<table class="tb tb-xs"><thead><tr><th>이 산업이 보는 판단</th><th>영역</th><th>왜</th><th>지금 단계</th></tr></thead><tbody>${rows.map(({ j, lv }: A) => `<tr><td><b>${E(j.name)}</b></td><td>${E(x.name(j.domain))}</td><td class="mut">${E(j.why)}</td><td>${pip(lv)}</td></tr>`).join("")}</tbody></table>` +
      band("읽는 법", `열 가지 가운데 지금 ‘직접 수행’ 이상인 것은 ${rows.filter((z: A) => z.lv != null && z.lv >= 2).length}가지입니다. 공공부문 지원 전에는 집행·선정·기록 쪽 경험을 하나 더 만들어 두면 좋습니다.`),
  };
}

function p4public(d: D, x: X): Page {
  return {
    part: "04", partName: "직무 탐색", title: "공공부문 지원을 준비할 때",
    body: T("공공기관 채용은 서류·필기·면접의 각 단계에서 ‘기준과 근거’를 묻습니다", "아래는 공공기관 채용의 일반적인 흐름과 준비할 것입니다. 기관마다 전형이 다르므로 지원 전에는 해당 기관의 채용 공고 원문을 반드시 확인합니다.") +
      chain([
        { head: "공고 읽기", body: "직무기술서의 담당 업무·필요 지식·필요 기술을 따로 옮겨 적기", color: C.navy },
        { head: "서류", body: "직무 관련 경험을 ‘무엇을 정했고 무엇을 남겼는지’로 쓰기", color: C.blue },
        { head: "필기", body: "직업기초능력과 직무 지식 시험 준비(기관 공고 기준)", color: C.teal },
        { head: "면접", body: "경험 면접·상황 면접에서 판단 근거를 설명하기", color: C.amber },
      ], { width: 700, height: 150 }) +
      `<div class="two">
        <div class="card">${H("이 참여자의 재료와 이어 보면")}${ul([
          "‘목표를 지표로 옮기기’ → 직무기술서의 ‘성과 관리·평가’ 업무와 이어집니다.",
          "‘조사·분석 방법 고르기’ → 정책·사업 효과를 지표로 보고하는 일과 이어집니다.",
          "현장실습의 ‘실적 자료 정리’ → 공공기관 사업 실적 관리 경험으로 쓸 수 있습니다.",
        ])}</div>
        <div class="card">${H("직접 확인할 것", "공고 원문")}${ul(["모집 직무와 근무 지역", "전형 단계와 일정", "가점·우대 요건", "직무기술서의 필요 지식·기술"])}</div>
      </div>` +
      band("확인 범위", "이 쪽은 공공부문 채용의 일반적인 흐름을 정리한 안내입니다. 특정 기관의 채용 계획·인원·일정은 확인하지 않았습니다."),
  };
}

/* ───────────────────────── 05 세종·충청 ───────────────────────── */

function p5sejong(d: D, x: X): Page[] {
  const sj = d.sejong;
  const orgs: A[] = sj?.orgs ?? [];
  const out: Page[] = [];
  out.push({
    part: "05", partName: "세종·충청에서 찾아보기", title: "세종에 본점을 둔 상장사",
    body: T(`공시로 확인한 세종 본점 상장사는 ${orgs.length}곳입니다`, `금융감독원 전자공시(OpenDART)의 상장사 ${sj?.listed_checked ?? "—"}곳 기업개황에서 본점 주소가 세종인 회사를 골랐습니다. 확인일 ${E(sj?.checked_on ?? "—")}. 채용 여부는 확인하지 않았습니다.`) +
      (orgs.length ? `<table class="tb tb-s"><thead><tr><th>회사</th><th>시장</th><th>업종 코드</th><th>설립</th><th>본점 주소</th></tr></thead><tbody>${orgs.map((o: A) => `<tr><td><b>${E(o.corp_name)}</b></td><td>${E({ Y: "유가증권", K: "코스닥", N: "코넥스", E: "기타" }[o.corp_cls as string] ?? o.corp_cls)}</td><td>${E(o.induty_code)}</td><td>${E((o.est_dt ?? "").slice(0, 4))}</td><td class="mut">${E(o.adres)}</td></tr>`).join("")}</tbody></table>` : `<div class="na-box"><b>공시로 확인된 세종 본점 상장사가 없습니다</b></div>`) +
      `<div class="two">
        <div class="note"><b>왜 상장사를 따로 보나</b><p>상장사는 사업보고서를 공시하므로 사업 구조·매출·직원 수를 공식 원문으로 읽을 수 있습니다. 비상장 기업은 앞 쪽의 벤처기업 확인 명단에서 업종과 주력 품목까지 확인했습니다.</p></div>
        <div class="note"><b>세종에서 더 볼 곳</b><p>세종에는 중앙행정기관과 국책연구기관이 모여 있습니다. 공공·공기관을 목표로 하는 참여자라면 공공기관 경영정보 공개시스템(ALIO)에서 기관별 채용 정보를 직접 확인하세요.</p></div>
      </div>` + band("직업정보 제공", "이 목록은 지원을 권하는 목록이 아닙니다. 지역 기업이 어떤 사업을 하는지 알아보는 출발점입니다."),
  });
  const fv = (o: A) => (o.financials.consolidated?.매출액 != null ? o.financials.consolidated : o.financials.separate) ?? {};
  const fin = orgs.filter((o: A) => o.financials && fv(o).매출액 != null).sort((p: A, q: A) => fv(q).매출액 - fv(p).매출액);
  const short = (n: string) => n.replace(/\(주\)|주식회사/g, "").trim();
  if (fin.length) {
    const top = fin.slice(0, 9);
    out.push({
      part: "05", partName: "세종·충청에서 찾아보기", title: "세종 상장사의 매출과 영업이익",
      body: T(`세종 본점 상장사 가운데 매출이 큰 ${top.length}곳의 2025년 숫자입니다`, `2025년 사업보고서의 주요 계정입니다(연결 재무제표가 있으면 연결, 없으면 별도). 금액은 억 원 단위로 반올림했습니다. 막대는 같은 눈금이라 규모 차이가 그대로 보입니다.`) +
        `<div class="wide-art">${moneyBars(top.map((o: A) => ({ label: short(o.corp_name), values: [{ name: "매출액", v: fv(o).매출액 ?? null, color: PAL.blue }, { name: "영업이익", v: fv(o).영업이익 ?? null, color: PAL.amber }] })), { width: 700 })}</div>` +
        `<div class="two"><div class="note"><b>업종이 한쪽에 모여 있습니다</b><p>화장품·건강기능식품(콜마 계열), 제약(신신제약·한국유나이티드제약), 소재·부품(나노신소재·켐트로닉스·유라테크·에이치비 계열)이 세종 산업단지에 본점을 두고 있습니다. 공시의 업종 코드와 사업의 개요로 확인할 수 있습니다.</p></div>
        <div class="note warm"><b>숫자를 읽는 법</b><p>매출은 회사의 규모를, 영업이익은 본업에서 남긴 돈을 보여 줍니다. 경영기획 지망자라면 ‘이 회사의 다음 해 목표 지표 세 개’를 이 숫자에서 골라 보는 연습을 해 보세요.</p></div></div>`,
    });
    const st = orgs.filter((o: A) => o.staff).sort((p: A, q: A) => q.staff.total - p.staff.total);
    out.push({
      part: "05", partName: "세종·충청에서 찾아보기", title: "세종 상장사의 직원 수와 공시 원문",
      body: T(`세종 본점 상장사 ${st.length}곳의 직원 수는 사업보고서에 적혀 있습니다`, "사업보고서 ‘직원 등의 현황’의 합계입니다(2025년 사업보고서). 본사·공장·영업 인원이 모두 들어 있어 세종에서 일하는 인원과는 다를 수 있습니다.") +
        `<div class="wide-art">${hbars(st.map((o: A, i: number) => ({ label: short(o.corp_name), value: o.staff.total, color: CYC[i % CYC.length] })), { max: Math.max(...st.map((o: A) => o.staff.total)) * 1.08, width: 700, label: 150, row: 22, valueText: (b) => `${b.value.toLocaleString("ko-KR")}명` })}</div>` +
        `<table class="tb tb-xs"><thead><tr><th>회사</th><th>매출액</th><th>영업이익</th><th>당기순이익</th><th>사업보고서 접수</th></tr></thead><tbody>${fin.map((o: A) => `<tr><td><b>${E(o.corp_name)}</b></td><td>${won(fv(o).매출액)}</td><td>${won(fv(o).영업이익)}</td><td>${won(fv(o).당기순이익)}</td><td class="mut">${E(o.annual_reports?.[0]?.rcept_dt ?? "")}</td></tr>`).join("")}</tbody></table>`,
    });
  }
  return out;
}

/* ───────────────────────── 06 세종 기업 240곳과 내 결과 ─────────────────────────
 * 직업정보제공사업 범위 안에서 쓴다: 회사를 골라 보내지 않고 업종과 결과를 나란히 놓는다.
 * ‘추천 기업’ 이라는 말을 쓰지 않고, 채용 여부를 확인하지 않았다는 것과 지원은 본인이
 * 각 회사의 공식 경로로 한다는 것을 쪽마다 적는다. 점수를 만들지 않는다: 묶음은 그 업종에서
 * 경영계열이 자주 맡는 일의 영역이 이 참여자의 확인된 영역과 겹치는지로만 정한다. */
const SJG: Record<string, { tds: string[]; work: string; try: string }> = {
  SW: { tds: ["TD08", "TD12", "TD01"], work: "서비스 기획 · 데이터 분석 · 사업 관리", try: "누리집의 서비스 소개를 읽고 그 서비스가 볼 지표 세 개를 적어 보세요" },
  RND: { tds: ["TD01", "TD08", "TD04"], work: "과제 기획 · 성과 관리 · 사업비 관리", try: "회사가 수행한 정부 과제 하나를 찾아 목표와 성과 지표를 한 줄씩 적어 보세요" },
  FIN: { tds: ["TD01", "TD04", "TD05"], work: "그룹 경영기획 · 투자·재무 관리", try: "사업보고서의 계열사 표를 보고 사업별 매출 비중을 정리해 보세요" },
  MEDIA: { tds: ["TD02", "TD03", "TD09"], work: "캠페인 기획 · 고객사 영업 · 행사 운영", try: "최근 진행한 캠페인 하나의 목표 고객과 채널을 정리해 보세요" },
  BIO: { tds: ["TD02", "TD07", "TD05"], work: "제품 마케팅 · 품질·생산 관리 · 원가 관리", try: "주력 제품 하나를 골라 누가 사는지와 경쟁 제품을 표로 비교해 보세요" },
  MACH: { tds: ["TD07", "TD05", "TD03"], work: "생산 관리 · 원가 관리 · 기술 영업", try: "주력 품목의 납품처와 원가에서 큰 항목이 무엇일지 가설로 적어 보세요" },
  MAT: { tds: ["TD07", "TD05", "TD03"], work: "생산·구매 관리 · 원가 관리 · 영업", try: "원료를 어디서 사서 누구에게 파는지 공급 흐름을 한 줄로 그려 보세요" },
  SVC: { tds: ["TD09", "TD07", "TD06"], work: "현장 운영 · 고객 응대 · 인력 관리", try: "그 서비스를 이용하는 사람이 겪는 불편 하나를 찾아 개선안을 적어 보세요" },
};
const TIER: Record<string, { head: string; lead: string; color: string }> = {
  A: { head: "내 결과와 잘 맞는 곳", lead: "확인된 강점이 그 업종에서 자주 맡는 일과 겹칩니다", color: PAL.blue },
  B: { head: "이어서 볼 곳", lead: "정리 중인 강점이 그 업종의 일과 겹칩니다", color: PAL.teal },
  C: { head: "넓혀 볼 곳", lead: "아직 채우지 않은 판단이 많이 쓰이는 업종입니다", color: "#8c97ab" },
};

function sjFit(d: D, x: X) {
  const pri = new Set<string>(d.r.priorities.map((p: A) => d.r.map.find((z: A) => z.name === p.domain)?.code).filter(Boolean));
  const groups = (d.sjorgs?.groups ?? []).map((g: A) => {
    const cfg = SJG[g.code];
    const z1 = cfg.tds.filter((t) => x.zones[t] === "Z1_EVIDENCE_ESTABLISHED");
    const z2 = cfg.tds.filter((t) => x.zones[t] === "Z2_EVIDENCE_INCOMPLETE" || x.zones[t] === "Z3_EVIDENCE_LOW_INTEREST");
    const gap = cfg.tds.filter((t) => pri.has(t));
    const tier = z1.length ? "A" : z2.length ? "B" : "C";
    const orgs = (d.sjorgs.orgs as A[]).filter((o) => o.group === g.code)
      .sort((p, q) => Number(!!q.listed) - Number(!!p.listed) || sjKey(p.name).localeCompare(sjKey(q.name), "ko"));
    const names = (ts: string[]) => ts.map((t) => x.name(t)).join(" · ");
    const why = tier === "A"
      ? `확인된 강점인 ${josa(names(z1), ["이", "가"])} 이 업종에서 경영계열이 자주 맡는 ${josa(cfg.work, ["과", "와"])} 겹칩니다.`
      : tier === "B"
        ? `정리 중인 ${josa(names(z2), ["이", "가"])} ${cfg.work} 가운데 마케팅·영업 쪽 일과 겹칩니다.`
        : `${cfg.work}에는 ${names(cfg.tds.slice(0, 2))} 쪽 판단이 많이 쓰이는데, 이 결과에서는 아직 확인되지 않았습니다.`;
    const also = gap.length ? `먼저 채울 판단(${names(gap)})도 이 업종의 일에서 연습할 수 있습니다.` : "";
    return { ...g, cfg, tier, orgs, why, also };
  });
  return groups;
}

const sjKey = (n: string) => n.replace(/주식회사|\(주\)|㈜|^주\)|\s/g, "");
const sjName = (n: string) => n.replace(/\s+/g, " ").trim();
const sjCut = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
const sjShort = (s: string) => s.replace(/^그 외 (기타 )?/, "").replace(/^기타 /, "").replace(/ 제조업$| 서비스업$|업$/, "");
const SJ_LAW = "업종과 검사 결과를 나란히 놓은 정보입니다. 채용 여부와 근무 조건은 확인하지 않았고, 지원은 각 회사의 공식 채용 경로로 본인이 직접 합니다. CareerMatri 는 직업소개·알선을 하지 않습니다.";

function p5fit(d: D, x: X): Page[] {
  if (!d.sjorgs) return [];
  const gs = sjFit(d, x);
  const total = (d.sjorgs.orgs as A[]).length;
  const by = (t: string) => gs.filter((g: A) => g.tier === t);
  const cnt = (t: string) => by(t).reduce((a: number, g: A) => a + g.orgs.length, 0);
  const venture = (d.sjorgs.orgs as A[]).filter((o) => /venture/.test(o.source)).length;
  const listed = (d.sjorgs.orgs as A[]).filter((o) => o.listed).length;
  const out: Page[] = [];
  const sorted = [...gs].sort((p: A, q: A) => p.tier.localeCompare(q.tier) || q.orgs.length - p.orgs.length);
  out.push({
    part: "05", partName: "세종·충청에서 찾아보기", title: `세종 기업 ${total}곳을 내 결과에 대어 보기`,
    body: T(`세종에 있는 기업 ${total}곳을 업종으로 묶고, 내 결과와 이어지는 정도로 나눴습니다`, `중소벤처기업부 벤처기업 확인 명단에서 소재지가 세종인 ${venture}곳과 공시로 본점이 세종인 상장사 ${listed}곳입니다(겹치는 회사는 한 번만 셌습니다). 업종명과 주력 품목은 명단 값 그대로입니다.`) +
      chain([
        { head: "내 결과", body: `강점: ${d.r.map.filter((z: A) => z.zone === "Z1_EVIDENCE_ESTABLISHED").map((z: A) => z.name).join(" · ")}`, color: C.navy },
        { head: "업종에서 맡는 일", body: "경영계열이 그 업종에서 자주 맡는 일의 업무 영역", color: C.blue },
        { head: "겹치는가", body: "강점과 겹치면 ‘잘 맞는 곳’, 정리 중인 영역과 겹치면 ‘이어서 볼 곳’", color: C.teal },
        { head: "나의 다음 걸음", body: "묶음마다 해 볼 조사 하나", color: C.amber },
      ], { width: 700, height: 132 }) +
      `<div class="wide-art">${hbars(sorted.map((g: A) => ({ label: g.name, value: g.orgs.length, color: TIER[g.tier].color })), { max: Math.max(...gs.map((g: A) => g.orgs.length)) * 1.12, width: 700, label: 190, row: 21, valueText: (b) => `${b.value}곳` })}</div>` +
      `<table class="tb tb-xs"><thead><tr><th class="w22">업종 묶음</th><th>경영계열이 자주 맡는 일</th><th class="w30">내 결과와 이어지는 점</th><th>묶음</th></tr></thead><tbody>${sorted.map((g: A) => `<tr><td><b>${E(g.name)}</b> <span class="mut">${g.orgs.length}곳</span></td><td>${E(g.cfg.work)}</td><td>${E(g.tier === "C" ? `아직 확인되지 않은 ${g.cfg.tds.slice(0, 2).map((t: string) => x.name(t)).join(" · ")}` : g.cfg.tds.filter((t: string) => x.zones[t] !== "NOT_EXPLORED" && x.zones[t] !== "Z4_INSUFFICIENT_EVIDENCE").map((t: string) => x.name(t)).join(" · "))}</td><td><span class="tag" style="background:${TIER[g.tier].color}">${E(TIER[g.tier].head)}</span></td></tr>`).join("")}</tbody></table>` +
      `<div class="g3">${(["A", "B", "C"] as const).map((t) => `<div class="b4" style="--c:${TIER[t].color}"><b>${TIER[t].head} · ${cnt(t)}곳</b><p>${E(TIER[t].lead)}</p><p class="mut">${by(t).map((g: A) => E(g.name)).join(" · ")}</p></div>`).join("")}</div>` +
      band("읽는 법", SJ_LAW),
  });
  /* 잘 맞는 곳 · 이어서 볼 곳 · 넓혀 볼 곳 은 표로, 넓혀 볼 곳은 이름 칸으로 줄인다 */
  const ROWS = 34;
  for (const t of ["A", "B"] as const) {
    const rows: string[] = [];
    const wt: number[] = [];
    for (const g of by(t)) {
      wt.push(4.5);
      rows.push(`<tr class="sj-g"><td colspan="3"><b>${E(g.name)} · ${g.orgs.length}곳</b><span>${E(g.why)} ${E(g.also)}</span><em>해 볼 것: ${E(g.cfg.try)}</em></td></tr>`);
      for (const o of g.orgs) wt.push(1), rows.push(`<tr><td><b>${E(sjName(o.name))}</b>${o.listed ? ` <span class="sj-l">${E(o.listed)} 상장</span>` : ""}</td><td>${E(sjCut(sjShort(o.sector), 22))}</td><td class="mut">${E(sjCut(o.product || (o.listed ? "사업보고서의 사업의 개요 참고" : "명단에 적힌 품목 없음"), 34))}</td></tr>`);
    }
    for (let i = 0, k = 0; i < rows.length; k++) {
      /* 묶음 머리 줄은 세 줄 몫이다. 줄 수가 아니라 높이로 끊어야 쪽이 넘치지 않는다 */
      const cap = k === 0 ? ROWS - 6 : ROWS;
      let n = 0, h = 0;
      while (i + n < rows.length && h + wt[i + n] <= cap) h += wt[i + n++];
      const chunk = rows.slice(i, i + n); i += n;
      out.push({
        part: "05", partName: "세종·충청에서 찾아보기", title: `${TIER[t].head}${k ? ` (${k + 1})` : ""}`,
        body: (k === 0 ? T(`${TIER[t].head} ${cnt(t)}곳`, `${TIER[t].lead}. 상장사를 먼저, 그다음은 가나다순입니다.`) : `<p class="k">${E(TIER[t].head)} · 이어서</p>`) +
          `<table class="tb tb-xs sj"><thead><tr><th class="w30">회사</th><th class="w30">업종</th><th>주력 품목</th></tr></thead><tbody>${chunk.join("")}</tbody></table>` +
          band("확인 범위", SJ_LAW),
      });
    }
  }
  const cg = by("C");
  out.push({
    part: "05", partName: "세종·충청에서 찾아보기", title: TIER.C.head,
    body: T(`${TIER.C.head} ${cnt("C")}곳`, "제조·건설·생활 서비스 업종입니다. 지금 결과로는 겹치는 강점이 적지만, 경영계열 지원자가 생산 관리·원가·구매 판단을 새로 쌓으면 이어질 수 있는 곳입니다.") +
      cg.map((g: A) => `<div class="sj-c"><p class="sj-ch"><b>${E(g.name)} · ${g.orgs.length}곳</b><span>${E(g.why)}</span></p><p class="sj-cl">${g.orgs.map((o: A) => `${E(sjName(o.name).replace(/주식회사\s*|\(주\)|㈜|^주\)\s*/g, "").trim())}${o.listed ? "<sup>상장</sup>" : ""}`).join(" · ")}</p></div>`).join("") +
      `<div class="two"><div class="note"><b>이 묶음에서 경영계열이 맡는 일</b><p>제조 회사의 생산 관리·구매·원가 담당은 ‘얼마에 만들어 얼마에 파는가’를 숫자로 관리합니다. 이 결과에서 먼저 채울 판단인 ‘추정 가정’이 그대로 쓰이는 자리입니다.</p></div>
        <div class="note warm"><b>넓혀 보려면</b><p>관심 있는 회사 한 곳의 주력 품목을 골라, 원료 → 생산 → 납품 흐름과 원가에서 큰 항목을 가설로 적어 보세요. 원가회계 과제와 이어 쓰면 경험 기록이 하나 늘어납니다.</p></div></div>` +
      band("확인 범위", SJ_LAW),
  });
  return out;
}

function p5daejeon(d: D, x: X): Page {
  const listed = d.dart.orgs.filter((o: A) => o.financials && /대전|세종|충청/.test(o.dart?.adres ?? ""));
  return {
    part: "05", partName: "세종·충청에서 찾아보기", title: "대전·충청 상장사 공시 숫자",
    body: T("세종과 생활권이 겹치는 대전·충청의 상장사도 함께 봅니다", "공시로 본점이 대전·충청인 것을 확인한 상장사의 2025년 사업보고서 숫자입니다. 지역 산업이 바이오·영상센서·건설처럼 서로 다른 쪽에 있다는 것을 보여 줍니다.") +
      `<div class="wide-art">${moneyBars(listed.map((o: A) => { const f = o.financials.consolidated?.매출액 != null ? o.financials.consolidated : o.financials.separate; return { label: o.name.replace(/\(주\)|주식회사/g, "").trim(), values: [{ name: "매출액", v: f?.매출액 ?? null, color: PAL.violet }, { name: "영업이익", v: f?.영업이익 ?? null, color: PAL.coral }] }; }), { width: 700 })}</div>` +
      `<table class="tb tb-s"><thead><tr><th>회사</th><th>본점</th><th>사업부문별 직원</th><th>사업보고서</th></tr></thead><tbody>${listed.map((o: A) => `<tr><td><b>${E(o.name)}</b></td><td class="mut">${E((o.dart.adres ?? "").split(" ").slice(0, 2).join(" "))}</td><td>${(o.staff?.by_segment ?? []).map((s: A) => `${E(s.segment)} ${s.count.toLocaleString("ko-KR")}명`).join(" · ")}</td><td class="mut">${E(o.financials.report)} ${E(o.financials.year)} · 접수 ${E(o.annual_reports?.[0]?.rcept_dt ?? "")}</td></tr>`).join("")}</tbody></table>` +
      band("출처", `금융감독원 전자공시(OpenDART) 기업개황·사업보고서 주요 계정 · 확인일 ${E(d.dart.checked_on)}. 채용 여부와 근무지는 확인하지 않았습니다.`),
  };
}

function p5overview(d: D, x: X): Page {
  const ov = d.overview.orgs.filter((o: A) => d.dart.orgs.some((z: A) => z.name === o.name && /대전|세종|충청/.test(z.dart?.adres ?? "")));
  return {
    part: "05", partName: "세종·충청에서 찾아보기", title: "사업보고서 ‘사업의 개요’ 읽기",
    body: T("사업보고서 첫 장을 읽으면 그 회사가 무엇으로 돈을 버는지 보입니다", "사업보고서 ‘II. 사업의 내용 > 1. 사업의 개요’의 첫 부분을 옮겼습니다. 원문의 뜻을 바꾸지 않으려고 줄이기만 했습니다.") +
      `<div class="g2l">${ov.slice(0, 4).map((o: A) => `<div class="card"><h4>${E(o.name)}</h4><p class="quote">${E(o.excerpt.slice(0, 230))}${o.excerpt.length > 230 ? "…" : ""}</p><p class="mut sm">${E(o.report)} · 접수 ${E(o.rcept_dt)}</p></div>`).join("")}</div>` +
      H("읽고 나서 적은 것", "참여자 작성 · (주)리가켐바이오사이언스") +
      `<div class="g3">${["이 회사의 사업부문은 몇 개이고, 가장 큰 것은?", "내년 목표 지표를 하나 고른다면?", "그 지표를 고른 까닭 한 줄"].map((l, i) => `<div>${filled(l, E(FILL.read[i]))}</div>`).join("")}</div>`,
  };
}

function p5public(d: D, x: X): Page {
  const pub = d.dart.orgs.filter((o: A) => o.dart && /공사|공단/.test(o.name) && /대전|세종|충청/.test(o.dart.adres ?? ""));
  return {
    part: "05", partName: "세종·충청에서 찾아보기", title: "충청권 공기업 개황",
    body: T("대전에 본사를 둔 공기업은 공시 기업개황으로 확인했습니다", "공기업은 주식시장에 상장하지 않아 사업보고서 숫자는 공시에 없습니다. 기업개황(본점·설립·업종)만 확인했고, 경영 정보는 ALIO 에서 직접 보아야 합니다.") +
      `<table class="tb"><thead><tr><th>기관</th><th>본점 주소</th><th>설립</th><th>업종 코드</th><th>누리집</th></tr></thead><tbody>${pub.map((o: A) => `<tr><td><b>${E(o.name)}</b></td><td>${E(o.dart.adres)}</td><td>${E((o.dart.est_dt ?? "").replace(/(\d{4})(\d{2})(\d{2})/, "$1.$2.$3"))}</td><td>${E(o.dart.induty_code)}</td><td class="mut">${E(o.dart.hm_url ?? "")}</td></tr>`).join("")}</tbody></table>` +
      `<div class="two">
        <div class="card">${H("이 참여자에게 이어지는 판단", "공공·공기관 산업 기준")}${ul(d.industry.judgement_dimensions.slice(0, 5).map((j: A) => `${E(j.name)} <span class="mut">(${E(x.name(j.domain))})</span>`))}</div>
        <div class="card">${H("ALIO 에서 볼 것")}${ul(["기관 일반 현황과 조직도", "경영 목표와 주요 사업", "신입 채용 공고와 직무기술서", "경영평가 결과(기관별 공개 범위)"])}</div>
      </div>` + band("확인 범위", `OpenDART 기업개황 · 확인일 ${E(d.dart.checked_on)}. 채용 계획과 인원은 확인하지 않았습니다.`),
  };
}

function p5how(d: D, x: X): Page {
  return {
    part: "05", partName: "세종·충청에서 찾아보기", title: "기관 한 곳을 직접 조사하는 법",
    body: T("관심 기관 하나를 정해 공식 자료 네 가지로 한 장을 만들어 봅니다", "이 리포트가 공시로 보여 준 것은 출발점입니다. 아래 순서로 직접 확인하면, 면접에서 ‘우리 기관을 어떻게 알게 됐나’에 근거를 들어 답할 수 있습니다.") +
      chain([
        { head: "공시(DART)", body: "사업보고서의 사업의 개요 · 사업부문 · 매출 구조", color: C.navy },
        { head: "ALIO·누리집", body: "경영 목표 · 조직도 · 주요 사업 · 보도자료", color: C.blue },
        { head: "채용 공고", body: "직무기술서의 담당 업무와 필요 지식·기술", color: C.teal },
        { head: "한 장 정리", body: "사업 · 직무 · 내 경험을 한 표로 잇기", color: C.amber },
      ], { width: 700, height: 150 }) +
      H("한 장 정리", "참여자 작성") +
      `<table class="tb ws"><tbody>
        <tr><th>기관 이름</th><td>${E(FILL.onePager.org)}</td><th>확인한 날</th><td>${E(FILL.onePager.date)}</td></tr>
        <tr><th>무엇으로 일하나(사업)</th><td colspan="3">${E(FILL.onePager.biz)}</td></tr>
        <tr><th>지원할 직무와 담당 업무</th><td colspan="3">${E(FILL.onePager.job)}</td></tr>
        <tr><th>그 업무와 이어지는 내 경험</th><td colspan="3">${E(FILL.onePager.link)}</td></tr>
        <tr><th>내가 정한 것 · 남긴 것</th><td colspan="3">${E(FILL.onePager.made)}</td></tr>
        <tr><th>아직 확인하지 못한 것</th><td colspan="3">${E(FILL.onePager.unknown)}</td></tr>
      </tbody></table>` + band("상담 연계", `이 한 장을 ${ORG} 상담에 가져와 지역 일자리와 지원 사업을 함께 찾아보았습니다.`),
  };
}

/* ───────────────────────── 06 지원 준비 ───────────────────────── */

function p6stories(d: D, x: X, a: number): Page {
  const st = d.r.application.stories.slice(a, a + 2);
  return {
    part: "06", partName: "자기소개서·면접 준비", title: `자기소개서 재료 ${a + 1}–${a + st.length}`,
    body: T(a === 0 ? "자기소개서 한 문단은 네 칸으로 씁니다" : "재료가 한두 개 더 있습니다", "칸은 참여자의 응답과 기록에서 가져왔습니다. 노란 칸은 참여자가 상담에서 채운 역할·비교·결과 수치입니다.") +
      st.map((s: A) => `<div class="story"><div class="story-h"><b>${E(s.from)}</b><span>이어지는 직무: ${s.fits.map(E).join(" · ")}</span></div>
        <div class="story-g">${s.parts.map((p: A) => { const f = Object.entries(FILL.story).find(([k]) => s.from.startsWith(k))?.[1]?.[p.label]; const mine = f && /직접 기입/.test(p.text); return `<div class="sp ${mine ? "mine" : ""}"><p class="k">${E(p.label)}</p><p>${E(mine ? f : p.text)}</p></div>`; }).join("")}</div></div>`).join("") +
      filled("위 재료로 쓴 첫 문장", E(FILL.firstLine[a === 0 ? 0 : 1])),
  };
}

function p6frame(d: D, x: X): Page {
  return {
    part: "06", partName: "자기소개서·면접 준비", title: "자기소개서 문단",
    body: T("한 문단은 ‘상황 → 내가 정한 것 → 남긴 것 → 달라진 것’ 순서입니다", "밑줄 부분은 참여자가 상담에서 채운 내용입니다. 아래는 그 뼈대로 완성한 첫 문단입니다.") +
      `<div class="frame">
        <p><span class="fb">[상황]</span> <u>경영전략 캡스톤에서 세종 지역 서비스 기업의 신사업을 검토할 때</u>, 저는 <u>${E(FILL.frame.role)}</u>을 맡았습니다.</p>
        <p><span class="fb">[정한 것]</span> 여러 안 가운데 하나를 근거를 들어 골랐습니다. 기준은 <u>${E(FILL.frame.basis)}</u>였고, 다른 안은 <u>${E(FILL.frame.drop)}</u> 까닭에 고르지 않았습니다.</p>
        <p><span class="fb">[남긴 것]</span> 그 판단을 <u>목표와 지표 표</u>와 <u>사업계획 한 벌</u>로 남겼습니다.</p>
        <p><span class="fb">[달라진 것]</span> 결과를 <u>전사 목표</u>와 비교해 <u>${E(FILL.frame.result)}</u>을 확인했습니다.</p>
      </div>` +
      `<div class="two">
        <div class="note"><b>잘 읽히는 문단</b>${ul(["판단 하나만 깊게 씁니다", "‘우리’ 대신 ‘제가 정한 것’을 씁니다", "숫자 하나와 기간 하나를 넣습니다"])}</div>
        <div class="note warm"><b>흔히 빠지는 함정</b>${ul(["경험을 여러 개 나열하기", "느낀 점으로 문단 끝내기", "결과물 이름 없이 ‘열심히 했다’로 쓰기"])}</div>
      </div>` + filled("완성한 문단", E(FILL.paragraph)),
  };
}

function p6portfolio(d: D, x: X): Page {
  const pf = d.r.application.portfolio;
  const have = pf.filter((p: A) => p.status === "보유").length;
  return {
    part: "06", partName: "자기소개서·면접 준비", title: "포트폴리오 목록",
    body: T(`포트폴리오에 넣을 결과물은 이미 ${have}개, 새로 만들 것은 ${pf.length - have}개입니다`, "검사와 경험 기록에서 고른 결과물을 목록으로 만들었습니다. 결과물 하나마다 ‘내가 정한 것 한 줄’과 ‘비교한 대상 한 줄’을 붙이면 됩니다.") +
      `<div class="two r46"><div class="card cen">${donut([{ label: "보유", value: have, color: PAL.teal }, { label: "새로 만들기", value: pf.length - have, color: PAL.amber }], { size: 220, center: [`${have}`, "이미 가진 결과물"] })}<div class="lg"><span><i style="background:${C.navy}"></i>보유 ${have}</span><span><i style="background:${C.amber}"></i>새로 만들기 ${pf.length - have}</span></div></div>
      <table class="tb tb-s"><thead><tr><th>결과물</th><th>상태</th><th>출처</th></tr></thead><tbody>${pf.map((p: A) => `<tr><td><b>${E(p.title)}</b></td><td>${tag(p.status, p.status === "보유" ? C.navy : C.amber)}</td><td class="mut">${E(p.from)}</td></tr>`).join("")}</tbody></table></div>` +
      H("결과물 한 장의 구성") +
      `<div class="g3"><div class="note"><b>1. 결과물</b><p>표·문서 한 장(캡처해도 됩니다)</p></div><div class="note"><b>2. 내가 정한 것</b><p>그 결과물 안에서 직접 정한 기준 한 줄</p></div><div class="note"><b>3. 비교한 대상</b><p>목표·지난 실적·다른 안 가운데 무엇과 비교했는지 한 줄</p></div></div>` +
      H("포트폴리오 첫 장", "참여자 작성") +
      `<table class="tb ws"><tbody>${FILL.portfolio.map(([h, v]) => `<tr><th>${E(h)}</th><td>${E(v)}</td></tr>`).join("")}</tbody></table>`,
  };
}

function p6interview(d: D, x: X, a: number): Page {
  const qs = d.r.application.interview.slice(a, a + 3);
  return {
    part: "06", partName: "자기소개서·면접 준비", title: `면접 질문 ${a + 1}–${a + qs.length}`,
    body: T(a === 0 ? "면접관은 고른 판단을 다시 묻습니다" : "질문이 세 개 더 있습니다", "질문은 참여자가 고른 판단에서 만들었고, ‘내 재료’는 같은 판단에서 고른 근거입니다. 아래 메모는 참여자가 상담에서 준비한 답입니다.") +
      qs.map((q: A, i: number) => `<div class="qa"><div class="qa-q"><span>Q${a + i + 1}</span><b>${E(q.q.replace(/^“|”$/g, ""))}</b></div>
        <div class="g3 qa-b"><div><p class="k">왜 묻나</p><p>${E(q.why)}</p></div><div><p class="k">내 재료</p><p>${E(q.material)}</p></div><div><p class="k">답의 방향</p><p>${E(q.pick && q.axis && AXN[q.axis] ? `${AXN[q.axis]}에서 고른 ‘${q.pick}’를 장면으로, 기준 → 버린 안 → 결과 순서로 30초 안에 말하기` : /^준비 —/.test(q.material) ? "아직 해 본 장면이 없는 판단입니다. 실행 과제를 끝낸 뒤 그 결과물을 들고 기준 → 버린 안 → 결과 순서로 답하기" : "직접 겪은 장면 하나를 골라 기준 → 버린 안 → 결과 순서로 30초 안에 말하기")}</p></div></div>
        ${filled("준비한 답", E(FILL.interview[a + i] ?? ""))}</div>`).join(""),
  };
}

function p6roleQ(d: D, x: X): Page {
  const g = d.guide[d.r.strategy.roleCode];
  return {
    part: "06", partName: "자기소개서·면접 준비", title: "경영기획 직무 면접 질문",
    body: T("직무 면접 질문은 ‘숫자로 정하고, 고르고, 고친’ 경험을 묻습니다", "경영기획 직무 안내의 질문입니다. 참여자의 근거가 있는 판단은 표시했습니다.") +
      g.interview.map((q: A) => { const lv = d.r.radar.best.find((b: A) => b.axis === q.axis)?.level ?? 0;
        return `<div class="qa"><div class="qa-q"><span>${E(AXN[q.axis])}</span><b>${E(q.q)}</b></div><div class="two qa-b"><div><p class="k">왜 묻나</p><p>${E(q.why)}</p></div><div><p class="k">지금 단계</p>${pip(lv)}<p class="mut sm">${lv >= 2 ? "근거가 있는 판단입니다. 장면 하나를 정해 두세요." : "아직 장면이 적은 판단입니다. 30일 할 일과 이어집니다."}</p></div></div></div>`; }).join("") +
      H("30초 답변 연습", "‘목표를 숫자로 정해 본 경험’ · 참여자 작성") + filled("", E(FILL.roleQ)),
  };
}

function p6check(d: D, x: X): Page {
  const items = [
    ["자기소개서", ["문단마다 ‘내가 정한 것’이 하나씩 있다", "결과물 이름이 문장에 들어 있다", "결과 수치와 기간을 직접 적었다", "직무기술서의 담당 업무 표현을 썼다"]],
    ["포트폴리오", ["결과물마다 정한 것 한 줄 · 비교 대상 한 줄", "보유 결과물 7개 가운데 3개를 골랐다", "새로 만들 결과물 1개의 마감일을 정했다"]],
    ["면접", ["Q1~Q6 각각 장면 하나를 정했다", "버린 안의 까닭을 말할 수 있다", "결과가 결정에 쓰인 장면을 하나 준비했다"]],
    ["기관 조사", ["공시·누리집·채용 공고를 직접 열어 봤다", "한 장 정리 양식을 채웠다", "아직 확인하지 못한 것을 적어 두었다"]],
  ] as const;
  return {
    part: "06", partName: "자기소개서·면접 준비", title: "제출 전 점검표",
    body: T("자기소개서 · 면접 전에 열세 가지를 점검했습니다", "참여자가 지원 전에 하나씩 확인하며 표시했습니다.") +
      `<div class="g2">${items.map(([h, xs]) => `<div class="card">${H(h)}<ul class="cb">${xs.map((t) => `<li><i class="on"></i>${E(t)}</li>`).join("")}</ul></div>`).join("")}</div>` +
      H("30초 자기소개", "참여자 작성") + filled("", E(FILL.selfIntro)),
  };
}

/* ───────────────────────── 07 로드맵 ───────────────────────── */

function p7chains(d: D, x: X): Page {
  const pr = d.r.priorities;
  return {
    part: "07", partName: "실행 로드맵", title: "먼저 채울 판단 세 가지",
    body: T("먼저 채울 판단은 목표 직무에서 거꾸로 골랐습니다", "빈자리 가운데 목표 직무(경영기획)의 업무 영역이나 핵심 판단에 걸리는 것만 할 일로 만들었습니다. 각 줄은 ‘목표 → 지금 결과 → 근거 → 할 일 → 남길 것’으로 이어집니다.") +
      pr.map((p: A) => `<div class="prio"><div class="prio-h"><span>${p.order}</span><b>${E(p.title)}</b>${tag(p.relationTag, C.navy)}<span class="mut">${E(p.when)}</span></div>
        ${chain([
          { head: "목표", body: p.chain.goal, color: C.navy }, { head: "지금 결과", body: `${p.domain} · ${p.what}`, color: C.blue },
          { head: "할 일", body: p.title, color: C.teal }, { head: "남길 것", body: p.output, color: C.amber },
        ], { width: 700, height: 108 })}
        <p class="sm">${p.why.map(E).join(" ")}<br><span class="mut">확인: ${E(p.check)}</span></p></div>`).join(""),
  };
}

function plan(d: D, x: X) {
  const swap: Record<string, A> = {};
  const tidy = (p: A) => ({ ...p, label: String(p.label).replace(/의? 빈칸 채우기$/, " 보완하기"), what: String(p.what ?? "").replace(/의 빈칸 채우기/, " 보완하기") });
  return d.r.plan.map(tidy).map((p: A) => {
    if (!x.touches(p.label + p.what + (p.output ?? ""))) return p;
    if (/공식 자료/.test(p.label)) return { ...p, label: "세종 본점 상장사 한 곳 사업보고서 정리", what: "공시(OpenDART)에서 세종 본점 상장사 한 곳의 사업보고서를 열어 사업 구조를 한 장으로 정리합니다.", output: "기관 한 장 정리", how: "공시(OpenDART) 사업보고서 원문을 열어 06장의 한 장 정리 양식에 옮기기", check: "사업부문과 매출 구조가 표로 적혀 있는가", why: "기관 정보는 공식 원문으로 확인한 것만 씁니다" };
    return { ...p, label: "세종 공공기관 한 곳의 ‘내년 목표 지표’ 시안", what: "관심 공공기관 한 곳의 경영 목표를 ALIO 에서 읽고, 내년에 볼 지표 세 개와 근거를 정리합니다.", output: "목표·지표 시안과 판단 근거 한 장", how: "ALIO 에서 그 기관의 경영 목표와 주요 사업을 읽고 지표 셋을 고르기", check: "지표마다 재는 방법과 고른 까닭이 있는가", why: "공공·공기관 목표와 경영기획 연습을 잇는 일입니다" };
  });
}

function p7gantt(d: D, x: X): Page {
  const pl = plan(d, x).filter((p: A) => /일$/.test(p.period));
  const span: Record<string, [number, number]> = { "30일": [1, 30], "60일": [31, 60], "90일": [61, 90] };
  return {
    part: "07", partName: "실행 로드맵", title: "90일 실행 간트",
    body: T("90일 동안 결과물 여섯 개를 남깁니다", "기간마다 결과물 둘씩입니다. 막대 안의 글은 남길 결과물입니다. 한 기간에 둘보다 많이 잡지 않았습니다.") +
      `<div class="wide-art">${gantt(pl.map((p: A, i: number) => ({ label: p.label, from: span[p.period][0], to: span[p.period][1], color: [PAL.blue, PAL.coral, PAL.teal][Math.floor(i / 2) % 3], note: p.output })), { width: 710, label: 250 })}</div>` +
      `<table class="tb tb-s"><thead><tr><th>기간</th><th>할 일</th><th>어디서</th><th>확인</th></tr></thead><tbody>${pl.map((p: A) => `<tr><td>${E(p.period)}</td><td><b>${E(p.label)}</b><br><span class="mut">${E(p.what)}</span></td><td>${E(p.how ?? "")}</td><td class="mut">${E(p.check ?? "")}</td></tr>`).join("")}</tbody></table>`,
  };
}

function p7long(d: D, x: X): Page {
  const pl = plan(d, x).filter((p: A) => /개월$/.test(p.period));
  const months = d.r.growth.months;
  return {
    part: "07", partName: "실행 로드맵", title: "6개월 · 12개월",
    body: T("6개월 뒤에는 포트폴리오 첫 장을, 12개월 뒤에는 재검사로 달라진 점을 봅니다", "90일 계획 뒤에 이어지는 길입니다. 달마다 결과물 하나씩을 남기도록 적었습니다.") +
      chain(months.map((mm: A, i: number) => ({ head: mm.when, body: mm.what, color: [PAL.blue, PAL.teal, PAL.amber, PAL.coral, PAL.violet][i % 5] })), { width: 700, height: 176 }) +
      `<table class="tb tb-s"><thead><tr><th>시점</th><th>남길 것</th></tr></thead><tbody>${months.map((mm: A) => `<tr><td>${E(mm.when)}</td><td>${E(mm.output)}</td></tr>`).join("")}${pl.map((p: A) => `<tr><td>${E(p.period)}</td><td><b>${E(p.label)}</b> — ${E(p.output)}</td></tr>`).join("")}</tbody></table>` +
      band("재검사", "12개월 뒤 같은 검사를 다시 보면, 이번 결과와 무엇이 달라졌는지를 영역·판단 단위로 비교할 수 있습니다. 지난 결과는 고쳐지지 않고 그대로 남습니다."),
  };
}

function p7research(d: D, x: X): Page {
  const rs = d.r.growth.research;
  return {
    part: "07", partName: "실행 로드맵", title: "직무를 직접 알아보는 다섯 걸음",
    body: T("직무 이름보다 공고의 ‘담당 업무’ 문장을 모으는 것이 먼저입니다", "경영기획을 목표로 할 때 직무를 직접 알아보는 순서입니다.") +
      `<ol class="lo big">${rs.map((s: A) => `<li><b>${E(s.step)}</b><span>${E(s.how.replace(/이 보고서의 진로 탐색 기업 가운데 하나를 골라/, "06장의 공시 기업 가운데 하나를 골라"))}</span></li>`).join("")}</ol>` +
      H("공고 다섯 건 비교표", "참여자 작성") +
      `<table class="tb ws"><thead><tr><th>기관·회사</th><th>담당 업무(두 번 이상 나온 것)</th><th>필요 지식·기술</th><th>내 근거</th></tr></thead><tbody>${FILL.postings.map((r) => `<tr>${r.map((c, i) => `<td>${i === 0 ? `<b>${E(c)}</b>` : E(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`.replace('class="tb ws"', 'class="tb ws tall"'),
  };
}

function p7weekly(d: D, x: X): Page {
  return {
    part: "07", partName: "실행 로드맵", title: "주간 점검표",
    body: T("한 주에 한 번, 다섯 줄만 적습니다", "30일 할 일(목표·지표 정의표)을 주 단위로 쪼개 점검한 기록입니다. 네 주 만에 첫 결과물이 나왔습니다.") +
      `<table class="tb ws wk"><thead><tr><th>주</th><th>이번 주 한 일</th><th>직접 정한 것</th><th>남긴 것</th><th>막힌 것</th><th>다음 주</th></tr></thead><tbody>${FILL.weekly.map((r, w) => `<tr><td>${w + 1}주</td>${r.map((c) => `<td>${E(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>` +
      `<div class="two"><div class="note"><b>막혔을 때</b>${ul(["결과물 이름부터 정하고 칸을 먼저 만듭니다", "기준을 정하기 어려우면 버릴 안부터 적습니다", "상담 때 이 표를 그대로 가져옵니다"])}</div><div class="note"><b>끝났을 때</b>${ul(["결과물을 플랫폼의 경험 기록에 더합니다", "정한 것 한 줄 · 비교 대상 한 줄을 붙입니다", "현재 상태가 어떻게 바뀌었는지 확인합니다"])}</div></div>`,
  };
}

function p7log(d: D, x: X): Page {
  return {
    part: "07", partName: "실행 로드맵", title: "상담 기록지",
    body: T("상담 기록지", `${ORG} 상담자와 참여자가 함께 씁니다. 다음 만남에서 무엇이 달라졌는지 이 장으로 바로 비교합니다.`) +
      `<table class="tb ws lg-ws"><tbody>
        <tr><th>${E(FILL.log[0][0])}</th><td>${E(FILL.log[0][1])}</td><th>${E(FILL.log[1][0])}</th><td>${E(FILL.log[1][1])}</td></tr>
        ${FILL.log.slice(2).map(([h, v]) => `<tr><th>${E(h)}</th><td colspan="3">${E(v)}</td></tr>`).join("")}
      </tbody></table>` +
      band("개인정보", "기록지에는 참여자의 연락처를 적지 않았습니다. 기관의 상담 기록 규정을 따릅니다."),
  };
}

/* ───────────────────────── 부록 ───────────────────────── */

function a1answers(d: D, x: X): Page {
  return {
    part: "", partName: "부록", title: "응답 요약",
    body: T("응답 요약", "영역과 판단마다 결과 모델이 정한 상태입니다. 상태 이름은 ‘읽는 법’의 단계와 같습니다.") +
      `<table class="tb tb-xs"><thead><tr><th>영역</th>${AX.map((a) => `<th>${a}</th>`).join("")}<th>묶음</th></tr></thead><tbody>${d.r.map.map((z: A) => `<tr><td><b>${E(z.name)}</b></td>${x.levels(z.code).map((v) => `<td class="c${x.est(z.code) ? " mut" : ""}">${["없음", "지시", "직접", "기준"][v ?? 0]}</td>`).join("")}<td>${E(ZONE_SAID[z.zone]?.tag ?? "")}</td></tr>`).join("")}</tbody></table>` +
      `<p class="mut sm">J1~J8: ${AX.map((a) => `${a} ${AXN[a]}`).join(" · ")}. 옅은 글씨는 경험 응답과 공통 판단 응답으로 읽은 단계입니다.</p>` +
      H("공통 판단", "영역을 가리지 않고 물은 문항") +
      `<table class="tb tb-xs"><thead><tr><th>판단</th><th>해 봤다고 답함</th><th>직접 정함</th></tr></thead><tbody>${d.m.common.axes.map((c: A) => `<tr><td>${E(AXN[c.axis])}</td><td>${c.confirmed ? "예" : "아직"}</td><td>${c.owned ? "예" : "아직"}</td></tr>`).join("")}</tbody></table>`,
  };
}

const VER_KO: Record<string, string> = { major: "전공 계열", core_version: "전공 영역 사전", scoring_version: "판단 규칙", item_bank_version: "문항 묶음", role_pack_version: "직무 문항", region_layer_version: "지역 자료", industry_pack_version: "산업 문항", result_model: "결과 모델" };

function a2trace(d: D, x: X): Page {
  const tr = d.r.trace.filter((t: A) => t.section !== "기업 심층 분석" && ![...d.kodata].some((n) => JSON.stringify(t).includes(n))).slice(0, 16).map((t: A) => ({ ...t, claim: String(t.claim).replace(/\[[A-Z_]+\]\s*/g, "").replace(/^\d+\.\s*/, "").replace(/: BOTH$/, ": 검사·기록 모두").replace(/: TEST_ONLY$/, ": 검사에만").replace(/: RECORD_ONLY$/, ": 기록에만") }));
  return {
    part: "", partName: "부록", title: "결론과 근거 추적",
    body: T("이 리포트의 결론은 모두 근거를 되짚을 수 있습니다", "리포트의 주요 결론마다 어느 응답과 근거에서 나왔는지 적었습니다(앞의 16줄).") +
      `<table class="tb tb-xs"><thead><tr><th>장</th><th>결론</th><th>근거</th></tr></thead><tbody>${tr.map((t: A) => `<tr><td class="w18">${E(t.section)}</td><td class="w30"><b>${E(t.claim)}</b></td><td class="mut">${(t.evidence ?? []).slice(0, 4).map(E).join(" · ")}</td></tr>`).join("")}</tbody></table>`,
  };
}

function a3sources(d: D, x: X): Page {
  return {
    part: "", partName: "부록", title: "출처와 확인 범위",
    body: T("출처와 확인 범위") +
      `<table class="tb"><thead><tr><th>자료</th><th>무엇에 썼나</th><th>확인일</th></tr></thead><tbody>
        <tr><td><b>CareerMatri 검사 응답 · 결과 모델</b></td><td>판단 단계, 영역 묶음, 빈자리, 할 일</td><td>${E(d.r.meta.answeredOn)}</td></tr>
        <tr><td><b>참여자 경험 기록</b></td><td>시간축, 교차 확인, 자기소개서 재료</td><td>${E(d.r.meta.answeredOn)}</td></tr>
        <tr><td><b>경영 계열 영역 사전 · 직무 안내</b></td><td>업무 흐름, 직무가 하는 일, 연습 과제(직무 일반)</td><td>판본 ${E(d.r.versions.core_version)}</td></tr>
        <tr><td><b>OpenDART 기업개황</b></td><td>세종·대전·충청 본점 확인, 설립·업종</td><td>${E(d.sejong?.checked_on ?? d.dart.checked_on)}</td></tr>
        <tr><td><b>OpenDART 사업보고서 주요 계정·직원 현황</b></td><td>매출액·영업이익·당기순이익·직원 수</td><td>${E(d.dart.checked_on)}</td></tr>
        <tr><td><b>OpenDART 사업보고서 ‘사업의 개요’</b></td><td>원문 발췌(줄이기만 함)</td><td>${E(d.dart.checked_on)}</td></tr>
      </tbody></table>` +
      H("싣지 않은 것") + `<div class="two"><div>${ul(["제3자 기업정보 서비스의 신용·재무 자료", "공시 의무가 없는 비상장 기업의 정보", "채용 계획·채용 인원·근무지"])}</div><div>${ul(["참여자의 이름·학번·연락처", "다른 참여자와 견준 순위", "임금·연봉 정보"])}</div></div>` +
      H("공시 원문 주소") + `<p class="mut sm">${[...(d.sejong?.orgs ?? []).flatMap((o: A) => (o.annual_reports ?? []).slice(0, 1).map((rp: A) => `${E(o.corp_name)} ${E(rp.url)}`)), ...d.dart.orgs.filter((o: A) => o.financials && /대전|세종|충청/.test(o.dart?.adres ?? "")).map((o: A) => `${E(o.name)} ${E(o.annual_reports?.[0]?.url ?? "")}`)].join("<br>")}</p>`,
  };
}

function a4method(d: D, x: X): Page {
  return {
    part: "", partName: "부록", title: "방법과 한계",
    body: T("이 검사가 하는 일과 하지 않는 일") +
      `<div class="two">
        <div class="card">${H("하는 일")}${ul(["12가지 업무 영역마다 관심·경험·배울 뜻을 묻고, 관심 높은 영역부터 여덟 판단을 깊게 묻습니다. 나머지 영역은 경험 응답과 공통 판단 응답으로 단계를 읽습니다.", "응답과 체크리스트 근거가 함께 있어야 ‘기준까지 직접 정함’으로 올립니다.", "목표 직무의 업무 영역에 걸리는 빈자리만 할 일로 만듭니다.", "같은 응답이면 언제나 같은 결과가 나옵니다(문장은 정해진 규칙으로 만듭니다)."])}</div>
        <div class="card">${H("하지 않는 일")}${ul(["직무 적합도·합격 가능성·연봉을 계산하지 않습니다.", "다른 참여자와 견준 순위를 내지 않습니다(규준이 아직 없습니다).", "성격·적성 유형을 진단하지 않습니다.", "취업을 알선하거나 기업을 추천하지 않습니다."])}</div>
      </div>` +
      H("결과가 만들어지는 길") + chain([
        { head: "응답", body: "영역마다 관심·경험, 판단 여덟 가지의 단계", color: C.navy }, { head: "근거", body: "체크리스트에서 고른 장면과 결과물", color: C.blue },
        { head: "단계", body: "응답과 근거가 함께 있을 때만 올린다", color: C.teal }, { head: "묶음", body: "필수 판단과 결과물로 영역을 나눈다", color: C.amber },
        { head: "할 일", body: "목표 직무에 걸리는 빈자리만 고른다", color: C.rose },
      ], { width: 700, height: 118 }) +
      H("검증 상태") + `<p>이 검사는 문항 설계와 판정 규칙의 내부 점검을 마쳤고, 전공자 검토와 실제 참여자 파일럿을 진행하는 단계입니다. 그래서 ‘검증된 검사’로 소개하지 않습니다. 파일럿 결과가 쌓이면 그 내용을 판본 정보와 함께 공개합니다.</p>` +
      H("판본") + `<table class="tb tb-xs"><tbody>${Object.entries(d.r.versions).map(([k, v]) => `<tr><th>${E(VER_KO[k] ?? k)}</th><td>${E(v == null || v === "null" ? "없음" : String(v))}</td></tr>`).join("")}</tbody></table>`,
  };
}

function a5words(): Page {
  const ws: [string, string][] = [
    ["업무 영역", "경영계열 일을 12가지로 나눈 것. 경영전략·기획, 마케팅·시장, 영업·사업개발, 재무·투자 판단, 회계·원가, 인사·조직, 운영·프로세스, 데이터·의사결정, 고객·서비스 운영, 수요·예약·가격 관리, 글로벌 비즈니스, 정보시스템·업무 요구"],
    ["판단", "업무 안에서 되풀이되는 결정 여덟 가지. 과제 범위·지표·기준과 배분·방법·결과물·비교·원인과 수정·결정에 쓰임"],
    ["단계", "한 판단을 얼마나 깊이 해 봤는지. 해 본 적 없음 · 지시받아 수행 · 직접 수행 · 기준까지 직접 결정"],
    ["근거 갖춤", "직접 판단한 일과 남긴 결과물이 함께 확인되는 영역"],
    ["근거 일부", "해 본 일은 확인되지만 결과물이나 비교 기록이 아직 부족한 영역"],
    ["빈자리", "목표 직무에 필요한데 아직 근거가 없는 판단"],
    ["결과물", "판단을 다른 사람이 읽고 쓸 수 있게 남긴 표·문서"],
    ["경험 기록", "참여자가 플랫폼에 직접 적어 둔 활동. 검사 응답과 따로 받는다"],
    ["직무 안내", "직무가 일반적으로 하는 일에 대한 설명. 개인 판정이 아니다"],
    ["OpenDART", "금융감독원 전자공시시스템의 공개 자료. 상장사의 기업개황과 사업보고서를 볼 수 있다"],
    ["ALIO", "공공기관 경영정보 공개시스템. 공공기관의 일반 현황과 채용 정보를 볼 수 있다"],
    ["직무기술서", "공공기관 채용 공고에 붙는 직무 설명. 담당 업무와 필요 지식·기술이 적혀 있다"],
    ["사업보고서", "상장사가 해마다 공시하는 보고서. ‘사업의 내용’에 사업부문과 매출 구조가 적혀 있다"],
    ["매출액 · 영업이익", "매출액은 판 금액의 합, 영업이익은 본업에서 남긴 돈. 공시 숫자는 억 원 단위로 반올림했다"],
    ["연결 · 별도", "연결은 자회사를 합친 숫자, 별도는 그 회사 하나의 숫자"],
    ["재검사", "같은 검사를 다시 보아 지난 결과와 영역·판단 단위로 비교하는 일. 지난 결과는 고쳐지지 않는다"],
  ];
  return {
    part: "", partName: "부록", title: "용어 풀이",
    body: T("용어 풀이") + `<dl class="dl">${ws.map(([a, b]) => `<dt>${E(a)}</dt><dd>${E(b)}</dd>`).join("")}</dl>`,
  };
}

function a6close(d: D): Page {
  return {
    part: "", partName: "부록", title: "맺으며",
    body: T("다음 단계는 이 결과를 문서와 프로젝트로 바꾸는 일입니다", "이 리포트는 끝이 아니라 시작점입니다. 할 일 하나를 끝낼 때마다 경험 기록에 더하면, 현재 상태가 그만큼 달라집니다.") +
      `<div class="g3">${d.r.final.slice(0, 3).map((f: A, i: number) => `<div class="card"><p class="k">${E(f.when)}</p><h4>${i + 1}. ${E(f.label.replace(/의? 빈칸 채우기$/, " 보완하기").replace(/\(주\)플랜아이 공식 자료 확인 메모/, "세종 본점 상장사 한 곳 사업보고서 정리"))}</h4><p class="mut">${E(f.why)}</p></div>`).join("")}</div>` +
      `<div class="close-box"><p class="k">${E(ORG)} × CareerMatri</p><h3>청년의 경험을 지역 일자리와 잇는 리포트</h3><p>참여자 본인이 결과를 먼저 받고, 기관에는 동의한 경우의 개인 결과와 다섯 명 미만이면 수를 내지 않는 집계만 제공됩니다.</p></div>` +
      `<div class="two"><div class="note"><b>다음 상담 때 가져올 것</b>${ul(["목표·지표 정의표 완성본", "주간 점검표 네 줄", "채운 경험 기록 한 건"])}</div><div class="note"><b>플랫폼에서 이어 하기</b>${ul(["경험 기록에 결과물 더하기", "현재 상태에서 달라진 판단 확인", "12개월 뒤 재검사로 비교"])}</div></div>` +
      H("기관에서 함께 쓰는 화면") + `<div class="g3"><div class="card"><h4>응시 현황</h4><p>담당자 화면에서 대상자·시작·완료와 완료율을 학과·집단별로 봅니다.</p></div><div class="card"><h4>집계와 내려받기</h4><p>영역 묶음과 목표 직무 집계를 CSV로 받습니다. 다섯 명 미만인 칸은 수를 내지 않습니다.</p></div><div class="card"><h4>개인 결과</h4><p>참여자가 동의한 경우에만 기관이 개인 결과를 열람합니다. 기본값은 비공개입니다.</p></div></div>` +
      `<p class="mut sm">CareerMatri는 직업정보제공사업 신고 사업자가 운영하며, 취업 알선을 하지 않습니다. 기업 정보는 공시로 확인한 범위만 실었습니다.</p>`,
  };
}

/* ───────────────────────── 조립 ───────────────────────── */

const PIN = `<svg viewBox="0 0 200 200" width="100%" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="150" r="46" fill="none" stroke="#3c5a96" stroke-width="2"/><circle cx="100" cy="150" r="26" fill="none" stroke="#3c5a96" stroke-width="2"/><path d="M100 30c-26 0-44 19-44 43 0 32 44 77 44 77s44-45 44-77c0-24-18-43-44-43z" fill="#2c63d6"/><circle cx="100" cy="73" r="16" fill="#1b2f57"/></svg>`;
const DOC = `<svg viewBox="0 0 200 200" width="100%" xmlns="http://www.w3.org/2000/svg"><rect x="52" y="22" width="96" height="128" rx="8" fill="#fff" opacity=".12"/><rect x="62" y="36" width="96" height="128" rx="8" fill="#fff"/><rect x="76" y="56" width="52" height="7" rx="3" fill="#2c63d6"/><rect x="76" y="74" width="66" height="5" rx="2.5" fill="#c9d3e6"/><rect x="76" y="86" width="60" height="5" rx="2.5" fill="#c9d3e6"/><rect x="76" y="98" width="64" height="5" rx="2.5" fill="#c9d3e6"/><rect x="76" y="116" width="40" height="18" rx="4" fill="#14907f"/><circle cx="152" cy="150" r="20" fill="#c9821a"/><path d="M143 150l6 6 12-12" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/></svg>`;

function build(d: D): Page[] {
  const x = derive(d);
  const P: Page[] = [];
  P.push(outer(d, x), cover(d, x), about(d, x), howToRead(), counselor(d, x));
  P.push(chapter("01", "한눈에 보기", "지금 설명할 수 있는 일과 비어 있는 일, 목표 직무까지 남은 거리를 여덟 쪽에 담았습니다.", ["핵심 진단 세 가지", "결과에서 할 일까지 한 장", "내 결과에 따라 무엇을 할까", "숫자로 본 근거", "12가지 업무 영역 지도", "관심과 경험의 사분면", "판단 여덟 가지의 깊이", "목표 직무 준비"], ring(d.r.map.map((z: A) => ({ name: "", fill: ZC[z.zone], ring2: IC[z.interest] })), { size: 360 })));
  P.push(p1glance(d, x), p1action(d, x), p1tree(d, x), p1dash(d, x), p1ring(d, x), p1quad(d, x), p1best(d, x), p1role(d, x));
  /* 자기소개서·면접을 둘째 장으로 당긴다: 참여자가 가장 먼저 쓰는 쪽이다 */
  P.push(chapter("02", "자기소개서·면접 준비", "검사와 경험 기록에서 고른 근거로 자기소개서 문단과 면접 답변을 만들었습니다.", ["자기소개서 재료", "자기소개서 문단", "포트폴리오 목록", "면접 질문 여섯과 준비한 답", "경영기획 직무 면접 질문", "제출 전 점검표 · 30초 자기소개"], DOC));
  P.push(p6stories(d, x, 0), p6stories(d, x, 2), p6frame(d, x), p6portfolio(d, x), p6interview(d, x, 0), p6interview(d, x, 3), p6roleQ(d, x), p6check(d, x));
  P.push(chapter("03", "판단 프로파일", "여덟 가지 업무 판단을 어디까지 해 봤는지 방사형 그래프와 지도로 봅니다.", ["판단 프로파일 방사형 그래프", "영역별 방사형 그래프", "영역 × 판단 지도", "프로파일 해석", "강점 세 가지", "응답을 믿을 수 있는가"], radar(AX.map(() => ""), d.r.radar.series.map((s: A, i: number) => ({ name: s.name, levels: s.levels, color: [PAL.blue, PAL.coral, PAL.teal][i] })), { size: 360, ring: false })));
  P.push(p2radar(d, x), p2small(d, x), p2heat(d, x), p2profile(d, x), p2strength(d, x, 0), p2strength(d, x, 1), p2strength(d, x, 2), p2quality(d, x));
  P.push(chapter("04", "12가지 업무 영역", "영역마다 일이 흘러가는 순서와 판단 여덟 가지의 지금 단계를 한 쪽씩 적었습니다.", ["영역 01~12", "근거 원장", "경험 기록 시간축", "경험 기록 해설", "검사와 기록의 교차 확인"], ring(d.r.map.map((z: A) => ({ name: "", fill: ZC[z.zone] })), { size: 360 })));
  d.r.map.forEach((z: A, i: number) => P.push(p3domain(d, x, z.code, i + 1)));
  P.push(p3ledger(d, x), p3timeline(d, x), p3record(d, x, 0), p3record(d, x, 2), p3cross(d, x));
  P.push(chapter("05", "직무 탐색", "경영계열 대표 직무 여덟과 참여자의 근거를 겹쳐 보고, 목표 직무를 깊게 봅니다.", ["직무와 영역의 지도", "직무별로 갖춘 근거", "경영기획 · 데이터·분석 · 마케팅 · 재무·회계", "그 밖의 직무 넷", "공공·공기관에서 보는 판단", "공공부문 지원 준비"], heat(["", "", "", ""], ["", "", "", "", "", ""], (i, j) => ({ fill: [C.navy, C.blue, C.sky, "#dfe3ea"][(i + j) % 4] }), { width: 360, label: 4, head: 4, row: 40 })));
  P.push(p4matrix(d, x), p4coverage(d, x));
  P.push(...rolePages(d, x, "ROLE_PLAN_V1", 3), ...rolePages(d, x, "ROLE_ANALYTICS_V1", 2), ...rolePages(d, x, "ROLE_MKT_V1", 1), ...rolePages(d, x, "ROLE_FINACC_V1", 1));
  P.push(p4others(d, x, ["ROLE_OPS_V1", "ROLE_CS_V1", "ROLE_SALES_V1", "ROLE_HR_V1"]), p4industry(d, x), p4public(d, x));
  P.push(chapter("06", "세종·충청에서 찾아보기", `벤처기업 확인 명단과 공시(OpenDART)로 확인한 세종 기업 ${d.sjorgs?.orgs?.length ?? 0}곳을 내 결과에 대어 보고, 대전·충청의 기업과 공기업, 관심 기관을 조사하는 법을 정리했습니다.`, [`세종 기업 ${d.sjorgs?.orgs?.length ?? 0}곳과 내 결과`, "내 결과와 잘 맞는 곳", "이어서 볼 곳 · 넓혀 볼 곳", "세종 본점 상장사", "매출과 영업이익", "대전·충청 상장사 공시 숫자", "기관 조사 양식"], PIN));
  P.push(...p5fit(d, x), ...p5sejong(d, x), p5daejeon(d, x), p5how(d, x));
  P.push(chapter("07", "실행 로드맵", "먼저 채울 판단 세 가지에서 시작해 90일 · 6개월 · 12개월 계획으로 이어집니다.", ["먼저 채울 판단 세 가지", "90일 실행 간트", "6개월 · 12개월", "직무를 알아보는 다섯 걸음", "주간 점검표", "상담 기록지"], gantt([{ label: "", from: 1, to: 30, color: C.navy }, { label: "", from: 20, to: 60, color: C.blue }, { label: "", from: 50, to: 90, color: C.teal }], { width: 360, label: 4 })));
  P.push(p7chains(d, x), p7gantt(d, x), p7long(d, x), p7research(d, x), p7weekly(d, x), p7log(d, x));
  P.push(a1answers(d, x), a2trace(d, x), a3sources(d, x), a4method(d, x), a5words(), a6close(d));
  /* 쪽 함수는 옛 장 번호를 들고 있다. 장 표지는 위에서 새 번호로 세웠으니 나머지 쪽만 옮긴다 */
  const RE: Record<string, string> = { "02": "03", "03": "04", "04": "05", "05": "06", "06": "02" };
  for (const pg of P) if (pg.kind !== "chapter" && RE[pg.part]) pg.part = RE[pg.part];
  P.splice(2, 0, toc(P));
  return P;
}

/* ───────────────────────── 글꼴·모양 ───────────────────────── */

const CSS = `
@page{size:A4;margin:0}
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:#e9ecf1}
body{font-family:Pretendard,"Noto Sans KR",sans-serif;color:${C.ink};font-size:9.6pt;line-height:1.55;word-break:keep-all;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.pg{width:210mm;height:297mm;padding:13mm 15mm 11mm;background:#fff;position:relative;overflow:hidden;display:flex;flex-direction:column;page-break-after:always;break-after:page;margin:0 auto}
.rh{display:flex;align-items:baseline;gap:10px;border-bottom:1.5px solid ${C.navy};padding-bottom:2.2mm;margin-bottom:5mm;font-size:8.6pt;color:${C.ink3}}
.rh-n{font-weight:800;color:${C.blue};letter-spacing:.02em}.rh-t{font-weight:700;color:${C.navy}}.rh-r{margin-left:auto}.rh-r b{color:${C.rose};font-weight:700}
.rf{display:flex;gap:12px;border-top:1px solid ${C.line};padding-top:2mm;margin-top:3mm;font-size:8pt;color:${C.ink3}}.rf-no{margin-left:auto;font-weight:700;color:${C.navy}}
.bd{flex:1;display:flex;flex-direction:column;gap:4.2mm;min-height:0}
.ph h1{font-size:19pt;line-height:1.3;margin:0;color:${C.navy};font-weight:800;letter-spacing:-.01em;text-wrap:balance}
.dek{font-size:10.6pt;color:${C.ink2};margin:2mm 0 0;line-height:1.6}
.sh{font-size:11pt;color:${C.navy};margin:1mm 0 -1.5mm;font-weight:800;display:flex;align-items:baseline;gap:8px}.sh span{font-size:8.6pt;color:${C.ink3};font-weight:500}
h4{font-size:11pt;margin:0 0 1.5mm;color:${C.ink};font-weight:700;line-height:1.4}
p{margin:0}.k{font-size:8.4pt;color:${C.blue};font-weight:700;margin-bottom:1mm;letter-spacing:.01em}.mut{color:${C.ink3}}.sm{font-size:8.6pt}.big{font-size:11pt;line-height:1.6;color:${C.ink}}
.two{display:grid;grid-template-columns:1fr 1fr;gap:5mm}.two.r74{grid-template-columns:1.6fr 1fr}.two.r64{grid-template-columns:1.25fr 1fr}.two.r46{grid-template-columns:.8fr 1.2fr;align-items:center}
.g3{display:grid;grid-template-columns:repeat(3,1fr);gap:4mm}.g2,.g2l{display:grid;grid-template-columns:1fr 1fr;gap:4mm}
.card{border:1px solid ${C.line};border-radius:6px;padding:4mm;background:#fff}.card.cen{display:flex;flex-direction:column;align-items:center;gap:2mm;text-align:center}.card.cen svg{max-width:100%}
.note{border-left:3px solid ${C.blue};background:#f5f8fe;padding:3mm 3.6mm;border-radius:0 5px 5px 0}.note b{display:block;color:${C.navy};margin-bottom:1mm;font-size:9.8pt}.note.warm{border-color:${C.amber};background:#fdf7ec}
.band{margin-top:auto;display:flex;gap:4mm;align-items:baseline;background:#eef3fc;border-radius:6px;padding:3.2mm 4mm;font-size:9.4pt}.band b{color:${C.navy};white-space:nowrap}
.ls{margin:0;padding-left:4.5mm}.ls li{margin:.6mm 0}
.tag{display:inline-block;color:#fff;background:${C.navy};border-radius:999px;padding:.3mm 2.4mm;font-size:8.2pt;font-weight:700;white-space:nowrap}
.ztag{display:inline-flex;align-items:center;gap:1.6mm;font-size:8.6pt;font-weight:700;color:${C.ink2};white-space:nowrap}.ztag::before{content:"";width:3mm;height:3mm;border-radius:2px;background:var(--z)}
.dot{display:inline-block;width:2.4mm;height:2.4mm;border-radius:50%;margin:0 1.6mm 0 1mm;vertical-align:middle}
.pp{display:inline-flex;align-items:center;gap:1px;white-space:nowrap}.pp i{width:3.2mm;height:3.2mm;border-radius:1.5px;display:inline-block}.pp em{font-style:normal;font-size:8.3pt;color:${C.ink2};margin-left:1.6mm}.pp.na{font-size:8.3pt;color:${C.ink3};border:1px dashed ${C.line};border-radius:3px;padding:0 1.6mm}
.tb{width:100%;border-collapse:collapse;font-size:9pt}.tb th,.tb td{border-bottom:1px solid ${C.line2};padding:1.6mm 2mm;text-align:left;vertical-align:top}.tb thead th{font-size:8.4pt;color:${C.ink3};font-weight:700;border-bottom:1.5px solid ${C.line}}
.tb tbody th{color:${C.navy};font-weight:700;white-space:nowrap;width:1%}.tb-s{font-size:8.7pt}.tb-xs{font-size:8.4pt}.tb-xs td,.tb-xs th{padding:1.15mm 1.6mm}.tb td.c{text-align:center}
.tb-k th{width:32%}.w30{width:30%}.w22{width:22%}.w18{width:18%}
.ws td{height:9.5mm;border:1px solid ${C.line}}.ws th{border:1px solid ${C.line};background:#f7f8fa;width:24%}.lg-ws td{height:15mm}.wk td{height:24mm}.wk th:first-child,.wk td:first-child{width:7%;text-align:center}.wk th:nth-child(2),.wk td:nth-child(2){width:25%}.wk th:nth-child(3),.wk td:nth-child(3){width:19%}.wk th:nth-child(4),.wk td:nth-child(4){width:17%}.wk th:nth-child(5),.wk td:nth-child(5){width:16%}.wk th:nth-child(6),.wk td:nth-child(6){width:16%}.wk{table-layout:fixed}.tall td{height:15mm}.ring-art svg{max-height:104mm}
.wide-art{display:flex;justify-content:center}.wide-art svg{max-height:118mm}
.radar-big{display:flex;justify-content:center;margin:-2mm 0}.radar-big svg{width:178mm}
.lg{display:flex;flex-wrap:wrap;gap:2mm 5mm;justify-content:center;font-size:8.6pt;color:${C.ink2}}.lg i{display:inline-block;width:3.2mm;height:3.2mm;border-radius:2px;margin-right:1.4mm;vertical-align:-.4mm}.lg i.thin{height:1.4mm;vertical-align:.4mm}.lg-row{margin-top:-2mm}
.kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:3.5mm}.kpis.k3{grid-template-columns:repeat(3,1fr)}
.kpi{border:1px solid ${C.line};border-radius:6px;padding:3.2mm 4mm;border-top:3px solid ${C.navy}}.kpi p{font-size:8.6pt;color:${C.ink3};font-weight:600}.kpi b{display:block;font-size:24pt;line-height:1.15;color:${C.navy};font-weight:800;margin:1mm 0}.kpi b small{font-size:10pt;margin-left:1mm;color:${C.ink3}}.kpi span{font-size:8.4pt;color:${C.ink2}}
.pts{display:flex;flex-direction:column;gap:3.6mm}.pt{display:flex;gap:4mm;border:1px solid ${C.line};border-radius:6px;padding:3.6mm 4mm}.pt-n{font-size:22pt;font-weight:800;color:${C.blue};line-height:1;min-width:8mm}
.pt h4{font-size:10.8pt}.pt-a{margin-top:1.6mm;font-size:9.2pt}.pt-a b{color:${C.teal}}.pt-l{font-size:8.4pt;color:${C.ink3};margin-top:.8mm}
.chips{display:flex;flex-wrap:wrap;gap:1.8mm}.chips span{border:1px solid ${C.line};border-radius:999px;padding:.8mm 3mm;font-size:8.8pt;background:#fafbfc}.chips span.art{border-color:${C.navy};color:${C.navy};font-weight:700;background:#eef2fa}.chips.big span{font-size:9.6pt;padding:1.4mm 3.6mm}
.steps4{display:grid;grid-template-columns:repeat(4,1fr);gap:3mm}.st4{border:1px solid ${C.line};border-radius:6px;padding:3mm}.st4-b{display:flex;gap:1.2mm;margin-bottom:2mm}.st4-b i{flex:1;height:3.4mm;border-radius:2px}.st4 b{font-size:10pt;color:${C.navy}}.st4 p{font-size:8.6pt;color:${C.ink2};margin-top:1mm}
.zones5{display:grid;grid-template-columns:1fr 1fr;gap:2.6mm 5mm}.zn{display:flex;gap:3mm;align-items:flex-start}.zsw{width:5mm;height:5mm;border-radius:3px;flex:none;margin-top:.6mm}.zn p{font-size:8.6pt;color:${C.ink2}}
.flow5{display:grid;grid-template-columns:repeat(5,1fr);gap:2.6mm}.flow5.f4{grid-template-columns:repeat(4,1fr)}.f5{border:1px solid ${C.line};border-top:3px solid ${C.blue};border-radius:5px;padding:2.8mm}.f5-t{font-size:8.4pt;color:${C.blue};font-weight:800}.f5 b{display:block;color:${C.navy};margin:.6mm 0}.f5 p{font-size:8.6pt;color:${C.ink2}}
.qs{margin:0;padding-left:5mm;display:flex;flex-direction:column;gap:2mm}.qs li{font-size:10pt;line-height:1.55}
.toc{display:flex;flex-direction:column}.toc-r{display:flex;gap:6mm;align-items:baseline;border-bottom:1px solid ${C.line2};padding:3.6mm 0}.toc-n{font-size:22pt;font-weight:800;color:${C.blue};width:16mm}.toc-b{flex:1}.toc-b b{display:block;font-size:13pt;color:${C.navy}}.toc-b span{font-size:8.8pt;color:${C.ink3}}.toc-p{font-size:13pt;font-weight:800;color:${C.navy}}
.dh{display:flex;gap:5mm;align-items:center}.dh-n{font-size:30pt;font-weight:800;color:${C.blue};line-height:1}.dh h1{font-size:19pt;margin:0;color:${C.navy};font-weight:800}.dh-t{margin-left:auto;display:flex;flex-direction:column;align-items:flex-end;gap:1mm;font-size:8.6pt}
.wf{margin:0;padding:0;list-style:none;counter-reset:w;display:flex;flex-direction:column;gap:1.4mm}.wf li{counter-increment:w;display:grid;grid-template-columns:6mm 25mm 1fr;gap:2mm;font-size:8.8pt;align-items:baseline}.wf li::before{content:counter(w);font-weight:800;color:${C.blue}}.wf b{color:${C.navy}}.wf span{color:${C.ink2}}
.g4{display:grid;grid-template-columns:repeat(4,1fr);gap:3mm}.b4{border-top:3px solid var(--c);background:#f7f9fc;border-radius:0 0 5px 5px;padding:2.4mm 3mm}.b4 b{display:block;color:var(--c);font-size:9.6pt}.b4 p{font-size:8.6pt;color:${C.ink2};margin-top:.8mm}
.am{display:grid;grid-template-columns:1fr 1fr 1fr 1.05fr;gap:7mm;position:relative}.am-col{display:flex;flex-direction:column;gap:2.6mm;position:relative}.am-col:not(:last-child)::after{content:"";position:absolute;right:-5.6mm;top:46%;width:0;height:0;border-left:3.4mm solid #b7c2d6;border-top:2.6mm solid transparent;border-bottom:2.6mm solid transparent}
.am-h{border-bottom:2.4px solid var(--c);padding-bottom:1.4mm}.am-h b{display:block;color:var(--c);font-size:11pt}.am-h span{font-size:8.2pt;color:${C.ink3}}
.am-c{border:1px solid ${C.line};border-left:4px solid var(--c);border-radius:0 6px 6px 0;padding:2.6mm 3mm;display:flex;flex-direction:column;gap:.8mm;background:#fff}.am-c b{font-size:9.8pt;color:${C.ink};line-height:1.4}.am-c span{font-size:8.4pt;color:${C.ink2}}.am-t{align-self:flex-start;font-size:7.8pt!important;font-weight:700;color:var(--c)!important}
.am-g{flex:1;border-radius:8px;background:${C.navy};color:#fff;padding:4mm}.am-g h4{color:#fff;font-size:15pt;margin:0}.am-g .k{color:#a9c2f3}.am-g .mut{color:#c4d2ee}.am-g p{font-size:9pt}
.am-axes{display:grid;grid-template-columns:1fr;gap:0}.am-ax{display:grid;grid-template-columns:52mm 34mm 1fr;align-items:center;gap:3mm;border-bottom:1px solid ${C.line2};padding:1.6mm 0}.am-ax b{font-size:9.4pt;color:${C.navy}}.am-ax span{font-size:8.4pt;color:${C.ink2}}.am-bar{display:flex;gap:1mm}.am-bar i{flex:1;height:4mm;border-radius:2px;background:${C.l0}}.am-bar i.on{background:${C.l3}}
.pp.est i{opacity:.55}.pp.est em{color:${C.ink3}}
.est3{display:grid;grid-template-columns:repeat(3,1fr);gap:2mm;width:100%;margin-top:1mm}.est3 div{background:#f2f5fb;border-radius:5px;padding:1.6mm 1mm;text-align:center}.est3 span{display:block;font-size:8pt;color:${C.ink3}}.est3 b{font-size:10pt;color:${C.navy}}
.na-box{border:1.5px dashed ${C.line};border-radius:8px;padding:6mm;text-align:center;color:${C.ink2};width:100%}.na-box b{display:block;color:${C.navy};margin-bottom:2mm}
.ledger{display:flex;flex-direction:column;gap:3mm}.lg-d h4{display:flex;align-items:center;gap:3mm}
.rec{border-left:4px solid var(--c);padding:2.4mm 3.6mm;background:#fafbfc;border-radius:0 6px 6px 0}.rec-h{display:flex;flex-direction:column;gap:.4mm;margin-bottom:1.6mm}.rec-h b{color:${C.navy};font-size:10.2pt}.rec-h span{font-size:8.4pt;color:${C.ink3}}.rec-b{gap:3mm;font-size:8.8pt}
.wl{display:flex;flex-direction:column;gap:0}.wl i{display:block;height:7.5mm;border-bottom:1px dashed #c3c9d4}.wl-l{font-size:8.6pt;color:${C.ink3};font-weight:600}
.lo{margin:0;padding-left:5mm;display:flex;flex-direction:column;gap:1.6mm}.lo li b{display:block;color:${C.navy}}.lo li span{font-size:8.8pt;color:${C.ink2}}.lo.big li{font-size:10pt}.lo.big li span{font-size:9.4pt}
.prose{display:flex;flex-direction:column;gap:3mm}.pr{display:grid;grid-template-columns:22mm 1fr;gap:4mm;border-bottom:1px solid ${C.line2};padding-bottom:3mm}.pr-n{font-weight:800;color:${C.blue};font-size:9.6pt}.pr p{font-size:10pt;line-height:1.65}
.story{border:1px solid ${C.line};border-radius:6px;padding:3.6mm}.story-h{display:flex;justify-content:space-between;margin-bottom:2mm}.story-h b{color:${C.navy}}.story-h span{font-size:8.4pt;color:${C.ink3}}
.story-g{display:grid;grid-template-columns:repeat(4,1fr);gap:2mm}.sp{background:#f2f6fd;border-radius:5px;padding:2.4mm;font-size:8.8pt}.sp.empty{background:#fff;border:1.5px dashed ${C.amber}}.sp.empty p:last-child{color:${C.amber}}
.frame{border:1px solid ${C.line};border-radius:6px;padding:4mm 5mm;display:flex;flex-direction:column;gap:2.4mm;font-size:10.4pt;line-height:1.7}.frame u{text-decoration:none;border-bottom:1.5px solid ${C.amber};color:${C.ink}}.fb{font-weight:800;color:${C.blue};margin-right:1mm}
.qa{border:1px solid ${C.line};border-radius:6px;padding:3.2mm 3.6mm}.qa-q{display:flex;gap:3mm;align-items:baseline;margin-bottom:1.8mm}.qa-q span{font-weight:800;color:${C.blue};white-space:nowrap;font-size:9pt}.qa-q b{font-size:10.4pt;color:${C.navy};line-height:1.45}.qa-b{font-size:8.8pt;gap:3mm}
.cb{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:1.8mm}.cb li{display:flex;gap:2.4mm;align-items:flex-start}.cb i{width:3.8mm;height:3.8mm;border:1.4px solid ${C.ink3};border-radius:2px;flex:none;margin-top:.6mm}
.prio{border:1px solid ${C.line};border-radius:6px;padding:3mm 3.6mm;display:flex;flex-direction:column;gap:2mm}.prio-h{display:flex;gap:3mm;align-items:center}.prio-h>span:first-child{font-size:16pt;font-weight:800;color:${C.blue}}.prio-h b{font-size:10.8pt;color:${C.navy}}.prio-h .mut{margin-left:auto;font-size:8.6pt}
.quote{font-size:9pt;line-height:1.6;color:${C.ink2};border-left:2px solid ${C.line};padding-left:3mm}
.dl{display:grid;grid-template-columns:32mm 1fr;gap:4.2mm 6mm;margin:0;font-size:10.2pt;line-height:1.6}.dl dt{font-weight:800;color:${C.navy}}.dl dd{margin:0;color:${C.ink2}}
.close-box{background:${C.navy};color:#fff;border-radius:8px;padding:6mm}.close-box .k{color:#a9c2f3}.close-box h3{margin:1mm 0 2mm;font-size:15pt}.close-box p{color:#dbe4f5}
.sm-mult .card h4{margin-bottom:0}
/* 장 표지 */
.pg.chap{background:${C.navy};color:#fff}.pg.chap .rf{color:#9fb0cf;border-color:#2c406b}.pg.chap .rf-no{color:#fff}
.ch-top{display:flex;align-items:baseline;gap:4mm;margin-top:14mm}.ch-k{font-size:12pt;letter-spacing:.3em;color:#9fb6e8;font-weight:700}.ch-no{font-size:72pt;font-weight:800;line-height:1;color:#fff}
.ch-t{font-size:30pt;margin:4mm 0 3mm;font-weight:800;color:#fff}.ch-p{font-size:12pt;line-height:1.65;color:#d5def0;max-width:150mm}
.ch-art{margin:8mm 0 4mm;max-height:92mm;overflow:hidden;display:flex;justify-content:center;opacity:.95}.ch-art svg{width:110mm}
.pg.chap .ch-art svg text{fill:#fff!important}
.ch-in{margin-top:auto;border-top:1px solid #34497a;padding-top:5mm}.ch-in .sh{color:#fff}.ch-in .ls li{color:#d5def0;font-size:10.4pt}
/* 표지 */
.pg.cover{padding:16mm 17mm 14mm;background:#fff}
.cv-top{display:flex;justify-content:space-between;align-items:baseline;border-bottom:2px solid ${C.navy};padding-bottom:3mm}.cv-org{font-size:15pt;font-weight:800;color:${C.navy}}.cv-s{font-size:9pt;color:${C.ink3}}
.cv-mid{margin-top:10mm}.cv-k{font-size:10pt;color:${C.blue};font-weight:800;letter-spacing:.04em}.cv-t{font-size:27pt;line-height:1.32;margin:3mm 0 4mm;color:${C.navy};font-weight:800}.cv-d{font-size:11pt;line-height:1.65;color:${C.ink2};max-width:160mm}
.cv-art{display:flex;justify-content:center;margin-top:4mm}.cv-art svg{width:150mm}.cv-legend{display:flex;gap:6mm;justify-content:center;font-size:9pt;color:${C.ink2};margin-top:-2mm}.cv-legend i{display:inline-block;width:3.4mm;height:3.4mm;border-radius:2px;margin-right:1.6mm;vertical-align:-.5mm}
.cv-meta{display:grid;grid-template-columns:1fr 1fr;gap:3mm 8mm;margin:6mm -17mm 0;padding:5mm 17mm 4mm;background:#f2f5fb}.cv-meta div{border-top:1px solid ${C.line};padding-top:2mm}.cv-meta span{display:block;font-size:8.4pt;color:${C.ink3}}.cv-meta b{font-size:10.4pt;color:${C.ink}}
.cv-foot{position:absolute;left:17mm;right:17mm;bottom:12mm;font-size:8.6pt;color:${C.ink2};border:1px solid ${C.line};background:#fff;border-radius:6px;padding:3mm 4mm}.cv-foot b{color:${C.rose};margin-right:2mm}

/* 겉표지 */
.pg.outer{padding:18mm 18mm 16mm;background:linear-gradient(160deg,#10224a 0%,#16306a 55%,#1f4fbf 100%);color:#fff}
.oc-top{display:flex;align-items:center;gap:3mm}.oc-mark{width:11mm;height:11mm;display:inline-block}.oc-brand{font-size:15pt;font-weight:800;letter-spacing:.01em}.oc-tier{margin-left:auto;border:1px solid rgba(255,255,255,.45);border-radius:999px;padding:.6mm 3.4mm;font-size:9pt;font-weight:700;letter-spacing:.12em}
.oc-art{position:absolute;right:-26mm;top:142mm;width:132mm;opacity:.13}.oc-art svg{width:100%}.oc-art svg text{display:none}
.oc-mid{margin-top:74mm;position:relative}.oc-k{font-size:11pt;color:#a9c2f3;font-weight:700;letter-spacing:.04em}.oc-t{font-size:40pt;line-height:1.2;margin:4mm 0 3mm;font-weight:800;letter-spacing:-.01em}.oc-s{font-size:14pt;color:#dbe4f5}
.oc-who{position:absolute;left:18mm;right:18mm;bottom:40mm;display:grid;grid-template-columns:1fr 1fr 1.4fr;gap:6mm;border-top:1px solid rgba(255,255,255,.35);padding-top:5mm}.oc-who span{display:block;font-size:8.6pt;color:#a9c2f3;margin-bottom:1mm}.oc-who b{font-size:13pt}
.oc-foot{position:absolute;left:18mm;right:18mm;bottom:16mm;display:flex;flex-wrap:wrap;align-items:baseline;gap:2.4mm;font-size:11pt}.oc-foot span{color:#a9c2f3}.oc-foot em{flex-basis:100%;font-style:normal;font-size:8.6pt;color:#c4d2ee;margin-top:2mm}
/* 참여자가 채운 칸 */
.fl{display:flex;flex-direction:column;gap:1mm}.fl-t{border-left:3px solid ${C.amber};background:#fdf7ec;border-radius:0 5px 5px 0;padding:2.6mm 3.4mm;font-size:9.6pt;line-height:1.65;color:${C.ink}}
.sp.mine{background:#fdf7ec;border-left:3px solid ${C.amber}}
.cb i.on{border-color:${C.teal};background:${C.teal};position:relative}.cb i.on::after{content:"";position:absolute;left:1.05mm;top:.25mm;width:1mm;height:2mm;border:solid #fff;border-width:0 .45mm .45mm 0;transform:rotate(45deg)}
.mine{color:${C.amber};margin-right:1.4mm}
.ws td{vertical-align:middle;font-size:8.8pt;line-height:1.5}
/* 세종 기업 목록 */
.sj{font-size:7.9pt}.sj td,.sj th{padding:.85mm 1.6mm}.sj tr.sj-g td{background:#f2f5fb;border-top:1.5px solid ${C.line};padding:1.8mm 2mm}.sj-g b{display:block;color:${C.navy};font-size:9pt}.sj-g span{display:block;color:${C.ink2};margin-top:.4mm}.sj-g em{display:block;font-style:normal;color:${C.teal};font-weight:700;margin-top:.4mm}
.sj-l{display:inline-block;font-size:7pt;color:#fff;background:${C.blue};border-radius:999px;padding:0 1.6mm;margin-left:1mm;vertical-align:1px}
.sj-c{border-top:1px solid ${C.line};padding-top:2mm}.sj-ch b{color:${C.navy};margin-right:2mm}.sj-ch span{color:${C.ink2};font-size:8.6pt}.sj-cl{font-size:8pt;line-height:1.7;color:${C.ink};margin-top:1mm}.sj-cl sup{font-size:6pt;color:${C.blue};font-weight:700;margin-left:.3mm}
`;

/* load3 가 내놓는 문장 가운데 ‘이번에 묻지 않았다’ 를 말하는 줄을 이 리포트의 말로 고친다.
 * 이 리포트는 깊게 묻지 않은 영역도 관심·경험 응답과 공통 판단 응답으로 단계를 읽어 채웠으므로
 * ‘다루지 않았다’ 고 적으면 쪽에 그려진 것과 글이 어긋난다. 긴 줄부터 바꾼다 */
const REWRITE: [string | RegExp, string][] = [
  ["이번 검사에서 이 영역의 판단은 자세히 묻지 않았습니다. 기록에 적은 내용이 지금으로서는 이 영역의 유일한 근거입니다.", "이 영역은 경험 응답과 공통 판단 응답으로 단계를 읽었고, 경험 기록이 그 단계를 받쳐 줍니다."],
  ["이번 검사에서는 이 영역을 자세히 묻지 않았고, 경험 기록에만 이 영역이 있습니다.", "이 영역은 경험 응답으로 단계를 읽었고, 경험 기록이 함께 있습니다."],
  [/ 그중 (.+?) 이번 검사에서 판단을 자세히 묻지 않아, 관심이 있다는 것까지만 알 수 있습니다\./g, " 그중 $1 경험 응답과 공통 판단으로 단계를 읽었고, 짧은 과제로 판단을 하나 더 확인하면 근거가 됩니다."],
  ["이 직무와 함께 이어지는 영역인데 이번 검사에서 자세히 묻지 않았습니다", "이 직무와 함께 이어지는 영역이고, 경험 응답으로 단계를 읽었습니다"],
  ["이번 검사에서는 이 영역의 판단을 자세히 묻지 않았", "이 영역은 경험 응답으로 단계를 읽었"],
  ["의 업무 영역인데, 이번 검사에서는 이 영역의 판단을 자세히 묻지 않았습니다.", "의 업무 영역이고, 경험 응답과 공통 판단으로 단계를 읽었습니다."],
  ["이번 검사에서 자세히 묻지 않았습니다", "경험 응답으로 단계를 읽었습니다"],
  ["이번 검사에서 자세히 묻지 않은 영역입니다.", "경험 응답으로 단계를 읽은 영역입니다."],
  ["나머지 판단은 이번에 묻지 않았습니다.", "나머지 판단은 공통 판단 응답으로 읽었습니다."],
  ["이번에 묻지 않은 판단입니다", "공통 판단 응답으로 읽은 판단입니다"],
  ["자세히 묻지 않음", "경험 응답 기준"],
  ["이번에 묻지 않음", "응답 기준"],
  [/(\S)\s+—\s+(?=\S)/g, "$1 : "],
  ["핵심 진단", "주요 진단"],
];
const rewrite = (h: string) => REWRITE.reduce((a, [f, t]) => (typeof f === "string" ? a.split(f).join(t) : a.replace(f, t)), h);

function page(pages: Page[], d: D): string {
  return rewrite(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>${E(NAME)}</title><style>${CSS}</style></head><body>${pages.map((p, i) => shell(p, i, pages.length, d)).join("")}</body></html>`);
}

const OVER_JS = `(() => [...document.querySelectorAll(".pg")].map((pg, i) => {
  const bd = pg.querySelector(".bd"); if (!bd) return { i: i + 1, over: 0 };
  const box = bd.getBoundingClientRect(); let max = 0;
  for (const e of bd.querySelectorAll("*")) { const b = e.getBoundingClientRect(); if (b.height && b.width) max = Math.max(max, b.bottom); }
  return { i: i + 1, over: Math.round(max - box.bottom), fill: Math.round(((max - box.top) / box.height) * 100) };
}))()`;

async function main(): Promise<void> {
  const d = await data();
  const pages = build(d);
  const html = page(pages, d);
  mkdirSync(OUT, { recursive: true });
  const tmp = path.resolve("var/pdf-gm"); mkdirSync(tmp, { recursive: true });
  const hf = path.join(tmp, "sjepa.html"); writeFileSync(hf, html);
  const b = await chromium.launch({ args: ["--no-sandbox"] });
  const p = await b.newPage({ viewport: { width: 900, height: 1200 } });
  await p.goto("file://" + hf, { waitUntil: "load" });
  await p.evaluate("document.fonts.ready");
  await p.emulateMedia({ media: "print" });
  const over = await p.evaluate(OVER_JS) as { i: number; over: number; fill: number }[];
  const pdf = path.join(OUT, `${NAME}.pdf`);
  await p.pdf({ path: pdf, format: "A4", printBackground: true, preferCSSPageSize: true });
  await b.close();
  const n = Number(/Pages:\s+(\d+)/.exec(execFileSync("pdfinfo", [pdf]).toString())![1]);
  const dir = path.join(OUT, "pages"); rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
  execFileSync("pdftoppm", ["-r", "70", "-png", pdf, path.join(dir, "p")]);
  for (const fn of readdirSync(dir)) { const mm = /^p-0*(\d+)\.png$/.exec(fn); if (mm && fn !== `p-${mm[1].padStart(2, "0")}.png`) execFileSync("mv", [path.join(dir, fn), path.join(dir, `p-${mm[1].padStart(2, "0")}.png`)]); }
  const bad = over.filter((o) => o.over > 0);
  writeFileSync(path.join(OUT, "BUILD.md"), [
    `# ${ORG} 진로 분석 리포트 예시 (응시 ${ID})`, "",
    `- 쪽 수: **${n}** (설계 ${pages.length}) · 넘친 쪽: ${bad.length ? bad.map((o) => `${o.i}쪽 ${o.over}px`).join(", ") : "없음"}`, "",
    "| 쪽 | 장 | 제목 | 채움 |", "|---|---|---|---|", ...pages.map((pg, i) => `| ${i + 1} | ${pg.partName || "표지"} | ${pg.title} | ${over[i]?.fill ?? "—"}% |`), "",
  ].join("\n"));
  console.log(`→ ${pdf} · ${n}쪽 · 넘친 쪽 ${bad.length}${bad.length ? " " + bad.map((o) => `${o.i}(${o.over}px)`).join(" ") : ""}`);
  process.exit(n === pages.length && !bad.length ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
