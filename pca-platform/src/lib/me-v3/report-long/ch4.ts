/**
 * 04 직무 탐색: 직무와 영역의 지도 · 직무별 근거 · 직무 깊이 보기 · 공고 이름 · 경계 · 산업 · 조직.
 *
 * 직무 설명은 그 전공의 직무 안내(`role-guide.v1`)를 읽는다. 안내가 없는 직무는
 * 직무팩과 영역 사전의 자료만으로 쪽을 세우고, 안내에만 있는 칸(첫 프로젝트 ·
 * 배울 순서 · 공고에서 볼 것)은 만들지 않는다.
 *
 * 읽는 사람은 학생 본인이다(docs/metri/report-writing-rules.md). 영역 묶음과 단계의 이름은
 * `ZONE_WORD` · `STEP_WORD` · `LEVEL_KO` 에서 읽고 여기서 다시 적지 않는다. 그래프마다
 * 바로 아래에 `howto` 를 붙이고, 넘기는 색은 그 그래프가 실제로 칠한 값과 같은 상수다.
 */
import type { Axis } from "../scoring/types";
import type { Inputs, Level, RoleGuide } from "./types";
import { AXES, STEP_WORD, ZONE_WORD, ZONES, type RolePack, type X, NOT_ASKED } from "./derive";
import { C, LEVEL_KO, chain, hbars, heat } from "./charts";
import { E, H, LVC, PAL, T, ZC, band, chips, howto, lines, note, paginate, pip, rowsOf, ul, type Page } from "./kit";
import { andJoin, asSentence, askNoun, j, okOr, okText, polite, politePara, q } from "./text";

const P = (title: string, body: string): Page => ({ part: "04", partName: "직무 탐색", title, body });
const dz = (d: X, t: string) => `<span class="nw">${E(d.name(t))}<span class="dot" style="background:${ZC[d.dom(t)?.zone ?? "NOT_EXPLORED"]}"></span></span>`;
const Z = ZONE_WORD;
/** 이어지는 쪽의 머리. 쪽 모으기가 붙이는 표시와 같은 꼴로 쓴다 */
const cont = (t: string) => `<p class="k">${E(t)} (계속)</p>`;

/** 사전 문장에 섞인 설계 문서 동사를 책의 말로 바꾼다(뜻은 그대로 둔다) */
const tidy = (s: string) => s
  .replace(/자기가 (가릅|세웁)니다/g, "직접 정합니다")
  .replace(/자기가 /g, "직접 ")
  .replace(/(가릅|세웁|확정합)니다/g, "정합니다")
  .replace(/견줍니다/g, "비교합니다");
/** 여러 문장짜리 사전 문단을 한 줄에 한 문장으로 */
const sentences = (s: string) => politePara(s).split(/(?<=[.?!])\s+/).map((v) => tidy(v.trim())).filter(Boolean);

/** 영역 옆 점의 색 풀이. 표 위의 점은 그래프가 아니라서 짧은 범례로 단다 */
const zoneLegend = (label = "영역 옆 점", color: (z: string) => string = (z) => ZC[z]) =>
  `<div class="lg"><span><b>${E(label)}</b></span>${ZONES.map((z) => `<span><i style="background:${color(z)}"></i>${E(Z[z].tag)}</span>`).join("")}</div>`;

/* 직무×영역 지도에서 칸 색 */
const CELL = {
  core1: PAL.blue, core2: PAL.teal, core3: PAL.amber,
  with1: "#a9c1f2", with2: "#9fdccf", with3: "#f8d9b3", none: "#f6f7f9",
};
const tier3 = (z: string | undefined) => (z === "Z1_EVIDENCE_ESTABLISHED" ? 1 : z === "Z2_EVIDENCE_INCOMPLETE" || z === "Z3_EVIDENCE_LOW_INTEREST" ? 2 : 3);

