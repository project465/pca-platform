/**
 * 소개 사이트의 방사형 그래프와 막대를 DB 에서 다시 굽는다. 두 언어 다.
 *
 * 소개 사이트에 숫자를 손으로 적으면 그 숫자는 반드시 언젠가 코드와 갈린다.
 * 여기서 실제 채점 결과를 읽어 좌표까지 계산해 위젯 파일을 통째로 쓴다.
 * 그래서 도형과 숫자가 갈릴 자리가 없다 — 둘 다 같은 한 줄에서 나온다.
 *
 *   npm run metri:radar            시연 응시 그대로
 *   npm run metri:radar -- 1234    다른 응시로
 *
 * 이름도 여기 적지 않는다. 축 이름은 data/metri/common.json 이, 직무영역
 * 이름은 translations 표가 이미 한국어·영어로 들고 있다. 소개 사이트가
 * 자기 사본을 또 들면 언젠가 한쪽만 고쳐지고, 그때 어느 쪽이 맞는지 모른다.
 *
 * 쓰는 응시는 `npm run metri:sim` 이 만든 가짜 응시자다. 실제 학생이 아니다.
 * 화면 캡처도 같은 응시에서 뽑았으므로 **응시 번호를 바꾸면 캡처도 같이
 * 다시 뽑아야 한다.**
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { query } from "../../src/lib/db";

type Lang = "ko" | "en";

const ATTEMPT = Number(process.argv[2] ?? 8377);
/** 같은 학년 안에서 갈리는 것을 보이려고, 1순위 직무영역이 다른 둘을 고른다. */
const PAIR = [Number(process.env.METRI_PAIR_A ?? 8176), Number(process.env.METRI_PAIR_B ?? 8452)];

const SITE: Record<Lang, string> = {
  ko: "sites/careermetri/imweb",
  en: "sites/careermetri/imweb-en",
};

/** 결과지가 그리는 순서 그대로. 축 순서가 바뀌면 도형이 달라 보인다. */
const STYLE_ORDER = ["INDEP", "COLLAB", "CHALLENGE", "STABLE", "SPEED", "QUALITY"] as const;
const AXIS_ORDER = ["DESIGN", "ANALYZE", "BUILD", "CODE", "OPTIMIZE", "ORCHESTRATE", "RESEARCH", "FIELD"] as const;

type Common = { indicators: { code: string; ko: string; en: string }[]; traits: Common["indicators"] };
const COMMON: Common = JSON.parse(readFileSync(join(process.cwd(), "data/metri/common.json"), "utf8"));
const AXIS_NAME: Record<Lang, Record<string, string>> = { ko: {}, en: {} };
for (const r of [...COMMON.indicators, ...COMMON.traits]) {
  AXIS_NAME.ko[r.code] = r.ko;
  AXIS_NAME.en[r.code] = r.en;
}

const W = 620, H = 540, CX = 310, CY = 262, R = 176, LAB = R + 30;
const f1 = (n: number) => n.toFixed(1);
const fmt = (n: number) => String(n).replace(/\.0$/, "");
const ang = (i: number, n: number) => -Math.PI / 2 + (2 * Math.PI * i) / n;
const pt = (i: number, n: number, v: number, cx = CX, cy = CY, r0 = R): [number, number] => {
  const a = ang(i, n), r = (r0 * v) / 100;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
};
const j2 = (xs: [number, number][]) => xs.map(([x, y]) => `${f1(x)},${f1(y)}`).join(" ");

type Row = { name: string; value: number; mean: number };

/**
 * 견줄 자리. 시뮬레이션 500명의 평균이다. 실제 학생 규준이 아니므로 상위 몇
 * % 라고 쓰지 않는다 — 평균선 하나를 같이 그리는 것까지만 한다. 그것만으로도
 * "이 사람이 높은가" 가 "무엇에 비해" 없이 떠 있지 않게 된다.
 */
