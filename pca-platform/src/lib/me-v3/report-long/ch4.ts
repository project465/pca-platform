/**
 * 04 직무 탐색: 직무와 영역의 지도 · 직무별 근거 · 직무 깊이 보기 · 공고 이름 · 경계 · 산업 · 조직.
 *
 * 직무 설명은 그 전공의 직무 안내(`role-guide.v1`)를 읽는다. 안내가 없는 직무는
 * 직무팩과 영역 사전의 자료만으로 쪽을 세우고, 안내에만 있는 칸(첫 프로젝트 ·
 * 배울 순서 · 공고에서 볼 것)은 만들지 않는다.
 */
import type { Axis } from "../scoring/types";
import type { Inputs, Level, RoleGuide } from "./types";
import { AXES, STEP_WORD, type RolePack, type X } from "./derive";
import { C, chain, hbars, heat } from "./charts";
import { CYC, E, H, LVC, PAL, T, ZC, band, chips, lines, note, paginate, pip, rowsOf, ul, type Page } from "./kit";
import { andJoin, asSentence, askNoun, j, okOr, okText, polite } from "./text";

const P = (title: string, body: string): Page => ({ part: "04", partName: "직무 탐색", title, body });
const dz = (d: X, t: string) => `<span class="nw">${E(d.name(t))}<span class="dot" style="background:${ZC[d.dom(t)?.zone ?? "NOT_EXPLORED"]}"></span></span>`;

export function matrixPage(x: Inputs, d: X): Page {
  const roles = d.roleOrder;
  const tds = x.m.domains.map((z) => z.code);
  const cell = (i: number, jj: number) => {
    const s = x.rel.td_role.find((t) => t.role === roles[i].code && t.td === tds[jj])?.strength;
    const z = d.dom(tds[jj])?.zone;
    const core = roles[i].core_ref.td.includes(tds[jj]);
    const fill = s === "중심" ? (z === "Z1_EVIDENCE_ESTABLISHED" ? PAL.blue : z === "Z2_EVIDENCE_INCOMPLETE" || z === "Z3_EVIDENCE_LOW_INTEREST" ? PAL.teal : PAL.amber)
      : s === "있음" ? (z === "Z1_EVIDENCE_ESTABLISHED" ? "#a9c1f2" : z === "Z2_EVIDENCE_INCOMPLETE" || z === "Z3_EVIDENCE_LOW_INTEREST" ? "#9fdccf" : "#f8d9b3") : "#f6f7f9";
    return { fill, text: core ? "●" : "", ink: s === "중심" ? "#fff" : C.ink2 };
  };
  return P("직무와 영역의 지도",
    T(`${E(x.major)} 대표 직무 ${roles.length}개와 ${d.counts.domains}가지 ${E(x.domainWord)}을 겹쳐 봤습니다`, "진한 칸은 그 직무의 중심 업무이고, 파랑에 가까울수록 참여자의 근거가 갖춰진 영역입니다. ●는 직무의 핵심 영역입니다.") +
    `<div class="wide-art">${heat(roles.map((p) => p.name_ko), x.m.domains.map((z) => d.name(z.code)), cell, { width: 710, label: 120, head: 92, row: 34, colWrap: 5 })}</div>` +
    `<div class="lg"><span><i style="background:${PAL.blue}"></i>중심 업무 · 근거 갖춤</span><span><i style="background:${PAL.teal}"></i>중심 업무 · 해 본 일 있음</span><span><i style="background:${PAL.amber}"></i>중심 업무 · 아직</span><span><i style="background:#a9c1f2"></i>함께 하는 업무 · 근거 갖춤</span><span><i style="background:#f8d9b3"></i>함께 하는 업무 · 아직</span></div>` +
    band("직무 일반", "이 지도는 직무마다 어느 영역이 중심인지에 대한 일반 안내 위에 참여자의 근거를 겹친 것입니다. 개인의 직무 적합도를 계산한 것이 아닙니다."));
}