export function matrixPage(x: Inputs, d: X): Page {
  const roles = d.roleOrder;
  const tds = x.m.domains.map((z) => z.code);
  const str = (i: number, jj: number) => x.rel.td_role.find((t) => t.role === roles[i].code && t.td === tds[jj])?.strength;
  const cell = (i: number, jj: number) => {
    const s = str(i, jj);
    const k = tier3(d.dom(tds[jj])?.zone);
    const core = roles[i].core_ref.td.includes(tds[jj]);
    const fill = s === "중심" ? [CELL.core1, CELL.core2, CELL.core3][k - 1] : s === "있음" ? [CELL.with1, CELL.with2, CELL.with3][k - 1] : CELL.none;
    return { fill, text: core ? "●" : "", ink: s === "중심" ? "#fff" : C.ink2 };
  };
  /* 직무 여럿이 함께 주로 쓰는 영역 하나를 제목으로 꺼낸다 */
  const use = tds.map((t, jj) => ({ t, n: roles.filter((_, i) => str(i, jj) === "중심").length })).sort((a, b) => b.n - a.n)[0];
  const head = use && use.n >= 2
    ? `${E(j(d.name(use.t), "은는"))} 대표 직무 ${roles.length}개 가운데 ${use.n}개가 주로 쓰는 영역입니다`
    : `${E(x.major)} 대표 직무 ${roles.length}개가 어느 영역을 주로 쓰는지 한 표에 놓았습니다`;
  const useZone = use ? d.dom(use.t)?.zone : undefined;
  const after = use && use.n >= 2
    ? (tier3(useZone) === 1 ? `이 영역은 내 결과에서 ${j(Z.Z1_EVIDENCE_ESTABLISHED.tag, "이라")}, 여러 직무 면접에서 같은 경험을 꺼낼 수 있어요.`
      : tier3(useZone) === 2 ? "이 영역에서 결과물 하나를 더 남겨 두면 여러 직무에 함께 쓸 수 있어요."
      : "이 영역은 아직 해 본 일이 적어서, 짧은 과제 하나로 먼저 겪어 보면 여러 직무에 함께 쓸 수 있어요.")
    : "관심 있는 직무 줄에서 ● 칸의 색을 보면 바로 꺼낼 경험이 있는 영역이 보여요.";
  /* 읽는 법에는 이 표에 실제로 칠한 색만 싣는다 */
  const used = new Set(roles.flatMap((_, i) => tds.map((__, jj) => cell(i, jj).fill)));
  return P("직무와 영역의 지도",
    T(head, `직무 ${roles.length}개를 가로줄에, ${E(x.domainWord)} ${d.counts.domains}가지를 세로 칸에 놓았습니다. ${after}`) +
    `<div class="wide-art">${heat(roles.map((p) => p.name_ko), x.m.domains.map((z) => d.name(z.code)), cell, { width: 710, label: 120, head: 92, row: 34, colWrap: 5 })}</div>` +
    howto([
      ["가로줄", "직무"], ["세로 칸", x.domainWord], ["●", "그 직무의 핵심 영역"],
      [CELL.core1, `주로 쓰는 영역 · ${Z.Z1_EVIDENCE_ESTABLISHED.tag}`], [CELL.core2, "주로 쓰는 영역 · 해 본 일 있음"], [CELL.core3, "주로 쓰는 영역 · 아직 확인 전"],
      [CELL.with1, `함께 쓰는 영역 · ${Z.Z1_EVIDENCE_ESTABLISHED.tag}`], [CELL.with2, "함께 쓰는 영역 · 해 본 일 있음"], [CELL.with3, "함께 쓰는 영역 · 아직 확인 전"],
      [CELL.none, "거의 쓰지 않는 영역"],
    ].filter(([k]) => !k.startsWith("#") || used.has(k)) as [string, string][], `직무마다 쓰는 영역은 업계에서 흔히 나누는 방식을 따랐고, 칸 색에 내 응답을 얹었어요. ‘해 본 일 있음’은 ${Z.Z2_EVIDENCE_INCOMPLETE.tag}과 ${Z.Z3_EVIDENCE_LOW_INTEREST.tag}이에요.`));
}

/* 직무별 근거 막대의 색 */
const COVER = { two: PAL.blue, one: PAL.teal, none: "#c9ced8" };

export function coveragePages(x: Inputs, d: X): Page[] {
  const rows = d.roleOrder.map((r) => d.roleCover(r));
  const n2 = rows.filter((r) => r.z1.length + r.z2.length >= 2).length;
  const n1 = rows.filter((r) => r.z1.length + r.z2.length === 1).length;
  const head = n2 ? `${rows.length}개 직무 가운데 ${n2}개는 핵심 영역 두 곳 이상에서 해 본 일이 확인됩니다`
    : n1 ? `${rows.length}개 직무 가운데 ${n1}개 직무에서 핵심 영역 한 곳의 경험이 확인됩니다`
    : `직무마다 핵심 영역을 어디까지 해 봤는지 정리했습니다`;
  const s1 = Z.Z1_EVIDENCE_ESTABLISHED.tag;
  return [P("직무별로 갖춘 근거",
    T(head, "직무마다 핵심 영역 몇 곳에서 해 본 일이 확인됐는지와, 그 직무가 특히 따지는 판단을 어디까지 해 봤는지 나란히 놓았어요. 목표 직무, 관심 직무, 해 본 일이 확인된 영역이 많은 직무 차례입니다.") +
    `<div class="wide-art">${hbars(rows.map((r) => ({ label: r.role.name_ko, value: r.z1.length + r.z2.length * 0.5, color: r.z1.length >= 2 ? COVER.two : r.z1.length + r.z2.length >= 1 ? COVER.one : COVER.none, note: `${s1} ${r.z1.length} · 해 본 일 ${r.z2.length} / 핵심 ${r.tds.length}` })), { max: Math.max(3, ...rows.map((r) => r.tds.length)), width: 700, label: 130, row: 34, valueText: (b) => String((b as { note?: string }).note ?? "") })}</div>` +
    howto([
      ["막대 길이", `핵심 영역 가운데 ${j(s1, "은는")} 1, 해 본 일만 있는 영역은 0.5로 쳐서 더한 값`],
      ["오른쪽 글", `${s1} 수 · 해 본 일만 있는 영역 수 / 핵심 영역 수`],
      [COVER.two, `핵심 영역 두 곳 이상이 ${s1}`], [COVER.one, "한 곳 이상에서 해 본 일 있음"], [COVER.none, "아직 확인 전"],
    ])),
  /* 표는 따로 둔다. 쪽 모으기가 줄 단위로 나눠 앞 쪽의 남은 자리를 채운다 */
  P("직무별로 갖춘 근거 (2)",
    H("직무마다 핵심 영역과 특히 보는 판단", "점 색은 그 영역이 내 결과에서 어느 쪽인지") +
    `<table class="tb tb-xs"><thead><tr><th>직무</th><th>핵심 영역</th><th>특히 보는 판단과 지금 단계</th></tr></thead><tbody>${rows.map((r) => `<tr><td><b>${E(r.role.name_ko)}</b></td><td>${r.tds.map((t) => dz(d, t)).join(" ")}</td><td>${r.req.map((q0) => `${E(d.axisName(q0.axis))} ${pip(q0.level)}`).join("<br>")}</td></tr>`).join("")}</tbody></table>` +
    zoneLegend() +
    band("먼저 볼 곳", "막대가 짧아도 마음이 가는 직무가 있다면, 그 직무의 핵심 영역 가운데 한 곳을 골라 수업 과제 하나로 먼저 해 보세요."))];
}

