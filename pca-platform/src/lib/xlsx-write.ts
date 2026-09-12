import { deflateRawSync } from "node:zlib";

/**
 * 엑셀 파일 쓰기. 읽기(src/lib/sheet.ts)와 같은 이유로 라이브러리를 쓰지 않는다.
 *
 * xlsx 는 ZIP 안에 XML 몇 개가 든 형식이고, 압축은 node:zlib 에 이미 있다.
 * 여기서 필요한 것은 "표 한 장 + 드롭다운"뿐이라 그만큼만 만든다 —
 * 수식·차트·병합·여러 시트는 다루지 않는다.
 *
 * 쓰는 곳은 평정표 배포(scripts/make-rating-sheet.ts) 하나다.
 */

export type Cell = string | number | null;
export type Row = { cells: Cell[]; style?: CellStyle | (CellStyle | undefined)[] };

/** 0 보통 · 1 굵게 · 2 적는 칸(노란 바탕) · 3 여러 줄 */
export type CellStyle = "plain" | "bold" | "input" | "wrap";
const STYLE_INDEX: Record<CellStyle, number> = { plain: 0, bold: 1, input: 2, wrap: 3 };

export type Validation = {
  /** "C8:C20" 같은 범위 */
  ref: string;
  /** 고를 수 있는 값. 쉼표가 들어가면 안 된다 */
  allow: string[];
  title?: string;
  prompt?: string;
};

export type SheetSpec = {
  name: string;
  rows: Row[];
  /** 열 너비(문자 수). 앞에서부터 적용된다 */
  widths?: number[];
  validations?: Validation[];
  /** 이 행까지 위에 고정한다 */
  freezeRows?: number;
};

/* ------------------------------------------------------------------ */
/*  ZIP 쓰기                                                            */
/* ------------------------------------------------------------------ */

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

type Entry = { name: string; data: Buffer };

function zip(entries: Entry[]): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;

  for (const e of entries) {
    const name = Buffer.from(e.name, "utf8");
    const raw = e.data;
    const deflated = deflateRawSync(raw, { level: 9 });
    // 압축이 이득이 없으면 그냥 저장한다
    const store = deflated.length >= raw.length;
    const body = store ? raw : deflated;
    const method = store ? 0 : 8;
    const crc = crc32(raw);

    const local = Buffer.alloc(30 + name.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0, 6); // flags
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(0, 10); // time
    local.writeUInt16LE(0x21, 12); // date — 1980-01-01. 재생성해도 같은 파일이 나온다
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    name.copy(local, 30);
    locals.push(local, body);

    const central = Buffer.alloc(46 + name.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4); // version made by
    central.writeUInt16LE(20, 6); // version needed
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0x21, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(body.length, 20);
    central.writeUInt32LE(raw.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(0, 38); // external attrs
    central.writeUInt32LE(offset, 42);
    name.copy(central, 46);
    centrals.push(central);

    offset += local.length + body.length;
  }

  const cd = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(cd.length, 12);
  eocd.writeUInt32LE(offset, 16);

  return Buffer.concat([...locals, cd, eocd]);
}

