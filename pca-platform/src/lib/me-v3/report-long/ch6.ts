/**
 * 06 자기소개서·면접 준비. 재료는 참여자가 고른 근거, 검사에서 직접 했다고 답한 판단,
 * 적어 둔 경험 기록, 목표 직무의 안내(면접 질문 · 포트폴리오 · 첫 프로젝트)뿐이다.
 *
 * 빈 칸을 늘어놓지 않고 초안을 먼저 채운다. 밑줄 친 말은 참여자가 고르거나 답한 것을
 * 그대로 옮긴 말이고, 맡은 범위 · 기준 · 달라진 점처럼 응답에 없는 것은 짧은 빈칸으로
 * 남긴다. 응답에 없는 사실을 지어 넣지 않는다. 쓰는 줄은 장 전체에 한 곳만 둔다.
 */
import type { Axis } from "../scoring/types";
import type { EvidenceGroup } from "../result/model";
import { josaOf } from "../result/josa";
import type { Inputs, RoleGuide } from "./types";
import { type X } from "./derive";
import { C, donut } from "./charts";
import { E, H, PAL, T, band, chips, lines, mine, note, tag, ul, type Page } from "./kit";
import { AXIS_NEED, actionHead, askNoun, j, polite, q } from "./text";

const P = (title: string, body: string): Page => ({ part: "06", partName: "자기소개서·면접 준비", title, body });

/** 참여자가 채울 짧은 빈칸 */
const B = (mm = 22) => `<span class="blank" style="display:inline-block;min-width:${mm}mm;border-bottom:1px dashed #9aa3b2"></span>`;
/** 참여자가 고르거나 답한 말을 그대로 옮긴 자리 */
const U = (t: string) => `<u style="text-decoration:none;border-bottom:1.5px solid ${PAL.amber}">${E(t)}</u>`;
/** `~했다` 로 끝나는 문장인가 */
const isAct = (s: string) => /다$/.test(s.trim());
/** 낱말 하나 또는 둘을 밑줄로 잇고 조사를 붙인다 */
const joinU = (xs: string[], tail: "을를" | "과와") => {
  const ys = xs.filter(Boolean).slice(0, 2);
  if (!ys.length) return "";
  const last = ys[ys.length - 1];
  return `${ys.length === 2 ? `${U(ys[0])}${josaOf(ys[0], "과와")} ` : ""}${U(last)}${josaOf(last, tail)}`;
};
const ym = (s: string | null) => (s ? s.slice(0, 7).replace("-", ".") : "");

type Story = {
  domain: string; axis: Axis;
  /** 직접 정했거나 해 봤다고 고른 말 · 답한 말(`~했다`) */
  did: string[];
  artifacts: string[]; made: string | null;
  verifications: string[]; compared: string | null;
  record: string | null; period: string | null;
  ready: boolean;
  /** pick: 체크리스트에서 고른 항목 · answer: 검사에서 직접 했다고 답한 판단 */
  from: "pick" | "answer";
};

function recordOf(x: Inputs, td: string) {
  const r = x.exps.find((e) => e.td_codes.includes(td));
  if (!r) return { record: null, period: null, artifacts: [] as string[], verifications: [] as string[], decisions: [] as string[] };
  const period = [ym(r.started_on), ym(r.ended_on)].filter(Boolean).join("~") || null;
  return { record: r.title, period, artifacts: r.artifacts ?? [], verifications: r.verifications ?? [], decisions: (r.decisions ?? []).filter(isAct) };
}

