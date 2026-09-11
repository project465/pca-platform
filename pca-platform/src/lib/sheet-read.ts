/**
 * 엑셀·CSV 읽기 — 읽기 전용, 의존성 없음.
 *
 * 왜 직접 쓰는가. npm 의 SheetJS(xlsx@0.18.5)에는 ReDoS 권고가 있고 수정판은
 * npm 이 아니라 배포사 CDN 에만 있다. 여기로 들어오는 것은 학생 명단, 즉
 * 개인정보다. 그 경로에 고쳐지지 않는 의존성을 두느니, 필요한 만큼만 직접
 * 읽는 편이 안전하다.
 *
 * 하는 일은 세 가지뿐이다 — ZIP 을 풀고, sharedStrings 를 읽고, 첫 시트의
 * 셀을 문자열로 꺼낸다. 수식도 매크로도 서식도 보지 않는다.
 *
 * 정규식 대신 indexOf 로 훑는다. 명단 파일은 외부에서 들어오므로 역추적이
 * 폭발할 수 있는 패턴을 아예 쓰지 않는다.
 */
import { inflateRawSync } from "node:zlib";

/** 명단 하나가 이보다 크면 받지 않는다. 500명 엑셀이 보통 30KB 남짓이다. */
export const MAX_UPLOAD = 4 * 1024 * 1024;
const MAX_ENTRY = 24 * 1024 * 1024; // 압축 폭탄 방지
const MAX_ROWS = 5000;
const MAX_COLS = 64;

/* ── ZIP ──────────────────────────────────────────── */

type Entry = { name: string; offset: number; method: number; size: number };

