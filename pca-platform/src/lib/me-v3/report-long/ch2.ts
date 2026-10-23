/**
 * 02 판단 프로파일.
 */
import type { Axis } from "../scoring/types";
import { QUALITY_KO, commonKo } from "../result/text.ko";
import type { Inputs, Level } from "./types";
import { AXES, STEP_WORD, type X } from "./derive";
import { C, hbars, heat, radar } from "./charts";
import { E, H, LVC, PAL, T, band, chips, note, pip, ul, zoneTag, type Page } from "./kit";
import { andJoin, askNoun, j, list3, polite, q } from "./text";

const P = (title: string, body: string): Page => ({ part: "02", partName: "판단 프로파일", title, body });
const SERIES = [PAL.blue, PAL.coral, PAL.teal, PAL.violet];

function seriesOf(d: X) {
  return d.radarDoms.map((v, i) => ({ code: v.code, name: d.name(v.code), levels: d.levels(v.code), color: SERIES[i] }));
}

export function radarBig(x: Inputs, d: X): Page {
  const s = seriesOf(d);
  const labels = AXES.map((a) => d.axisName(a));
  return P("판단 프로파일 방사형 그래프",
    T(s.length ? `자세히 물은 ${s.length}개 영역을 한 그래프에 겹쳤습니다` : "이번 검사는 관심과 해 본 횟수까지 물었습니다", s.length ? "영역마다 모양이 다르다면, 영역에 따라 맡아 온 일이 달랐다는 뜻입니다." : undefined) +
    (s.length ? `<div class="radar-big">${radar(labels, s, { size: 540 })}</div>
      <div class="lg">${s.map((v) => `<span><i style="background:${v.color}"></i>${E(v.name)}</span>`).join("")}</div>
      <div class="g${s.length >= 3 ? 3 : 2}">${s.slice(0, 3).map((v) => {
        const top = AXES.filter((_, k) => v.levels[k] === 3).map(d.axisName);
        const low = AXES.filter((_, k) => v.levels[k] !== null && (v.levels[k] ?? 0) <= 1).map(d.axisName);
        const did = v.levels.filter((l) => (l ?? 0) >= 2).length;
        const body = [top.length ? `<p>기준까지 직접 정함: ${E(top.join(", "))}</p>` : "", low.length ? `<p class="mut">다음에 더 해 볼 판단: ${E(low.join(", "))}</p>` : "", !top.length && !low.length ? `<p>여덟 판단 가운데 ${did}가지를 직접 해 봤습니다.</p>` : ""].join("");
        return `<div class="note" style="border-color:${v.color}"><b>${E(v.name)}</b>${body}</div>`;
      }).join("")}</div>` : (() => {
        const hi = x.m.domains.filter((z) => z.interest === "HIGH").map((z) => d.name(z.code)).slice(0, 2);
        return `<div class="na-box"><b>판단 단계까지 보려면</b>${hi.length ? `${E(andJoin(hi))}처럼 관심이 높은 영역에서` : "관심 가는 영역에서"} 짧은 과제를 한 번 해 본 뒤 다시 검사해 보세요. 그때 이 그래프가 그려집니다.</div>`;
      })()));
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
    T(cells.length ? `판단을 물은 칸 ${cells.length}개 가운데 ${hi}개가 ‘직접 수행’ 이상입니다` : `${d.counts.domains}가지 ${E(x.domainWord)}과 여덟 판단을 한 장에 놓았습니다`, "가로줄이 영역, 세로줄이 판단입니다.") +
    `<div class="wide-art">${heat(rows, AXES.map((a) => d.axisName(a)), cell, { width: 700, label: 150, head: 54, row: 30, colWrap: 6 })}</div>` +
    `<div class="lg">${([0, 1, 2, 3] as const).map((k) => `<span><i style="background:${LVC[k]}"></i>${E(STEP_WORD[k].tag)}</span>`).join("")}<span><i style="background:#f6f7f9;border:1px solid #dfe3ea"></i>이번에 묻지 않음</span></div>` +
    (() => {
      const askedD = x.m.domains.filter((z) => d.asked(z));
      const rowBest = askedD.map((z) => ({ z, n: d.levels(z.code).filter((v) => v != null && v >= 2).length })).sort((a, b) => b.n - a.n)[0];
      const colLow = AXES.map((a) => ({ a, n: askedD.filter((z) => (d.level(z.code, a) ?? 0) >= 2).length })).sort((p, q0) => p.n - q0.n)[0];
      if (!rowBest || !colLow) return "";
      return `<div class="two">
        ${note("가로로 읽기", `한 영역 안에서 어느 판단까지 해 봤는지 봅니다. ${E(j(d.name(rowBest.z.code), "은는"))} 여덟 칸 가운데 ${rowBest.n}칸이 ‘직접 수행’ 이상입니다.`)}
        ${note("세로로 읽기", `한 판단이 몇 영역에서 나왔는지 봅니다. ${E(j(q(d.axisName(colLow.a)), "은는"))} 물은 ${askedD.length}개 영역 가운데 ${colLow.n}곳에서 ‘직접 수행’ 이상입니다. 다음 과제에서는 이 판단을 직접 맡아 보세요.`)}
      </div>`;
    })());
}

