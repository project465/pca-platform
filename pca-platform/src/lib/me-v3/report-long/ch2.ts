/**
 * 02 판단 프로파일.
 *
 * 단계 이름은 `STEP_WORD`(derive.ts)와 `LEVEL_KO`(charts.ts)에서만 읽는다. 쪽 안에서
 * 이름을 다시 적지 않는다. 그래프마다 바로 아래에 읽는 법(`howto`)을 붙이고, 넘기는 색은
 * 그래프가 실제로 칠하는 값이다.
 *
 * 영어 책: 학생에게 보이는 글자는 `L(ko, en)`(lang.ts 의 `T`)로 고른다. 한국어 쪽 인자는
 * 그대로라 한국어 책은 글자까지 같다. 영어 문장에는 한국어 문법 도구(`j` · `polite` ·
 * `andJoin` · `list3`)를 쓰지 않고 아래의 작은 영어 도구를 쓴다.
 */
import type { Axis } from "../scoring/types";
import { QUALITY_KO, commonKo } from "../result/text.ko";
import { AXIS_KO as AXIS_EN, QUALITY_KO as QUALITY_EN, commonKo as commonEn } from "../result/text.en";
import type { Inputs, Level } from "./types";
import { AXES, STEP_WORD, type X, notAsked } from "./derive";
import { C, LEVEL_KO, hbars, heat, radar } from "./charts";
import { E, H, LVC, PAL, T, band, chips, howto, note, pip, ul, zoneTag, type Page } from "./kit";
import { T as L, isEn } from "./lang";
import { andJoin, askNoun, j, list3, polite, q } from "./text";

const P = (title: string, body: string): Page => ({ part: "02", partName: L("판단 프로파일", "Judgment profile"), title, body });
const SERIES = [PAL.blue, PAL.coral, PAL.teal, PAL.violet];
/** 지도 칸과 분포 막대에서 ‘해 본 적 없음’을 칠하는 색. LVC[0] 은 빈 막대 바탕과 거의 같아 막대에서는 따로 둔다 */
const NONE_BAR = "#b8bfcc";
/** 지도 칸 안에 들어가는 짧은 글자. 칸 폭이 여섯 글자 남짓이라 단계 이름을 줄여 쓰고, 읽는 법에 온 이름을 붙인다 */
const CELL_WORD = ["없음", "시킨 대로", "직접", "기준 정함"] as const;
const CELL_WORD_EN = ["None", "Followed", "Myself", "Decided"] as const;
const cellWord = (k: Level) => (isEn() ? CELL_WORD_EN[k] : CELL_WORD[k]);
const NA_FILL = "#f6f7f9";

/* ── 영어 도구 ─────────────────────────────────────────────── */
/** A, B and C */
const andEn = (xs: string[]) => {
  const ys = xs.filter(Boolean);
  if (ys.length <= 1) return ys[0] ?? "";
  return ys.length === 2 ? `${ys[0]} and ${ys[1]}` : `${ys.slice(0, -1).join(", ")} and ${ys[ys.length - 1]}`;
};
const qe = (s: string) => `“${s.replace(/[.]$/, "")}”`;
/** 문장 가운데로 옮길 때 첫 글자만 낮춘다(약어 `BOM` · `CAD` 는 그대로) */
const lc = (s: string) => (/^[A-Z][a-z]/.test(s) ? s[0].toLowerCase() + s.slice(1) : s);
const noDot = (s: string) => s.trim().replace(/[.]$/, "");
/** 셋까지는 인용하고 나머지는 수로 */
const list3En = (xs: string[]) => (xs.length <= 3 ? andEn(xs.map(qe)) : `${xs.slice(0, 3).map(qe).join(", ")} and ${xs.length - 3} more`);
const nJ = (n: number) => (n === 1 ? "1 judgment" : `${n} judgments`);
/** 관사. 복수(…s)면 붙이지 않는다 */
const aN = (s0: string) => {
  const s = lc(s0);
  if (s.includes(",") || /[^s]s$/.test(s.split(/\s+/).pop() ?? "")) return s;
  if (/^[A-Z]{2,}/.test(s)) return `${/^[AEFHILMNORSX]/.test(s) ? "an" : "a"} ${s}`;
  return `${/^[aeiou]/i.test(s) ? "an" : "a"} ${s}`;
};
const STRENGTH_EN: Record<string, string> = { 중심: "core", 있음: "also used", 드묾: "rare" };
/* 관계표의 값(중심 · 있음 · 드묾)은 표 안의 말이라, 괄호 안에 그대로 두면 ‘(있음)’ 처럼 뜻이 안 읽힌다 */
const STRENGTH_KO: Record<string, string> = { 중심: "주로 씀", 있음: "함께 씀", 드묾: "드물게 씀" };
const strengthWord = (s: string) => (isEn() ? STRENGTH_EN[s] ?? s : STRENGTH_KO[s] ?? s);
/** 축 이름. 영어는 웹 결과 영어판과 같은 이름(`text.en.ts`) */
const axName = (d: X) => (a: Axis) => (isEn() ? AXIS_EN[a] : d.axisName(a));

/** 그래프와 읽는 법을 한 덩이로 묶는다. 쪽 모으기가 둘을 다른 쪽으로 갈라 놓지 않게 한다 */
const fig = (graph: string, how: string) => `<div style="display:flex;flex-direction:column;gap:2.4mm">${graph}${how}</div>`;

function seriesOf(d: X) {
  return d.radarDoms.map((v, i) => ({ code: v.code, name: d.name(v.code), levels: d.levels(v.code), color: SERIES[i] }));
}

