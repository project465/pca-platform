/**
 * **BIZ 진로·직무 전략 리포트(4차 2판)의 읽는 층.** `edit()` 이 만든 쪽 모델 위에, 전략 리포트로 읽히게 할
 * 묶음(가져갈 세 가지 · 강점 셋 · 두 직무 비교 · 프로젝트 · 자기소개서 문장 · 답변 방향)을 더한다.
 *
 * 새 판단을 만들지 않는다. 모든 문장은 결과 모델의 묶음·단계·고른 문장과 직무 일반 안내에서 온다.
 * 지어낼 수 없는 칸(상황·맡은 몫·수치)은 대괄호 빈칸으로 남긴다.
 */
import { withJosa } from "../result/josa";
import type { Report3 } from "./report3";
import { JUDGE, STEP } from "./words";
import { edit, axisOfPick, ASKQ, ASKQ0, ASKWHY, type Ed, type Src, type RoleView, type Tpl } from "./editorial";

export type Strength = { no: number; title: string; proof: string; src: Src; use: string };
export type Versus = { a: RoleView; b: RoleView; call: string; why: string[] };
export type Project = { title: string; when: string; where: string; why: string; steps: string[]; done: string[]; feed: string[]; answers: string };
export type Draft = { from: string; parts: { text: string; blank: boolean }[]; tips: string[] };
export type Answer = { q: string; axis: string; have: string | null; prep: string | null; dir: string; why: string };
export type Mismatch = { did: string[]; target: string; targetTd: string; overlap: string | null; closer: string; closerWhy: string };
export type Week = { no: number; what: string; out: string };

export type Ed8 = Ed & {
  takeaways: { k: string; v: string; src: Src }[];
  label: { strengths: string; deck: string };
  strengths: Strength[];
  style: { axis: string; name: string; best: number | null; where: string }[];
  styleLine: string;
  versus: Versus;
  mismatch: Mismatch | null;
  project: Project;
  weeks: Week[] | null;
  draft: Draft;
  answers: Answer[];
  close: string;
};

const q = (s: string) => `‘${s}’`;
const and = (a: string[]) => (a.length <= 1 ? a.join("") : a.length === 2 ? `${withJosa(a[0], "과와")} ${a[1]}` : `${a.slice(0, -1).join(", ")}, ${a[a.length - 1]}`);
/** ‘~했다’ 로 끝나는 고른 문장을 지원서 말투로 */
export const formal = (s: string) => s.replace(/다$/, "습니다");

const TITLE: Record<string, string> = {
  J1: "일의 범위를 먼저 자릅니다", J2: "목표를 숫자로 바꿉니다", J3: "기준을 세우고 고릅니다", J4: "방법을 골라 분석합니다",
  J5: "판단을 문서로 남깁니다", J6: "대안과 같은 조건으로 견줍니다", J7: "틀린 까닭을 좁힙니다", J8: "결과를 결정에 씁니다",
};
export const ANSWER: Record<string, string> = {
  J1: "뺀 것 하나와 뺀 까닭을 먼저 말하고, 그래서 남은 범위를 한 줄로 정리합니다.",
  J2: "목표값을 정한 근거 하나를 숫자와 함께 말하고, 어떻게 쟀는지로 끝냅니다.",
  J3: "비교한 기준 두세 개를 먼저 말하고, 버린 안의 까닭으로 끝냅니다.",
  J4: "다른 방법 대신 이 방법을 고른 까닭 하나와, 그 방법의 한계 하나를 말합니다.",
  J5: "결과물을 누가 받아서 무엇에 썼는지부터 말합니다.",
  J6: "무엇과 견줬는지, 조건(기간·대상)을 어떻게 맞췄는지 말합니다.",
  J7: "까닭을 하나로 좁힌 근거와, 그래서 바꾼 것 하나를 말합니다.",
  J8: "그 결과로 바뀐 결정 하나를 말합니다.",
};