function reqRows(x: Inputs, d: X, r: RolePack) {
  return r.required_axes.map((a) => {
    const vs = r.core_ref.td.map((t) => d.level(t, a)).filter((v): v is Level => v !== null);
    const lv = vs.length ? (Math.max(...vs) as Level) : null;
    return { label: d.axisName(a), value: lv ?? 0, color: LVC[Math.max(1, lv ?? 0)], note: lv == null ? "묻지 않은 판단" : STEP_WORD[lv].tag };
  });
}
/** 직무가 특히 보는 판단 막대. 읽는 법(`reqHow`)은 카드 줄 바로 아래에 한 줄로 둔다 */
function reqChart(x: Inputs, d: X, r: RolePack): string {
  return hbars(reqRows(x, d, r), { max: 3, width: 340, label: 110, row: 42, valueText: (b) => String((b as { note?: string }).note ?? "") });
}
const reqHow = () => howto([["막대 길이", "핵심 영역에서 해 본 가장 깊은 단계"], [LVC[1], LEVEL_KO[1]], [LVC[2], LEVEL_KO[2]], [LVC[3], LEVEL_KO[3]], ["빈 막대", `${LEVEL_KO[0]} 또는 ${NOT_ASKED}`]]);
/** 걸음 사슬의 읽는 법. 칸 색은 하나로 칠해서 뜻을 따로 두지 않는다 */
const chainHow = (what: string) => howto([["화살표", "다음 걸음으로 넘어가는 차례"], ["칸 위", "걸음의 이름"], ["칸 안", what]]);

/** 직무 하나의 쪽들. depth: 1 = 하는 일 · 2 = 판단과 연습까지 · 3 = 첫 프로젝트까지
 *
 * 연습 칸은 빈 줄로 두지 않고 단계가 가장 낮은 줄을 골라 미리 적는다. 쓰는 줄은
 * 첫 직무(depth 3)의 '어느 과제에서 할지' 하나뿐이다(이 장의 쓰는 칸은 그 한 곳). */
