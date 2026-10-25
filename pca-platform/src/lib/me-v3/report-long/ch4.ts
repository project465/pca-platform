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
import { andJoin, asSentence, askNoun, j, okOr, okText, polite, politePara, q } from "./text";

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
    T(`${E(x.major)} 대표 직무 ${roles.length}개와 ${d.counts.domains}가지 ${E(j(x.domainWord, "을를"))} 한 표에 겹쳐 봤습니다`, "진한 칸은 그 직무가 주로 하는 일이고, 파란색에 가까울수록 참여자가 해 본 일이 많이 확인된 영역입니다. ● 표시는 그 직무의 핵심 영역입니다.") +
    `<div class="wide-art">${heat(roles.map((p) => p.name_ko), x.m.domains.map((z) => d.name(z.code)), cell, { width: 710, label: 120, head: 92, row: 34, colWrap: 5 })}</div>` +
    `<div class="lg"><span><i style="background:${PAL.blue}"></i>중심 업무 · 결과물까지 확인</span><span><i style="background:${PAL.teal}"></i>중심 업무 · 해 본 일 있음</span><span><i style="background:${PAL.amber}"></i>중심 업무 · 아직 해 보기 전</span><span><i style="background:#a9c1f2"></i>함께 하는 업무 · 결과물까지 확인</span><span><i style="background:#f8d9b3"></i>함께 하는 업무 · 아직 해 보기 전</span></div>` +
    band("읽는 법", "직무마다 어느 영역을 주로 쓰는지는 업계에서 일반적으로 나누는 방식을 따랐고, 그 위에 참여자의 응답을 색으로 얹었습니다. 관심 있는 직무 줄에서 ● 칸의 색을 보면, 그 직무 면접에서 바로 꺼낼 경험이 있는 영역이 어디인지 보입니다."));
}

export function coveragePage(x: Inputs, d: X): Page {
  const rows = d.roleOrder.map((r) => d.roleCover(r));
  const n2 = rows.filter((r) => r.z1.length + r.z2.length >= 2).length;
  const n1 = rows.filter((r) => r.z1.length + r.z2.length === 1).length;
  const head = n2 ? `${rows.length}개 직무 가운데 ${n2}개는 핵심 영역 두 곳 이상에서 해 본 일이 확인됩니다`
    : n1 ? `${rows.length}개 직무 가운데 ${n1}개 직무에서 핵심 영역 한 곳의 경험이 확인됩니다`
    : `직무마다 핵심 영역을 어디까지 해 봤는지 정리했습니다`;
  return P("직무별로 갖춘 근거",
    T(head, "직무마다 핵심 영역 몇 곳에서 해 본 일이 확인됐는지와, 그 직무가 특히 따지는 판단을 어디까지 해 봤는지 나란히 놓았습니다. 목표 직무, 관심 직무, 경험이 확인된 영역이 많은 직무 순서입니다.") +
    `<div class="wide-art">${hbars(rows.map((r) => ({ label: r.role.name_ko, value: r.z1.length + r.z2.length * 0.5, color: r.z1.length >= 2 ? PAL.blue : r.z1.length + r.z2.length >= 1 ? PAL.teal : "#c9ced8", note: `결과물까지 ${r.z1.length} · 해 본 일 ${r.z2.length} / 핵심 ${r.tds.length}` })), { max: Math.max(3, ...rows.map((r) => r.tds.length)), width: 700, label: 130, row: 34, valueText: (b) => String((b as { note?: string }).note ?? "") })}</div>` +
    `<table class="tb tb-xs"><thead><tr><th>직무</th><th>핵심 영역</th><th>특히 보는 판단과 지금 단계</th></tr></thead><tbody>${rows.map((r) => `<tr><td><b>${E(r.role.name_ko)}</b></td><td>${r.tds.map((t) => dz(d, t)).join(" ")}</td><td>${r.req.map((q0) => `${E(d.axisName(q0.axis))} ${pip(q0.level)}`).join("<br>")}</td></tr>`).join("")}</tbody></table>` +
    `<p class="mut sm">막대 길이는 결과물까지 확인된 영역을 1, 해 본 일만 있는 영역을 0.5로 쳐서 더한 개수입니다.</p>`);
}