function stories(x: Inputs, d: X): Story[] {
  const groups: (EvidenceGroup & { ready: boolean })[] = [
    ...x.m.evidence.ready.map((g) => ({ ...g, ready: true })), ...x.m.evidence.partial.map((g) => ({ ...g, ready: false })),
  ];
  const l2 = (td: string, a: Axis) => d.def(td)?.axes?.[a]?.l2 ?? null;
  const confirmed = (td: string, a: Axis) => !!d.dom(td)?.confirmed.includes(a);
  const seen = new Set<string>();
  const out: Story[] = [];
  for (const g of groups) {
    if (seen.has(g.domain) && out.length >= 2) continue;
    const z = d.dom(g.domain);
    if (!z) continue;
    const picks = g.picks.filter((p) => !z.artifacts.includes(p) && !z.verifications.includes(p));
    if (!picks.length && !g.picks.length) continue;
    seen.add(g.domain);
    const rc = recordOf(x, g.domain);
    const did = [...(picks.length ? picks : g.picks).filter(isAct), ...rc.decisions].filter((v, i, a) => a.indexOf(v) === i);
    out.push({
      domain: g.domain, axis: g.axis, did,
      artifacts: [...z.artifacts, ...rc.artifacts].filter((v, i, a) => a.indexOf(v) === i),
      made: confirmed(g.domain, "J5") ? l2(g.domain, "J5") : null,
      verifications: [...z.verifications, ...rc.verifications].filter((v, i, a) => a.indexOf(v) === i),
      compared: confirmed(g.domain, "J6") ? l2(g.domain, "J6") : null,
      record: rc.record, period: rc.period, ready: g.ready, from: "pick",
    });
    if (out.length >= 4) break;
  }
  if (out.length) return out;
  /* 고른 항목이 없으면 검사에서 직접 해 봤다고 답한 판단(확인된 축)으로 만든다. 답한 말은 영역 사전의 그 단계 문장이다 */
  /* 정한 것 줄에는 정하는 판단(직접 판단 · 요구 해석 · 문제 정의)만 싣는다 */
  const ORDER: Axis[] = ["J3", "J2", "J1"];
  for (const z of d.strengths) {
    const axes = ORDER.filter((a) => z.confirmed.includes(a) && l2(z.code, a));
    if (!axes.length && !z.confirmed.includes("J5")) continue;
    const rc = recordOf(x, z.code);
    out.push({
      domain: z.code, axis: axes[0] ?? "J5", did: [...axes.slice(0, 2).map((a) => l2(z.code, a)!), ...rc.decisions].slice(0, 3),
      artifacts: rc.artifacts, made: z.confirmed.includes("J5") ? l2(z.code, "J5") : null,
      verifications: rc.verifications, compared: z.confirmed.includes("J6") ? l2(z.code, "J6") : null,
      record: rc.record, period: rc.period, ready: false, from: "answer",
    });
    if (out.length >= 4) break;
  }
  return out;
}

/** 한 장면을 네 줄 초안으로. 줄마다 [이름표, 문장 HTML] */
function draftLines(d: X, s: Story): [string, string][] {
  const nm = d.name(s.domain);
  const where = s.record ? `${U(s.record)}${s.period ? ` (${E(s.period)})` : ""}` : B(30);
  const did = s.did.slice(0, 2);
  return [
    ["상황", `${where}에서 ${E(nm)} 쪽 일을 했습니다. 제가 맡은 범위는 ${B()}입니다.`],
    ["정한 것", did.length ? `${did.map((t) => U(polite(t))).join(" ")} 그렇게 정한 기준은 ${B()}입니다.` : `제가 직접 정한 것은 ${B(40)}입니다.`],
    ["남긴 것", s.artifacts.length ? `그 결과로 ${joinU(s.artifacts, "을를")} 남겼습니다.` : s.made ? U(polite(s.made)) : `남긴 결과물은 ${B(30)}입니다.`],
    ["달라진 것", s.verifications.length ? `${joinU(s.verifications.slice(0, 1), "과와")} 비교해 보니 ${B()} 점이 달라졌습니다.` : s.compared ? `${U(polite(s.compared))} 그 결과 ${B()} 점이 달라졌습니다.` : `비교한 대상은 ${B()}, 달라진 점은 ${B()}입니다.`],
  ];
}

