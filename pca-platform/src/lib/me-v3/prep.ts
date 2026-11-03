import { query } from "@/lib/db";
import type { ResultModel } from "./result/model";
import type { Experience } from "./platform";
import type { Axis } from "./scoring/types";
import { textFor } from "./result/text";
import { isClause, localizeResult } from "./result/localize";
import { specView } from "./result/spec-view";
import { withJosa } from "./result/josa";
import { domainName, industryChoices, roleName } from "./runtime/session";
import { wsSay, type WsSay } from "./ws-say";
import type { WsLang } from "./ws-lang";

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
 *
 * **말은 `wsSay` 를 거친다.** 열쇠가 한국어 원문이라 한국어는 글자 그대로
 * 나가고, 영어는 `ws-en/prep.ts` 사전에서 온다. 결과 모델은 한국어 원고 글자를
 * 들고 있으므로 영어면 먼저 `localizeResult` 로 그 언어 원고 글자로 읽는다.
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
const AXIS_ASK_KO: Record<Axis, (t: WsSay, n: string) => string> = {
  J1: (t, n) => t("{area} 과제에서 풀려고 한 문제가 정확히 무엇이었나요?", { area: n }),
  J2: (t, n) => t("{area} 과제에서 받은 요구를 어떤 조건으로 바꿔 진행했나요?", { area: n }),
  J3: (t, n) => t("{area} 과제에서 본인이 직접 정한 기준은 무엇이었나요?", { area: n }),
  J4: (t, n) => t("{area} 과제에서 그 방법을 고른 까닭은 무엇인가요?", { area: n }),
  J5: (t, n) => t("{area} 과제로 손에 남은 결과물은 무엇인가요?", { area: n }),
  J6: (t, n) => t("{area} 과제의 결과가 맞는지 무엇과 비교해 확인했나요?", { area: n }),
  J7: (t, n) => t("{area} 과제에서 잘 안 됐던 순간에 무엇을 고쳤나요?", { area: n }),
  J8: (t, n) => t("{area} 과제의 결과는 실제로 어디에 쓰였나요?", { area: n }),
};

/**
 * 고른 항목 가운데 문장만 받는다.
 *
 * **고른 항목에는 문장(`~다`)과 이름(`목표와 지표 표`)이 섞여 있다.** 문장만
 * 받는다: 이름을 넣으면 `목표와 지표 표고 하셨는데` 가 된다. 영어는 끝맺음으로
 * 가를 수 없어 원본이 문장이었는지를 `isClause` 가 본다.
 */
const clauseOf = (lang: WsLang) => (x: string) =>
  (lang === "ko" ? /다$/.test(x) : isClause(x, lang));

const frameOf = (t: WsSay) => [
  { label: t("상황·역할#prep"), hint: t("어떤 과제였고 내가 맡은 자리가 무엇이었는지") },
  { label: t("행동#prep"), hint: t("무엇을 어떤 방법으로 했는지") },
  { label: t("판단#prep"), hint: t("무엇을 직접 정했고 무엇과 비교했는지") },
  { label: t("결과#prep"), hint: t("무엇이 남았고 어디에 쓰였는지 · 수치와 기간은 직접 적습니다") },
];

const uniq = (xs: string[]) => [...new Set(xs.map((x) => x.trim()).filter(Boolean))];

/** 그 축에서 고른 항목을 영역을 가리지 않고 모은다 */
function picksOf(m: ResultModel, axis: Axis): string[] {
  return uniq(m.domains.flatMap((d) =>
    d.axes.filter((a) => a.axis === axis && (a.state === "CONFIRMED" || a.state === "OWNED") && a.picks.length)
      .flatMap((a) => a.picks))).slice(0, 4);
}

