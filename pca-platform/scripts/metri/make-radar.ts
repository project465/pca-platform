/**
 * 홈페이지의 방사형 그래프와 막대를 DB 에서 다시 굽는다.
 *
 * 소개 사이트에 숫자를 손으로 적으면 그 숫자는 반드시 언젠가 코드와 갈린다.
 * 여기서 실제 채점 결과를 읽어 좌표까지 계산해 위젯 파일을 통째로 쓴다.
 * 그래서 도형과 숫자가 갈릴 자리가 없다 — 둘 다 같은 한 줄에서 나온다.
 *
 *   npx tsx scripts/metri/make-radar.ts [attemptId]
 *
 * 기본값은 소개 사이트가 쓰는 시연 응시다. 그 응시는 `npm run metri:sim` 이
 * 만든 가짜 응시자 한 명이고, 실제 학생이 아니다. 화면 캡처
 * `sites/careermetri/img-en/report.png` 도 같은 응시에서 뽑았으므로
 * **응시 번호를 바꾸면 캡처도 같이 다시 뽑아야 한다.**
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { query } from "../../src/lib/db";

const ATTEMPT = Number(process.argv[2] ?? 8377);
const OUT = join(process.cwd(), "sites/careermetri/imweb-en/17-measure.html");

/** 결과지가 그리는 순서 그대로. 축 순서가 바뀌면 도형이 달라 보인다. */
const STYLE_ORDER = ["INDEP", "COLLAB", "CHALLENGE", "STABLE", "SPEED", "QUALITY"] as const;
const AXIS_ORDER = ["DESIGN", "ANALYZE", "BUILD", "CODE", "OPTIMIZE", "ORCHESTRATE", "RESEARCH", "FIELD"] as const;

const EN: Record<string, string> = {
  INDEP: "Independent", COLLAB: "Collaborative", CHALLENGE: "Challenge-seeking",
  STABLE: "Stability-seeking", SPEED: "Speed-first", QUALITY: "Quality-first",
  DESIGN: "Design", ANALYZE: "Analyse", BUILD: "Build", CODE: "Code",
  OPTIMIZE: "Optimise", ORCHESTRATE: "Orchestrate", RESEARCH: "Research", FIELD: "Field work",
  DESIGN_DEV: "Design & Development", MFG_PROD: "Manufacturing & Production",
  ENERGY_PLANT: "Energy & Plant", AUTO_AERO: "Automotive & Aerospace",
  ROBOT_AUTO: "Robotics & Automation", IT_DATA: "IT Convergence & Data",
  CONSTR_FACIL: "Construction & Facility", RND_EDU: "Research & Education",
  BIO_HEALTH: "Bio & Healthcare", PUBLIC_ETC: "Public Institutions & Other",
};

const W = 440, H = 360, CX = 220, CY = 176, R = 104, LAB = R + 18;
const f1 = (n: number) => n.toFixed(1);
const ang = (i: number, n: number) => -Math.PI / 2 + (2 * Math.PI * i) / n;
function pt(i: number, n: number, v: number): [number, number] {
  const a = ang(i, n), r = (R * v) / 100;
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
}
const join2 = (xs: [number, number][]) => xs.map(([x, y]) => `${f1(x)},${f1(y)}`).join(" ");

type Row = { name: string; value: number };

function radar(rows: Row[], key: string, hidden: boolean): string {
  const n = rows.length;
  const ringAt = (p: number) =>
    `<polygon${p === 50 ? ' class="cm-rg-mid"' : ""} points="${join2(rows.map((_, i) => pt(i, n, p)))}"/>`;
  const rings = [25, 50, 75, 100].map(ringAt).join("");
  const spokes = rows
    .map((_, i) => { const [x, y] = pt(i, n, 100); return `<line x1="${CX}" y1="${CY}" x2="${f1(x)}" y2="${f1(y)}"/>`; })
    .join("");
  const shape = join2(rows.map((r, i) => pt(i, n, r.value)));
  const vtx = rows
    .map((r, i) => { const [x, y] = pt(i, n, r.value); return `<circle r="3.6" cx="${f1(x)}" cy="${f1(y)}"/>`; })
    .join("");
  const labs = rows
    .map((r, i) => {
      const a = ang(i, n), c = Math.cos(a), s = Math.sin(a);
      const x = CX + LAB * c;
      let y = CY + LAB * s, anchor: string, base: string;
      if (Math.abs(c) < 0.28) { anchor = "middle"; y += s < 0 ? -9 : 15; base = "auto"; }
      else { anchor = c > 0 ? "start" : "end"; base = "middle"; }
      return `<text x="${f1(x)}" y="${f1(y)}" text-anchor="${anchor}" dominant-baseline="${base}">${r.name}</text>`;
    })
    .join("");
  const what = key === "style" ? "six work styles" : "eight engineering activities";
  return (
    `<svg class="cm-radar" viewBox="0 0 ${W} ${H}" role="img" data-cm-radar="${key}"${hidden ? " hidden" : ""} ` +
    `aria-label="Radar of the ${what} from one demonstration sitting. The same values are listed in figures beside it.">` +
    `<g class="cm-rg">${rings}</g><g class="cm-sp">${spokes}</g>` +
    `<polygon class="cm-poly" points="${shape}"/><g class="cm-vtx">${vtx}</g>` +
    `<g class="cm-lab">${labs}</g></svg>`
  );
}

