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
 *
 * 영어 책: 글자는 `L(한국어, 영어)` 한 쌍으로 둔다(`lang.ts` 의 `T`. 이 파일의 `T` 는 쪽 머리
 * 도구라 이름을 바꿔 들인다). 한국어 조사·높임 도구(`j` · `polite` · `andJoin` · `q`)는 영어
 * 글에 쓰지 않고, 영어 쪽은 아래 작은 영어 도구(`sen` · `andEn`)를 쓴다. 한국어 책은 한
 * 글자도 바뀌지 않는다.
 */
import type { Axis } from "../scoring/types";
import type { Inputs, Level, RoleGuide } from "./types";
import { AXES, STEP_WORD, ZONE_WORD, ZONES, type RolePack, type X, notAsked } from "./derive";
import { C, LEVEL_KO, chain, hbars, heat } from "./charts";
import { E, H, LVC, PAL, T, ZC, band, chips, howto, lines, note, paginate, pip, rowsOf, ul, type Page } from "./kit";
import { andJoin, asSentence, askNoun, j, okOr, okText, polite, politePara, q } from "./text";
import { T as L, isEn } from "./lang";

/** 이 장의 이름. 차례가 장 첫 쪽과 이 장의 쪽을 이 이름으로 묶으므로 장 첫 쪽(index.ts)과 채움 쪽(fill.ts)도 같은 말을 써야 한다 */
export const PART4 = () => L("직무 탐색", "Exploring roles");
const P = (title: string, body: string): Page => ({ part: "04", partName: PART4(), title, body });
/* 영어 영역 이름은 길어서 한 줄로 묶으면 표 칸을 밀어낸다. 점만 이름 끝에 붙여 둔다 */
const dz = (d: X, t: string) => `<span class="${isEn() ? "" : "nw"}">${E(d.name(t))}<span class="dot" style="background:${ZC[d.dom(t)?.zone ?? "NOT_EXPLORED"]}"></span></span>`;
const Z = ZONE_WORD;
/** 이어지는 쪽의 머리. 쪽 모으기가 붙이는 표시와 같은 꼴로 쓴다 */
const cont = (t: string) => `<p class="k">${E(t)} ${L("(계속)", "(cont.)")}</p>`;

/* ── 영어 문장 도구 ───────────────────────────────────────────────── */
const bare = (s: string) => String(s ?? "").trim().replace(/[.。]+$/, "");
const capF = (s: string) => { const t = bare(s); return t ? t[0].toUpperCase() + t.slice(1) : t; };
/** 문장 가운데에 넣을 때 첫 글자를 작게. 약어(FEA · PCB)는 그대로 */
const lcF = (s: string) => {
  const t = bare(s);
  const w = t.split(/\s+/)[0] ?? "";
  return !t || /^[A-Z0-9]{2,}/.test(w) || /^[A-Z][a-z]*[A-Z]/.test(w) ? t : t[0].toLowerCase() + t.slice(1);
};
/** 문장으로 닫는다. 물음표로 끝나면 그대로 */
const sen = (s: string) => { const t = capF(s); return !t || /[?!]$/.test(t) ? t : `${t}.`; };
const andEn = (xs: string[]) => { const ys = xs.filter(Boolean); return ys.length <= 1 ? ys[0] ?? "" : `${ys.slice(0, -1).join(", ")} and ${ys[ys.length - 1]}`; };
const nOf = (n: number, one: string, many: string) => (n === 1 ? one : many);
/** 영어 물음은 물음표 하나로 닫는다 */
const askEn = (s: string) => `${bare(s).replace(/\?+$/, "")}?`;
/** 그래프 줄 이름 칸의 폭. 한국어는 정해 둔 폭 그대로, 영어는 가장 긴 이름이 잘리지 않게 넓힌다 */
const labW = (names: string[], px: number, ko: number) =>
  isEn() ? Math.min(300, Math.max(ko, Math.ceil(Math.max(0, ...names.map((t) => t.length)) * px * 0.56) + 18)) : ko;

/** 쪽 머리. 영어 제목이 세 줄을 넘길 만큼 길면(직무 안내의 한 줄 풀이) 한 단 작게 둔다 */
const Tl = (title: string, dek?: string) => {
  const h = T(title, dek);
  return isEn() && title.length > 120 ? h.replace("<h1>", `<h1 style="font-size:15pt">`) : h;
};
/** 영어 직무 흐름. 영어 걸음 이름은 사슬 그림의 좁은 칸 머리에 들어가지 않아 번호 붙은 두 단 목록으로 둔다 */
const flowEn = (steps: { step: string; what: string }[]) =>
  `<div class="wf2" style="grid-template-rows:repeat(${Math.ceil(steps.length / 2)},auto)">${steps.map((s, i) => `<div class="wf2-i"><span>${i + 1}</span><p><b>${E(s.step)}</b>${E(sen(s.what))}</p></div>`).join("")}</div>`;

/** 사전 문장에 섞인 설계 문서 동사를 책의 말로 바꾼다(뜻은 그대로 둔다) */
const tidy = (s: string) => s
  .replace(/자기가 (가릅|세웁)니다/g, "직접 정합니다")
  .replace(/자기가 /g, "직접 ")
  .replace(/(가릅|세웁|확정합)니다/g, "정합니다")
  .replace(/견줍니다/g, "비교합니다");
/** 사전 한 문장을 책의 말로: 한국어는 높임과 동사 다듬기, 영어는 문장으로 닫기만 한다 */
const say = (s: string) => (isEn() ? sen(s) : tidy(polite(s)));
/** 그림 칸 안에 넣는 꼴(끝 점 없이) */
const sayBare = (s: string) => (isEn() ? bare(s) : tidy(polite(s)).replace(/\.$/, ""));
/** 여러 문장짜리 사전 문단을 한 줄에 한 문장으로 */
const sentences = (s: string) => (isEn()
  ? s.trim().split(/(?<=[.?!])\s+/).map((v) => v.trim()).filter(Boolean)
  : politePara(s).split(/(?<=[.?!])\s+/).map((v) => tidy(v.trim())).filter(Boolean));