function reqRows(x: Inputs, d: X, r: RolePack) {
  return r.required_axes.map((a) => {
    const vs = r.core_ref.td.map((t) => d.level(t, a)).filter((v): v is Level => v !== null);
    const lv = vs.length ? (Math.max(...vs) as Level) : null;
    return { label: d.axisName(a), value: lv ?? 0, color: LVC[Math.max(1, lv ?? 0)], note: lv == null ? "이번에 묻지 않음" : STEP_WORD[lv].tag };
  });
}

/** 직무 하나의 쪽들. depth: 1 = 하는 일 · 2 = 판단과 연습까지 · 3 = 첫 프로젝트까지
 *
 * 연습 칸은 빈 줄로 두지 않고 단계가 가장 낮은 줄을 골라 미리 적는다. 쓰는 줄은
 * 첫 직무(depth 3)의 '어느 과제에서 할지' 하나뿐이다(이 장의 쓰는 칸은 그 한 곳). */
export function rolePages(x: Inputs, d: X, r: RolePack, depth: number): Page[] {
  const g: RoleGuide | undefined = x.guide.roles[r.code];
  const out: Page[] = [];
  const isGoal = d.goalRole?.code === r.code;
  const ctx = x.m.role_context?.code === r.code ? x.m.role_context : null;
  const differs = r.differs_from.filter((v) => okText(v.line)).map((v) => `${j(d.roleName(v.vs), "과와")} 다른 점: ${polite(v.line)}`);
  const diffBand = differs.length ? band("다른 직무와 다른 점", E(differs.join(" "))) : "";
  const goalLead = isGoal ? "목표로 적어 주신 직무입니다. " : "";
  const top = (a: Axis) => { const vs = r.core_ref.td.map((t) => d.level(t, a)).filter((v): v is Level => v !== null); return vs.length ? (Math.max(...vs) as Level) : null; };
  const where = depth >= 3 ? lines(2, "어느 수업이나 과제에서 할지") : "";
  if (g) {
    const resp = g.responsibilities.slice(0, 5), know = [...g.knowledge.slice(0, 4).map(E), ...g.tools.slice(0, 3).map((t) => `<span class="mut">${E(t)}</span>`)];
    const entry = g.entry.slice(0, 3);
    out.push(P(`${r.name_ko} · 하는 일`,
      T(`${E(j(r.name_ko, "은는"))} ${E(asSentence(g.summary))}`, `${goalLead}핵심 영역은 ${E(andJoin(r.core_ref.td.map(d.name)))}${r.decides.length ? `이고, 이 직무에서는 ${E(j(r.decides.slice(0, 3).join(", "), "을를"))} 정합니다.` : "입니다."}`) +
      (g.process.length ? H("일이 흘러가는 순서", "직무 안내") + chain(g.process.slice(0, 6).map((s, i) => ({ head: s.step, body: s.what, color: CYC[i % CYC.length] })), { width: 700, height: 150 }) : "") +
      ((resp.length || know.length) ? `<div class="two">
        ${resp.length ? `<div class="card">${H("주로 맡는 일")}${ul(resp.map(E))}</div>` : ""}
        ${know.length ? `<div class="card">${H("알아야 할 것 · 쓰는 도구")}${ul(know)}</div>` : ""}
      </div>` : "") +
      `<div class="two">
        <div class="card">${H("이 직무가 특히 보는 판단", "지금 단계")}${hbars(reqRows(x, d, r), { max: 3, width: 340, label: 110, ticks: ["지시받아", "직접", "기준까지"], row: 42, valueText: (b) => String((b as { note?: string }).note ?? "") })}</div>
        ${entry.length ? `<div class="card">${H("들어가는 길", "학교 안에서")}${ul(entry.map(E))}</div>` : ""}
      </div>` + diffBand));
  } else {
    const items = (r.items ?? []).slice(0, 7);
    const mats = r.application_material.slice(0, 3);
    out.push(P(`${r.name_ko} · 하는 일`,
      T(`${E(j(r.name_ko, "은는"))} ${E(polite(r.owns))}`, `${goalLead}핵심 영역은 ${E(andJoin(r.core_ref.td.map(d.name)))}입니다.${mats.length ? ` 지원 서류에서는 ${E(j(andJoin(mats), "을를"))} 결과물로 보여 주면 됩니다.` : ""}`) +
      `<div class="two">
        <div class="card">${H("이 직무가 정하는 것", "직무팩")}${chips(r.decides)}<p class="k" style="margin-top:3mm">핵심 영역</p><p>${r.core_ref.td.map((t) => dz(d, t)).join(" ")}</p>${r.application_material.length ? `<p class="k" style="margin-top:3mm">지원 서류에 쓰는 결과물</p>${chips(r.application_material, "art")}` : ""}</div>
        <div class="card">${H("이 직무가 특히 보는 판단", "지금 단계")}${hbars(reqRows(x, d, r), { max: 3, width: 340, label: 110, ticks: ["지시받아", "직접", "기준까지"], row: 42, valueText: (b) => String((b as { note?: string }).note ?? "") })}</div>
      </div>` +
      (items.length ? H("이 직무에서 묻는 판단", ctx ? "직무 문항 · 답한 내용" : "직무 문항") +
      `<table class="tb tb-xs"><tbody>${items.map((it) => {
        const ans = ctx?.answered.find((a) => a.axis === it.axis && a.domain === it.domain);
        const st = ctx ? (ans ? (ans.owned ? "직접 정함" : "해 봄") : ctx.not_yet.some((a) => a.axis === it.axis && a.domain === it.domain) ? "아직" : "") : "";
        return `<tr><td class="w22">${E(d.axisName(it.axis))}</td><td>${E(it.ask)}</td><td class="w18 mut">${E(d.name(it.domain))}${st ? ` · ${E(st)}` : ""}</td></tr>`;
      }).join("")}</tbody></table>` : "") + diffBand));
  }
  if (depth >= 2) {
    if (g) {
      const prac = AXES.map((a) => ({ a, p: g.practice[a], lv: top(a) })).filter((z) => z.p);
      /* 단계가 가장 낮은 줄을 이번 학기 연습으로 미리 고른다. 묻지 않은 줄뿐이면 직무 안내의 첫 줄을 쓴다 */
      const known = prac.filter((z) => z.lv !== null).sort((p, q0) => (p.lv ?? 0) - (q0.lv ?? 0));
      const pick = known[0] ?? prac[0];
      out.push(P(`${r.name_ko} · 판단과 연습`,
        T(`${E(r.name_ko)}에서 해 볼 수 있는 연습을 판단별로 정리했습니다`, "직무 안내에 있는 연습 과제 옆에 참여자가 지금 어디까지 해 봤는지를 붙였습니다. 아직 해 보지 않은 줄부터 하나 골라 이번 학기 과제에 붙여 보세요.") +
        (prac.length ? `<table class="tb tb-xs"><thead><tr><th>판단</th><th>지금 단계</th><th>연습 과제</th><th>남길 것</th></tr></thead><tbody>${prac.map(({ a, p, lv }) =>
          `<tr><td class="w18"><b>${E(d.axisName(a))}</b></td><td class="w18">${pip(lv)}</td><td>${E(p!.task)}<br><span class="mut">확인: ${E(p!.check)}</span></td><td class="w18"><b>${E(p!.output)}</b></td></tr>`).join("")}</tbody></table>` : "") +
        (pick ? H("이번 학기에 먼저 해 볼 연습", known.length ? "지금 단계가 가장 낮은 줄에서 골랐습니다" : "직무 안내의 첫 줄에서 골랐습니다") +
          `<div class="two">${note(pick.lv == null ? d.axisName(pick.a) : `${d.axisName(pick.a)} · 지금 ${STEP_WORD[pick.lv].tag}`, E(pick.p!.task))}${note("끝나면 남길 것", `${E(pick.p!.output)} <span class="mut">(확인: ${E(pick.p!.check)})</span>`, true)}</div>` + where : "") +
        (prac.some((z) => z.lv === 3) ? band("다른 줄을 고를 때", "이미 ‘기준까지’에 닿은 줄은 새 연습보다 그때 남긴 결과물을 정리해 포트폴리오에 넣는 편이 낫습니다.") : "")));
    } else {
      const rowsP = AXES.map((a) => {
        const td = r.core_ref.td.find((t) => d.def(t)?.axes?.[a]) ?? r.core_ref.td[0];
        return { a, td, l2: d.def(td)?.axes?.[a]?.l2 ?? "", lv: top(a), req: r.required_axes.includes(a) };
      });
      const pick = [...rowsP].filter((p) => okText(p.l2)).sort((p, q0) => Number(q0.req) - Number(p.req) || (p.lv ?? -1) - (q0.lv ?? -1))[0];
      out.push(P(`${r.name_ko} · 핵심 영역에서 하는 판단`,
        T(`${E(r.name_ko)}의 핵심 영역에서 실제로 하는 판단입니다`, "전공 사전에 적힌 일의 모습과 참여자의 지금 단계를 나란히 놓았습니다. ‘특히 봄’ 표시는 이 직무가 더 꼼꼼히 따지는 판단입니다.") +
        `<table class="tb tb-xs"><thead><tr><th>판단</th><th>지금 단계</th><th>핵심 영역에서 하는 일</th></tr></thead><tbody>${rowsP.map((p) => `<tr><td class="w22"><b>${E(d.axisName(p.a))}</b>${p.req ? ` <span class="mut sm">특히 봄</span>` : ""}</td><td class="w18">${pip(p.lv)}</td><td>${E(okOr(p.l2))} <span class="mut">(${E(d.name(p.td))})</span></td></tr>`).join("")}</tbody></table>` +
        (pick ? H("이번 학기에 먼저 해 볼 연습", pick.req ? "‘특히 봄’ 표시가 있는 줄에서 골랐습니다" : "지금 단계가 가장 낮은 줄에서 골랐습니다") +
          note(`${d.axisName(pick.a)} · ${d.name(pick.td)}`, `수업 과제나 실습에서 ${E(q(pick.l2))} 정도의 몫을 한 번 직접 맡아 보세요. 끝나면 그때 남은 문서를 경험 기록에 올려 두면 됩니다.`) + where : "")));
    }
  }
  if (depth >= 3 && g) {
    const fp = g.firstProject;
    const post = g.postingCheck.slice(0, 3);
    const side = [post.length ? note("공고에서 볼 것", ul(post.map(E))) : "", okText(g.watch) ? note("알아 둘 것", E(politePara(g.watch)), true) : ""].filter(Boolean);
    out.push(P(`${r.name_ko} · 첫 프로젝트와 배울 순서`,
      T(`첫 프로젝트: ${E(fp.title)}`, E(fp.goal)) +
      (fp.steps.length ? chain(fp.steps.slice(0, 4).map((s, i) => ({ head: `${i + 1}단계`, body: s, color: [PAL.blue, PAL.teal, PAL.amber, PAL.coral][i % 4] })), { width: 700, height: 150 }) : "") +
      `<div class="two">
        <div class="card">${H("다 됐다고 볼 기준")}<p class="big">${E(fp.check)}</p><p class="mut">남길 것: ${E(fp.output)}</p></div>
        ${g.learnOrder.length ? `<div class="card">${H("배울 순서")}<ol class="lo">${g.learnOrder.slice(0, 4).map((l) => `<li><b>${E(l.step)}</b><span>${E(l.why)}</span></li>`).join("")}</ol></div>` : ""}
      </div>` +
      (side.length === 2 ? `<div class="two">${side.join("")}</div>` : side.join("")) +
      (g.portfolio.length ? H("포트폴리오에 넣을 것") + chips(g.portfolio.slice(0, 6), "art") : "")));
  }
  return out;
}