const vals = (rows: Row[]) =>
  rows.map((r) => `<div><span>${r.name}</span><b>${String(r.value).replace(/\.0$/, "")}</b></div>`).join("");

async function main() {
  const ind = await query<{ code: string; scaled_score: string }>(
    `SELECT i.code, s.scaled_score FROM indicator_scores s
       JOIN indicators i ON i.id = s.indicator_id
      WHERE s.attempt_id = $1`,
    [ATTEMPT],
  );
  const areas = await query<{ area_code: string; scaled_score: string }>(
    `SELECT area_code, scaled_score FROM area_scores WHERE attempt_id = $1 ORDER BY rank_no`,
    [ATTEMPT],
  );
  if (!ind.length || !areas.length) throw new Error(`응시 ${ATTEMPT} 의 점수가 없다`);

  const by = new Map(ind.map((r) => [r.code, Number(r.scaled_score)]));
  const pick = (codes: readonly string[]): Row[] =>
    codes.map((c) => {
      const v = by.get(c);
      // 없는 축을 0 으로 채우면 도형이 조용히 찌그러진다. 멈추는 편이 낫다
      if (v === undefined) throw new Error(`축 ${c} 의 점수가 없다`);
      return { name: EN[c] ?? c, value: v };
    });
  const style = pick(STYLE_ORDER);
  const axis = pick(AXIS_ORDER);
  const bars = areas.map((a) => ({ name: EN[a.area_code] ?? a.area_code, value: Math.round(Number(a.scaled_score)) }));

  const barHtml = bars
    .map((b) => `<div class="cm-bar"><span>${b.name}</span><i style="--w:${b.value}%"></i><b>${b.value}</b></div>`)
    .join("");

  const html = `<!-- Home · what the measurement looks like.

     GENERATED. Do not edit by hand: the polygon coordinates are geometry
     computed from the figures, so changing a number here without recomputing
     the shape makes the picture lie about the list beside it.

         npx tsx scripts/metri/make-radar.ts ${ATTEMPT}

     Every figure is the scoring engine's real output for one simulated
     sitting, read out of the database. The same sitting is the one captured
     in img-en/report.png, so the screenshot and these charts agree.

     The polygon carries its true shape in the markup. With the script off the
     chart is already correct; the script collapses it to the centre and opens
     it once, which is an effect the page can lose without losing the figure.

     Two forms on purpose. Six and eight axes are a shape, which is what the
     report draws and what a coordinator recognises across a cohort. Ten
     ranked areas are magnitudes, and a bar is the honest way to compare ten
     of those: a ten-spoke radar is a decoration nobody can read. -->
<div class="cm">
  <div class="cm-in">
    <div class="cm-head">
    <h2 class="cm-h2">What the measurement looks like</h2>
    <div class="cm-col"><p>The report opens on these. Two profiles as a shape,
    and the ten job areas ranked underneath. Everything here is one
    demonstration sitting, scored by the same engine a real one goes
    through.</p></div>
    </div>

    <div class="cm-tabs" role="group" aria-label="Which profile to show">
      <button type="button" aria-pressed="true" data-cm-tab="style">Work styles &middot; ${style.length}</button>
      <button type="button" aria-pressed="false" data-cm-tab="axis">Engineering activities &middot; ${axis.length}</button>
    </div>

    <div class="cm-chart">
      <div class="cm-radarwrap">${radar(style, "style", false)}${radar(axis, "axis", true)}</div>
      <div class="cm-vals">
        <div class="cm-vlist" data-cm-vals="style">${vals(style)}</div>
        <div class="cm-vlist" data-cm-vals="axis" hidden>${vals(axis)}</div>
        <p class="cm-small">Scaled 0 to 100 against the instrument, not against
          other students. The ring halfway out is 50. Until a norming sample
          exists we do not report percentiles.</p>
      </div>
    </div>

    <p class="cm-sublabel">The ten job areas, ranked</p>
    <div class="cm-bars">${barHtml}</div>
    <div class="cm-note">
      <p>The ten areas are ranked. The roles inside them are not: roles whose
        intervals overlap come back as one group, because an order the
        instrument cannot resolve is precision it does not have. These figures
        are one simulated sitting, not a real student.</p>
    </div>
  </div>
</div>
`;
  writeFileSync(OUT, html, "utf8");
  console.log(`응시 ${ATTEMPT} → ${OUT}`);
  console.log(`  성향 ${style.map((r) => `${r.name} ${r.value}`).join(" · ")}`);
  console.log(`  활동 ${axis.map((r) => `${r.name} ${r.value}`).join(" · ")}`);
  console.log(`  직무영역 ${bars.map((b) => `${b.name} ${b.value}`).join(" · ")}`);
}

main().then(
  () => process.exit(0),
  (e) => { console.error(e); process.exit(1); },
);