/** 영역 옆 점의 색 풀이. 표 위의 점은 그래프가 아니라서 짧은 범례로 단다 */
const zoneLegend = (label = L("영역 옆 점", "Dot next to an area"), color: (z: string) => string = (z) => ZC[z]) =>
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
    ? L(`${E(j(d.name(use.t), "은는"))} 대표 직무 ${roles.length}개 가운데 ${use.n}개가 주로 쓰는 영역입니다`,
      `${E(d.name(use.t))} is a main area for ${use.n} of the ${roles.length} typical roles`)
    : L(`${E(x.major)} 대표 직무 ${roles.length}개가 어느 영역을 주로 쓰는지 한 표에 놓았습니다`,
      `The ${roles.length} typical ${E(x.major)} roles and the areas each one relies on`);
  const useZone = use ? d.dom(use.t)?.zone : undefined;
  const after = use && use.n >= 2
    ? (tier3(useZone) === 1 ? L(`이 영역은 내 결과에서 ${j(Z.Z1_EVIDENCE_ESTABLISHED.tag, "이라")}, 여러 직무 면접에서 같은 경험을 꺼낼 수 있어요.`, `It is a ‘${E(Z.Z1_EVIDENCE_ESTABLISHED.tag)}’ in your results, so you can bring up the same experience in interviews for several roles.`)
      : tier3(useZone) === 2 ? L("이 영역에서 결과물 하나를 더 남겨 두면 여러 직무에 함께 쓸 수 있어요.", "Leave one more deliverable in this area and you can use it for several roles at once.")
      : L("이 영역은 아직 해 본 일이 적어서, 짧은 과제 하나로 먼저 겪어 보면 여러 직무에 함께 쓸 수 있어요.", "You have not done much here yet. Try it first through one short assignment, and that experience will count toward several roles."))
    : L("관심 있는 직무 줄에서 ● 칸의 색을 보면 바로 꺼낼 경험이 있는 영역이 보여요.", "In the row for a role you like, the colour of each ● cell shows the core areas where you already have experience to talk about.");
  /* 읽는 법에는 이 표에 실제로 칠한 색만 싣는다 */
  const used = new Set(roles.flatMap((_, i) => tds.map((__, jj) => cell(i, jj).fill)));
  /* 영어 영역 이름은 좁은 세로 칸에 들어가지 않는다. 칸 머리는 번호로 두고 이름은 그림 아래 열쇠에 적는다 */
  const num = (k: number) => String(k + 1).padStart(2, "0");
  const names = roles.map((p) => p.name_ko);
  const art = isEn()
    ? heat(names, x.m.domains.map((_, k) => num(k)), cell, { width: 710, label: labW(names, 12, 120), head: 30, row: 34, colWrap: 5 }) +
      `<p class="sm mut" style="margin-top:2mm">${x.m.domains.map((z, k) => `<b>${num(k)}</b> ${E(d.name(z.code))}`).join(" · ")}</p>`
    : heat(names, x.m.domains.map((z) => d.name(z.code)), cell, { width: 710, label: 120, head: 92, row: 34, colWrap: 5 });
  return P(L("직무와 영역의 지도", "Map of roles and areas"),
    T(head, L(`직무 ${roles.length}개를 가로줄에, ${E(x.domainWord)} ${d.counts.domains}가지를 세로 칸에 놓았습니다. ${after}`,
      `Each row is a role and each numbered column is one of the ${d.counts.domains} areas. ${after}`)) +
    `<div class="wide-art">${isEn() ? `<div>${art}</div>` : art}</div>` +
    howto([
      [L("가로줄", "Rows"), L("직무", "Roles")], [L("세로 칸", "Columns"), isEn() ? "Areas, numbered as in the key under the chart" : x.domainWord], ["●", L("그 직무의 핵심 영역", "A core area of that role")],
      [CELL.core1, L(`주로 쓰는 영역 · ${Z.Z1_EVIDENCE_ESTABLISHED.tag}`, `Main area · ${Z.Z1_EVIDENCE_ESTABLISHED.tag}`)], [CELL.core2, L("주로 쓰는 영역 · 해 본 일 있음", "Main area · some experience")], [CELL.core3, L("주로 쓰는 영역 · 아직 확인 전", "Main area · no experience shown yet")],
      [CELL.with1, L(`함께 쓰는 영역 · ${Z.Z1_EVIDENCE_ESTABLISHED.tag}`, `Supporting area · ${Z.Z1_EVIDENCE_ESTABLISHED.tag}`)], [CELL.with2, L("함께 쓰는 영역 · 해 본 일 있음", "Supporting area · some experience")], [CELL.with3, L("함께 쓰는 영역 · 아직 확인 전", "Supporting area · no experience shown yet")],
      [CELL.none, L("거의 쓰지 않는 영역", "Rarely used")],
    ].filter(([k]) => !k.startsWith("#") || used.has(k)) as [string, string][], L(`직무마다 쓰는 영역은 업계에서 흔히 나누는 방식을 따랐고, 칸 색에 내 응답을 얹었어요. ‘해 본 일 있음’은 ${Z.Z2_EVIDENCE_INCOMPLETE.tag}과 ${Z.Z3_EVIDENCE_LOW_INTEREST.tag}이에요.`,
      `Which areas each role uses follows the usual split in industry, and the cell colours come from your answers. ‘Some experience’ covers areas marked ‘${Z.Z2_EVIDENCE_INCOMPLETE.tag}’ or ‘${Z.Z3_EVIDENCE_LOW_INTEREST.tag}’.`)));
}

/* 직무별 근거 막대의 색 */
const COVER = { two: PAL.blue, one: PAL.teal, none: "#c9ced8" };

