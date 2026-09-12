import { inflateRawSync } from "node:zlib";

/**
 * 명단 파일을 표(문자열 2차원 배열)로 읽는다. CSV · TSV · XLSX.
 *
 * XLSX 를 읽으려고 라이브러리를 들이지 않았다. 후보(exceljs)는 21MB 에
 * 취약점이 보고된 uuid 를 물고 오는데, 우리는 **읽기만** 하면 된다.
 * xlsx 는 ZIP 안에 XML 두 개가 든 형식이고, 압축 해제는 node:zlib 에 이미 있다.
 *
 * 대신 범위를 좁게 잡았다. 쓰기·수식·서식·날짜 변환을 하지 않고, 셀을 전부
 * 문자열로 읽는다. 학번이 숫자로 저장돼 있어도 문자열로 나오면 그만이다.
 * 파일 크기와 행·열 수에 상한을 두어 악의적인 파일이 서버를 붙잡지 못하게 한다.
 */

export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_ROWS = 5000;
const MAX_COLS = 50;

export class SheetError extends Error {}

/* ------------------------------------------------------------------ */
/*  ZIP — 읽기 전용. 중앙 디렉터리를 훑어 필요한 항목만 꺼낸다             */
/* ------------------------------------------------------------------ */

const EOCD_SIG = 0x06054b50;
const CEN_SIG = 0x02014b50;
const LOC_SIG = 0x04034b50;

type ZipEntry = { name: string; method: number; compressedSize: number; localOffset: number };

function findEocd(buf: Buffer): number {
  // 주석이 붙어 있을 수 있어 뒤에서부터 찾는다. 주석 최대 길이는 65535.
  const start = Math.max(0, buf.length - (0xffff + 22));
  for (let i = buf.length - 22; i >= start; i--) {
    if (buf.readUInt32LE(i) === EOCD_SIG) return i;
  }
  throw new SheetError("엑셀 파일이 아니거나 손상됐습니다.");
}

function zipEntries(buf: Buffer): Map<string, ZipEntry> {
  const eocd = findEocd(buf);
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);

  const out = new Map<string, ZipEntry>();
  for (let i = 0; i < count; i++) {
    if (p + 46 > buf.length || buf.readUInt32LE(p) !== CEN_SIG) break;
    const method = buf.readUInt16LE(p + 10);
    const compressedSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOffset = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nameLen);
    out.set(name, { name, method, compressedSize, localOffset });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

function readEntry(buf: Buffer, e: ZipEntry): string {
  const p = e.localOffset;
  if (buf.readUInt32LE(p) !== LOC_SIG) throw new SheetError("엑셀 파일이 손상됐습니다.");
  const nameLen = buf.readUInt16LE(p + 26);
  const extraLen = buf.readUInt16LE(p + 28);
  const start = p + 30 + nameLen + extraLen;

  // 중앙 디렉터리의 압축 크기가 0 이면(스트리밍으로 쓴 파일) 다음 서명까지 잘라 쓴다.
  const end = e.compressedSize > 0 ? start + e.compressedSize : buf.length;
  const data = buf.subarray(start, end);

  if (e.method === 0) return data.toString("utf8");
  if (e.method === 8) return inflateRawSync(data).toString("utf8");
  throw new SheetError("지원하지 않는 압축 방식입니다. 엑셀에서 다시 저장해 보세요.");
}

/* ------------------------------------------------------------------ */
/*  XML — 필요한 만큼만                                                 */
/* ------------------------------------------------------------------ */

function decodeXml(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

/** <si> 하나가 여러 <t> 로 쪼개져 있을 수 있다(서식이 섞인 셀). 이어 붙인다. */
function sharedStrings(xml: string): string[] {
  const out: string[] = [];
  for (const m of xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)) {
    let text = "";
    for (const t of m[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)) text += decodeXml(t[1]);
    out.push(text);
  }
  return out;
}

/** A1 → 0, B1 → 1, AA1 → 26 */
function colIndex(ref: string): number {
  let n = 0;
  for (const ch of ref) {
    const c = ch.charCodeAt(0);
    if (c < 65 || c > 90) break;
    n = n * 26 + (c - 64);
  }
  return n - 1;
}