export function coveragePage(x: Inputs, d: X): Page {
  const rows = d.roleOrder.map((r) => d.roleCover(r));
  const n2 = rows.filter((r) => r.z1.length + r.z2.length >= 2).length;
  return P("직무별로 갖춘 근거",
    T(`${rows.length}개 직무 가운데 ${n2}개는 핵심 영역 가운데 둘 이상에서 근거가 확인됩니다`, "직무마다 핵심 영역에서 근거가 몇 곳 갖춰졌는지와, 그 직무가 특히 보는 판단의 단계를 나란히 놓았습니다. 차례는 목표 직무, 관심 직무, 근거가 겹치는 영역 수 순서입니다.") +
    `<div class="wide-art">${hbars(rows.map((r) => ({ label: r.role.name_ko, value: r.z1.length + r.z2.length * 0.5, color: r.z1.length >= 2 ? PAL.blue : r.z1.length + r.z2.length >= 1 ? PAL.teal : "#c9ced8", note: `근거 갖춤 ${r.z1.length} · 해 본 일 ${r.z2.length} / 핵심 ${r.tds.length}` })), { max: Math.max(3, ...rows.map((r) => r.tds.length)), width: 700, label: 130, row: 34, valueText: (b) => String((b as { note?: string }).note ?? "") })}</div>` +
    `<table class="tb tb-xs"><thead><tr><th>직무</th><th>핵심 영역</th><th>특히 보는 판단과 지금 단계</th></tr></thead><tbody>${rows.map((r) => `<tr><td><b>${E(r.role.name_ko)}</b></td><td>${r.tds.map((t) => dz(d, t)).join(" ")}</td><td>${r.req.map((q0) => `${E(d.axisName(q0.axis))} ${pip(q0.level)}`).join("<br>")}</td></tr>`).join("")}</tbody></table>` +
    `<p class="mut sm">막대 길이는 근거 갖춘 영역을 1, 해 본 일이 있는 영역을 0.5로 세어 더한 것입니다. 센 개수를 보기 쉽게 그린 것이고 적합도 점수가 아닙니다.</p>`);
}

function reqRows(x: Inputs, d: X, r: RolePack) {
  return r.required_axes.map((a) => {
    const vs = r.core_ref.td.map((t) => d.level(t, a)).filter((v): v is Level => v !== null);
    const lv = vs.length ? (Math.max(...vs) as Level) : null;
    return { label: d.axisName(a), value: lv ?? 0, color: LVC[Math.max(1, lv ?? 0)], note: lv == null ? "이번에 묻지 않음" : STEP_WORD[lv].tag };
  });
}