/** 아직 장면이 없을 때: 목표 직무의 첫 프로젝트를 끝낸 뒤 쓸 문단의 뼈대 */
function planLines(g: RoleGuide): [string, string][] {
  const fp = g.firstProject;
  return [
    ["할 일", `${U(fp.title)}. ${E(polite(fp.goal))}`],
    ["정할 것", g.practice.J3 ? E(polite(g.practice.J3.task)) : `직접 정할 기준 하나는 ${B(30)}입니다.`],
    ["남길 것", `${U(fp.output)}`],
    ["확인할 것", `끝난 뒤에는 ${E(askNoun(fp.check.replace(/[?.]$/, "")))} 스스로 따져 봅니다.`],
  ];
}
const frame = (rows: [string, string][], head = "") => `<div class="frame">${head}${rows.map(([k, v]) => `<p><span class="fb">[${k}]</span> ${v}</p>`).join("")}</div>`;

const goalGuide = (x: Inputs, d: X) => {
  const r = d.goalRole ?? d.roleOrder[0];
  return r ? { r, g: x.guide.roles[r.code] as RoleGuide | undefined } : null;
};

export function storyPages(x: Inputs, d: X): Page[] {
  const ss = stories(x, d);
  if (!ss.length) {
    const gg = goalGuide(x, d);
    return [P("자기소개서 초안",
      T("자기소개서에 쓸 장면을 이번 검사에서는 찾지 못했습니다", gg?.g ? `직접 해 봤다고 답한 판단이 없어 경험 문단을 만들 재료가 없었습니다. 대신 목표 직무인 ${E(gg.r.name_ko)}의 첫 프로젝트를 끝낸 뒤 쓸 문단의 뼈대를 미리 적어 두었습니다. 아직 하지 않은 일이니 끝낸 다음 실제로 한 대로 고쳐 쓰세요.` : "직접 해 봤다고 답한 판단이 없어 경험 문단을 만들 재료가 없었습니다. 07장의 30일 할 일 하나를 끝내면 그 결과물로 첫 문단을 쓸 수 있습니다.") +
      (gg?.g ? frame(planLines(gg.g)) : "") +
      band("쓰는 법", "한 문단에는 판단 하나만 깊게 씁니다."))];
  }
  const out: Page[] = [];
  for (let a = 0; a < ss.length; a += 2) {
    const st = ss.slice(a, a + 2);
    out.push(P(`자기소개서 초안 ${a + 1}${st.length > 1 ? `·${a + 2}` : ""}`,
      T(a === 0 ? (ss[0].from === "pick" ? "고르신 항목으로 자기소개서 초안을 먼저 만들었습니다" : "검사 응답으로 자기소개서 초안을 먼저 만들었습니다") : "초안이 더 있습니다",
        a === 0 ? `밑줄 친 말은 ${ss[0].from === "pick" ? "고르신 항목" : "검사에서 직접 해 봤다고 답하신 내용"}을 그대로 옮긴 것이고, 점선은 응답에 없어 비워 둔 자리입니다. 실제와 다른 문장은 지우거나 고쳐 쓰세요.` : "같은 방식으로 만든 초안입니다. 쓸 만한 장면 하나를 골라 깊게 쓰시면 됩니다.") +
      st.map((s) => {
        const roles = d.rolesOf(s.domain).filter((r) => r.strength === "중심").slice(0, 3).map((r) => d.roleName(r.role)).filter(Boolean);
        const label = s.from === "answer" ? tag("응답으로 만든 초안", C.teal) : s.ready ? tag("바로 쓸 수 있음", C.navy) : tag("보완하면 쓸 수 있음", C.teal);
        const head = `<div class="story-h"><b>${E(d.name(s.domain))} · ${E(d.axisName(s.axis))}</b><span>${label}${roles.length ? ` 이어지는 직무: ${E(roles.join(" · "))}` : ""}</span></div>`;
        return frame(draftLines(d, s), head);
      }).join("")));
  }
  return out;
}

