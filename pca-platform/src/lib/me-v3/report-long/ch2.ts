/**
 * 02 판단 프로파일.
 *
 * 단계 이름은 `STEP_WORD`(derive.ts)와 `LEVEL_KO`(charts.ts)에서만 읽는다. 쪽 안에서
 * 이름을 다시 적지 않는다. 그래프마다 바로 아래에 읽는 법(`howto`)을 붙이고, 넘기는 색은
 * 그래프가 실제로 칠하는 값이다.
 */
import type { Axis } from "../scoring/types";
import { QUALITY_KO, commonKo } from "../result/text.ko";
import type { Inputs, Level } from "./types";
import { AXES, STEP_WORD, type X } from "./derive";
import { C, LEVEL_KO, hbars, heat, radar } from "./charts";
import { E, H, LVC, PAL, T, band, chips, howto, note, pip, ul, zoneTag, type Page } from "./kit";
import { andJoin, askNoun, j, list3, polite, q } from "./text";

const P = (title: string, body: string): Page => ({ part: "02", partName: "판단 프로파일", title, body });
const SERIES = [PAL.blue, PAL.coral, PAL.teal, PAL.violet];
/** 지도 칸과 분포 막대에서 ‘해 본 적 없음’을 칠하는 색. LVC[0] 은 빈 막대 바탕과 거의 같아 막대에서는 따로 둔다 */
const NONE_BAR = "#b8bfcc";
/** 지도 칸 안에 들어가는 짧은 글자. 칸 폭이 여섯 글자 남짓이라 단계 이름을 줄여 쓰고, 읽는 법에 온 이름을 붙인다 */
const CELL_WORD = ["없음", "시킨 대로", "직접", "기준 정함"] as const;
const NOT_ASKED = "#f6f7f9";

/** 그래프와 읽는 법을 한 덩이로 묶는다. 쪽 모으기가 둘을 다른 쪽으로 갈라 놓지 않게 한다 */
const fig = (graph: string, how: string) => `<div style="display:flex;flex-direction:column;gap:2.4mm">${graph}${how}</div>`;

function seriesOf(d: X) {
  return d.radarDoms.map((v, i) => ({ code: v.code, name: d.name(v.code), levels: d.levels(v.code), color: SERIES[i] }));
}

/** 방사형 그래프 읽는 법. 고리 이름은 그래프에 적힌 LEVEL_KO 와 같은 값이다 */
function radarHow(series: { name: string; color: string }[], rings: boolean): string {
  return howto([
    ["가운데", `${LEVEL_KO[0]}`],
    ...(rings ? ([["안쪽 고리", LEVEL_KO[1]], ["가운데 고리", LEVEL_KO[2]]] as [string, string][]) : []),
    ["바깥 고리", LEVEL_KO[3]],
    ...series.map((s) => [s.color, `${E(s.name)}의 선`] as [string, string]),
    ["점 없는 꼭짓점", "이번에 묻지 않은 판단"],
  ], rings ? "꼭짓점 여덟 개가 판단 하나씩이고, 선이 바깥으로 나갈수록 그 판단을 깊이 해 봤다는 뜻이에요." : undefined);
}

