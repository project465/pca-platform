/**
 * 긴 결과지(PRO 책자) 한 권을 만든다.
 *
 *   buildLongReport(attemptId) → { html, pages, notes }
 *
 * 웹(`/v3/{id}/result/book`)과 종이(`/v3/{id}/result/pdf`)가 같은 HTML 을 쓴다.
 * 읽는 것은 굳은 결과 하나와 그 사람의 경험 기록, 그 응시의 Core 가 가리키는 사전이고,
 * 새 판단을 하지 않는다. 어느 Core 든 같은 틀로 선다: Core 이름과 파일 이름을 이
 * 폴더의 코드에 적지 않고 등록부가 든 것을 읽는다.
 */
import { loadInputs } from "./data";
import { loadGuide } from "./guide";
import { fillPages } from "./fill";
import { derive } from "./derive";
import { regionView } from "./region";
import { E, IC, PACK_JS, PAL, ZC, chapter, css, shell, type Page } from "./kit";
import { about, counselor, cover, howToRead, outer, toc } from "./front";
import { ch1Pages } from "./ch1";
import { ch2Pages } from "./ch2";
import { ch3Pages, PART3 } from "./ch3";
import { ch4Pages } from "./ch4";
import { regionPages } from "./ch5";
import { ch6Pages } from "./ch6";
import { appendix, ch7 } from "./ch7";
import { AXES } from "./derive";
import { C, gantt, heat, radar, ring } from "./charts";
import type { Inputs, RegionKey } from "./types";

export type LongReport = {
  html: string;
  pages: { title: string; part: string; kind: string }[];
  /** 만들면서 남긴 사정(직무 안내 없음 · 지역 자료 없음 등). 화면에 내보내지 않는다 */
  notes: string[];
  core: string;
  tier: string;
  region: string | null;
};

export type BuildOpts = {
  /** 책자 글꼴(`cm-book-sans-*.woff2`)이 있는 자리(끝에 `/`). 웹은 `/fonts/cm-book/` */
  fontBase?: string;
  /** 점검용: 지역 장을 끄거나(`off`) 다른 권역 자료로 그려 본다. 제품 경로는 넘기지 않는다 */
  region?: RegionKey | "off";
  /** 점검용: 결과를 굳힌 뒤에 저장한 경험 기록까지 싣는다. 제품 경로는 늘 굳힌 때까지다 */
  experiences?: "snapshot" | "all";
  /** 점검용: 직무 안내가 없는 Core 처럼 그려 본다(직무 장이 직무팩 자료만으로 선다) */
  guide?: "off";
};