/** 방사형 그래프 읽는 법. 고리 이름은 그래프에 적힌 LEVEL_KO 와 같은 값이다 */
function radarHow(series: { name: string; color: string }[], rings: boolean): string {
  return howto([
    [L("가운데", "Center"), `${LEVEL_KO[0]}`],
    ...(rings ? ([[L("안쪽 고리", "Inner ring"), LEVEL_KO[1]], [L("가운데 고리", "Middle ring"), LEVEL_KO[2]]] as [string, string][]) : []),
    [L("바깥 고리", "Outer ring"), LEVEL_KO[3]],
    ...series.map((s) => [s.color, L(`${E(s.name)}의 선`, rings ? `${E(s.name)} line` : "Your line for this area")] as [string, string]),
    [L("점 없는 꼭짓점", "No dot"), L("이번에 묻지 않은 판단", "Not asked this time")],
  ], rings ? L("꼭짓점 여덟 개가 판단 하나씩이고, 선이 바깥으로 나갈수록 그 판단을 깊이 해 봤다는 뜻이에요.", "Each of the eight spokes is one judgment. The further a line reaches out, the further you have gone with that judgment.") : undefined);
}

export function radarBig(x: Inputs, d: X): Page {
  const s = seriesOf(d);
  const an = axName(d);
  const labels = AXES.map((a) => an(a));
  const own = s.map((v) => ({ v, n: v.levels.filter((l) => l === 3).length })).sort((a, b) => b.n - a.n);
  const title = !s.length ? L("이번 검사는 관심과 해 본 횟수까지 물었습니다", "This time we only asked about your interest and how often you had done the work")
    : own[0].n && (s.length === 1 || own[0].n > own[1].n) ? L(`${E(own[0].v.name)}에서 기준까지 직접 정한 판단이 가장 많습니다`, `You made the call most often in ${E(own[0].v.name)}`)
      : L(`자세히 물은 ${s.length}개 영역의 판단을 한 그래프에 겹쳤습니다`, `The ${s.length} areas we asked about in depth, on one chart`);
  const dek = s.length
    ? L(`일할 때 내리는 여덟 가지 판단(${E(labels.join(", "))})을 영역마다 한 선으로 그렸습니다. 영역마다 모양이 다르면 영역에 따라 맡아 온 일이 달랐다는 뜻이에요.`,
      "Each line is one area, drawn across the eight judgments you make at work. If the shapes differ, you have taken on different kinds of work in different areas.")
    : undefined;
  return P(L("판단 프로파일 방사형 그래프", "Judgment profile chart"),
    T(title, dek) +
    (s.length ? `${fig(`<div class="wide-art">${radar(labels, s, { size: 540 })}</div>`, radarHow(s, true))}
      <div class="g${s.length >= 3 ? 3 : 2}">${s.slice(0, 3).map((v) => {
        const top = AXES.filter((_, k) => v.levels[k] === 3).map(an);
        const low = AXES.filter((_, k) => v.levels[k] !== null && (v.levels[k] ?? 0) <= 1).map(an);
        const did = v.levels.filter((l) => (l ?? 0) >= 2).length;
        const body = [top.length ? `<p>${E(STEP_WORD[3].tag)}: ${E(top.join(", "))}</p>` : "", low.length ? `<p class="mut">${L("다음에 직접 맡아 볼 판단", "Take on yourself next")}: ${E(low.join(", "))}</p>` : "", !top.length && !low.length ? `<p>${L(`물은 판단 가운데 ${did}가지를 직접 해 봤어요.`, `You did ${did} of the judgments we asked about yourself.`)}</p>` : ""].join("");
        return `<div class="note" style="box-shadow:inset 3px 0 0 ${v.color}"><b>${E(v.name)}</b>${body}</div>`;
      }).join("")}</div>` : (() => {
        const hi = x.m.domains.filter((z) => z.interest === "HIGH").map((z) => d.name(z.code)).slice(0, 2);
        return isEn()
          ? `<div class="na-box"><b>To see your judgment levels</b>Do one short project in an area you care about${hi.length ? ` (such as ${E(andEn(hi))})` : ""}, then take the assessment again. This chart fills in then.</div>`
          : `<div class="na-box"><b>판단 단계까지 보려면</b>${hi.length ? `${E(andJoin(hi))}처럼 관심이 높은 영역에서` : "관심 가는 영역에서"} 짧은 과제를 한 번 해 본 뒤 다시 검사해 보세요. 그때 이 그래프가 그려집니다.</div>`;
      })()));
}