export function coveragePages(x: Inputs, d: X): Page[] {
  const rows = d.roleOrder.map((r) => d.roleCover(r));
  const n2 = rows.filter((r) => r.z1.length + r.z2.length >= 2).length;
  const n1 = rows.filter((r) => r.z1.length + r.z2.length === 1).length;
  const head = n2 ? L(`${rows.length}개 직무 가운데 ${n2}개는 핵심 영역 두 곳 이상에서 해 본 일이 확인됩니다`, `In ${n2} of the ${rows.length} roles, you have done work in two or more core areas`)
    : n1 ? L(`${rows.length}개 직무 가운데 ${n1}개 직무에서 핵심 영역 한 곳의 경험이 확인됩니다`, `In ${n1} of the ${rows.length} roles, you have done work in one core area`)
    : L(`직무마다 핵심 영역을 어디까지 해 봤는지 정리했습니다`, `How far you have gone in each role's core areas`);
  const s1 = Z.Z1_EVIDENCE_ESTABLISHED.tag;
  const names = rows.map((r) => r.role.name_ko);
  return [P(L("직무별로 갖춘 근거", "Evidence by role"),
    T(head, L("직무마다 핵심 영역 몇 곳에서 해 본 일이 확인됐는지와, 그 직무가 특히 따지는 판단을 어디까지 해 봤는지 나란히 놓았어요. 목표 직무, 관심 직무, 해 본 일이 확인된 영역이 많은 직무 차례입니다.",
      "For each role, this shows how many of its core areas have work you have done, next to how far you have gone in the decisions that role weighs most. Your goal role comes first, then roles you are interested in, then roles with the most areas where you have experience.")) +
    `<div class="wide-art">${hbars(rows.map((r) => ({ label: r.role.name_ko, value: r.z1.length + r.z2.length * 0.5, color: r.z1.length >= 2 ? COVER.two : r.z1.length + r.z2.length >= 1 ? COVER.one : COVER.none,
      note: L(`${s1} ${r.z1.length} · 해 본 일 ${r.z2.length} / 핵심 ${r.tds.length}`, `Strength ${r.z1.length} · Some ${r.z2.length} / Core ${r.tds.length}`) })),
      { max: Math.max(3, ...rows.map((r) => r.tds.length)), width: 700, label: labW(names, 12.5, 130), row: 34, valueText: (b) => String((b as { note?: string }).note ?? "") })}</div>` +
    howto([
      [L("막대 길이", "Bar length"), L(`핵심 영역 가운데 ${j(s1, "은는")} 1, 해 본 일만 있는 영역은 0.5로 쳐서 더한 값`, `Core areas added up: 1 for each ‘${s1}’, 0.5 for each area with some experience only`)],
      [L("오른쪽 글", "Text at the end"), L(`${s1} 수 · 해 본 일만 있는 영역 수 / 핵심 영역 수`, `Strength areas · areas with some experience only / all core areas`)],
      [COVER.two, L(`핵심 영역 두 곳 이상이 ${s1}`, `Two or more core areas are a ‘${s1}’`)], [COVER.one, L("한 곳 이상에서 해 본 일 있음", "Some experience in at least one core area")], [COVER.none, L("아직 확인 전", "No experience shown yet")],
    ])),
  /* 표는 따로 둔다. 쪽 모으기가 줄 단위로 나눠 앞 쪽의 남은 자리를 채운다 */
  P(L("직무별로 갖춘 근거 (2)", "Evidence by role (2)"),
    H(L("직무마다 핵심 영역과 특히 보는 판단", "Core areas and key decisions for each role"), L("점 색은 그 영역이 내 결과에서 어느 쪽인지", "Dot colour shows where the area sits in your results")) +
    `<table class="tb tb-xs"><thead><tr><th>${L("직무", "Role")}</th><th>${L("핵심 영역", "Core areas")}</th><th>${L("특히 보는 판단과 지금 단계", "Key decisions and your current step")}</th></tr></thead><tbody>${rows.map((r) => `<tr><td><b>${E(r.role.name_ko)}</b></td><td>${r.tds.map((t) => dz(d, t)).join(" ")}</td><td>${r.req.map((q0) => `${E(d.axisName(q0.axis))} ${pip(q0.level)}`).join("<br>")}</td></tr>`).join("")}</tbody></table>` +
    zoneLegend() +
    band(L("먼저 볼 곳", "Where to start"), L("막대가 짧아도 마음이 가는 직무가 있다면, 그 직무의 핵심 영역 가운데 한 곳을 골라 수업 과제 하나로 먼저 해 보세요.", "If a role appeals to you even with a short bar, pick one of its core areas and try it first through a single course assignment.")))];
}

function reqRows(x: Inputs, d: X, r: RolePack) {
  return r.required_axes.map((a) => {
    const vs = r.core_ref.td.map((t) => d.level(t, a)).filter((v): v is Level => v !== null);
    const lv = vs.length ? (Math.max(...vs) as Level) : null;
    return { label: d.axisName(a), value: lv ?? 0, color: LVC[Math.max(1, lv ?? 0)], note: lv == null ? L("묻지 않은 판단", "Not asked") : STEP_WORD[lv].tag };
  });
}
/** 직무가 특히 보는 판단 막대. 읽는 법(`reqHow`)은 카드 줄 바로 아래에 한 줄로 둔다 */
function reqChart(x: Inputs, d: X, r: RolePack): string {
  const rows = reqRows(x, d, r);
  /* 영어 판단 이름은 길어서 이름 칸을 넓히고, 막대 자리가 남도록 그림 폭을 그만큼만 늘린다(그림은 칸 폭에 맞춰 줄어든다) */
  const lw = labW(rows.map((v) => v.label), 12.5, 110);
  return hbars(rows, { max: 3, width: isEn() ? Math.max(340, lw + 160) : 340, label: lw, row: 42, valueText: (b) => String((b as { note?: string }).note ?? "") });
}
const reqHow = () => howto([[L("막대 길이", "Bar length"), L("핵심 영역에서 해 본 가장 깊은 단계", "The deepest step you reached in the core areas")], [LVC[1], LEVEL_KO[1]], [LVC[2], LEVEL_KO[2]], [LVC[3], LEVEL_KO[3]], [L("빈 막대", "Empty bar"), L(`${LEVEL_KO[0]} 또는 ${notAsked()}`, `${LEVEL_KO[0]} or ${notAsked()}`)]]);
/** 걸음 사슬의 읽는 법. 칸 색은 하나로 칠해서 뜻을 따로 두지 않는다 */
const chainHow = (what: string) => howto([[L("화살표", "Arrow"), L("다음 걸음으로 넘어가는 차례", "The order of the steps")], [L("칸 위", "Top of each box"), L("걸음의 이름", "Name of the step")], [L("칸 안", "Inside each box"), what]]);

/** 직무 하나의 쪽들. depth: 1 = 하는 일 · 2 = 판단과 연습까지 · 3 = 첫 프로젝트까지
 *
 * 연습 칸은 빈 줄로 두지 않고 단계가 가장 낮은 줄을 골라 미리 적는다. 쓰는 줄은
 * 첫 직무(depth 3)의 '어느 과제에서 할지' 하나뿐이다(이 장의 쓰는 칸은 그 한 곳).
 *
 * 영어 쪽 이름의 꼬리(` · What the work involves` 등)는 장 첫 쪽의 목록이 직무 이름만 남길 때 떼어 내는 자리다 */