/* ------------------------------------------------------------------ */
/*  XML                                                                */
/* ------------------------------------------------------------------ */

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 0 → A, 25 → Z, 26 → AA */
export function colName(i: number): string {
  let n = i + 1;
  let out = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    out = String.fromCharCode(65 + r) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

function cellXml(ref: string, value: Cell, styleIndex: number): string {
  const s = styleIndex > 0 ? ` s="${styleIndex}"` : "";
  if (value === null || value === "") return `<c r="${ref}"${s}/>`;
  if (typeof value === "number") return `<c r="${ref}"${s}><v>${value}</v></c>`;
  return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${esc(value)}</t></is></c>`;
}

function sheetXml(spec: SheetSpec): string {
  const cols = spec.widths?.length
    ? `<cols>${spec.widths
        .map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`)
        .join("")}</cols>`
    : "";

  const pane = spec.freezeRows
    ? `<sheetViews><sheetView workbookViewId="0" tabSelected="1">` +
      `<pane ySplit="${spec.freezeRows}" topLeftCell="A${spec.freezeRows + 1}" activePane="bottomLeft" state="frozen"/>` +
      `</sheetView></sheetViews>`
    : `<sheetViews><sheetView workbookViewId="0" tabSelected="1"/></sheetViews>`;

  const rows = spec.rows
    .map((row, r) => {
      const cells = row.cells
        .map((v, c) => {
          const st = Array.isArray(row.style) ? row.style[c] : row.style;
          return cellXml(`${colName(c)}${r + 1}`, v, STYLE_INDEX[st ?? "plain"]);
        })
        .join("");
      return `<row r="${r + 1}">${cells}</row>`;
    })
    .join("");

  const dv = spec.validations?.length
    ? `<dataValidations count="${spec.validations.length}">${spec.validations
        .map(
          (v) =>
            `<dataValidation type="list" allowBlank="1" showInputMessage="1" showErrorMessage="1"` +
            (v.title ? ` promptTitle="${esc(v.title)}"` : "") +
            (v.prompt ? ` prompt="${esc(v.prompt)}"` : "") +
            ` sqref="${v.ref}"><formula1>"${v.allow.map(esc).join(",")}"</formula1></dataValidation>`,
        )
        .join("")}</dataValidations>`
    : "";

  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    pane +
    cols +
    `<sheetData>${rows}</sheetData>` +
    dv +
    `</worksheet>`
  );
}

const STYLES_XML =
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
  `<fonts count="2">` +
  `<font><sz val="11"/><name val="맑은 고딕"/></font>` +
  `<font><b/><sz val="11"/><name val="맑은 고딕"/></font>` +
  `</fonts>` +
  `<fills count="3">` +
  `<fill><patternFill patternType="none"/></fill>` +
  `<fill><patternFill patternType="gray125"/></fill>` +
  `<fill><patternFill patternType="solid"><fgColor rgb="FFFFF7DB"/><bgColor indexed="64"/></patternFill></fill>` +
  `</fills>` +
  `<borders count="2">` +
  `<border><left/><right/><top/><bottom/><diagonal/></border>` +
  `<border><left style="thin"><color rgb="FFC9D2D8"/></left><right style="thin"><color rgb="FFC9D2D8"/></right>` +
  `<top style="thin"><color rgb="FFC9D2D8"/></top><bottom style="thin"><color rgb="FFC9D2D8"/></bottom><diagonal/></border>` +
  `</borders>` +
  `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
  `<cellXfs count="4">` +
  `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center"/></xf>` +
  `<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="center"/></xf>` +
  `<xf numFmtId="0" fontId="0" fillId="2" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>` +
  `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>` +
  `</cellXfs>` +
  `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>` +
  `</styleSheet>`;

/** 시트 한 장짜리 xlsx 를 만든다 */
export function writeXlsx(spec: SheetSpec): Buffer {
  const files: Entry[] = [
    {
      name: "[Content_Types].xml",
      data: Buffer.from(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
          `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
          `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
          `<Default Extension="xml" ContentType="application/xml"/>` +
          `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
          `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
          `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
          `</Types>`,
        "utf8",
      ),
    },
    {
      name: "_rels/.rels",
      data: Buffer.from(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
          `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
          `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
          `</Relationships>`,
        "utf8",
      ),
    },
    {
      name: "xl/workbook.xml",
      data: Buffer.from(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
          `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"` +
          ` xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
          `<sheets><sheet name="${esc(spec.name).slice(0, 31)}" sheetId="1" r:id="rId1"/></sheets>` +
          `</workbook>`,
        "utf8",
      ),
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      data: Buffer.from(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
          `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
          `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>` +
          `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
          `</Relationships>`,
        "utf8",
      ),
    },
    { name: "xl/styles.xml", data: Buffer.from(STYLES_XML, "utf8") },
    { name: "xl/worksheets/sheet1.xml", data: Buffer.from(sheetXml(spec), "utf8") },
  ];

  return zip(files);
}
