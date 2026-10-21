import { query } from "@/lib/db";
import type { ResultModel } from "./result/model";
import type { Experience } from "./platform";
import type { Axis } from "./scoring/types";
import { draftFrameKo, needKo } from "./result/text.ko";
import { specView } from "./result/spec-view";
import { withJosa } from "./result/josa";
import { domainName, industryChoices, roleName } from "./runtime/session";

/**
 * 지원서·면접 준비.
 *
 * **글을 대신 써 주지 않는다.** 여기서 만드는 것은 묻는 말과 쓸 재료까지다.
 * 재료는 전부 그 사람의 굳은 결과(`ResultModel`)와 적어 둔 경험에서 오고,
 * 답은 그 사람이 쓴다. 수치·기간·성과를 채워 넣지 않는다: 답에 없는 성과를
 * 지원서에 적으면 면접에서 그 한 줄이 가장 먼저 무너진다.
 *
 * **점수를 만들지 않는다**(설계 원칙 6). 어느 문항이 더 잘 맞는지, 답이 몇
 * 점인지 매기지 않는다. 재료가 없는 문항은 `재료가 아직 없다` 고 적고 그
 * 재료를 만드는 자리로 보낸다.
 */

export type PrepMaterial = { label: string; items: string[] };

export type EssayPrompt = {
  key: string;
  title: string;
  /** 실제 지원서에 적힐 법한 물음 */
  ask: string;
  /** 쓸 재료. 그 사람의 결과와 경험에서만 온다 */
  materials: PrepMaterial[];
  /** 적는 차례. 칸마다 무엇을 쓰는지 */
  frame: { label: string; hint: string; items: string[] }[];
  /** 재료가 하나도 없을 때 할 일 */
  empty: string | null;
};

export type InterviewQ = {
  key: string;
  q: string;
  /** 왜 이 질문이 나오는가 */
  why: string;
  /** 답하기 전에 떠올릴 것 */
  prepare: string[];
};

export type Prep = { essays: EssayPrompt[]; interviews: InterviewQ[] };

/** 면접관이 그 축을 파고들 때 실제로 묻는 말. 영역 이름이 들어간다 */
const AXIS_ASK_KO: Record<Axis, (n: string) => string> = {
  J1: (n) => `${n} 과제에서 풀려고 한 문제가 정확히 무엇이었나요?`,
  J2: (n) => `${n} 과제에서 받은 요구를 어떤 조건으로 바꿔 진행했나요?`,
  J3: (n) => `${n} 과제에서 본인이 직접 정한 기준은 무엇이었나요?`,
  J4: (n) => `${n} 과제에서 그 방법을 고른 까닭은 무엇인가요?`,
  J5: (n) => `${n} 과제로 손에 남은 결과물은 무엇인가요?`,
  J6: (n) => `${n} 과제의 결과가 맞는지 무엇과 비교해 확인했나요?`,
  J7: (n) => `${n} 과제에서 잘 안 됐던 순간에 무엇을 고쳤나요?`,
  J8: (n) => `${n} 과제의 결과는 실제로 어디에 쓰였나요?`,
};

/**
 * 고르신 문장을 그대로 인용해 되묻는다.
 *
 * **고른 항목에는 문장(`~다`)과 이름(`목표와 지표 표`)이 섞여 있다.** 문장만
 * 받는다: 이름을 넣으면 `목표와 지표 표고 하셨는데` 가 된다.
 */
const sentences = (xs: string[]) => uniq(xs).filter((x) => /다$/.test(x));
const quoteKo = (x: string) => `‘${x}’고 답하셨는데`;

const FRAME = [
  { label: "상황·역할", hint: "어떤 과제였고 내가 맡은 자리가 무엇이었는지" },
  { label: "행동", hint: "무엇을 어떤 방법으로 했는지" },
  { label: "판단", hint: "무엇을 직접 정했고 무엇과 비교했는지" },
  { label: "결과", hint: "무엇이 남았고 어디에 쓰였는지 · 수치와 기간은 직접 적습니다" },
];

