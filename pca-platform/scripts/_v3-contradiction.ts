/**
 * 결과 화면 · PDF 의 **모순 판정 규칙**(2026-11-03 대표 "결과 화면과 PDF 에서 서로 부딪치는 말을 자동으로 잡아라").
 *
 * 글자만 받는다. 어디서 온 글인지(웹 `/v3/N/result` · 종이 PDF · 책 HTML)는 부르는 쪽이 정하고,
 * 응답 사실(고른 항목 수 · 적은 문장 수 · 더한 경험 수 · 직접 정했다는 답 수)도 부르는 쪽이 DB 에서 세어 넘긴다.
 * **제품 코드를 읽지 않는다**: 결과 문장을 만드는 함수로 판정하면 같은 실수를 같이 한다.
 *
 * 규칙 번호는 대표가 준 차례 그대로다(R1~R9). R6(J1) 과 R8(날짜) 은 DB 와 서버 함수가 필요해
 * `v3-common-check.ts` 가 직접 본다. 여기 있는 것은 글자로 판정할 수 있는 것뿐이다.
 *
 * 걸린 자리는 **실제 문장**으로 돌려준다. `R4 3곳` 만 적으면 고치는 사람이 다시 찾아야 한다.
 */

export type Facts = {
  /** 체크리스트에서 고른 항목 수(v3_evidence_picks) */
  picks: number;
  /** 직접 적은 문장 수(번역 · 판단 덧말) */
  notes: number;
  /** 내 CareerMatri 에 더한 경험 수(v3_experiences) */
  experiences: number;
  /** 판단 문항에 `내가 정함`(가장 높은 단계)으로 답한 수 */
  ownDecided: number;
};

export type Hit = { rule: string; sentence: string; warn?: boolean };

/** 문장 하나로 자른다. 걸린 자리를 보여 줄 때 앞뒤를 너무 길게 싣지 않는다 */
export function sentenceAt(text: string, at: number, len = 0): string {
  const L = Math.max(text.lastIndexOf("\n", at), text.lastIndexOf(". ", at), text.lastIndexOf("다.", at) + 1, at - 90);
  let R = at + len;
  const stops = ["\n", ". ", "다.", "요."].map((s) => { const i = text.indexOf(s, at + len); return i < 0 ? Infinity : i + s.length; });
  R = Math.min(...stops, at + len + 110);
  return text.slice(Math.max(0, L), R).replace(/\s+/g, " ").trim();
}

/** 덩이(카드 · 문단 · 쪽의 몇 줄)로 나눈 글. 부르는 쪽이 만들어 넘기고, 없으면 빈 줄로 나눈다 */
export function blocksOf(text: string): string[] {
  return text.split(/\n\s*\n/).map((b) => b.replace(/[ \t]+/g, " ").trim()).filter(Boolean);
}

/* ── R1 같은 항목의 자기모순 ───────────────────────────────────────── */
/**
 * 한 덩이 안에 `아직 (…) 고르지 않았다` 와 `고른 항목: …`(목록이 붙은 것) 또는 `직접 만들어 봤다` 가 같이 선다.
 * 고른 것이 있다고 적고 고르지 않았다고 적거나, 만들어 봤다고 적고 아직 고르지 않았다고 적는 자리다
 * (고려대 실제 화면 N1 · 운영 결과지 v3/18~20 의 꼴).
 */
export function r1(blocks: string[]): Hit[] {
  const out: Hit[] = [];
  for (const b of blocks) {
    const no = /아직[^.。\n]{0,40}고르지 않/.exec(b);
    if (!no) continue;
    const picked = /고른 항목\s*[:：]\s*[^\s없]/.exec(b) ?? /고른 항목 \d+개/.exec(b);
    const made = /직접 만들어 봤/.exec(b);
    if (picked || made) {
      out.push({ rule: "R1", sentence: [sentenceAt(b, no.index, no[0].length), picked ? sentenceAt(b, picked.index, picked[0].length) : "", made ? sentenceAt(b, made.index, made[0].length) : ""].filter(Boolean).join(" ⇄ ") });
    }
  }
  return out;
}