export function edit8(r: Report3): Ed8 {
  const e = edit(r);
  const target = e.roles.find((x) => x.target)!;
  const p1 = e.first;
  const asked = r.domains.filter((d) => d.levels.some((l) => l.level !== null));

  /* ── 강점 셋: 기준까지 정한 판단 → 스스로 해 본 판단 → 기록의 결정 → 높은 관심 (지어내지 않는다) ── */
  const st: Strength[] = [];
  const used = new Set<string>();
  for (const lv of [3, 2]) {
    const axes = Object.keys(JUDGE).map((a) => ({ a, ds: asked.filter((d) => d.levels.find((l) => l.axis === a)?.level === lv) }))
      .filter((x) => x.ds.length).sort((x, y) => y.ds.length - x.ds.length);
    for (const { a, ds } of axes) {
      if (st.length >= 3 || used.has(a)) continue;
      const d = ds.find((x) => [...x.decisions, ...x.acts].some((p) => axisOfPick(x, p) === a)) ?? null;
      const pick = d ? [...d.decisions, ...d.acts].find((p) => axisOfPick(d, p) === a)! : null;
      if (lv === 2 && !pick && ds.length < 2) continue;
      used.add(a);
      st.push({
        no: st.length + 1, title: TITLE[a],
        proof: pick ? `${d!.name}에서 ${q(pick)}를 골랐습니다.`.replace(/’를/, pickJosa(pick)) : `${and(ds.map((x) => x.name))}에서 ${JUDGE[a as keyof typeof JUDGE].name}를 ${lv === 3 ? "기준까지 직접 정했다고" : "스스로 해 봤다고"} 답했습니다.`,
        src: "응답 확인", use: `면접 질문 “${ASKQ[a]}”의 재료입니다.`,
      });
    }
  }
  for (const x of r.records) {
    if (st.length >= 3) break;
    if (x.decisions[0]) st.push({ no: st.length + 1, title: "직접 정해 본 장면이 기록에 있습니다", proof: `${x.title.split(" — ")[0]}: ${q(x.decisions[0])}${x.artifacts[0] ? ` · 결과물 ${x.artifacts[0]}` : ""}`, src: "학생 자기기록", use: "지원서 한 문단의 뼈대가 됩니다." });
  }
  for (const m of e.map.rows.filter((m) => m.interest === "HIGH")) {
    if (st.length >= 3) break;
    const USE = ["첫 결과물의 주제로 고릅니다.", "둘째 결과물의 주제로 둡니다.", "수업 과제를 고를 때 이 영역 과제를 먼저 봅니다."];
    const d = asked.find((x) => x.code === m.code);
    const n = d ? d.levels.filter((l) => (l.level ?? 0) >= 1).length : 0;
    /* 세 칸이 같은 문장을 되풀이하지 않게: 관심은 제목이 말하고, 증거 줄은 그 영역이 먼저 정하는 것을 적는다 */
    const f = e.dna.domains.find((x) => x.code === m.code)?.flow.find((x) => x.step === 3);
    const proof = f?.detail ? `${m.name}에서 먼저 정하는 것은 ‘${f.detail}’입니다.`
      : m.depth === null ? `관심이 높게 나왔습니다. 판단은 이번에 묻지 않았습니다.` : `관심이 높게 나왔고, 이 영역의 여덟 판단 가운데 ${n}가지를 ${STEP[m.depth as 0 | 1 | 2 | 3].tag}까지 해 봤다고 답했습니다.`;
    st.push({ no: st.length + 1, title: `${withJosa(m.name, "이가")} 끌립니다`, proof, src: f?.detail ? "일반 직무 안내" : "응답 확인", use: USE[(st.length) % 3] });
  }
  for (const x of r.records) {
    if (st.length >= 3) break;
    if (!x.decisions[0]) st.push({ no: st.length + 1, title: "이어 쓸 기록이 하나 있습니다", proof: `${x.title} · ${x.period}`, src: "학생 자기기록", use: "맡은 몫과 결과물을 채우면 첫 근거가 됩니다." });
  }
  const label = r.kind === "EVIDENCE" ? { strengths: "지금 강한 쪽 세 가지", deck: "응답에서 기준까지 직접 정했다고 한 판단부터 차례로 골랐습니다." }
    : r.kind === "MIXED" ? { strengths: "이미 가진 것 세 가지", deck: "목표 직무와는 다른 곳에 있지만, 옮겨 쓸 수 있는 것부터 골랐습니다." }
      : { strengths: "출발점 세 가지", deck: "아직 강점이라 부를 근거는 적습니다. 대신 시작할 자리를 골랐습니다." };

  /* ── 업무 스타일: 판단 여덟의 가장 높은 단계 ── */
  const style = Object.keys(JUDGE).map((a) => {
    const lv = asked.map((d) => ({ d, l: d.levels.find((x) => x.axis === a)?.level ?? null })).filter((x) => x.l !== null);
    const best = lv.length ? Math.max(...lv.map((x) => x.l as number)) : null;
    const where = lv.filter((x) => x.l === best).map((x) => x.d.name).slice(0, 2).join(" · ");
    return { axis: a, name: JUDGE[a as keyof typeof JUDGE].name, best, where };
  });
  const hi = style.filter((s) => (s.best ?? -1) >= 3).map((s) => s.name);
  const lo = style.filter((s) => s.best !== null && s.best <= 1).map((s) => s.name);
  const styleLine = hi.length ? `정하는 판단은 강하고${lo.length ? `, ${and(lo)}는 아직 비어 있습니다` : ""}.`
    : style.some((s) => (s.best ?? -1) >= 2) ? `여러 판단을 스스로 해 봤지만, 기준까지 정한 판단은 아직 없습니다.`
      : `여덟 판단 모두 아직 지시받은 범위 안에 있습니다. 하나를 직접 맡는 것이 첫걸음입니다.`;

  /* ── 두 직무: 근거가 섞인 학생은 근거가 더 많은 직무와 목표를 견준다 ── */
  const RANK: Record<string, number> = { "준비 근거 있음": 3, "일부 있음": 2, "아직 적음": 1 };
  const others = e.roles.filter((x) => !x.target);
  const b = r.kind === "MIXED" ? [...others].sort((x, y) => (RANK[y.readiness] ?? 0) - (RANK[x.readiness] ?? 0))[0] : others[0];
  let call: string; const why: string[] = [];
  if (r.kind === "EVIDENCE") {
    call = `먼저 볼 직무는 ${target.name}입니다.`;
    why.push(`${target.tdName}에서 ${STEP[(target.tdDepth ?? 0) as 0 | 1 | 2 | 3].tag}까지 답했습니다. ${target.name}의 중심 영역입니다.`);
    why.push(`${b.name}은 같은 근거로 함께 준비하는 둘째 직무로 둡니다. 겹치는 영역은 ${and(b.have.map((h) => h.text.split(":")[0]).slice(0, 2)) || "아직 없습니다"}.`);
  } else if (r.kind === "EARLY") {
    call = `먼저 볼 직무는 ${target.name}입니다. 다만 아직 어느 쪽도 근거가 적습니다.`;
    why.push(`검사에서 목표로 고른 직무입니다. 관심이 가장 높은 영역과도 맞닿아 있습니다.`);
    why.push(`${b.name}과 가르는 것은 결과물 하나입니다. 첫 결과물을 만들고 나서 다시 견주면 됩니다.`);
  } else {
    call = `목표는 ${target.name}이지만, 지금 근거가 더 많은 쪽은 ${b.name}입니다.`;
    why.push(`${target.name}의 중심 영역인 ${withJosa(target.tdName, "은는")} 이번 검사에서 묻지 않았습니다.`);
    why.push(`${b.name} 쪽 영역에서는 여러 판단을 스스로 해 봤다고 답했습니다(${b.readiness}).`);
  }
  const versus: Versus = { a: target, b, call, why };

  let mismatch: Mismatch | null = null;
  if (r.kind === "MIXED") {
    const did = asked.filter((d) => d.levels.some((l) => (l.level ?? 0) >= 2)).map((d) => d.name);
    const rec = r.records.find((x) => x.domains.includes(target.tdName));
    mismatch = {
      did, target: target.name, targetTd: target.tdName,
      overlap: rec ? `${rec.title}${rec.decisions[0] ? `: ${q(rec.decisions[0])}` : ""}${rec.artifacts[0] ? ` · 결과물 ${rec.artifacts[0]}` : ""}` : null,
      closer: b.name, closerWhy: `${b.name}의 중심 영역인 ${b.tdName}에서 ${b.tdDepth === null ? "판단을 묻지 않았지만, 가까운 영역에서 여러 판단을 해 봤습니다" : `${STEP[b.tdDepth as 0 | 1 | 2 | 3].tag}까지 답했습니다`}.`,
    };
  }

  /* ── 프로젝트: 첫 행동이 남길 결과물을 목표 직무의 양식으로 ── */
  const t: Tpl = e.templates.find((x) => x.title === p1.output) ?? e.templates.find((x) => x.title.split(/[·\s]/).some((w) => w.length >= 2 && p1.output.includes(w))) ?? e.templates[0];
  const pr0 = e.probes.find((x) => x.prep && x.prep.text.includes(p1.output)) ?? e.probes.find((x) => !x.have);
  const project: Project = {
    title: `${t.title} 한 장 만들기`, when: p1.when, where: p1.where, why: p1.why,
    steps: t.fields.map((f, i) => `${i === 0 ? "과제 하나를 정하고 " : ""}${withJosa(f, "을를")} 적습니다`),
    done: t.judge, feed: t.mine, answers: pr0 ? pr0.q : ASKQ0.J3,
  };
  const weeks: Week[] | null = r.kind === "EARLY" ? [
    { no: 1, what: `${p1.where} 이 양식을 쓸 과제 하나를 고릅니다.`, out: "과제 이름과 맡을 몫 한 줄" },
    { no: 2, what: `${t.fields.slice(0, 2).join(", ")} 칸을 채웁니다.`, out: "양식 앞 두 칸" },
    { no: 3, what: `${t.fields.slice(2).join(", ")} 칸을 채웁니다.`, out: "양식 전체 초안" },
    { no: 4, what: `${t.judge[0]}를 스스로 점검하고, 한 사람에게 보여 줍니다.`, out: `${t.title} 완성본` },
  ] : null;

  /* ── 자기소개서 한 문단: 채운 칸은 그대로, 비운 칸은 대괄호 ── */
  const s0 = r.application.stories.slice().sort((x, y) => y.parts.filter((p) => p.filled).length - x.parts.filter((p) => p.filled).length)[0];
  const P = (i: number) => s0?.parts[i];
  const clean = (x?: { text: string; filled: boolean }) => (x && x.filled && !/^직접 기입|^준비/.test(x.text) ? x.text : null);
  const sit = clean(P(0)); const dec = clean(P(1)); const left = clean(P(2)); const cmp = clean(P(3));
  const parts: { text: string; blank: boolean }[] = [];
  parts.push(sit ? { text: `${sit.split(" — ")[0].split(" · ")[0]}에서 `, blank: false } : { text: "[수업·활동 이름]에서 ", blank: true });
  parts.push({ text: "[맡은 몫]", blank: true }, { text: "을 맡았습니다. ", blank: false });
  parts.push(dec ? { text: `저는 ${formal(dec)} `, blank: false } : { text: "[내가 정한 것 하나]", blank: true });
  if (!dec) parts.push({ text: "를 정했습니다. ", blank: false });
  parts.push({ text: "그 기준은 ", blank: false }, { text: "[기준 두세 개]", blank: true }, { text: "였습니다. ", blank: false });
  parts.push(left ? { text: `그 결과 ${withJosa(left.split(" · ")[0], "을를")} 남겼고, `, blank: false } : { text: "그 결과 [결과물 이름]을 남겼고, ", blank: true });
  const cmpName = cmp ? cmp.split(/과 비교|와 비교/)[0] : null;
  parts.push(cmpName ? { text: `${withJosa(cmpName, "과와")} 견주어 `, blank: false } : { text: "[비교 대상]과 견주어 ", blank: true });
  parts.push({ text: "[수치·기간]", blank: true }, { text: " 달라졌습니다.", blank: false });
  const draft: Draft = {
    from: s0 ? s0.from.replace(/ — (검사 응답|경험 기록)$/, "") : "",
    parts,
    tips: [
      "첫 문장은 한 일이 아니라 정한 것으로 시작합니다.",
      "결과물은 파일 이름 그대로 적습니다. 면접관이 보여 달라고 할 수 있습니다.",
      "대괄호는 기록에 있는 것만 채웁니다. 없는 수치를 만들지 않습니다.",
    ],
  };

  /* ── 면접: 질문 → 꺼낼 재료 → 답변 방향 ── */
  const answers: Answer[] = e.probes.map((p) => ({
    q: p.q, axis: p.axis, why: p.why, dir: ANSWER[p.axis] ?? "",
    have: p.have ? p.have.text : null, prep: p.prep ? p.prep.text : null,
  }));

  const takeaways = [
    { k: "먼저 볼 직무", v: r.kind === "MIXED" ? `${target.name} — 단, 근거는 ${b.name} 쪽에 더 많습니다` : target.name, src: "응답 확인" as Src },
    { k: label.strengths.replace(/ 세 가지$/, ""), v: st[0] ? `${st[0].title}` : "—", src: st[0]?.src ?? ("응답 확인" as Src) },
    { k: `첫 결과물 · ${p1.when}`, v: p1.output, src: "분석 제안" as Src },
  ];
  const close = r.kind === "EVIDENCE" ? "다음 단계는 이미 한 판단을 문서와 프로젝트로 바꾸는 일입니다."
    : r.kind === "EARLY" ? "다음 단계는 관심을 결과물 하나로 바꾸는 일입니다."
      : `다음 단계는 ${target.name} 장면을 하나 직접 만드는 일입니다.`;

  return { ...e, takeaways, label, strengths: st.slice(0, 3), style, styleLine, versus, mismatch, project, weeks, draft, answers, close };
}

/** 고른 문장 뒤 조사: 문장 끝 글자로 고른다 */
function pickJosa(pick: string): string {
  return withJosa(`x${pick.slice(-1)}`, "을를").slice(-1) === "을" ? "’을" : "’를";
}
