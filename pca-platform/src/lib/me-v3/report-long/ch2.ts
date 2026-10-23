/**
 * 02 판단 프로파일.
 */
import type { Axis } from "../scoring/types";
import { commonKo } from "../result/text.ko";
import type { Inputs, Level } from "./types";
import { AXES, STEP_WORD, type X } from "./derive";
import { C, hbars, heat, radar } from "./charts";
import { E, H, LVC, PAL, T, band, chips, lines, note, pip, ul, zoneTag, type Page } from "./kit";
import { andJoin, askNoun, j, list3, q } from "./text";

const P = (title: string, body: string): Page => ({ part: "02", partName: "판단 프로파일", title, body });
const SERIES = [PAL.blue, PAL.coral, PAL.teal, PAL.violet];

function seriesOf(d: X) {
  return d.radarDoms.map((v, i) => ({ code: v.code, name: d.name(v.code), levels: d.levels(v.code), color: SERIES[i] }));
}

export function radarBig(x: Inputs, d: X): Page {
  const s = seriesOf(d);
  const labels = AXES.map((a) => d.axisName(a));
  return P("판단 프로파일 방사형 그래프",
    T(s.length ? `깊게 물은 ${s.length}개 영역의 판단 여덟 가지를 한 그래프에 겹쳤습니다` : "판단 여덟 가지를 물은 영역이 아직 없습니다", "바깥 고리가 ‘기준까지 직접 결정’입니다. 영역마다 모양이 다르면 같은 사람이 영역에 따라 다른 판단을 맡아 왔다는 뜻입니다.") +
    (s.length ? `<div class="radar-big">${radar(labels, s, { size: 540 })}</div>
      <div class="lg">${s.map((v) => `<span><i style="background:${v.color}"></i>${E(v.name)}</span>`).join("")}</div>
      <div class="g${s.length >= 3 ? 3 : 2}">${s.slice(0, 3).map((v) => {
        const top = AXES.filter((_, k) => v.levels[k] === 3).map(d.axisName);
        const low = AXES.filter((_, k) => v.levels[k] !== null && (v.levels[k] ?? 0) <= 1).map(d.axisName);
        return `<div class="note" style="border-color:${v.color}"><b>${E(v.name)}</b><p>기준까지 결정: ${top.length ? E(top.join(", ")) : "아직 없음"}</p><p class="mut">아직 지시받아 수행 이하: ${low.length ? E(low.join(", ")) : "없음"}</p></div>`;
      }).join("")}</div>` : `<div class="na-box"><b>깊게 물은 영역이 없습니다</b>관심과 경험만 물은 응시라 판단 그래프를 그리지 않았습니다.</div>`));
}

export function smallMult(x: Inputs, d: X): Page {
  const s = seriesOf(d);
  return P("영역별 방사형 그래프",
    T("영역을 따로 그리면 모양이 서로 다릅니다", "겹친 그래프에서 가려진 모양을 영역마다 따로 보았습니다. 아래 표는 같은 값을 칸으로 적은 것입니다.") +
    `<div class="g${Math.min(Math.max(s.length, 2), 4) === 4 ? 4 : Math.max(s.length, 2)}">${s.map((v) => `<div class="card cen"><h4>${E(v.name)}</h4>${radar(AXES.map((a) => d.axisName(a)), [{ name: v.name, levels: v.levels, color: v.color }], { size: 280, label: 14, ring: false })}${zoneTag(d.dom(v.code)?.zone ?? "")}</div>`).join("")}</div>` +
    `<table class="tb tb-xs"><thead><tr><th>판단</th>${s.map((v) => `<th>${E(v.name)}</th>`).join("")}</tr></thead><tbody>${AXES.map((a, k) => `<tr><td><b>${E(d.axisName(a))}</b></td>${s.map((v) => `<td>${pip(v.levels[k])}</td>`).join("")}</tr>`).join("")}</tbody></table>` +
    band("읽는 법", "바깥 고리에 닿은 판단이 많은 영역이 지원서에서 ‘내가 정한 것’을 가장 또렷하게 말할 수 있는 영역입니다."));
}