export function rolePages(x: Inputs, d: X, r: RolePack, depth: number): Page[] {
  const g: RoleGuide | undefined = x.guide.roles[r.code];
  const out: Page[] = [];
  const isGoal = d.goalRole?.code === r.code;
  const ctx = x.m.role_context?.code === r.code ? x.m.role_context : null;
  const differs = r.differs_from.filter((v) => okText(v.line)).map((v) => `<strong>${E(j(d.roleName(v.vs), "과와"))} 다른 점</strong> · ${E(tidy(polite(v.line)))}`);
  const diffBand = differs.length ? note(`${E(j(r.name_ko, "이가"))} 다른 직무와 다른 점`, ul(differs)) : "";
  const goalLead = isGoal ? "목표로 적어 주신 직무입니다. " : "";
  const top = (a: Axis) => { const vs = r.core_ref.td.map((t) => d.level(t, a)).filter((v): v is Level => v !== null); return vs.length ? (Math.max(...vs) as Level) : null; };
  const where = depth >= 3 ? lines(2, "어느 수업이나 과제에서 할지") : "";
  if (g) {
    const resp = g.responsibilities.slice(0, 5), know = [...g.knowledge.slice(0, 4).map(E), ...g.tools.slice(0, 3).map((t) => `<span class="mut">${E(t)}</span>`)];
    const entry = g.entry.slice(0, 3);
    out.push(P(`${r.name_ko} · 하는 일`,
      T(`${E(j(r.name_ko, "은는"))} ${E(asSentence(g.summary))}`, `${goalLead}핵심 영역은 ${E(andJoin(r.core_ref.td.map(d.name)))}${r.decides.length ? `이고, 이 직무에서는 ${E(j(r.decides.slice(0, 3).join(", "), "을를"))} 정합니다.` : "입니다."}`) +
      (g.process.length ? H("일이 흘러가는 순서", "직무 안내의 일반적인 흐름") + chain(g.process.slice(0, 6).map((s) => ({ head: s.step, body: tidy(polite(s.what)).replace(/\.$/, ""), color: C.navy })), { width: 700, height: 150 }) + chainHow("그 걸음에서 하는 일") : "") +
      ((resp.length || know.length) ? `<div class="two">
        ${resp.length ? `<div class="card">${H("주로 맡는 일")}${ul(resp.map(E))}</div>` : ""}
        ${know.length ? `<div class="card">${H("알아야 할 것 · 쓰는 도구")}${ul(know)}</div>` : ""}
      </div>` : "")),
      /* 판단 막대와 들어가는 길은 따로 둔다. 한 쪽에 다 넣으면 A4 한 장을 넘는다 */
      P(`${r.name_ko} · 하는 일 (2)`,
      `<div class="two">
        <div class="card">${H(`${E(r.name_ko)} 쪽이 특히 보는 판단`, "내 지금 단계")}${reqChart(x, d, r)}</div>
        ${entry.length ? `<div class="card">${H(`${E(r.name_ko)} 쪽으로 들어가는 길`, "학교 안에서")}${ul(entry.map(E))}</div>` : ""}
      </div>` + reqHow() + diffBand));
  } else {
    const items = (r.items ?? []).slice(0, 7);
    const mats = r.application_material.slice(0, 3);
    out.push(P(`${r.name_ko} · 하는 일`,
      T(`${E(j(r.name_ko, "은는"))} ${E(tidy(polite(r.owns)))}`, `${goalLead}핵심 영역은 ${E(andJoin(r.core_ref.td.map(d.name)))}입니다.${mats.length ? ` 지원 서류에서는 ${E(j(andJoin(mats), "을를"))} 결과물로 보여 주면 됩니다.` : ""}`) +
      `<div class="two">
        <div class="card">${H("이 직무가 정하는 것", "직무 자료")}${chips(r.decides)}<p class="k" style="margin-top:3mm">핵심 영역</p><p>${r.core_ref.td.map((t) => dz(d, t)).join(" ")}</p>${r.application_material.length ? `<p class="k" style="margin-top:3mm">지원 서류에 쓰는 결과물</p>${chips(r.application_material, "art")}` : ""}</div>
        <div class="card">${H("이 직무가 특히 보는 판단", "내 지금 단계")}${reqChart(x, d, r)}</div>
      </div>` + reqHow() +
      (items.length ? H("이 직무에서 묻는 판단", ctx ? "직무 문항 · 내 답" : "직무 문항") +
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
        T(pick ? `${E(r.name_ko)} 연습은 ‘${E(d.axisName(pick.a))}’ 줄부터 시작해 보세요` : `${E(r.name_ko)}에서 해 볼 수 있는 연습을 판단별로 정리했습니다`, "직무 안내에 있는 연습 과제 옆에 내가 지금 어디까지 해 봤는지를 붙였어요. 아직 해 보지 않은 줄부터 하나 골라 이번 학기 과제에 붙여 보세요.") +
        (prac.length ? `<table class="tb tb-xs"><thead><tr><th>판단</th><th>지금 단계</th><th>연습 과제</th><th>남길 것</th></tr></thead><tbody>${prac.map(({ a, p, lv }) =>
          `<tr><td class="w18"><b>${E(d.axisName(a))}</b></td><td class="w18">${pip(lv)}</td><td>${E(p!.task)}<br><span class="mut">확인: ${E(p!.check)}</span></td><td class="w18"><b>${E(p!.output)}</b></td></tr>`).join("")}</tbody></table>` : "") +
        (pick ? H("이번 학기에 먼저 해 볼 연습", known.length ? "지금 단계가 가장 낮은 줄에서 골랐어요" : "직무 안내의 첫 줄에서 골랐어요") +
          `<div class="two">${note(pick.lv == null ? d.axisName(pick.a) : `${d.axisName(pick.a)} · 지금 ${STEP_WORD[pick.lv].tag}`, E(pick.p!.task))}${note("끝나면 남길 것", `${E(pick.p!.output)} <span class="mut">(확인: ${E(pick.p!.check)})</span>`, true)}</div>` + where : "") +
        (prac.some((z) => z.lv === 3) ? band("다른 줄을 고를 때", `이미 ‘${E(LEVEL_KO[3])}’까지 해 본 줄은 새 연습을 더하기보다 그때 남긴 결과물을 정리해 포트폴리오에 넣어 두세요.`) : "")));
    } else {
      const rowsP = AXES.map((a) => {
        const td = r.core_ref.td.find((t) => d.def(t)?.axes?.[a]) ?? r.core_ref.td[0];
        return { a, td, l2: d.def(td)?.axes?.[a]?.l2 ?? "", lv: top(a), req: r.required_axes.includes(a) };
      });
      const pick = [...rowsP].filter((p) => okText(p.l2)).sort((p, q0) => Number(q0.req) - Number(p.req) || (p.lv ?? -1) - (q0.lv ?? -1))[0];
      out.push(P(`${r.name_ko} · 핵심 영역에서 하는 판단`,
        T(`${E(r.name_ko)}의 핵심 영역에서 실제로 하는 판단입니다`, "전공 사전에 적힌 일의 모습과 내 지금 단계를 나란히 놓았어요. ‘특히 봄’ 표시는 이 직무가 더 꼼꼼히 따지는 판단입니다.") +
        `<table class="tb tb-xs"><thead><tr><th>판단</th><th>지금 단계</th><th>핵심 영역에서 하는 일</th></tr></thead><tbody>${rowsP.map((p) => `<tr><td class="w22"><b>${E(d.axisName(p.a))}</b>${p.req ? ` <span class="mut sm">특히 봄</span>` : ""}</td><td class="w18">${pip(p.lv)}</td><td>${E(okOr(p.l2))} <span class="mut">(${E(d.name(p.td))})</span></td></tr>`).join("")}</tbody></table>` +
        (pick ? H("이번 학기에 먼저 해 볼 연습", pick.req ? "‘특히 봄’ 표시가 있는 줄에서 골랐어요" : "지금 단계가 가장 낮은 줄에서 골랐어요") +
          note(`${d.axisName(pick.a)} · ${d.name(pick.td)}`, `수업 과제나 실습에서 ${E(q(pick.l2))} 정도의 몫을 한 번 직접 맡아 보세요. 끝나면 그때 남은 문서를 경험 기록에 올려 두면 됩니다.`) + where : "")));
    }
  }
  if (depth >= 3 && g) {
    const fp = g.firstProject;
    const post = g.postingCheck.slice(0, 3);
    const watch = okText(g.watch) ? sentences(g.watch) : [];
    const side = [post.length ? note("공고에서 볼 것", ul(post.map(E))) : "", watch.length ? note("알아 둘 것", ul(watch.map(E)), true) : ""].filter(Boolean);
    out.push(P(`${r.name_ko} · 첫 프로젝트와 배울 순서`,
      T(`첫 프로젝트: ${E(fp.title)}`, E(sentences(fp.goal).join(" "))) +
      (fp.steps.length ? chain(fp.steps.slice(0, 4).map((s, i) => ({ head: `${i + 1}단계`, body: tidy(polite(s)).replace(/\.$/, ""), color: C.navy })), { width: 700, height: 150 }) + chainHow("그 단계에서 할 일") : "") +
      `<div class="two">
        <div class="card">${H("다 됐다고 볼 기준")}<p class="big">${E(fp.check)}</p><p class="mut">남길 것: ${E(fp.output)}</p></div>
        ${g.learnOrder.length ? `<div class="card">${H("배울 순서")}<ol class="lo">${g.learnOrder.slice(0, 4).map((l) => `<li><b>${E(l.step)}</b><span>${E(tidy(polite(l.why)))}</span></li>`).join("")}</ol></div>` : ""}
      </div>` +
      (side.length === 2 ? `<div class="two">${side.join("")}</div>` : side.join("")) +
      (g.portfolio.length ? H("포트폴리오에 넣을 것") + chips(g.portfolio.slice(0, 6), "art") : "")));
  }
  return out;
}