function centralDirectory(buf: Buffer): Entry[] {
  // EOCD 는 파일 끝에 있고 주석이 붙을 수 있어 뒤에서 찾는다.
  const from = Math.max(0, buf.length - 66_000);
  let eocd = -1;
  for (let i = buf.length - 22; i >= from; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("엑셀 파일이 아닙니다.");

  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  if (p === 0xffffffff) throw new Error("ZIP64 형식은 지원하지 않습니다. 다시 저장해 주세요.");

  const out: Entry[] = [];
  for (let i = 0; i < count && p + 46 <= buf.length; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) break;
    const method = buf.readUInt16LE(p + 10);
    const size = buf.readUInt32LE(p + 24);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const offset = buf.readUInt32LE(p + 42);
    out.push({
      name: buf.toString("utf8", p + 46, p + 46 + nameLen),
      offset,
      method,
      size,
    });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

function readEntry(buf: Buffer, e: Entry): string {
  if (e.size > MAX_ENTRY) throw new Error("엑셀 안의 시트가 너무 큽니다.");
  if (buf.readUInt32LE(e.offset) !== 0x04034b50) throw new Error("엑셀 파일이 손상됐습니다.");
  const nameLen = buf.readUInt16LE(e.offset + 26);
  const extraLen = buf.readUInt16LE(e.offset + 28);
  const start = e.offset + 30 + nameLen + extraLen;

  if (e.method === 0) return buf.toString("utf8", start, start + e.size);
  if (e.method !== 8) throw new Error("지원하지 않는 압축 방식입니다.");
  return inflateRawSync(buf.subarray(start), { maxOutputLength: MAX_ENTRY }).toString("utf8");
}

/* ── XML ──────────────────────────────────────────── */

/**
 * 태그 이름 앞의 네임스페이스 접두어를 떼어낸다.
 *
 * 엑셀을 만든 도구에 따라 같은 파일이 <row> 로도 <x:row> 로도 나온다.
 * (업로드된 한국어판은 앞쪽, 튀르키예어판은 뒤쪽이었다.) 접두어를 먼저
 * 걷어내면 아래 스캐너는 한 가지 모양만 알면 된다.
 *
 * 속성 이름(r:id 같은 것)은 건드리지 않는다. 요소 이름만 본다.
 */
function stripNamespaces(xml: string): string {
  if (xml.indexOf(":") < 0) return xml;
  let out = "";
  let i = 0;
  for (;;) {
    const lt = xml.indexOf("<", i);
    if (lt < 0) {
      out += xml.slice(i);
      break;
    }
    out += xml.slice(i, lt + 1);
    let j = lt + 1;
    if (xml[j] === "/") {
      out += "/";
      j++;
    }
    // 이름 부분만 읽는다. 글자로 시작하지 않으면 선언·주석이므로 그대로 둔다.
    let k = j;
    while (k < xml.length && /[A-Za-z0-9_.\-:]/.test(xml[k])) k++;
    const name = xml.slice(j, k);
    const colon = name.indexOf(":");
    out += colon >= 0 ? name.slice(colon + 1) : name;
    i = k;
  }
  return out;
}

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
};

function unescapeXml(s: string): string {
  if (!s.includes("&")) return s;
  let out = "";
  let i = 0;
  while (i < s.length) {
    if (s[i] !== "&") {
      out += s[i++];
      continue;
    }
    const end = s.indexOf(";", i);
    if (end < 0 || end - i > 10) {
      out += s[i++];
      continue;
    }
    const ent = s.slice(i, end + 1);
    if (ENTITIES[ent]) out += ENTITIES[ent];
    else if (ent.startsWith("&#x")) out += String.fromCodePoint(parseInt(ent.slice(3, -1), 16) || 32);
    else if (ent.startsWith("&#")) out += String.fromCodePoint(parseInt(ent.slice(2, -1), 10) || 32);
    else out += ent;
    i = end + 1;
  }
  return out;
}

/** <t> 안의 글자를 이어 붙인다. 서식이 갈라놓은 조각을 합치기 위함이다. */
function textOf(xml: string, from: number, to: number): string {
  let out = "";
  let i = from;
  for (;;) {
    const open = xml.indexOf("<t", i);
    if (open < 0 || open >= to) break;
    const gt = xml.indexOf(">", open);
    if (gt < 0 || gt >= to) break;
    if (xml[gt - 1] === "/") {
      i = gt + 1;
      continue;
    }
    const close = xml.indexOf("</t>", gt);
    if (close < 0 || close > to) break;
    out += unescapeXml(xml.slice(gt + 1, close));
    i = close + 4;
  }
  return out;
}

function sharedStrings(xml: string): string[] {
  const out: string[] = [];
  let i = 0;
  for (;;) {
    const open = xml.indexOf("<si", i);
    if (open < 0) break;
    const close = xml.indexOf("</si>", open);
    if (close < 0) break;
    out.push(textOf(xml, open, close));
    i = close + 5;
  }
  return out;
}

function attr(tag: string, name: string): string | null {
  const key = ` ${name}="`;
  const at = tag.indexOf(key);
  if (at < 0) return null;
  const start = at + key.length;
  const end = tag.indexOf('"', start);
  return end < 0 ? null : tag.slice(start, end);
}

/**
 * 엑셀은 숫자를 1.0 처럼 적어 둔다. 그대로 쓰면 학번 2021001234 가
 * "2021001234.0" 이 되어 아이디가 어긋난다. 사람이 화면에서 보는 모양으로
 * 되돌린다 — 정수는 정수로.
 */
function numeric(raw: string): string {
  const m = /^(-?\d+)\.0+$/.exec(raw);
  return m ? m[1] : raw;
}

/** "AB12" → 열 번호 27 (0부터) */
function columnOf(ref: string): number {
  let n = 0;
  for (const ch of ref) {
    const c = ch.charCodeAt(0);
    if (c < 65 || c > 90) break;
    n = n * 26 + (c - 64);
  }
  return n - 1;
}

function sheetRows(xml: string, shared: string[]): string[][] {
  const rows: string[][] = [];
  let i = 0;
  while (rows.length < MAX_ROWS) {
    const rowOpen = xml.indexOf("<row", i);
    if (rowOpen < 0) break;
    const rowEnd = xml.indexOf("</row>", rowOpen);
    const stop = rowEnd < 0 ? xml.length : rowEnd;

    const cells: string[] = [];
    let j = rowOpen;
    for (;;) {
      const cOpen = xml.indexOf("<c", j);
      if (cOpen < 0 || cOpen >= stop) break;
      const cGt = xml.indexOf(">", cOpen);
      if (cGt < 0 || cGt > stop) break;
      const tag = xml.slice(cOpen, cGt + 1);
      // <row> 안의 <c> 만 본다. <col>·<cols> 같은 태그에 걸리지 않게 확인한다.
      if (tag[2] !== " " && tag[2] !== ">" && tag[2] !== "/") {
        j = cGt + 1;
        continue;
      }

      const selfClosing = xml[cGt - 1] === "/";
      const cClose = selfClosing ? cGt + 1 : xml.indexOf("</c>", cGt);
      const inner = selfClosing || cClose < 0 ? "" : xml.slice(cGt + 1, cClose);

      const ref = attr(tag, "r");
      const col = ref ? columnOf(ref) : cells.length;
      const type = attr(tag, "t");

      let value = "";
      if (inner) {
        if (type === "inlineStr") {
          value = textOf(inner, 0, inner.length);
        } else {
          const vOpen = inner.indexOf("<v>");
          const vClose = inner.indexOf("</v>");
          if (vOpen >= 0 && vClose > vOpen) {
            const raw = unescapeXml(inner.slice(vOpen + 3, vClose));
            value = type === "s" ? (shared[Number(raw)] ?? "") : numeric(raw);
          }
        }
      }

      if (col >= 0 && col < MAX_COLS) {
        while (cells.length < col) cells.push("");
        cells[col] = value.trim();
      }
      j = selfClosing ? cGt + 1 : cClose + 4;
    }

    rows.push(cells);
    if (rowEnd < 0) break;
    i = rowEnd + 6;
  }
  return rows;
}

/** 첫 시트를 문자열 격자로 읽는다. */
export function readXlsx(buf: Buffer): string[][] {
  const entries = centralDirectory(buf);
  const shared = entries.find((e) => e.name === "xl/sharedStrings.xml");
  const strings = shared ? sharedStrings(stripNamespaces(readEntry(buf, shared))) : [];

  // workbook.xml 의 순서가 파일명 순서와 다를 수 있으나, 명단은 첫 시트에
  // 있다고 보고 sheet1.xml 을 먼저 찾는다. 없으면 가장 앞 시트를 쓴다.
  const sheets = entries
    .filter((e) => e.name.startsWith("xl/worksheets/sheet") && e.name.endsWith(".xml"))
    .sort((a, b) => a.name.localeCompare(b.name, "en", { numeric: true }));
  if (!sheets.length) throw new Error("시트를 찾을 수 없습니다.");

  return sheetRows(stripNamespaces(readEntry(buf, sheets[0])), strings);
}

/** 따옴표와 줄바꿈을 처리하는 최소 CSV. 쉼표·탭·세미콜론을 구분자로 본다. */
export function readCsv(text: string): string[][] {
  const body = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const head = body.slice(0, 4000);
  const sep =
    (head.split("\t").length > head.split(",").length ? "\t" : null) ??
    (head.split(";").length > head.split(",").length ? ";" : ",");

  const rows: string[][] = [];
  let cell = "";
  let row: string[] = [];
  let quoted = false;

  for (let i = 0; i < body.length && rows.length < MAX_ROWS; i++) {
    const ch = body[i];
    if (quoted) {
      if (ch === '"') {
        if (body[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += ch;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === sep) {
      row.push(cell.trim());
      cell = "";
    } else if (ch === "\n") {
      row.push(cell.trim());
      rows.push(row);
      row = [];
      cell = "";
    } else if (ch !== "\r") cell += ch;
  }
  if (cell || row.length) {
    row.push(cell.trim());
    rows.push(row);
  }
  return rows;
}

/** 확장자를 보고 알맞은 쪽으로 보낸다. */
export function readTable(filename: string, buf: Buffer): string[][] {
  if (buf.length > MAX_UPLOAD) throw new Error("파일이 너무 큽니다. 4MB 이하로 올려 주세요.");
  const lower = filename.toLowerCase();
  if (lower.endsWith(".xlsx") || lower.endsWith(".xlsm")) return readXlsx(buf);
  if (lower.endsWith(".csv") || lower.endsWith(".tsv") || lower.endsWith(".txt")) {
    return readCsv(buf.toString("utf8"));
  }
  if (lower.endsWith(".xls")) {
    throw new Error("옛 .xls 형식은 읽지 못합니다. .xlsx 로 다시 저장해 주세요.");
  }
  throw new Error("엑셀(.xlsx) 또는 CSV 파일을 올려 주세요.");
}