/** 직무 하나의 쪽들. depth: 1 = 하는 일 · 2 = 판단과 연습까지 · 3 = 첫 프로젝트까지 */
export function rolePages(x: Inputs, d: X, r: RolePack, depth: number): Page[] {
  const g: RoleGuide | undefined = x.guide.roles[r.code];
  const out: Page[] = [];
  const isGoal = d.goalRole?.code === r.code;
  const ctx = x.m.role_context?.code === r.code ? x.m.role_context : null;
  const differs = r.differs_from.filter((v) => okText(v.line)).map((v) => `${j(d.roleName(v.vs), "과와")} 다른 점: ${polite(v.line)}`);
  if (g) {
    out.push(P(`${r.name_ko} · 하는 일`,
      T(`${E(j(r.name_ko, "은는"))} ${E(asSentence(g.summary))}`, `${isGoal ? "목표로 적은 직무입니다. " : ""}핵심 영역은 ${E(andJoin(r.core_ref.td.map(d.name)))}이고, 이 직무가 정하는 것은 ${E(r.decides.slice(0, 3).join(", "))}입니다.`) +
      H("일이 흘러가는 순서", "직무 안내") + chain(g.process.slice(0, 6).map((s, i) => ({ head: s.step, body: s.what, color: CYC[i % CYC.length] })), { width: 700, height: 150 }) +
      `<div class="two">
        <div class="card">${H("주로 맡는 일")}${ul(g.responsibilities.slice(0, 5).map(E))}</div>
        <div class="card">${H("알아야 할 것 · 쓰는 도구")}${ul([...g.knowledge.slice(0, 4).map(E), ...g.tools.slice(0, 3).map((t) => `<span class="mut">${E(t)}</span>`)])}</div>
      </div>
      <div class="two">
        <div class="card">${H("이 직무가 특히 보는 판단", "지금 단계")}${hbars(reqRows(x, d, r), { max: 3, width: 340, label: 110, ticks: ["지시받아", "직접", "기준까지"], row: 42, valueText: (b) => String((b as { note?: string }).note ?? "") })}</div>
        <div class="card">${H("들어가는 길", "학교 안에서")}${ul(g.entry.slice(0, 3).map(E))}</div>
      </div>` + band("다른 직무와 다른 점", E(differs.join(" ")))));
  } else {
    const items = (r.items ?? []).slice(0, 7);
    out.push(P(`${r.name_ko} · 하는 일`,
      T(`${E(j(r.name_ko, "은는"))} ${E(polite(r.owns))}`, `${isGoal ? "목표로 적은 직무입니다. " : ""}핵심 영역은 ${E(andJoin(r.core_ref.td.map(d.name)))}입니다. 이 직무의 일반 안내는 아직 준비 중이라, 직무팩과 영역 사전에 적힌 내용만 실었습니다.`) +
      `<div class="two">
        <div class="card">${H("이 직무가 정하는 것", "직무팩")}${chips(r.decides)}<p class="k" style="margin-top:3mm">핵심 영역</p><p>${r.core_ref.td.map((t) => dz(d, t)).join(" ")}</p><p class="k" style="margin-top:3mm">지원 서류에 쓰는 결과물</p>${chips(r.application_material, "art")}</div>
        <div class="card">${H("이 직무가 특히 보는 판단", "지금 단계")}${hbars(reqRows(x, d, r), { max: 3, width: 340, label: 110, ticks: ["지시받아", "직접", "기준까지"], row: 42, valueText: (b) => String((b as { note?: string }).note ?? "") })}</div>
      </div>` +
      H("이 직무에서 묻는 판단", ctx ? "직무 문항 · 답한 내용" : "직무 문항") +
      `<table class="tb tb-xs"><tbody>${items.map((it) => {
        const ans = ctx?.answered.find((a) => a.axis === it.axis && a.domain === it.domain);
        const st = ctx ? (ans ? (ans.owned ? "직접 정함" : "해 봄") : ctx.not_yet.some((a) => a.axis === it.axis && a.domain === it.domain) ? "아직" : "") : "";
        return `<tr><td class="w22">${E(d.axisName(it.axis))}</td><td>${E(it.ask)}</td><td class="w18 mut">${E(d.name(it.domain))}${st ? ` · ${E(st)}` : ""}</td></tr>`;
      }).join("")}</tbody></table>` + band("다른 직무와 다른 점", E(differs.join(" ")))));
  }
  if (depth >= 2) {
    if (g) {
      const prac = AXES.map((a) => ({ a, p: g.practice[a] })).filter((z) => z.p);
      out.push(P(`${r.name_ko} · 판단과 연습`,
        T(`${E(r.name_ko)}에서 판단 여덟 가지는 이렇게 연습합니다`, "직무 안내의 연습 과제 옆에 참여자의 지금 단계를 붙였습니다. 단계가 낮은 줄부터 연습하면 됩니다.") +
        `<table class="tb tb-xs"><thead><tr><th>판단</th><th>지금 단계</th><th>연습 과제</th><th>남길 것</th></tr></thead><tbody>${prac.map(({ a, p }) => {
          const vs = r.core_ref.td.map((t) => d.level(t, a)).filter((v): v is Level => v !== null);
          return `<tr><td class="w18"><b>${E(d.axisName(a))}</b></td><td class="w18">${pip(vs.length ? (Math.max(...vs) as Level) : null)}</td><td>${E(p!.task)}<br><span class="mut">확인: ${E(p!.check)}</span></td><td class="w18"><b>${E(p!.output)}</b></td></tr>`;
        }).join("")}</tbody></table>` +
        H("이번 학기에 고른 연습 하나", "참여자가 채웁니다") + `<div class="g3">${lines(2, "어느 판단을")}${lines(2, "어느 과제에서")}${lines(2, "무엇으로 남길지")}</div>` +
        band("고르는 법", "단계 칸이 가장 짧은 줄부터 고릅니다. 이미 ‘기준까지’인 줄은 결과물을 정리해 포트폴리오로 옮기면 됩니다.")));
    } else {
      const rowsP = AXES.map((a) => {
        const td = r.core_ref.td.find((t) => d.def(t)?.axes?.[a]) ?? r.core_ref.td[0];
        const vs = r.core_ref.td.map((t) => d.level(t, a)).filter((v): v is Level => v !== null);
        return { a, td, l2: d.def(td)?.axes?.[a]?.l2 ?? "", lv: vs.length ? (Math.max(...vs) as Level) : null, req: r.required_axes.includes(a) };
      });
      out.push(P(`${r.name_ko} · 핵심 영역에서 하는 판단`,
        T(`${E(r.name_ko)}의 핵심 영역에서 판단 여덟 가지는 이런 일로 나타납니다`, "전공 사전에 적힌 일의 모습입니다. 옆 칸은 참여자의 지금 단계이고, 이 직무가 특히 보는 판단에는 표시를 했습니다.") +
        `<table class="tb tb-xs"><thead><tr><th>판단</th><th>지금 단계</th><th>핵심 영역에서 하는 일</th></tr></thead><tbody>${rowsP.map((p) => `<tr><td class="w22"><b>${E(d.axisName(p.a))}</b>${p.req ? ` <span class="mut sm">특히 봄</span>` : ""}</td><td class="w18">${pip(p.lv)}</td><td>${E(okOr(p.l2))} <span class="mut">(${E(d.name(p.td))})</span></td></tr>`).join("")}</tbody></table>` +
        H("이번 학기에 고른 연습 하나", "참여자가 채웁니다") + `<div class="g3">${lines(2, "어느 판단을")}${lines(2, "어느 과제에서")}${lines(2, "무엇으로 남길지")}</div>` +
        band("고르는 법", "‘특히 봄’ 표시가 있는 판단 가운데 단계가 낮은 줄부터 고릅니다.")));
    }
  }
  if (depth >= 3 && g) {
    const fp = g.firstProject;
    out.push(P(`${r.name_ko} · 첫 프로젝트와 배울 순서`,
      T(`첫 프로젝트: ${E(fp.title)}`, E(fp.goal)) +
      chain(fp.steps.slice(0, 4).map((s, i) => ({ head: `${i + 1}단계`, body: s, color: [PAL.blue, PAL.teal, PAL.amber, PAL.coral][i % 4] })), { width: 700, height: 150 }) +
      `<div class="two">
        <div class="card">${H("완료 기준")}<p class="big">${E(fp.check)}</p><p class="mut">남길 것: ${E(fp.output)}</p></div>
        <div class="card">${H("배울 순서")}<ol class="lo">${g.learnOrder.slice(0, 4).map((l) => `<li><b>${E(l.step)}</b><span>${E(l.why)}</span></li>`).join("")}</ol></div>
      </div>` +
      `<div class="two">${note("공고에서 볼 것", ul(g.postingCheck.slice(0, 3).map(E)))}${note("알아 둘 것", E(g.watch), true)}</div>` +
      H("포트폴리오에 넣을 것") + chips(g.portfolio.slice(0, 6), "art")));
  }
  return out;
}