export function framePage(x: Inputs, d: X): Page {
  const s = stories(x, d)[0];
  const gg = goalGuide(x, d);
  const para = s ? draftLines(d, s).map(([, v]) => v).join(" ") : gg?.g ? planLines(gg.g).map(([, v]) => v).join(" ") : "";
  return P("자기소개서 문단",
    T("네 줄을 이으면 한 문단이 됩니다", s ? "첫 번째 초안을 한 문단으로 이어 붙였습니다. 점선만 채워도 읽히는 문단이 되도록 순서를 상황, 정한 것, 남긴 것, 달라진 것으로 맞췄습니다." : "아직 쓸 장면이 없어 첫 프로젝트 뼈대를 한 문단으로 이었습니다. 프로젝트를 끝낸 뒤 실제로 한 대로 바꿔 쓰세요.") +
    (para ? `<div class="frame"><p>${para}</p></div>` : "") +
    `<div class="two">
      ${note("잘 읽히는 문단", ul(["한 문단에는 판단 하나만 깊게 씁니다", "‘우리’보다 ‘제가 정한 것’을 주어로 씁니다", "숫자 하나와 기간 하나를 넣습니다"]))}
      ${note("자주 걸리는 곳", ul(["경험 여러 개를 한 문단에 늘어놓기", "느낀 점으로 문단을 끝내기", "결과물 이름 없이 ‘열심히 했다’고만 쓰기"]), true)}
    </div>` + lines(4, "초안을 내 말로 고쳐 쓴 문단"));
}

export function portfolioPage(x: Inputs, d: X): Page {
  const have = [...new Set(x.m.domains.flatMap((z) => z.artifacts.map((a) => `${a}|${z.code}`)))].map((k) => { const [a, td] = k.split("|"); return { title: a, td, status: "보유" as const }; });
  const make = x.m.actions.filter((a) => a.code === "BUILD_OUTPUT" && a.domain).map((a) => ({ title: a.material.artifacts[0] ?? a.material.workflow?.output ?? "", td: a.domain!, status: "새로 만들기" as const })).filter((v) => v.title);
  const rec = x.exps.flatMap((e) => e.artifacts.map((a) => ({ title: a, td: e.td_codes[0] ?? "", status: "보유" as const })));
  const all = [...have, ...rec, ...make].filter((v, i, arr) => arr.findIndex((w) => w.title === v.title) === i).slice(0, 14);
  const nh = all.filter((v) => v.status === "보유").length;
  const nm = all.length - nh;
  const gg = goalGuide(x, d);

  /* 첫 장 초안: 가진 결과물이 있으면 그것, 없으면 새로 만들 것, 그것도 없으면 목표 직무의 포트폴리오 첫 항목 */
  const pick = all.find((v) => v.status === "보유") ?? all[0] ?? (gg?.g?.portfolio?.[0] ? { title: gg.g.portfolio[0], td: "", status: "새로 만들기" as const } : null);
  const z = pick?.td ? d.dom(pick.td) : undefined;
  const ev = z ? d.evidenceOf(z) : null;
  const where = pick ? x.exps.find((e) => e.artifacts.includes(pick.title))?.title ?? null : null;
  const decided = ev?.decisions[0] ?? (z && z.confirmed.includes("J3") ? d.def(z.code)?.axes?.J3?.l2 : null) ?? null;
  const iq = gg?.g?.interview.find((v) => v.axis === "J5") ?? gg?.g?.interview[0];
  const sheet: [string, string][] = pick ? [
    ["결과물", `${U(pick.title)}${pick.td ? ` · ${E(d.name(pick.td))}` : ""}${pick.status === "새로 만들기" ? " · 새로 만들 것" : ""}`],
    ["어떤 과제에서", where ? U(where) : `${B(36)} (과제, 실습, 연구 이름)`],
    [pick.status === "새로 만들기" ? "그 영역에서 정해 본 것" : "내가 정한 것", decided ? U(polite(decided)) : `직접 정한 기준 한 줄: ${B(36)}`],
    ["비교한 대상", ev?.comparisons[0] ? `${U(ev.comparisons[0])} · 결과는 ${B()}` : `${B()} · 결과는 ${B()}`],
    ["답할 면접 질문", iq ? E(iq.q) : `이 결과물로 답할 질문 하나: ${B(36)}`],
  ] : [];

  return P("포트폴리오 목록",
    T(all.length ? (nh ? `포트폴리오에 넣을 결과물은 ${nh}개가 이미 있고, ${nm ? `${nm}개는 새로 만들면 됩니다` : "새로 만들 것은 없습니다"}` : `포트폴리오에 넣을 결과물은 아직 없고, 새로 만들 것이 ${nm}개입니다`) : "포트폴리오에 넣을 결과물을 아직 고르지 않으셨습니다",
      "검사와 경험 기록에서 고르신 결과물에, 07장 할 일로 새로 만들 결과물을 더해 한 목록으로 정리했습니다.") +
    (all.length ? (nh && nm
      ? `<div class="two r46"><div class="card cen">${donut([{ label: "보유", value: nh, color: PAL.teal }, { label: "새로 만들기", value: nm, color: PAL.amber }], { size: 200, center: [`${nh}`, "이미 가진 결과물"] })}<div class="lg"><span><i style="background:${PAL.teal}"></i>보유 ${nh}</span><span><i style="background:${PAL.amber}"></i>새로 만들기 ${nm}</span></div></div>`
      : "") + `<table class="tb tb-xs"><thead><tr><th>결과물</th><th>상태</th><th>영역</th></tr></thead><tbody>${all.map((v) => `<tr><td><b>${E(v.title)}</b></td><td>${tag(v.status, v.status === "보유" ? C.teal : C.amber)}</td><td class="mut">${E(v.td ? d.name(v.td) : "")}</td></tr>`).join("")}</tbody></table>${nh && nm ? "</div>" : ""}`
      : `<div class="na-box"><b>고른 결과물이 없습니다</b>다음 과제에서 남길 결과물 이름을 먼저 정해 두면 이 목록이 생깁니다.</div>`) +
    (sheet.length ? H("포트폴리오 첫 장 초안", "결과물 하나에 정한 것 한 줄, 비교한 대상 한 줄이면 한 장이 됩니다") + frame(sheet) : ""));
}

