/**
 * 문장을 만드는 작은 도구와 코드 → 말 표.
 *
 * 문장의 주어는 학생이거나 학생이 한 일이다. 측정 쪽 이름은 이름표로만 쓴다.
 * 사실은 `~입니다` · `~합니다`, 까닭은 `~이에요` · `~해요`, 할 일은 `~해 보세요` 로 맺어
 * 한 문단이 `…니다.` 로만 이어지지 않게 한다(docs/metri/report-writing-rules.md 3절).
 * 조사는 앞말의 받침을 보고 고른다.
 */
import type { Axis } from "../scoring/types";
import type { Action, Gap } from "../result/model";
import { withJosa } from "../result/josa";
import type { DomainDef } from "./types";
import { STEP_WORD, ZONE_WORD } from "./derive";

export const j = withJosa;

/** ‘A와 B’ · ‘A, B와 C’ 를 받침 보고 잇는다 */
export function andJoin(xs: string[]): string {
  const ys = xs.filter(Boolean);
  if (ys.length <= 1) return ys[0] ?? "";
  /* 항목 안에 이미 ‘과/와’가 있으면(목표와 지표 표) 또 ‘와’로 이으면 경계가 안 보인다 */
  if (ys.some((y) => /[과와] /.test(y))) return ys.join(", ");
  if (ys.length === 2) return `${j(ys[0], "과와")} ${ys[1]}`;
  return `${ys.slice(0, -2).join(", ")}, ${j(ys[ys.length - 2], "과와")} ${ys[ys.length - 1]}`;
}
export function orJoin(xs: string[]): string {
  const ys = xs.filter(Boolean);
  if (ys.length <= 1) return ys[0] ?? "";
  return `${ys.slice(0, -1).map((y) => j(y, "이나")).join(" ")} ${ys[ys.length - 1]}`;
}
export const dot = (xs: string[]) => xs.filter(Boolean).join(" · ");
export const q = (s: string) => `‘${s.replace(/^‘|’$/g, "")}’`;
/** 따옴표로 감싸고 조사를 붙인다: ‘강점 영역’이 */
const quoteJ = (s: string, pair: Parameters<typeof withJosa>[1]) => `‘${s}’${withJosa(s, pair).slice(s.length)}`;
/** 셋까지는 인용하고 나머지는 수로 */
export function list3(xs: string[]): string {
  if (!xs.length) return "";
  if (xs.length <= 3) return xs.map(q).join(", ");
  return `${xs.slice(0, 3).map(q).join(", ")} 외 ${xs.length - 3}개`;
}

/** 축마다 할 일 문장에 넣는 이름씨 구 */
export const AXIS_NEED: Record<Axis, string> = {
  J1: "풀 문제의 범위 정하기", J2: "받은 요구를 조건으로 옮기기", J3: "기준과 값 직접 정하기", J4: "방법과 도구 고르기",
  J5: "결과물 남기기", J6: "결과를 기준과 비교하기", J7: "어긋난 까닭 찾고 고치기", J8: "결과가 다음 결정에 쓰이게 하기",
};

