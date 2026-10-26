import { coreFile } from "@/lib/me-v3/core-registry";
import { domainName } from "@/lib/me-v3/runtime/session";
import { AXIS_KO } from "@/lib/me-v3/result/text.ko";
import { withJosa } from "@/lib/me-v3/result/josa";
import type { Axis } from "@/lib/me-v3/scoring/types";
import type { Experience } from "@/lib/me-v3/platform";
import type { ItemStatus, PostingItem } from "./posting";
import { axisName } from "./catalog";

/**
 * 공고 한 건으로 면접을 준비하고, 비어 있는 요구를 이번 주 할 일로 바꾼다.
 *
 * **판정을 다시 하지 않는다.** 요구 항목의 영역·판단축·상태는
 * `analyzePosting` 이 이미 적어 둔 값을 그대로 읽는다. 여기서 하는 일은
 * 그 위에 질문 한 줄과 할 일 한 줄을 붙이는 것뿐이다.
 *
 * **AI 를 부르지 않는다.** 질문과 할 일은 판단축마다 적어 둔 틀과 그 Core 의
 * 영역 사전(`artifacts` · `verify_targets` · 판단축 문장)으로 만든다. 같은
 * 입력이면 늘 같은 줄이 나온다.
 *
 * **합격 가능성을 말하지 않는다.** 어느 답이 더 낫다거나 몇 점이라고 적지
 * 않고, 경험이 없으면 없다고 적는다(직업정보제공사업 범위).
 *
 * DB 를 읽지 않는 순수 함수다(`npm run mat:prep` 이 직접 부른다).
 */

type Domain = {
  code: string; name?: string;
  required_axes?: string[];
  artifacts?: string[];
  verify_targets?: string[];
  axes?: Record<string, { l2?: string; l3?: string }>;
};

const DICT = new Map<string, Domain[]>();
function dict(core: string): Domain[] {
  let d = DICT.get(core);
  if (!d) {
    d = coreFile<{ domains: Domain[] }>(core, "domains").domains;
    DICT.set(core, d);
  }
  return d;
}
const domainOf = (core: string, td: string) => dict(core).find((d) => d.code === td);

const AXES: Axis[] = ["J1", "J2", "J3", "J4", "J5", "J6", "J7", "J8"];
const isAxis = (x: unknown): x is Axis => typeof x === "string" && (AXES as string[]).includes(x);
/** 판단축이 비어 있을 때 묻는 차례. 그 영역이 꼭 보는 축이 먼저다 */
const FALLBACK: Axis[] = ["J3", "J5", "J6", "J1", "J2", "J4", "J7", "J8"];

/** 따옴표 안에 넣을 요구 문장. 길면 끊는다 */
function quote(s: string, n = 34): string {
  const x = s.replace(/\s+/g, " ").trim();
  return x.length > n ? `${x.slice(0, n - 1).trim()}…` : x;
}
const q = (s: string) => `‘${s}’`;

/* ── 면접 질문 ─────────────────────────────────────────────────── */

/**
 * 판단축마다 두 갈래. 앞은 공고의 요구 문장을 인용하고, 뒤는 영역 이름으로
 * 묻는다. **같은 갈래를 한 공고에서 두 번 쓰지 않는다**: 같은 축의 요구가
 * 셋이면 셋째는 그 영역이 보는 다른 축으로 넘어간다.
 */