export function heatPage(x: Inputs, d: X): Page {
  const an = axName(d);
  const rows = x.m.domains.map((z) => d.name(z.code));
  const cell = (i: number, jj: number) => {
    const lv = d.level(x.m.domains[i].code, AXES[jj]);
    if (lv === null) return { fill: NA_FILL, text: "", ink: C.ink3 };
    return { fill: LVC[lv], text: cellWord(lv), ink: lv >= 2 ? "#fff" : C.ink2 };
  };
  const cells = x.m.domains.flatMap((z) => d.levels(z.code)).filter((v): v is Level => v !== null);
  const hi = cells.filter((v) => v >= 2).length;
  /* 영어 영역 이름과 축 이름은 길어서 그림 폭을 넓힌다(글자는 그만큼 작아진다). 칸마다 75 남짓이라 축 이름이 옆 칸과 겹치지 않는다 */
  const opt = isEn() ? { width: 900, label: 300, head: 64, row: 30, colWrap: 7 } : { width: 700, label: 150, head: 54, row: 30, colWrap: 6 };
  return P(L(`${x.domainWord} × 판단 지도`, "Area × judgment map"),
    T(cells.length ? L(`물은 ${cells.length}칸 가운데 ${hi}칸은 직접 해 봤거나 기준까지 정했습니다`, `In ${hi} of the ${cells.length} cells we asked about, you did the work yourself or made the call`) : L(`${d.counts.domains}가지 ${E(x.domainWord)}과 여덟 가지 판단을 한 장에 놓았습니다`, `All ${d.counts.domains} areas and eight judgments on one page`),
      L("칸 하나가 한 영역에서 한 판단을 어디까지 해 봤는지 보여 줘요. 판단까지 자세히 물은 영역에만 색이 들어갑니다.", "Each cell shows how far you have gone with one judgment in one area. Only the areas we asked about in depth are colored.")) +
    fig(`<div class="wide-art">${heat(rows, AXES.map((a) => an(a)), cell, opt)}</div>`, howto([
      [L("가로줄", "Row"), L(`${E(x.domainWord)} 하나`, "One area")], [L("세로줄", "Column"), L("판단 하나", "One judgment")],
      ...([0, 1, 2, 3] as const).map((k) => [LVC[k], `${E(STEP_WORD[k].tag)}${cellWord(k) !== STEP_WORD[k].tag ? L(` (칸 글자 ‘${CELL_WORD[k]}’)`, ` (shown as “${CELL_WORD_EN[k]}”)`) : ""}`] as [string, string]),
      [NA_FILL, L("빈 칸: 이번에 판단까지 묻지 않은 영역", "Blank cell: an area where we did not ask about judgments this time")],
    ])) +
    (() => {
      const askedD = x.m.domains.filter((z) => d.asked(z));
      const rowBest = askedD.map((z) => ({ z, n: d.levels(z.code).filter((v) => v != null && v >= 2).length })).sort((a, b) => b.n - a.n)[0];
      const colLow = AXES.map((a) => ({ a, n: askedD.filter((z) => (d.level(z.code, a) ?? 0) >= 2).length })).sort((p, q0) => p.n - q0.n)[0];
      if (!rowBest || !colLow) return "";
      if (isEn()) {
        return `<div class="two">
        ${note("Reading across", `This shows how far you went within one area. In ${E(d.name(rowBest.z.code))}, ${rowBest.n} of the 8 cells show work you did yourself or calls you made.`)}
        ${note("Reading down", `This shows how many areas you used one judgment in. You did ${E(qe(an(colLow.a)))} yourself in ${colLow.n} of the ${askedD.length} areas we asked about. ${colLow.n < askedD.length ? "On your next project, take this judgment on yourself." : "On your next project, set the criteria for this judgment yourself."}`)}
      </div>`;
      }
      return `<div class="two">
        ${note("가로로 읽기", `한 영역 안에서 어느 판단까지 해 봤는지 봅니다. ${E(j(d.name(rowBest.z.code), "은는"))} 여덟 칸 가운데 ${rowBest.n}칸을 직접 해 봤거나 기준까지 정했어요.`)}
        ${note("세로로 읽기", `한 판단을 몇 영역에서 해 봤는지 봅니다. ${E(j(q(d.axisName(colLow.a)), "은는"))} 물은 ${askedD.length}개 영역 가운데 ${colLow.n}곳에서 직접 해 봤어요. ${colLow.n < askedD.length ? "다음 과제에서는 이 판단을 직접 맡아 보세요." : "다음 과제에서는 이 판단의 기준까지 직접 정해 보세요."}`)}
      </div>`;
    })());
}