export function othersPages(x: Inputs, d: X, roles: RolePack[]): Page[] {
  if (!roles.length) return [];
  return paginate(roles, () => 1, 4).map((chunk, k) => P(`그 밖의 직무${k ? ` (${k + 1})` : ""}`,
    (k ? T("그 밖의 직무 · 이어서") : T(`관심 목록 밖의 직무 ${roles.length}개도 살펴보세요`, "지금 경험이 적거나 관심 직무로 고르지 않은 직무들입니다. 마음이 가는 직무가 있다면 ‘들어가는 길’에 적힌 활동 하나부터 시작하면 됩니다.")) +
    `<div class="g2">${chunk.map((r) => {
      const g = x.guide.roles[r.code];
      const c = d.roleCover(r);
      return `<div class="card"><h4>${E(r.name_ko)}</h4><p>${E(g ? g.summary : polite(r.owns))}</p><p class="k" style="margin-top:2mm">핵심 영역</p><p>${r.core_ref.td.map((t) => dz(d, t)).join(" ")}</p>${c.req.length ? `<p class="k" style="margin-top:2mm">특히 보는 판단</p><p>${c.req.map((q0) => `${E(d.axisName(q0.axis))} ${pip(q0.level)}`).join("<br>")}</p>` : ""}${g && g.entry.length ? `<p class="k" style="margin-top:2mm">들어가는 길</p>${ul(g.entry.slice(0, 2).map(E))}` : !g && r.application_material.length ? `<p class="k" style="margin-top:2mm">지원 서류에 쓰는 결과물</p><p class="mut">${E(r.application_material.slice(0, 3).join(" · "))}</p>` : ""}</div>`;
    }).join("")}</div>`));
}