const ASK: Record<Axis, [(req: string, area: string) => string, (req: string, area: string) => string]> = {
  J1: [
    (r) => `공고의 ${q(r)} 항목과 비슷한 일을 맡았을 때, 풀어야 할 문제를 무엇으로 정했나요?`,
    (_, a) => `${a} 일을 처음 받았을 때 어디까지를 내 문제로 보고 범위를 잡았나요?`,
  ],
  J2: [
    (r) => `${q(r)} 항목과 관련해 받은 요구를 어떤 조건이나 기준으로 바꿔 진행했나요?`,
    (_, a) => `${a} 일에서 요구끼리 부딪힌 적이 있다면, 무엇을 먼저 지켰고 왜 그랬나요?`,
  ],
  J3: [
    (r) => `${q(r)} 항목과 관련된 일에서 본인이 직접 정한 것은 무엇이고, 그렇게 정한 근거는 무엇이었나요?`,
    (_, a) => `${a} 일에서 정해 준 대로 하지 않고 기준을 직접 정한 순간이 있었나요?`,
  ],
  J4: [
    (r) => `${q(r)} 항목과 관련해 어떤 방법이나 도구를 썼고, 그것을 고른 까닭은 무엇인가요?`,
    (_, a) => `${a} 일에 쓴 도구 가운데 가장 익숙한 것으로 실제로 무엇을 해 봤는지 말해 주세요.`,
  ],
  J5: [
    (r) => `${q(r)} 항목과 관련해 직접 만들어 남긴 결과물이 있다면 하나 설명해 주세요.`,
    (_, a) => `${a} 일로 남긴 결과물을 다른 사람이 이어받아 쓸 수 있었나요? 거기에 무엇이 적혀 있었나요?`,
  ],
  J6: [
    (r) => `${q(r)} 항목과 관련된 결과가 맞는지 무엇과 비교해 확인했나요?`,
    (_, a) => `${a} 일에서 결과를 믿어도 된다고 판단한 근거는 무엇이었나요?`,
  ],
  J7: [
    (r) => `${q(r)} 항목과 관련된 일에서 계획대로 안 된 적이 있나요? 그때 무엇을 고쳤나요?`,
    (_, a) => `${a} 일에서 틀린 것을 발견했을 때 원인을 어떻게 좁혀 갔나요?`,
  ],
  J8: [
    (r) => `${q(r)} 항목과 관련해 한 일이 실제로 어디에 쓰였나요?`,
    (_, a) => `${a} 일의 결과를 다른 사람이나 팀에 넘길 때 무엇을 함께 전했나요?`,
  ],
};

type PickKind = "decisions" | "artifacts" | "verifications";
/** 그 축의 질문에 먼저 꺼낼 재료 */
const LEAD: Record<Axis, PickKind[]> = {
  J1: ["decisions", "artifacts", "verifications"],
  J2: ["decisions", "verifications", "artifacts"],
  J3: ["decisions", "artifacts", "verifications"],
  J4: ["decisions", "artifacts", "verifications"],
  J5: ["artifacts", "decisions", "verifications"],
  J6: ["verifications", "decisions", "artifacts"],
  J7: ["decisions", "verifications", "artifacts"],
  J8: ["artifacts", "decisions", "verifications"],
};

const bare = (s: string) => s.trim().replace(/[.。]$/, "");
/**
 * `…와 비교해`. 이름이 이미 `A와 B` 꼴이면 `A와 B와 비교해` 가 되므로
 * `A와 B를 놓고 비교해` 로 적는다.
 */
const cmp = (x: string) => (/[와과] /.test(x)
  ? `${withJosa(bare(x), "을를")} 놓고 비교해`
  : `${withJosa(bare(x), "과와")} 비교해`);

/** 고른 재료 둘로 답의 차례를 한 줄로 적는다. 숫자·기간·성과는 넣지 않는다 */
function frameLine(lead: PickKind, lv: string, second: PickKind | null, sv: string): string {
  const D = (x: string) => withJosa(q(bare(x)), "을를");
  const A = (x: string) => withJosa(bare(x), "을를");
  if (lead === "decisions") {
    if (second === "artifacts") return `직접 정한 것으로 ${D(lv)} 먼저 말하고, 그 결과로 남은 ${A(sv)} 보여 주며 끝내 보세요.`;
    if (second === "verifications") return `직접 정한 것으로 ${D(lv)} 먼저 말하고, ${cmp(sv)} 확인한 과정을 이어 말해 보세요.`;
    return `직접 정한 것으로 ${D(lv)} 먼저 말하고, 왜 그렇게 정했는지 근거 하나를 덧붙여 보세요.`;
  }
  if (lead === "artifacts") {
    if (second === "decisions") return `남긴 ${A(lv)} 먼저 보여 주고, 그 안에서 직접 정한 ${D(sv)} 짚어 말해 보세요.`;
    if (second === "verifications") return `남긴 ${A(lv)} 먼저 보여 주고, ${cmp(sv)} 맞는지 본 과정을 덧붙여 보세요.`;
    return `남긴 ${A(lv)} 먼저 보여 주고, 그 안에서 내가 맡은 몫을 짚어 말해 보세요.`;
  }
  if (second === "decisions") return `${cmp(lv)} 확인한 과정을 먼저 말하고, 그 전에 직접 정한 ${D(sv)} 덧붙여 보세요.`;
  if (second === "artifacts") return `${cmp(lv)} 확인한 과정을 먼저 말하고, 그때 남긴 ${A(sv)} 함께 보여 주세요.`;
  return `${cmp(lv)} 확인한 과정을 먼저 말하고, 그 비교로 알게 된 것을 한 줄 덧붙여 보세요.`;
}