export function othersPages(x: Inputs, d: X, roles: RolePack[]): Page[] {
  if (!roles.length) return [];
  return paginate(roles, () => 1, 4).map((chunk, k) => P(`그 밖의 직무${k ? ` (${k + 1})` : ""}`,
    (k ? cont("그 밖의 직무") : T(`관심 목록 밖의 직무 ${roles.length}개도 살펴보세요`, "지금 경험이 적거나 관심 직무로 고르지 않은 직무들이에요. 마음이 가는 직무가 있다면 ‘들어가는 길’에 적힌 활동 하나부터 시작해 보세요.")) +
    `<div class="g2">${chunk.map((r) => {
      const g = x.guide.roles[r.code];
      const c = d.roleCover(r);
      return `<div class="card"><h4>${E(r.name_ko)}</h4><p>${E(g ? g.summary : tidy(polite(r.owns)))}</p><p class="k" style="margin-top:2mm">핵심 영역</p><p>${r.core_ref.td.map((t) => dz(d, t)).join(" ")}</p>${c.req.length ? `<p class="k" style="margin-top:2mm">특히 보는 판단</p><p>${c.req.map((q0) => `${E(d.axisName(q0.axis))} ${pip(q0.level)}`).join("<br>")}</p>` : ""}${g && g.entry.length ? `<p class="k" style="margin-top:2mm">들어가는 길</p>${ul(g.entry.slice(0, 2).map(E))}` : !g && r.application_material.length ? `<p class="k" style="margin-top:2mm">지원 서류에 쓰는 결과물</p><p class="mut">${E(r.application_material.slice(0, 3).join(" · "))}</p>` : ""}</div>`;
    }).join("")}</div>` +
    (k ? "" : zoneLegend())));
}