export function profileRead(x: Inputs, d: X): Page {
  const an = axName(d);
  const b3 = d.best.filter((b) => b.level === 3), b2 = d.best.filter((b) => b.level === 2);
  const low = d.best.filter((b) => b.level !== null && b.level <= 1), un = d.best.filter((b) => b.level === null);
  const nm = (bs: typeof d.best) => (bs.length >= 5 ? `판단 ${bs.length}가지` : andJoin(bs.map((b) => d.axisName(b.axis))));
  const subj = (bs: typeof d.best) => (bs.length === AXES.length ? "모든 판단을" : j(nm(bs), "은는"));
  /* 영어: 문장 가운데 들어가는 판단 이름 */
  const nmEn = (bs: typeof d.best) => (bs.length === AXES.length ? "every judgment" : bs.length >= 5 ? nJ(bs.length) : andEn(bs.map((b) => lc(an(b.axis)))));
  const where = (bs: typeof d.best) => [...new Set(bs.flatMap((b) => b.where))].map(d.name);
  const high = x.m.domains.filter((z) => z.interest === "HIGH" && !d.asked(z)).map((z) => d.name(z.code));
  const paras: [string, string][] = [];
  if (isEn()) {
    if (b3.length) paras.push(["Strongest", `You said you set the criteria yourself for ${nmEn(b3)}, and you picked matching scenes in the checklist. These came from ${andEn(where(b3))}, so you can lead with them in an application as decisions you made.`]);
    if (b2.length) paras.push(["Next step", `You said you took on ${nmEn(b2)} and did the work yourself. On your next project, set the criteria for that judgment too and pick one more matching scene in the checklist. That moves it up to “${STEP_WORD[3].tag}.”`]);
    if (low.length) paras.push(["Try more", `For ${nmEn(low)}, nothing reached “did it myself” in the areas we asked about. You may not have done it yet, or the scene may not have come to mind during the test. Think once more about a class or team project where you handled it.`]);
    if (un.length) paras.push(["Not asked", `We did not ask about ${nmEn(un)} this time.`]);
    if (high.length) paras.push(["Interest", `You said your interest is high in ${andEn(high.slice(0, 4))}, but this time we did not ask about judgments there. Do a short project in one of them and your next result will have something to go on.`]);
    if (!paras.length) paras.push(["Now", "This time no area was asked down to the judgment level. Do a short project in an area you care about, then take the assessment again."]);
  } else {
    if (b3.length) paras.push(["강한 쪽", `${subj(b3)} 기준까지 직접 정했다고 답했고, 체크리스트에서도 그런 일을 고르셨어요. ${andJoin(where(b3))}에서 나온 판단이라 지원서에 ‘제가 정한 것’으로 앞에 내세울 만합니다.`]);
    if (b2.length) paras.push(["다음 단계", `${subj(b2)} 직접 맡아 해 봤다고 답했어요. 다음 과제에서 그 판단의 기준까지 직접 정하고 그런 일을 체크리스트에서 하나 더 고르면 ‘${STEP_WORD[3].tag}’ 단계로 올라갑니다.`]);
    if (low.length) paras.push(["더 해 볼 쪽", `${subj(low)} 물은 영역에서 아직 직접 해 본 단계까지 나오지 않았어요. 정말 해 본 적이 없을 수도 있고 검사하면서 그때 일이 떠오르지 않았을 수도 있으니, 수업이나 팀 과제에서 맡았던 때가 있었는지 한 번 더 떠올려 보세요.`]);
    if (un.length) paras.push(["묻지 않은 쪽", `${subj(un)} 이번 검사에서 묻지 않았어요.`]);
    if (high.length) paras.push(["관심", `${andJoin(high.slice(0, 4))}에 관심이 높다고 답했는데, 이번에는 판단 단계까지 묻지 않았어요. 그중 한 영역에서 짧은 과제를 해 보면 다음 결과에 근거로 들어갑니다.`]);
    if (!paras.length) paras.push(["지금", "이번 검사에서는 판단 단계를 물은 영역이 없어요. 관심 가는 영역에서 짧은 과제를 한 번 해 본 뒤 다시 검사해 보세요."]);
  }
  const sceneOf = (b: (typeof d.best)[number]) => { const td = b.where[0] ?? d.radarDoms[0]?.code; return td ? d.def(td)?.axes?.[b.axis]?.l2 ?? "" : ""; };
  const say = (b: (typeof d.best)[number]) => {
    const sc = sceneOf(b);
    if (isEn()) {
      if (sc && b.level === 3) return `“I ${lc(noDot(sc))}, and I set the criteria myself.”`;
      if (sc && b.level === 2) return `“I ${lc(noDot(sc))}.”`;
      if (sc && b.level === 1) return `“I ${lc(noDot(sc))}. Someone else set the conditions.”`;
      return b.level === 3 ? "“I set the criteria, and the result was used.”" : b.level === 2 ? "“I did it myself within the conditions I was given.”" : b.level === 1 ? "“I did it the way someone else set it up.”" : "“I haven't done this yet.”";
    }
    /* 기준까지 정한 판단마다 같은 꼬리말을 붙이면 표 한 장에 같은 문장이 일곱 번 선다. 판단마다 정한 몫이 다르니 그 몫을 적는다 */
    const OWN: Record<string, string> = {
      J1: "어디까지 다룰지는 제가 정했습니다.", J2: "어떤 기준으로 옮길지는 제가 정했습니다.",
      J3: "그 기준은 제가 직접 정했습니다.", J4: "어떤 방법을 쓸지는 제가 골랐습니다.",
      J5: "무엇을 남길지도 제가 정했습니다.", J6: "무엇과 비교할지도 제가 정했습니다.",
      J7: "어떻게 고칠지도 제가 정했습니다.", J8: "올릴 내용과 방향도 제가 정리했습니다.",
    };
    if (sc && b.level === 3) return `“${polite(sc)} ${OWN[b.axis] ?? "그 기준은 제가 정했습니다."}”`;
    if (sc && b.level === 2) return `“${polite(sc)}”`;
    if (sc && b.level === 1) return `“${polite(sc)} 조건은 다른 사람이 정했습니다”`;
    return b.level === 3 ? "“제가 기준을 정했고, 그 결과가 쓰였습니다”" : b.level === 2 ? "“주어진 조건 안에서 제가 직접 해 봤습니다”" : b.level === 1 ? "“다른 사람이 정한 대로 맡아 해 봤습니다”" : "“아직 해 보지 않았습니다”";
  };
  const sayRows = d.best.filter((b) => b.level !== null);
  const head = isEn()
    ? (b3.length ? `You made the call on ${nJ(b3.length)}${b2.length ? ` and did ${b2.length} more yourself` : ""}` : b2.length === AXES.length ? "You did every judgment we asked about yourself" : b2.length ? `You did ${nJ(b2.length)} yourself` : "Few judgments have reached “did it myself” yet")
    : (b3.length ? `기준까지 직접 정한 판단이 ${b3.length}가지${b2.length ? `, 직접 해 본 판단이 ${b2.length}가지` : ""}입니다` : b2.length === AXES.length ? "물은 판단을 모두 직접 해 봤습니다" : b2.length ? `직접 해 본 판단이 ${b2.length}가지입니다` : "직접 해 본 판단은 아직 적습니다");
  return P(L("프로파일 해석", "Reading your profile"),
    T(head) +
    `<div class="prose">${paras.map(([h, t]) => `<div class="pr"><span class="pr-n">${E(h)}</span><p>${E(t)}</p></div>`).join("")}</div>` +
    (sayRows.length ? H(L("판단마다 이렇게 말할 수 있습니다", "What you can say for each judgment"), L("면접에서 그대로 꺼낼 수 있는 말", "Lines you can use as they are in an interview")) +
    `<table class="tb tb-xs"><thead><tr><th>${L("판단", "Judgment")}</th><th>${L("가장 깊은 단계", "Deepest level")}</th><th>${L("나온 영역", "Where it showed up")}</th><th>${L("이렇게 말하기", "How to say it")}</th></tr></thead><tbody>${sayRows.map((b) => `<tr><td><b>${E(an(b.axis))}</b></td><td>${pip(b.level)}</td><td>${E(b.where.map(d.name).join(", "))}</td><td class="mut">${E(say(b))}</td></tr>`).join("")}</tbody></table>` : ""));
}