export function radarBig(x: Inputs, d: X): Page {
  const s = seriesOf(d);
  const labels = AXES.map((a) => d.axisName(a));
  const own = s.map((v) => ({ v, n: v.levels.filter((l) => l === 3).length })).sort((a, b) => b.n - a.n);
  const title = !s.length ? "이번 검사는 관심과 해 본 횟수까지 물었습니다"
    : own[0].n && (s.length === 1 || own[0].n > own[1].n) ? `${E(own[0].v.name)}에서 기준까지 직접 정한 판단이 가장 많습니다`
      : `자세히 물은 ${s.length}개 영역의 판단을 한 그래프에 겹쳤습니다`;
  const dek = s.length
    ? `일할 때 내리는 여덟 가지 판단(${E(labels.join(", "))})을 영역마다 한 선으로 그렸습니다. 영역마다 모양이 다르면 영역에 따라 맡아 온 일이 달랐다는 뜻이에요.`
    : undefined;
  return P("판단 프로파일 방사형 그래프",
    T(title, dek) +
    (s.length ? `${fig(`<div class="wide-art">${radar(labels, s, { size: 540 })}</div>`, radarHow(s, true))}
      <div class="g${s.length >= 3 ? 3 : 2}">${s.slice(0, 3).map((v) => {
        const top = AXES.filter((_, k) => v.levels[k] === 3).map(d.axisName);
        const low = AXES.filter((_, k) => v.levels[k] !== null && (v.levels[k] ?? 0) <= 1).map(d.axisName);
        const did = v.levels.filter((l) => (l ?? 0) >= 2).length;
        const body = [top.length ? `<p>${E(STEP_WORD[3].tag)}: ${E(top.join(", "))}</p>` : "", low.length ? `<p class="mut">다음에 직접 맡아 볼 판단: ${E(low.join(", "))}</p>` : "", !top.length && !low.length ? `<p>물은 판단 가운데 ${did}가지를 직접 해 봤어요.</p>` : ""].join("");
        return `<div class="note" style="box-shadow:inset 3px 0 0 ${v.color}"><b>${E(v.name)}</b>${body}</div>`;
      }).join("")}</div>` : (() => {
        const hi = x.m.domains.filter((z) => z.interest === "HIGH").map((z) => d.name(z.code)).slice(0, 2);
        return `<div class="na-box"><b>판단 단계까지 보려면</b>${hi.length ? `${E(andJoin(hi))}처럼 관심이 높은 영역에서` : "관심 가는 영역에서"} 짧은 과제를 한 번 해 본 뒤 다시 검사해 보세요. 그때 이 그래프가 그려집니다.</div>`;
      })()));
}

export function heatPage(x: Inputs, d: X): Page {
  const rows = x.m.domains.map((z) => d.name(z.code));
  const cell = (i: number, jj: number) => {
    const lv = d.level(x.m.domains[i].code, AXES[jj]);
    if (lv === null) return { fill: NOT_ASKED, text: "", ink: C.ink3 };
    return { fill: LVC[lv], text: CELL_WORD[lv], ink: lv >= 2 ? "#fff" : C.ink2 };
  };
  const cells = x.m.domains.flatMap((z) => d.levels(z.code)).filter((v): v is Level => v !== null);
  const hi = cells.filter((v) => v >= 2).length;
  return P(`${x.domainWord} × 판단 지도`,
    T(cells.length ? `물은 ${cells.length}칸 가운데 ${hi}칸은 직접 해 봤거나 기준까지 정했습니다` : `${d.counts.domains}가지 ${E(x.domainWord)}과 여덟 가지 판단을 한 장에 놓았습니다`,
      "칸 하나가 한 영역에서 한 판단을 어디까지 해 봤는지 보여 줘요. 판단까지 자세히 물은 영역에만 색이 들어갑니다.") +
    fig(`<div class="wide-art">${heat(rows, AXES.map((a) => d.axisName(a)), cell, { width: 700, label: 150, head: 54, row: 30, colWrap: 6 })}</div>`, howto([
      ["가로줄", `${E(x.domainWord)} 하나`], ["세로줄", "판단 하나"],
      ...([0, 1, 2, 3] as const).map((k) => [LVC[k], `${E(STEP_WORD[k].tag)}${CELL_WORD[k] !== STEP_WORD[k].tag ? ` (칸 글자 ‘${CELL_WORD[k]}’)` : ""}`] as [string, string]),
      [NOT_ASKED, "빈 칸: 이번에 판단까지 묻지 않은 영역"],
    ])) +
    (() => {
      const askedD = x.m.domains.filter((z) => d.asked(z));
      const rowBest = askedD.map((z) => ({ z, n: d.levels(z.code).filter((v) => v != null && v >= 2).length })).sort((a, b) => b.n - a.n)[0];
      const colLow = AXES.map((a) => ({ a, n: askedD.filter((z) => (d.level(z.code, a) ?? 0) >= 2).length })).sort((p, q0) => p.n - q0.n)[0];
      if (!rowBest || !colLow) return "";
      return `<div class="two">
        ${note("가로로 읽기", `한 영역 안에서 어느 판단까지 해 봤는지 봅니다. ${E(j(d.name(rowBest.z.code), "은는"))} 여덟 칸 가운데 ${rowBest.n}칸을 직접 해 봤거나 기준까지 정했어요.`)}
        ${note("세로로 읽기", `한 판단을 몇 영역에서 해 봤는지 봅니다. ${E(j(q(d.axisName(colLow.a)), "은는"))} 물은 ${askedD.length}개 영역 가운데 ${colLow.n}곳에서 직접 해 봤어요. ${colLow.n < askedD.length ? "다음 과제에서는 이 판단을 직접 맡아 보세요." : "다음 과제에서는 이 판단의 기준까지 직접 정해 보세요."}`)}
      </div>`;
    })());
}