export function rolePages(x: Inputs, d: X, r: RolePack, depth: number): Page[] {
  const g: RoleGuide | undefined = x.guide.roles[r.code];
  const out: Page[] = [];
  const isGoal = d.goalRole?.code === r.code;
  const ctx = x.m.role_context?.code === r.code ? x.m.role_context : null;
  const nm = r.name_ko;
  const differs = r.differs_from.filter((v) => okText(v.line)).map((v) => isEn()
    ? `<strong>Compared with ${E(d.roleName(v.vs))}</strong> · ${E(sen(v.line))}`
    : `<strong>${E(j(d.roleName(v.vs), "과와"))} 다른 점</strong> · ${E(tidy(polite(v.line)))}`);
  const diffBand = differs.length ? note(L(`${E(j(nm, "이가"))} 다른 직무와 다른 점`, `How ${E(nm)} differs from other roles`), ul(differs)) : "";
  const goalLead = isGoal ? L("목표로 적어 주신 직무입니다. ", "This is the role you set as your goal. ") : "";
  const coreNames = r.core_ref.td.map(d.name);
  const top = (a: Axis) => { const vs = r.core_ref.td.map((t) => d.level(t, a)).filter((v): v is Level => v !== null); return vs.length ? (Math.max(...vs) as Level) : null; };
  const where = depth >= 3 ? lines(2, L("어느 수업이나 과제에서 할지", "The course or assignment where you will do this")) : "";
  const work = L(`${nm} · 하는 일`, `${nm} · What the work involves`);
  if (g) {
    const resp = g.responsibilities.slice(0, 5), know = [...g.knowledge.slice(0, 4).map(E), ...g.tools.slice(0, 3).map((t) => `<span class="mut">${E(t)}</span>`)];
    const entry = g.entry.slice(0, 3);
    /* 안내의 한 줄 풀이는 `~하는 일` 꼴이다. 영어는 동명사로 시작하면 `X means …`, 아니면 그대로 한 문장으로 */
    const sumEn = /^[A-Za-z]+ing\b/.test(bare(g.summary)) ? `${nm} means ${lcF(g.summary)}` : capF(g.summary);
    out.push(P(work,
      Tl(isEn() ? E(sumEn) : `${E(j(nm, "은는"))} ${E(asSentence(g.summary))}`,
        isEn()
          ? `${goalLead}Its core areas are ${E(andEn(coreNames))}.${r.decides.length ? ` Decisions that are yours in this role: ${E(r.decides.slice(0, 3).map(lcF).join("; "))}.` : ""}`
          : `${goalLead}핵심 영역은 ${E(andJoin(coreNames))}${r.decides.length ? `이고, 이 직무에서는 ${E(j(r.decides.slice(0, 3).join(", "), "을를"))} 정합니다.` : "입니다."}`) +
      (g.process.length ? H(L("일이 흘러가는 순서", "How the work flows"), L("직무 안내의 일반적인 흐름", "The usual sequence, from the role guide")) + (isEn() ? flowEn(g.process.slice(0, 6)) : chain(g.process.slice(0, 6).map((s) => ({ head: s.step, body: sayBare(s.what), color: C.navy })), { width: 700, height: 150 }) + chainHow(L("그 걸음에서 하는 일", "What happens at that step"))) : "") +
      ((resp.length || know.length) ? `<div class="two">
        ${resp.length ? `<div class="card">${H(L("주로 맡는 일", "Main responsibilities"))}${ul(resp.map(E))}</div>` : ""}
        ${know.length ? `<div class="card">${H(L("알아야 할 것 · 쓰는 도구", "What to know · tools you use"))}${ul(know)}</div>` : ""}
      </div>` : "")),
      /* 판단 막대와 들어가는 길은 따로 둔다. 한 쪽에 다 넣으면 A4 한 장을 넘는다 */
      P(L(`${nm} · 하는 일 (2)`, `${nm} · What the work involves (2)`),
      `<div class="two">
        <div class="card">${isEn() ? H("What this role weighs most") : H(`${E(nm)} 쪽이 특히 보는 판단`, "내 지금 단계")}${reqChart(x, d, r)}</div>
        ${entry.length ? `<div class="card">${isEn() ? H("Ways in while you are at university") : H(`${E(nm)} 쪽으로 들어가는 길`, "학교 안에서")}${ul(entry.map(E))}</div>` : ""}
      </div>` + reqHow() + diffBand));
  } else {
    const items = (r.items ?? []).slice(0, 7);
    const mats = r.application_material.slice(0, 3);
    const topPart =
      T(isEn() ? `${E(nm)}: ${E(lcF(r.owns))}` : `${E(j(nm, "은는"))} ${E(tidy(polite(r.owns)))}`,
        isEn()
          ? `${goalLead}Its core areas are ${E(andEn(coreNames))}.${mats.length ? ` In applications, the deliverables to show are ${E(andEn(mats.map(lcF)))}.` : ""}`
          : `${goalLead}핵심 영역은 ${E(andJoin(coreNames))}입니다.${mats.length ? ` 지원 서류에서는 ${E(j(andJoin(mats), "을를"))} 결과물로 보여 주면 됩니다.` : ""}`) +
      `<div class="two">
        <div class="card">${H(L("이 직무가 정하는 것", "What this role decides"), L("직무 자료", "From the role profile"))}${chips(r.decides)}<p class="k" style="margin-top:3mm">${L("핵심 영역", "Core areas")}</p><p>${r.core_ref.td.map((t) => dz(d, t)).join(" ")}</p>${r.application_material.length ? `<p class="k" style="margin-top:3mm">${L("지원 서류에 쓰는 결과물", "Deliverables for applications")}</p>${chips(r.application_material, "art")}` : ""}</div>
        <div class="card">${isEn() ? H("What this role weighs most") : H("이 직무가 특히 보는 판단", "내 지금 단계")}${reqChart(x, d, r)}</div>
      </div>` + reqHow();
    const askPart =
      (items.length ? H(L("이 직무에서 묻는 판단", "Decisions this role asks about"), ctx ? L("직무 문항 · 내 답", "Role questions · your answers") : L("직무 문항", "Role questions")) +
      `<table class="tb tb-xs"><tbody>${items.map((it) => {
        const ans = ctx?.answered.find((a) => a.axis === it.axis && a.domain === it.domain);
        const st = ctx ? (ans ? (ans.owned ? L("직접 정함", "Your call") : L("해 봄", "Done")) : ctx.not_yet.some((a) => a.axis === it.axis && a.domain === it.domain) ? L("아직", "Not yet") : "") : "";
        return `<tr><td class="w22">${E(d.axisName(it.axis))}</td><td>${E(it.ask)}</td><td class="w18 mut">${E(d.name(it.domain))}${st ? ` · ${E(st)}` : ""}</td></tr>`;
      }).join("")}</tbody></table>` : "") + diffBand;
    /* 영어는 직무 문항 표까지 한 장에 들지 않는다. 표부터 둘째 쪽으로 떼면 쪽 모으기가 남은 자리로 끌어 올린다 */
    if (isEn() && askPart) out.push(P(work, topPart), P(L(`${nm} · 하는 일 (2)`, `${nm} · What the work involves (2)`), askPart));
    else out.push(P(work, topPart + askPart));
  }
  if (depth >= 2) {
    if (g) {
      const prac = AXES.map((a) => ({ a, p: g.practice[a], lv: top(a) })).filter((z) => z.p);
      /* 단계가 가장 낮은 줄을 이번 학기 연습으로 미리 고른다. 묻지 않은 줄뿐이면 직무 안내의 첫 줄을 쓴다 */
      const known = prac.filter((z) => z.lv !== null).sort((p, q0) => (p.lv ?? 0) - (q0.lv ?? 0));
      const pick = known[0] ?? prac[0];
      const chk = L("확인", "Check");
      const head = L(`${nm} · 판단과 연습`, `${nm} · Decisions and practice`);
      const table =
        T(pick ? L(`${E(nm)} 연습은 ‘${E(d.axisName(pick.a))}’ 줄부터 시작해 보세요`, `Start practising for ${E(nm)} with the ‘${E(d.axisName(pick.a))}’ row`) : L(`${E(nm)}에서 해 볼 수 있는 연습을 판단별로 정리했습니다`, `Practice tasks for ${E(nm)}, decision by decision`),
          L("직무 안내에 있는 연습 과제 옆에 내가 지금 어디까지 해 봤는지를 붙였어요. 아직 해 보지 않은 줄부터 하나 골라 이번 학기 과제에 붙여 보세요.", "Each practice task from the role guide sits next to how far you have gone so far. Pick one row you have not done yet and attach it to an assignment this term.")) +
        (prac.length ? `<table class="tb tb-xs"><thead><tr><th>${L("판단", "Decision")}</th><th>${L("지금 단계", "Current step")}</th><th>${L("연습 과제", "Practice task")}</th><th>${L("남길 것", "What to keep")}</th></tr></thead><tbody>${prac.map(({ a, p, lv }) =>
          `<tr><td class="w18"><b>${E(d.axisName(a))}</b></td><td class="w18">${pip(lv)}</td><td>${E(isEn() ? sen(p!.task) : p!.task)}<br><span class="mut">${chk}: ${E(p!.check)}</span></td><td class="w18"><b>${E(p!.output)}</b></td></tr>`).join("")}</tbody></table>` : "");
      const first =
        (pick ? H(L("이번 학기에 먼저 해 볼 연습", "Practice to try first this term"), known.length ? L("지금 단계가 가장 낮은 줄에서 골랐어요", "Picked from the row where your step is lowest") : L("직무 안내의 첫 줄에서 골랐어요", "Picked from the first row of the role guide")) +
          `<div class="two">${note(pick.lv == null ? d.axisName(pick.a) : L(`${d.axisName(pick.a)} · 지금 ${STEP_WORD[pick.lv].tag}`, `${d.axisName(pick.a)} · now: ${STEP_WORD[pick.lv].tag}`), E(isEn() ? sen(pick.p!.task) : pick.p!.task))}${note(L("끝나면 남길 것", "What to keep when you finish"), `${E(pick.p!.output)} <span class="mut">(${L("확인", "check")}: ${E(pick.p!.check)})</span>`, true)}</div>` + where : "") +
        (prac.some((z) => z.lv === 3) ? band(L("다른 줄을 고를 때", "Choosing other rows"), L(`이미 ‘${E(LEVEL_KO[3])}’까지 해 본 줄은 새 연습을 더하기보다 그때 남긴 결과물을 정리해 포트폴리오에 넣어 두세요.`, `Where you already reached ‘${E(LEVEL_KO[3])}’, skip new practice. Tidy up the deliverable you left then and put it in your portfolio.`)) : "");
      /* 영어는 표가 길어 쓰는 줄까지 붙은 첫 직무(depth 3)에서는 한 장에 다 들지 않는다. 먼저 해 볼 연습을
         둘째 쪽으로 떼어 두면 쪽 모으기가 남은 자리로 끌어 올린다 */
      if (isEn() && first && depth >= 3) out.push(P(head, table), P(`${head} (2)`, first));
      else out.push(P(head, table + first));
    } else {
      const rowsP = AXES.map((a) => {
        const td = r.core_ref.td.find((t) => d.def(t)?.axes?.[a]) ?? r.core_ref.td[0];
        return { a, td, l2: d.def(td)?.axes?.[a]?.l2 ?? "", lv: top(a), req: r.required_axes.includes(a) };
      });
      const pick = [...rowsP].filter((p) => okText(p.l2)).sort((p, q0) => Number(q0.req) - Number(p.req) || (p.lv ?? -1) - (q0.lv ?? -1))[0];
      const key = L("특히 봄", "Key");
      out.push(P(L(`${nm} · 핵심 영역에서 하는 판단`, `${nm} · Decisions in the core areas`),
        T(L(`${E(nm)}의 핵심 영역에서 실제로 하는 판단입니다`, `The decisions ${E(nm)} makes in its core areas`), L("전공 사전에 적힌 일의 모습과 내 지금 단계를 나란히 놓았어요. ‘특히 봄’ 표시는 이 직무가 더 꼼꼼히 따지는 판단입니다.", "What the work looks like, from the area guide for your major, sits next to your current step. Rows marked ‘Key’ are decisions this role checks more closely.")) +
        `<table class="tb tb-xs"><thead><tr><th>${L("판단", "Decision")}</th><th>${L("지금 단계", "Current step")}</th><th>${L("핵심 영역에서 하는 일", "What it looks like in a core area")}</th></tr></thead><tbody>${rowsP.map((p) => `<tr><td class="w22"><b>${E(d.axisName(p.a))}</b>${p.req ? ` <span class="mut sm">${key}</span>` : ""}</td><td class="w18">${pip(p.lv)}</td><td>${E(okOr(p.l2))} <span class="mut">(${E(d.name(p.td))})</span></td></tr>`).join("")}</tbody></table>` +
        (pick ? H(L("이번 학기에 먼저 해 볼 연습", "Practice to try first this term"), pick.req ? L("‘특히 봄’ 표시가 있는 줄에서 골랐어요", "Picked from a row marked ‘Key’") : L("지금 단계가 가장 낮은 줄에서 골랐어요", "Picked from the row where your step is lowest")) +
          note(`${d.axisName(pick.a)} · ${d.name(pick.td)}`, isEn()
            ? `In a course assignment or lab, take on a piece of work like this yourself once: “${E(bare(pick.l2))}”. When you finish, add the document you are left with to your experience record.`
            : `수업 과제나 실습에서 ${E(q(pick.l2))} 정도의 몫을 한 번 직접 맡아 보세요. 끝나면 그때 남은 문서를 경험 기록에 올려 두면 됩니다.`) + where : "")));
    }
  }
  if (depth >= 3 && g) {
    const fp = g.firstProject;
    const post = g.postingCheck.slice(0, 3);
    const watch = okText(g.watch) ? sentences(g.watch) : [];
    const side = [post.length ? note(L("공고에서 볼 것", "What to look for in postings"), ul(post.map(E))) : "", watch.length ? note(L("알아 둘 것", "Good to know"), ul(watch.map(E)), true) : ""].filter(Boolean);
    const head = L(`${nm} · 첫 프로젝트와 배울 순서`, `${nm} · First project and what to learn`);
    const main =
      T(L(`첫 프로젝트: ${E(fp.title)}`, `First project: ${E(fp.title)}`), E(sentences(fp.goal).join(" "))) +
      (fp.steps.length ? chain(fp.steps.slice(0, 4).map((s, i) => ({ head: L(`${i + 1}단계`, `Step ${i + 1}`), body: sayBare(s), color: C.navy })), { width: 700, height: 150 }) + chainHow(L("그 단계에서 할 일", "What to do at that step")) : "") +
      `<div class="two">
        <div class="card">${H(L("다 됐다고 볼 기준", "How you know it is done"))}<p class="big">${E(fp.check)}</p><p class="mut">${L("남길 것", "What to keep")}: ${E(fp.output)}</p></div>
        ${g.learnOrder.length ? `<div class="card">${H(L("배울 순서", "What to learn, in order"))}<ol class="lo">${g.learnOrder.slice(0, 4).map((l) => `<li><b>${E(l.step)}</b><span>${E(say(l.why))}</span></li>`).join("")}</ol></div>` : ""}
      </div>`;
    const more =
      (side.length === 2 ? `<div class="two">${side.join("")}</div>` : side.join("")) +
      (g.portfolio.length ? H(L("포트폴리오에 넣을 것", "For your portfolio")) + chips(g.portfolio.slice(0, 6), "art") : "");
    /* 영어는 한 장을 넘기 쉬워서 공고에서 볼 것부터 둘째 쪽으로 뗀다 */
    if (isEn() && more) out.push(P(head, main), P(`${head} (2)`, more));
    else out.push(P(head, main + more));
  }
  return out;
}