/* ── R2 고른 것 · 적은 것 · 직접 정한 것이 없는데 있다고 적음 ──────────── */
const R2_PICK = /(?<!(산업|직무|역할|조직|기관|학과|전공|분야|목표)(으로|로) )고르신(?! (산업|직무|역할|조직|기관|학과|전공|관심|분야|목표|등급|과정|보기|답))|고른 항목\s*[:：]\s*[^\s없]|고른 항목 [1-9]\d*개/g;
const R2_NOTE = /적어 두셨|적어 주신 (문장|말|내용)|직접 쓰신/g;
/* `기준을 직접 정했다고 답했고 …` 는 단계 읽는 법(범례)에도 서므로 세지 않는다. 학생에게 말을 거는 꼴만 */
/* `직접 정하셨습니까?`(스스로 묻기)는 묻는 말이라 지나간다 */
const R2_OWN = /직접 정한 것이 보입니다|직접 정하셨(?!습니까|나요|는지|을까)|직접 정했다고 답하셨/g;
export function r2(text: string, f: Facts): Hit[] {
  const out: Hit[] = [];
  const scan = (re: RegExp, why: string) => {
    for (const m of text.matchAll(re)) out.push({ rule: "R2", sentence: `[${why}] ${sentenceAt(text, m.index ?? 0, m[0].length)}` });
  };
  if (f.picks === 0) scan(R2_PICK, "고른 항목 0");
  if (f.notes === 0 && f.experiences === 0) scan(R2_NOTE, "적은 문장 0");
  if (f.ownDecided === 0) scan(R2_OWN, "직접 정함 답 0");
  return out;
}

/* ── R3 더한 경험이 없는데 더했다고 적음 ─────────────────────────────── */
/** 부정(`더한 적이 없어`)과 조건(`더하면`)은 지나간다. 더했다는 사실을 말하는 꼴만 센다 */
const R3 = /새 경험을 더했(고|습니다|어요|으니)|경험을 더한 뒤(?!에는? 바뀝)|경험을 더해 (갱신|바뀐|달라진)|더해 주신 경험/g;
export function r3(text: string, f: Facts): Hit[] {
  if (f.experiences > 0) return [];
  return [...text.matchAll(R3)].map((m) => ({ rule: "R3", sentence: `[더한 경험 0] ${sentenceAt(text, m.index ?? 0, m[0].length)}` }));
}

/* ── R4 조사(일반 규칙) ──────────────────────────────────────────────── */
/**
 * 받침을 보고 붙였는가. **조사일 수밖에 없는 모양만** 센다(`v3-result-copy-check.ts` 와 같은 방침):
 * 받침 없는 말 + `은 · 을 · 이나 · 으로 · 이라`, 받침 있는 말 + `는 · 를 · 와 · 라는 · 로서`.
 * `가 · 이 · 과` 는 조사가 아닌 자리가 더 많아(평**가** · 아**이** · 효**과**) 세지 않는다.
 * 뒤가 띄어쓰기 · 문장부호 · 끝일 때만 본다(말 한가운데는 조사가 아니다).
 */