export function aliasPages(x: Inputs, d: X): Page[] {
  const al = x.tax.job_aliases;
  if (!al.length) return [];
  const rf = (c: string) => x.tax.role_functions.find((v) => v.code === c)?.name ?? "";
  const oc = (c: string) => x.tax.org_contexts.find((v) => v.code === c)?.name ?? "";
  return paginate(al, (a) => Math.max(2 + rowsOf(a.oc.map(oc).join(", "), 22), rowsOf(a.distinguisher, 20), a.td.length), 36, 28).map((chunk, k, all) => P(`공고에 적히는 직무 이름${k ? ` (${k + 1})` : ""}`,
    (k ? `<p class="k">공고에 적히는 직무 이름 · 이어서</p>` : T("공고에서 만나는 직무 이름이 어느 영역의 일인지 정리했습니다", `회사마다 같은 일을 다른 이름으로 뽑고, 이름이 같아도 맡기는 권한이 다릅니다. 공고를 읽을 때는 마지막 칸의 ‘가르는 기준’에 비춰 담당 업무 문장을 확인해 보세요. 영역 옆 점의 색은 참여자의 영역 묶음입니다.`)) +
    `<table class="tb tb-xs"><thead><tr><th class="w22">공고 이름</th><th class="w24">영역</th><th>하는 일 · 조직</th><th class="w30">가르는 기준</th></tr></thead><tbody>${chunk.map((a) => `<tr><td><b>${E(a.posting_name)}</b></td><td>${a.td.map((t) => dz(d, t)).join(" ")}</td><td>${E(a.rf.map(rf).join(", "))}<br><span class="mut">${E(a.oc.map(oc).join(", "))}</span></td><td>${E(okText(a.distinguisher) ? polite(a.distinguisher) : "")}</td></tr>`).join("")}</tbody></table>` +
    (k === all.length - 1 ? band("공고 찾을 때", "검색창에는 이 표의 공고 이름을 그대로 넣고, 검색 결과에서는 ‘담당 업무’ 칸부터 읽으세요. 표의 이름은 업계에서 흔히 쓰는 이름을 모은 것입니다.") : "")));
}