export function profileRead(x: Inputs, d: X): Page {
  const b3 = d.best.filter((b) => b.level === 3), b2 = d.best.filter((b) => b.level === 2);
  const low = d.best.filter((b) => b.level !== null && b.level <= 1), un = d.best.filter((b) => b.level === null);
  const nm = (bs: typeof d.best) => (bs.length >= 5 ? `판단 ${bs.length}가지` : andJoin(bs.map((b) => d.axisName(b.axis))));
  const subj = (bs: typeof d.best) => (bs.length === AXES.length ? "모든 판단을" : j(nm(bs), "은는"));
  const where = (bs: typeof d.best) => [...new Set(bs.flatMap((b) => b.where))].map(d.name);
  const high = x.m.domains.filter((z) => z.interest === "HIGH" && !d.asked(z)).map((z) => d.name(z.code));
  const paras: [string, string][] = [];
  if (b3.length) paras.push(["강한 쪽", `${subj(b3)} 기준까지 직접 정했다고 답했고, 체크리스트에서도 그 장면을 고르셨어요. ${andJoin(where(b3))}에서 나온 판단이라 지원서에 ‘제가 정한 것’으로 앞에 내세울 만합니다.`]);
  if (b2.length) paras.push(["다음 단계", `${subj(b2)} 직접 맡아 해 봤다고 답했어요. 다음 과제에서 그 판단의 기준까지 직접 정하고 그 장면을 체크리스트에서 하나 더 고르면 ‘${STEP_WORD[3].tag}’ 단계로 올라갑니다.`]);
  if (low.length) paras.push(["더 해 볼 쪽", `${subj(low)} 물은 영역에서 아직 직접 해 본 단계까지 나오지 않았어요. 정말 해 본 적이 없을 수도 있고 검사하면서 그 장면이 떠오르지 않았을 수도 있으니, 수업이나 팀 과제에서 맡았던 때가 있었는지 한 번 더 떠올려 보세요.`]);
  if (un.length) paras.push(["묻지 않은 쪽", `${subj(un)} 이번 검사에서 묻지 않았어요.`]);
  if (high.length) paras.push(["관심", `${andJoin(high.slice(0, 4))}에 관심이 높다고 답했는데, 이번에는 판단 단계까지 묻지 않았어요. 그중 한 영역에서 짧은 과제를 해 보면 다음 결과에 근거로 들어갑니다.`]);
  if (!paras.length) paras.push(["지금", "이번 검사에서는 판단 단계를 물은 영역이 없어요. 관심 가는 영역에서 짧은 과제를 한 번 해 본 뒤 다시 검사해 보세요."]);
  const sceneOf = (b: (typeof d.best)[number]) => { const td = b.where[0] ?? d.radarDoms[0]?.code; return td ? d.def(td)?.axes?.[b.axis]?.l2 ?? "" : ""; };
  const say = (b: (typeof d.best)[number]) => {
    const sc = sceneOf(b);
    if (sc && b.level === 3) return `“${polite(sc)} 그 기준도 제가 정했습니다”`;
    if (sc && b.level === 2) return `“${polite(sc)}”`;
    if (sc && b.level === 1) return `“${polite(sc)} 조건은 다른 사람이 정했습니다”`;
    return b.level === 3 ? "“제가 기준을 정했고, 그 결과가 쓰였습니다”" : b.level === 2 ? "“주어진 조건 안에서 제가 직접 해 봤습니다”" : b.level === 1 ? "“다른 사람이 정한 대로 맡아 해 봤습니다”" : "“아직 해 보지 않았습니다”";
  };
  const sayRows = d.best.filter((b) => b.level !== null);
  return P("프로파일 해석",
    T(b3.length ? `기준까지 직접 정한 판단이 ${b3.length}가지${b2.length ? `, 직접 해 본 판단이 ${b2.length}가지` : ""}입니다` : b2.length === AXES.length ? "물은 판단을 모두 직접 해 봤습니다" : b2.length ? `직접 해 본 판단이 ${b2.length}가지입니다` : "직접 해 본 판단은 아직 적습니다") +
    `<div class="prose">${paras.map(([h, t]) => `<div class="pr"><span class="pr-n">${E(h)}</span><p>${E(t)}</p></div>`).join("")}</div>` +
    (sayRows.length ? H("판단마다 이렇게 말할 수 있습니다", "면접에서 그대로 꺼낼 수 있는 말") +
    `<table class="tb tb-xs"><thead><tr><th>판단</th><th>가장 깊은 단계</th><th>나온 영역</th><th>이렇게 말하기</th></tr></thead><tbody>${sayRows.map((b) => `<tr><td><b>${E(d.axisName(b.axis))}</b></td><td>${pip(b.level)}</td><td>${E(b.where.map(d.name).join(", "))}</td><td class="mut">${E(say(b))}</td></tr>`).join("")}</tbody></table>` : ""));
}