export function heatPage(x: Inputs, d: X): Page {
  const rows = x.m.domains.map((z) => d.name(z.code));
  const cell = (i: number, jj: number) => {
    const lv = d.level(x.m.domains[i].code, AXES[jj]);
    if (lv === null) return { fill: "#f6f7f9", text: "", ink: C.ink3 };
    return { fill: LVC[lv], text: ["없음", "지시", "직접", "기준"][lv], ink: lv >= 2 ? "#fff" : C.ink2 };
  };
  const cells = x.m.domains.flatMap((z) => d.levels(z.code)).filter((v): v is Level => v !== null);
  const hi = cells.filter((v) => v >= 2).length;
  return P(`${x.domainWord} × 판단 지도`,
    T(cells.length ? `판단을 물은 칸 ${cells.length}개 가운데 ${hi}개가 ‘직접 수행’ 이상입니다` : "판단을 물은 칸이 아직 없습니다", `${d.counts.domains}가지 ${E(x.domainWord)}과 여덟 판단을 한 장에 놓았습니다. 흐린 칸은 이번에 묻지 않은 칸이고, 해 본 적이 없다는 뜻이 아닙니다.`) +
    `<div class="wide-art">${heat(rows, AXES.map((a) => d.axisName(a)), cell, { width: 700, label: 150, head: 54, row: 30, colWrap: 6 })}</div>` +
    `<div class="lg">${([0, 1, 2, 3] as const).map((k) => `<span><i style="background:${LVC[k]}"></i>${E(STEP_WORD[k].tag)}</span>`).join("")}<span><i style="background:#f6f7f9;border:1px solid #dfe3ea"></i>이번에 묻지 않음</span></div>` +
    (() => {
      const askedD = x.m.domains.filter((z) => d.asked(z));
      const rowBest = askedD.map((z) => ({ z, n: d.levels(z.code).filter((v) => v != null && v >= 2).length })).sort((a, b) => b.n - a.n)[0];
      const colLow = AXES.map((a) => ({ a, n: askedD.filter((z) => (d.level(z.code, a) ?? 0) >= 2).length })).sort((p, q0) => p.n - q0.n)[0];
      return `<div class="two">
        ${note("가로로 읽기", rowBest ? `한 영역 안에서 어느 판단까지 해 봤는지 봅니다. ${E(j(d.name(rowBest.z.code), "은는"))} 여덟 칸 가운데 ${rowBest.n}칸이 ‘직접 수행’ 이상입니다.` : "물은 영역이 없습니다.")}
        ${note("세로로 읽기", colLow && askedD.length ? `한 판단이 몇 영역에서 나왔는지 봅니다. ${E(j(q(d.axisName(colLow.a)), "은는"))} 물은 ${askedD.length}개 영역 가운데 ${colLow.n}곳에서 ‘직접 수행’ 이상입니다. 다음 활동에서 먼저 겨냥할 칸입니다.` : "물은 영역이 없습니다.")}
      </div>`;
    })());
}