async function cohort(lang: Lang) {
  const ind = await query<{ code: string; m: string }>(
    `SELECT i.code, AVG(s.scaled_score) AS m
       FROM indicator_scores s
       JOIN indicators i ON i.id = s.indicator_id
      WHERE s.attempt_id IN (SELECT id FROM attempts
                              WHERE session_id IN (SELECT id FROM test_sessions WHERE name LIKE 'SIM%')
                                AND status = 'scored')
      GROUP BY i.code`,
    [],
  );
  const areas = await query<{ area_code: string; m: string }>(
    `SELECT area_code, AVG(scaled_score) AS m FROM area_scores
      WHERE attempt_id IN (SELECT id FROM attempts
                            WHERE session_id IN (SELECT id FROM test_sessions WHERE name LIKE 'SIM%')
                              AND status = 'scored')
      GROUP BY area_code`,
    [],
  );
  const n = await query<{ n: string }>(
    `SELECT COUNT(*) AS n FROM attempts
      WHERE session_id IN (SELECT id FROM test_sessions WHERE name LIKE 'SIM%') AND status = 'scored'`,
    [],
  );
  if (!ind.length) throw new Error("견줄 평균이 없다. npm run metri:sim 을 먼저 돌린다");
  const m = new Map<string, number>();
  for (const r of ind) m.set(r.code, Math.round(Number(r.m) * 10) / 10);
  for (const r of areas) m.set(r.area_code, Math.round(Number(r.m) * 10) / 10);
  return { mean: m, n: Number(n[0].n), lang };
}

const COPY = {
  ko: {
    tabStyle: (n: number) => `업무 성향 &middot; ${n}`,
    tabAxis: (n: number) => `공학 활동 &middot; ${n}`,
    tabsLabel: "어느 쪽을 볼지",
    aria: (what: string) => `시연 응시 한 건의 ${what} 방사형 그래프. 같은 값이 옆에 숫자로도 적혀 있습니다.`,
    whatStyle: "업무 성향 여섯 축", whatAxis: "공학 활동 여덟 축",
    h2: "측정한 것이 어떤 모양인가",
    lead: `결과지가 이 그림으로 시작합니다. 성향과 활동은 모양으로, 직무영역 열 개는
    그 아래 순위로 나옵니다. 아래는 전부 시연 응시 한 건이고, 실제 응시와 같은
    산식으로 채점했습니다.`,
    scaleNote: `검사지 기준 0에서 100입니다. 다른 학생과 견준 값이 아닙니다.
      가운데에서 절반 되는 고리가 50입니다. 규준이 생기기 전까지 상위 몇 %는 쓰지 않습니다.`,
    barsLabel: "직무영역 열 개, 순위",
    barsNote: `직무영역 열 개는 순위를 냅니다. 그 안의 직무는 내지 않습니다 —
        신뢰구간이 겹치는 직무는 한 묶음으로 나옵니다. 검사지가 가르지 못하는
        순서는 없는 정밀도입니다. 아래 값은 시뮬레이션 응시이고 실제 학생이
        아닙니다.`,
    twoH2: "같은 학과, 같은 학년, 다른 답",
    twoLead: `둘 다 기계공학과이고 같은 253문항을 풀었습니다. 학과 평균으로 보면
    같은 칸에 들어갑니다. 정작 이 둘에게 도움이 되는 지원은 같지 않습니다.`,
    twoNote: `단체 리포트가 있는 이유가 이것입니다. 평균이 아니라 어느 쪽이 몇 명인지를
        내야, 취업지원팀이 어떤 특강을 열고 어떤 현직자를 부를지 정할 수 있습니다.
        두 건 다 시뮬레이션 응시이고 실제 학생이 아닙니다.`,
    student: (w: string) => `응시자 ${w}`,
    card: (d: Deck) =>
      `1순위 직무영역 ${d.areas[0].value}점, 그다음이 ${d.areas[1].name} ${d.areas[1].value}점입니다. ` +
      `${d.top2.join(" · ")} 쪽으로 일합니다.`,
    genNote: "GENERATED · npm run metri:radar 가 씁니다. 손으로 고치지 마세요.",
    colAxis: "축", colYou: "이 응시", colMean: "평균",
    keyYou: "이 응시 한 건", keyMean: (n: number) => `견줄 평균 (n = ${n})`,
    meanNote: (n: number) =>
      `점선은 시뮬레이션 응시 ${n}건의 평균입니다. 실제 학생 규준이 아니므로 ` +
      `상위 몇 %는 쓰지 않습니다. 평균선은 "높다"가 무엇에 비해 높은지를 ` +
      `적어 두려고 같이 그립니다.`,
  },
  en: {
    tabStyle: (n: number) => `Work styles &middot; ${n}`,
    tabAxis: (n: number) => `Engineering activities &middot; ${n}`,
    tabsLabel: "Which profile to show",
    aria: (what: string) => `Radar of the ${what} from one demonstration sitting. The same values are listed in figures beside it.`,
    whatStyle: "six work styles", whatAxis: "eight engineering activities",
    h2: "What the measurement looks like",
    lead: `The report opens on these. Two profiles as a shape, and the ten job areas
    ranked underneath. Everything here is one demonstration sitting, scored by the
    same engine a real one goes through.`,
    scaleNote: `Scaled 0 to 100 against the instrument, not against other students.
      The ring halfway out is 50. Until a norming sample exists we do not report
      percentiles.`,
    barsLabel: "The ten job areas, ranked",
    barsNote: `The ten areas are ranked. The roles inside them are not: roles whose
        intervals overlap come back as one group, because an order the instrument
        cannot resolve is precision it does not have. These figures are one
        simulated sitting, not a real student.`,
    twoH2: "Same department, same year, different answer",
    twoLead: `Both of these read mechanical engineering and sat the same 253 items.
    A cohort average would put them in the same row of a spreadsheet. The support
    that would actually help them is not the same.`,
    twoNote: `This is what the cohort report is for: not an average, but how many of
        each there are, so a careers office knows which masterclass to run and which
        practitioner to bring in. Both sittings are simulated, not real students.`,
    student: (w: string) => `Student ${w}`,
    card: (d: Deck) =>
      `Leads at ${d.areas[0].value}, then ${d.areas[1].name} at ${d.areas[1].value}. ` +
      `Works ${d.top2.map((t) => t.toLowerCase()).join(" and ")}.`,
    genNote: "GENERATED by npm run metri:radar. Do not edit by hand.",
    colAxis: "Axis", colYou: "This sitting", colMean: "Mean",
    keyYou: "This sitting", keyMean: (n: number) => `Comparison mean (n = ${n})`,
    meanNote: (n: number) =>
      `The dashed outline is the mean of ${n} simulated sittings. It is not a ` +
      `student norm, so we do not report percentiles from it. It is drawn ` +
      `because "high" needs something to be high against.`,
  },
} as const;