export function strengthPage(x: Inputs, d: X, k: number): Page {
  const an = axName(d);
  const en = isEn();
  const s = d.strengths[k];
  const ev = d.evidenceOf(s);
  const def = d.def(s.code);
  const gap = x.m.gaps.find((g) => g.domain === s.code);
  const nm = d.name(s.code);
  const roles = d.rolesOf(s.code).slice(0, en ? 2 : 4).map((r) => (en ? `${d.roleName(r.role)} (${strengthWord(r.strength)})` : `${d.roleName(r.role)}(${strengthWord(r.strength)})`));
  const indRow = d.goalInd ? x.rel.td_industry.find((r) => r.td === s.code && r.industry === d.goalInd!.code && r.strength !== "드묾") : null;
  /* 영어: 관계표의 `dimensions` 는 한국어 원고라, 같은 자리를 산업팩(영어 원고)의 판단 이름에서 읽는다 */
  const indDim = en && indRow ? d.goalInd!.judgement_dimensions?.find((v) => v.domain === s.code)?.name : null;
  const indLine = en
    ? (indDim ? `${d.goalInd!.name_ko}: ${qe(indDim)}` : null)
    : indRow?.dimensions?.[0] ? `${d.goalInd!.name_ko}에서는 ${askNoun(indRow.dimensions[0])}를 봅니다.` : null;
  const pick = ev.decisions[0] ?? ev.acts[0];
  /* 영어 문장에 옮길 비교 대상: 가장 짧은 것(긴 것은 여러 항목을 쉼표로 묶은 줄이라 한 문장에 넣으면 쪽이 넘친다) */
  const cmp0 = [...ev.comparisons].sort((a, b) => a.length - b.length)[0];
  const story = en
    ? (ev.decisions.length || ev.acts.length
      ? "Everything here comes from the items you picked in the checklist."
      : `You said you did ${nJ(s.confirmed.length)} yourself in ${nm}. Pick the project in the checklist and you will have evidence to use in applications.`)
    : ev.decisions.length || ev.acts.length
      ? `${nm}에서 ${j(list3(ev.decisions.length ? ev.decisions : ev.acts), "을를")} 고르셨${ev.artifacts.length ? `고, 그 결과로 ${j(andJoin(ev.artifacts.slice(0, 3)), "을를")} 남겼다고 답했어요.` : "어요."}`
      : `${nm}에서는 판단 ${s.confirmed.length}가지를 직접 해 봤다고 답했어요. 어떤 과제였는지 체크리스트에서 골라 두면 지원서에 쓸 근거가 됩니다.`;
  const show = en
    ? (ev.artifacts.length
      ? `Show ${qe(ev.artifacts[0])} as your deliverable${cmp0 ? `, along with the comparison (${lc(cmp0)}).` : ". Add one line on what you checked it against, and it is ready for an interview."}`
      : `On your next ${nm} project, keep ${aN(def?.artifacts[0] ?? "result document")}. It becomes the first deliverable you can attach to an application.`)
    : ev.artifacts.length
      ? `${j(ev.artifacts[0], "을를")} 결과물로 내보이면 됩니다.${ev.comparisons.length ? ` ${j(ev.comparisons[0], "과와")} 비교한 내용도 함께 붙이세요.` : " 무엇과 비교해 확인했는지 한 줄 적어 두면 면접에서 바로 쓸 수 있어요."}`
      : `다음 ${d.name(s.code)} 과제에서 ${j(def?.artifacts[0] ?? "결과 문서", "을를")} 남겨 두세요. 서류에 붙일 첫 결과물이 됩니다.`;
  const next = en
    ? (gap?.axis
      ? `${gap.kind === "PARTIAL_EVIDENCE" ? `On your next project, set the criteria for ${qe(lc(an(gap.axis)))} yourself.` : `On your next project, take on ${qe(lc(an(gap.axis)))} yourself.`}${def?.axes?.[gap.axis]?.l2 ? ` For example: ${qe(def.axes[gap.axis].l2)}.` : ""}`
      : "What you have now is enough for one paragraph in an application. Just fill in the result figures and how long it took.")
    : gap?.axis
      ? `${gap.kind === "PARTIAL_EVIDENCE" ? `다음 과제에서는 ${q(d.axisName(gap.axis))}의 기준까지 직접 정해 보세요.` : `다음 과제에서는 ${j(q(d.axisName(gap.axis)), "을를")} 맡아서 해 보세요.`}${def?.axes?.[gap.axis]?.l2 ? ` 예를 들면 ${q(def.axes[gap.axis].l2)} 같은 일이에요.` : ""}`
      : "지금 근거로도 지원서 문단 하나를 쓸 수 있어요. 결과 수치와 기간만 직접 채워 넣으면 됩니다.";
  /* 고른 항목이 없으면 그 영역에서 해 봤다고 답한 판단의 문항 장면(l2)으로 잇는다. 지어낸 장면을 쓰지 않는다 */
  const sc = [...new Set(s.confirmed.map((a) => def?.axes?.[a]?.l2 ?? "").filter(Boolean))];
  const draft = en
    ? [
      pick ? `On one ${nm} project, I ${lc(noDot(pick))}.` : sc[0] ? `On one ${nm} project, I ${lc(noDot(sc[0]))}.` : `On one ${nm} project, I took on ${andEn(s.confirmed.slice(0, 2).map((a) => lc(an(a))))} myself.`,
      !pick && sc[1] && !ev.artifacts[0] && !ev.comparisons[0] ? `I also ${lc(noDot(sc[1]))}.` : "",
      ev.artifacts[0] ? `I documented the result in ${aN(ev.artifacts[0])}${cmp0 ? ` and checked it against ${aN(cmp0)}.` : "."}` : cmp0 ? `I checked the result against ${aN(cmp0)}.` : "",
    ].filter(Boolean).join(" ")
    : [
      /* 세 쪽의 초안이 같은 첫마디로 시작하지 않게 한다 */
      pick ? `${[`${d.name(s.code)} 과제를 하면서`, `${d.name(s.code)} 쪽 일을 맡았을 때`, `${j(d.name(s.code), "을를")} 다룬 과제에서`][k % 3]} ${polite(pick)}` : sc[0] ? `${d.name(s.code)} 과제를 하면서 ${polite(sc[0])}` : `${d.name(s.code)} 과제에서 ${j(andJoin(s.confirmed.slice(0, 2).map(d.axisName)), "을를")} 직접 맡았습니다.`,
      /* 장면 둘에 결과 문장까지 붙으면 ‘…습니다.’ 가 세 번 이어진다. 결과가 있으면 둘째 장면을 뺀다 */
      !pick && sc[1] && !ev.artifacts[0] && !ev.comparisons[0] ? polite(sc[1]) : "",
      ev.artifacts[0] ? `결과는 ${j(ev.artifacts[0], "으로")} 남겼${ev.comparisons[0] ? `고, ${j(ev.comparisons[0], "과와")} 비교해 맞는지 확인했습니다.` : "습니다."}` : ev.comparisons[0] ? `${j(ev.comparisons[0], "과와")} 비교해 맞는지 확인했습니다.` : "",
    ].filter(Boolean).join(" ");
  const question = en
    ? (pick
      ? `You picked ${qe(pick)}. What was that based on, and why not another method?`
      : [`Has a ${nm} project ever turned out differently from what you expected? What did you change?`,
        `What did you compare your ${nm} results with to check they were right?`,
        `Who used the material you made on your ${nm} project, and where?`][k % 3])
    : pick
      ? [`${q(pick)}고 고르셨는데, 그때 무엇을 기준으로 정했고 다른 방법은 왜 쓰지 않았나요?`,
        `${q(pick)}고 하셨는데, 그 일을 하면서 가장 오래 고민한 선택은 무엇이었나요?`,
        `${q(pick)}고 하셨는데, 결과가 처음 예상과 달랐던 부분이 있었나요?`][k % 3]
      : [`${d.name(s.code)} 과제에서 결과가 기대와 달랐던 적이 있나요? 그때 무엇을 바꿨나요?`,
        `${d.name(s.code)} 과제에서 낸 결과가 맞는지 무엇과 비교해 확인했나요?`,
        `${d.name(s.code)} 과제에서 만든 자료는 누가, 어디에 썼나요?`][k % 3];
  const color = SERIES[k % 4];
  /* 영어 문장은 한국어보다 길어 목록을 셋까지만 싣는다. 고른 항목 전부는 03장 ‘체크리스트에서 고른 항목’ 에 있다 */
  const cap = !en ? 5 : ev.decisions.length && ev.acts.length ? 2 : 3;
  const head = en
    /* 영어 제목에는 영역 이름을 다시 적지 않는다(바로 위 머리말에 있다). 영역 이름이 길어 두 줄을 먹는다 */
    ? (ev.decisions.length && ev.artifacts.length ? "You have decisions and deliverables to show here"
      : ev.decisions.length ? "You have decisions to show, and one deliverable would add weight"
        : ev.artifacts.length ? "You have deliverables to show, and one recorded decision would add weight"
          : `You did ${nJ(s.confirmed.length)} yourself here`)
    /* 쪽마다 같은 제목이 서지 않게 순서에 따라 말을 바꾼다. 뜻은 같다 */
    : ev.decisions.length && ev.artifacts.length ? [
      `${d.name(s.code)}에서는 직접 정한 일과 남긴 결과물을 함께 보여 줄 수 있습니다`,
      `${d.name(s.code)}에서 정한 기준과 그 결과물이 함께 남아 있습니다`,
      `${j(d.name(s.code), "은는")} 정한 것과 남긴 것을 짝지어 말할 수 있는 영역입니다`][k % 3]
      : ev.decisions.length ? `${d.name(s.code)}에서 직접 정한 일이 확인됐고, 결과물 하나만 더 남기면 됩니다`
        : ev.artifacts.length ? `${d.name(s.code)}에서 남긴 결과물이 확인됐고, 직접 정한 일 하나만 더 적으면 됩니다`
          : `${d.name(s.code)}에서는 판단 ${s.confirmed.length}가지를 직접 해 봤습니다`;
  /* ‘강점’ 은 강점 영역에만 붙인다. 키워 가는 영역에 ‘강점 3’ 을 달면 앞 장의 분류와 어긋난다 */
  const strong = s.zone === "Z1_EVIDENCE_ESTABLISHED";
  /* 강점 번호와 섞여 ‘강점 1 · 강점 2 · 꺼내 쓸 경험 3’ 이 되지 않게 번호는 강점에만 붙인다 */
  const tag = en ? `Strength ${k + 1}` : strong ? `강점 ${k + 1}` : "꺼내 쓸 경험";
  return P(L(`${tag} · ${d.name(s.code)}`, `Strength ${k + 1} · ${nm}`),
    `<p class="k">${E(tag)} · ${E(d.name(s.code))}</p>` +
    T(E(head), E(story)) +
    `<div class="two r64">
      <div>${ev.decisions.length ? H(L("직접 정한 것", "What you decided"), L("고른 근거", "Items you picked")) + ul(ev.decisions.slice(0, cap).map(E)) : ""}${ev.acts.length ? H(L("해 본 일", "What you did"), L("고른 근거", "Items you picked")) + ul(ev.acts.slice(0, cap).map(E)) : ""}
        ${ev.artifacts.length ? H(L("남긴 것", "What you left behind")) + chips(ev.artifacts.slice(0, 6), "art") : ""}${ev.comparisons.length ? H(L("비교한 대상", "What you compared with")) + chips(ev.comparisons.slice(0, en ? 2 : 5)) : ""}</div>
      <div class="card cen">${radar(AXES.map((a) => an(a)), [{ name: d.name(s.code), levels: d.levels(s.code), color }], { size: en ? 250 : 290, label: 13, ring: false })}${zoneTag(s.zone)}${radarHow([{ name: d.name(s.code), color }], false)}</div>
    </div>` +
    `<div class="g${roles.length ? 3 : 2}">
      ${note(L("보여 줄 것", "What to show"), E(show))}
      ${note(L("한 단계 더", "One step further"), E(next))}
      ${roles.length ? note(L("이어지는 직무", "Related roles"), `${E(roles.join(" · "))}${indLine ? `<br><span class="mut">${E(indLine)}</span>` : ""}`) : ""}
    </div>` +
    note(L("30초 답변 초안", "A 30-second answer"), `<p>“${E(draft)}”</p><p class="mut sm">${L([
      "여기에 그때 정한 기준 하나와 쓰지 않은 방법 하나를 덧붙이면 30초 분량이 돼요.",
      "말할 때는 결과 수치나 걸린 기간을 하나 넣어 보세요. 듣는 사람이 일의 크기를 바로 알 수 있어요.",
      "그 결과를 누가 어디에 썼는지로 끝맺으면 답이 깔끔하게 마무리됩니다."][k % 3], "Add one criterion you set and one method you chose not to use, and you have about 30 seconds.")}</p>`) +
    band(L("면접에서 받을 질문", "A question you may get in an interview"), E(question)));
}