export function boundaryPages(x: Inputs, d: X): Page[] {
  /* 물은 영역이나 관심이 높은 영역이 걸린 경계를 먼저, 여덟까지 */
  const rel = (td: string) => { const z = d.dom(td); return (z && d.asked(z) ? 2 : 0) + (z?.interest === "HIGH" ? 1 : 0); };
  const bs = x.tax.boundaries.filter((b) => [b.a_question, b.b_question, ...[b.shared, b.a_difference, b.b_difference].map(polite)].every(okText))
    .map((b, i) => ({ b, i, w: rel(b.a.td) + rel(b.b.td) })).sort((p, q0) => q0.w - p.w || p.i - q0.i).slice(0, 6).map((v) => v.b);
  if (!bs.length) return [];
  const side = (td: string, diff: string, ques: string) => `<div class="b4" style="--c:${ZC[d.dom(td)?.zone ?? "NOT_EXPLORED"] === "#cfd5df" ? "#8c97ab" : ZC[d.dom(td)?.zone ?? "NOT_EXPLORED"]}"><b>${E(d.name(td))}</b><p>${E(polite(diff))}</p><p class="mut">스스로 묻기: ${E(ques)}?</p></div>`;
  return paginate(bs, () => 1, 4, 4).map((chunk, k) => P(`가까운 두 일의 경계${k ? ` (${k + 1})` : ""}`,
    (k ? `<p class="k">가까운 두 일의 경계 · 이어서</p>` : T("이웃한 두 영역이 어디서 갈리는지 정리했습니다", "같은 일을 나눠 맡는 두 영역을 나란히 놓았습니다. 칸마다 아래 질문에 ‘예’라고 답할 수 있다면, 그쪽이 지금 면접에서 더 자신 있게 이야기할 수 있는 영역입니다. 테두리 색은 참여자의 영역 묶음입니다.")) +
    chunk.map((b) => `<div class="card"><p class="k">${E(b.pair)}</p><p class="sm">함께 하는 일: ${E(polite(b.shared))}</p><div class="two" style="margin-top:2mm">${side(b.a.td, b.a_difference, b.a_question)}${side(b.b.td, b.b_difference, b.b_question)}</div></div>`).join("")));
}