export function profileRead(x: Inputs, d: X): Page {
  const b3 = d.best.filter((b) => b.level === 3), b2 = d.best.filter((b) => b.level === 2);
  const low = d.best.filter((b) => b.level !== null && b.level <= 1), un = d.best.filter((b) => b.level === null);
  const nm = (bs: typeof d.best) => andJoin(bs.map((b) => d.axisName(b.axis)));
  const where = (bs: typeof d.best) => [...new Set(bs.flatMap((b) => b.where))].map(d.name);
  const high = x.m.domains.filter((z) => z.interest === "HIGH" && !d.asked(z)).map((z) => d.name(z.code));
  const paras: [string, string][] = [];
  if (b3.length) paras.push(["강한 쪽", `${j(nm(b3), "은는")} 기준까지 직접 정했다고 답했고, 체크리스트에서도 그 장면을 골랐습니다. 이 판단들은 ${andJoin(where(b3))}에서 나왔습니다. 지원서에서 ‘내가 정한 것’으로 앞세울 수 있는 자리입니다.`]);
  if (b2.length) paras.push(["다음 단계", `${j(nm(b2), "은는")} 스스로 맡아 해 봤다고 답했습니다. 다음 과제에서 그 판단의 기준까지 직접 정하고 근거를 하나 더 고르면 한 단계 위로 올라갑니다.`]);
  if (low.length) paras.push(["아직인 쪽", `${j(nm(low), "은는")} 물은 영역 어디에서도 아직 ‘지시받아 수행’ 이하입니다. 해 보지 않았다는 뜻일 수도 있고, 이번에 그 장면을 떠올리지 못했다는 뜻일 수도 있습니다.`]);
  if (un.length) paras.push(["묻지 않은 쪽", `${j(nm(un), "은는")} 이번 등급에서 묻지 않았습니다. 그래서 그래프에 비어 있는 것은 경험이 없다는 뜻이 아닙니다.`]);
  if (high.length) paras.push(["관심", `${andJoin(high.slice(0, 4))}에 관심이 높다고 답했지만 이번에 판단을 깊게 묻지는 않았습니다. 그 영역의 짧은 과제 하나가 다음 결과의 근거가 됩니다.`]);
  if (!paras.length) paras.push(["지금", "판단 단계를 물은 영역이 없어 프로파일의 모양을 말할 수 없습니다."]);
  const say = (lv: Level | null) => lv === 3 ? "“제가 기준을 정했고, 그 결과가 쓰였습니다”" : lv === 2 ? "“주어진 조건 안에서 제가 직접 해 봤습니다”" : lv === 1 ? "“다른 사람이 정한 대로 맡아 해 봤습니다”" : lv === 0 ? "“아직 해 보지 않았습니다”" : "“이번에는 묻지 않았습니다”";
  return P("프로파일 해석",
    T(b3.length ? `기준까지 직접 정한 판단이 ${b3.length}가지, 스스로 해 본 판단이 ${b2.length}가지입니다` : `스스로 해 본 판단이 ${b2.length}가지입니다`, "그래프가 말하는 것을 문장으로 옮겼습니다. 사실과 그 뜻을 먼저 적고, 해석의 한계를 함께 적었습니다.") +
    `<div class="prose">${paras.map(([h, t]) => `<div class="pr"><span class="pr-n">${E(h)}</span><p>${E(t)}</p></div>`).join("")}</div>` +
    H("판단마다 이렇게 말할 수 있습니다", "면접과 상담에서 쓰는 말") +
    `<table class="tb tb-xs"><thead><tr><th>판단</th><th>가장 깊은 단계</th><th>나온 영역</th><th>이렇게 말하기</th></tr></thead><tbody>${d.best.map((b) => `<tr><td><b>${E(d.axisName(b.axis))}</b></td><td>${pip(b.level)}</td><td>${E(b.where.map(d.name).join(", ") || "없음")}</td><td class="mut">${E(say(b.level))}</td></tr>`).join("")}</tbody></table>`);
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
    ? `${d.name(s.code)}에서 ${j(list3(ev.decisions.length ? ev.decisions : ev.acts), "을를")} 골랐습니다.${ev.artifacts.length ? ` 그 결과로 ${j(andJoin(ev.artifacts.slice(0, 3)), "을를")} 남겼다고 답했습니다.` : ""}`
    : `${d.name(s.code)}의 판단 ${s.confirmed.length}가지를 스스로 해 봤다고 답했고, 그 장면을 체크리스트에서는 아직 고르지 않았습니다.`;
  const show = ev.artifacts.length
    ? `${j(ev.artifacts[0], "을를")} 결과물로 보여 줍니다.${ev.comparisons.length ? ` 그 결과를 ${j(ev.comparisons[0], "과와")} 비교한 내용을 근거로 붙입니다.` : " 무엇과 비교했는지는 아직 비어 있으니 면접 전에 채워 둡니다."}`
    : `아직 보여 줄 결과물을 고르지 않았습니다. ${def?.artifacts[0] ?? "결과물"} 같은 형태로 한 장을 남기면 서류에서 보여 줄 것이 생깁니다.`;
  const next = gap?.axis
    ? `한 단계 더 가려면 다음 과제에서 ${j(q(d.axisName(gap.axis)), "을를")} 직접 맡습니다. ${def?.axes?.[gap.axis]?.l2 ? `예를 들면 ${q(def.axes[gap.axis].l2)} 같은 일입니다.` : ""}`
    : "지금 근거로도 지원서 문단 하나를 쓸 수 있습니다. 다음 할 일은 결과 수치와 기간을 직접 적어 넣는 일입니다.";
  const question = pick
    ? `${q(pick)}고 고르셨는데, 그때 무엇을 기준으로 정했고 다른 안은 왜 고르지 않았나요?`
    : `${d.name(s.code)} 과제에서 결과가 기대와 달랐던 적이 있나요? 그때 무엇을 바꿨나요?`;
  return P(`강점 ${k + 1} · ${d.name(s.code)}`,
    T(`강점 ${k + 1} · ${E(d.name(s.code))}`, E(story)) +
    `<div class="two r64">
      <div>${ev.decisions.length ? H("직접 정한 것", "고른 근거") + ul(ev.decisions.slice(0, 5).map(E)) : ""}${ev.acts.length ? H("해 본 일", "고른 근거") + ul(ev.acts.slice(0, 5).map(E)) : ""}
        ${ev.artifacts.length ? H("남긴 것") + chips(ev.artifacts.slice(0, 6), "art") : ""}${ev.comparisons.length ? H("비교한 대상") + chips(ev.comparisons.slice(0, 5)) : ""}</div>
      <div class="card cen">${radar(AXES.map((a) => d.axisName(a)), [{ name: d.name(s.code), levels: d.levels(s.code), color: SERIES[k % 4] }], { size: 290, label: 13, ring: false })}${zoneTag(s.zone)}</div>
    </div>` +
    `<div class="g3">
      ${note("보여 줄 것", E(show))}
      ${note("한 단계 더", E(next))}
      ${note("이어지는 직무", `${E(roles.join(" · ") || "관계표에 적힌 직무가 없습니다")}${indLine ? `<br><span class="mut">${E(indLine)}</span>` : ""}`)}
    </div>` +
    lines(3, "이 강점으로 말할 30초 답변 (정한 기준, 버린 안, 남긴 결과 차례로)") +
    band("면접에서 받을 질문", E(question)));
}