function radar(rows: Row[], key: string, hidden: boolean, c: (typeof COPY)[Lang]): string {
  const n = rows.length;
  const ring = (p: number, cls: string) =>
    `<polygon${cls ? ` class="${cls}"` : ""} points="${j2(rows.map((_, i) => pt(i, n, p)))}"/>`;
  const rings = [25, 50, 75].map((p) => ring(p, p === 50 ? "cm-rg-mid" : "")).join("") + ring(100, "cm-rg-out");
  const spokes = rows
    .map((_, i) => { const [x, y] = pt(i, n, 100); return `<line x1="${CX}" y1="${CY}" x2="${f1(x)}" y2="${f1(y)}"/>`; })
    .join("");
  /* 눈금은 12시 살 위에 짧은 선과 숫자로 단다. 축의 높이를 눈으로 읽을 수
     있어야 방사형이 장식이 아니라 그래프가 된다. */
  const ticks = [25, 50, 75, 100]
    .map((p) => {
      const [, y] = pt(0, n, p);
      return `<line x1="${CX - 5}" y1="${f1(y)}" x2="${CX + 5}" y2="${f1(y)}"/>` +
             `<text x="${CX + 10}" y="${f1(y + 3.5)}">${p}</text>`;
    })
    .join("");
  const vtx = rows
    .map((r, i) => { const [x, y] = pt(i, n, r.value); return `<circle r="4.4" cx="${f1(x)}" cy="${f1(y)}"/>`; })
    .join("");
  /* 축 이름과 값, 그리고 축마다 보이지 않는 넓은 과녁. 점 하나를 정확히
     겨누게 하면 손가락으로는 못 짚는다. */
  const labs = rows
    .map((r, i) => {
      const a = ang(i, n), cs = Math.cos(a), sn = Math.sin(a);
      const x = CX + LAB * cs;
      let y = CY + LAB * sn, anchor: string, base: string;
      if (Math.abs(cs) < 0.28) { anchor = "middle"; y += sn < 0 ? -12 : 20; base = "auto"; }
      else { anchor = cs > 0 ? "start" : "end"; base = "middle"; }
      const [hx, hy] = pt(i, n, 104);
      return `<g data-cm-ax="${i}">` +
        `<circle class="cm-hit" cx="${f1(hx)}" cy="${f1(hy)}" r="30"/>` +
        `<text x="${f1(x)}" y="${f1(y)}" text-anchor="${anchor}" dominant-baseline="${base}">${r.name}` +
        `<tspan x="${f1(x)}" dy="16">${fmt(r.value)}</tspan></text></g>`;
    })
    .join("");
  const mean = `<polygon class="cm-mean" points="${j2(rows.map((r, i) => pt(i, n, r.mean)))}"/>`;
  return (
    `<svg class="cm-radar" viewBox="0 0 ${W} ${H}" role="img" data-cm-radar="${key}"${hidden ? " hidden" : ""} ` +
    `style="--cm-o:${CX}px ${CY}px" ` +
    `aria-label="${c.aria(key === "style" ? c.whatStyle : c.whatAxis)}">` +
    `<g class="cm-rg">${rings}</g><g class="cm-sp">${spokes}</g><g class="cm-tick">${ticks}</g>` +
    `${mean}<polygon class="cm-poly" points="${j2(rows.map((r, i) => pt(i, n, r.value)))}"/>` +
    `<g class="cm-vtx">${vtx}</g><g class="cm-lab">${labs}</g></svg>`
  );
}