export function buildPrep(
  m0: ResultModel, core: string, spec: string | null, exps: Experience[],
  lang: WsLang = "ko",
): Prep {
  const t = wsSay(lang);
  const tx = textFor(lang);
  /* 결과 모델의 원고 글자(고른 항목 · 번역 보기)를 그 언어로. 한국어면 그대로다 */
  const m = localizeResult(m0, core, lang);
  const isClauseIn = clauseOf(lang);
  const sentences = (xs: string[]) => uniq(xs).filter(isClauseIn);
  const FRAME = frameOf(t);
  const frameWith = (items: string[][]): EssayPrompt["frame"] =>
    FRAME.map((f, i) => ({ ...f, items: items[i] ?? [] }));

  const name = (td: string) => domainName(core, td, lang);
  const readyDomains = uniq(m.evidence.ready.map((e) => e.domain));
  const lead = readyDomains[0] ? m.domains.find((d) => d.code === readyDomains[0]) : undefined;
  const second = readyDomains[1] ? m.domains.find((d) => d.code === readyDomains[1]) : undefined;
  const sv = specView(core, spec, lang);
  const indName = (c: string) => industryChoices(core, lang).find((x) => x.code === c)?.name ?? null;
  const goalRole = m.targets.goal.role ? roleName(core, m.targets.goal.role, lang) : null;
  const goalInd = m.targets.goal.industry ? indName(m.targets.goal.industry) : null;
  const likedDomains = m.domains.filter((d) => d.interest === "HIGH").map((d) => name(d.code));
  const expTitles = (pred: (e: Experience) => boolean) =>
    exps.filter(pred).map((e) => e.title).slice(0, 3);

  /* ── 지원서 네 문항 ─────────────────────────────────────────── */
  const essays: EssayPrompt[] = [];

  {
    const mats: PrepMaterial[] = [];
    const goal = uniq([goalRole ?? "", goalInd ?? ""]);
    if (goal.length) mats.push({ label: t("적어 두신 목표"), items: goal });
    if (likedDomains.length) mats.push({ label: t("관심이 높다고 답한 분야"), items: likedDomains.slice(0, 4) });
    /* 해 본 일 칸은 이름표가 아니라 자리로 찾는다: 이름표는 언어마다 다르다 */
    const ready: PrepMaterial | undefined = readyDomains.length
      ? { label: t("이미 해 본 일이 있는 분야"), items: readyDomains.slice(0, 3).map(name) }
      : undefined;
    if (ready) mats.push(ready);
    essays.push({
      key: "essay:motive",
      title: t("지원 동기"),
      ask: t("이 분야(직무)에 관심을 갖게 된 계기와 그동안 준비한 것을 적어 주세요."),
      materials: mats,
      frame: frameWith([
        [t("처음 관심을 갖게 된 수업·과제·경험")],
        ready?.items.map((x) => t("{area}에서 해 본 일", { area: x })) ?? [],
        [t("그 경험에서 이 일이 나에게 맞는다고 판단한 까닭")],
        [t("지원한 곳에서 하고 싶은 일 한 가지")],
      ]),
      empty: mats.length ? null
        : t("관심 분야와 목표가 아직 결과에 없습니다. 검사의 관심 문항에 답하면 여기에 섭니다."),
    });
  }

  {
    const mats: PrepMaterial[] = [];
    if (lead) {
      const dec = sentences(lead.decided).slice(0, 3);
      mats.push({ label: t("{area} · 직접 정한 것", { area: name(lead.code) }), items: dec });
      mats.push({ label: t("{area} · 해 본 일", { area: name(lead.code) }),
        items: sentences(lead.did).filter((x) => !dec.includes(x)).slice(0, 3) });
      mats.push({ label: t("{area} · 남긴 것", { area: name(lead.code) }), items: uniq(lead.artifacts).slice(0, 3) });
    }
    const ex = expTitles((e) => !lead || e.td_codes.includes(lead.code) || !e.td_codes.length);
    if (ex.length) mats.push({ label: t("적어 두신 경험"), items: ex });
    const frame = m.translation ? tx.draftFrameKo(m.translation.steps) : [];
    essays.push({
      key: "essay:job",
      title: t("직무 관련 경험"),
      ask: t("지원 직무와 관련해 직접 해 본 경험과 그 과정에서 맡은 역할을 적어 주세요."),
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
        : t("아직 설명할 수 있는 경험이 결과에 없습니다. 경험을 하나 적어 두면 여기 재료가 생깁니다."),
    });
  }

  {
    const fixes = picksOf(m, "J7");
    const checks = picksOf(m, "J6");
    const mats: PrepMaterial[] = [];
    if (fixes.length) mats.push({ label: t("안 됐을 때 고친 것"), items: fixes });
    if (checks.length) mats.push({ label: t("비교해 확인한 것"), items: checks.slice(0, 3) });
    const ex = expTitles((e) => e.verifications.length > 0);
    if (ex.length) mats.push({ label: t("비교한 것을 적어 둔 경험"), items: ex });
    essays.push({
      key: "essay:fix",
      title: t("어려움을 고친 경험"),
      ask: t("계획대로 되지 않았던 일과, 그때 무엇을 바꿔 해결했는지 적어 주세요."),
      materials: mats,
      frame: frameWith([
        [t("무엇이 계획과 달랐는지")],
        fixes.slice(0, 2),
        checks.slice(0, 2),
        [t("바꾼 뒤 무엇이 달라졌는지 · 수치는 직접 적습니다")],
      ]),
      empty: mats.length ? null
        : t("고친 경험이 결과에 아직 없습니다. 안 됐던 과제 하나를 경험으로 적어 두면 여기 재료가 생깁니다."),
    });
  }

  {
    const used = picksOf(m, "J8");
    const reqs = picksOf(m, "J2");
    const mats: PrepMaterial[] = [];
    if (reqs.length) mats.push({ label: t("받은 요구를 조건으로 옮긴 것"), items: reqs.slice(0, 3) });
    if (used.length) mats.push({ label: t("결과가 쓰인 곳"), items: used.slice(0, 3) });
    const ex = expTitles((e) => ["capstone", "project", "internship", "work"].includes(e.kind));
    if (ex.length) mats.push({ label: t("여럿이 함께한 경험"), items: ex });
    essays.push({
      key: "essay:team",
      title: t("함께 일한 경험"),
      ask: t("다른 사람과 의견을 맞춰 결과를 낸 경험과 그 안에서 내가 한 일을 적어 주세요."),
      materials: mats,
      frame: frameWith([
        [t("누구와 무엇을 함께 했는지 · 내가 맡은 몫")],
        reqs.slice(0, 2),
        [t("의견이 갈렸을 때 무엇을 기준으로 정했는지")],
        used.slice(0, 2),
      ]),
      empty: mats.length ? null
        : t("함께 한 경험이 결과에 아직 없습니다. 팀 과제나 캡스톤을 경험으로 적어 두면 여기 재료가 생깁니다."),
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
    [lead, t("그때 무엇을 근거로 그렇게 정했나요?")],
    [second, t("그 결과가 맞는지는 무엇과 비교해 확인했나요?")],
  ] as const) {
    if (!d) continue;
    const said = sentences(d.decided)[0] ?? sentences(d.did)[0];
    if (!said) continue;
    /* 한국어는 조사를 받침 보고 붙인 이름이 들어가고, 영어는 이름 그대로다 */
    const topic = lang === "ko" ? withJosa(name(d.code), "은는") : name(d.code);
    push({
      key: `iv:ev:${d.code}`,
      /* 고르신 문장을 그대로 인용해 되묻는다 */
      q: t("{area} 과제에서 ‘{said}’고 답하셨는데, {follow}",
        { area: name(d.code), said, follow }),
      why: t("{area} 결과에서 지금 설명할 수 있는 경험으로 나온 분야라, "
        + "면접관이 가장 먼저 파고들 부분입니다. 고르신 답을 그대로 되묻습니다.", { area: topic }),
      prepare: uniq([
        ...sentences(d.did).filter((x) => x !== said).slice(0, 1),
        ...uniq(d.artifacts).filter((x) => !isClauseIn(x)).slice(0, 2)
          .map((x) => t("남긴 것: {x}", { x })),
        ...uniq(d.verifications).slice(0, 1).map((x) => t("비교한 것: {x}", { x })),
      ]).slice(0, 3),
    });
  }

  if (goalRole) {
    push({
      key: `iv:goal:${m.targets.goal.role}`,
      q: t("왜 {role} 직무를 지원했나요?", { role: goalRole }),
      why: t("목표로 적어 두신 직무라 거의 반드시 나오는 질문입니다."),
      prepare: uniq([
        ...(readyDomains.slice(0, 2).map((c) => t("{area}에서 해 본 일", { area: name(c) }))),
        likedDomains[0] ? t("관심이 높다고 답한 {area}", { area: likedDomains[0] }) : "",
      ]),
    });
  }

  sv.application.interview.forEach((q, i) => push({
    key: `iv:spec:${i}`,
    q,
    why: t("이 학과 학생에게 자주 묻는 질문입니다."),
    prepare: uniq([...sv.evidence.slice(0, 2)]),
  }));

  for (const g of m.gaps.filter((x) => x.axis).sort((a, b) => a.rank - b.rank).slice(0, 2)) {
    const ax = g.axis as Axis;
    /* 영어 벌의 `needKo` 는 머리글자가 크다(`What you produced`). 문장 안에 넣을 때 낮춘다 */
    const need0 = tx.needKo(ax);
    const need = lang === "ko" ? need0 : need0.charAt(0).toLowerCase() + need0.slice(1);
    push({
      key: `iv:gap:${g.domain}:${ax}`,
      q: AXIS_ASK_KO[ax](t, name(g.domain)),
      why: t("결과에서 {area}의 ‘{need}’ 부분이 아직 비어 있습니다. "
        + "이 질문이 나오면 답할 거리가 모자랄 수 있는 부분입니다.", { area: name(g.domain), need }),
      prepare: [t("이 질문에 답할 만한 과제가 있었는지 떠올려 보고, 있으면 경험으로 적어 두세요")],
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