export type InterviewPrep = {
  /** 공고의 요구 문장 */
  text: string;
  kind: "must" | "nice";
  domain: string;
  /** 질문이 실제로 묻는 판단축. 요구에 축이 없으면 그 영역이 보는 축이다 */
  axis: Axis;
  status: ItemStatus;
  question: string;
  /** 가져갈 경험. 그 영역에 적어 둔 것이 없으면 비어 있다 */
  experience: { id: string; title: string } | null;
  /** 답의 뼈대 한 줄. 경험이 있을 때만 */
  frame: string | null;
  /** 경험이 없을 때 정직하게 답하는 법 한 줄 */
  honest: string | null;
};

/** 그 축에서 쓸 재료가 많고, 앞 질문에서 아직 안 쓴 경험을 먼저 고른다 */
function pickExperience(list: Experience[], axis: Axis, used: Set<string>): Experience | null {
  let best: Experience | null = null;
  let bestKey = -1;
  const kinds = LEAD[axis];
  for (const e of list) {
    const has = (k: PickKind) => (e[k] ?? []).length > 0;
    const key = (has(kinds[0]) ? 4 : 0) + (has(kinds[1]) ? 2 : 0) + (has(kinds[2]) ? 1 : 0)
      + (used.has(e.id) ? 0 : 8);
    /* 같으면 먼저 온 것(최근에 적은 것) */
    if (key > bestKey) { best = e; bestKey = key; }
  }
  return best;
}

/** 문서처럼 손에 쥘 수 있는 결과물 이름. `…한 근거` 같은 마디는 할 일 머리에 서기 어렵다 */
const DOCLIKE = /(서|표|도|기록|보고|계획|노트|메모|목록|자료|코드|이력|품|BOM|묶음|안|절차|기준|결과)$/u;
const thingy = (s: string) => !/것|이유|까닭|근거$|때$/.test(s);

function rotate<T>(xs: T[], i: number): T | null {
  return xs.length ? xs[i % xs.length] : null;
}

/**
 * 사전의 말 가운데 **이 화면에 세우지 않는 낱말**이 든 것. 품질 영역의
 * `합격 기준` 은 그 전공의 맞는 말이지만, 공고 화면에서는 채용 합격으로 읽힌다.
 */
const OFF = /합격|추천|(?<!우선)순위|점수/;

function artifactOf(core: string, td: string, i: number): string | null {
  const all = (domainOf(core, td)?.artifacts ?? []).filter((x) => !OFF.test(x));
  const good = all.filter((x) => DOCLIKE.test(x) && thingy(x));
  return rotate(good.length ? good : all, i);
}
function verifyOf(core: string, td: string, i: number): string | null {
  return rotate((domainOf(core, td)?.verify_targets ?? []).filter((x) => !OFF.test(x)), i);
}

/**
 * 그 항목이 같은 영역의 작은 일 가운데 몇째인가. 면접 쪽 정직한 답이 말하는
 * 결과물과 작은 일의 결과물이 **같은 것**이어야 한다: 둘이 다르면 학생은
 * 무엇을 만들고 있다고 말해야 할지 모른다.
 */
function taskIndex(items: PostingItem[], it: PostingItem): number {
  let n = 0;
  for (const x of items) {
    if (x === it) return n;
    if (x.kind === "must" && x.domain === it.domain
      && (x.status === "empty" || x.status === "partial")) n += 1;
  }
  return 0;
}

/**
 * 면접 준비. 필수 항목을 먼저, 모자라면 우대 항목으로 채워 최대 여섯.
 * 영역에 잇지 못한 줄(학력·자격 같은 조건)은 경험으로 답할 자리가 아니라 뺀다.
 */