export function aliasPages(x: Inputs, d: X): Page[] {
  const al = x.tax.job_aliases;
  if (!al.length) return [];
  const rf = (c: string) => x.tax.role_functions.find((v) => v.code === c)?.name ?? "";
  const oc = (c: string) => x.tax.org_contexts.find((v) => v.code === c)?.name ?? "";
  return paginate(al, (a) => Math.max(2 + rowsOf(a.oc.map(oc).join(", "), 22), rowsOf(a.distinguisher, 20), a.td.length), 36, 28).map((chunk, k, all) => P(`공고에 적히는 직무 이름${k ? ` (${k + 1})` : ""}`,
    (k ? cont("공고에 적히는 직무 이름") : T("같은 일도 회사마다 다른 이름으로 공고에 나옵니다", "이름이 같아도 맡기는 권한이 다를 수 있어서, 공고 이름마다 어느 영역의 일인지와 비슷한 이름끼리 구별하는 기준을 적었습니다. 공고를 읽을 때는 마지막 칸에 비춰 담당 업무 문장을 확인해 보세요.") + zoneLegend()) +
    `<table class="tb tb-xs"><thead><tr><th class="w22">공고 이름</th><th class="w24">영역</th><th>하는 일 · 조직</th><th class="w30">구별하는 기준</th></tr></thead><tbody>${chunk.map((a) => `<tr><td><b>${E(a.posting_name)}</b></td><td>${a.td.map((t) => dz(d, t)).join(" ")}</td><td>${E(a.rf.map(rf).join(", "))}<br><span class="mut">${E(a.oc.map(oc).join(", "))}</span></td><td>${E(okText(a.distinguisher) ? tidy(polite(a.distinguisher)) : "")}</td></tr>`).join("")}</tbody></table>` +
    (k === all.length - 1 ? band("공고 찾을 때", "검색창에는 이 표의 공고 이름을 그대로 넣고, 검색 결과에서는 ‘담당 업무’ 칸부터 읽어 보세요. 표의 이름은 업계에서 흔히 쓰는 이름을 모은 것입니다.") : "")));
}

/* 경계 카드의 위 띠 색. 관심·경험만 본 영역의 회색은 띠로는 안 보여서 한 단 짙게 칠한다 */
const sideColor = (z: string) => (ZC[z] === "#cfd5df" ? "#8c97ab" : ZC[z]);

export function boundaryPages(x: Inputs, d: X): Page[] {
  /* 물은 영역이나 관심이 높은 영역이 걸린 경계를 먼저, 여덟까지 */
  const rel = (td: string) => { const z = d.dom(td); return (z && d.asked(z) ? 2 : 0) + (z?.interest === "HIGH" ? 1 : 0); };
  const bs = x.tax.boundaries.filter((b) => [b.a_question, b.b_question, ...[b.shared, b.a_difference, b.b_difference].map(polite)].every(okText))
    .map((b, i) => ({ b, i, w: rel(b.a.td) + rel(b.b.td) })).sort((p, q0) => q0.w - p.w || p.i - q0.i).slice(0, 6).map((v) => v.b);
  if (!bs.length) return [];
  const side = (td: string, diff: string, ques: string) => `<div class="b4" style="--c:${sideColor(d.dom(td)?.zone ?? "NOT_EXPLORED")}"><b>${E(d.name(td))}</b><p>${E(tidy(polite(diff)))}</p><p class="mut">스스로 묻기: ${E(ques)}?</p></div>`;
  return paginate(bs, () => 1, 4, 4).map((chunk, k) => P(`가까운 두 일의 경계${k ? ` (${k + 1})` : ""}`,
    (k ? cont("가까운 두 일의 경계") : T("가까운 두 영역 가운데 내가 더 자신 있는 쪽을 질문 하나로 가려 보세요", "같은 일을 나눠 맡는 두 영역을 나란히 놓았어요. 칸마다 아래 질문에 ‘예’라고 답할 수 있으면, 그쪽이 지금 면접에서 더 자신 있게 이야기할 수 있는 영역입니다.") +
      zoneLegend("칸 위 띠", sideColor)) +
    chunk.map((b) => `<div class="card"><p class="k">${E(b.pair)}</p><p class="sm">함께 하는 일: ${E(tidy(polite(b.shared)))}</p><div class="two" style="margin-top:2mm">${side(b.a.td, b.a_difference, b.a_question)}${side(b.b.td, b.b_difference, b.b_question)}</div></div>`).join("")));
}