const JONG = (ch: string): number => { const c = ch.charCodeAt(0); return c >= 0xac00 && c <= 0xd7a3 ? (c - 0xac00) % 28 : -1; };
const END = String.raw`(?=[\s,.·:;)\]’”」』!?]|$)`;
const R4_RULES: { re: RegExp; bad: (j: number) => boolean; fix: (w: string) => string }[] = [
  { re: new RegExp(String.raw`([가-힣]{1,12})(은)${END}`, "g"), bad: (j) => j === 0, fix: () => "는" },
  { re: new RegExp(String.raw`([가-힣]{1,12})(을)${END}`, "g"), bad: (j) => j === 0, fix: () => "를" },
  { re: new RegExp(String.raw`([가-힣]{1,12})(이나)${END}`, "g"), bad: (j) => j === 0, fix: () => "나" },
  { re: new RegExp(String.raw`([가-힣]{1,12})(으로)${END}`, "g"), bad: (j) => j === 0 || j === 8, fix: () => "로" },
  { re: new RegExp(String.raw`([가-힣]{1,12})(를)${END}`, "g"), bad: (j) => j > 0, fix: () => "을" },
  { re: new RegExp(String.raw`([가-힣]{1,12})(와)${END}`, "g"), bad: (j) => j > 0, fix: () => "과" },
];
/** 조사가 아니라 말의 한 조각인 낱말(관형형 말끝 · 원래 그 글자로 끝나는 낱말) */
const R4_NOT_JOSA = new Set(["모을", "모은", "이은", "이을", "지은", "지을", "그은", "그을", "나은", "나을", "부은", "부을", "저은", "저을", "마을", "가을", "고을", "기울", "노을", "다를", "모를", "부를", "고를", "자를", "흐를", "오를", "이를", "따를", "기를", "누를", "가를", "거를", "바를", "나를", "너를", "저를", "우리를",
  "그와", "그리고와", "어와", "기와", "개와", "하이브리드와",
  "이으로", "사이으로"]);