/** 해 본 장면을 말한 뒤 붙이는 한 문장. 응답에 없는 것은 빈칸으로 둔다 */
const FOLLOW: Record<Axis, string> = {
  J1: `그때 다루기로 한 범위는 ${B()}이고, 뺀 것은 ${B()}입니다.`,
  J2: `그때 요구를 옮긴 수치는 ${B()}입니다.`,
  J3: `그렇게 정한 기준은 ${B()}이고, 고르지 않은 안은 ${B()}입니다.`,
  J4: `그 방법을 고른 까닭은 ${B()}입니다.`,
  J5: `그 결과물을 받아 쓴 사람은 ${B()}입니다.`,
  J6: `두 값의 차이는 ${B()} 정도였고, 그 까닭은 ${B()} 때문이라고 봤습니다.`,
  J7: `원인은 ${B()} 쪽이었고, 고친 뒤에는 ${B()} 방법으로 다시 확인했습니다.`,
  J8: `그 결과는 ${B()} 결정에 쓰였습니다.`,
};

/** 고른 판단을 다시 묻는 꼬리 질문과 답하는 순서. 판단마다 면접관이 파고드는 데가 다르다 */
const ASK: Record<Axis, { q: string; dir: string }> = {
  J1: { q: "다루지 않기로 한 것은 무엇이었고, 왜 뺐나요?", dir: "맡은 범위, 뺀 것, 뺀 까닭 순서로 답합니다." },
  J2: { q: "받은 요구를 어떤 수치로 바꿨고, 그 값은 어떻게 정했나요?", dir: "받은 요구, 옮긴 수치, 그 값의 근거 순서로 답합니다." },
  J3: { q: "그때 무엇을 기준으로 정했고, 다른 안은 왜 고르지 않았나요?", dir: "기준, 버린 안, 결과 순서로 30초 안에 답합니다." },
  J4: { q: "그 방법이나 도구를 고른 까닭은 무엇이었나요?", dir: "쓴 방법, 다른 방법 대신 고른 까닭, 그 방법의 한계 순서로 답합니다." },
  J5: { q: "그 결과물은 누가 받아서 어디에 썼나요?", dir: "결과물 이름, 받은 사람, 쓰인 곳 순서로 답합니다." },
  J6: { q: "비교해 보니 무엇이 달랐고, 그 차이를 어떻게 설명했나요?", dir: "비교한 대상, 차이의 크기, 차이의 까닭 순서로 답합니다." },
  J7: { q: "원인을 어떻게 좁혔고, 무엇을 고쳤나요?", dir: "생긴 문제, 원인을 좁힌 순서, 고친 뒤 확인한 방법 순서로 답합니다." },
  J8: { q: "그 결과가 어떤 결정에 쓰였나요?", dir: "내 결과, 그것을 쓴 사람, 바뀐 결정 순서로 답합니다." },
};