export function othersPages(x: Inputs, d: X, roles: RolePack[]): Page[] {
  if (!roles.length) return [];
  const anyGuide = roles.some((r) => x.guide.roles[r.code]);
  const name = L("그 밖의 직무", "Other roles");
  /* 영어 카드는 길어서 한 쪽에 두 줄이 안 들어간다. 한 줄씩 나눠 두면 쪽 모으기가 남은 자리로 끌어 올린다 */
  return paginate(roles, () => 1, isEn() ? 2 : 4).map((chunk, k) => P(`${name}${k ? ` (${k + 1})` : ""}`,
    (k ? cont(name) : T(L(`관심 목록 밖의 직무 ${roles.length}개도 살펴보세요`, `Take a look at ${nOf(roles.length, "the one role", `the ${roles.length} roles`)} outside your interest list too`),
      L("지금 경험이 적거나 관심 직무로 고르지 않은 직무들이에요. 마음이 가는 직무가 있다면 ‘들어가는 길’에 적힌 활동 하나부터 시작해 보세요.",
        `These are roles where you have less experience so far, or that you did not pick as interests. If one appeals to you, ${anyGuide ? "start with one activity listed under ‘Ways in’" : "start with one of its core areas"}.`))) +
    `<div class="g2">${chunk.map((r) => {
      const g = x.guide.roles[r.code];
      const c = d.roleCover(r);
      return `<div class="card"><h4>${E(r.name_ko)}</h4><p>${E(g ? (isEn() ? sen(g.summary) : g.summary) : say(r.owns))}</p><p class="k" style="margin-top:2mm">${L("핵심 영역", "Core areas")}</p><p>${r.core_ref.td.map((t) => dz(d, t)).join(" ")}</p>${c.req.length ? `<p class="k" style="margin-top:2mm">${L("특히 보는 판단", "Key decisions")}</p><p>${c.req.map((q0) => `${E(d.axisName(q0.axis))} ${pip(q0.level)}`).join("<br>")}</p>` : ""}${g && g.entry.length ? `<p class="k" style="margin-top:2mm">${L("들어가는 길", "Ways in")}</p>${ul(g.entry.slice(0, 2).map(E))}` : !g && r.application_material.length ? `<p class="k" style="margin-top:2mm">${L("지원 서류에 쓰는 결과물", "Deliverables for applications")}</p><p class="mut">${E(r.application_material.slice(0, 3).join(" · "))}</p>` : ""}</div>`;
    }).join("")}</div>` +
    (k ? "" : zoneLegend())));
}

