/**
 * 06 자기소개서·면접 준비. 재료는 학생이 고른 근거, 검사에서 직접 했다고 답한 판단,
 * 적어 둔 경험 기록, 목표 직무의 안내(면접 질문 · 포트폴리오 · 첫 프로젝트)뿐이다.
 *
 * 빈 칸을 늘어놓지 않고 초안을 먼저 채운다. 밑줄 친 말은 학생이 고르거나 답한 것을
 * 그대로 옮긴 말이고, 맡은 범위 · 기준 · 달라진 점처럼 응답에 없는 것은 짧은 빈칸으로
 * 남긴다. 응답에 없는 사실을 지어 넣지 않는다. 쓰는 줄은 장 전체에 한 곳만 둔다.
 *
 * 영어 책(applications and interviews)은 같은 재료로 영어 지원서 · 면접 문장을 쓴다.
 * 한국어 문법 도구(polite · josa)는 영어 문장에 쓰지 않고, 아래 영어용 작은 도구를 쓴다.
 * 영어 쪽에서는 장 번호를 적지 않는다(지역 장이 빠지면 번호가 당겨지는데, 그 바꿈은 한국어 글자만 본다).
 */
import type { Axis } from "../scoring/types";
import type { EvidenceGroup } from "../result/model";
import { josaOf } from "../result/josa";
import type { Inputs, RoleGuide } from "./types";
import { STEP_WORD, type X } from "./derive";
import { C, donut } from "./charts";
import { E, H, PAL, T, band, chips, howto, lines, mine, note, tag, ul, type Page } from "./kit";
import { AXIS_NEED, actionHead, askNoun, j, polite, q } from "./text";
import { T as L, byLang, isEn } from "./lang";

const P = (title: string, body: string): Page => ({ part: "06", partName: L("자기소개서·면접 준비", "Applications and interviews"), title, body });

/** 내가 채울 짧은 빈칸 */
const B = (mm = 22) => `<span class="blank" style="display:inline-block;min-width:${mm}mm;border-bottom:1px dashed #9aa3b2"></span>`;
/** 내가 고르거나 답한 말을 그대로 옮긴 자리 */
const U = (t: string) => `<u style="text-decoration:none;border-bottom:1.5px solid ${PAL.amber}">${E(t)}</u>`;
/** `~했다` 로 끝나는 문장인가 */
const isAct = (s: string) => /다$/.test(s.trim());

/* ── 영어 문장 도구 ──────────────────────────────────────────────
   영어 사전의 할 일 구는 주어 없는 과거형이다(`Set the bias operating point`).
   첫 낱말이 과거형 움직씨면 `I ...` 로 이어 쓰고, 아니면(`The code was split ...`)
   문장 그대로 쓴다. */
const IRREG = new Set(("wrote set chose left built found kept ran split took broke made sent rewrote gave read redid rebuilt "
  + "taught drew led put cut held laid began did got brought thought sought spent told understood ran shut").split(" "));
const enAct = (s: string) => { const w = (s.trim().split(/\s+/)[0] ?? "").toLowerCase(); return /^[a-z]{3,}ed$/.test(w) || IRREG.has(w); };
/** 이 책의 언어로 `해 본 일` 문장인가 */
const acts = (s: string) => (isEn() ? enAct(s) : isAct(s));
/** 첫 글자만 낮춘다. 약어(`PCB`)는 그대로 */
const low = (s: string) => { const t = s.trim().replace(/[.。]$/, ""); return /^[A-Z][a-z]/.test(t) ? t[0].toLowerCase() + t.slice(1) : t; };
const cap = (s: string) => { const t = s.trim(); return t ? t[0].toUpperCase() + t.slice(1) : t; };
/** 끝에 마침표를 붙인다(이미 있으면 그대로) */
const stop = (s: string) => { const t = s.trim(); return !t ? t : /[.?!]$/.test(t) ? t : `${t}.`; };
const aAn = (w: string) => (/^[aeiou]/i.test(w.trim()) ? "an" : "a");
/** 해 본 일 한 구를 `I ...` 한 문장으로. 밑줄은 고른 말에만 */
const iDid = (s: string) => (enAct(s) ? `I ${U(low(s))}.` : `${U(stop(cap(s)))}`);
/** `the X and the Y` (밑줄) */
const theU = (xs: string[]) => xs.filter(Boolean).slice(0, 2).map((t) => `the ${U(low(t))}`).join(" and ");

/**
 * 지난 일을 적은 `~했다` 를 이어 쓰는 꼴로 바꾼다(`정했다` → `정했고` · `정했는데` · `정했던`).
 * 자기소개서 초안이 `~했습니다.` 만 줄줄이 이어지지 않게 두 문장을 한 문장으로 묶을 때 쓴다.
 * ㅆ 받침 + `다` 만 바꾸고, 그 밖의 꼴은 null 을 돌려 원래 문장을 그대로 쓰게 한다
 */
function conn(s0: string, tail: "고" | "는데" | "던"): string | null {
  const s = s0.trim().replace(/[.。]$/, "");
  if (!s.endsWith("다") || s.length < 2) return null;
  const p = s.charCodeAt(s.length - 2);
  if (p < 0xac00 || p > 0xd7a3 || (p - 0xac00) % 28 !== 20) return null;
  return `${s.slice(0, -1)}${tail}`;
}
/** 낱말 하나 또는 둘을 밑줄로 잇고 조사를 붙인다 */
const joinU = (xs: string[], tail: "을를" | "과와" | "이가" | "은는") => {
  const ys = xs.filter(Boolean).slice(0, 2);
  if (!ys.length) return "";
  const last = ys[ys.length - 1];
  return `${ys.length === 2 ? `${U(ys[0])}${/[과와] /.test(ys.join(" ")) ? "," : josaOf(ys[0], "과와")} ` : ""}${U(last)}${josaOf(last, tail)}`;
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
  const period = [ym(r.started_on), ym(r.ended_on)].filter(Boolean).join(L("~", " to ")) || null;
  return { record: r.title, period, artifacts: r.artifacts ?? [], verifications: r.verifications ?? [], decisions: (r.decisions ?? []).filter(acts) };
}

