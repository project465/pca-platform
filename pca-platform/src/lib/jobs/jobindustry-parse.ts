import type { PostingKind } from "./meta";

/**
 * 잡인더스트리(아임웹 게시판) 화면을 읽는다. **네트워크 없이 시험할 수 있게
 * 따로 둔다**(`jobindustry:feed` 가 꼴을 흉내 낸 HTML 로 돌린다).
 *
 * 2026-10-31 에 대표님 브라우저로 확인한 꼴이다(로그인 쿠키 없이 받은 원본 HTML).
 * - 목록 `/487` 원본에 상세 링크가 들어 있다: `/487/?q=…&bmode=view&idx=…&t=…`
 * - 다음 쪽은 `/487/?q=…&page=N`
 * - 상세 `/487/?bmode=view&idx=<번호>` 원본에 제목과 본문이 다 있다.
 *   제목은 `og:title`(`공고 제목 : 게시판 이름`)과 `.view_tit`,
 *   본문은 `.board_txt_area`
 *
 * **화면 모양이 바뀌면 여기만 고친다.** 못 읽으면 빈 값을 돌려주고 짐작해
 * 채우지 않는다: 그 공고는 제목 없이 들어가거나 빠진다.
 */

/**
 * 공고 게시판(2026-11-03 시험 세션이 브라우저로 확인: 채용 다섯 곳 합계 약 725건, 한 쪽 20건, 서버 HTML 에 들어 있다).
 *
 * - `label` 은 카드의 분류다. `kind` 는 게시판이 정하는 종류다(`meta.ts` 의 `kindOf`)
 * - **채용 다섯 곳만 MAT 공고 목록에 선다.** 연구비 · 평가위원 · 교육은 채용이 아니라 따로 저장만 하고
 *   연구자 플랜 묶음(`RESEARCH_EXTRA_KINDS`)으로만 꺼낸다. `/506` 은 `/research-funding` 과 같은 목록이라 읽지 않는다
 * - **`/job-normal` 은 읽지 않는다.** 위 다섯 곳을 브라우저 스크립트로 모아 보이는 화면이라 서버 HTML 에 공고가 없다
 * - 학회소식은 공고가 아니라 넣지 않는다
 */
export const JI_BOARDS: { path: string; label: string; kind: PostingKind }[] = [
  { path: "430", label: "출연연", kind: "job" },
  { path: "439", label: "교원 임용", kind: "faculty" },
  { path: "486", label: "공공기관", kind: "job" },
  { path: "487", label: "기업 R&D", kind: "job" },
  { path: "488", label: "대학원", kind: "grad" },
  { path: "research-funding", label: "연구비", kind: "funding" },
  { path: "evaluator-recruitment", label: "평가위원", kind: "evaluator" },
  { path: "505", label: "교육", kind: "education" },
];

const ENT: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", middot: "·",
};

export function decode(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => ENT[n.toLowerCase()] ?? m);
}