export function industryDeep(x: Inputs, d: X): Page[] {
  const p = d.goalInd ?? d.indOrder[0];
  if (!p) return [];
  const ic = x.m.industry_context?.code === p.code ? x.m.industry_context : null;
  const dims = p.judgement_dimensions;
  const pages: Page[] = [];
  const shown = dims.filter((v) => okText(v.name)).slice(0, 12);
  const shownOk = shown.filter((v) => (d.level(v.domain, v.axis) ?? -1) >= 2).length;
  pages.push(P(`${p.name_ko}에서 보는 판단`,
    T(`${E(p.name_ko)}에서는 이런 판단을 먼저 봅니다`, E(okOr(p.scene, okOr(p.result_line)))) +
    chips(p.demands.filter(okText).slice(0, 4).map((t) => t.replace(/\.$/, ""))) +
    `<table class="tb tb-xs"><thead><tr><th>이 산업이 보는 판단</th><th>영역</th><th>왜</th><th>지금 단계</th></tr></thead><tbody>${shown.map((v) => `<tr><td><b>${E(askNoun(v.name))}</b></td><td>${E(d.name(v.domain))}</td><td class="mut">${E(okOr(v.why))}</td><td>${pip(d.level(v.domain, v.axis))}</td></tr>`).join("")}</tbody></table>` +
    band("읽는 법", `${d.goalInd ? `관심 산업으로 고르신 ${E(p.name_ko)}부터 실었습니다.` : `${E(j(p.name_ko, "을를"))} 예로 실었습니다. 다음 검사에서 관심 산업을 고르면 그 산업으로 바뀝니다.`} ${shownOk ? `표의 ${shown.length}가지 가운데 ${shownOk}가지는 이미 ‘직접 수행’ 이상입니다.` : "표 위쪽 줄부터 하나씩 수업 과제에 붙여 보세요."}`)));
  const gaps = x.m.gaps.map((g) => g.axis).filter((a): a is Axis => !!a);
  const lang = [...new Set(gaps)].map((a) => ({ a, t: p.gap_language?.[a] })).filter((v) => okText(v.t)).slice(0, 4);
  const reading = (p.evidence_reading ?? []).filter((v) => okText(v.same) && okText(v.reads_as)).slice(0, 5);
  /* 둘째 쪽은 덧붙일 거리로 둔다. 남은 자리가 있는 쪽에만 실린다 */
  pages.push({ kind: "fill", ...P(`${p.name_ko}의 말로 다시 읽기`,
    T(`같은 경험도 ${E(p.name_ko)}에서는 다른 말로 읽힙니다`, E(okOr(p.result_line, "수업과 과제에서 한 일을 이 산업에서는 어떤 말로 부르는지 모았습니다. 지원서에는 오른쪽 말로 옮겨 쓰면 됩니다."))) +
    (reading.length ? H("이 산업에서 읽히는 말", "산업팩") + `<table class="tb tb-s"><thead><tr><th class="w34">수업과 과제에서 한 일</th><th>이 산업에서 읽히는 말</th></tr></thead><tbody>${reading.map((v) => `<tr><td>${E(v.same)}</td><td>${E(v.reads_as)}</td></tr>`).join("")}</tbody></table>` : "") +
    (lang.length ? H("아직 채울 판단을 이 산업에서는 이렇게 부릅니다") + ul(lang.map((v) => `<b>${E(d.axisName(v.a))}</b> ${E(polite(v.t!))}`)) : "") +
    ((sideN) => (sideN.length === 2 ? `<div class="two">${sideN.join("")}</div>` : sideN.join("")))([
      ic?.answered?.length ? note("이 산업 문항으로 확인된 것", ul(ic.answered.slice(0, 5).map((v) => `${E(v.domain ? d.name(v.domain) : "")} · ${E(v.axis ? d.axisName(v.axis) : "")}${v.owned ? " (직접 정함)" : ""}`))) : "",
      (p.job_aliases ?? []).length ? note("공고에서 자주 보는 이름", chips((p.job_aliases ?? []).slice(0, 6)), true) : "",
    ].filter(Boolean)) + (p.vocabulary?.length ? H("이 산업에서 쓰는 말") + chips(p.vocabulary.slice(0, 10)) : "")) });
  return pages;
}

