import { query } from "@/lib/db";
import { mapPosting, regionOf } from "./map";

/**
 * 공고를 표에 넣는다. 고용24 수집과 CSV 가져오기가 같은 자리를 지난다.
 *
 * **기업 이름을 받지 않는다.** 들어오는 꼴에 그 칸이 없다. 직업정보제공사업
 * 신고로 할 수 있는 것은 공고를 띄우고 응시자가 직접 지원하는 데까지이고,
 * 여기서 만드는 것은 그보다 좁은 **집계**다. 공고 제목도 담지 않는다: 제목에
 * 회사 이름이 들어 있는 일이 흔하다.
 *
 * **같은 공고를 두 번 세지 않는다.** `(source, source_ref)` 가 유일하고,
 * 다시 들어오면 분류와 요구만 새로 적는다.
 */

export type RawPosting = {
  source: string;
  sourceRef: string;
  url?: string | null;
  title: string;
  body: string;
  address?: string | null;
  postedOn?: string | null;
  closesOn?: string | null;
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;
/**
 * `20261021` · `2026.10.21` · `2026-10-21` · `26-10-21` 을 `2026-10-21` 로. 모르면 null.
 *
 * **두 자리 연도도 읽는다.** 고용24(옛 워크넷) 목록은 등록일·마감일을 `26-10-21` 꼴로
 * 주는데, 네 자리만 읽으면 날짜 칸이 전부 비어 마감 순 정렬과 최근 180일 집계가 틀어진다.
 * `채용시까지` 처럼 날짜가 없는 마감은 null 이다.
 */
export function isoDate(s: string | null | undefined): string | null {
  const t = s ?? "";
  const m = t.match(/(20\d{2})\D?(\d{1,2})\D?(\d{1,2})/)
    ?? (() => {
      const y2 = t.match(/(?:^|[^\d])(\d{2})[-./](\d{1,2})[-./](\d{1,2})(?![\d])/);
      return y2 ? [y2[0], `20${y2[1]}`, y2[2], y2[3]] as unknown as RegExpMatchArray : null;
    })();
  if (!m) return null;
  const d = `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  return DATE.test(d) ? d : null;
}

export async function ingest(rows: RawPosting[]): Promise<{
  seen: number; mapped: number; unmapped: number;
}> {
  let mapped = 0, unmapped = 0;
  for (const r of rows) {
    if (!r.source || !r.sourceRef) continue;
    const m = mapPosting(r.title ?? "", r.body ?? "");
    if (m.core) mapped += 1; else unmapped += 1;
    await query(
      `INSERT INTO v3_job_postings
         (source, source_ref, source_url, posted_on, closes_on, region_code,
          core_code, role_code, raw_requirements, required_td, mapping_grade, mapping_note)
       VALUES ($1,$2,$3,$4::date,$5::date,$6,$7,$8,$9,$10::jsonb,'약함',$11)
       ON CONFLICT (source, source_ref) DO UPDATE SET
         closes_on = EXCLUDED.closes_on, region_code = EXCLUDED.region_code,
         core_code = EXCLUDED.core_code, role_code = EXCLUDED.role_code,
         raw_requirements = EXCLUDED.raw_requirements,
         required_td = EXCLUDED.required_td, mapping_note = EXCLUDED.mapping_note,
         captured_at = now()`,
      [r.source.slice(0, 40), r.sourceRef.slice(0, 80), r.url ?? null,
        isoDate(r.postedOn), isoDate(r.closesOn), regionOf(r.address),
        m.core, m.role, m.requirements, JSON.stringify(m.td),
        `rules:${m.how}`],
    );
  }
  return { seen: rows.length, mapped, unmapped };
}

/** 이미 들어온 번호. 상세 호출을 아끼려고 먼저 거른다 */
export async function knownRefs(source: string, refs: string[]): Promise<Set<string>> {
  if (!refs.length) return new Set();
  const r = await query<{ source_ref: string }>(
    `SELECT source_ref FROM v3_job_postings WHERE source = $1 AND source_ref = ANY($2::text[])`,
    [source, refs]);
  return new Set(r.map((x) => x.source_ref));
}

/**
 * CSV 를 읽는다. 머리줄에 `번호`·`제목`·`내용` 이 있어야 하고 `주소`·`등록일`·
 * `마감일`·`주소(url)` 은 있으면 쓴다. **회사 칸이 있어도 읽지 않는다.**
 */
export function parseCsv(text: string, source: string): RawPosting[] {
  const rows: string[][] = [];
  let cur: string[] = [], cell = "", q = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i += 1; }
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { cur.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i += 1;
      cur.push(cell); cell = "";
      if (cur.some((c) => c.trim())) rows.push(cur);
      cur = [];
    } else cell += ch;
  }
  cur.push(cell);
  if (cur.some((c) => c.trim())) rows.push(cur);
  const [head, ...body] = rows;
  if (!head) return [];
  const at = (...names: string[]) => head.findIndex((h) => names.includes(h.replace(/^﻿/, "").trim()));
  const iRef = at("번호", "ref", "id"), iTitle = at("제목", "title"), iBody = at("내용", "body");
  const iAddr = at("주소", "근무지", "address"), iPost = at("등록일", "posted_on");
  const iClose = at("마감일", "closes_on"), iUrl = at("url", "주소(url)");
  if (iRef < 0 || iTitle < 0 || iBody < 0) throw new Error("CSV 머리줄에 번호 · 제목 · 내용 칸이 있어야 합니다");
  return body.map((r) => ({
    source, sourceRef: (r[iRef] ?? "").trim(), title: r[iTitle] ?? "", body: r[iBody] ?? "",
    address: iAddr >= 0 ? r[iAddr] : null, postedOn: iPost >= 0 ? r[iPost] : null,
    closesOn: iClose >= 0 ? r[iClose] : null, url: iUrl >= 0 ? r[iUrl] || null : null,
  }));
}
