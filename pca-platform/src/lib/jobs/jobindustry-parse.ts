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

/** 공고 게시판. 학회소식 · 교육은 공고가 아니라 넣지 않는다 */
export const JI_BOARDS: { path: string; label: string }[] = [
  { path: "430", label: "출연연" },
  { path: "439", label: "교원 임용" },
  { path: "486", label: "공공기관" },
  { path: "487", label: "기업 R&D" },
  { path: "488", label: "대학원생" },
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
  const m = text.match(/마감[^\n\d]{0,24}((?:20)?\d{2}\s*[.\-/년]\s*\d{1,2}\s*[.\-/월]\s*\d{1,2})/);
  return m ? m[1].replace(/\s+/g, "") : "";
}

export type JiView = { title: string; body: string; closes: string };

/** 상세 한 쪽. 제목은 `og:title` 의 `게시판 이름` 꼬리를 떼고, 없으면 `.view_tit` 에서 */
export function parseView(raw: string): JiView {
  /* 스크립트 안의 글자에 같은 class 이름이 들어 있는 일이 있다. 먼저 걷는다 */
  const html = raw.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, " ");
  let title = meta(html, "og:title");
  const cut = title.lastIndexOf(" : ");
  if (cut > 0) title = title.slice(0, cut).trim();
  if (!title) title = textOf(innerOf(html, "view_tit")).replace(/\n/g, " ");
  const body = textOf(innerOf(html, "board_txt_area"));
  return { title, body, closes: closesOf(body) };
}