export function industriesPage(x: Inputs, d: X): Page {
  const rows = d.indOrder.map((p) => {
    const rel0 = x.rel.td_industry.filter((r) => r.industry === p.code && r.strength === "중심").map((r) => r.td);
    /* 관계표에 중심 영역이 없으면 그 산업이 보는 판단의 영역을 대신 적는다 */
    const rel = rel0.length ? rel0 : [...new Set(p.judgement_dimensions.map((v) => v.domain).filter(Boolean))].slice(0, 3);
    const have = rel.filter((t) => ["Z1_EVIDENCE_ESTABLISHED", "Z2_EVIDENCE_INCOMPLETE", "Z3_EVIDENCE_LOW_INTEREST"].includes(d.dom(t)?.zone ?? ""));
    return { p, rel, have };
  });
  return P(`${x.major} 전공이 가는 산업`,
    T(`${E(x.major)} 전공이 일하는 산업 ${rows.length}곳과 그 산업이 쓰는 영역입니다`, "산업마다 주로 쓰는 영역을 적고, 그중 참여자가 해 본 일이 확인된 영역에 색을 칠했습니다. 오른쪽 칸은 그 산업이 먼저 따지는 판단입니다.") +
    `<table class="tb tb-xs"><thead><tr><th class="w22">산업</th><th>중심으로 쓰는 영역</th><th class="w30">그 산업에서 먼저 묻는 것</th></tr></thead><tbody>${rows.map((r) => `<tr><td><b>${E(r.p.name_ko)}</b>${d.goalInd?.code === r.p.code ? ` <span class="mut sm">고른 산업</span>` : ""}</td><td>${r.rel.map((t) => dz(d, t)).join(" ")}</td><td class="mut">${E(askNoun(r.p.judgement_dimensions[0]?.name ?? ""))}</td></tr>`).join("")}</tbody></table>` +
    band("읽는 법", `${(() => { const k = rows.filter((r) => r.have.length).length; return k ? `해 본 일이 확인된 영역을 주로 쓰는 산업은 ${k}곳입니다. ` : ""; })()}영역 옆 점이 파랑이나 초록이면 그 산업 면접에서 바로 꺼낼 경험이 있는 영역입니다.`));
}