export function strengthPage(x: Inputs, d: X, k: number): Page {
  const s = d.strengths[k];
  const ev = d.evidenceOf(s);
  const def = d.def(s.code);
  const gap = x.m.gaps.find((g) => g.domain === s.code);
  const roles = d.rolesOf(s.code).slice(0, 4).map((r) => `${d.roleName(r.role)}(${r.strength})`);
  const indRow = d.goalInd ? x.rel.td_industry.find((r) => r.td === s.code && r.industry === d.goalInd!.code && r.strength !== "드묾") : null;
  const indLine = indRow?.dimensions?.[0] ? `${d.goalInd!.name_ko}에서는 ${askNoun(indRow.dimensions[0])}를 봅니다.` : null;
  const pick = ev.decisions[0] ?? ev.acts[0];
  const story = ev.decisions.length || ev.acts.length
    ? `${d.name(s.code)}에서 ${j(list3(ev.decisions.length ? ev.decisions : ev.acts), "을를")} 고르셨${ev.artifacts.length ? `고, 그 결과로 ${j(andJoin(ev.artifacts.slice(0, 3)), "을를")} 남겼다고 답했어요.` : "어요."}`
    : `${d.name(s.code)}에서는 판단 ${s.confirmed.length}가지를 직접 해 봤다고 답했어요. 어떤 과제였는지 체크리스트에서 골라 두면 지원서에 쓸 근거가 됩니다.`;
  const show = ev.artifacts.length
    ? `${j(ev.artifacts[0], "을를")} 결과물로 내보이면 됩니다.${ev.comparisons.length ? ` ${j(ev.comparisons[0], "과와")} 비교한 내용도 함께 붙이세요.` : " 무엇과 비교해 확인했는지 한 줄 적어 두면 면접에서 바로 쓸 수 있어요."}`
    : `다음 ${d.name(s.code)} 과제에서 ${j(def?.artifacts[0] ?? "결과 문서", "을를")} 남겨 두세요. 서류에 붙일 첫 결과물이 됩니다.`;
  const next = gap?.axis
    ? `${gap.kind === "PARTIAL_EVIDENCE" ? `다음 과제에서는 ${q(d.axisName(gap.axis))}의 기준까지 직접 정해 보세요.` : `다음 과제에서는 ${j(q(d.axisName(gap.axis)), "을를")} 맡아서 해 보세요.`}${def?.axes?.[gap.axis]?.l2 ? ` 예를 들면 ${q(def.axes[gap.axis].l2)} 같은 일이에요.` : ""}`
    : "지금 근거로도 지원서 문단 하나를 쓸 수 있어요. 결과 수치와 기간만 직접 채워 넣으면 됩니다.";
  /* 고른 항목이 없으면 그 영역에서 해 봤다고 답한 판단의 문항 장면(l2)으로 잇는다. 지어낸 장면을 쓰지 않는다 */
  const sc = [...new Set(s.confirmed.map((a) => def?.axes?.[a]?.l2 ?? "").filter(Boolean))];
  const draft = [
    pick ? `${d.name(s.code)} 과제를 하면서 ${polite(pick)}` : sc[0] ? `${d.name(s.code)} 과제를 하면서 ${polite(sc[0])}` : `${d.name(s.code)} 과제에서 ${j(andJoin(s.confirmed.slice(0, 2).map(d.axisName)), "을를")} 직접 맡았습니다.`,
    /* 장면 둘에 결과 문장까지 붙으면 ‘…습니다.’ 가 세 번 이어진다. 결과가 있으면 둘째 장면을 뺀다 */
    !pick && sc[1] && !ev.artifacts[0] && !ev.comparisons[0] ? polite(sc[1]) : "",
    ev.artifacts[0] ? `결과는 ${j(ev.artifacts[0], "으로")} 남겼${ev.comparisons[0] ? `고, ${j(ev.comparisons[0], "과와")} 비교해 맞는지 확인했습니다.` : "습니다."}` : ev.comparisons[0] ? `${j(ev.comparisons[0], "과와")} 비교해 맞는지 확인했습니다.` : "",
  ].filter(Boolean).join(" ");
  const question = pick
    ? `${q(pick)}고 고르셨는데, 그때 무엇을 기준으로 정했고 다른 방법은 왜 쓰지 않았나요?`
    : [`${d.name(s.code)} 과제에서 결과가 기대와 달랐던 적이 있나요? 그때 무엇을 바꿨나요?`,
      `${d.name(s.code)} 과제에서 낸 결과가 맞는지 무엇과 비교해 확인했나요?`,
      `${d.name(s.code)} 과제에서 만든 자료는 누가, 어디에 썼나요?`][k % 3];
  const color = SERIES[k % 4];
  return P(`강점 ${k + 1} · ${d.name(s.code)}`,
    `<p class="k">강점 ${k + 1} · ${E(d.name(s.code))}</p>` +
    T(E(ev.decisions.length && ev.artifacts.length ? `${j(d.name(s.code), "은는")} 직접 정한 일과 남긴 결과물을 함께 내세울 수 있습니다`
      : ev.decisions.length ? `${j(d.name(s.code), "은는")} 직접 정한 일을 내세울 수 있고, 결과물 하나가 더 있으면 단단해집니다`
        : ev.artifacts.length ? `${j(d.name(s.code), "은는")} 남긴 결과물이 있고, 직접 정한 일을 하나 더 적으면 단단해집니다`
          : `${d.name(s.code)}에서는 판단 ${s.confirmed.length}가지를 직접 해 봤습니다`), E(story)) +
    `<div class="two r64">
      <div>${ev.decisions.length ? H("직접 정한 것", "고른 근거") + ul(ev.decisions.slice(0, 5).map(E)) : ""}${ev.acts.length ? H("해 본 일", "고른 근거") + ul(ev.acts.slice(0, 5).map(E)) : ""}
        ${ev.artifacts.length ? H("남긴 것") + chips(ev.artifacts.slice(0, 6), "art") : ""}${ev.comparisons.length ? H("비교한 대상") + chips(ev.comparisons.slice(0, 5)) : ""}</div>
      <div class="card cen">${radar(AXES.map((a) => d.axisName(a)), [{ name: d.name(s.code), levels: d.levels(s.code), color }], { size: 290, label: 13, ring: false })}${zoneTag(s.zone)}${radarHow([{ name: d.name(s.code), color }], false)}</div>
    </div>` +
    `<div class="g${roles.length ? 3 : 2}">
      ${note("보여 줄 것", E(show))}
      ${note("한 단계 더", E(next))}
      ${roles.length ? note("이어지는 직무", `${E(roles.join(" · "))}${indLine ? `<br><span class="mut">${E(indLine)}</span>` : ""}`) : ""}
    </div>` +
    note("30초 답변 초안", `<p>“${E(draft)}”</p><p class="mut sm">여기에 그때 정한 기준 하나와 쓰지 않은 방법 하나를 덧붙여 말하면 30초 분량이 돼요.</p>`) +
    band("면접에서 받을 질문", E(question)));
}