export function assemble(x: Inputs): { pages: Page[]; notes: string[]; region: string | null } {
  const d = derive(x);
  const notes: string[] = [];
  if (x.guide.status !== "OK") notes.push(`직무 안내 ${x.guide.status}${x.guide.note ? `: ${x.guide.note}` : ""}`);
  const P: Page[] = [];
  const rv0 = regionView(x, d.name);
  /* 이 전공의 산업과 이어지는 회사가 한 곳도 없으면 장을 세우지 않는다. 남의 전공 회사를 늘어놓지 않는다 */
  const rv = rv0 && rv0.groups.length ? rv0 : null;
  /* 장마다 덧붙일 거리. 쪽 모으기가 남은 자리가 넓은 쪽에만 싣는다 */
  const fill = fillPages(x, d, PART3(x), rv ? { name: `${rv.area}에서 찾아보기`, sources: rv.sources, groups: rv.groups } : null);
  P.push(outer(x, d), cover(x, d), about(x, d), howToRead(x), counselor(x, d), ...fill["들어가며"] ?? []);

  const ringArt = (fill: (z: (typeof x.m.domains)[number]) => string, ring2?: boolean) =>
    ring(x.m.domains.map((z) => ({ name: "", fill: fill(z), ring2: ring2 ? (z.interest ? IC[z.interest] : "#f1f2f5") : undefined })), { size: 360 });

  const c1 = ch1Pages(x, d);
  P.push(chapter("01", "한눈에 보기", "지금 설명할 수 있는 일과 비어 있는 일, 목표 직무까지 남은 거리를 차례로 담았습니다.", c1.map((p) => p.title), ringArt((z) => ZC[z.zone], true)), ...c1, ...fill["한눈에 보기"] ?? []);

  const c2 = ch2Pages(x, d);
  const radarSeries = d.radarDoms.map((v, i) => ({ name: v.code, levels: d.levels(v.code), color: [PAL.blue, PAL.coral, PAL.teal, PAL.violet][i] }));
  P.push(chapter("02", "판단 프로파일", "여덟 가지 판단을 어디까지 직접 해 봤는지 방사형 그래프와 지도로 봅니다.", [...new Set(c2.map((p) => p.title.replace(/^강점 \d · .*/, "강점 해설")))], radarSeries.length ? radar(AXES.map(() => ""), radarSeries, { size: 360, ring: false }) : ringArt((z) => ZC[z.zone])), ...c2, ...fill["판단 프로파일"] ?? []);

  const c3 = ch3Pages(x, d);
  P.push(chapter("03", PART3(x), `${d.counts.domains}가지 ${E(x.domainWord)}마다 일이 흘러가는 순서와 판단 여덟 가지의 지금 단계를 차례로 적었습니다.`, [`영역 01~${String(d.counts.domains).padStart(2, "0")}`, ...[...new Set(c3.filter((p) => !p.title.startsWith("영역 ")).map((p) => p.title.replace(/ \(\d+\)$/, "").replace(/^경험 기록 · .*/, "경험 기록 해설")))]], ringArt((z) => ZC[z.zone])), ...c3, ...fill[PART3(x)] ?? []);

  const c4 = ch4Pages(x, d, !rv);
  P.push(chapter("04", "직무 탐색", `${E(x.major)} 대표 직무 ${x.roles.length}개와 참여자의 근거를 겹쳐 보고, 목표 직무와 산업을 깊게 봅니다.`, [...new Set(c4.map((p) => p.title.replace(/ \(\d+\)$/, "").replace(/ · (하는 일|판단과 연습|첫 프로젝트와 배울 순서|핵심 영역에서 하는 판단)$/, "")))].slice(0, 9), heat(["", "", "", ""], ["", "", "", "", "", ""], (i, j) => ({ fill: [C.navy, C.blue, C.sky, "#dfe3ea"][(i + j) % 4] }), { width: 360, label: 4, head: 4, row: 40 })), ...c4, ...fill["직무 탐색"] ?? []);

  if (rv) P.push(...regionPages(x, d, rv), ...fill[`${rv.area}에서 찾아보기`] ?? []);
  else notes.push(!x.region ? "소속 기관에 맞는 지역 자료가 없어 05장을 뺐습니다" : rv0 ? `지역 자료(${x.region})에 이 전공의 산업과 이어지는 회사가 없어 05장을 뺐습니다` : `지역 자료(${x.region})를 읽지 못해 05장을 뺐습니다`);

  const c6 = ch6Pages(x, d);
  P.push(chapter("06", "자기소개서·면접 준비", "검사와 경험 기록에서 고른 근거로 자기소개서 재료와 면접 질문을 만들었습니다. 응답에 없는 내용은 쓰는 칸으로 비워 두었습니다.", [...new Set(c6.map((p) => p.title.replace(/ \d.*$/, "")))], `<svg viewBox="0 0 200 200" width="100%" xmlns="http://www.w3.org/2000/svg"><rect x="52" y="22" width="96" height="128" rx="8" fill="#fff" opacity=".12"/><rect x="62" y="36" width="96" height="128" rx="8" fill="#fff"/><rect x="76" y="56" width="52" height="7" rx="3" fill="#2c63d6"/><rect x="76" y="74" width="66" height="5" rx="2.5" fill="#c9d3e6"/><rect x="76" y="86" width="60" height="5" rx="2.5" fill="#c9d3e6"/><rect x="76" y="98" width="64" height="5" rx="2.5" fill="#c9d3e6"/><rect x="76" y="116" width="40" height="18" rx="4" fill="#14907f"/><circle cx="152" cy="150" r="20" fill="#c9a227"/><path d="M143 150l6 6 12-12" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/></svg>`), ...c6, ...fill["자기소개서·면접 준비"] ?? []);

  const c7 = [...ch7.prioPages(x, d), ch7.ganttPage(x, d), ch7.longPage(x, d), ch7.researchPage(x, d), ch7.weeklyPage(), ch7.logPage(x)];
  P.push(chapter("07", "실행 로드맵", "먼저 채울 판단에서 시작해 90일, 6개월, 12개월 계획으로 이어집니다.", [...new Set(c7.map((p) => p.title.replace(/ \(\d+\)$/, "")))], gantt([{ label: "", from: 1, to: 30, color: C.navy }, { label: "", from: 20, to: 60, color: C.blue }, { label: "", from: 50, to: 90, color: C.teal }], { width: 360, label: 4 })), ...c7);

  P.push(...fill["실행 로드맵"] ?? []);
  /* 응답 요약 쪽은 싣지 않는다. 같은 값이 02장의 지도와 공통 판단 쪽에 있다 */
  P.push(...appendix.tracePages(x, d), appendix.sourcesPage(x, d, rv?.sources ?? []), appendix.methodPage(x, d), appendix.wordsPage(x, d), appendix.closePage(x, d));
  P.push(...fill["부록"] ?? []);
  if (!rv) {
    /* 지역 장이 없으면 뒤 장 번호를 하나씩 당긴다 */
    for (const p of P) {
      if (p.part === "06") p.part = "05"; else if (p.part === "07") p.part = "06";
      p.body = p.body.replace(/06장/g, "05장").replace(/07장/g, "06장").replace(/07 실행 로드맵/g, "06 실행 로드맵")
        .replace(/<span class="ch-no">06<\/span>/g, `<span class="ch-no">05</span>`).replace(/<span class="ch-no">07<\/span>/g, `<span class="ch-no">06</span>`);
    }
  }
  P.splice(2, 0, toc(P));
  return { pages: P, notes, region: rv?.key ?? null };
}

export function renderHtml(x: Inputs, pages: Page[], fontBase = "/fonts/cm-book/"): string {
  const ctx = { issuer: x.issuer, major: x.major, tier: x.tier, person: x.person, answeredOn: x.answeredOn };
  const title = `${x.person} 님 진로 분석 리포트 · CareerMatri`;
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${E(title)}</title><style>${css(fontBase)}</style></head><body>${pages.map((p, i) => shell(p, i, pages.length, ctx)).join("")}<script>${PACK_JS}</script></body></html>`;
}

export async function buildLongReport(attemptId: string, opts: BuildOpts = {}): Promise<LongReport> {
  const x = await loadInputs(attemptId, opts.experiences ?? "snapshot");
  if (opts.region) x.region = opts.region === "off" ? null : opts.region;
  if (opts.guide === "off") x.guide = loadGuide(x.coreCode, x.roles.map((r) => r.code), "/nonexistent-guide-root");
  const { pages, notes, region } = assemble(x);
  for (const n of notes) console.warn(`[report-long] attempt=${attemptId} core=${x.coreCode} ${n}`);
  return {
    html: renderHtml(x, pages, opts.fontBase),
    pages: pages.map((p) => ({ title: p.title, part: p.partName, kind: p.kind ?? "plain" })),
    notes, core: x.coreCode, tier: x.tier, region,
  };
}

export { loadInputs };