export function interviewPrep(
  core: string, items: PostingItem[], exps: Experience[], max = 6, lang: "ko" | "en" = "ko",
): InterviewPrep[] {
  if (lang === "en") return interviewPrepEn(core, items, exps, max);
  const withDomain = items.filter((it): it is PostingItem & { domain: string } => !!it.domain);
  const picked = [
    ...withDomain.filter((it) => it.kind === "must"),
    ...withDomain.filter((it) => it.kind !== "must"),
  ].slice(0, max);

  const usedTpl = new Set<string>();
  const usedQ = new Set<string>();
  const usedExp = new Set<string>();
  /* 같은 경험을 두 번 가져가면 둘째 질문에서는 그 경험의 다른 재료를 꺼낸다 */
  const useN = new Map<string, number>();
  /* 정직한 답도 줄마다 같은 말이 서지 않게 두 갈래를 번갈아 쓴다 */
  let h = 0;
  const usedNear = new Set<string>();
  const out: InterviewPrep[] = [];

  for (const it of picked) {
    const d = domainOf(core, it.domain);
    const area = domainName(core, it.domain);
    const req = quote(it.text);
    const prefer: Axis[] = [
      ...(isAxis(it.axis) ? [it.axis] : []),
      ...((d?.required_axes ?? []).filter(isAxis)),
      ...FALLBACK,
    ];
    let axis: Axis = prefer[0];
    let question = "";
    outer: for (const ax of [...new Set(prefer)]) {
      for (let v = 0; v < 2; v += 1) {
        const k = `${ax}:${v}`;
        const s = ASK[ax][v](req, area);
        if (usedTpl.has(k) || usedQ.has(s)) continue;
        usedTpl.add(k); usedQ.add(s);
        axis = ax; question = s;
        break outer;
      }
    }
    if (!question) continue; /* 열여섯 갈래를 다 쓴 경우. 최대 여섯이라 오지 않는다 */

    const mine = exps.filter((e) => e.td_codes.includes(it.domain));
    const exp = pickExperience(mine, axis, usedExp);
    let frame: string | null = null;
    let honest: string | null = null;
    if (exp) {
      usedExp.add(exp.id);
      const u = useN.get(exp.id) ?? 0;
      useN.set(exp.id, u + 1);
      const kinds = LEAD[axis].filter((k) => (exp[k] ?? []).length > 0);
      if (kinds.length) {
        const lv = rotate(exp[kinds[0]], u) ?? "";
        const sk = kinds[1] ?? null;
        frame = frameLine(kinds[0], lv, sk, sk ? rotate(exp[sk], u) ?? "" : "");
      } else {
        frame = "이 경험에는 직접 정한 것·남긴 것·비교한 것이 아직 골라져 있지 않아요. "
          + "경험을 고쳐 한 칸이라도 채워 두면 답할 거리가 생겨요.";
      }
    } else if (it.status === "empty") {
      const art = artifactOf(core, it.domain, taskIndex(items, it));
      const near = exps.find((e) => e.axis_codes.includes(axis) && !usedNear.has(e.id))
        ?? exps.find((e) => e.axis_codes.includes(axis)) ?? null;
      const any = rotate(exps, h);
      if (near) usedNear.add(near.id);
      const nearLine = near
        ? `다른 영역에서 ${q(AXIS_KO[axis])} 부분을 해 본 ${withJosa(q(near.title), "을를")} 가장 가까운 일로 들고`
        : any
          ? `적어 둔 ${q(any.title)}에서 이 질문과 가장 가까운 장면 하나를 들고`
          : "수업이나 과제에서 해 본 가장 가까운 일 하나를 들고";
      const open = h % 2 === 0
        ? "“이 일을 직접 맡아 본 적은 아직 없습니다”로 솔직하게 시작해 보세요."
        : "먼저 이 일을 직접 해 보지는 못했다고 그대로 말해 보세요.";
      const close = !art ? "지금 준비하고 있는 것이 있다면 그 이야기로 마무리하면 돼요."
        : h % 2 === 0
          ? `이번 주에 ${withJosa(art, "을를")} 만들기 시작했다면 그 이야기로 마무리하면 돼요.`
          : `${withJosa(art, "을를")} 지금 만들고 있다면 어디까지 했는지로 끝내면 돼요.`;
      honest = `${open} 그다음 ${nearLine}, ${close}`;
      h += 1;
    } else {
      honest = "검사에서는 이 영역 일을 해 봤다고 답하셨는데 적어 둔 경험은 아직 없어요. "
        + "그 일을 경험으로 적어 두면 제목과 직접 정한 것으로 답의 뼈대를 만들어 드려요.";
    }
    out.push({
      text: it.text, kind: it.kind, domain: it.domain, axis, status: it.status,
      question, experience: exp ? { id: exp.id, title: exp.title } : null, frame, honest,
    });
  }
  return out;
}