/** 나란히 놓는 작은 도형. 축 이름을 빼고 값 목록이 대신 읽어 준다. */
function miniRadar(rows: Row[], key: string): string {
  const n = rows.length, S = 260, C = 130, r0 = 92;
  const at = (i: number, v: number) => pt(i, n, v, C, C, r0);
  const rings = [50, 100]
    .map((p) => `<polygon${p === 50 ? ' class="cm-rg-mid"' : ""} points="${j2(rows.map((_, i) => at(i, p)))}"/>`)
    .join("");
  const spokes = rows
    .map((_, i) => { const [x, y] = at(i, 100); return `<line x1="${C}" y1="${C}" x2="${f1(x)}" y2="${f1(y)}"/>`; })
    .join("");
  const vtx = rows
    .map((r, i) => { const [x, y] = at(i, r.value); return `<circle r="3.2" cx="${f1(x)}" cy="${f1(y)}"/>`; })
    .join("");
  return (
    `<svg class="cm-radar cm-mini" viewBox="0 0 ${S} ${S}" role="img" data-cm-radar="${key}" ` +
    `style="--cm-o:${C}px ${C}px" aria-hidden="true" focusable="false">` +
    `<g class="cm-rg">${rings}</g><g class="cm-sp">${spokes}</g>` +
    `<polygon class="cm-poly" points="${j2(rows.map((r, i) => at(i, r.value)))}"/>` +
    `<g class="cm-vtx">${vtx}</g></svg>`
  );
}

const vals = (rows: Row[], head?: { a: string; b: string; c: string }, showMean = true) =>
  (head ? `<div class="cm-vhead"><span>${head.a}</span><b>${head.b}</b><b>${head.c}</b></div>` : "") +
  rows
    .map((r, i) =>
      `<div data-cm-ax="${i}"><span>${r.name}</span><b>${fmt(r.value)}</b>` +
      (showMean ? `<span class="cm-mean">${fmt(r.mean)}</span>` : "") + `</div>`)
    .join("");

type Deck = { style: Row[]; axis: Row[]; areas: Row[]; top2: string[] };