/** 태그를 걷고 줄을 남긴다. 스크립트와 스타일은 통째로 버린다 */
export function textOf(html: string): string {
  return decode(html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, " "))
    .replace(/[ \t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

/**
 * 목록 한 쪽에서 상세 번호를 차례대로 모은다. **그 게시판의 링크만** 센다:
 * 머리 메뉴나 옆 위젯에 다른 게시판 글이 걸려 있어도 섞지 않는다.
 */
export function listRefs(html: string, board: string): string[] {
  const out: string[] = [];
  const re = /href\s*=\s*["']([^"']*bmode=view[^"']*)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const href = decode(m[1]);
    const path = href.match(/^(?:https?:\/\/[^/]+)?\/([^/?#]+)\/?\?/);
    if (!path || path[1] !== board) continue;
    const idx = href.match(/[?&]idx=(\d{1,12})(?:&|$)/);
    if (idx && !out.includes(idx[1])) out.push(idx[1]);
  }
  return out;
}

/** 그 게시판에 이 쪽 다음 쪽이 있는가 */
export function hasPage(html: string, board: string, page: number): boolean {
  const re = new RegExp(`/${board}/?\\?[^"']*page=${page}(?:&|["'])`, "i");
  return re.test(decode(html));
}

/** `class` 에 그 이름이 든 첫 요소의 안쪽 HTML. 같은 태그가 안에 겹쳐 있어도 짝을 맞춘다 */
export function innerOf(html: string, cls: string): string {
  const open = new RegExp(`<([a-z0-9]+)\\b[^>]*class\\s*=\\s*["'][^"']*\\b${cls}\\b[^"']*["'][^>]*>`, "i");
  const m = open.exec(html);
  if (!m) return "";
  const tag = m[1].toLowerCase();
  const start = m.index + m[0].length;
  const re = new RegExp(`<(/?)${tag}\\b[^>]*>`, "gi");
  re.lastIndex = start;
  let depth = 1;
  let t: RegExpExecArray | null;
  while ((t = re.exec(html))) {
    depth += t[1] ? -1 : 1;
    if (depth === 0) return html.slice(start, t.index);
  }
  return html.slice(start);
}

function meta(html: string, prop: string): string {
  const a = html.match(new RegExp(`<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']*)["']`, "i"))
    ?? html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${prop}["']`, "i"));
  return a ? decode(a[1]).trim() : "";
}

/**
 * 마감일. 본문의 `마감` 뒤에 오는 첫 날짜다. `상시` · `채용시` 처럼 날짜가 없으면 빈 값.
 * 날짜 꼴은 `ingest` 의 `isoDate` 가 고르게 맞춘다.
 */
export function closesOf(text: string): string {
  const D = "((?:20)?\\d{2}\\s*[.\\-/년]\\s*\\d{1,2}\\s*[.\\-/월]\\s*\\d{1,2})";
  const m = text.match(new RegExp(`마감[^\\n\\d]{0,24}${D}`))
    /* `마감` 말이 없고 `접수 기간: 11.01 ~ 11.20` 처럼 기간만 적은 공고는 물결 뒤 날짜가 마감이다 */
    ?? text.match(new RegExp(`(?:접수|모집|지원|공고|신청)\\s?(?:기간|일정)[^\\n~]{0,40}~\\s*${D}`));
  return m ? m[1].replace(/\s+/g, "") : "";
}

/*
 * 표(tag) 글이 들 만한 아임웹 class 이름. **실제 목록 카드 HTML 은 아직 못 봤다**(2026-11-03, 이 컨테이너에서
 * 사이트가 막혀 있다). 흔한 이름을 넓게 받되 이 글에 기대지 않는다: 없으면 게시판 · 제목 · 본문으로 정한다.
 * 운영에서 `npm run jobs:probe` 로 실제로 무엇이 잡히는지 본다.
 */
const TAG_CLASS = /\b(cate|category|list_category|board_category|badge|label|tag|tags|hash_tag|hashtag|chip|keyword)\b/i;

/** 한 덩어리 HTML 안의 표 글들. 같은 글은 한 번만, 짧은 글(1~30자)만 */
export function tagsOf(html: string): string[] {
  const out: string[] = [];
  const re = /<([a-z0-9]+)\b[^>]*class\s*=\s*["']([^"']*)["'][^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    if (!TAG_CLASS.test(m[2])) continue;
    const inner = innerOf(html.slice(m.index), m[2].split(/\s+/).find((c) => TAG_CLASS.test(c)) ?? "");
    /* 표 글을 묶는 바깥 요소(`.tags` 안의 `.tag` 들)는 건너뛴다. 안쪽 표가 하나씩 따로 잡힌다 */
    if (/class\s*=\s*["'][^"']*\b(cate|category|badge|label|tag|hash_tag|hashtag|chip|keyword)\b/i.test(inner)) continue;
    const t = textOf(inner).replace(/\n/g, " ").trim();
    for (const part of t.split(/\s*[#,|]\s*/)) {
      const x = part.trim();
      if (x.length >= 1 && x.length <= 30 && !out.includes(x)) out.push(x);
    }
  }
  return out;
}

/*
 * 카드를 감싸는 요소(`post_link_wrap` 이 아닌 게시판에서만 쓴다). `<li>` · `<tr>` · `<article>` 을 먼저 보고,
 * 없을 때만 class 에 item · card 가 든 `<div>`. **링크에 가장 가까운 것부터 거꾸로 본다**: 목록 화면에는 메뉴
 * `<li>` 가 수백 개라 앞에서부터 짝을 맞추면 느리다. 짝을 맞추는 길이도 `CARD_MAX` 로 자른다.
 */
const CARD_TAG = /<(li|tr|article)\b[^>]*>/gi;
const CARD_DIV = /<div\b[^>]*class\s*=\s*["'][^"']*\b(item|card|list_item|board_item|li_body)\b[^"']*["'][^>]*>/gi;
const CARD_MAX = 20_000;

function enclosing(html: string, at: number, open: RegExp, tagOf: (m: RegExpExecArray) => string): string {
  const from = Math.max(0, at - CARD_MAX);
  const opens: RegExpExecArray[] = [];
  open.lastIndex = from;
  let m: RegExpExecArray | null;
  while ((m = open.exec(html)) && m.index < at) opens.push(m);
  for (let i = opens.length - 1; i >= 0; i -= 1) {
    const o = opens[i];
    const tag = tagOf(o);
    const start = o.index + o[0].length;
    const re = new RegExp(`<(/?)${tag}\\b[^>]*>`, "gi");
    re.lastIndex = start;
    let depth = 1;
    let t: RegExpExecArray | null;
    while ((t = re.exec(html)) && t.index < start + CARD_MAX) {
      depth += t[1] ? -1 : 1;
      if (depth === 0) break;
    }
    if (t && depth === 0 && t.index > at) return html.slice(start, t.index);
  }
  return "";
}

function cardAround(html: string, at: number): string {
  return enclosing(html, at, CARD_TAG, (m) => m[1].toLowerCase()) || enclosing(html, at, CARD_DIV, () => "div");
}

/** `notice`: `.title em` 에 `공지` 가 있는 카드(게시판 안내 글). 공고가 아니라 상세를 부르지 않는다 */
export type ListCard = { idx: string; title: string; tags: string[]; notice?: boolean };

/*
 * 목록 카드는 `a.post_link_wrap`(href 에 idx)이고, 그 안 `.title em` 이 아임웹 게시판 분류다(예: `IT/AI/빅데이터/블록체인`).
 * `공지` em 은 분류가 아니다. **화면에 보이는 `대학원 · IT·AI·데이터` 배지(class `jxbc-…`)는 브라우저 스크립트가
 * 나중에 붙인 것이라 서버 HTML 에 없다. 읽지 않는다.** 연구비 · 평가위원 · 교육 게시판은 카드 class 가 달라서,
 * `post_link_wrap` 이 아니면 둘레 요소(`cardAround`)에서 같은 것을 찾아본다.
 */
function emsOf(html: string): string[] {
  const out: string[] = [];
  for (const m of html.matchAll(/<em\b[^>]*>([\s\S]*?)<\/em>/gi)) {
    const t = textOf(m[1]).replace(/\n/g, " ").trim();
    if (t && t !== "공지" && t.length <= 40 && !out.includes(t)) out.push(t);
  }
  return out;
}

/** 분류 글을 뗀 제목. 분류가 `[…]` 로 싸였든, 띄어쓰기 없이 바로 붙었든 뗀다 */
export function stripCategory(title: string, cats: string[] = []): string {
  let t = (title ?? "").replace(/\s+/g, " ").trim();
  for (const c of cats) {
    for (const form of [`[${c}]`, c]) {
      if (c && t.startsWith(form)) { t = t.slice(form.length).trim(); break; }
    }
  }
  /* 분류를 모르면 `[A/B/C]` 꼴만 뗀다(대괄호가 없으면 어디까지가 분류인지 알 수 없다) */
  t = t.replace(/^\[[^\]]{1,40}\/[^\]]{1,40}\]\s*/, "");
  return t.trim();
}

/**
 * 목록 한 쪽의 카드. 번호(`listRefs` 와 같은 차례)와, 카드에서 읽히면 제목 · 분류(`.title em`).
 * 제목은 덤이다: 저장할 제목은 상세에서 다시 읽는다.
 */
export function listCards(raw: string, board: string): ListCard[] {
  /*
   * 스크립트 · 스타일을 걷은 화면에서 먼저 읽는다(스크립트 안 글자의 같은 class 를 섞지 않게).
   * **그래서 카드가 하나도 안 나오거나 걷기가 카드를 지웠으면 걷지 않은 화면으로 다시 읽는다.** 짝이 맞지 않는 `<script` · `<style`
   * 글자가 있으면 걷기가 카드까지 지울 수 있다(2026-11-05: 운영에서 채용 게시판 다섯 곳이 0장으로 읽혔다)
   */
  const html = raw.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, " ");
  const first = cardsIn(html, board);
  /* 걷기 전보다 카드 요소(`class="… post_link_wrap …"`)가 줄었으면 걷기가 카드를 지운 것이다 */
  const wraps = (x: string) => (x.match(/class\s*=\s*["'][^"']*\bpost_link_wrap\b/gi) ?? []).length;
  return first.length && wraps(html) >= wraps(raw) ? first : cardsIn(raw, board);
}

function cardsIn(html: string, board: string): ListCard[] {
  /* 채용 게시판처럼 카드가 `post_link_wrap` 이면 **그 링크만** 센다: 머리 메뉴 · 옆 위젯의 같은 게시판 글을 섞지 않는다 */
  const wrapOnly = /\bpost_link_wrap\b/.test(html);
  const all: { card: ListCard; wrapped: boolean }[] = [];
  const re = /href\s*=\s*["']([^"']*bmode=view[^"']*)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const href = decode(m[1]);
    const path = href.match(/^(?:https?:\/\/[^/]+)?\/([^/?#]+)\/?\?/);
    if (!path || path[1] !== board) continue;
    const idx = href.match(/[?&]idx=(\d{1,12})(?:&|$)/)?.[1];
    if (!idx) continue;
    /* 링크를 연 `<a …>` 가 `post_link_wrap` 이면 그 안쪽이 카드다 */
    const tagAt = html.lastIndexOf("<", m.index);
    const opener = html.slice(tagAt, html.indexOf(">", m.index) + 1);
    const wrapped = /^<a\b/i.test(opener) && /\bpost_link_wrap\b/.test(opener);
    const had = all.findIndex((x) => x.card.idx === idx);
    /* 같은 번호가 메뉴와 카드에 다 있으면 카드 쪽을 쓴다 */
    if (had >= 0 && (all[had].wrapped || !wrapped)) continue;
    const card = wrapped ? innerOf(html.slice(tagAt), "post_link_wrap") : cardAround(html, m.index);
    const head = card ? innerOf(card, "title") || innerOf(card, "list_text_title") || innerOf(card, "tit") : "";
    const tags = head ? emsOf(head) : [];
    /* 아임웹은 모든 카드에 숨긴 `공지` em(`display: none`)을 넣는다(2026-11-05 실제 487). 보이는 것만 공지다 */
    const notice = /<em\b(?![^>]*display\s*:\s*none)[^>]*>\s*공지\s*<\/em>/i.test(head);
    const title = stripCategory(textOf(head.replace(/<!--[\s\S]*?-->/g, " ").replace(/<em\b[\s\S]*?<\/em>/gi, " ")).replace(/\n/g, " "), tags);
    const item = { card: { idx, title, tags, ...(notice ? { notice } : {}) }, wrapped };
    if (had >= 0) all[had] = item; else all.push(item);
  }
  /* `post_link_wrap` 이 있는데 카드로 묶인 링크가 하나도 없으면 꼴이 바뀐 것이다. 옛 방식(그 게시판 글 링크 전부)으로 */
  const wrappedOnes = all.filter((x) => x.wrapped);
  return (wrapOnly && wrappedOnes.length ? wrappedOnes : all).map((x) => x.card);
}

export type JiView = { title: string; body: string; closes: string; tags: string[] };

/* og:title 이 글 제목이 아니라 사이트 · 게시판 이름일 때가 있다(글마다 og 를 못 단 화면). 그건 제목이 아니다 */
const NOT_TITLE = /^(잡인더스트리|JOB\s?INDUSTRY|커리어피크|CAREER\s?PEAK|출연연|교원\s?임용|공공기관|기업\s?R&D|기업\s?연구소|대학원생?|채용(공고)?|연구비|평가위원|교육)$/i;

/**
 * 상세 한 쪽. 제목은 `og:title` 의 `게시판 이름` 꼬리를 떼고, 없으면 `.view_tit` 에서.
 * `.view_tit` 앞에는 분류 글이 띄어쓰기 없이 붙어 있다(`IT/AI/빅데이터/블록체인리빌더에이아이 …`,
 * `[기계/모빌리티/로봇/조선]한국과학기술연구원…`). 분류 요소(`em` · class 에 cate 가 든 것)는 걷고,
 * 글로 붙은 분류는 `cats`(목록 카드에서 읽은 분류)로 뗀다.
 */
export function parseView(raw: string, cats: string[] = []): JiView {
  /* 스크립트 안의 글자에 같은 class 이름이 들어 있는 일이 있다. 먼저 걷는다 */
  const html = raw.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, " ");
  const head = innerOf(html, "view_tit");
  const tags = [...new Set([...(head ? emsOf(head) : []), ...(head ? tagsOf(head) : [])])];
  const known = [...new Set([...cats, ...tags])].sort((a, b) => b.length - a.length);
  let title = meta(html, "og:title");
  const cut = title.lastIndexOf(" : ");
  if (cut > 0) title = title.slice(0, cut).trim();
  if (!title || NOT_TITLE.test(title)) {
    title = textOf(head
      .replace(/<em\b[\s\S]*?<\/em>/gi, " ")
      .replace(/<([a-z0-9]+)\b[^>]*class\s*=\s*["'][^"']*\b(cate|category|badge|label|tag)\b[^"']*["'][^>]*>[\s\S]*?<\/\1>/gi, " "))
      .replace(/\n/g, " ").trim();
  }
  title = stripCategory(title, known);
  if (NOT_TITLE.test(title)) title = "";
  const body = textOf(innerOf(html, "board_txt_area"));
  return { title, body, closes: closesOf(body), tags };
}
