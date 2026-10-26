import { query } from "@/lib/db";

/**
 * 붙여 둔 공고의 마감일을 휴대폰 달력에 넣는 파일(`.ics`).
 *
 * **내려받기 한 번이다.** 구독 주소(열쇠를 품은 `webcal://…`)를 만들지 않는다:
 * 그 주소는 로그인 없이 열리므로 한 번 새면 남이 그 사람의 공고 목록을 계속
 * 읽는다. 파일은 로그인한 사람이 받은 그 순간의 마감일만 담는다.
 *
 * **남의 것은 담기지 않는다.** 공고 번호와 로그인한 사람으로 함께 거른다.
 * 남의 번호를 넣으면 빈 결과(없음)이고, 있는지 없는지도 알려 주지 않는다.
 *
 * 하루 종일 일정으로 넣고, 전날 오전 9시(한국 시각)에 한 번 알린다.
 */

type Row = { id: string; label: string; deadline: string };

/** RFC 5545 §3.3.11. 역슬래시 · 쌍반점 · 쉼표 · 줄바꿈을 막는다 */
export function icsText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** 한 줄을 75 바이트에서 접는다(§3.1). 한글이 바이트 중간에서 갈리지 않게 글자로 센다 */
export function fold(line: string): string {
  const out: string[] = [];
  let cur = "";
  let bytes = 0;
  for (const ch of line) {
    const n = Buffer.byteLength(ch, "utf8");
    if (bytes + n > (out.length ? 74 : 75)) { out.push(cur); cur = ""; bytes = 0; }
    cur += ch; bytes += n;
  }
  out.push(cur);
  return out.join("\r\n ");
}

const ymd = (d: string) => d.replace(/-/g, "");
function nextDay(d: string): string {
  const t = new Date(`${d}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + 1);
  return t.toISOString().slice(0, 10);
}
const stamp = (now: Date) => now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

export function buildIcs(rows: Row[], opts: { base?: string; now?: Date } = {}): string {
  const now = opts.now ?? new Date();
  const base = (opts.base ?? "").replace(/\/+$/, "");
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//CareerMatri//MAT//KO", "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH", "X-WR-CALNAME:MAT 공고 마감",
  ];
  for (const r of rows) {
    const href = base ? `${base}/me/track/posting/${r.id}` : "";
    lines.push(
      "BEGIN:VEVENT",
      `UID:mat-posting-${r.id}@careermatri`,
      `DTSTAMP:${stamp(now)}`,
      `DTSTART;VALUE=DATE:${ymd(r.deadline)}`,
      `DTEND;VALUE=DATE:${ymd(nextDay(r.deadline))}`,
      `SUMMARY:${icsText(`${r.label} 마감`)}`,
      `DESCRIPTION:${icsText("CareerMatri MAT에 붙여 둔 공고의 마감일입니다. 지원은 공고를 낸 곳에서 직접 하시면 됩니다.")}`,
      ...(href ? [`URL:${href}`] : []),
      "TRANSP:TRANSPARENT",
      "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${icsText("내일 공고 마감")}`,
      "TRIGGER:-PT15H", "END:VALARM",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return `${lines.map(fold).join("\r\n")}\r\n`;
}

/**
 * 그 사람의 공고 가운데 마감일이 있는 것. `id` 를 주면 그 한 건만, 안 주면
 * 보고 있는 공고 전부다. 남의 번호면 빈 목록이다.
 */
export async function calendarRows(userId: string, id?: string): Promise<Row[]> {
  if (id !== undefined) {
    if (!/^\d+$/.test(id)) return [];
    return query<Row>(
      `SELECT id::text, label, deadline::text FROM assistant_postings
        WHERE user_id = $1 AND id = $2 AND deadline IS NOT NULL`, [userId, id]);
  }
  return query<Row>(
    `SELECT id::text, label, deadline::text FROM assistant_postings
      WHERE user_id = $1 AND state = 'watching' AND deadline IS NOT NULL
        AND deadline >= (now() AT TIME ZONE 'Asia/Seoul')::date
      ORDER BY deadline, id`, [userId]);
}