/* ── 이번 주에 할 수 있는 작은 일 ───────────────────────────────── */

export type SmallTask = {
  text: string;
  domain: string;
  axis: Axis | null;
  status: "empty" | "partial";
  /** 화면에 서는 한 줄. 결과물 하나와 확인 방법 하나가 들어 있다 */
  task: string;
  artifact: string;
  verify: string;
};

/**
 * 필수 항목 가운데 `아직 없음` · `정리가 덜 됨` 인 줄마다 하나.
 *
 * **막연한 말을 쓰지 않는다.** 줄마다 그 영역 사전의 결과물 하나와 비교할
 * 것 하나가 이름으로 들어간다. 사전에 그 둘이 없는 영역이면 줄을 만들지
 * 않는다: 무엇을 만들지 모르는 할 일은 할 일이 아니다.
 */
export function smallTasks(
  core: string, items: PostingItem[], exps: Experience[], lang: "ko" | "en" = "ko",
): SmallTask[] {
  if (lang === "en") return smallTasksEn(core, items, exps);
  const out: SmallTask[] = [];
  const seen = new Map<string, number>();
  for (const it of items) {
    if (it.kind !== "must" || !it.domain) continue;
    if (it.status !== "empty" && it.status !== "partial") continue;
    const n = seen.get(it.domain) ?? 0;
    seen.set(it.domain, n + 1);
    const art = artifactOf(core, it.domain, n);
    const ver = verifyOf(core, it.domain, n);
    if (!art || !ver) continue;
    const area = domainName(core, it.domain);
    const A = withJosa(art, "을를");
    const V = cmp(ver);
    const exp = exps.find((e) => e.td_codes.includes(it.domain!)
      && (!it.evidence.length || it.evidence.includes(e.title))) ?? null;
    let task: string;
    let artifact = art;
    if (it.status === "empty") {
      task = `${area}: 지난 과제나 수업 자료 하나를 골라 ${A} 작게 하나 만들어 보고, ${V} 맞는지 적어 두세요.`;
    } else if (exp && !exp.artifacts.length) {
      task = `${area}: 적어 둔 ${q(exp.title)}에서 남은 것으로 ${A} 하나 정리하고, ${V} 맞는지 한 줄 적어 두세요.`;
    } else if (exp && !exp.verifications.length) {
      artifact = exp.artifacts[0];
      const mine = withJosa(artifact, "을를");
      task = `${area}: 적어 둔 ${q(exp.title)}의 ${mine} ${V} 보고, 같은 점과 다른 점을 한 줄씩 적어 두세요.`;
    } else if (exp) {
      /* 요구에 판단축이 없으면 **그 경험이 아직 덮지 않은 축**을 고른다. 이미 고른
         축의 문장(`조립도와 부품도를 냈다`)을 다시 찾으라고 하면 할 일이 아니다 */
      const dd = domainOf(core, it.domain);
      const order = [...new Set([...(dd?.required_axes ?? []).filter(isAxis), ...FALLBACK])];
      const ax = isAxis(it.axis) ? it.axis
        : rotate(order.filter((a) => !exp.axis_codes.includes(a)), n);
      const l2 = ax ? dd?.axes?.[ax]?.l2 : undefined;
      task = l2
        ? `${area}: 적어 둔 ${withJosa(q(exp.title), "을를")} 다시 열어 ${q(bare(l2))}에 해당하는 일이 있었는지 찾아 보세요. 있었다면 ${art} 하나에 그 내용을 정리하고 ${V} 두세요.`
        : `${area}: 적어 둔 ${q(exp.title)}에서 직접 정한 것 하나를 골라 ${art} 하나에 근거와 함께 정리하고, ${V} 두세요.`;
    } else {
      task = `${area}: 검사에서 해 봤다고 답한 일 하나를 경험으로 적고, 그때 남은 ${A} ${V} 본 결과를 붙여 두세요.`;
    }
    out.push({
      text: it.text, domain: it.domain, axis: isAxis(it.axis) ? it.axis : null,
      status: it.status, task, artifact, verify: ver,
    });
  }
  return out;
}