export const GAP_KIND: Record<Gap["kind"], string> = {
  REQUIRED_AXIS: "꼭 필요한 판단인데 해 본 장면이 아직 나오지 않았습니다",
  OUTPUT: "해 본 일을 보여 줄 결과물을 아직 고르지 않았습니다",
  OUTPUT_EVIDENCE: "결과물을 남겼다고 답했고, 어떤 결과물인지는 아직 고르지 않았습니다",
  VERIFICATION: "결과를 무엇과 맞춰 봤는지가 아직 적혀 있지 않습니다",
  AXIS: "이 판단을 직접 해 본 장면이 아직 나오지 않았습니다",
  PARTIAL_EVIDENCE: "해 본 일은 보이고, 직접 정했다고 말하려면 근거가 하나 더 필요합니다",
};
/** 왜 그 자리가 필요한지. 앞 문장(GAP_KIND)이 `…니다` 로 끝나므로 여기는 `…이에요` 로 맺는다 */
export const GAP_WHY: Record<Gap["why"], string> = {
  REQUIRED_FOR_DOMAIN: "이 영역 일을 맡으면 거의 늘 하게 되는 판단이에요",
  BLOCKS_EVIDENCE: `여기까지 채우면 이 영역이 ${quoteJ(ZONE_WORD.Z1_EVIDENCE_ESTABLISHED.tag, "이가")} 돼요`,
  NEEDED_BY_INDUSTRY: "고르신 산업에서 눈여겨보는 판단이에요",
  NEEDED_BY_ROLE: "고르신 직무에서 눈여겨보는 판단이에요",
};
/** 반쯤 선 판단은 영역이 들어간 자리를 바꾸지 않는다. 채우면 단계가 올라간다 */
export const gapWhy = (g: Pick<Gap, "kind" | "why">) =>
  g.kind === "PARTIAL_EVIDENCE" ? `근거를 하나 더 붙이면 ${quoteJ(STEP_WORD[3].tag, "으로")} 올라가요` : GAP_WHY[g.why];
export const HORIZON_DAYS: Record<Action["horizon"], string> = { NOW: "30일", NEXT: "60일", LATER: "90일" };

/** 할 일의 짧은 이름(표와 간트 칸) */
export function actionHead(a: Action, dn: string): string {
  const ax = a.axis ? AXIS_NEED[a.axis] : "";
  switch (a.code) {
    case "BUILD_OUTPUT": return `${dn} 결과물 한 벌 남기기`;
    case "ADD_VERIFICATION": return `${dn} 결과를 기준과 비교하기`;
    case "FILL_AXIS": return ax ? `${dn}에서 ${ax}` : `${dn}에서 한 가지 직접 정하기`;
    case "DEEPEN_OWNERSHIP": return `${dn}에서 직접 정한 것 적기`;
    case "TRY_SHORT_EXPERIENCE": return `${dn} 짧게 해 보기`;
    case "STUDY_NEXT": return `${dn} 수업 하나 듣고 써 보기`;
    case "RECHECK_DIRECTION": return `${j(dn, "을를")} 계속할지 정하기`;
    case "EXPLORE_BROADLY": return "관심 영역 하나 짧게 해 보기";
    case "WRITE_UP": return `${dn} 경험 한 쪽으로 정리하기`;
  }
}