function parseSheet(xml: string, strings: string[]): string[][] {
  const rows: string[][] = [];

  for (const rowMatch of xml.matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>/g)) {
    if (rows.length >= MAX_ROWS) throw new SheetError(`한 번에 ${MAX_ROWS}행까지 올릴 수 있습니다.`);

    // 중간이 비어 건너뛴 행이 있으면 채운다. 배열 위치가 엑셀의 행 번호와
    // 어긋나면 "3행이 잘못됐습니다" 같은 안내가 엉뚱한 줄을 가리키게 된다.
    const rowNo = Number(/r="(\d+)"/.exec(rowMatch[1])?.[1] ?? 0);
    if (rowNo > 0) {
      while (rows.length < rowNo - 1) {
        if (rows.length >= MAX_ROWS) throw new SheetError(`한 번에 ${MAX_ROWS}행까지 올릴 수 있습니다.`);
        rows.push([]);
      }
    }

    const cells: string[] = [];

    for (const c of rowMatch[2].matchAll(/<c\b([^>]*)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = c[1];
      const body = c[2] ?? "";
      const ref = /r="([A-Z]+)/.exec(attrs)?.[1] ?? "";
      const type = /t="([^"]+)"/.exec(attrs)?.[1] ?? "n";

      let value = "";
      if (type === "s") {
        const idx = Number(/<v>([\s\S]*?)<\/v>/.exec(body)?.[1] ?? "-1");
        value = strings[idx] ?? "";
      } else if (type === "inlineStr") {
        for (const t of body.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)) value += decodeXml(t[1]);
      } else {
        value = decodeXml(/<v>([\s\S]*?)<\/v>/.exec(body)?.[1] ?? "");
      }

      const at = ref ? colIndex(ref) : cells.length;
      if (at >= MAX_COLS) continue;
      while (cells.length < at) cells.push("");
      cells[at] = value.trim();
    }

    rows.push(cells);
  }

  return rows;
}

export function readXlsx(buf: Buffer): string[][] {
  const entries = zipEntries(buf);

  const ss = entries.get("xl/sharedStrings.xml");
  const strings = ss ? sharedStrings(readEntry(buf, ss)) : [];

  // 첫 번째 시트만 읽는다. 명단을 여러 시트에 나눠 담는 경우는 다루지 않는다.
  const sheetName =
    [...entries.keys()]
      .filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n))
      .sort()[0] ?? null;
  if (!sheetName) throw new SheetError("시트를 찾지 못했습니다. 엑셀에서 다시 저장해 보세요.");

  return parseSheet(readEntry(buf, entries.get(sheetName)!), strings);
}

/* ------------------------------------------------------------------ */
/*  CSV · TSV                                                          */
/* ------------------------------------------------------------------ */

export function readDelimited(text: string, delimiter?: string): string[][] {
  const body = text.replace(/^﻿/, ""); // 엑셀이 붙이는 BOM
  const sep = delimiter ?? (body.split("\n")[0].includes("\t") ? "\t" : ",");

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < body.length; i++) {
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
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && body[i + 1] === "\n") i++;
      row.push(cell.trim());
      cell = "";
      rows.push(row);
      row = [];
      if (rows.length > MAX_ROWS) throw new SheetError(`한 번에 ${MAX_ROWS}행까지 올릴 수 있습니다.`);
    } else cell += ch;
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell.trim());
    rows.push(row);
  }

  return rows;
}

/** 확장자와 내용으로 형식을 정한다. 파일 이름을 믿지 않고 앞 두 바이트도 본다. */
export function readSheet(fileName: string, buf: Buffer): string[][] {
  if (buf.length === 0) throw new SheetError("빈 파일입니다.");
  if (buf.length > MAX_FILE_BYTES) {
    throw new SheetError(`파일이 너무 큽니다. ${MAX_FILE_BYTES / 1024 / 1024}MB 이하만 올릴 수 있습니다.`);
  }

  // ZIP 서명(PK) 이면 xlsx 로 읽는다. .xls(구형 이진) 는 다루지 않는다.
  const isZip = buf[0] === 0x50 && buf[1] === 0x4b;
  if (isZip) return readXlsx(buf);

  const lower = fileName.toLowerCase();
  if (lower.endsWith(".xls")) {
    throw new SheetError("구형 .xls 는 읽을 수 없습니다. 엑셀에서 .xlsx 나 CSV 로 저장해 주세요.");
  }
  return readDelimited(buf.toString("utf8"), lower.endsWith(".tsv") ? "\t" : undefined);
}