export function othersPages(x: Inputs, d: X, roles: RolePack[]): Page[] {
  if (!roles.length) return [];
  return paginate(roles, () => 1, 4).map((chunk, k) => P(`그 밖의 직무${k ? ` (${k + 1})` : ""}`,
    T(k ? "그 밖의 직무 · 이어서" : `나머지 ${roles.length}개 직무도 정리했습니다`, "지금 근거가 적거나 관심 목록에 없는 직무입니다. 관심이 생기면 들어가는 길 하나부터 해 보면 됩니다.") +
    `<div class="g2">${chunk.map((r) => {
      const g = x.guide.roles[r.code];
      const c = d.roleCover(r);
      return `<div class="card"><h4>${E(r.name_ko)}</h4><p>${E(g ? g.summary : polite(r.owns))}</p><p class="k" style="margin-top:2mm">핵심 영역</p><p>${r.core_ref.td.map((t) => dz(d, t)).join(" ")}</p><p class="k" style="margin-top:2mm">특히 보는 판단</p><p>${c.req.map((q0) => `${E(d.axisName(q0.axis))} ${pip(q0.level)}`).join("<br>")}</p><p class="k" style="margin-top:2mm">${g ? "들어가는 길" : "지원 서류에 쓰는 결과물"}</p>${g ? ul(g.entry.slice(0, 2).map(E)) : `<p class="mut">${E(r.application_material.slice(0, 3).join(" · "))}</p>`}</div>`;
    }).join("")}</div>`));
}