/** 할 일 한 문장. 재료는 그 영역의 자료에서 온다 */
export function actionLine(a: Action, dn: string, def: DomainDef | undefined): string {
  const mt = a.material;
  const art = (mt.artifacts.length ? mt.artifacts : mt.workflow?.output ? [mt.workflow.output] : def?.artifacts ?? []).slice(0, 2);
  const vt = (mt.verify_targets.length ? mt.verify_targets : def?.verify_targets ?? []).slice(0, 2);
  const l2 = a.axis ? def?.axes?.[a.axis]?.l2 : "";
  switch (a.code) {
    case "BUILD_OUTPUT":
      return art.length
        ? `다음 ${dn} 과제는 끝까지 해서 ${j(orJoin(art), "을를")} 남기고, 왜 그렇게 정했는지 한 줄 붙여 보세요.`
        : `다음 ${dn} 과제에서 정한 내용을 문서 한 장으로 남겨 보세요.`;
    case "ADD_VERIFICATION":
      return vt.length
        ? `${dn}에서 낸 결과를 ${j(orJoin(vt), "과와")} 나란히 놓고, 차이와 그 까닭을 표 한 장에 적어 보세요.`
        : `${dn}에서 낸 결과를 기준값과 나란히 놓은 표 한 장을 만들어 보세요.`;
    case "FILL_AXIS":
      return l2
        ? `다음 ${dn} 과제에서 ${q(l2)} 같은 일을 직접 맡고, 고른 까닭을 한 줄 적어 보세요.`
        : `다음 ${dn} 과제에서 ${j(a.axis ? AXIS_NEED[a.axis] : "한 가지", "을를")} 직접 맡아 보세요.`;
    case "DEEPEN_OWNERSHIP":
      return l2
        ? `이미 해 본 ${dn} 과제에서 ${q(l2)}에 해당하는 일을 떠올려, 그때 직접 정한 것을 세 줄로 적어 보세요.`
        : `이미 해 본 ${dn} 과제에서 직접 정한 것을 세 줄로 적어 보세요.`;
    case "TRY_SHORT_EXPERIENCE":
      return `${j(dn, "을를")} 다루는 짧은 과제나 스터디 하나를 해 보고, 한 일과 직접 정한 것을 다섯 줄로 적어 보세요.`;
    case "STUDY_NEXT":
      return `${dn} 수업이나 교육을 하나 듣고, 배운 것을 작은 과제에 한 번 써 본 뒤 손에 남은 것을 적어 보세요.`;
    case "RECHECK_DIRECTION":
      return `${j(dn, "을를")} 앞으로도 진로로 둘지 정하고, 그 까닭을 한 줄 적어 보세요.`;
    case "EXPLORE_BROADLY":
      return "관심이 높게 나온 영역 하나를 골라 수업이나 교내 과제로 짧게 해 보고, 무엇을 했고 무엇을 정했는지 다섯 줄로 적어 보세요.";
    case "WRITE_UP": {
      const ch = mt.chain ?? [];
      return ch.length
        ? `${dn} 경험 하나를 골라 ${ch.join(", ")} 차례로 한 쪽에 정리해 보세요.`
        : `${dn} 경험 하나를 골라 무엇을 정했고 그 결과가 어디에 쓰였는지 한 쪽으로 정리해 보세요.`;
    }
  }
}

/** 할 일을 끝냈을 때 손에 남는 것 */
export function actionOutput(a: Action, def: DomainDef | undefined): string {
  const mt = a.material;
  const art = mt.artifacts[0] ?? mt.workflow?.output ?? def?.artifacts[0] ?? "결과 문서";
  switch (a.code) {
    case "BUILD_OUTPUT": return art;
    case "ADD_VERIFICATION": return "비교표 한 장";
    case "FILL_AXIS": return `${j(art, "과와")} 고른 까닭 한 줄`;
    case "DEEPEN_OWNERSHIP": return "직접 정한 것 세 줄";
    case "TRY_SHORT_EXPERIENCE": return "한 일 다섯 줄 기록";
    case "STUDY_NEXT": return "과제 하나와 배운 것 기록";
    case "RECHECK_DIRECTION": return "계속할지 정한 까닭 한 줄";
    case "EXPLORE_BROADLY": return "한 일 다섯 줄 기록";
    case "WRITE_UP": return "경험 정리 한 쪽";
  }
}

/* ── 사전의 `~한다` 문장을 책의 말투로 ─────────────────────────────── */
const H0 = 0xac00;
const isSyl = (c: string) => { const k = c.charCodeAt(0); return k >= H0 && k <= 0xd7a3; };
const jong = (c: string) => (c.charCodeAt(0) - H0) % 28;
const setJong = (c: string, jg: number) => String.fromCharCode(c.charCodeAt(0) - jong(c) + jg);