export function aliasPages(x: Inputs, d: X): Page[] {
  const al = x.tax.job_aliases;
  if (!al.length) return [];
  const rf = (c: string) => x.tax.role_functions.find((v) => v.code === c)?.name ?? "";
  const oc = (c: string) => x.tax.org_contexts.find((v) => v.code === c)?.name ?? "";
  /* 영어는 낱말이 칸 안에서 접히는 줄 수로 잰다(칸 폭에 드는 글자 수). 한국어 무게는 그대로 */
  const ln = (t: string, per: number) => Math.max(1, Math.ceil(t.length / per));
  const weight = (a: typeof al[number]) => isEn()
    ? Math.max(ln(a.posting_name, 18), a.td.reduce((s, t) => s + ln(d.name(t), 22), 0), ln(a.rf.map(rf).join(", "), 40) + ln(a.oc.map(oc).join(", "), 40), ln(a.distinguisher, 24)) + 0.8
    : Math.max(2 + rowsOf(a.oc.map(oc).join(", "), 22), rowsOf(a.distinguisher, 20), a.td.length);
  const name = L("공고에 적히는 직무 이름", "Job titles in postings");
  return paginate(al, weight, 36, 28).map((chunk, k, all) => P(`${name}${k ? ` (${k + 1})` : ""}`,
    (k ? cont(name) : T(L("같은 일도 회사마다 다른 이름으로 공고에 나옵니다", "The same work appears under different job titles at different companies"),
      L("이름이 같아도 맡기는 권한이 다를 수 있어서, 공고 이름마다 어느 영역의 일인지와 비슷한 이름끼리 구별하는 기준을 적었습니다. 공고를 읽을 때는 마지막 칸에 비춰 담당 업무 문장을 확인해 보세요.",
        "The same title can come with different authority. For each title, this shows which area the work belongs to and how to tell it apart from similar titles. When you read a posting, check its list of duties against the last column.")) + zoneLegend()) +
    `<table class="tb tb-xs"><thead><tr><th class="${isEn() ? "w18" : "w22"}">${L("공고 이름", "Job title")}</th><th class="${isEn() ? "w22" : "w24"}">${L("영역", "Area")}</th><th>${L("하는 일 · 조직", "Function · employer")}</th><th class="${isEn() ? "w24" : "w30"}">${L("구별하는 기준", "How to tell it apart")}</th></tr></thead><tbody>${chunk.map((a) => `<tr><td><b>${E(a.posting_name)}</b></td><td>${a.td.map((t) => dz(d, t)).join(" ")}</td><td>${E(a.rf.map(rf).join(", "))}<br><span class="mut">${E(a.oc.map(oc).join(", "))}</span></td><td>${E(okText(a.distinguisher) ? say(a.distinguisher) : "")}</td></tr>`).join("")}</tbody></table>` +
    (k === all.length - 1 ? band(L("공고 찾을 때", "Searching postings"), L("검색창에는 이 표의 공고 이름을 그대로 넣고, 검색 결과에서는 ‘담당 업무’ 칸부터 읽어 보세요. 표의 이름은 업계에서 흔히 쓰는 이름을 모은 것입니다.",
      "Type the titles from this table into the search box as they are, and read the duties section of each result first. These are titles commonly used in industry.")) : "")));
}

/* 경계 카드의 위 띠 색. 관심·경험만 본 영역의 회색은 띠로는 안 보여서 한 단 짙게 칠한다 */
const sideColor = (z: string) => (ZC[z] === "#cfd5df" ? "#8c97ab" : ZC[z]);