type Qn = { q: string; why: string; material: string; dir: string; draft: string };

function questions(x: Inputs, d: X): Qn[] {
  const out: Qn[] = [];
  const asks = (a: Axis) => `${askNoun(d.axisWhat(a))} 듣고 싶어서 하는 질문입니다.`;
  for (const g of x.m.evidence.ready.slice(0, 4)) {
    const z = d.dom(g.domain);
    const pick = g.picks.find((p) => !z?.artifacts.includes(p) && isAct(p)) ?? g.picks.find((p) => !z?.artifacts.includes(p)) ?? g.picks[0];
    if (!pick) continue;
    const art = z?.artifacts[0];
    out.push({
      q: `${d.name(g.domain)}에서 ${q(pick)}고 하셨는데, ${ASK[g.axis].q}`,
      why: asks(g.axis),
      material: `${pick}${art ? ` · 결과물 ${art}` : ""}`,
      dir: ASK[g.axis].dir,
      draft: `“${E(d.name(g.domain))} 과제에서 ${isAct(pick) ? U(polite(pick)) : `${U(pick)}${josaOf(pick, "을를")} 맡았습니다.`} ${FOLLOW[g.axis]}${art && g.axis !== "J5" ? ` 그 과제에서 남긴 결과물은 ${U(art)}입니다.` : ""}”`,
    });
  }
  for (const g of x.m.evidence.partial.slice(0, 2)) {
    const pick = g.picks.find(isAct) ?? g.picks[0];
    if (!pick || out.length >= 5) continue;
    out.push({
      q: `${d.name(g.domain)}에서 ${q(pick)}고 하셨는데, 그 결과를 무엇과 비교해 확인했나요?`, why: asks(g.axis), material: pick,
      dir: "비교한 대상이 아직 없다면 다음 과제에서 비교표 한 장을 만들고, 그 표를 들고 답하는 편이 낫습니다.",
      draft: `“${isAct(pick) ? U(polite(pick)) : U(pick)} 그 결과를 ${B()}에 대어 보니 ${B()} 정도 차이가 났고, 그 까닭은 ${B()} 때문이라고 봤습니다.”`,
    });
  }
  for (const g of d.gaps.slice(0, 3)) {
    if (out.length >= 6 || !g.axis) continue;
    const l2 = d.def(g.domain)?.axes?.[g.axis]?.l2;
    const act = d.actionOf(g);
    const head = act ? actionHead(act, d.name(g.domain)) : "";
    out.push({
      q: l2 ? `${d.name(g.domain)}에서 ${q(l2)} 같은 일을 직접 해 본 적이 있나요?` : `${d.name(g.domain)}에서 ${j(AXIS_NEED[g.axis], "을를")} 직접 맡아 본 적이 있나요?`,
      why: `${asks(g.axis)} 이번 결과에서는 이 판단을 해 본 장면이 아직 확인되지 않았습니다.`,
      material: head ? `아직 장면이 없습니다. 07장 할 일 ${q(head)}에서 다룹니다.` : "아직 장면이 없습니다. 07장 할 일과 이어집니다.",
      dir: "해 보지 않은 일은 해 봤다고 하지 않습니다. 07장 할 일을 다음 과제로 정해 두었다면, 무엇을 준비하고 있는지로 답하면 됩니다.",
      draft: `“아직 혼자 맡아 본 적은 없습니다. ${head ? `${U(head)}${josaOf(head, "을를")}` : `${B(30)} 과제를`} 다음 과제로 정해 두었고, 해 보면 ${B()} 기준부터 직접 정해 보려고 합니다.”`,
    });
  }
  return out.slice(0, 6);
}