const uniq = (xs: string[]) => [...new Set(xs.map((x) => x.trim()).filter(Boolean))];

/** 그 축에서 고른 항목을 영역을 가리지 않고 모은다 */
function picksOf(m: ResultModel, axis: Axis): string[] {
  return uniq(m.domains.flatMap((d) =>
    d.axes.filter((a) => a.axis === axis && (a.state === "CONFIRMED" || a.state === "OWNED") && a.picks.length)
      .flatMap((a) => a.picks))).slice(0, 4);
}

function frameWith(items: string[][]): EssayPrompt["frame"] {
  return FRAME.map((f, i) => ({ ...f, items: items[i] ?? [] }));
}

export function buildPrep(
  m: ResultModel, core: string, spec: string | null, exps: Experience[],
): Prep {
  const name = (td: string) => domainName(core, td);
  const readyDomains = uniq(m.evidence.ready.map((e) => e.domain));
  const lead = readyDomains[0] ? m.domains.find((d) => d.code === readyDomains[0]) : undefined;
  const second = readyDomains[1] ? m.domains.find((d) => d.code === readyDomains[1]) : undefined;
  const sv = specView(core, spec);
  const indName = (c: string) => industryChoices(core).find((x) => x.code === c)?.name ?? null;
  const goalRole = m.targets.goal.role ? roleName(core, m.targets.goal.role) : null;
  const goalInd = m.targets.goal.industry ? indName(m.targets.goal.industry) : null;
  const likedDomains = m.domains.filter((d) => d.interest === "HIGH").map((d) => name(d.code));
  const expTitles = (pred: (e: Experience) => boolean) =>
    exps.filter(pred).map((e) => e.title).slice(0, 3);

  /* ── 지원서 네 문항 ─────────────────────────────────────────── */
  const essays: EssayPrompt[] = [];

  {
    const mats: PrepMaterial[] = [];
    const goal = uniq([goalRole ?? "", goalInd ?? ""]);
    if (goal.length) mats.push({ label: "적어 두신 목표", items: goal });
    if (likedDomains.length) mats.push({ label: "관심이 높다고 답한 분야", items: likedDomains.slice(0, 4) });
    if (readyDomains.length) mats.push({ label: "이미 해 본 일이 있는 분야", items: readyDomains.slice(0, 3).map(name) });
    essays.push({
      key: "essay:motive",
      title: "지원 동기",
      ask: "이 분야(직무)에 관심을 갖게 된 계기와 그동안 준비한 것을 적어 주세요.",
      materials: mats,
      frame: frameWith([
        ["처음 관심을 갖게 된 수업·과제·경험"],
        mats.find((x) => x.label.startsWith("이미"))?.items.map((x) => `${x}에서 해 본 일`) ?? [],
        ["그 경험에서 이 일이 나에게 맞는다고 판단한 까닭"],
        ["지원한 곳에서 하고 싶은 일 한 가지"],
      ]),
      empty: mats.length ? null : "관심 분야와 목표가 아직 결과에 없습니다. 검사의 관심 문항에 답하면 여기에 섭니다.",
    });
  }

  {
    const mats: PrepMaterial[] = [];
    if (lead) {
      const dec = sentences(lead.decided).slice(0, 3);
      mats.push({ label: `${name(lead.code)} · 직접 정한 것`, items: dec });
      mats.push({ label: `${name(lead.code)} · 해 본 일`,
        items: sentences(lead.did).filter((x) => !dec.includes(x)).slice(0, 3) });
      mats.push({ label: `${name(lead.code)} · 남긴 것`, items: uniq(lead.artifacts).slice(0, 3) });
    }
    const t = expTitles((e) => !lead || e.td_codes.includes(lead.code) || !e.td_codes.length);
    if (t.length) mats.push({ label: "적어 두신 경험", items: t });
    const frame = m.translation ? draftFrameKo(m.translation.steps) : [];
    essays.push({
      key: "essay:job",
      title: "직무 관련 경험",
      ask: "지원 직무와 관련해 직접 해 본 경험과 그 과정에서 맡은 역할을 적어 주세요.",
      materials: mats.filter((x) => x.items.length),
      frame: frame.length
        ? FRAME.map((f, i) => ({ ...f, items: frame[i]?.items ?? [] }))
        : frameWith([
          lead ? sentences(lead.did).slice(0, 1) : [],
          lead ? sentences(lead.did).slice(1, 3) : [],
          lead ? sentences(lead.decided).slice(0, 2) : [],
          lead ? uniq(lead.artifacts).slice(0, 2) : [],
        ]),
      empty: mats.some((x) => x.items.length) ? null
        : "아직 설명할 수 있는 경험이 결과에 없습니다. 경험을 하나 적어 두면 여기 재료가 생깁니다.",
    });
  }

  {
    const fixes = picksOf(m, "J7");
    const checks = picksOf(m, "J6");
    const mats: PrepMaterial[] = [];
    if (fixes.length) mats.push({ label: "안 됐을 때 고친 것", items: fixes });
    if (checks.length) mats.push({ label: "비교해 확인한 것", items: checks.slice(0, 3) });
    const t = expTitles((e) => e.verifications.length > 0);
    if (t.length) mats.push({ label: "비교한 것을 적어 둔 경험", items: t });
    essays.push({
      key: "essay:fix",
      title: "어려움을 고친 경험",
      ask: "계획대로 되지 않았던 일과, 그때 무엇을 바꿔 해결했는지 적어 주세요.",
      materials: mats,
      frame: frameWith([
        ["무엇이 계획과 달랐는지"],
        fixes.slice(0, 2),
        checks.slice(0, 2),
        ["바꾼 뒤 무엇이 달라졌는지 · 수치는 직접 적습니다"],
      ]),
      empty: mats.length ? null
        : "고친 경험이 결과에 아직 없습니다. 안 됐던 과제 하나를 경험으로 적어 두면 여기 재료가 생깁니다.",
    });
  }

  {
    const used = picksOf(m, "J8");
    const reqs = picksOf(m, "J2");
    const mats: PrepMaterial[] = [];
    if (reqs.length) mats.push({ label: "받은 요구를 조건으로 옮긴 것", items: reqs.slice(0, 3) });
    if (used.length) mats.push({ label: "결과가 쓰인 곳", items: used.slice(0, 3) });
    const t = expTitles((e) => ["capstone", "project", "internship", "work"].includes(e.kind));
    if (t.length) mats.push({ label: "여럿이 함께한 경험", items: t });
    essays.push({
      key: "essay:team",
      title: "함께 일한 경험",
      ask: "다른 사람과 의견을 맞춰 결과를 낸 경험과 그 안에서 내가 한 일을 적어 주세요.",
      materials: mats,
      frame: frameWith([
        ["누구와 무엇을 함께 했는지 · 내가 맡은 몫"],
        reqs.slice(0, 2),
        ["의견이 갈렸을 때 무엇을 기준으로 정했는지"],
        used.slice(0, 2),
      ]),
      empty: mats.length ? null
        : "함께 한 경험이 결과에 아직 없습니다. 팀 과제나 캡스톤을 경험으로 적어 두면 여기 재료가 생깁니다.",
    });
  }

  /* ── 면접 질문 ─────────────────────────────────────────────── */
  const interviews: InterviewQ[] = [];
  const seen = new Set<string>();
  const push = (q: InterviewQ) => {
    if (!q.q || seen.has(q.q)) return;
    seen.add(q.q);
    interviews.push(q);
  };

  for (const [d, follow] of [
    [lead, "그때 무엇을 근거로 그렇게 정했나요?"],
    [second, "그 결과가 맞는지는 무엇과 비교해 확인했나요?"],
  ] as const) {
    if (!d) continue;
    const said = sentences(d.decided)[0] ?? sentences(d.did)[0];
    if (!said) continue;
    push({
      key: `iv:ev:${d.code}`,
      q: `${name(d.code)} 과제에서 ${quoteKo(said)}, ${follow}`,
      why: `${withJosa(name(d.code), "은는")} 결과에서 지금 설명할 수 있는 경험으로 나온 분야라, `
        + "면접관이 가장 먼저 파고들 부분입니다. 고르신 답을 그대로 되묻습니다.",
      prepare: uniq([
        ...sentences(d.did).filter((x) => x !== said).slice(0, 1),
        ...uniq(d.artifacts).filter((x) => !/다$/.test(x)).slice(0, 2).map((x) => `남긴 것: ${x}`),
        ...uniq(d.verifications).slice(0, 1).map((x) => `비교한 것: ${x}`),
      ]).slice(0, 3),
    });
  }

  if (goalRole) {
    push({
      key: `iv:goal:${m.targets.goal.role}`,
      q: `왜 ${goalRole} 직무를 지원했나요?`,
      why: "목표로 적어 두신 직무라 거의 반드시 나오는 질문입니다.",
      prepare: uniq([
        ...(readyDomains.slice(0, 2).map((c) => `${name(c)}에서 해 본 일`)),
        likedDomains[0] ? `관심이 높다고 답한 ${likedDomains[0]}` : "",
      ]),
    });
  }

  sv.application.interview.forEach((q, i) => push({
    key: `iv:spec:${i}`,
    q,
    why: "이 학과 학생에게 자주 묻는 질문입니다.",
    prepare: uniq([...sv.evidence.slice(0, 2)]),
  }));

  for (const g of m.gaps.filter((x) => x.axis).sort((a, b) => a.rank - b.rank).slice(0, 2)) {
    const ax = g.axis as Axis;
    push({
      key: `iv:gap:${g.domain}:${ax}`,
      q: AXIS_ASK_KO[ax](name(g.domain)),
      why: `결과에서 ${name(g.domain)}의 ‘${needKo(ax)}’ 부분이 아직 비어 있습니다. `
        + "이 질문이 나오면 답할 거리가 모자랄 수 있는 부분입니다.",
      prepare: [`이 질문에 답할 만한 과제가 있었는지 떠올려 보고, 있으면 경험으로 적어 두세요`],
    });
  }

  return { essays, interviews: interviews.slice(0, 7) };
}