export function commonPage(x: Inputs, d: X): Page {
  const c = commonKo(x.m.common, x.coreCode);
  const STAGE: Record<string, string> = { bachelor: "학부", master: "석사", phd: "박사", postdoc: "박사후연구원" };
  const axes = x.m.common.axes;
  const rows = AXES.map((a) => { const v = axes.find((z) => z.axis === a); return { a, lv: !v ? null : v.owned ? 3 : v.confirmed ? 2 : (v.from.length ? 0 : null) } as { a: Axis; lv: Level | null }; });
  return P("영역을 가리지 않는 판단",
    T("어느 영역에서든 되풀이되는 판단도 따로 물었습니다", `공통 판단과 ${E(STAGE[x.m.stage] ?? "학업 단계")} 장면 문항입니다. 영역 묶음에는 들어가지 않고, 어떤 과제를 맡아도 나오는 일하는 방식을 보여 줍니다.`) +
    `<div class="wide-art">${hbars(rows.map((r) => ({ label: d.axisName(r.a), value: r.lv ?? 0, color: LVC[Math.max(1, r.lv ?? 0)], note: r.lv == null ? "이번에 묻지 않음" : r.lv === 3 ? "직접 정하고 결과가 쓰임" : r.lv === 2 ? "해 본 것으로 확인" : "아직 확인되지 않음" })), { max: 3, width: 680, label: 130, row: 30, valueText: (b) => String((b as { note?: string }).note ?? "") })}</div>` +
    `<div class="two">
      ${note("직접 정했다고 답한 판단", c.didOwn.length ? ul(c.didOwn.slice(0, 6).map(E)) : c.owned.length ? E(c.owned.join(", ")) : "아직 없습니다.")}
      ${note("해 봤다고 답한 판단", c.didConfirm.length ? ul(c.didConfirm.slice(0, 6).map(E)) : c.confirmed.length ? E(c.confirmed.join(", ")) : "아직 없습니다.", true)}
    </div>` +
    band("쓰는 법", "공통 판단은 지원서의 ‘일하는 방식’ 문항에 씁니다. 영역 근거와 같은 장면을 쓰면 두 문항이 서로를 받쳐 줍니다."));
}