/** 할 일 목록에 담을 문장. 어느 공고의 어느 요구에서 왔는지 끝에 붙인다 */
export function taskBody(t: SmallTask, label: string, lang: "ko" | "en" = "ko"): string {
  if (lang === "en") return `${t.task} (from the posting “${quote(label, 30)}”: “${quote(t.text, 30)}”)`.slice(0, 400);
  return `${t.task} (${q(quote(label, 30))} 공고의 ${q(quote(t.text, 30))})`.slice(0, 400);
}

/* ── 영어 ──────────────────────────────────────────────────────
   한국어와 같은 차례 · 같은 고르는 법이고 **글만 영어다.** 영역 사전은 그 Core
   의 영어 원고를 읽고, 없으면 한국어 원고로 떨어진다(이름만 한국어가 된다) */

const DICT_EN = new Map<string, Domain[]>();
function dictEn(core: string): Domain[] {
  let d = DICT_EN.get(core);
  if (!d) {
    try { d = coreFile<{ domains: Domain[] }>(core, "domains", undefined, "en").domains; }
    catch { d = dict(core); }
    DICT_EN.set(core, d);
  }
  return d;
}
const domainOfEn = (core: string, td: string) => dictEn(core).find((d) => d.code === td);
const areaEn = (core: string, td: string) => domainOfEn(core, td)?.name ?? domainName(core, td);
const qe = (s: string) => `“${s}”`;
const lowerFirst = (s: string) => (/^[A-Z][a-z]/.test(s) ? s[0].toLowerCase() + s.slice(1) : s);
/** 셀 수 있는 이름 앞에 a/an. 복수(`calculations`)와 대문자 약어 뒤 복수는 그대로 둔다 */
const withArticle = (s: string): string => {
  if (/^(a|an|the|my|our)\s/i.test(s) || /s$/i.test(s) && !/(ss|is|us)$/i.test(s)) return s;
  return /^[aeiou]/i.test(s) && !/^(u[bcfhjkqrstn][aeiou]|one)/i.test(s) ? `an ${s}` : `a ${s}`;
};
const OFF_EN = /\b(pass|hire|hiring\s+decision|recommend\w*|rank\w*|score)\b/i;

const ASK_EN: Record<Axis, [(req: string, area: string) => string, (req: string, area: string) => string]> = {
  J1: [
    (r) => `When you took on work like ${qe(r)}, how did you define the problem you had to solve?`,
    (_, a) => `The first time you got a ${a} task, where did you draw the line on what was yours to solve?`,
  ],
  J2: [
    (r) => `For ${qe(r)}, how did you turn what was asked into concrete conditions or criteria?`,
    (_, a) => `In your ${a} work, when two requirements pulled against each other, which did you keep and why?`,
  ],
  J3: [
    (r) => `In work related to ${qe(r)}, what did you decide yourself, and what was that decision based on?`,
    (_, a) => `In your ${a} work, was there a moment you set the criteria yourself instead of following what you were given?`,
  ],
  J4: [
    (r) => `For ${qe(r)}, which method or tool did you use, and why that one?`,
    (_, a) => `Of the tools you used in ${a}, pick the one you know best and tell me what you actually did with it.`,
  ],
  J5: [
    (r) => `For ${qe(r)}, walk me through one thing you built or wrote that someone else could use.`,
    (_, a) => `Could someone else pick up what you produced in your ${a} work? What was written in it?`,
  ],
  J6: [
    (r) => `For results related to ${qe(r)}, what did you compare them with to know they were right?`,
    (_, a) => `In your ${a} work, what told you the result could be trusted?`,
  ],
  J7: [
    (r) => `In work related to ${qe(r)}, did something not go to plan? What did you fix?`,
    (_, a) => `In your ${a} work, when you found a mistake, how did you narrow down the cause?`,
  ],
  J8: [
    (r) => `Where did the work you did for ${qe(r)} actually get used?`,
    (_, a) => `When you handed off ${a} results to a person or team, what did you pass along with them?`,
  ],
};