export function commonPage(x: Inputs, d: X): Page {
  const c = commonKo(x.m.common, x.coreCode);
  const STAGE: Record<string, string> = { bachelor: "학부", master: "석사", phd: "박사", postdoc: "박사후연구원" };
  const axes = x.m.common.axes;
  const rows = AXES.map((a) => { const v = axes.find((z) => z.axis === a); return { a, lv: !v ? null : v.owned ? 3 : v.confirmed ? 2 : (v.from.length ? 0 : null) } as { a: Axis; lv: Level | null }; });
  const notYet = "아직 해 봤다고 나오지 않음";
  return P("영역을 가리지 않는 판단",
    T(rows.some((r) => r.lv === 3) ? `어떤 과제에서든 ${rows.filter((r) => r.lv === 3).length}가지 판단은 직접 정했다고 답했습니다` : "영역과 관계없이 과제마다 되풀이되는 판단도 따로 물었습니다", `${E(STAGE[x.m.stage] ?? "학업")} 과정의 수업과 팀 과제 장면으로 물은 문항이라, 영역별 결과와는 따로 셌어요.`) +
    fig(`<div class="wide-art">${hbars(rows.map((r) => ({ label: d.axisName(r.a), value: r.lv ?? 0, color: LVC[Math.max(1, r.lv ?? 0)], note: r.lv == null ? NOT_ASKED : r.lv === 3 ? STEP_WORD[3].tag : r.lv === 2 ? STEP_WORD[2].tag : notYet })), { max: 3, width: 680, label: 130, row: 30, valueText: (b) => String((b as { note?: string }).note ?? "") })}</div>`, howto([
      ["막대 길이", `그 판단을 어디까지 해 봤는지(끝까지 차면 ${E(STEP_WORD[3].tag)})`],
      [LVC[3], E(STEP_WORD[3].tag)], [LVC[2], E(STEP_WORD[2].tag)],
      ["빈 막대", `${notYet} 또는 ${NOT_ASKED}(막대 끝 글자로 구분)`],
    ])) +
    (() => {
      const own = c.didOwn.length ? ul(c.didOwn.slice(0, 6).map(E)) : c.owned.length ? E(c.owned.join(", ")) : "";
      const conf = c.didConfirm.length ? ul(c.didConfirm.slice(0, 6).map(E)) : c.confirmed.length ? E(c.confirmed.join(", ")) : "";
      const ns = [own ? note("직접 정했다고 답한 판단", own) : "", conf ? note("해 봤다고 답한 판단", conf, true) : ""].filter(Boolean);
      return ns.length ? `<div class="two">${ns.join("")}</div>` : "";
    })() +
    band("쓰는 법", "지원서의 ‘일하는 방식’ 문항에 이 판단을 쓰세요. 영역 근거와 같은 장면으로 쓰면 두 문항이 서로 뒷받침합니다."));
}