export function aliasPages(x: Inputs, d: X): Page[] {
  const al = x.tax.job_aliases;
  if (!al.length) return [];
  const rf = (c: string) => x.tax.role_functions.find((v) => v.code === c)?.name ?? "";
  const oc = (c: string) => x.tax.org_contexts.find((v) => v.code === c)?.name ?? "";
  return paginate(al, (a) => Math.max(2 + rowsOf(a.oc.map(oc).join(", "), 22), rowsOf(a.distinguisher, 20), a.td.length), 36, 28).map((chunk, k) => P(`공고에 적히는 직무 이름${k ? ` (${k + 1})` : ""}`,
    (k ? `<p class="k">공고에 적히는 직무 이름 · 이어서</p>` : T("공고에서 만나는 직무 이름이 어느 영역의 일인지 정리했습니다", `채용 공고의 직무 이름은 회사마다 다릅니다. 같은 이름이라도 맡는 권한이 다르므로, 마지막 칸의 ‘가르는 기준’으로 공고 내용을 읽습니다. 영역 옆 점은 참여자의 묶음 색입니다.`)) +
    `<table class="tb tb-xs"><thead><tr><th class="w22">공고 이름</th><th class="w24">영역</th><th>하는 일 · 조직</th><th class="w30">가르는 기준</th></tr></thead><tbody>${chunk.map((a) => `<tr><td><b>${E(a.posting_name)}</b></td><td>${a.td.map((t) => dz(d, t)).join(" ")}</td><td>${E(a.rf.map(rf).join(", "))}<br><span class="mut">${E(a.oc.map(oc).join(", "))}</span></td><td>${E(okText(a.distinguisher) ? polite(a.distinguisher) : "")}</td></tr>`).join("")}</tbody></table>` +
    band("직업정보", "공고 이름은 직무 일반의 안내입니다. 특정 회사의 채용 공고를 가리키지 않습니다.")));
}

export function boundaryPages(x: Inputs, d: X): Page[] {
  /* 물은 영역이나 관심이 높은 영역이 걸린 경계를 먼저, 여덟까지 */
  const rel = (td: string) => { const z = d.dom(td); return (z && d.asked(z) ? 2 : 0) + (z?.interest === "HIGH" ? 1 : 0); };
  const bs = x.tax.boundaries.filter((b) => [b.a_question, b.b_question, ...[b.shared, b.a_difference, b.b_difference].map(polite)].every(okText))
    .map((b, i) => ({ b, i, w: rel(b.a.td) + rel(b.b.td) })).sort((p, q0) => q0.w - p.w || p.i - q0.i).slice(0, 8).map((v) => v.b);
  if (!bs.length) return [];
  const side = (td: string, diff: string, ques: string) => `<div class="b4" style="--c:${ZC[d.dom(td)?.zone ?? "NOT_EXPLORED"] === "#cfd5df" ? "#8c97ab" : ZC[d.dom(td)?.zone ?? "NOT_EXPLORED"]}"><b>${E(d.name(td))}</b><p>${E(polite(diff))}</p><p class="mut">스스로 묻기: ${E(ques)}?</p></div>`;
  return paginate(bs, () => 1, 4, 4).map((chunk, k) => P(`가까운 두 일의 경계${k ? ` (${k + 1})` : ""}`,
    (k ? `<p class="k">가까운 두 일의 경계 · 이어서</p>` : T("가까운 두 일은 책임지는 것에서 갈립니다", "같은 일을 나눠 맡는 두 영역을 나란히 놓았습니다. 아래 질문에 ‘예’라고 답할 수 있는 쪽이 지금 더 설명할 수 있는 쪽입니다. 색은 참여자의 묶음입니다.")) +
    chunk.map((b) => `<div class="card"><p class="k">${E(b.pair)}</p><p class="sm">함께 하는 일: ${E(polite(b.shared))}</p><div class="two" style="margin-top:2mm">${side(b.a.td, b.a_difference, b.a_question)}${side(b.b.td, b.b_difference, b.b_question)}</div></div>`).join("")));
}