export function commonPage(x: Inputs, d: X): Page {
  const en = isEn();
  const an = axName(d);
  const c = en ? commonEn(x.m.common, x.coreCode) : commonKo(x.m.common, x.coreCode);
  const STAGE: Record<string, string> = { bachelor: "학부", master: "석사", phd: "박사", postdoc: "박사후연구원" };
  const STAGE_EN: Record<string, string> = { bachelor: "undergraduate", master: "master's", phd: "doctoral", postdoc: "postdoctoral" };
  const axes = x.m.common.axes;
  const rows = AXES.map((a) => { const v = axes.find((z) => z.axis === a); return { a, lv: !v ? null : v.owned ? 3 : v.confirmed ? 2 : (v.from.length ? 0 : null) } as { a: Axis; lv: Level | null }; });
  const notYet = L("아직 해 봤다고 나오지 않음", "Not done yourself yet");
  const n3 = rows.filter((r) => r.lv === 3).length;
  const st = STAGE_EN[x.m.stage];
  return P(L("영역을 가리지 않는 판단", "Judgments across every area"),
    T(rows.some((r) => r.lv === 3) ? L(`어떤 과제에서든 ${n3}가지 판단은 직접 정했다고 답했습니다`, `You said you make the call on ${nJ(n3)} in any project`) : L("영역과 관계없이 과제마다 되풀이되는 판단도 따로 물었습니다", "We also asked about judgments that come up in every project, whatever the area"),
      L(`${E(STAGE[x.m.stage] ?? "학업")} 과정의 수업과 팀 과제 상황을 예로 들어 물은 문항이라, 영역별 결과와는 따로 셌어요.`, `These questions used scenes from classes and team projects in your ${st ? `${st} ` : ""}studies, so they are counted apart from your area results.`)) +
    fig(`<div class="wide-art">${hbars(rows.map((r) => ({ label: an(r.a), value: r.lv ?? 0, color: LVC[Math.max(1, r.lv ?? 0)], note: r.lv == null ? notAsked() : r.lv === 3 ? STEP_WORD[3].tag : r.lv === 2 ? STEP_WORD[2].tag : notYet })), { max: 3, width: 680, label: en ? 200 : 130, row: 30, valueText: (b) => String((b as { note?: string }).note ?? "") })}</div>`, howto([
      [L("막대 길이", "Bar length"), L(`그 판단을 어디까지 해 봤는지(끝까지 차면 ${E(STEP_WORD[3].tag)})`, `How far you have gone with that judgment (a full bar means “${E(STEP_WORD[3].tag)}”)`)],
      [LVC[3], E(STEP_WORD[3].tag)], [LVC[2], E(STEP_WORD[2].tag)],
      [L("빈 막대", "Empty bar"), L(`${notYet} 또는 ${notAsked()}(막대 끝 글자로 구분)`, `“${notYet}” or “${notAsked()}” (the label at the end of the bar tells you which)`)],
    ])) +
    (() => {
      const own = c.didOwn.length ? ul(c.didOwn.slice(0, 6).map(E)) : c.owned.length ? E(c.owned.join(", ")) : "";
      const conf = c.didConfirm.length ? ul(c.didConfirm.slice(0, 6).map(E)) : c.confirmed.length ? E(c.confirmed.join(", ")) : "";
      const ns = [own ? note(L("직접 정했다고 답한 판단", "Judgments you said you made the call on"), own) : "", conf ? note(L("해 봤다고 답한 판단", "Judgments you said you have done"), conf, true) : ""].filter(Boolean);
      return ns.length ? `<div class="two">${ns.join("")}</div>` : "";
    })() +
    band(L("쓰는 법", "How to use this"), L("지원서의 ‘일하는 방식’ 문항에 이 판단을 쓰세요. 영역 근거와 같은 경험으로 쓰면 두 문항이 서로 뒷받침합니다.", "Use these judgments when an application asks how you work. If you describe them with the same scenes as your area evidence, the two answers back each other up.")));
}