async function deck(attempt: number, lang: Lang, mean: Map<string, number>): Promise<Deck> {
  const ind = await query<{ code: string; scaled_score: string }>(
    `SELECT i.code, s.scaled_score FROM indicator_scores s
       JOIN indicators i ON i.id = s.indicator_id WHERE s.attempt_id = $1`,
    [attempt],
  );
  const areas = await query<{ area_code: string; scaled_score: string; name: string | null }>(
    `SELECT a.area_code, a.scaled_score,
            (SELECT t.value FROM translations t
              JOIN job_areas ja ON ja.id = t.row_id
             WHERE t.table_name = 'job_areas' AND t.field = 'name' AND t.lang = $2
               AND ja.code = a.area_code AND ja.instrument_key = 'PCA_ME_V1' LIMIT 1) AS name
       FROM area_scores a WHERE a.attempt_id = $1 ORDER BY a.rank_no`,
    [attempt, lang],
  );
  if (!ind.length || !areas.length) throw new Error(`응시 ${attempt} 의 점수가 없다`);
  const by = new Map(ind.map((r) => [r.code, Number(r.scaled_score)]));
  const pick = (codes: readonly string[]): Row[] =>
    codes.map((c) => {
      const v = by.get(c);
      // 없는 축을 0 으로 채우면 도형이 조용히 찌그러진다. 멈추는 편이 낫다
      if (v === undefined) throw new Error(`축 ${c} 의 점수가 없다`);
      const name = AXIS_NAME[lang][c];
      if (!name) throw new Error(`축 ${c} 의 ${lang} 이름이 common.json 에 없다`);
      const m = mean.get(c);
      if (m === undefined) throw new Error(`축 ${c} 의 평균이 없다`);
      return { name, value: v, mean: m };
    });
  const style = pick(STYLE_ORDER);
  return {
    style,
    axis: pick(AXIS_ORDER),
    areas: areas.map((a) => {
      if (!a.name) throw new Error(`직무영역 ${a.area_code} 의 ${lang} 이름이 translations 에 없다`);
      const m = mean.get(a.area_code);
      if (m === undefined) throw new Error(`직무영역 ${a.area_code} 의 평균이 없다`);
      return { name: a.name, value: Math.round(Number(a.scaled_score)), mean: Math.round(m) };
    }),
    top2: style.slice().sort((x, y) => y.value - x.value).slice(0, 2).map((r) => r.name),
  };
}

function measureHtml(d: Deck, lang: Lang, cohortN: number): string {
  const c = COPY[lang];
  /* 막대마다 평균 자리에 기준선을 하나 긋는다. 길이만 있으면 "77이 높은가"
     를 읽는 사람이 혼자 판단해야 한다. */
  const bars = d.areas
    .map((b) =>
      `<div class="cm-bar"><span>${b.name}</span>` +
      `<div class="cm-track"><i style="--w:${b.value}%"></i>` +
      `<span class="cm-mk" style="--m:${b.mean}%" title="${c.colMean} ${fmt(b.mean)}"></span></div>` +
      `<b>${b.value}</b></div>`)
    .join("");
  return `<!-- ${c.genNote}

     ${lang === "ko"
       ? `홈 · 측정한 것의 모양. 숫자는 전부 채점 엔진이 실제로 낸 값을 DB 에서
     읽은 것이고, 좌표는 그 숫자로 계산했습니다. 값만 고치고 도형을 다시
     계산하지 않으면 그림이 옆의 숫자와 다른 말을 합니다.

     도형에 참값이 들어 있습니다. 스크립트를 꺼도 그래프는 이미 맞게 그려져
     있고, 스크립트는 가운데로 접었다 한 번 펴 줄 뿐입니다.

     형태를 둘로 나눈 것은 일부러입니다. 6축·8축은 모양이고, 결과지가 그리는
     것도 담당자가 알아보는 것도 그 모양입니다. 열 개짜리 순위는 크기라서
     막대로 갑니다 — 열 갈래 방사형은 아무도 못 읽는 장식입니다.`
       : `Home · what the measurement looks like. Every figure is the scoring
     engine's real output for one simulated sitting, read out of the database,
     and the polygon coordinates were computed from those figures rather than
     drawn by eye.

     The polygon carries its true shape in the markup. With the script off the
     chart is already correct; the script collapses it to the centre and opens
     it once.

     Two forms on purpose. Six and eight axes are a shape, which is what the
     report draws. Ten ranked areas are magnitudes, and a bar is the honest way
     to compare ten of those.`} -->
<div class="cm">
  <div class="cm-in">
    <div class="cm-head">
    <h2 class="cm-h2">${c.h2}</h2>
    <div class="cm-col"><p>${c.lead}</p></div>
    </div>

    <div class="cm-tabs" role="group" aria-label="${c.tabsLabel}">
      <button type="button" aria-pressed="true" data-cm-tab="style">${c.tabStyle(d.style.length)}</button>
      <button type="button" aria-pressed="false" data-cm-tab="axis">${c.tabAxis(d.axis.length)}</button>
    </div>

    <div class="cm-chart">
      <div class="cm-radarwrap">${radar(d.style, "style", false, c)}${radar(d.axis, "axis", true, c)}</div>
      <div class="cm-vals">
        <div class="cm-vlist" data-cm-vals="style">${vals(d.style, { a: c.colAxis, b: c.colYou, c: c.colMean })}</div>
        <div class="cm-vlist" data-cm-vals="axis" hidden>${vals(d.axis, { a: c.colAxis, b: c.colYou, c: c.colMean })}</div>
        <ul class="cm-key">
          <li><i></i>${c.keyYou}</li>
          <li class="cm-k-mean"><i></i>${c.keyMean(cohortN)}</li>
        </ul>
        <p class="cm-small">${c.scaleNote}</p>
        <p class="cm-small">${c.meanNote(cohortN)}</p>
      </div>
    </div>

    <p class="cm-sublabel">${c.barsLabel}</p>
    <div class="cm-bars">${bars}</div>
    <div class="cm-note"><p>${c.barsNote}</p></div>
  </div>
</div>
`;
}