export function boundaryPages(x: Inputs, d: X): Page[] {
  /* 물은 영역이나 관심이 높은 영역이 걸린 경계를 먼저, 여덟까지 */
  const rel = (td: string) => { const z = d.dom(td); return (z && d.asked(z) ? 2 : 0) + (z?.interest === "HIGH" ? 1 : 0); };
  const bs = x.tax.boundaries.filter((b) => [b.a_question, b.b_question, ...[b.shared, b.a_difference, b.b_difference].map(polite)].every(okText))
    .map((b, i) => ({ b, i, w: rel(b.a.td) + rel(b.b.td) })).sort((p, q0) => q0.w - p.w || p.i - q0.i).slice(0, 6).map((v) => v.b);
  if (!bs.length) return [];
  const side = (td: string, diff: string, ques: string) => `<div class="b4" style="--c:${sideColor(d.dom(td)?.zone ?? "NOT_EXPLORED")}"><b>${E(d.name(td))}</b><p>${E(say(diff))}</p><p class="mut">${isEn() ? `Ask yourself: ${E(askEn(ques))}` : `스스로 묻기: ${E(ques)}?`}</p></div>`;
  const name = L("가까운 두 일의 경계", "Where two close areas meet");
  return paginate(bs, () => 1, 4, 4).map((chunk, k) => P(`${name}${k ? ` (${k + 1})` : ""}`,
    (k ? cont(name) : T(L("가까운 두 영역 가운데 내가 더 자신 있는 쪽을 질문 하나로 가려 보세요", "Use one question to tell which of two close areas you are more confident in"),
      L("같은 일을 나눠 맡는 두 영역을 나란히 놓았어요. 칸마다 아래 질문에 ‘예’라고 답할 수 있으면, 그쪽이 지금 면접에서 더 자신 있게 이야기할 수 있는 영역입니다.",
        "Each card puts side by side two areas that share the same work. If you can answer ‘yes’ to the question in a box, that is the area you can talk about with more confidence in an interview right now.")) +
      zoneLegend(L("칸 위 띠", "Strip on top of each box"), sideColor)) +
    chunk.map((b) => `<div class="card"><p class="k">${E(b.pair)}</p><p class="sm">${L("함께 하는 일", "Shared work")}: ${E(say(b.shared))}</p><div class="two" style="margin-top:2mm">${side(b.a.td, b.a_difference, b.a_question)}${side(b.b.td, b.b_difference, b.b_question)}</div></div>`).join("")));
}

export function industryDeep(x: Inputs, d: X): Page[] {
  const p = d.goalInd ?? d.indOrder[0];
  if (!p) return [];
  const ic = x.m.industry_context?.code === p.code ? x.m.industry_context : null;
  const dims = p.judgement_dimensions;
  const pages: Page[] = [];
  /* 영어 판단 이름은 물음 한 줄이라 길어서 열 줄까지 싣는다(열두 줄이면 한 장을 조금 넘는다) */
  const shown = dims.filter((v) => okText(v.name)).slice(0, isEn() ? 10 : 12);
  const shownOk = shown.filter((v) => (d.level(v.domain, v.axis) ?? -1) >= 2).length;
  const pn = p.name_ko;
  const lead = d.goalInd
    ? L(`관심 산업으로 고르신 ${E(pn)}의 판단입니다.`, `You picked ${E(pn)} as your industry.`)
    : L(`관심 산업을 고르지 않아 ${E(j(pn, "을를"))} 예로 실었고, 다음 검사에서 고르면 그 산업으로 바뀝니다.`, `You did not pick an industry, so ${E(pn)} is shown as an example. If you pick one next time, this page will show that industry.`);
  const ask = (s: string) => (isEn() ? s.trim() : askNoun(s));
  pages.push(P(L(`${pn}에서 보는 판단`, `What ${pn} looks for`),
    T(L(`${E(pn)}에서는 이런 판단을 먼저 봅니다`, `These are the decisions ${E(pn)} looks at first`), E(okOr(p.scene, okOr(p.result_line)))) +
    chips(p.demands.filter(okText).slice(0, 4).map((t) => t.replace(/\.$/, ""))) +
    `<table class="tb tb-xs"><thead><tr><th>${L("이 산업이 보는 판단", "Decision this industry looks at")}</th><th>${L("영역", "Area")}</th><th>${L("왜", "Why")}</th><th>${L("내 지금 단계", "Your current step")}</th></tr></thead><tbody>${shown.map((v) => `<tr><td><b>${E(ask(v.name))}</b></td><td>${E(d.name(v.domain))}</td><td class="mut">${E(okOr(v.why))}</td><td>${pip(d.level(v.domain, v.axis))}</td></tr>`).join("")}</tbody></table>` +
    band(L("이 표를 쓰는 법", "Using this table"), `${lead} ${shownOk
      ? L(`표의 ${shown.length}가지 가운데 ${shownOk}가지는 이미 ‘${E(STEP_WORD[2].tag)}’ 이상이니, 나머지 줄에서 하나를 골라 수업 과제에 붙여 보세요.`, `${shownOk} of the ${shown.length} rows are already at ‘${E(STEP_WORD[2].tag)}’ or higher, so pick one of the other rows and attach it to a course assignment.`)
      : L("표 위쪽 줄부터 하나씩 수업 과제에 붙여 보세요.", "Work from the top of the table, attaching one row at a time to a course assignment.")}`)));
  const gaps = x.m.gaps.map((g) => g.axis).filter((a): a is Axis => !!a);
  const lang = [...new Set(gaps)].map((a) => ({ a, t: p.gap_language?.[a] })).filter((v) => okText(v.t)).slice(0, 4);
  const reading = (p.evidence_reading ?? []).filter((v) => okText(v.same) && okText(v.reads_as)).slice(0, 5);
  /* 둘째 쪽은 덧붙일 거리로 둔다. 남은 자리가 있는 쪽에만 실린다 */
  pages.push({ kind: "fill", ...P(L(`${pn}의 말로 다시 읽기`, `Your work in ${pn} terms`),
    T(L(`같은 경험도 ${E(pn)}에서는 다른 말로 읽힙니다`, `In ${E(pn)}, the same experience is described in different words`), E(okOr(p.result_line, L("수업과 과제에서 한 일을 이 산업에서는 어떤 말로 부르는지 모았어요. 지원서에는 오른쪽 말로 옮겨 써 보세요.", "This collects what the work you did in courses and assignments is called in this industry. In applications, use the words on the right.")))) +
    (reading.length ? H(L("이 산업에서 읽히는 말", "How this industry reads it"), L("산업 안내", "Industry guide")) + `<table class="tb tb-s"><thead><tr><th class="w34">${L("수업과 과제에서 한 일", "What you did in courses and assignments")}</th><th>${L("이 산업에서 읽히는 말", "How this industry reads it")}</th></tr></thead><tbody>${reading.map((v) => `<tr><td>${E(v.same)}</td><td>${E(v.reads_as)}</td></tr>`).join("")}</tbody></table>` : "") +
    (lang.length ? H(L("아직 채울 판단을 이 산업에서는 이렇게 부릅니다", "What this industry calls the decisions you still need to fill")) + ul(lang.map((v) => `<b>${E(d.axisName(v.a))}</b> ${E(say(v.t!))}`)) : "") +
    ((sideN) => (sideN.length === 2 ? `<div class="two">${sideN.join("")}</div>` : sideN.join("")))([
      ic?.answered?.length ? note(L("이 산업 문항으로 확인된 것", "Confirmed by this industry's questions"), ul(ic.answered.slice(0, 5).map((v) => `${E(v.domain ? d.name(v.domain) : "")} · ${E(v.axis ? d.axisName(v.axis) : "")}${v.owned ? L(" (직접 정함)", " (your call)") : ""}`))) : "",
      (p.job_aliases ?? []).length ? note(L("공고에서 자주 보는 이름", "Titles you often see in postings"), chips((p.job_aliases ?? []).slice(0, 6)), true) : "",
    ].filter(Boolean)) + (p.vocabulary?.length ? H(L("이 산업에서 쓰는 말", "Words used in this industry")) + chips(p.vocabulary.slice(0, 10)) : "")) });
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
  const first = (s: string) => (isEn() ? s.trim() : askNoun(s));
  return P(L(`${x.major} 전공이 가는 산업`, `Industries ${x.major} graduates go into`),
    T(k ? L(`${E(x.major)} 전공이 일하는 산업 ${rows.length}곳 가운데 ${k}곳은 내가 해 본 영역을 주로 씁니다`, `${k} of the ${rows.length} industries where ${E(x.major)} graduates work mainly use areas you have worked in`)
      : L(`${E(x.major)} 전공이 일하는 산업 ${rows.length}곳과 그 산업이 주로 쓰는 영역입니다`, `The ${rows.length} industries where ${E(x.major)} graduates work, and the areas each one mainly uses`),
      L("산업마다 주로 쓰는 영역을 적고, 영역 옆 점에 그 영역이 내 결과에서 어느 쪽인지 칠했어요. 오른쪽 칸은 그 산업이 먼저 따지는 판단입니다.",
        "Each industry lists the areas it mainly uses, and the dot next to each area shows where it sits in your results. The right-hand column is the decision that industry checks first.")) +
    zoneLegend() +
    `<table class="tb tb-xs"><thead><tr><th class="w22">${L("산업", "Industry")}</th><th>${L("중심으로 쓰는 영역", "Main areas")}</th><th class="w30">${L("그 산업에서 먼저 묻는 것", "What it asks first")}</th></tr></thead><tbody>${rows.map((r) => `<tr><td><b>${E(r.p.name_ko)}</b>${d.goalInd?.code === r.p.code ? ` <span class="mut sm">${L("고른 산업", "your pick")}</span>` : ""}</td><td>${r.rel.map((t) => dz(d, t)).join(" ")}</td><td class="mut">${E(first(r.p.judgement_dimensions[0]?.name ?? ""))}</td></tr>`).join("")}</tbody></table>` +
    band(L("이 표를 쓰는 법", "Using this table"), L(`영역 옆 점이 ${E(j(Z.Z1_EVIDENCE_ESTABLISHED.tag, "이나"))} ${E(Z.Z2_EVIDENCE_INCOMPLETE.tag)}인 칸이 많은 산업일수록, 그 산업 면접에서 바로 꺼낼 경험이 많아요.`,
      `The more dots marked ‘${E(Z.Z1_EVIDENCE_ESTABLISHED.tag)}’ or ‘${E(Z.Z2_EVIDENCE_INCOMPLETE.tag)}’ an industry has, the more experience you can bring up straight away in its interviews.`)));
}