export function r4(text: string): Hit[] {
  const out: Hit[] = [];
  for (const { re, bad, fix } of R4_RULES) {
    for (const m of text.matchAll(re)) {
      const word = m[1], josa = m[2];
      const whole = word + josa;
      /* 두 글자 낱말(`모은 · 이은 · 마을`)은 앞에 무엇이 붙어 있어도 거른다: 칸과 칸 사이에 띄어쓰기 없이 글자가 이어
         읽히는 자리(`필요한 자료` + `모은 예문`)가 있다. 한 글자 대명사(`나를`)는 낱말 경계를 본다 */
      if ([...R4_NOT_JOSA].some((w) => whole.endsWith(w) && (w.length >= 2 || whole.length === w.length || !/[가-힣]/.test(whole[whole.length - w.length - 1] ?? "")))) continue;
      /* 회사 이름 목록(`(유)해은 · 건파워 · …`)의 한 칸은 조사가 아니다: 앞뒤가 `·` 나 괄호로 끊긴 낱말 하나 */
      const at = m.index ?? 0;
      const before = text.slice(Math.max(0, at - 3), at), after = text.slice(at + whole.length, at + whole.length + 3);
      if ((/[·)(]\s*$|^\s*$/.test(before) || at === 0) && /^\s*[·(]/.test(after)) continue;
      if (/[)(]$/.test(before)) continue;
      /* `를` · `을` 앞이 한 글자뿐인 대명사 · 동사(`나를 · 이를 · 다를`)는 위 목록이 거른다. 나머지는 끝 글자의 받침으로 */
      const j = JONG(word[word.length - 1]);
      if (j < 0 || !bad(j)) continue;
      /* 동사 관형형 `-ㄴ · -ㄹ` 을 조사로 읽지 않는다: `~하는 을` 같은 꼴은 없고, 받침 없는 말 + `은/을` 은 거의 조사다.
         다만 `-기를`(바라기를) · `-음을` 같은 꼴은 받침이 맞으므로 여기 오지 않는다 */
      out.push({ rule: "R4", sentence: `${whole} → ${word}${fix(word)} · ${sentenceAt(text, m.index ?? 0, whole.length)}` });
    }
  }
  return out;
}

/* ── R5 안쪽 글 · 코드 · 엔티티 ─────────────────────────────────────── */
const R5: { re: RegExp; why: string }[] = [
  { re: /채우는 중/g, why: "만드는 쪽 말" },
  { re: /학교\s*[·/]\s*기관\s*소재지\s*기준/g, why: "둘 중 하나를 고르지 않은 안쪽 문구" },
  { re: /\b[A-Z][A-Z0-9]{1,8}_[A-Z0-9][A-Z0-9_]*/g, why: "내부 코드" },
  { re: /\b(TD|RF|OC)\d{2}\b|\bTD\d\b/g, why: "내부 영역 코드" },
  { re: /&(amp|lt|gt|quot|apos|nbsp|#\d{1,5}|#x[0-9a-f]{1,4});/gi, why: "HTML 엔티티가 글자로" },
  { re: /\bundefined\b|\bNaN\b|\[object Object\]|\{[a-z_]{1,12}\}/g, why: "값이 비어 그대로 나간 자리" },
];
export function r5(text: string): Hit[] {
  const out: Hit[] = [];
  for (const { re, why } of R5) {
    for (const m of text.matchAll(re)) out.push({ rule: "R5", sentence: `[${why}] ${m[0]} · ${sentenceAt(text, m.index ?? 0, m[0].length)}` });
  }
  return out;
}

/* ── R7 웹과 종이의 수 ─────────────────────────────────────────────── */
/**
 * 같은 이름표에 붙은 수를 웹과 종이에서 모아 견준다. 이름표가 양쪽에 다 있는데 **겹치는 값이 하나도 없으면** 걸린다
 * (한쪽이 여러 값을 들 수 있다: 영역마다 다른 수가 붙는 자리).
 */
const R7_LABELS: { key: string; re: RegExp }[] = [
  { key: "기업 수", re: /(?:기업|회사)\s*(\d{1,4})\s*곳|(\d{1,4})\s*곳의?\s*(?:기업|회사)/g },
  { key: "기관 수", re: /기관\s*(\d{1,4})\s*곳|(\d{1,4})\s*곳의?\s*기관/g },
  { key: "로드맵 · 할 일 수", re: /(?:로드맵|할 일)[^0-9\n]{0,8}(\d{1,3})\s*(?:가지|개|단계|건)/g },
  { key: "근거가 선 영역 수", re: /근거가 (?:선|선 영역)[^0-9\n]{0,6}(\d{1,2})\s*곳/g },
  { key: "직접 해 본 판단 수", re: /직접 해 본 판단\s*(\d{1,3})\s*(?:개|가지)/g },
  { key: "고른 항목 수", re: /고른 항목\s*(\d{1,3})\s*개/g },
  { key: "결과물 수", re: /결과물\s*(\d{1,3})\s*개/g },
  { key: "경험 기록 수", re: /경험 기록\s*(\d{1,3})\s*건/g },
  { key: "판단까지 물은 영역 수", re: /판단까지 물은 (?:곳|영역)\s*(\d{1,2})\s*곳/g },
];
export function numbersOf(text: string): Map<string, Map<string, string>> {
  const out = new Map<string, Map<string, string>>();
  for (const { key, re } of R7_LABELS) {
    for (const m of text.matchAll(re)) {
      let v = m.slice(1).find((x) => x !== undefined);
      if (!v) continue;
      /* `그 밖에 할 일 3가지` 는 맨 위 `지금 할 한 가지` 를 뺀 수다. 종이의 `할 일 4가지` 와 견주려면 하나를 더한다 */
      if (key === "로드맵 · 할 일 수" && /그 밖에\s*$/.test(text.slice(Math.max(0, (m.index ?? 0) - 6), m.index))) v = String(Number(v) + 1);
      const vals = out.get(key) ?? new Map<string, string>();
      if (!vals.has(v)) vals.set(v, sentenceAt(text, m.index ?? 0, m[0].length));
      out.set(key, vals);
    }
  }
  return out;
}
export function r7(web: string, pdf: string): Hit[] {
  const a = numbersOf(web), b = numbersOf(pdf);
  const out: Hit[] = [];
  for (const [key, va] of a) {
    const vb = b.get(key);
    if (!vb) continue;
    if ([...va.keys()].some((v) => vb.has(v))) continue;
    out.push({ rule: "R7", sentence: `${key}: 웹 ${[...va.keys()].join("·")} ≠ PDF ${[...vb.keys()].join("·")} · 웹 「${[...va.values()][0]}」 · PDF 「${[...vb.values()][0]}」` });
  }
  return out;
}

/* ── R9 AI 투(경고) ────────────────────────────────────────────────── */
/**
 * 대표 반려 기준 셋. **경고로만** 적는다(제품을 막지 않는다):
 *   ① 한 화면에 `아직 ~ 없습니다` 로 시작하는 문장 셋 이상
 *   ② `~하지 않는 것` 꼴 목록 제목
 *   ③ 제목을 되풀이하는 부제(부르는 쪽이 [제목, 부제] 짝을 넘긴다)
 */
export function r9(text: string, headings: string[], pairs: [string, string][]): Hit[] {
  const out: Hit[] = [];
  const sentences = text.split(/(?<=[다요]\.)\s+|\n+/).map((s) => s.trim()).filter(Boolean);
  const yet = sentences.filter((s) => /^아직\s/.test(s) && /없(습니다|어요|다)\.?$/.test(s));
  const uniq = [...new Set(yet)];
  if (uniq.length >= 3) out.push({ rule: "R9", warn: true, sentence: `'아직 ~ 없습니다' ${uniq.length}문장: ${uniq.slice(0, 3).map((s) => `「${s.slice(0, 50)}」`).join(" ")}` });
  for (const h of headings) {
    if (/(하지|되지|쓰지|보지|두지|묻지|넣지) 않는 것\s*$/.test(h.trim())) out.push({ rule: "R9", warn: true, sentence: `'~하지 않는 것' 목록 제목: 「${h.trim().slice(0, 60)}」` });
  }
  const norm = (s: string) => s.replace(/[\s·,.:()‘’“”'"\-—]/g, "");
  const bigrams = (s: string) => { const n = norm(s); const g = new Set<string>(); for (let i = 0; i < n.length - 1; i += 1) g.add(n.slice(i, i + 2)); return g; };
  for (const [t, sub] of pairs) {
    const a = bigrams(t), b = bigrams(sub);
    /* 짧은 제목(`답과 고른 항목`)은 부제가 풀어 쓰면 낱말이 겹칠 수밖에 없다. 여섯 묶음 이상인 제목만 본다 */
    if (a.size < 6 || b.size < 3) continue;
    const inter = [...a].filter((x) => b.has(x)).length;
    /* 제목의 대부분이 부제에 그대로 있다: 부제가 제목을 다시 말한다 */
    if (inter / a.size >= 0.6 || norm(sub).includes(norm(t))) {
      out.push({ rule: "R9", warn: true, sentence: `부제가 제목을 되풀이: 「${t.trim().slice(0, 40)}」 / 「${sub.trim().slice(0, 60)}」` });
    }
  }
  return out;
}

/** 같은 문장이 여러 번 걸리면 한 번만 */
export function dedupe(hits: Hit[]): Hit[] {
  const seen = new Set<string>();
  return hits.filter((h) => { const k = `${h.rule}|${h.sentence}`; if (seen.has(k)) return false; seen.add(k); return true; });
}

/**
 * **규칙이 조용히 아무것도 안 잡는 날을 막는다.** 실제 화면 · PDF 에서 나왔던 문장(KUS v3/20 · SJEPA v3/19 ·
 * PCU v3/18 · JJU v3/24)을 넣어 걸리는지, 멀쩡한 문장을 넣어 지나가는지 본다. 하나라도 어긋나면 점검 전체를 멈춘다.
 */
export function selfTest(): string[] {
  const zero: Facts = { picks: 0, notes: 0, experiences: 0, ownDecided: 0 };
  const some: Facts = { picks: 3, notes: 2, experiences: 1, ownDecided: 2 };
  const want: [string, boolean][] = [
    ["R1 고르지 않음 ⇄ 고른 항목", r1(["가장 많이 해 본 영역 결과물을 체크리스트에서 아직 고르지 않았습니다. 고른 항목: 시험 계획서, 결과 보고서"]).length > 0],
    ["R1 고르지 않음 ⇄ 직접 만들어 봤다", r1(["결과물은 아직 고르지 않았습니다. 결과물을 직접 만들어 봤다고 답했어요."]).length > 0],
    ["R1 멀쩡한 덩이", r1(["결과물을 아직 고르지 않았습니다. 다음 과제에서 결과 문서를 남겨 두세요."]).length === 0],
    ["R2 적어 두셨습니다(0)", r2("문제를 이렇게 적어 두셨습니다.", zero).length > 0],
    ["R2 직접 정한 것이 보입니다(0)", r2("이 영역에서 직접 정한 것이 보입니다.", zero).length > 0],
    ["R2 고르신(0)", r2("고르신 결과물을 지원서에 옮기세요.", zero).length > 0],
    ["R2 있는 사람은 지나감", r2("문제를 이렇게 적어 두셨습니다. 고르신 결과물", some).length === 0],
    ["R2 관심 산업으로 고르신 은 지나감", r2("관심 산업으로 고르신 반도체의 판단입니다.", zero).length === 0],
    ["R3 새 경험을 더했고(0)", r3("새 경험을 더했고 결과가 바뀌었습니다.", zero).length > 0],
    ["R3 경험을 더한 뒤(0)", r3("경험을 더한 뒤 달라진 것입니다.", zero).length > 0],
    ["R3 부정은 지나감", r3("아직 새 경험을 더한 적이 없어 검사 당시 결과와 같습니다.", zero).length === 0],
    ["R4 설계은", r4("기구·제품 설계은 이번에 묻지 않았습니다.").length > 0],
    ["R4 조사은", r4("시장 조사은 아직 없습니다.").length > 0],
    ["R4 맞는 조사는 지나감", r4("설계는 묻지 않았고 조사는 했습니다. 결과물을 남겼습니다. 이번에 모을 자료").length === 0],
    ["R5 채우는 중", r5("이 지역의 기관 명단은 채우는 중입니다").length > 0],
    ["R5 (학교 · 기관 소재지 기준)", r5("전북 회사 267곳 (학교 · 기관 소재지 기준)").length > 0],
    ["R5 JJU26_", r5("학과 JJU26_BIZ 의 결과").length > 0],
    ["R5 &amp;", r5("R&amp;D 직무").length > 0],
    ["R5 멀쩡한 글은 지나감", r5("R&D 직무 · 전북 회사 267곳 · 학교 소재지 기준").length === 0],
    ["R7 수가 다름", r7("지역 회사 120곳", "지역 회사 267곳").length > 0],
    ["R7 수가 같음", r7("지역 회사 267곳", "전북 회사 267곳").length === 0],
    ["R7 그 밖에 할 일 3가지 = 할 일 4가지", r7("지금 할 한 가지 … 그 밖에 할 일 3가지", "90일 동안 할 일 4가지를 달력에 올렸습니다").length === 0],
    ["R9 아직 ~ 없습니다 셋", r9("아직 결과물이 없습니다. 아직 비교한 것이 없습니다. 아직 경험 기록이 없습니다.", [], []).length > 0],
    ["R9 하지 않는 것 제목", r9("", ["이 결과지가 하지 않는 것"], []).length > 0],
    ["R9 부제가 제목을 되풀이", r9("", [], [["직무마다 핵심 영역을 어디까지 해 봤는지 정리했습니다", "직무마다 핵심 영역 몇 곳에서 해 본 일이 확인됐는지와, 그 직무가 특히 따지는 판단을 어디까지 해 봤는지 적었습니다"]]).length > 0],
    ["R9 짧은 제목의 풀이 부제는 지나감", r9("", [], [["답과 고른 항목", "검사 응답과 체크리스트에서 고른 항목, 플랫폼에 적어 둔 경험 기록을 썼어요"]]).length === 0],
  ];
  return want.filter(([, good]) => !good).map(([n]) => n);
}