export function industryDeep(x: Inputs, d: X): Page[] {
  const p = d.goalInd ?? d.indOrder[0];
  if (!p) return [];
  const ic = x.m.industry_context?.code === p.code ? x.m.industry_context : null;
  const dims = p.judgement_dimensions;
  const pages: Page[] = [];
  pages.push(P(`${p.name_ko}에서 보는 판단`,
    T(`${E(p.name_ko)}에서는 이런 판단을 먼저 봅니다`, E(okOr(p.scene, okOr(p.result_line)))) +
    chips(p.demands.filter(okText).slice(0, 4).map((t) => t.replace(/\.$/, ""))) +
    `<table class="tb tb-xs"><thead><tr><th>이 산업이 보는 판단</th><th>영역</th><th>왜</th><th>지금 단계</th></tr></thead><tbody>${dims.filter((v) => okText(v.name)).slice(0, 12).map((v) => `<tr><td><b>${E(askNoun(v.name))}</b></td><td>${E(d.name(v.domain))}</td><td class="mut">${E(okOr(v.why))}</td><td>${pip(d.level(v.domain, v.axis))}</td></tr>`).join("")}</tbody></table>` +
    band("읽는 법", `${dims.length}가지 가운데 지금 ‘직접 수행’ 이상인 것은 ${dims.filter((v) => (d.level(v.domain, v.axis) ?? -1) >= 2).length}가지입니다. ${d.goalInd ? "고른 산업이라 이 쪽을 먼저 실었습니다." : "산업을 고르지 않아 산업팩의 첫 산업으로 읽었습니다."}`)));
  const gaps = x.m.gaps.map((g) => g.axis).filter((a): a is Axis => !!a);
  const lang = [...new Set(gaps)].map((a) => ({ a, t: p.gap_language?.[a] })).filter((v) => okText(v.t)).slice(0, 4);
  const reading = (p.evidence_reading ?? []).filter((v) => okText(v.same) && okText(v.reads_as)).slice(0, 5);
  pages.push(P(`${p.name_ko}의 말로 다시 읽기`,
    T(`같은 경험도 ${E(p.name_ko)}에서는 다른 말로 읽힙니다`, E(okOr(p.result_line, "수업과 과제에서 한 일이 이 산업에서 어떤 말로 읽히는지 산업팩에서 옮겼습니다."))) +
    (reading.length ? H("이 산업에서 읽히는 말", "산업팩") + `<table class="tb tb-s"><thead><tr><th class="w34">수업과 과제에서 한 일</th><th>이 산업에서 읽히는 말</th></tr></thead><tbody>${reading.map((v) => `<tr><td>${E(v.same)}</td><td>${E(v.reads_as)}</td></tr>`).join("")}</tbody></table>` : "") +
    (lang.length ? H("비어 있는 판단을 이 산업의 말로") + ul(lang.map((v) => `<b>${E(d.axisName(v.a))}</b> ${E(polite(v.t!))}`)) : "") +
    `<div class="two">
      ${note("이 산업 문항으로 확인된 것", ic?.answered?.length ? ul(ic.answered.slice(0, 5).map((v) => `${E(v.domain ? d.name(v.domain) : "")} · ${E(v.axis ? d.axisName(v.axis) : "")}${v.owned ? " (직접 정함)" : ""}`)) : "이 산업의 문항은 고른 산업에서만 묻습니다.")}
      ${note("공고에서 자주 보는 이름", chips((p.job_aliases ?? []).slice(0, 6)) || "적힌 이름이 없습니다.", true)}
    </div>` + (p.vocabulary?.length ? H("이 산업에서 쓰는 말") + chips(p.vocabulary.slice(0, 10)) : "")));
  return pages;
}