export function qualityPage(x: Inputs, d: X): Page {
  const f = x.m.response_quality.flag;
  const said: Record<string, string> = {
    OK: "응답이 고르게 들어왔고, 다시 볼 응답은 없습니다",
    REVIEW: "다시 볼 응답이 있습니다. 결과를 읽을 때 아래를 함께 봅니다",
    LOW_VARIANCE: "응답이 한쪽으로 모였습니다. 영역 사이의 차이가 작게 나왔습니다",
    INCONSISTENT: "서로 어긋나는 응답이 있습니다. 그 영역은 조심해서 읽습니다",
  };
  const asked = x.m.domains.filter((z) => d.asked(z));
  const dist = ([3, 2, 1, 0] as const).map((k) => ({ label: STEP_WORD[k].tag, value: asked.reduce((a, z) => a + d.levels(z.code).filter((v) => v === k).length, 0), color: LVC[Math.max(1, k)] }));
  const max = Math.max(4, ...dist.map((v) => v.value));
  return P("응답을 믿을 수 있는가",
    T(E(said[f] ?? said.REVIEW), "결과를 읽기 전에 응답이 고르게 들어왔는지부터 확인했습니다. 한쪽으로 몰린 응답이나 서로 어긋나는 응답이 있으면 여기에 적습니다.") +
    `<div class="kpis">
      <div class="kpi"><p>응답 품질</p><b>${f === "OK" ? "이상 없음" : "다시 보기"}</b><span>한쪽 쏠림과 어긋남 검사</span></div>
      <div class="kpi"><p>기준까지 정한 판단</p><b>${d.counts.owned}<small>개</small></b><span>고른 근거가 둘 이상일 때만</span></div>
      <div class="kpi"><p>판단을 물은 영역</p><b>${asked.length}<small>곳</small></b><span>${d.counts.domains}가지 ${E(x.domainWord)} 가운데</span></div>
    </div>` +
    H("단계를 올리는 규칙", "응답만으로는 ‘기준까지’로 올라가지 않습니다") +
    `<div class="flow5 f4">${[["응답", "‘기준을 직접 정했다’고 답함"], ["고른 근거", "그 장면을 체크리스트에서 함께 고름"], ["결과물", "남긴 문서나 표도 함께 고름"], ["단계", "그때만 ‘기준까지 직접 결정’"]].map(([h, b]) => `<div class="f5"><b>${h}</b><p>${b}</p></div>`).join("")}</div>` +
    H(`물은 칸 ${asked.length * 8}개의 단계`, "판단을 물은 영역 × 여덟 판단") +
    hbars(dist, { max, width: 640, label: 150, row: 30, valueText: (b) => `${b.value}칸` }) +
    H("이 결과가 말하지 않는 것") +
    `<div class="two"><div>${ul(["결과물의 완성도와 실제 성과 수치", "직무 적합도, 합격 여부, 연봉", "다른 참여자와 견준 순위(규준이 아직 없습니다)"])}</div><div>${ul(["이번에 깊게 묻지 않은 영역의 실제 숙련도", "기업의 채용 계획", "성격이나 적성 유형"])}</div></div>`);
}

export function ch2Pages(x: Inputs, d: X): Page[] {
  const out = [radarBig(x, d)];
  /* 영역별 작은 그래프 쪽은 싣지 않는다. 같은 값이 겹친 그래프와 지도 쪽에 있다 */
  if (!d.radarDoms.length) out.push(smallMult(x, d));
  out.push(heatPage(x, d), profileRead(x, d));
  d.strengths.forEach((_, k) => out.push(strengthPage(x, d, k)));
  out.push(commonPage(x, d), qualityPage(x, d));
  return out;
}
