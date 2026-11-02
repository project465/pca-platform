/**
 * 답 글 안의 근거 칩 자리(`[검사: 영역]` · `[경험: 제목]` · `[할 일: …]` · `[공고: …]` ·
 * `[기록 없음]` · `[공고에 없음]`). 서버와 화면이 같은 꼴을 읽는다. 브라우저에서도 부르므로
 * 이 파일은 아무것도 들여오지 않는다.
 */
export const CHIP_RE = /\[(검사|경험|할 일|공고|기록 없음|공고에 없음)(?::\s*([^\]]{1,40}))?\]/g;

export type Piece = { text: string } | { chip: string; none: boolean };

/** 글을 조각으로. 허용 목록에 없는 칩은 버린다(지어낸 근거를 그리지 않는다) */
export function splitChips(text: string, allowed: Set<string>): Piece[] {
  const out: Piece[] = [];
  let last = 0;
  for (const m of text.matchAll(CHIP_RE)) {
    if (m.index! > last) out.push({ text: text.slice(last, m.index) });
    const none = m[1] === "기록 없음" || m[1] === "공고에 없음";
    const label = none ? m[1] : `${m[1]}: ${(m[2] ?? "").trim()}`;
    if (none || allowed.has(label)) out.push({ chip: label, none });
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  /* 버린 칩 자리에 남은 빈칸이 문장부호 앞에 서지 않게 */
  for (let k = 0; k < out.length; k++) {
    const p = out[k], next = out[k + 1];
    if ("text" in p && next && "text" in next && /^[.,!?)]/.test(next.text)) p.text = p.text.replace(/\s+$/, "");
  }
  return out.map((p) => ("text" in p ? { text: p.text.replace(/\s+([.,!?])/g, "$1") } : p));
}