export function industriesPage(x: Inputs, d: X): Page {
  const rows = d.indOrder.map((p) => {
    const rel = x.rel.td_industry.filter((r) => r.industry === p.code && r.strength === "중심").map((r) => r.td);
    const have = rel.filter((t) => ["Z1_EVIDENCE_ESTABLISHED", "Z2_EVIDENCE_INCOMPLETE", "Z3_EVIDENCE_LOW_INTEREST"].includes(d.dom(t)?.zone ?? ""));
    return { p, rel, have };
  });
  return P(`${x.major} 전공이 가는 산업`,
    T(`${E(x.major)} 전공이 일하는 산업 ${rows.length}곳과 그 산업이 쓰는 영역입니다`, "산업마다 중심으로 쓰는 영역을 관계표에서 옮기고, 그 가운데 참여자가 해 본 일이 확인된 영역을 표시했습니다. 산업을 고르지 않았어도 모두 볼 수 있습니다.") +
    `<table class="tb tb-xs"><thead><tr><th class="w22">산업</th><th>중심으로 쓰는 영역</th><th class="w30">그 산업에서 먼저 묻는 것</th></tr></thead><tbody>${rows.map((r) => `<tr><td><b>${E(r.p.name_ko)}</b>${d.goalInd?.code === r.p.code ? ` <span class="mut sm">고른 산업</span>` : ""}</td><td>${r.rel.map((t) => dz(d, t)).join(" ") || "<span class='mut'>관계표에 없음</span>"}</td><td class="mut">${E(askNoun(r.p.judgement_dimensions[0]?.name ?? ""))}</td></tr>`).join("")}</tbody></table>` +
    band("읽는 법", `해 본 일이 확인된 영역을 중심으로 쓰는 산업이 ${rows.filter((r) => r.have.length).length}곳입니다. 점의 색이 파랑이나 초록이면 그 산업에서 지금 근거로 설명할 수 있는 영역입니다.`));
}

export function orgPage(x: Inputs, d: X): Page {
  const td = d.strengths[0]?.code ?? d.radarDoms[0]?.code ?? x.defs[0].code;
  const oo = d.def(td)?.org_outcomes ?? {};
  const goalOc = x.m.targets.goal.org;
  return P("일하는 자리마다 다른 기준",
    T(`같은 ${E(d.name(td))}의 일도 일하는 자리에 따라 평가 기준이 다릅니다`, "조직의 성격 일곱 가지와, 그 자리에서 이 영역의 일이 무엇으로 평가되는지를 전공 사전에서 옮겼습니다. 유형마다의 일반 안내이고, 특정 기관의 평가 지표는 싣지 않았습니다.") +
    `<table class="tb tb-xs"><thead><tr><th class="w22">일하는 자리</th><th class="w24">무엇으로 평가되나</th><th>그 자리의 특징</th><th class="w24">${E(d.name(td))}의 결과</th></tr></thead><tbody>${x.tax.org_contexts.map((o) => `<tr><td><b>${E(o.name)}</b>${goalOc === o.code ? ` <span class="mut sm">고른 자리</span>` : ""}</td><td>${E(o.performance)}</td><td class="mut">${E(okText(o.differs) ? polite(o.differs) : "")}</td><td>${E(okOr(oo[o.code]))}</td></tr>`).join("")}</tbody></table>` +
    H("하는 일의 갈래", "직무를 가르는 또 하나의 축") +
    `<table class="tb tb-xs"><tbody>${x.tax.role_functions.map((f) => `<tr><th class="w22">${E(f.name)}</th><td>${E(polite(f.one_line))}</td><td class="mut w34">남기는 것: ${E(f.output_kind)}</td></tr>`).join("")}</tbody></table>`);
}

export function ch4Pages(x: Inputs, d: X): Page[] {
  const out: Page[] = [matrixPage(x, d), coveragePage(x, d)];
  const [r0, r1, r2, ...rest] = d.roleOrder;
  if (r0) out.push(...rolePages(x, d, r0, 3));
  if (r1) out.push(...rolePages(x, d, r1, 2));
  if (r2) out.push(...rolePages(x, d, r2, x.guide.roles[r2.code] ? 2 : 1));
  out.push(...othersPages(x, d, rest));
  out.push(...aliasPages(x, d), ...boundaryPages(x, d), ...industryDeep(x, d), industriesPage(x, d), orgPage(x, d));
  return out;
}