export function profileRead(x: Inputs, d: X): Page {
  const b3 = d.best.filter((b) => b.level === 3), b2 = d.best.filter((b) => b.level === 2);
  const low = d.best.filter((b) => b.level !== null && b.level <= 1), un = d.best.filter((b) => b.level === null);
  const nm = (bs: typeof d.best) => (bs.length >= 5 ? `여덟 판단 가운데 ${bs.length}가지` : andJoin(bs.map((b) => d.axisName(b.axis))));
  const subj = (bs: typeof d.best) => (bs.length === 8 ? "여덟 판단 모두" : j(nm(bs), "은는"));
  const where = (bs: typeof d.best) => [...new Set(bs.flatMap((b) => b.where))].map(d.name);
  const high = x.m.domains.filter((z) => z.interest === "HIGH" && !d.asked(z)).map((z) => d.name(z.code));
  const paras: [string, string][] = [];
  if (b3.length) paras.push(["강한 쪽", `${subj(b3)} 기준까지 직접 정했다고 답했고, 체크리스트에서도 그 장면을 고르셨습니다. ${andJoin(where(b3))}에서 나온 판단이라, 지원서에 ‘제가 정한 것’으로 앞에 내세울 만합니다.`]);
  if (b2.length) paras.push(["다음 단계", `${subj(b2)} 직접 맡아 해 봤다고 답했습니다. 다음 과제에서 그 판단의 기준까지 직접 정해 보고, 그 장면을 체크리스트에서 하나 더 고르면 ‘기준까지 직접 결정’으로 올라갑니다.`]);
  if (low.length) paras.push(["더 해 볼 쪽", `${subj(low)} 물은 영역에서 아직 ‘지시받아 수행’ 이하입니다. 정말 해 본 적이 없을 수도 있고, 검사하면서 그 장면이 떠오르지 않았을 수도 있으니 상담에서 한 번 더 떠올려 보세요.`]);
  if (un.length) paras.push(["묻지 않은 쪽", `${subj(un)} 이번 등급에서 묻지 않았습니다.`]);
  if (high.length) paras.push(["관심", `${andJoin(high.slice(0, 4))}에 관심이 높다고 답했는데, 이번에는 판단 단계까지 묻지 않았습니다. 그중 한 영역에서 짧은 과제를 해 보면 다음 결과에 근거로 들어갑니다.`]);
  if (!paras.length) paras.push(["지금", "이번 검사에서는 판단 단계를 물은 영역이 없습니다. 관심 가는 영역에서 짧은 과제를 한 번 해 본 뒤 다시 검사해 보세요."]);
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
    T(b3.length ? `기준까지 직접 정한 판단이 ${b3.length}가지, 직접 해 본 판단이 ${b2.length}가지입니다` : b2.length === 8 ? "여덟 판단을 모두 직접 해 봤습니다" : b2.length ? `직접 해 본 판단이 ${b2.length}가지입니다` : "직접 해 본 판단은 아직 적습니다") +
    `<div class="prose">${paras.map(([h, t]) => `<div class="pr"><span class="pr-n">${E(h)}</span><p>${E(t)}</p></div>`).join("")}</div>` +
    (sayRows.length ? H("판단마다 이렇게 말할 수 있습니다", "면접과 상담에서 쓰는 말") +
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
    ? `${d.name(s.code)}에서 ${j(list3(ev.decisions.length ? ev.decisions : ev.acts), "을를")} 고르셨습니다.${ev.artifacts.length ? ` 그 결과로 ${j(andJoin(ev.artifacts.slice(0, 3)), "을를")} 남겼다고 답했습니다.` : ""}`
    : `${d.name(s.code)}에서는 판단 ${s.confirmed.length}가지를 직접 해 봤다고 답했습니다. 어떤 과제였는지 체크리스트에서 골라 두면 지원서에 쓸 근거가 됩니다.`;
  const show = ev.artifacts.length
    ? `${j(ev.artifacts[0], "을를")} 결과물로 내보이면 됩니다.${ev.comparisons.length ? ` ${j(ev.comparisons[0], "과와")} 비교한 내용도 함께 붙이세요.` : " 무엇과 비교해 확인했는지 한 줄 적어 두면 면접에서 바로 쓸 수 있습니다."}`
    : `다음 ${d.name(s.code)} 과제에서 ${j(def?.artifacts[0] ?? "결과 문서", "을를")} 남겨 두세요. 서류에 붙일 첫 결과물이 됩니다.`;
  const next = gap?.axis
    ? `다음 과제에서는 ${j(q(d.axisName(gap.axis)), "을를")} 직접 맡아 보세요.${def?.axes?.[gap.axis]?.l2 ? ` 예를 들면 ${q(def.axes[gap.axis].l2)} 같은 일입니다.` : ""}`
    : "지금 근거로도 지원서 문단 하나를 쓸 수 있습니다. 결과 수치와 기간만 직접 채워 넣으면 됩니다.";
  /* 고른 항목이 없으면 그 영역에서 해 봤다고 답한 판단의 문항 장면(l2)으로 잇는다. 지어낸 장면을 쓰지 않는다 */
  const sc = [...new Set(s.confirmed.map((a) => def?.axes?.[a]?.l2 ?? "").filter(Boolean))];
  const draft = [
    pick ? `${d.name(s.code)} 과제를 하면서 ${polite(pick)}` : sc[0] ? `${d.name(s.code)} 과제를 하면서 ${polite(sc[0])}` : `${d.name(s.code)} 과제에서 ${j(andJoin(s.confirmed.slice(0, 2).map(d.axisName)), "을를")} 직접 맡았습니다.`,
    !pick && sc[1] ? polite(sc[1]) : "",
    ev.artifacts[0] ? `결과는 ${j(ev.artifacts[0], "으로")} 남겼습니다.` : "",
    ev.comparisons[0] ? `${j(ev.comparisons[0], "과와")} 비교해 맞는지 확인했습니다.` : "",
  ].filter(Boolean).join(" ");
  const question = pick
    ? `${q(pick)}고 고르셨는데, 그때 무엇을 기준으로 정했고 다른 방법은 왜 쓰지 않았나요?`
    : [`${d.name(s.code)} 과제에서 결과가 기대와 달랐던 적이 있나요? 그때 무엇을 바꿨나요?`,
      `${d.name(s.code)} 과제에서 낸 결과가 맞는지 무엇과 비교해 확인했나요?`,
      `${d.name(s.code)} 과제에서 만든 자료는 누가, 어디에 썼나요?`][k % 3];
  return P(`강점 ${k + 1} · ${d.name(s.code)}`,
    T(`강점 ${k + 1} · ${E(d.name(s.code))}`, E(story)) +
    `<div class="two r64">
      <div>${ev.decisions.length ? H("직접 정한 것", "고른 근거") + ul(ev.decisions.slice(0, 5).map(E)) : ""}${ev.acts.length ? H("해 본 일", "고른 근거") + ul(ev.acts.slice(0, 5).map(E)) : ""}
        ${ev.artifacts.length ? H("남긴 것") + chips(ev.artifacts.slice(0, 6), "art") : ""}${ev.comparisons.length ? H("비교한 대상") + chips(ev.comparisons.slice(0, 5)) : ""}</div>
      <div class="card cen">${radar(AXES.map((a) => d.axisName(a)), [{ name: d.name(s.code), levels: d.levels(s.code), color: SERIES[k % 4] }], { size: 290, label: 13, ring: false })}${zoneTag(s.zone)}</div>
    </div>` +
    `<div class="g${roles.length ? 3 : 2}">
      ${note("보여 줄 것", E(show))}
      ${note("한 단계 더", E(next))}
      ${roles.length ? note("이어지는 직무", `${E(roles.join(" · "))}${indLine ? `<br><span class="mut">${E(indLine)}</span>` : ""}`) : ""}
    </div>` +
    note("30초 답변 초안", `<p>“${E(draft)}”</p><p class="mut sm">여기에 그때 정한 기준 하나와 쓰지 않은 방법 하나를 덧붙여 말하면 30초 분량이 됩니다.</p>`) +
    band("면접에서 받을 질문", E(question)));
}

export function commonPage(x: Inputs, d: X): Page {
  const c = commonKo(x.m.common, x.coreCode);
  const STAGE: Record<string, string> = { bachelor: "학부", master: "석사", phd: "박사", postdoc: "박사후연구원" };
  const axes = x.m.common.axes;
  const rows = AXES.map((a) => { const v = axes.find((z) => z.axis === a); return { a, lv: !v ? null : v.owned ? 3 : v.confirmed ? 2 : (v.from.length ? 0 : null) } as { a: Axis; lv: Level | null }; });
  return P("영역을 가리지 않는 판단",
    T(rows.some((r) => r.lv === 3) ? `어떤 과제에서든 ${rows.filter((r) => r.lv === 3).length}가지 판단은 직접 정했다고 답했습니다` : "영역과 관계없이 과제마다 되풀이되는 판단도 따로 물었습니다", `${E(STAGE[x.m.stage] ?? "학업")} 과정의 수업과 팀 과제 장면으로 물은 문항이라, 영역별 결과와는 따로 셌습니다.`) +
    `<div class="wide-art">${hbars(rows.map((r) => ({ label: d.axisName(r.a), value: r.lv ?? 0, color: LVC[Math.max(1, r.lv ?? 0)], note: r.lv == null ? "이번에 묻지 않음" : r.lv === 3 ? "직접 정하고 결과가 쓰임" : r.lv === 2 ? "해 본 것으로 확인" : "아직 확인되지 않음" })), { max: 3, width: 680, label: 130, row: 30, valueText: (b) => String((b as { note?: string }).note ?? "") })}</div>` +
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
    OK: "응답이 고르게 들어와, 결과를 그대로 읽으시면 됩니다",
    REVIEW: "다시 볼 응답이 있습니다. 결과를 읽을 때 아래를 함께 봅니다",
    LOW_VARIANCE: "응답이 한쪽으로 모였습니다. 영역 사이의 차이가 작게 나왔습니다",
    INCONSISTENT: "서로 어긋나는 응답이 있습니다. 그 영역은 조심해서 읽습니다",
  };
  const asked = x.m.domains.filter((z) => d.asked(z));
  const dist = ([3, 2, 1, 0] as const).map((k) => ({ label: STEP_WORD[k].tag, value: asked.reduce((a, z) => a + d.levels(z.code).filter((v) => v === k).length, 0), color: LVC[Math.max(1, k)] }));
  const max = Math.max(4, ...dist.map((v) => v.value));
  return P("응답을 믿을 수 있는가",
    T(E(said[f] ?? said.REVIEW), E(QUALITY_KO[f as keyof typeof QUALITY_KO] || "") || undefined) +
    `<div class="kpis">
      <div class="kpi"><p>응답 품질</p><b>${f === "OK" ? "이상 없음" : "다시 보기"}</b><span>한쪽 쏠림과 어긋남 검사</span></div>
      <div class="kpi"><p>기준까지 정한 판단</p><b>${d.counts.owned}<small>개</small></b><span>고른 근거가 둘 이상일 때만</span></div>
      <div class="kpi"><p>판단을 물은 영역</p><b>${asked.length}<small>곳</small></b><span>${d.counts.domains}가지 ${E(x.domainWord)} 가운데</span></div>
    </div>` +
    H("단계를 올리는 규칙", "답과 고른 항목이 함께 있어야 합니다") +
    `<div class="flow5 f4">${[["응답", "‘기준을 직접 정했다’고 답함"], ["고른 근거", "그 장면을 체크리스트에서 함께 고름"], ["결과물", "남긴 문서나 표도 함께 고름"], ["단계", "그때만 ‘기준까지 직접 결정’"]].map(([h, b]) => `<div class="f5"><b>${h}</b><p>${b}</p></div>`).join("")}</div>` +
    H(`물은 칸 ${asked.length * 8}개의 단계`, "판단을 물은 영역 × 여덟 판단") +
    hbars(dist, { max, width: 640, label: 150, row: 30, valueText: (b) => `${b.value}칸` }) +
    (asked.length ? H("물은 영역마다 직접 해 본 판단", "여덟 판단 가운데") +
      `<table class="tb tb-xs"><thead><tr><th>영역</th><th>묶음</th><th>직접 수행 이상</th><th>기준까지 직접 결정</th><th>다음에 맡아 볼 판단</th></tr></thead><tbody>${asked.map((z) => {
        const lv = d.levels(z.code);
        const next = AXES.filter((_, i) => lv[i] !== null && (lv[i] ?? 0) <= 1).map(d.axisName).slice(0, 2);
        return `<tr><td><b>${E(d.name(z.code))}</b></td><td>${zoneTag(z.zone)}</td><td>${lv.filter((v) => (v ?? 0) >= 2).length}가지</td><td>${lv.filter((v) => v === 3).length}가지</td><td class="mut">${E(next.join(", ") || "기준까지 정해 보기")}</td></tr>`;
      }).join("")}</tbody></table>` : ""));
}

export function ch2Pages(x: Inputs, d: X): Page[] {
  const out = [radarBig(x, d)];
  /* 영역별 작은 그래프 쪽은 싣지 않는다. 같은 값이 겹친 그래프와 지도 쪽에 있고, 물은 영역이 없으면 그릴 것도 없다 */
  out.push(heatPage(x, d), profileRead(x, d));
  d.strengths.forEach((_, k) => out.push(strengthPage(x, d, k)));
  out.push(commonPage(x, d), qualityPage(x, d));
  return out;
}