function frameLineEn(lead: PickKind, lv: string, second: PickKind | null, sv: string): string {
  const D = qe(bare(lv)), A = lowerFirst(bare(lv));
  const S = bare(sv);
  if (lead === "decisions") {
    if (second === "artifacts") return `Open with what you decided, ${D}, then end by showing ${withArticle(lowerFirst(S))} that came out of it.`;
    if (second === "verifications") return `Open with what you decided, ${D}, then explain how you checked it against ${lowerFirst(S)}.`;
    return `Open with what you decided, ${D}, then give one reason you decided it that way.`;
  }
  if (lead === "artifacts") {
    if (second === "decisions") return `Start by showing ${withArticle(A)}, then point to the part you decided yourself: ${qe(S)}.`;
    if (second === "verifications") return `Start by showing ${withArticle(A)}, then add how you checked it against ${lowerFirst(S)}.`;
    return `Start by showing ${withArticle(A)}, then point out which part of it was yours.`;
  }
  if (second === "decisions") return `Start with how you checked your result against ${A}, then add what you had decided before that: ${qe(S)}.`;
  if (second === "artifacts") return `Start with how you checked your result against ${A}, then show ${withArticle(lowerFirst(S))} you produced along the way.`;
  return `Start with how you checked your result against ${A}, then add one thing the comparison taught you.`;
}

function artifactOfEn(core: string, td: string, i: number): string | null {
  return rotate((domainOfEn(core, td)?.artifacts ?? []).filter((x) => !OFF_EN.test(x)), i);
}
function verifyOfEn(core: string, td: string, i: number): string | null {
  return rotate((domainOfEn(core, td)?.verify_targets ?? []).filter((x) => !OFF_EN.test(x)), i);
}

function interviewPrepEn(core: string, items: PostingItem[], exps: Experience[], max: number): InterviewPrep[] {
  const withDomain = items.filter((it): it is PostingItem & { domain: string } => !!it.domain);
  const picked = [
    ...withDomain.filter((it) => it.kind === "must"),
    ...withDomain.filter((it) => it.kind !== "must"),
  ].slice(0, max);
  const usedTpl = new Set<string>();
  const usedQ = new Set<string>();
  const usedExp = new Set<string>();
  const useN = new Map<string, number>();
  const usedNear = new Set<string>();
  let h = 0;
  const out: InterviewPrep[] = [];
  for (const it of picked) {
    const d = domainOfEn(core, it.domain);
    const area = areaEn(core, it.domain);
    const req = quote(it.text, 60);
    const prefer: Axis[] = [
      ...(isAxis(it.axis) ? [it.axis] : []),
      ...((d?.required_axes ?? []).filter(isAxis)),
      ...FALLBACK,
    ];
    let axis: Axis = prefer[0];
    let question = "";
    outer: for (const ax of [...new Set(prefer)]) {
      for (let v = 0; v < 2; v += 1) {
        const k = `${ax}:${v}`;
        const s = ASK_EN[ax][v](req, area.toLowerCase());
        if (usedTpl.has(k) || usedQ.has(s)) continue;
        usedTpl.add(k); usedQ.add(s);
        axis = ax; question = s;
        break outer;
      }
    }
    if (!question) continue;
    const mine = exps.filter((e) => e.td_codes.includes(it.domain));
    const exp = pickExperience(mine, axis, usedExp);
    let frame: string | null = null;
    let honest: string | null = null;
    if (exp) {
      usedExp.add(exp.id);
      const u = useN.get(exp.id) ?? 0;
      useN.set(exp.id, u + 1);
      const kinds = LEAD[axis].filter((k) => (exp[k] ?? []).length > 0);
      if (kinds.length) {
        const lv = rotate(exp[kinds[0]], u) ?? "";
        const sk = kinds[1] ?? null;
        frame = frameLineEn(kinds[0], lv, sk, sk ? rotate(exp[sk], u) ?? "" : "");
      } else {
        frame = "This experience doesn't have anything picked yet for what you decided, produced or compared. "
          + "Fill in even one of those and you'll have something concrete to say.";
      }
    } else if (it.status === "empty") {
      const art = artifactOfEn(core, it.domain, taskIndex(items, it));
      const near = exps.find((e) => e.axis_codes.includes(axis) && !usedNear.has(e.id))
        ?? exps.find((e) => e.axis_codes.includes(axis)) ?? null;
      const any = rotate(exps, h);
      if (near) usedNear.add(near.id);
      const nearLine = near
        ? `bring up ${qe(near.title)}, where you did the ${axisEn(axis).toLowerCase()} part in another area, as the closest thing`
        : any
          ? `pick the moment in ${qe(any.title)} closest to this question`
          : "pick the closest thing you've done in a class or assignment";
      const open = h % 2 === 0
        ? "Start honestly: \"I haven't done this work directly yet.\""
        : "Say plainly that you haven't done this exact work yet.";
      const close = !art ? "If you're preparing something now, finish with that."
        : h % 2 === 0
          ? `If you've started on ${lowerFirst(art)} this week, finish with that.`
          : `If you're working on ${lowerFirst(art)} now, finish with how far you've got.`;
      honest = `${open} Then ${nearLine}. ${close}`;
      h += 1;
    } else {
      honest = "Your assessment says you've done work in this area, but you haven't written it up as an experience yet. "
        + "Add it, and we'll build an answer outline from its title and what you decided.";
    }
    out.push({
      text: it.text, kind: it.kind, domain: it.domain, axis, status: it.status,
      question, experience: exp ? { id: exp.id, title: exp.title } : null, frame, honest,
    });
  }
  return out;
}

