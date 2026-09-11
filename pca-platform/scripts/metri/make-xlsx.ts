/**
 * 시험용 xlsx 를 만든다. 읽기 파서를 확인하려면 진짜 파일이 필요한데,
 * 쓰기 라이브러리를 제품에 들일 이유는 없으므로 여기 최소한만 둔다.
 * ZIP 을 무압축(stored)으로 쌓고 CRC32 만 맞춘다.
 */
import { crc32 } from "node:zlib";

function entry(name: string, data: Buffer) {
  return { name: Buffer.from(name, "utf8"), data, crc: crc32(data) >>> 0 };
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function makeXlsx(rows: string[][]): Buffer {
  const sheet =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>` +
    rows
      .map(
        (r, i) =>
          `<row r="${i + 1}">` +
          r
            .map(
              (c, j) =>
                `<c r="${String.fromCharCode(65 + j)}${i + 1}" t="inlineStr"><is><t>${esc(c)}</t></is></c>`,
            )
            .join("") +
          `</row>`,
      )
      .join("") +
    `</sheetData></worksheet>`;

  const files = [
    entry(
      "[Content_Types].xml",
      Buffer.from(
        `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>`,
      ),
    ),
    entry("xl/worksheets/sheet1.xml", Buffer.from(sheet, "utf8")),
  ];

  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;

  for (const f of files) {
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0);
    lh.writeUInt16LE(20, 4);
    lh.writeUInt16LE(0, 8); // stored
    lh.writeUInt32LE(f.crc, 14);
    lh.writeUInt32LE(f.data.length, 18);
    lh.writeUInt32LE(f.data.length, 22);
    lh.writeUInt16LE(f.name.length, 26);
    locals.push(lh, f.name, f.data);

    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0);
    ch.writeUInt16LE(20, 4);
    ch.writeUInt16LE(20, 6);
    ch.writeUInt16LE(0, 10);
    ch.writeUInt32LE(f.crc, 16);
    ch.writeUInt32LE(f.data.length, 20);
    ch.writeUInt32LE(f.data.length, 24);
    ch.writeUInt16LE(f.name.length, 28);
    ch.writeUInt32LE(offset, 42);
    centrals.push(ch, f.name);

    offset += 30 + f.name.length + f.data.length;
  }

  const central = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(central.length, 12);
  eocd.writeUInt32LE(offset, 16);

  return Buffer.concat([...locals, central, eocd]);
}