export function orgPage(x: Inputs, d: X): Page {
  const td = d.strengths[0]?.code ?? d.radarDoms[0]?.code ?? x.defs[0].code;
  const oo = d.def(td)?.org_outcomes ?? {};
  const goalOc = x.m.targets.goal.org;
  return P("일하는 자리마다 다른 기준",
    T(`같은 ${E(d.name(td))}의 일도 일하는 자리에 따라 평가 기준이 다릅니다`, `일하는 자리 ${x.tax.org_contexts.length}가지마다 ${E(d.name(td))}의 일을 무엇으로 평가하는지 정리했습니다. 자리의 성격별로 흔히 쓰는 기준이니, 실제 기관의 평가 방식은 그 기관의 공고와 누리집에서 한 번 더 확인해 보세요.`) +
    `<table class="tb tb-xs"><thead><tr><th class="w22">일하는 자리</th><th class="w24">무엇으로 평가되나</th><th>그 자리의 특징</th><th class="w24">${E(d.name(td))}의 결과</th></tr></thead><tbody>${x.tax.org_contexts.map((o) => `<tr><td><b>${E(o.name)}</b>${goalOc === o.code ? ` <span class="mut sm">고른 자리</span>` : ""}</td><td>${E(o.performance)}</td><td class="mut">${E(okText(o.differs) ? polite(o.differs) : "")}</td><td>${E(okOr(oo[o.code]))}</td></tr>`).join("")}</tbody></table>` +
    H("하는 일의 갈래", "같은 영역 안에서도 맡는 몫이 다릅니다") +
    `<table class="tb tb-xs"><tbody>${x.tax.role_functions.map((f) => `<tr><th class="w22">${E(f.name)}</th><td>${E(polite(f.one_line))}</td><td class="mut w34">남기는 것: ${E(f.output_kind)}</td></tr>`).join("")}</tbody></table>`);
}

export function ch4Pages(x: Inputs, d: X, roomy = false): Page[] {
  const out: Page[] = [matrixPage(x, d), coveragePage(x, d)];
  const [r0, r1, r2, ...rest] = d.roleOrder;
  if (r0) out.push(...rolePages(x, d, r0, 3));
  /* 지역 장이 없는 책은 둘째 직무를 두 쪽으로 싣는다(쪽 수를 70~80 안에 두려는 배분이다) */
  if (r1) out.push(...rolePages(x, d, r1, roomy ? 2 : 1));
  if (r2) out.push(...rolePages(x, d, r2, 1));
  out.push(...othersPages(x, d, rest));
  out.push(...aliasPages(x, d), ...boundaryPages(x, d), ...industryDeep(x, d), industriesPage(x, d), orgPage(x, d));
  return out;
}