export function industryDeep(x: Inputs, d: X): Page[] {
  const p = d.goalInd ?? d.indOrder[0];
  if (!p) return [];
  const ic = x.m.industry_context?.code === p.code ? x.m.industry_context : null;
  const dims = p.judgement_dimensions;
  const pages: Page[] = [];
  const shown = dims.filter((v) => okText(v.name)).slice(0, 12);
  const shownOk = shown.filter((v) => (d.level(v.domain, v.axis) ?? -1) >= 2).length;
  const lead = d.goalInd ? `관심 산업으로 고르신 ${E(p.name_ko)}의 판단입니다.` : `관심 산업을 고르지 않아 ${E(j(p.name_ko, "을를"))} 예로 실었고, 다음 검사에서 고르면 그 산업으로 바뀝니다.`;
  pages.push(P(`${p.name_ko}에서 보는 판단`,
    T(`${E(p.name_ko)}에서는 이런 판단을 먼저 봅니다`, E(okOr(p.scene, okOr(p.result_line)))) +
    chips(p.demands.filter(okText).slice(0, 4).map((t) => t.replace(/\.$/, ""))) +
    `<table class="tb tb-xs"><thead><tr><th>이 산업이 보는 판단</th><th>영역</th><th>왜</th><th>내 지금 단계</th></tr></thead><tbody>${shown.map((v) => `<tr><td><b>${E(askNoun(v.name))}</b></td><td>${E(d.name(v.domain))}</td><td class="mut">${E(okOr(v.why))}</td><td>${pip(d.level(v.domain, v.axis))}</td></tr>`).join("")}</tbody></table>` +
    band("이 표를 쓰는 법", `${lead} ${shownOk ? `표의 ${shown.length}가지 가운데 ${shownOk}가지는 이미 ‘${E(STEP_WORD[2].tag)}’ 이상이니, 나머지 줄에서 하나를 골라 수업 과제에 붙여 보세요.` : "표 위쪽 줄부터 하나씩 수업 과제에 붙여 보세요."}`)));
  const gaps = x.m.gaps.map((g) => g.axis).filter((a): a is Axis => !!a);
  const lang = [...new Set(gaps)].map((a) => ({ a, t: p.gap_language?.[a] })).filter((v) => okText(v.t)).slice(0, 4);
  const reading = (p.evidence_reading ?? []).filter((v) => okText(v.same) && okText(v.reads_as)).slice(0, 5);
  /* 둘째 쪽은 덧붙일 거리로 둔다. 남은 자리가 있는 쪽에만 실린다 */
  pages.push({ kind: "fill", ...P(`${p.name_ko}의 말로 다시 읽기`,
    T(`같은 경험도 ${E(p.name_ko)}에서는 다른 말로 읽힙니다`, E(okOr(p.result_line, "수업과 과제에서 한 일을 이 산업에서는 어떤 말로 부르는지 모았어요. 지원서에는 오른쪽 말로 옮겨 써 보세요."))) +
    (reading.length ? H("이 산업에서 읽히는 말", "산업 안내") + `<table class="tb tb-s"><thead><tr><th class="w34">수업과 과제에서 한 일</th><th>이 산업에서 읽히는 말</th></tr></thead><tbody>${reading.map((v) => `<tr><td>${E(v.same)}</td><td>${E(v.reads_as)}</td></tr>`).join("")}</tbody></table>` : "") +
    (lang.length ? H("아직 채울 판단을 이 산업에서는 이렇게 부릅니다") + ul(lang.map((v) => `<b>${E(d.axisName(v.a))}</b> ${E(tidy(polite(v.t!)))}`)) : "") +
    ((sideN) => (sideN.length === 2 ? `<div class="two">${sideN.join("")}</div>` : sideN.join("")))([
      ic?.answered?.length ? note("이 산업 문항으로 확인된 것", ul(ic.answered.slice(0, 5).map((v) => `${E(v.domain ? d.name(v.domain) : "")} · ${E(v.axis ? d.axisName(v.axis) : "")}${v.owned ? " (직접 정함)" : ""}`))) : "",
      (p.job_aliases ?? []).length ? note("공고에서 자주 보는 이름", chips((p.job_aliases ?? []).slice(0, 6)), true) : "",
    ].filter(Boolean)) + (p.vocabulary?.length ? H("이 산업에서 쓰는 말") + chips(p.vocabulary.slice(0, 10)) : "")) });
  return pages;
}

const HAVE = ["Z1_EVIDENCE_ESTABLISHED", "Z2_EVIDENCE_INCOMPLETE", "Z3_EVIDENCE_LOW_INTEREST"];