function twoHtml(a: Deck, b: Deck, lang: Lang): string {
  const c = COPY[lang];
  const card = (who: string, d: Deck, n: number) => `<div class="cm-cell">
        <span class="cm-n">${c.student(who)}</span>
        <h3 class="cm-h3">${d.areas[0].name}</h3>
        <p>${c.card(d)}</p>
        ${miniRadar(d.style, "pair" + n)}
        <div class="cm-vlist cm-tight">${vals(d.style, undefined, false)}</div>
      </div>`;
  return `<!-- ${c.genNote}

     ${lang === "ko"
       ? `결과지 · 같은 학년 두 사람. 표로 적었을 때는 아무도 안 믿었습니다.
     도형 둘을 나란히 놓으면 그게 이 제품의 논지 전부입니다. 둘 다 실제
     채점 결과이고, 1순위 직무영역이 서로 다른 쪽에서 골랐습니다.`
       : `Reports · two students from one year group. A table said the same thing
     and nobody believed it. Two shapes side by side is the whole argument of
     the product in one look.`} -->
<div class="cm cm-tint">
  <div class="cm-in">
    <div class="cm-head">
    <h2 class="cm-h2">${c.twoH2}</h2>
    <div class="cm-col"><p>${c.twoLead}</p></div>
    </div>
    <div class="cm-grid cm-g2">
      ${card("A", a, 1)}
      ${card("B", b, 2)}
    </div>
    <div class="cm-note"><p>${c.twoNote}</p></div>
  </div>
</div>
`;
}

async function main() {
  for (const lang of ["ko", "en"] as Lang[]) {
    const co = await cohort(lang);
    const d = await deck(ATTEMPT, lang, co.mean);
    writeFileSync(join(process.cwd(), SITE[lang], "17-measure.html"), measureHtml(d, lang, co.n), "utf8");
    const [a, b] = await Promise.all(PAIR.map((n) => deck(n, lang, co.mean)));
    writeFileSync(join(process.cwd(), SITE[lang], "18-two.html"), twoHtml(a, b, lang), "utf8");
    console.log(`${lang}  응시 ${ATTEMPT} · 짝 ${PAIR.join("+")} → ${SITE[lang]}/17-measure.html · 18-two.html`);
    if (lang === "en") {
      console.log(`     성향 ${d.style.map((r) => `${r.name} ${r.value}`).join(" · ")}`);
      console.log(`     직무 ${d.areas.map((r) => `${r.name} ${r.value}`).join(" · ")}`);
    }
  }
}

main().then(
  () => process.exit(0),
  (e) => { console.error(e); process.exit(1); },
);
