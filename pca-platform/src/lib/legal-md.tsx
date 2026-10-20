import type { ReactNode } from "react";

/**
 * 약관 본문(Markdown)을 화면 글로 세운다.
 *
 * 전에는 `<pre>` 에 원문을 그대로 두어 `#` · `**` · `|---|` 가 글자로
 * 보였다. 약관을 읽는 사람이 표기 기호를 걸러 읽어야 했고, 표는 막대
 * 기호의 줄로 섰다(화면 시안 2026-10-20).
 *
 * **HTML 로 바꾸지 않고 React 요소로 세운다.** 문자열을 끼워 넣는 길이
 * 없으니 본문에 무엇이 적혀 있어도 태그로 읽히지 않는다. 약관 파일이 쓰는
 * 것만 받는다: 제목(#~####) · 굵게 · 코드 · 번호/점 목록(들여쓰기로 겹침,
 * 다음 줄 이어 쓰기) · 표 · 가로줄 · 인용 · 문단. 그 밖의 기호는 글자로 둔다.
 */

type Item = { text: string; kids: List[] };
type List = { ordered: boolean; start: number; items: Item[]; indent: number };
type Block =
  | { k: "h"; level: number; text: string }
  | { k: "p"; text: string }
  | { k: "quote"; text: string }
  | { k: "hr" }
  | { k: "table"; head: string[]; rows: string[][] }
  | { k: "list"; list: List };

const LIST_RE = /^(\s*)(\d+\.|[-*+])\s+(.*)$/;

/* 원문은 폭에 맞춰 줄을 꺾어 두었다. 이을 때 사이를 띄우되, `·` 나 여는
   괄호에서 꺾인 줄은 붙인다(`대학·센터·사업단·지자체`) */
function glue(a: string, b: string): string {
  return /[·(\/]$/.test(a) ? a + b : `${a} ${b}`;
}

function cells(line: string): string[] {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
}

function parse(src: string): Block[] {
  const lines = src.replace(/\r\n?/g, "\n").split("\n");
  const out: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) { out.push({ k: "h", level: h[1].length, text: h[2].trim() }); i++; continue; }
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) { out.push({ k: "hr" }); i++; continue; }
    if (line.trim().startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const r = lines[i].trim();
        /* 머리와 몸을 가르는 줄(|---|:--:|)은 칸이 아니다 */
        if (!/^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?$/.test(r)) rows.push(cells(r));
        i++;
      }
      const [head = [], ...body] = rows;
      out.push({ k: "table", head, rows: body });
      continue;
    }
    if (/^\s*>/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*>\s?/, "")); i++;
      }
      out.push({ k: "quote", text: buf.map((x) => x.trim()).filter(Boolean).reduce(glue, "").trim() });
      continue;
    }
    if (LIST_RE.test(line)) {
      /* 들여쓰기가 깊어지면 바로 위 항목 아래의 목록이다. 표시 없이
         들여 쓴 줄은 바로 위 항목의 이어지는 글이다 */
      const root: List[] = [];
      const stack: List[] = [];
      let last: Item | null = null;
      while (i < lines.length) {
        const l = lines[i];
        if (!l.trim()) {
          /* 빈 줄 다음에 목록이 이어지면 같은 목록이다 */
          const next = lines.slice(i + 1).find((x) => x.trim());
          if (next && (LIST_RE.test(next) || /^\s{2,}\S/.test(next))) { i++; continue; }
          break;
        }
        const m = LIST_RE.exec(l);
        if (m) {
          const indent = m[1].length;
          const ordered = /\d/.test(m[2]);
          while (stack.length && stack[stack.length - 1].indent > indent) stack.pop();
          let cur = stack[stack.length - 1];
          if (!cur || cur.indent < indent || cur.ordered !== ordered) {
            if (cur && cur.indent === indent && cur.ordered !== ordered) stack.pop();
            const parent = stack[stack.length - 1];
            cur = { ordered, start: ordered ? parseInt(m[2], 10) : 1, items: [], indent };
            if (parent && last && parent.indent < indent) last.kids.push(cur);
            else root.push(cur);
            stack.push(cur);
          }
          last = { text: m[3].trim(), kids: [] };
          cur.items.push(last);
          i++;
          continue;
        }
        if (/^\s+\S/.test(l) && last) { last.text = glue(last.text, l.trim()); i++; continue; }
        break;
      }
      for (const list of root) out.push({ k: "list", list });
      continue;
    }
    const buf: string[] = [];
    while (
      i < lines.length && lines[i].trim() && !/^(#{1,6})\s/.test(lines[i])
      && !lines[i].trim().startsWith("|") && !LIST_RE.test(lines[i])
      && !/^\s*>/.test(lines[i]) && !/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(lines[i])
    ) { buf.push(lines[i].trim()); i++; }
    out.push({ k: "p", text: buf.reduce(glue) });
  }
  return out;
}

/** 굵게(`**`)와 코드(`` ` ``)만 읽는다. 짝이 없는 기호는 글자로 남는다 */
function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|`([^`]+)`/g;
  let at = 0;
  let n = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > at) out.push(text.slice(at, m.index));
    out.push(m[1] !== undefined
      ? <strong key={`${key}-${n++}`}>{inline(m[1], `${key}-${n}`)}</strong>
      : <code key={`${key}-${n++}`}>{m[2]}</code>);
    at = m.index + m[0].length;
  }
  if (at < text.length) out.push(text.slice(at));
  return out;
}

function renderList(list: List, key: string): ReactNode {
  const items = list.items.map((it, j) => (
    <li key={`${key}-${j}`}>
      {inline(it.text, `${key}-${j}`)}
      {it.kids.map((k, z) => renderList(k, `${key}-${j}-${z}`))}
    </li>
  ));
  return list.ordered
    ? <ol key={key} start={list.start !== 1 ? list.start : undefined}>{items}</ol>
    : <ul key={key}>{items}</ul>;
}

export function LegalMarkdown({ text, dropTitle }: { text: string; dropTitle?: boolean }) {
  let blocks = parse(text);
  /* 쪽 제목(`h1`)은 머리에 이미 있다. 본문 첫 줄의 `# 제목` 을 한 번 더
     세우지 않는다 */
  if (dropTitle && blocks[0]?.k === "h" && blocks[0].level === 1) blocks = blocks.slice(1);
  return (
    <div className="lgdoc">
      {blocks.map((b, i) => {
        const key = `b${i}`;
        switch (b.k) {
          case "h": {
            const lv = Math.min(4, Math.max(2, b.level));
            const Tag = (`h${lv}`) as "h2" | "h3" | "h4";
            return <Tag key={key}>{inline(b.text, key)}</Tag>;
          }
          case "hr": return <hr key={key} />;
          case "quote": return <blockquote key={key}>{inline(b.text, key)}</blockquote>;
          case "table":
            return (
              <div key={key} className="lgdoc-tw">
                <table>
                  {b.head.length ? (
                    <thead><tr>{b.head.map((c, j) => <th key={j}>{inline(c, `${key}h${j}`)}</th>)}</tr></thead>
                  ) : null}
                  <tbody>
                    {b.rows.map((r, j) => (
                      <tr key={j}>{r.map((c, z) => <td key={z}>{inline(c, `${key}r${j}${z}`)}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case "list": return renderList(b.list, key);
          default: return <p key={key}>{inline(b.text, key)}</p>;
        }
      })}
    </div>
  );
}