/* ── 저장 ─────────────────────────────────────────────────────── */

export type PrepAnswer = {
  kind: "essay" | "interview";
  prompt_key: string;
  prompt_text: string;
  answer_text: string;
  saves: number;
  updated_at: string;
};

export async function prepAnswersOf(userId: string, core: string): Promise<PrepAnswer[]> {
  return query<PrepAnswer>(
    `SELECT kind, prompt_key, prompt_text, answer_text, saves,
            to_char(updated_at, 'YYYY-MM-DD') AS updated_at
       FROM v3_prep_answers
      WHERE user_id = $1 AND core_code = $2
      ORDER BY updated_at DESC`, [userId, core]);
}

/** 한 칸의 답. **같은 물음은 한 줄이다**: 고쳐 쓰면 덮고 횟수만 는다 */
export async function savePrepAnswer(userId: string, a: {
  core: string; kind: "essay" | "interview"; key: string; prompt: string; answer: string;
}): Promise<void> {
  const answer = a.answer.slice(0, 4000);
  if (!answer.trim()) {
    await query(
      `DELETE FROM v3_prep_answers
        WHERE user_id = $1 AND core_code = $2 AND kind = $3 AND prompt_key = $4`,
      [userId, a.core, a.kind, a.key]);
    return;
  }
  await query(
    `INSERT INTO v3_prep_answers (user_id, core_code, kind, prompt_key, prompt_text, answer_text)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (user_id, core_code, kind, prompt_key) DO UPDATE
       SET answer_text = EXCLUDED.answer_text, prompt_text = EXCLUDED.prompt_text,
           saves = v3_prep_answers.saves + 1, updated_at = now()`,
    [userId, a.core, a.kind, a.key.slice(0, 120), a.prompt.slice(0, 300), answer]);
}