function smallTasksEn(core: string, items: PostingItem[], exps: Experience[]): SmallTask[] {
  const out: SmallTask[] = [];
  const seen = new Map<string, number>();
  for (const it of items) {
    if (it.kind !== "must" || !it.domain) continue;
    if (it.status !== "empty" && it.status !== "partial") continue;
    const n = seen.get(it.domain) ?? 0;
    seen.set(it.domain, n + 1);
    const art = artifactOfEn(core, it.domain, n);
    const ver = verifyOfEn(core, it.domain, n);
    if (!art || !ver) continue;
    const area = areaEn(core, it.domain);
    const A = lowerFirst(art);
    const V = lowerFirst(ver);
    const exp = exps.find((e) => e.td_codes.includes(it.domain!)
      && (!it.evidence.length || it.evidence.includes(e.title))) ?? null;
    let task: string;
    let artifact = art;
    if (it.status === "empty") {
      task = `${area}: take one past assignment or class project and put together ${withArticle(A)} for it, then note whether it holds up against ${V}.`;
    } else if (exp && !exp.artifacts.length) {
      task = `${area}: from what ${qe(exp.title)} left you, put together ${withArticle(A)} and write one line on how it compares with ${V}.`;
    } else if (exp && !exp.verifications.length) {
      artifact = exp.artifacts[0];
      task = `${area}: compare ${lowerFirst(artifact)} from ${qe(exp.title)} with ${V}, and write one line each on what matches and what doesn't.`;
    } else if (exp) {
      const dd = domainOfEn(core, it.domain);
      const order = [...new Set([...(dd?.required_axes ?? []).filter(isAxis), ...FALLBACK])];
      const ax = isAxis(it.axis) ? it.axis : rotate(order.filter((a) => !exp.axis_codes.includes(a)), n);
      const l2 = ax ? dd?.axes?.[ax]?.l2 : undefined;
      task = l2
        ? `${area}: reopen ${qe(exp.title)} and look for anything that counts as ${qe(bare(l2))}. If you find it, write it up as ${withArticle(A)} and check it against ${V}.`
        : `${area}: pick one thing you decided in ${qe(exp.title)}, write it up with your reasoning as ${withArticle(A)}, and check it against ${V}.`;
    } else {
      task = `${area}: write up one thing you said you'd done in the assessment as an experience, and attach ${withArticle(A)} from it, checked against ${V}.`;
    }
    out.push({
      text: it.text, domain: it.domain, axis: isAxis(it.axis) ? it.axis : null,
      status: it.status, task, artifact, verify: ver,
    });
  }
  return out;
}

const axisEn = (a: Axis) => axisName(a, "en");