/** `확정한다` → `정합니다` · `있다` → `있습니다` · `경로이다` → `경로입니다` */
export function polite(s0: string): string {
  return plainVerb(politeRaw(s0));
}
function politeRaw(s0: string): string {
  const s = s0.trim().replace(/[.。]$/, "");
  if (!s.endsWith("다") || s.length < 2) return s ? `${s}.` : s;
  if (/아니다$/.test(s)) return `${s.slice(0, -3)}아닙니다.`;
  if (/(니다|습니다)$/.test(s)) return `${s}.`;
  if (s.endsWith("이다") && s.length > 2) return `${s.slice(0, -2)}입니다.`;
  if (s.endsWith("는다")) return `${s.slice(0, -2)}습니다.`;
  const prev = s[s.length - 2];
  /* 따옴표나 괄호 뒤의 `다` 는 이름씨에서 `이` 가 빠진 꼴이다(‘어느 계정인가’다) */
  if (/[’'"”)\]」』]/.test(prev)) return `${s.slice(0, -1)}입니다.`;
  if (!isSyl(prev)) return `${s}.`;
  const jg = jong(prev);
  if (jg === 4) return `${s.slice(0, -2)}${setJong(prev, 17)}니다.`;
  /* ㄹ 받침 줄기는 ㄹ 이 빠진다(드물다 → 드뭅니다) */
  if (jg === 8) return `${s.slice(0, -2)}${setJong(prev, 17)}니다.`;
  if (jg === 0) {
    /* 받침 없는 글자 + `다` 는 형용사 줄기(다르다 · 크다)이거나 이름씨에서 `이` 가
       빠진 꼴(자리다 · 근거다)이다. 한다체에서 움직씨는 늘 `~ㄴ다` 로 오므로
       나머지는 이름씨로 읽는다. 이름씨에 `ㅂ니다` 를 붙이면 `자립니다` 가 된다 */
    const stem = s.slice(0, -1);
    if (ADJ_LAST.has(prev) || ADJ_STEM.some((a) => stem.endsWith(a))) return `${s.slice(0, -2)}${setJong(prev, 17)}니다.`;
    return `${stem}입니다.`;
  }
  return `${s.slice(0, -1)}습니다.`;
}
/**
 * 사전 문장에 섞인 설계 문서 동사를 학생에게 하는 말로 바꾼다
 * (확정합니다 · 세웁니다 · 가릅니다 · 견줍니다 · 섭니다, docs/metri/report-writing-rules.md 3절).
 * 사전은 고치지 않고 책에 옮길 때만 바꾼다
 */
const plainVerb = (s: string) => s
  .replace(/확정합니다/g, "정합니다")
  .replace(/(^|\s)세웁니다/g, "$1정합니다")
  .replace(/(지|자기가|직접|스스로) 가릅니다/g, "$1 정합니다")
  .replace(/(^|\s)가릅니다/g, "$1가려냅니다")
  .replace(/견줍니다/g, "비교합니다")
  .replace(/(^|\s)안 섭니다/g, "$1서지 않습니다")
  .replace(/(^|\s)섭니다/g, "$1서 있습니다")
  .replace(/(^|\s)끊습니다/g, "$1멈춥니다");
/** 받침 없이 끝나는 형용사 줄기의 끝 글자 · 낱말 */
const ADJ_LAST = new Set([..."하르크쁘프싸짜쓰되"]);
const ADJ_STEM = ["느리", "흐리", "더디", "어리", "여리", "나쁘", "기쁘", "바쁘", "예쁘", "아프"];

/** 여러 문장짜리 `~다.` 문단을 문장마다 높임으로 나눈다. 목록(`ul`)에 한 줄씩 넣을 때 쓴다 */
export const politeList = (s0: string) => s0.trim().split(/(?<=다\.)\s+/).filter(Boolean).map(polite);

/**
 * 여러 문장짜리 `~다.` 문단을 문장마다 높임으로. `…니다.` 가 세 번 이어지는 자리는
 * 셋째 문장을 `…요.` 로 바꿔 끊는다(바꿀 꼴을 모르면 그대로 둔다)
 */
export const politePara = (s0: string) => {
  let run = 0;
  return politeList(s0).map((t) => {
    if (!/니다\.$/.test(t)) { run = 0; return t; }
    if (++run < 3) return t;
    const y = yo(t);
    if (y) run = 0;
    return y ?? t;
  }).join(" ");
};

/** `…니다.` 한 문장을 `…요.` 로. 확실한 꼴만 바꾸고 나머지는 null */
export function yo(t: string): string | null {
  const m = /^([\s\S]*?)(입니다|합니다|됩니다|있습니다|없습니다|않습니다|갑니다|봅니다|줍니다|납니다|옵니다)\.$/.exec(t.trim());
  if (!m) return null;
  const [, head, end] = m;
  if (end === "입니다") {
    const last = head[head.length - 1];
    if (!last || !isSyl(last)) return null;
    return `${head}${jong(last) ? "이에요" : "예요"}.`;
  }
  const to: Record<string, string> = { 합니다: "해요", 됩니다: "돼요", 있습니다: "있어요", 없습니다: "없어요", 않습니다: "않아요", 갑니다: "가요", 봅니다: "봐요", 줍니다: "줘요", 납니다: "나요", 옵니다: "와요" };
  return `${head}${to[end]}.`;
}

/** `확정한다` → `확정하는` (뒤에 `일` 을 붙여 쓴다) */
export function adnominal(s0: string): string {
  const s = s0.trim().replace(/[.。]$/, "");
  if (!s.endsWith("다") || s.length < 2) return s;
  if (s.endsWith("이다")) return `${s.slice(0, -2)}인`;
  if (s.endsWith("는다")) return `${s.slice(0, -2)}는`;
  const prev = s[s.length - 2];
  if (isSyl(prev) && jong(prev) === 4) return `${s.slice(0, -2)}${setJong(prev, 0)}는`;
  return `${s.slice(0, -1)}는`;
}

/** 산업팩의 판단 이름(`~는가`)을 문장 안에 넣는 꼴(`~는지`)로 */
export const askNoun = (x: string) => x.trim().replace(/는가$/, "는지").replace(/인가$/, "인지").replace(/한가$/, "한지").replace(/ㄴ가$/, "ㄴ지");

/** 이름씨로 끝나면 `~입니다`, `~다` 로 끝나면 책의 말투로 */
export function asSentence(s0: string): string {
  const s = s0.trim().replace(/[.。]$/, "");
  if (/다$/.test(s)) return polite(s);
  return `${s}입니다.`;
}

/**
 * 사전과 공개 자료에서 옮긴 문장 가운데 책에 싣지 않을 꼴. 직무 안내 검사의 쓰지 않는 말과
 * `A가 아니라 B` 대구다. 걸리는 문장은 고쳐 쓰지 않고 그 자리를 비우거나 다른 줄을 쓴다.
 * `최적화` 는 기술 용어(구조 최적화)라 막지 않고 `최적화된` 만 막는다.
 */
const CONTENT_BAD = [/아니라/, /다양한/, /효과적으로/, /역량을 강화/, /핵심은/, /중요합니다/, /[을를] 통해/, /결국/, /혁신[적]/, /획기[적]/,
  /견줍니다/, /섭니다/, /세웠습니다/, /가지고 있/, /되어진/, /시너지/, /인사이트/, /차별화된/, /최적화된/, /이유(?:다|입니다)/];
export const okText = (s: string | null | undefined): s is string => !!s && !CONTENT_BAD.some((r) => r.test(s));
export const okOr = (s: string | null | undefined, alt = "") => (okText(s) ? s : alt);

/** 원문 인용을 앞에서부터 자른다. 싣지 않을 꼴이 나오기 전 문장에서 끊고, 남는 것이 짧으면 싣지 않는다 */
export function cutQuote(s: string, max: number): string | null {
  let end = s.length;
  for (const r of CONTENT_BAD) { const m = r.exec(s); if (m && m.index < end) end = m.index; }
  let t = s.slice(0, Math.min(end, max));
  if (end < s.length || t.length < s.length) {
    const stop = Math.max(t.lastIndexOf("다. "), t.lastIndexOf("다."), t.lastIndexOf("니다"));
    if (stop > 60) t = t.slice(0, stop + 2);
    else if (end < max) return null;
    else t = `${t.trimEnd()}…`;
  }
  return t.length >= 60 ? t : null;
}
