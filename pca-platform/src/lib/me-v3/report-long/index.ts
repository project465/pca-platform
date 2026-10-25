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
import { E, IC, PACK_JS, PAL, ZC, chapter, css, howto, shell, type Page } from "./kit";
import { about, cover, howToRead, outer, toc } from "./front";
import { ch1Pages } from "./ch1";
import { ch2Pages } from "./ch2";
import { ch3Pages, PART3 } from "./ch3";
import { ch4Pages } from "./ch4";
import { regionPages } from "./ch5";
import { ch6Pages } from "./ch6";
import { appendix, ch7 } from "./ch7";
import { AXES, BAND_WORD, ZONES, ZONE_WORD } from "./derive";
import { C, LEVEL_KO, radar, ring } from "./charts";
import { j } from "./text";
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
  /* 장마다 붙는 채움 쪽. 쪽 모으기가 남은 자리가 넓은 쪽에만 싣는다 */
  const fill = fillPages(x, d, PART3(x), rv ? { name: `${rv.area}에서 찾아보기`, sources: rv.sources, groups: rv.groups, neighbor: rv.neighbor, listed: rv.listed, label: rv.label } : null);
  /* 상담 진행표는 싣지 않는다. 이 책은 학생 본인이 혼자 펴 보는 책이다(docs/metri/report-writing-rules.md 1절) */
  P.push(outer(x, d), cover(x, d), about(x, d), howToRead(x), ...fill["들어가며"] ?? []);

  /* 장 첫 쪽의 그림. 내 결과를 그린 것은 읽는 법을 붙이고, 장식은 색과 숫자 구분 없이 한 색으로만 그린다 */
  const doms = x.m.domains;
  const ringArt = (ring2: boolean) =>
    ring(doms.map((z) => ({ name: "", fill: ZC[z.zone], ring2: ring2 ? (z.interest ? IC[z.interest] : "#f1f2f5") : undefined, mark: z.zone === "NOT_EXPLORED" ? C.ink2 : "#fff" })), { size: 360 });
  const zoneMarks = (): [string, string][] => ZONES.filter((k) => doms.some((z) => z.zone === k)).map((k) => [ZC[k], ZONE_WORD[k].tag]);
  const intMarks = (): [string, string][] => [
    ...(["HIGH", "MID", "LOW"] as const).filter((v) => doms.some((z) => z.interest === v)).map((v): [string, string] => [IC[v], `바깥 띠 · 관심 ${BAND_WORD[v]}`]),
    ...(doms.some((z) => !z.interest) ? [["#f1f2f5", "바깥 띠 · 관심 응답 없음"] as [string, string]] : []),
  ];
  const ringHow = (withInterest: boolean, numHint: string) => howto(
    [...zoneMarks(), ...(withInterest ? intMarks() : []), ["숫자", numHint]],
    withInterest
      ? `고리 한 칸이 ${E(x.domainWord)} 하나예요. 안쪽 칸의 색은 그 영역이 어디에 들어갔는지, 바깥 얇은 띠의 색은 관심이 얼마나 높은지를 나타내요.`
      : `고리 한 칸이 ${E(x.domainWord)} 하나이고, 칸의 색은 그 영역이 어디에 들어갔는지를 나타내요.`);
  const domKey = `<span class="ch-key">${doms.map((z, i) => `${i + 1} ${E(d.name(z.code))}`).join(" · ")}</span>`;
  const DECO = (w: number, h: number, inner: string) =>
    `<svg viewBox="0 0 ${w} ${h}" width="100%" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><g fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${inner}</g></svg>`;

  const c1 = ch1Pages(x, d);
  P.push(chapter("01", "한눈에 보기",
    "지금까지 해 본 일 가운데 서류와 면접에서 근거로 꺼낼 수 있는 것과 아직 비어 있는 자리를 한 번에 봐요. 목표로 적은 직무까지 무엇이 남았는지도 여기서 짚으니, 뒤의 장보다 이 장을 먼저 읽어 보세요.",
    c1.map((p) => p.title), ringArt(true),
    ringHow(true, "영역 번호. 03장에서 같은 번호로 펴 볼 수 있어요").replace("</ul></div>", `</ul><p class="ch-keyp">${domKey}</p></div>`)), ...c1, ...fill["한눈에 보기"] ?? []);

  const c2 = ch2Pages(x, d);
  const radarSeries = d.radarDoms.map((v, i) => ({ name: v.code, levels: d.levels(v.code), color: [PAL.blue, PAL.coral, PAL.teal, PAL.violet][i] }));
  const radarHow = () => howto([
    ...radarSeries.map((v): [string, string] => [v.color, E(d.name(v.name))]),
    ["가운데", LEVEL_KO[0]],
    ["고리", `안쪽부터 ${LEVEL_KO[1]} · ${LEVEL_KO[2]} · ${LEVEL_KO[3]}`],
    ...(radarSeries.some((v) => v.levels.some((l) => l == null)) ? [["점이 없는 꼭짓점", "이번 검사에서 묻지 않은 판단이라 가운데에 두었어요"] as [string, string]] : []),
  ], "꼭짓점 하나가 일하면서 내리는 판단 하나예요. 바깥으로 갈수록 그 판단을 더 깊이 직접 해 봤다는 뜻이고, 선의 색은 영역을 나타내요.");
  P.push(chapter("02", "판단 프로파일",
    "문제를 정하는 일부터 결과가 다음 결정에 쓰이게 하는 일까지, 일하면서 내리는 판단을 어디까지 직접 해 봤는지 살펴봐요. 이미 내 것이 된 판단과 다음 과제에서 맡아 볼 판단을 이 장에서 골라 보세요.",
    [...new Set(c2.map((p) => p.title.replace(/^강점 \d · .*/, "강점 해설")))],
    radarSeries.length ? radar(AXES.map((a) => d.axisName(a)), radarSeries, { size: 360, ring: false, label: 14 }) : ringArt(false),
    radarSeries.length ? radarHow() : ringHow(false, "영역 번호. 03장에서 같은 번호로 펴 볼 수 있어요")), ...c2, ...fill["판단 프로파일"] ?? []);

  const c3 = ch3Pages(x, d);
  P.push(chapter("03", PART3(x),
    `${d.counts.domains}개 ${E(j(x.domainWord, "을를"))} 하나씩 열어, 그 일이 어떤 순서로 흘러가는지와 그 안에서 내가 어디까지 해 봤는지 적었어요. 관심 가는 영역부터 펴 보고, 해 본 일인데 빠진 것이 있으면 경험 기록에 더해 보세요.`,
    [`영역 01~${String(d.counts.domains).padStart(2, "0")}`, ...[...new Set(c3.filter((p) => !p.title.startsWith("영역 ")).map((p) => p.title.replace(/ \(\d+\)$/, "").replace(/^경험 기록 · .*/, "경험 기록 해설")))]],
    ringArt(false), ringHow(false, "이 장의 ‘영역 01’부터 이어지는 쪽 번호")), ...c3, ...fill[PART3(x)] ?? []);

  const c4 = ch4Pages(x, d, !rv);
  P.push(chapter("04", "직무 탐색",
    `${E(x.major)} 쪽 대표 직무 ${x.roles.length}개에 지금 가진 근거를 대어 보고, 목표로 적은 직무와 산업은 한 걸음 더 들어가 봐요. 직무마다 하는 일과 공고에서 보는 것을 읽으면서, 내 경험을 어느 직무 쪽으로 설명할지 정해 보세요.`,
    [...new Set(c4.map((p) => p.title.replace(/ \(\d+\)$/, "").replace(/ · (하는 일|판단과 연습|첫 프로젝트와 배울 순서|핵심 영역에서 하는 판단)$/, "")))].slice(0, 9),
    DECO(200, 140, `<rect x="22" y="18" width="70" height="100" rx="8"/><rect x="108" y="18" width="70" height="100" rx="8"/><path d="M36 42h42M36 58h30M36 74h36M122 42h42M122 58h30M122 74h36"/><circle cx="100" cy="96" r="15"/><path d="M111 107l13 13"/>`)), ...c4, ...fill["직무 탐색"] ?? []);

  if (rv) P.push(...regionPages(x, d, rv), ...fill[`${rv.area}에서 찾아보기`] ?? []);
  else notes.push(!x.region ? "소속 기관에 맞는 지역 자료가 없어 05장을 뺐습니다" : rv0 ? `지역 자료(${x.region})에 이 전공의 산업과 이어지는 회사가 없어 05장을 뺐습니다` : `지역 자료(${x.region})를 읽지 못해 05장을 뺐습니다`);

  const c6 = ch6Pages(x, d);
  P.push(chapter("06", "자기소개서·면접 준비",
    "검사에서 답한 내용과 경험 기록을 자기소개서 문장과 면접 답변의 재료로 옮겼어요. 그대로 베끼기보다 빈칸을 내 경험으로 채우고, 내 말투로 고쳐 써 보세요.",
    [...new Set(c6.map((p) => p.title.replace(/ \d.*$/, "")))],
    DECO(200, 150, `<rect x="56" y="12" width="88" height="120" rx="8"/><path d="M72 38h56M72 56h48M72 74h52M72 92h36"/><path d="M118 112l10 10 22-26"/>`)), ...c6, ...fill["자기소개서·면접 준비"] ?? []);

  const c7 = [...ch7.prioPages(x, d), ch7.ganttPage(x, d), ch7.longPage(x, d), ch7.researchPage(x, d), ch7.weeklyPage(x, d)];
  P.push(chapter("07", "실행 로드맵",
    "가장 먼저 손댈 일에서 시작해 90일 계획, 6개월과 12개월 뒤의 모습까지 이어 두었어요. 대부분 내 응답으로 미리 채운 초안이니, 내 일정에 맞게 날짜와 할 일을 고쳐 써 보세요.",
    [...new Set(c7.map((p) => p.title.replace(/ \(\d+\)$/, "")))],
    DECO(220, 130, `<path d="M30 98C68 98 72 76 82 74S122 50 138 44S174 26 190 22"/><circle cx="30" cy="98" r="6"/><circle cx="82" cy="74" r="6"/><circle cx="138" cy="44" r="6"/><circle cx="190" cy="22" r="6"/>` +
      [[30, 120, "30일"], [82, 96, "90일"], [138, 66, "6개월"], [190, 44, "12개월"]].map(([cx, y, t]) => `<text x="${cx}" y="${y}" font-size="10" text-anchor="middle" fill="#fff" stroke="none" font-weight="600">${t}</text>`).join(""))), ...c7);

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
  const ctx = { issuer: x.issuer, major: x.department ?? x.major, tier: x.tier, person: x.person, answeredOn: x.answeredOn };
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