export function qualityPage(x: Inputs, d: X): Page {
  const f = x.m.response_quality.flag;
  const said: Record<string, string> = {
    OK: "답이 한쪽으로 몰리지 않고 앞뒤도 맞아서, 결과를 그대로 읽어도 됩니다",
    REVIEW: "앞뒤가 조금 다른 답이 있어서, 두 답이 함께 가리키는 내용만 결과에 담았습니다",
    LOW_VARIANCE: "답이 한쪽으로 몰려 영역 사이의 차이가 작게 나왔습니다",
    INCONSISTENT: "같은 경험을 두 번 물었는데 답이 달라, 낮은 쪽으로 읽었습니다",
  };
  const asked = x.m.domains.filter((z) => d.asked(z));
  const dist = ([3, 2, 1, 0] as const).map((k) => ({ label: STEP_WORD[k].tag, value: asked.reduce((a, z) => a + d.levels(z.code).filter((v) => v === k).length, 0), color: k ? LVC[k] : NONE_BAR }));
  const max = Math.max(4, ...dist.map((v) => v.value));
  const total = dist.reduce((a, v) => a + v.value, 0);
  return P("이 결과를 얼마나 믿어도 될까",
    T(E(said[f] ?? said.REVIEW), E(QUALITY_KO[f as keyof typeof QUALITY_KO] || "") || "검사는 모든 답을 같은 쪽으로 고르지 않았는지, 같은 경험을 두 번 물었을 때 답이 맞는지를 함께 봤어요.") +
    `<div class="kpis">
      <div class="kpi"><p>응답 점검</p><b>${f === "OK" ? "이상 없음" : "다시 볼 곳 있음"}</b><span>한쪽으로 몰린 답 · 앞뒤가 다른 답</span></div>
      <div class="kpi"><p>기준까지 직접 정한 판단</p><b>${d.counts.owned}<small>개</small></b><span>체크리스트 근거가 둘 이상인 것만 셌어요</span></div>
      <div class="kpi"><p>판단까지 물은 영역</p><b>${asked.length}<small>곳</small></b><span>${d.counts.domains}가지 ${E(x.domainWord)} 가운데</span></div>
    </div>` +
    H(`‘${STEP_WORD[3].tag}’은 이렇게 셌어요`, "답 하나만으로는 올리지 않아요") +
    `<div class="flow5 f4">${[["답", "‘기준을 내가 정했다’고 답했어요"], ["고른 장면", "체크리스트에서 그 장면을 골랐어요"], ["근거 하나 더", "남긴 결과물이나 비교한 대상까지 골라 근거가 둘 이상 모였어요"], ["단계", `이렇게 모였을 때만 ‘${STEP_WORD[3].tag}’으로 셌어요`]].map(([h, b]) => `<div class="f5"><b>${h}</b><p>${E(b)}</p></div>`).join("")}</div>` +
    (total ? H(`판단에 답한 ${total}칸은 이렇게 나뉘었어요`, `물은 영역 ${asked.length}곳 × 판단 ${AXES.length}가지`) +
      fig(hbars(dist, { max, width: 640, label: 150, row: 30, valueText: (b) => `${b.value}칸` }), howto([["막대 길이", "그 단계로 나온 칸의 수"], ...dist.map((v) => [v.color, E(v.label)] as [string, string])],
        "칸 하나는 한 영역에서 한 판단에 답한 것이에요. 위쪽 막대가 길수록 직접 정한 일이 많다는 뜻입니다.")) : "") +
    (asked.length ? H("물은 영역마다 직접 해 본 판단", `판단 ${AXES.length}가지 가운데 몇 가지인지`) +
      `<table class="tb tb-xs"><thead><tr><th>영역</th><th>지금 상태</th><th>직접 해 본 판단</th><th>기준까지 정한 판단</th><th>다음에 맡아 볼 판단</th></tr></thead><tbody>${asked.map((z) => {
        const lv = d.levels(z.code);
        const next = AXES.filter((_, i) => lv[i] !== null && (lv[i] ?? 0) <= 1).map(d.axisName).slice(0, 2);
        return `<tr><td><b>${E(d.name(z.code))}</b></td><td>${zoneTag(z.zone)}</td><td>${lv.filter((v) => (v ?? 0) >= 2).length}가지</td><td>${lv.filter((v) => v === 3).length}가지</td><td class="mut">${E(next.join(", ") || "기준까지 정해 보기")}</td></tr>`;
      }).join("")}</tbody></table>` : "") +
    band("이렇게 쓰세요", f === "OK" ? "앞 장의 결과를 그대로 읽고, 다음에 맡아 볼 판단부터 과제에서 직접 해 보세요." : "다시 볼 곳이 있는 영역은 결과를 한 번 더 확인하고, 더 끌리는 쪽과 덜 끌리는 쪽을 나눠 답하면 다음 검사에서 또렷해집니다."));
}

export function ch2Pages(x: Inputs, d: X): Page[] {
  const out = [radarBig(x, d)];
  /* 영역별 작은 그래프 쪽은 두지 않는다. 같은 값이 겹친 그래프와 지도 쪽에 있다 */
  out.push(heatPage(x, d), profileRead(x, d));
  d.strengths.forEach((_, k) => out.push(strengthPage(x, d, k)));
  out.push(commonPage(x, d), qualityPage(x, d));
  return out;
}