export function industriesPage(x: Inputs, d: X): Page {
  const rows = d.indOrder.map((p) => {
    const rel0 = x.rel.td_industry.filter((r) => r.industry === p.code && r.strength === "중심").map((r) => r.td);
    /* 관계표에 중심 영역이 없으면 그 산업이 보는 판단의 영역을 대신 적는다 */
    const rel = rel0.length ? rel0 : [...new Set(p.judgement_dimensions.map((v) => v.domain).filter(Boolean))].slice(0, 3);
    const have = rel.filter((t) => HAVE.includes(d.dom(t)?.zone ?? ""));
    return { p, rel, have };
  });
  const k = rows.filter((r) => r.have.length).length;
  return P(`${x.major} 전공이 가는 산업`,
    T(k ? `${E(x.major)} 전공이 일하는 산업 ${rows.length}곳 가운데 ${k}곳은 내가 해 본 영역을 주로 씁니다` : `${E(x.major)} 전공이 일하는 산업 ${rows.length}곳과 그 산업이 주로 쓰는 영역입니다`,
      "산업마다 주로 쓰는 영역을 적고, 영역 옆 점에 그 영역이 내 결과에서 어느 쪽인지 칠했어요. 오른쪽 칸은 그 산업이 먼저 따지는 판단입니다.") +
    zoneLegend() +
    `<table class="tb tb-xs"><thead><tr><th class="w22">산업</th><th>중심으로 쓰는 영역</th><th class="w30">그 산업에서 먼저 묻는 것</th></tr></thead><tbody>${rows.map((r) => `<tr><td><b>${E(r.p.name_ko)}</b>${d.goalInd?.code === r.p.code ? ` <span class="mut sm">고른 산업</span>` : ""}</td><td>${r.rel.map((t) => dz(d, t)).join(" ")}</td><td class="mut">${E(askNoun(r.p.judgement_dimensions[0]?.name ?? ""))}</td></tr>`).join("")}</tbody></table>` +
    band("이 표를 쓰는 법", `영역 옆 점이 ${E(j(Z.Z1_EVIDENCE_ESTABLISHED.tag, "이나"))} ${E(Z.Z2_EVIDENCE_INCOMPLETE.tag)}인 칸이 많은 산업일수록, 그 산업 면접에서 바로 꺼낼 경험이 많아요.`));
}

export function orgPage(x: Inputs, d: X): Page {
  const td = d.strengths[0]?.code ?? d.radarDoms[0]?.code ?? x.defs[0].code;
  const oo = d.def(td)?.org_outcomes ?? {};
  const goalOc = x.m.targets.goal.org;
  return P("일하는 자리마다 다른 기준",
    T(`같은 ${E(d.name(td))}의 일도 일하는 자리에 따라 평가 기준이 다릅니다`, `일하는 자리 ${x.tax.org_contexts.length}가지마다 ${E(d.name(td))}의 일을 무엇으로 평가하는지 정리했어요. 자리의 성격별로 흔히 쓰는 기준이라, 실제 기관의 평가 방식은 그 기관의 공고와 누리집에서 한 번 더 확인해 보세요.`) +
    `<table class="tb tb-xs"><thead><tr><th class="w22">일하는 자리</th><th class="w24">무엇으로 평가되나</th><th>그 자리의 특징</th><th class="w24">${E(d.name(td))}의 결과</th></tr></thead><tbody>${x.tax.org_contexts.map((o) => `<tr><td><b>${E(o.name)}</b>${goalOc === o.code ? ` <span class="mut sm">고른 자리</span>` : ""}</td><td>${E(o.performance)}</td><td class="mut">${E(okText(o.differs) ? tidy(polite(o.differs)) : "")}</td><td>${E(okOr(oo[o.code]))}</td></tr>`).join("")}</tbody></table>` +
    H("같은 영역 안에서도 맡는 몫이 다릅니다", "몫마다 남기는 것") +
    `<table class="tb tb-xs"><tbody>${x.tax.role_functions.map((f) => `<tr><th class="w22">${E(f.name)}</th><td>${E(tidy(polite(f.one_line)))}</td><td class="mut w34">남기는 것: ${E(f.output_kind)}</td></tr>`).join("")}</tbody></table>`);
}

export function ch4Pages(x: Inputs, d: X, roomy = false): Page[] {
  const out: Page[] = [matrixPage(x, d), ...coveragePages(x, d)];
  const [r0, r1, r2, ...rest] = d.roleOrder;
  if (r0) out.push(...rolePages(x, d, r0, 3));
  /* 지역 장이 없는 책은 둘째 직무를 두 쪽으로 싣는다(쪽 수를 70~80 안에 두려는 배분이다) */
  if (r1) out.push(...rolePages(x, d, r1, roomy ? 2 : 1));
  if (r2) out.push(...rolePages(x, d, r2, 1));
  out.push(...othersPages(x, d, rest));
  out.push(...aliasPages(x, d), ...boundaryPages(x, d), ...industryDeep(x, d), industriesPage(x, d), orgPage(x, d));
  return out;
}