export function qualityPage(x: Inputs, d: X): Page {
  const en = isEn();
  const f = x.m.response_quality.flag;
  const said: Record<string, string> = en ? {
    OK: "Your answers were consistent, so you can read the results as they are",
    REVIEW: "A few answers did not line up, so the results only include what two answers pointed to together",
    LOW_VARIANCE: "Your answers leaned one way, so the differences between areas came out small",
    INCONSISTENT: "We asked about the same experience twice and got different answers, so we went with the lower one",
  } : {
    OK: "답이 한쪽으로 몰리지 않고 앞뒤도 맞아서, 결과를 그대로 읽어도 됩니다",
    REVIEW: "앞뒤가 조금 다른 답이 있어서, 두 답이 함께 가리키는 내용만 결과에 담았습니다",
    LOW_VARIANCE: "답이 한쪽으로 몰려 영역 사이의 차이가 작게 나왔습니다",
    INCONSISTENT: "같은 경험을 두 번 물었는데 답이 달라, 낮은 쪽으로 읽었습니다",
  };
  const asked = x.m.domains.filter((z) => d.asked(z));
  const dist = ([3, 2, 1, 0] as const).map((k) => ({ label: STEP_WORD[k].tag, value: asked.reduce((a, z) => a + d.levels(z.code).filter((v) => v === k).length, 0), color: k ? LVC[k] : NONE_BAR }));
  const max = Math.max(4, ...dist.map((v) => v.value));
  const total = dist.reduce((a, v) => a + v.value, 0);
  const qdek = en
    ? E(QUALITY_EN[f as keyof typeof QUALITY_EN] || "") || "We checked for lopsided answers and for mismatches on repeated questions."
    : E(QUALITY_KO[f as keyof typeof QUALITY_KO] || "") || "검사는 모든 답을 같은 쪽으로 고르지 않았는지, 같은 경험을 두 번 물었을 때 답이 맞는지를 함께 봤어요.";
  const flow: [string, string][] = en
    ? [["Answer", "You said you set the criteria yourself"], ["Scene", "You picked that scene in the checklist"], ["One more piece", "You also picked a deliverable or a comparison"], ["Level", `Only then did we count it as “${STEP_WORD[3].tag}”`]]
    : [["답", "‘기준을 내가 정했다’고 답했어요"], ["고른 항목", "체크리스트에서 그 일을 골랐어요"], ["근거 하나 더", "남긴 결과물이나 비교한 대상까지 골라 근거가 둘 이상 모였어요"], ["단계", `이렇게 모였을 때만 ‘${STEP_WORD[3].tag}’으로 셌어요`]];
  return P(L("이 결과를 얼마나 믿어도 될까", "How far you can trust this result"),
    T(E(said[f] ?? said.REVIEW), qdek) +
    `<div class="kpis">
      <div class="kpi"><p>${L("응답 점검", "Answer check")}</p><b>${f === "OK" ? L("이상 없음", "No issues") : L("다시 볼 곳 있음", "Some to recheck")}</b><span>${L("한쪽으로 몰린 답 · 앞뒤가 다른 답", "Lopsided or mismatched answers")}</span></div>
      <div class="kpi"><p>${L("기준까지 직접 정한 판단", "Calls you made")}</p><b>${d.counts.owned}${L("<small>개</small>", "")}</b><span>${L("체크리스트 근거가 둘 이상인 것만 셌어요", "Two or more pieces of evidence")}</span></div>
      <div class="kpi"><p>${L("판단까지 물은 영역", "Areas asked in depth")}</p><b>${asked.length}${L("<small>곳</small>", "")}</b><span>${L(`${d.counts.domains}가지 ${E(x.domainWord)} 가운데`, `Out of ${d.counts.domains} areas`)}</span></div>
    </div>` +
    H(L(`‘${STEP_WORD[3].tag}’은 이렇게 셌어요`, `How we counted “${STEP_WORD[3].tag}”`), L("답 하나만으로는 올리지 않아요", "One answer alone is not enough")) +
    `<div class="flow5 f4">${flow.map(([h, b]) => `<div class="f5"><b>${h}</b><p>${E(b)}</p></div>`).join("")}</div>` +
    (total ? H(L(`판단에 답한 ${total}칸은 이렇게 나뉘었어요`, `How your ${total} answered cells break down`), L(`물은 영역 ${asked.length}곳 × 판단 ${AXES.length}가지`, `${asked.length} areas asked × ${AXES.length} judgments`)) +
      fig(hbars(dist, { max, width: 640, label: 150, row: en ? 26 : 30, valueText: (b) => L(`${b.value}칸`, String(b.value)) }), howto([[L("막대 길이", "Bar length"), L("그 단계로 나온 칸의 수", "Number of cells at that level")], ...dist.map((v) => [v.color, E(v.label)] as [string, string])],
        L("칸 하나는 한 영역에서 한 판단에 답한 것이에요. 위쪽 막대가 길수록 직접 정한 일이 많다는 뜻입니다.", "One cell is one judgment in one area. The longer the top bar, the more calls you made."))) : "") +
    (asked.length ? H(L("물은 영역마다 직접 해 본 판단", "Judgments you did yourself, area by area"), L(`판단 ${AXES.length}가지 가운데 몇 가지인지`, `How many of the ${AXES.length} judgments`)) +
      `<table class="tb tb-xs"><thead><tr><th>${L("영역", "Area")}</th><th>${L("지금 상태", "Status")}</th><th>${L("직접 해 본 판단", "Myself")}</th><th>${L("기준까지 정한 판단", "Decided")}</th><th>${L("다음에 맡아 볼 판단", "Take on next")}</th></tr></thead><tbody>${asked.map((z) => {
        const lv = d.levels(z.code);
        const next = AXES.filter((_, i) => lv[i] !== null && (lv[i] ?? 0) <= 1).map(axName(d)).slice(0, 2);
        return `<tr><td><b>${E(d.name(z.code))}</b></td><td>${zoneTag(z.zone)}</td><td>${lv.filter((v) => (v ?? 0) >= 2).length}${L("가지", "")}</td><td>${lv.filter((v) => v === 3).length}${L("가지", "")}</td><td class="mut">${E(next.join(", ") || L("기준까지 정해 보기", "Set the criteria yourself"))}</td></tr>`;
      }).join("")}</tbody></table>` : "") +
    band(L("이렇게 쓰세요", "How to use this"), f === "OK" ? L("앞 장의 결과를 그대로 읽고, 다음에 맡아 볼 판단부터 과제에서 직접 해 보세요.", "Read the results as they are, and start your next project with the judgment to take on next.") : L("다시 볼 곳이 있는 영역은 결과를 한 번 더 확인하고, 더 끌리는 쪽과 덜 끌리는 쪽을 나눠 답하면 다음 검사에서 또렷해집니다.", "Look again at the areas flagged for a recheck. Next time, separate what draws you from what doesn't when you answer, and the results will be clearer.")));
}

export function ch2Pages(x: Inputs, d: X): Page[] {
  const out = [radarBig(x, d)];
  /* 영역별 작은 그래프 쪽은 두지 않는다. 같은 값이 겹친 그래프와 지도 쪽에 있다 */
  out.push(heatPage(x, d), profileRead(x, d));
  d.strengths.forEach((_, k) => out.push(strengthPage(x, d, k)));
  out.push(commonPage(x, d), qualityPage(x, d));
  return out;
}