export function interviewPages(x: Inputs, d: X): Page[] {
  const qs = questions(x, d);
  if (!qs.length) return [];
  const out: Page[] = [];
  for (let a = 0; a < qs.length; a += 3) {
    out.push(P(`면접 질문 ${a + 1}–${Math.min(a + 3, qs.length)}`.replace("–", "~"),
      T(a === 0 ? "면접관은 고르신 판단을 다시 물어봅니다" : "질문이 더 있습니다", a === 0 ? "질문은 고르신 근거와 이번 결과에서 비어 있는 자리로 만들었습니다. 질문마다 답변 초안을 붙였으니 점선을 채우고 소리 내어 한 번씩 말해 보세요." : "답변 초안은 앞쪽과 같은 방식으로 만들었습니다.") +
      qs.slice(a, a + 3).map((v, i) => `<div class="qa"><div class="qa-q"><span>Q${a + i + 1}</span><b>${E(v.q)}</b></div>
        <div class="g3 qa-b"><div><p class="k">왜 묻나</p><p>${E(v.why)}</p></div><div><p class="k">내 재료</p><p>${E(v.material)}</p></div><div><p class="k">답하는 순서</p><p>${E(v.dir)}</p></div></div>
        ${mine("답변 초안", v.draft)}</div>`).join("")));
  }
  return out;
}

export function roleQPage(x: Inputs, d: X): Page {
  const r = d.goalRole ?? d.roleOrder[0];
  const g = x.guide.roles[r.code];
  const best = (a: Axis) => d.best.find((b) => b.axis === a) ?? null;
  const items = g ? g.interview.slice(0, 3).map((v) => ({ axis: v.axis, q: v.q, why: v.why })) : r.items.filter((it) => r.required_axes.includes(it.axis)).slice(0, 3).map((it) => ({ axis: it.axis, q: it.ask, why: `${d.name(it.domain)}에서 ${d.axisWhat(it.axis)}` }));
  return P(`${r.name_ko} 직무 면접 질문`,
    T(`${E(r.name_ko)} 직무 면접에서 자주 나오는 질문입니다`, g ? "직무 안내에 실린 질문이고, 옆에 지금 어디까지 해 봤는지를 붙였습니다. 해 본 판단은 그 장면으로 답하고, 아직인 판단은 연습 과제로 준비하시면 됩니다." : "직무팩의 질문을 면접 질문으로 옮겼고, 옆에 지금 어디까지 해 봤는지를 붙였습니다.") +
    items.map((v) => {
      const b = best(v.axis);
      const lv = b?.level ?? null;
      const td = b?.where[0];
      const l2 = td ? d.def(td)?.axes?.[v.axis]?.l2 : null;
      const pr = g?.practice?.[v.axis];
      const draft = lv != null && lv >= 2 && td && l2
        ? `“${E(d.name(td))} 과제에서 ${U(polite(l2))} ${FOLLOW[v.axis]}”`
        : pr ? `아직 장면이 없다면 이 연습부터 해 보세요. ${E(polite(pr.task))} 끝나면 ${U(pr.output)}${josaOf(pr.output, "이가")} 남고, 그것으로 답하면 됩니다.`
        : `“아직 직접 해 본 적은 없고, ${B(30)}에서 처음 해 보려고 준비하고 있습니다.”`;
      return `<div class="qa"><div class="qa-q"><span>${E(d.axisName(v.axis))}</span><b>${E(v.q)}</b></div><div class="two qa-b"><div><p class="k">왜 묻나</p><p>${E(polite(v.why))}</p></div><div><p class="k">지금 단계</p><p>${lv == null ? "이번 검사에서 묻지 않았습니다" : ["해 본 적 없음", "지시받아 수행", "직접 수행", "기준까지 직접 결정"][lv]}</p><p class="mut sm">${lv != null && lv >= 2 ? "해 본 판단입니다. 답할 장면 하나를 미리 정해 두세요." : "아직 장면이 적은 판단입니다. 07장 30일 할 일과 이어집니다."}</p></div></div>${mine(lv != null && lv >= 2 ? "답변 초안" : "준비 방법", draft)}</div>`;
    }).join("") + band("연습", "질문마다 30초 안에 소리 내어 답해 보고, 막힌 대목은 초안 옆에 적어 두세요."));
}