export function orgPage(x: Inputs, d: X): Page {
  return orgPages(x, d)[0];
}
/** 일하는 자리 쪽. 장의 마지막 쪽이라 나누지 않는다(나누면 뒤쪽이 거의 빈 채로 장이 끝난다) */
export function orgPages(x: Inputs, d: X): Page[] {
  const td = d.strengths[0]?.code ?? d.radarDoms[0]?.code ?? x.defs[0].code;
  const oo = d.def(td)?.org_outcomes ?? {};
  const goalOc = x.m.targets.goal.org;
  const dn = d.name(td);
  const name = L("일하는 자리마다 다른 기준", "Different workplaces, different standards");
  const main =
    T(L(`같은 ${E(dn)}의 일도 일하는 자리에 따라 평가 기준이 다릅니다`, `Where you work changes how ${E(dn)} work is judged`),
      L(`일하는 자리 ${x.tax.org_contexts.length}가지마다 ${E(dn)}의 일을 무엇으로 평가하는지 정리했어요. 자리의 성격별로 흔히 쓰는 기준이라, 실제 기관의 평가 방식은 그 기관의 공고와 누리집에서 한 번 더 확인해 보세요.`,
        `What ${E(dn)} work is judged on in each of ${x.tax.org_contexts.length} kinds of workplace. These are typical standards, so check a real employer's postings and website to see how it judges the work.`)) +
    `<table class="tb tb-xs"><thead><tr><th class="w22">${L("일하는 자리", "Workplace")}</th><th class="w24">${L("무엇으로 평가되나", "What it is judged on")}</th><th>${L("그 자리의 특징", "What sets it apart")}</th><th class="w24">${L(`${E(dn)}의 결과`, "What counts as a result")}</th></tr></thead><tbody>${x.tax.org_contexts.map((o) => `<tr><td><b>${E(o.name)}</b>${goalOc === o.code ? ` <span class="mut sm">${L("고른 자리", "your pick")}</span>` : ""}</td><td>${E(o.performance)}</td><td class="mut">${E(okText(o.differs) ? say(o.differs) : "")}</td><td>${E(okOr(oo[o.code]))}</td></tr>`).join("")}</tbody></table>`;
  const parts =
    (isEn() ? H("Within one area, people take on different parts of the work") : H("같은 영역 안에서도 맡는 몫이 다릅니다", "몫마다 남기는 것")) +
    /* 영어는 `Leaves behind:` 를 칸마다 붙이면 줄이 하나씩 늘어 장을 넘긴다. 머리줄에 한 번만 적는다 */
    `<table class="tb tb-xs">${isEn() ? `<thead><tr><th>Part of the work</th><th>What it does</th><th style="width:42%">What it leaves behind</th></tr></thead>` : ""}<tbody>${x.tax.role_functions.map((f) => `<tr><th class="w22">${E(f.name)}</th><td>${E(say(f.one_line))}</td><td class="mut w34">${isEn() ? "" : "남기는 것: "}${E(f.output_kind)}</td></tr>`).join("")}</tbody></table>`;
  return [P(name, main + parts)];
}

export function ch4Pages(x: Inputs, d: X, roomy = false): Page[] {
  const out: Page[] = [matrixPage(x, d), ...coveragePages(x, d)];
  const [r0, r1, r2, ...rest] = d.roleOrder;
  if (r0) out.push(...rolePages(x, d, r0, 3));
  /* 지역 장이 없는 책은 둘째 직무를 두 쪽으로 싣는다(쪽 수를 70~80 안에 두려는 배분이다) */
  if (r1) out.push(...rolePages(x, d, r1, roomy ? 2 : 1));
  if (r2) out.push(...rolePages(x, d, r2, 1));
  out.push(...othersPages(x, d, rest));
  out.push(...aliasPages(x, d), ...boundaryPages(x, d), ...industryDeep(x, d), industriesPage(x, d), ...orgPages(x, d));
  return out;
}