function stories(x: Inputs, d: X): Story[] {
  const groups: (EvidenceGroup & { ready: boolean })[] = [
    ...x.m.evidence.ready.map((g) => ({ ...g, ready: true })), ...x.m.evidence.partial.map((g) => ({ ...g, ready: false })),
  ];
  const l2 = (td: string, a: Axis) => d.def(td)?.axes?.[a]?.l2 ?? null;
  const confirmed = (td: string, a: Axis) => !!d.dom(td)?.confirmed.includes(a);
  const out: Story[] = [];
  for (const g of groups) {
    const z = d.dom(g.domain);
    if (!z) continue;
    const picks = g.picks.filter((p) => !z.artifacts.includes(p) && !z.verifications.includes(p));
    if (!picks.length && !g.picks.length) continue;
    /* 한 영역은 한 장면으로 쓴다. 같은 영역의 판단이 둘이면 초안 두 벌의 상황 · 남긴 것 · 달라진 것이
       글자까지 같아진다. 둘째 판단에서 고른 항목 하나를 첫 장면의 정한 것 둘째 줄로 올린다 */
    const prev = out.find((s) => s.domain === g.domain);
    if (prev) {
      const add = (picks.length ? picks : g.picks).filter(acts).find((p) => !prev.did.includes(p));
      if (add) prev.did.splice(1, 0, add);
      prev.ready ||= g.ready;
      continue;
    }
    const rc = recordOf(x, g.domain);
    const did = [...(picks.length ? picks : g.picks).filter(acts), ...rc.decisions].filter((v, i, a) => a.indexOf(v) === i);
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

/** 영어 초안 네 줄. 지원서에서 쓰는 순서(상황 → 내가 정한 것 → 남긴 것 → 달라진 것)를 따르되 줄마다 말을 바꾼다 */
function draftLinesEn(d: X, s: Story, k: number): [string, string][] {
  const nm = d.name(s.domain);
  const v = k % 2;
  const where = s.record ? `${U(s.record)}${s.period ? ` (${E(s.period)})` : ""}` : null;
  const situ = where
    ? (v ? `When I worked on ${where}, my part was ${B()}.` : `On ${where}, I was responsible for ${B()}.`)
    : `In a ${B(30)} project (a course, lab or internship), I took on the ${E(nm)} side, in particular ${B()}.`;

  const did = s.did.filter(enAct).slice(0, 2);
  const after = v ? `The criterion I worked from was ${B()}.` : `The first thing I weighed was ${B()}.`;
  const decided = did.length
    ? `I ${did.map((t) => U(low(t))).join(", and ")}. ${after}`
    : `The call I made myself was ${B(40)}, and I made it because ${B()}.`;

  const arts = s.artifacts.slice(0, 2);
  const made = arts.length
    ? (v ? `What I left behind was ${theU(arts)}.` : `From that work I produced ${theU(arts)}.`)
    : s.made ? (enAct(s.made) ? `I ${U(low(s.made))}.` : U(stop(cap(s.made))))
    : `What I left behind was ${B(30)}, a document someone else could pick up and use.`;

  const v0 = s.verifications[0];
  const changed = v0
    ? (v ? `When I set my result next to the ${U(low(v0))}, they differed by ${B()}, so I revised ${B()} to close the gap.`
      : `Checking it against the ${U(low(v0))}, I found that ${B()} did not match, and I traced the cause to ${B()}.`)
    : s.compared ? (enAct(s.compared) ? `I ${U(low(s.compared))}, and the difference showed up in ${B()}.` : `${U(stop(cap(s.compared)))} As a result, ${B()} changed.`)
    : `I compared it with ${B()}, and as a result ${B()} changed.`;

  return [["Situation", situ], ["What I decided", decided], ["What I left", made], ["What changed", changed]];
}

/**
 * 한 장면을 네 줄 초안으로. 줄마다 [이름표, 문장 HTML].
 *
 * 사람이 쓰는 자기소개서처럼 읽히게 한 줄에 한 문장만 두고, 정한 것이 둘이면 `~했고, ~했는데` 로
 * 이어 한 문장으로 묶는다. 빈칸 뒤에는 조사를 붙이지 않고 `부분` · `쪽` 같은 이름씨를 둔다
 * (빈칸에 무엇이 들어올지 몰라 조사를 고를 수 없다). `k` 는 초안마다 말을 조금씩 바꾸는 번호다
 */
function draftLines(d: X, s: Story, k = 0): [string, string][] {
  if (isEn()) return draftLinesEn(d, s, k);
  const nm = d.name(s.domain);
  const v = k % 2;
  const where = s.record ? `${U(s.record)}${s.period ? ` (${E(s.period)})` : ""}` : null;
  const situ = where
    ? (v ? `${where}에 참여했을 때 제가 맡은 몫은 ${B()} 부분이었습니다.` : `${where}에서 저는 ${B()} 부분을 맡았습니다.`)
    : `${B(30)} 과제에서 저는 ${E(nm)} 쪽 일 가운데 ${B()} 부분을 맡았습니다.`;

  const did = s.did.slice(0, 2);
  const after = v ? `이렇게 정할 때 기준으로 삼은 것은 ${B()} 쪽이었습니다.` : `그때 가장 먼저 따진 것은 ${B()} 쪽이었습니다.`;
  let decided: string;
  if (!did.length) decided = `이때 제가 직접 정한 것은 ${B(40)} 쪽이었고, 그렇게 정한 까닭은 ${B()} 때문이었습니다.`;
  else {
    const c1 = did.length === 2 ? conn(did[0], "고") : "";
    const c2 = conn(did[did.length - 1], "는데");
    decided = c2 && c1 != null
      ? `${c1 ? `${U(c1)}, ` : ""}${U(c2)}, ${after.replace(/^이렇게 정할 때 /, "")}`
      : `${did.map((t) => U(polite(t))).join(" ")} ${after}`;
  }

  const made = s.artifacts.length
    ? (v ? `결과물로는 ${joinU(s.artifacts, "을를")} 남겼습니다.` : `그렇게 해서 ${joinU(s.artifacts, "을를")} 만들어 남겼습니다.`)
    : s.made ? U(polite(s.made)) : `남긴 결과물로는 ${B(30)} 같은 문서가 있습니다.`;

  const v0 = s.verifications[0];
  const cmp = s.compared ? conn(s.compared, "는데") : null;
  const changed = v0
    ? (v ? `결과를 ${U(v0)}${josaOf(v0, "과와")} 나란히 놓아 보니 ${B()} 만큼 차이가 났고, 그 차이를 줄이려고 ${B()} 부분을 고쳤습니다.`
      : `${U(v0)}${josaOf(v0, "과와")} 맞춰 보니 ${B()} 부분이 달랐는데, 그 까닭은 ${B()} 쪽에서 찾았습니다.`)
    : s.compared ? (cmp ? `${U(cmp)}, ${B()} 부분에서 차이가 났습니다.` : `${U(polite(s.compared))} 그 결과 ${B()} 부분이 달라졌습니다.`)
    : `비교해 본 대상은 ${B()} 쪽이었고, 그 결과 ${B()} 부분이 달라졌습니다.`;

  return [["상황", situ], ["정한 것", decided], ["남긴 것", made], ["달라진 것", changed]];
}

/** 아직 장면이 없을 때: 목표 직무의 첫 프로젝트를 끝낸 뒤 쓸 문단의 뼈대 */
function planLines(g: RoleGuide): [string, string][] {
  const fp = g.firstProject;
  if (isEn()) return [
    ["The task", `${U(fp.title)}. ${E(stop(fp.goal))}`],
    ["What to decide", g.practice.J3 ? E(stop(g.practice.J3.task)) : `One criterion you will set yourself: ${B(30)}.`],
    ["What to leave", `${U(fp.output)}`],
    ["What to check", `When it is done, ask yourself: ${E(stop(fp.check.replace(/\.$/, "?")))}`],
  ];
  return [
    ["할 일", `${U(fp.title)}. ${E(polite(fp.goal))}`],
    ["정할 것", g.practice.J3 ? E(polite(g.practice.J3.task)) : `직접 정할 기준 하나는 ${B(30)} 쪽입니다.`],
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
    return [P(L("자기소개서 초안", "Cover letter draft"),
      T(L("자기소개서에 쓸 장면은 아직 나오지 않았습니다", "No scene for your cover letter has come up yet"), gg?.g
        ? L(`직접 해 봤다고 답한 판단이 없어서 경험 문단의 재료가 아직 없어요. 대신 목표 직무인 ${E(gg.r.name_ko)}의 첫 프로젝트를 끝낸 뒤 쓸 문단의 뼈대를 적어 두었으니, 끝낸 다음 실제로 한 대로 고쳐 쓰세요.`,
          `You did not say you had made any of these decisions yourself, so there is no material for an experience paragraph yet. Below is the outline of a paragraph to write once you finish the first project for your target role, ${E(gg.r.name_ko)}. When it is done, rewrite it to match what you actually did.`)
        : L("직접 해 봤다고 답한 판단이 없어서 경험 문단의 재료가 아직 없어요. 07장의 30일 할 일 하나를 끝내면 그 결과물로 첫 문단을 쓸 수 있습니다.",
          "You did not say you had made any of these decisions yourself, so there is no material for an experience paragraph yet. Finish one 30-day task from your action plan, and its deliverable gives you your first paragraph.")) +
      (gg?.g ? frame(planLines(gg.g)) : "") +
      band(L("쓰는 법", "How to write it"), L("한 문단에는 판단 하나만 깊게 쓰세요.", "Give each paragraph one decision and go into it properly.")))];
  }
  const out: Page[] = [];
  for (let a = 0; a < ss.length; a += 2) {
    const st = ss.slice(a, a + 2);
    const fromPick = ss[0].from === "pick";
    out.push(P(L(`자기소개서 초안 ${a + 1}${st.length > 1 ? `·${a + 2}` : ""}`, `Cover letter draft${st.length > 1 ? `s ${a + 1} and ${a + 2}` : ` ${a + 1}`}`),
      T(a === 0
        ? (fromPick ? L("고르신 항목으로 자기소개서 초안을 먼저 만들었습니다", "Your cover letter drafts start from the items you picked") : L("검사 응답으로 자기소개서 초안을 먼저 만들었습니다", "Your cover letter drafts start from your assessment answers"))
        : L("같은 방식으로 만든 초안이 더 있습니다", "More drafts, built the same way"),
        a === 0
          ? L(`밑줄 친 말은 ${fromPick ? "고르신 항목" : "검사에서 직접 해 봤다고 답하신 내용"}을 그대로 옮긴 것이고, 점선은 응답에 없어 비워 둔 자리예요. 실제와 다른 문장은 지우거나 고쳐 쓰세요.`,
            `Underlined words are copied straight from ${fromPick ? "the items you picked" : "what you said you had done yourself"}, and dotted lines mark details your answers did not cover. Delete or rewrite any sentence that does not match what really happened.`)
          : L("이 가운데 쓸 만한 장면 하나를 골라 깊게 쓰면 됩니다.", "Pick the one scene worth telling and go into it properly.")) +
      st.map((s, i) => {
        const roles = d.rolesOf(s.domain).filter((r) => r.strength === "중심").slice(0, 3).map((r) => d.roleName(r.role)).filter(Boolean);
        const label = s.from === "answer" ? tag(L("응답으로 만든 초안", "Built from your answers"), C.teal) : s.ready ? tag(L("바로 쓸 수 있음", "Ready to use"), C.navy) : tag(L("보완하면 쓸 수 있음", "Needs a little more detail"), C.teal);
        const head = `<div class="story-h"><b>${E(d.name(s.domain))} · ${E(d.axisName(s.axis))}</b><span>${label}${roles.length ? L(` 이어지는 직무: ${E(roles.join(" · "))}`, ` Related roles: ${E(roles.join(" · "))}`) : ""}</span></div>`;
        return frame(draftLines(d, s, a + i), head);
      }).join("")));
  }
  return out;
}

export function framePage(x: Inputs, d: X): Page {
  const s = stories(x, d)[0];
  const gg = goalGuide(x, d);
  const rows = s ? draftLines(d, s) : gg?.g ? planLines(gg.g) : [];
  /* 네 줄을 두 단락으로 잇는다. 한 단락에 네 문장이 모두 `~습니다.` 로 이어지면 읽는 맛이 없다 */
  const para = rows.length ? [rows.slice(0, 2), rows.slice(2)].map((rs) => `<p>${rs.map(([, v]) => v).join(" ")}</p>`).join("") : "";
  if (isEn()) return P("Cover letter paragraph",
    T(s ? "Join your first draft and you have an experience paragraph" : "Join the first project outline and you have an experience paragraph", s
      ? "The situation, your decision, what you left and what changed are joined in that order. Filling in the dotted lines already gives you readable text, so fill them in, then rewrite the paragraph in your own words on the lines below."
      : "There is no scene to write about yet, so the first project outline is joined instead. Once you finish the project, rewrite it to match what you actually did.") +
    (para ? `<div class="frame">${para}</div>` : "") +
    `<div class="two">
      ${note("What makes it read well", ul(["One decision per paragraph, told in depth", "“I” for the part you did, not “we”", "One number and one time frame"]))}
      ${note("Where drafts go wrong", ul(["Several experiences squeezed into one paragraph", "Ending on how you felt instead of what happened", "Saying you worked hard without naming the deliverable"]), true)}
    </div>` + lines(4, "Your paragraph, rewritten in your own words"));
  return P("자기소개서 문단",
    T(s ? "첫 번째 초안을 이으면 경험 한 단락이 됩니다" : "첫 프로젝트 뼈대를 이으면 경험 한 단락이 됩니다", s
      ? "상황, 정한 것, 남긴 것, 달라진 것 차례로 이어 붙였어요. 점선만 채워도 읽히는 글이 되니, 채운 다음 아래 줄에 내 말로 고쳐 써 보세요."
      : "아직 쓸 장면이 없어 첫 프로젝트 뼈대를 이어 붙였어요. 프로젝트를 끝낸 뒤 실제로 한 대로 바꿔 쓰세요.") +
    (para ? `<div class="frame">${para}</div>` : "") +
    `<div class="two">
      ${note("잘 읽히는 단락", ul(["한 단락에는 판단 하나만 깊게", "주어는 ‘우리’보다 ‘제가’", "숫자 하나와 기간 하나 넣기"]))}
      ${note("자주 걸리는 곳", ul(["경험 여러 개를 한 단락에 늘어놓기", "느낀 점으로 단락을 끝내기", "결과물 이름 없이 ‘열심히 했다’고만 쓰기"]), true)}
    </div>` + lines(4, "초안을 내 말로 고쳐 쓴 단락"));
}

/** 포트폴리오 줄의 상태. 안쪽 값은 그대로 두고 보이는 말만 언어를 탄다 */
const ST_WORD = byLang<Record<"보유" | "새로 만들기", string>>({ 보유: "보유", "새로 만들기": "새로 만들기" }, { 보유: "Have it", "새로 만들기": "To make" });

export function portfolioPage(x: Inputs, d: X): Page {
  const have = [...new Set(x.m.domains.flatMap((z) => z.artifacts.map((a) => `${a}|${z.code}`)))].map((k) => { const [a, td] = k.split("|"); return { title: a, td, status: "보유" as const }; });
  const make = x.m.actions.filter((a) => a.code === "BUILD_OUTPUT" && a.domain).map((a) => ({ title: a.material.artifacts[0] ?? a.material.workflow?.output ?? "", td: a.domain!, status: "새로 만들기" as const })).filter((v) => v.title);
  const rec = x.exps.flatMap((e) => e.artifacts.map((a) => ({ title: a, td: e.td_codes[0] ?? "", status: "보유" as const })));
  const all = [...have, ...rec, ...make].filter((v, i, arr) => arr.findIndex((w) => w.title === v.title) === i).slice(0, 14);
  const nh = all.filter((v) => v.status === "보유").length;
  const nm = all.length - nh;
  const gg = goalGuide(x, d);
  const en = isEn();

  /* 첫 장 초안: 가진 결과물이 있으면 그것, 없으면 새로 만들 것, 그것도 없으면 목표 직무의 포트폴리오 첫 항목 */
  const pick = all.find((v) => v.status === "보유") ?? all[0] ?? (gg?.g?.portfolio?.[0] ? { title: gg.g.portfolio[0], td: "", status: "새로 만들기" as const } : null);
  const z = pick?.td ? d.dom(pick.td) : undefined;
  const ev = z ? d.evidenceOf(z) : null;
  const where = pick ? x.exps.find((e) => e.artifacts.includes(pick.title))?.title ?? null : null;
  const decided = ev?.decisions[0] ?? (z && z.confirmed.includes("J3") ? d.def(z.code)?.axes?.J3?.l2 : null) ?? null;
  const iq = gg?.g?.interview.find((v) => v.axis === "J5") ?? gg?.g?.interview[0];
  const sheet: [string, string][] = !pick ? [] : en ? [
    ["Deliverable", `${U(pick.title)}${pick.td ? ` · ${E(d.name(pick.td))}` : ""}${pick.status === "새로 만들기" ? " · still to make" : ""}`],
    ["From which project", where ? U(where) : `${B(36)} (course project, lab or research)`],
    [pick.status === "새로 만들기" ? "A decision you have made in this area" : "What I decided", decided ? U(stop(cap(decided))) : `One criterion you set yourself: ${B(36)}`],
    ["Compared with", ev?.comparisons[0] ? `${U(ev.comparisons[0])} · result: ${B()}` : `${B()} · result: ${B()}`],
    ["Interview question it answers", iq ? E(iq.q) : `One question this deliverable answers: ${B(36)}`],
  ] : [
    ["결과물", `${U(pick.title)}${pick.td ? ` · ${E(d.name(pick.td))}` : ""}${pick.status === "새로 만들기" ? " · 새로 만들 것" : ""}`],
    ["어떤 과제에서", where ? U(where) : `${B(36)} (과제, 실습, 연구 이름)`],
    [pick.status === "새로 만들기" ? "그 영역에서 정해 본 것" : "내가 정한 것", decided ? U(polite(decided)) : `직접 정한 기준 한 줄: ${B(36)}`],
    ["비교한 대상", ev?.comparisons[0] ? `${U(ev.comparisons[0])} · 결과는 ${B()}` : `${B()} · 결과는 ${B()}`],
    ["답할 면접 질문", iq ? E(iq.q) : `이 결과물로 답할 질문 하나: ${B(36)}`],
  ];
  const pl = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const head = all.length
    ? (nh
      ? (nm ? L(`포트폴리오에 넣을 결과물이 ${nh}개 있고, ${nm}개를 더 만들면 됩니다`, `You already have ${pl(nh, "deliverable", "deliverables")} for your portfolio, and ${nm} more to make`)
        : L(`포트폴리오에 넣을 결과물 ${nh}개가 이미 손에 있습니다`, `You already have ${pl(nh, "deliverable", "deliverables")} for your portfolio`))
      : L(`포트폴리오에 넣을 결과물 ${nm}개를 앞으로 만들어 갑니다`, `You will build ${pl(nm, "portfolio deliverable", "portfolio deliverables")} from here`))
    : L("포트폴리오에 넣을 결과물을 아직 고르지 않으셨습니다", "You have not picked any portfolio deliverables yet");

  return P(L("포트폴리오 목록", "Portfolio list"),
    T(head,
      L("검사와 경험 기록에서 고르신 결과물에, 07장 할 일로 새로 만들 결과물을 더해 한 목록으로 정리했습니다.",
        "This list puts the deliverables you picked in the assessment and your experience records together with the new ones the tasks in your action plan will produce.")) +
    (all.length ? (nh && nm
      ? `<div class="two r46"><div class="card cen">${donut([{ label: ST_WORD["보유"], value: nh, color: PAL.teal }, { label: ST_WORD["새로 만들기"], value: nm, color: PAL.amber }], { size: 200, center: [`${nh}`, L("이미 가진 결과물", "already in hand")] })}${howto([[PAL.teal, L(`이미 가진 결과물 ${nh}개`, `${pl(nh, "deliverable", "deliverables")} you already have`)], [PAL.amber, L(`07장 할 일로 새로 만들 결과물 ${nm}개`, `${pl(nm, "new deliverable", "new deliverables")} from your action plan tasks`)], [L("가운데 숫자", "Center number"), L("이미 가진 결과물 수", "How many you already have")]], L("고리 한 바퀴가 목록 전체이고, 색이 차지한 길이가 그 몫이에요.", "One full turn of the ring is the whole list, and the length of each color is its share."))}</div>`
      : "") + `<table class="tb tb-xs"><thead><tr><th>${L("결과물", "Deliverable")}</th><th>${L("상태", "Status")}</th><th>${L("영역", "Area")}</th></tr></thead><tbody>${all.map((v) => `<tr><td><b>${E(v.title)}</b></td><td>${tag(ST_WORD[v.status], v.status === "보유" ? C.teal : C.amber)}</td><td class="mut">${E(v.td ? d.name(v.td) : "")}</td></tr>`).join("")}</tbody></table>${nh && nm ? "</div>" : ""}`
      : L(`<div class="na-box"><b>고른 결과물이 아직 없습니다</b>다음 과제에서 남길 결과물 이름을 먼저 정해 두면 이 목록이 생겨요.</div>`,
        `<div class="na-box"><b>No deliverables picked yet</b>Decide what your next project will leave behind, and this list starts from there.</div>`)) +
    (sheet.length ? H(L("포트폴리오 첫 장 초안", "First portfolio page, drafted"), L("결과물 하나에 정한 것 한 줄, 비교한 대상 한 줄이면 한 장이 됩니다", "One deliverable, one line on what you decided and one on what you compared it with: that is a page")) + frame(sheet) : ""));
}

/**
 * 해 본 장면을 말한 뒤 붙이는 한 문장. 응답에 없는 것은 빈칸으로 둔다.
 * 빈칸 바로 뒤에는 조사를 붙이지 않는다(무엇이 들어올지 몰라 받침을 볼 수 없다)
 */
const FOLLOW: Record<Axis, string> = byLang<Record<Axis, string>>({
  J1: `그때 다룰 범위는 ${B()} 까지로 잡았고, ${B()} 부분은 일부러 뺐습니다.`,
  J2: `받은 요구는 ${B()} 같은 수치로 옮겨 적었습니다.`,
  J3: `기준은 ${B()} 하나로 잡았고, ${B()} 안은 그 기준에 못 미쳐 고르지 않았습니다.`,
  J4: `그 방법을 고른 것은 ${B()} 때문이었습니다.`,
  J5: `그 결과물은 ${B()} 쪽에서 받아 썼습니다.`,
  J6: `두 값은 ${B()} 정도 차이가 났고, 저는 그 까닭을 ${B()} 쪽에서 찾았습니다.`,
  J7: `원인은 ${B()} 쪽에 있었고, 고친 뒤에는 ${B()} 방법으로 다시 확인했습니다.`,
  J8: `그 결과는 ${B()} 결정을 내릴 때 쓰였습니다.`,
}, {
  J1: `I drew the scope at ${B()} and deliberately left out ${B()}.`,
  J2: `I turned the request into numbers such as ${B()}.`,
  J3: `My criterion was ${B()}, and I ruled out ${B()} because it fell short of it.`,
  J4: `I chose that method because ${B()}.`,
  J5: `${B()} then picked up that deliverable and used it.`,
  J6: `The two differed by about ${B()}, and I traced the cause to ${B()}.`,
  J7: `The cause turned out to be ${B()}, and after the fix I checked it again by ${B()}.`,
  J8: `That result was then used to decide ${B()}.`,
});

/** 고른 판단을 다시 묻는 꼬리 질문과 답하는 순서. 판단마다 면접관이 파고드는 데가 다르다 */
const ASK: Record<Axis, { q: string; dir: string }> = byLang<Record<Axis, { q: string; dir: string }>>({
  J1: { q: "다루지 않기로 한 것은 무엇이었고, 왜 뺐나요?", dir: "맡은 범위, 뺀 것, 뺀 까닭 순서로 답해 보세요." },
  J2: { q: "받은 요구를 어떤 수치로 바꿨고, 그 값은 어떻게 정했나요?", dir: "받은 요구, 옮긴 수치, 그 값의 근거 순서로 답해 보세요." },
  J3: { q: "그때 무엇을 기준으로 정했고, 다른 안은 왜 고르지 않았나요?", dir: "기준, 버린 안, 결과 순서로 30초 안에 답해 보세요." },
  J4: { q: "그 방법이나 도구를 고른 까닭은 무엇이었나요?", dir: "쓴 방법, 다른 방법 대신 고른 까닭, 그 방법의 한계 순서로 답해 보세요." },
  J5: { q: "그 결과물은 누가 받아서 어디에 썼나요?", dir: "결과물 이름, 받은 사람, 쓰인 곳 순서로 답해 보세요." },
  J6: { q: "비교해 보니 무엇이 달랐고, 그 차이를 어떻게 설명했나요?", dir: "비교한 대상, 차이의 크기, 차이의 까닭 순서로 답해 보세요." },
  J7: { q: "원인을 어떻게 좁혔고, 무엇을 고쳤나요?", dir: "생긴 문제, 원인을 좁힌 순서, 고친 뒤 확인한 방법 순서로 답해 보세요." },
  J8: { q: "그 결과가 어떤 결정에 쓰였나요?", dir: "내 결과, 그것을 쓴 사람, 바뀐 결정 순서로 답해 보세요." },
}, {
  J1: { q: "What did you decide not to cover, and why?", dir: "Cover your scope, what you left out, and why you left it out." },
  J2: { q: "How did you turn the request into numbers, and where did those values come from?", dir: "Cover the request you got, the numbers you set, and what those values were based on." },
  J3: { q: "What criterion did you decide on, and why did you reject the other options?", dir: "Cover the criterion, the option you dropped, and the outcome, in under 30 seconds." },
  J4: { q: "Why did you choose that method or tool?", dir: "Cover the method you used, why you picked it over the alternatives, and where it falls short." },
  J5: { q: "Who received that deliverable, and what did they use it for?", dir: "Cover the deliverable, who received it, and where it was used." },
  J6: { q: "What turned out different when you compared, and how did you explain the gap?", dir: "Cover what you compared against, how big the gap was, and what caused it." },
  J7: { q: "How did you narrow down the cause, and what did you fix?", dir: "Cover the problem, how you narrowed down the cause, and how you confirmed the fix." },
  J8: { q: "Which decision was your result used for?", dir: "Cover your result, who used it, and the decision that changed." },
});

type Qn = { q: string; why: string; material: string; dir: string; draft: string };

/** 영어 면접 질문. 한국어 쪽과 같은 재료 · 같은 차례로 만든다 */
function questionsEn(x: Inputs, d: X): Qn[] {
  const out: Qn[] = [];
  const asks = (a: Axis) => `They want to hear ${low(d.axisWhat(a)).replace(/[.?]$/, "")}.`;
  const said = (pick: string) => (enAct(pick) ? `you ${low(pick)}` : `you picked “${pick.replace(/\.$/, "")}”`);
  const did = (pick: string) => (enAct(pick) ? `I ${U(low(pick))}.` : `I worked on ${U(low(pick))}.`);
  for (const g of x.m.evidence.ready.slice(0, 4)) {
    const z = d.dom(g.domain);
    const pick = g.picks.find((p) => !z?.artifacts.includes(p) && enAct(p)) ?? g.picks.find((p) => !z?.artifacts.includes(p)) ?? g.picks[0];
    if (!pick) continue;
    const art = z?.artifacts[0];
    const dn = d.name(g.domain);
    /* 답변마다 첫머리를 조금씩 바꾼다. 같은 틀이 질문 여섯에 되풀이되면 외운 답처럼 들린다 */
    const opener = !art ? `While working on ${aAn(dn)} ${E(dn)} project,`
      : g.axis === "J5" || out.length % 2 ? `While making the ${U(low(art))} for ${aAn(dn)} ${E(dn)} project,`
      : `In the ${E(dn)} project where I made the ${U(low(art))},`;
    out.push({
      q: `In ${dn}, ${said(pick)}. ${ASK[g.axis].q}`,
      why: asks(g.axis),
      material: `${pick.replace(/\.$/, "")}${art ? ` · deliverable: ${art}` : ""}`,
      dir: ASK[g.axis].dir,
      draft: `“${opener} ${did(pick)} ${FOLLOW[g.axis]}”`,
    });
  }
  for (const g of x.m.evidence.partial.slice(0, 2)) {
    const pick = g.picks.find(enAct) ?? g.picks[0];
    if (!pick || out.length >= 5) continue;
    out.push({
      q: `In ${d.name(g.domain)}, ${said(pick)}. What did you compare the result with to check it?`, why: asks(g.axis), material: pick.replace(/\.$/, ""),
      dir: "If you have not compared it with anything yet, make a one-page comparison table in your next project and bring that table to the interview.",
      draft: `“${did(pick)} When I checked the result against ${B()}, it was off by about ${B()}, and I put that down to ${B()}.”`,
    });
  }
  for (const g of d.gaps.slice(0, 3)) {
    if (out.length >= 6 || !g.axis) continue;
    const l2 = d.def(g.domain)?.axes?.[g.axis]?.l2;
    const act = d.actionOf(g);
    const head = act ? actionHead(act, d.name(g.domain)) : "";
    const dn = d.name(g.domain);
    const work = l2 ? `work like “${low(l2)}”` : low(AXIS_NEED[g.axis]);
    /* 반쯤 선 판단은 해 본 장면이 있다. 없다고 답하게 하면 01·02장과 어긋난다 */
    if (g.kind === "PARTIAL_EVIDENCE") {
      out.push({
        q: `In ${dn}, when you did ${work}, who set the criteria?`,
        why: `${asks(g.axis)} Your results show you have done this work, but not yet a scene where you set the criteria yourself.`,
        material: head ? `You have done the work. The part you decide yourself is covered by the task “${head}” in your action plan.` : "You have done the work. The part you decide yourself gets filled by a task in your action plan.",
        dir: "Start with what you did, then separate what was already fixed from what you decided yourself.",
        draft: `“Yes, I have done that. At the time, ${B()} was already fixed, and what I chose myself was ${B()}.”`,
      });
      continue;
    }
    out.push({
      q: `Have you ever done ${work} yourself in ${dn}?`,
      why: `${asks(g.axis)} Your results do not show a scene of this decision yet.`,
      material: head ? `No scene yet. The task “${head}” in your action plan fills it.` : "No scene yet. A task in your action plan fills it.",
      dir: "Do not claim you have done something you have not. If a task from your action plan is lined up as your next project, talk about how you are preparing for it.",
      draft: `“I have not owned this on my own yet. That is why my next project is ${head ? U(head) : `a ${B(30)} project`}, and there I plan to set the ${B()} criteria myself.”`,
    });
  }
  return out.slice(0, 6);
}

function questions(x: Inputs, d: X): Qn[] {
  if (isEn()) return questionsEn(x, d);
  const out: Qn[] = [];
  const asks = (a: Axis) => `${askNoun(d.axisWhat(a))} 듣고 싶어서 하는 질문입니다.`;
  for (const g of x.m.evidence.ready.slice(0, 4)) {
    const z = d.dom(g.domain);
    const pick = g.picks.find((p) => !z?.artifacts.includes(p) && isAct(p)) ?? g.picks.find((p) => !z?.artifacts.includes(p)) ?? g.picks[0];
    if (!pick) continue;
    const art = z?.artifacts[0];
    const dn = d.name(g.domain);
    /* 답변마다 첫머리를 조금씩 바꾼다. 같은 틀이 질문 여섯에 되풀이되면 외운 답처럼 들린다 */
    const opener = !art ? `${E(dn)} 과제를 하면서`
      : g.axis === "J5" || out.length % 2 ? `${E(dn)} 과제에서 ${U(art)}${josaOf(art, "을를")} 만들면서`
      : `${U(art)}${josaOf(art, "을를")} 만든 ${E(dn)} 과제에서`;
    out.push({
      q: `${dn}에서 ${q(pick)}고 하셨는데, ${ASK[g.axis].q}`,
      why: asks(g.axis),
      material: `${pick}${art ? ` · 결과물 ${art}` : ""}`,
      dir: ASK[g.axis].dir,
      draft: `“${opener} ${isAct(pick) ? U(polite(pick)) : `${U(pick)}${josaOf(pick, "을를")} 맡았습니다.`} ${FOLLOW[g.axis]}”`,
    });
  }
  for (const g of x.m.evidence.partial.slice(0, 2)) {
    const pick = g.picks.find(isAct) ?? g.picks[0];
    if (!pick || out.length >= 5) continue;
    out.push({
      q: `${d.name(g.domain)}에서 ${q(pick)}고 하셨는데, 그 결과를 무엇과 비교해 확인했나요?`, why: asks(g.axis), material: pick,
      dir: "비교한 대상이 아직 없다면 다음 과제에서 비교표 한 장을 만들어 두고, 그 표를 들고 답하는 편이 나아요.",
      draft: `“${isAct(pick) ? U(polite(pick)) : `${U(pick)}${josaOf(pick, "을를")} 맡았습니다.`} 그 결과를 ${B()}에 대어 보니 ${B()} 정도 차이가 났고, 그 까닭은 ${B()} 쪽에 있다고 봤습니다.”`,
    });
  }
  for (const g of d.gaps.slice(0, 3)) {
    if (out.length >= 6 || !g.axis) continue;
    const l2 = d.def(g.domain)?.axes?.[g.axis]?.l2;
    const act = d.actionOf(g);
    const head = act ? actionHead(act, d.name(g.domain)) : "";
    /* 반쯤 선 판단은 해 본 장면이 있다. 없다고 답하게 하면 01·02장과 어긋난다 */
    if (g.kind === "PARTIAL_EVIDENCE") {
      out.push({
        q: `${d.name(g.domain)}에서 ${l2 ? `${q(l2)} 같은 일을 할 때` : `${AXIS_NEED[g.axis]}를 할 때`} 기준은 누가 정했나요?`,
        why: `${asks(g.axis)} 이번 결과에서 해 본 일은 보였는데, 기준까지 직접 정한 장면은 아직 나오지 않았어요.`,
        material: head ? `해 본 장면은 있어요. 직접 정한 몫은 07장 할 일 ${q(head)}에서 채워요.` : "해 본 장면은 있어요. 직접 정한 몫은 07장 할 일에서 채워요.",
        dir: "해 본 장면을 먼저 말하고, 그때 정해져 있던 것과 내가 정한 것을 나눠 답해 보세요.",
        draft: `“해 본 일은 맞습니다. 다만 그때 ${B()} 부분은 이미 정해져 있었고, 제가 직접 고른 것은 ${B()} 쪽이었습니다.”`,
      });
      continue;
    }
    out.push({
      q: l2 ? `${d.name(g.domain)}에서 ${q(l2)} 같은 일을 직접 해 본 적이 있나요?` : `${d.name(g.domain)}에서 ${j(AXIS_NEED[g.axis], "을를")} 직접 맡아 본 적이 있나요?`,
      why: `${asks(g.axis)} 이번 결과에서는 이 판단을 해 본 장면이 아직 나오지 않았어요.`,
      material: head ? `아직 해 본 장면이 없어요. 07장 할 일 ${q(head)}에서 채워요.` : "아직 해 본 장면이 없어요. 07장 할 일에서 채워요.",
      dir: "해 보지 않은 일을 해 봤다고 말하지는 마세요. 07장 할 일을 다음 과제로 잡아 두었다면 무엇을 준비하는지로 답하면 돼요.",
      draft: `“아직 혼자 맡아 본 적은 없습니다. 그래서 ${head ? `${U(head)}${josaOf(head, "을를")}` : `${B(30)} 과제를`} 다음 과제로 잡아 두었고, 해 보게 되면 ${B()} 기준부터 제 손으로 정해 볼 생각입니다.”`,
    });
  }
  return out.slice(0, 6);
}

export function interviewPages(x: Inputs, d: X): Page[] {
  const qs = questions(x, d);
  if (!qs.length) return [];
  const out: Page[] = [];
  for (let a = 0; a < qs.length; a += 3) {
    const to = Math.min(a + 3, qs.length);
    out.push(P(L(`면접 질문 ${a + 1}–${to}`.replace("–", "~"), `Interview questions ${a + 1} to ${to}`),
      T(a === 0 ? L("면접에서는 내가 고른 항목을 한 번 더 파고듭니다", "Interviewers dig into the items you picked") : L("질문이 더 있습니다", "More questions"),
        a === 0
          ? L("질문은 고르신 항목과 이번 결과에서 비어 있는 자리로 만들었어요. 질문마다 답변 초안을 붙였으니 점선을 채우고 소리 내어 한 번씩 말해 보세요.",
            "These questions come from the items you picked and the gaps in this result. Each one has a draft answer, so fill in the dotted lines and say each answer out loud once.")
          : L("답변 초안은 앞쪽과 같은 방식으로 만들었어요.", "The draft answers are built the same way as on the previous page.")) +
      qs.slice(a, a + 3).map((v, i) => `<div class="qa"><div class="qa-q"><span>Q${a + i + 1}</span><b>${E(v.q)}</b></div>
        <div class="g3 qa-b"><div><p class="k">${L("왜 묻나", "Why they ask")}</p><p>${E(isEn() ? v.why : polite(v.why))}</p></div><div><p class="k">${L("내 재료", "Your material")}</p><p>${E(v.material)}</p></div><div><p class="k">${L("답하는 순서", "How to answer")}</p><p>${E(v.dir)}</p></div></div>
        ${mine(L("답변 초안", "Draft answer"), v.draft)}</div>`).join("")));
  }
  return out;
}

export function roleQPage(x: Inputs, d: X): Page {
  const r = d.goalRole ?? d.roleOrder[0];
  const g = x.guide.roles[r.code];
  const en = isEn();
  const best = (a: Axis) => d.best.find((b) => b.axis === a) ?? null;
  const items = g ? g.interview.slice(0, 3).map((v) => ({ axis: v.axis, q: v.q, why: v.why })) : r.items.filter((it) => r.required_axes.includes(it.axis)).slice(0, 3).map((it) => ({ axis: it.axis, q: it.ask, why: en ? `${cap(low(d.axisWhat(it.axis)))}, in ${d.name(it.domain)}` : `${d.name(it.domain)}에서 ${d.axisWhat(it.axis)}` }));
  return P(L(`${r.name_ko} 직무 면접 질문`, `${r.name_ko} interview questions`),
    T(L(`${E(r.name_ko)} 직무 면접에서 자주 나오는 질문입니다`, `These questions come up often in ${E(r.name_ko)} interviews`), g
      ? L("직무 안내에 실린 질문이고, 옆에 지금 어디까지 해 봤는지를 붙였어요. 해 본 판단은 그 장면으로 답하고, 아직인 판단은 연습 과제로 준비하면 됩니다.",
        "They come from the role guide, with how far you have gone on each one next to it. Answer the decisions you have made with that scene, and prepare the others with the practice task.")
      : L("직무 자료에 실린 질문을 면접 질문으로 옮겼고, 옆에 지금 어디까지 해 봤는지를 붙였어요.",
        "They are taken from the role material, with how far you have gone on each one next to it.")) +
    items.map((v) => {
      const b = best(v.axis);
      const lv = b?.level ?? null;
      const td = b?.where[0];
      const l2 = td ? d.def(td)?.axes?.[v.axis]?.l2 : null;
      const pr = g?.practice?.[v.axis];
      const draft = en
        ? (lv != null && lv >= 2 && td && l2
          ? `“In ${aAn(d.name(td))} ${E(d.name(td))} project, ${enAct(l2) ? `I ${U(low(l2))}.` : U(stop(cap(l2)))} ${FOLLOW[v.axis]}”`
          : pr ? `If you have no scene yet, start with this practice task. ${E(stop(pr.task))} When it is done, you will have this to answer with: ${U(pr.output)}.`
          : `“I have not done this myself yet, and I am getting ready to try it for the first time in a ${B(30)} project.”`)
        : lv != null && lv >= 2 && td && l2
          ? `“${E(d.name(td))} 과제에서 ${U(polite(l2))} ${FOLLOW[v.axis]}”`
          : pr ? `아직 장면이 없다면 이 연습부터 해 보세요. ${E(polite(pr.task))} 끝나면 ${U(pr.output)}${josaOf(pr.output, "이가")} 남고, 그것으로 답하면 돼요.`
          : `“아직 직접 해 본 적은 없고, ${B(30)} 과제에서 처음 해 보려고 준비하고 있습니다.”`;
      return `<div class="qa"><div class="qa-q"><span>${E(d.axisName(v.axis))}</span><b>${E(v.q)}</b></div><div class="two qa-b"><div><p class="k">${L("왜 묻나", "Why they ask")}</p><p>${E(en ? stop(v.why) : polite(v.why))}</p></div><div><p class="k">${L("지금 단계", "Where you are now")}</p><p>${lv == null ? L("이번 검사에서 묻지 않았어요", "This assessment did not ask about it") : E(STEP_WORD[lv as 0 | 1 | 2 | 3].tag)}</p><p class="mut sm">${lv != null && lv >= 2 ? L("해 본 판단이에요. 답할 장면 하나를 미리 정해 두세요.", "You have made this decision. Pick the scene you will answer with ahead of time.") : L("아직 장면이 적은 판단이라 07장 30일 할 일과 이어져요.", "You have little to show here yet, so it links to your 30-day tasks.")}</p></div></div>${mine(lv != null && lv >= 2 ? L("답변 초안", "Draft answer") : L("준비 방법", "How to prepare"), draft)}</div>`;
    }).join("") + band(L("연습", "Practice"), L("질문마다 30초 안에 소리 내어 답해 보고, 막힌 대목은 초안 옆에 적어 두세요.", "Answer each question out loud in under 30 seconds, and note where you got stuck next to the draft.")));
}

export function checkPage(x: Inputs, d: X): Page {
  const en = isEn();
  const groups: [string, string[]][] = en ? [
    ["Cover letter", ["Each paragraph contains one thing you decided yourself", "The deliverable is named in the sentence", "You wrote in the actual numbers and time frame", "You used the posting's own wording for the duties"]],
    ["Portfolio", ["Each deliverable has one line on what you decided and one on what you compared it with", "You picked three of the deliverables you already have", "You set a deadline for one new deliverable"]],
    ["Interview", ["You have one scene ready for each question", "You can name the option you dropped and why", "You have one scene where your result fed the next decision"]],
    ["Company research", ["You read the company's website and recent postings yourself", "You can say in one line what the team does", "You noted what you could not confirm yet"]],
  ] : [
    ["자기소개서", ["문단마다 ‘제가 정한 것’이 하나씩 들어 있다", "결과물 이름이 문장 안에 있다", "결과 수치와 기간을 직접 적었다", "공고의 담당 업무 표현을 그대로 썼다"]],
    ["포트폴리오", ["결과물마다 정한 것 한 줄과 비교한 대상 한 줄이 있다", "가진 결과물 가운데 셋을 골랐다", "새로 만들 결과물 하나의 마감일을 정했다"]],
    ["면접", ["질문마다 답할 장면 하나를 정했다", "버린 안과 그 까닭을 말할 수 있다", "내 결과가 다음 결정에 쓰인 장면을 하나 준비했다"]],
    ["기관 조사", ["공시, 누리집, 채용 공고를 직접 열어 봤다", "한 장 정리 양식을 채웠다", "아직 확인하지 못한 것을 적어 두었다"]],
  ];
  /* 30초 자기소개 초안: 전공 · 가장 분명한 강점 하나(답한 말) · 목표 직무. 두 문장으로 끝낸다 */
  const st = d.strengths[0];
  const s0 = stories(x, d)[0];
  const strongLine = s0?.did[0] ?? (st ? st.confirmed.map((a) => d.def(st.code)?.axes?.[a]?.l2).find(Boolean) : null) ?? null;
  const strongDom = s0 ? d.name(s0.domain) : st ? d.name(st.code) : null;
  const goal = d.goalRole?.name_ko ?? null;
  let intro: string;
  if (en) {
    const best = strongDom
      ? (strongLine && enAct(strongLine) ? `the ${E(strongDom)} project where I ${U(low(strongLine))}` : `my ${E(strongDom)} work`)
      : `my work on ${B(30)}`;
    intro = `“I'm ${E(x.person)}, and I study ${E(x.major)}. The experience I can speak about with the most confidence is ${best}. I want to build on it in ${goal ? `${aAn(goal)} ${U(goal)}` : `a ${B(30)}`} role, so right now I am working on ${B(30)}.”`;
  } else {
    const did = strongLine ? conn(strongLine, "던") : null;
    const best = strongDom
      ? (did ? `${E(strongDom)} 과제에서 ${U(did)} 일` : `${E(strongDom)} 쪽 일`)
      : `${B(30)} 쪽 일`;
    intro = `“${E(j(x.major, "을를"))} 공부하는 ${E(x.person)}입니다. 가장 자신 있게 말씀드릴 수 있는 경험은 ${best}이고, 앞으로 ${goal ? `${U(goal)} 직무에서` : `${B(30)} 직무에서`} 이 경험을 이어 가려고 지금은 ${B(30)} 쪽을 준비하고 있습니다.”`;
  }
  const mats = d.goalRole ? d.goalRole.application_material.slice(0, 3) : [];
  return P(L("제출 전 점검표", "Pre-submission checklist"),
    T(L("제출하기 전에 열세 가지를 확인해 보세요", "Check these 13 things before you submit"), L("하나씩 확인하면서 직접 표시해 두면 됩니다.", "Tick each one off as you go.")) +
    `<div class="g2">${groups.map(([h, xs]) => `<div class="card">${H(h)}<ul class="cb">${xs.map((t) => `<li><i></i>${E(t)}</li>`).join("")}</ul></div>`).join("")}</div>` +
    mine(L("30초 자기소개 초안 · 밑줄은 내 결과에서 옮긴 말", "30-second introduction draft · underlined words come from your results"), intro) +
    (mats.length ? `<p class="k">${L(`${E(d.goalRole!.name_ko)} 지원서에 붙이면 좋은 자료`, `Worth attaching to ${aAn(d.goalRole!.name_ko)} ${E(d.goalRole!.name_ko)} application`)}</p>${chips(mats, "art")}` : ""));
}

export function ch6Pages(x: Inputs, d: X): Page[] {
  return [...storyPages(x, d), framePage(x, d), portfolioPage(x, d), ...interviewPages(x, d), roleQPage(x, d), checkPage(x, d)];
}