export function checkPage(x: Inputs, d: X): Page {
  const groups: [string, string[]][] = [
    ["자기소개서", ["문단마다 ‘제가 정한 것’이 하나씩 들어 있다", "결과물 이름이 문장 안에 있다", "결과 수치와 기간을 직접 적었다", "공고의 담당 업무 표현을 그대로 썼다"]],
    ["포트폴리오", ["결과물마다 정한 것 한 줄과 비교한 대상 한 줄이 있다", "가진 결과물 가운데 셋을 골랐다", "새로 만들 결과물 하나의 마감일을 정했다"]],
    ["면접", ["질문마다 답할 장면 하나를 정했다", "버린 안과 그 까닭을 말할 수 있다", "내 결과가 다음 결정에 쓰인 장면을 하나 준비했다"]],
    ["기관 조사", ["공시, 누리집, 채용 공고를 직접 열어 봤다", "한 장 정리 양식을 채웠다", "아직 확인하지 못한 것을 적어 두었다"]],
  ];
  /* 30초 자기소개 초안: 전공 · 가장 분명한 강점 하나(답한 말) · 목표 직무 */
  const st = d.strengths[0];
  const s0 = stories(x, d)[0];
  const strongLine = s0?.did[0] ?? (st ? st.confirmed.map((a) => d.def(st.code)?.axes?.[a]?.l2).find(Boolean) : null) ?? null;
  const strongDom = s0 ? d.name(s0.domain) : st ? d.name(st.code) : null;
  const goal = d.goalRole?.name_ko ?? null;
  const intro = `“${E(j(x.major, "을를"))} 공부하고 있는 ${E(x.person)}입니다. 제가 가장 자신 있게 설명할 수 있는 일은 ${strongDom ? `${E(strongDom)} 쪽입니다.${strongLine ? ` ${E(strongDom)} 과제에서 ${U(polite(strongLine))}` : ""}` : `${B(30)} 쪽입니다.`} ${goal ? `${U(goal)} 직무에서` : `${B(30)} 직무에서`} 이 경험을 이어 가고 싶어서, 지금은 ${B(30)} 준비하고 있습니다.”`;
  const mats = d.goalRole ? d.goalRole.application_material.slice(0, 3) : [];
  return P("제출 전 점검표",
    T("제출하기 전에 열세 가지를 확인해 보세요", "하나씩 확인하면서 직접 표시하시면 됩니다.") +
    `<div class="g2">${groups.map(([h, xs]) => `<div class="card">${H(h)}<ul class="cb">${xs.map((t) => `<li><i></i>${E(t)}</li>`).join("")}</ul></div>`).join("")}</div>` +
    mine("30초 자기소개 초안 · 밑줄은 내 결과에서 옮긴 말", intro) +
    (mats.length ? `<p class="k">${E(d.goalRole!.name_ko)} 지원서에 붙이면 좋은 자료</p>${chips(mats, "art")}` : ""));
}

export function ch6Pages(x: Inputs, d: X): Page[] {
  return [...storyPages(x, d), framePage(x, d), portfolioPage(x, d), ...interviewPages(x, d), roleQPage(x, d), checkPage(x, d)];
}
