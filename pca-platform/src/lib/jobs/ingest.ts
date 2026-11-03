import { query } from "@/lib/db";
import { mapPosting, regionOf } from "./map";
import { isClosed, type DegreeMin, type PostingKind } from "./meta";

/**
 * 공고를 표에 넣는다. 고용24 수집과 CSV 가져오기가 같은 자리를 지난다.
 *
 * **기업 이름을 받지 않는다.** 들어오는 꼴에 그 칸이 없다. 직업정보제공사업
 * 신고로 할 수 있는 것은 공고를 띄우고 응시자가 직접 지원하는 데까지이고,
 * 여기서 만드는 것은 그보다 좁은 **집계**다. 공고 제목도 담지 않는다: 제목에
 * 회사 이름이 들어 있는 일이 흔하다.
 *
 * **우리 회사 사이트 공고만 제목을 담는다**(2026-11-03 대표 "카드의 분류 · 분야 · 학위 · 마감 · 지역을 칸으로").
 * 잡인더스트리 · 커리어피크는 같은 사업자의 사이트이고, 제목은 그 사이트에 누구나 보게 올린 공고 글이다
 * (개인 정보가 아니다). 제목이 없으면 카드가 "제목을 읽지 못한 공고" 로 섰다(버그 ④). 고용24 · CSV 는
 * 전처럼 제목을 담지 않는다(`OWN_SITES`). 기업 이름 칸은 여전히 없다.
 *
 * **빼는 공고**(같은 날 결정): 제목을 읽지 못한 것, 마감이 이미 지난 것. 뺀 번호는 `v3_job_skips` 에
 * 적어 다음 당번이 같은 상세를 다시 부르지 않게 한다(그 표가 없는 DB 에서는 이 프로세스 안에서만 기억한다).
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
  /** 카드 칸(`meta.ts` 가 읽는다). 없으면 비운다 */
  meta?: PostingMeta;
};

export type PostingMeta = {
  category?: string | null; field?: string | null;
  degreeLabel?: string | null; degreeMin?: DegreeMin | null;
  kind?: PostingKind | null; regionLabel?: string | null; abroad?: boolean | null;
  jobFamily?: string | null; employmentType?: string | null;
  /** 본문 칸(`모집 분야` · `지원 자격` · `접수 기간` · 연구비의 `소관 부처` …). 공고 글 그대로다 */
  fields?: Record<string, string> | null;
};

/** 제목을 담는 출처. **우리 회사 사이트만**이다(위 머리말) */
export const OWN_SITES = new Set(["jobindustry", "careerpeak"]);

/*
 * `db/schema_jobs_meta.sql` 을 올리기 전의 DB 에는 새 칸이 없다(42703). 그때는 옛 칸만 적고
 * 10분 뒤 다시 해 본다: 운영 DB 를 올린 뒤 앱을 다시 띄우지 않아도 새 칸이 채워진다.
 */
let metaMissingAt = 0;
const META_RETRY_MS = 10 * 60_000;
const missingColumn = (e: unknown) => ["42703", "42P01"].includes((e as { code?: string } | null)?.code ?? "");
export const metaReady = () => Date.now() - metaMissingAt > META_RETRY_MS;
export function markMetaMissing(e: unknown): boolean {
  if (!missingColumn(e)) return false;
  metaMissingAt = Date.now();
  return true;
}

/* 뺀 번호를 이 프로세스 안에서도 기억한다(`v3_job_skips` 가 없는 DB 에서 쓴다) */
const SKIPPED = new Map<string, { reason: string; at: number }>();
/** 제목 없는 공고는 일주일 뒤 다시 본다(사이트에서 제목을 고칠 수 있다). 마감 지난 공고는 다시 보지 않는다 */
const NO_TITLE_RETRY_DAYS = 7;

async function noteSkip(source: string, ref: string, reason: "closed" | "no_title"): Promise<void> {
  SKIPPED.set(`${source}\u0000${ref}`, { reason, at: Date.now() });
  await query(
    `INSERT INTO v3_job_skips (source, source_ref, reason) VALUES ($1, $2, $3)
     ON CONFLICT (source, source_ref) DO UPDATE SET reason = EXCLUDED.reason, seen_at = now()`,
    [source.slice(0, 40), ref.slice(0, 80), reason]).catch(() => { /* 표가 없는 DB. 위 기억으로 갈음한다 */ });
}

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

export type IngestResult = {
  seen: number; mapped: number; unmapped: number; stored: number;
  skipped: { noTitle: number; closed: number };
};

export async function ingest(rows: RawPosting[], now = new Date()): Promise<IngestResult> {
  let mapped = 0, unmapped = 0, stored = 0, noTitle = 0, closed = 0;
  for (const r of rows) {
    if (!r.source || !r.sourceRef) continue;
    const title = (r.title ?? "").replace(/\s+/g, " ").trim();
    const closesOn = isoDate(r.closesOn);
    /* 제목 없는 공고 · 마감 지난 공고는 담지 않는다(버그 ④). 번호만 적어 다시 부르지 않는다 */
    if (!title) { noTitle += 1; await noteSkip(r.source, r.sourceRef, "no_title"); continue; }
    if (isClosed(closesOn, now)) { closed += 1; await noteSkip(r.source, r.sourceRef, "closed"); continue; }
    const m = mapPosting(title, r.body ?? "");
    if (m.core) mapped += 1; else unmapped += 1;
    const x = r.meta ?? {};
    /* 주소가 없으면 읽어 낸 국내 지역(`서울` …)으로 권역을 단다 */
    const region = regionOf(r.address ?? (x.abroad === false ? x.regionLabel : null));
    const base = [r.source.slice(0, 40), r.sourceRef.slice(0, 80), r.url ?? null,
      isoDate(r.postedOn), closesOn, region,
      m.core, m.role, m.requirements, JSON.stringify(m.td), `rules:${m.how}`];
    const cut = (v: string | null | undefined, n: number) => (v ? v.slice(0, n) : null);
    if (metaReady()) {
      try {
        await query(
          `INSERT INTO v3_job_postings
             (source, source_ref, source_url, posted_on, closes_on, region_code,
              core_code, role_code, raw_requirements, required_td, mapping_grade, mapping_note,
              title, category, field, degree_label, degree_min, posting_kind, region_label, abroad,
              job_family, employment_type, posting_fields)
           VALUES ($1,$2,$3,$4::date,$5::date,$6,$7,$8,$9,$10::jsonb,'약함',$11,
                   $12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22::jsonb)
           ON CONFLICT (source, source_ref) DO UPDATE SET
             closes_on = EXCLUDED.closes_on, region_code = EXCLUDED.region_code,
             core_code = EXCLUDED.core_code, role_code = EXCLUDED.role_code,
             raw_requirements = EXCLUDED.raw_requirements,
             required_td = EXCLUDED.required_td, mapping_note = EXCLUDED.mapping_note,
             title = EXCLUDED.title, category = EXCLUDED.category, field = EXCLUDED.field,
             posting_kind = EXCLUDED.posting_kind, region_label = EXCLUDED.region_label,
             abroad = EXCLUDED.abroad, posting_fields = EXCLUDED.posting_fields,
             /* 사람이 확인한 값(커리어피크 캘린더, verified_source)이 있으면 학위 · 직군 · 고용 형태를 덮지 않는다 */
             degree_label = CASE WHEN v3_job_postings.verified_source IS NULL THEN EXCLUDED.degree_label ELSE v3_job_postings.degree_label END,
             degree_min = CASE WHEN v3_job_postings.verified_source IS NULL THEN EXCLUDED.degree_min ELSE v3_job_postings.degree_min END,
             job_family = CASE WHEN v3_job_postings.verified_source IS NULL THEN EXCLUDED.job_family ELSE v3_job_postings.job_family END,
             employment_type = CASE WHEN v3_job_postings.verified_source IS NULL THEN EXCLUDED.employment_type ELSE v3_job_postings.employment_type END,
             captured_at = now()`,
          [...base, OWN_SITES.has(r.source) ? title.slice(0, 300) : null,
            cut(x.category, 40), cut(x.field, 40), cut(x.degreeLabel, 40), x.degreeMin ?? null,
            x.kind ?? null, cut(x.regionLabel, 40), x.abroad ?? null,
            cut(x.jobFamily, 20), cut(x.employmentType, 20),
            x.fields && OWN_SITES.has(r.source) ? JSON.stringify(x.fields) : null],
        );
        stored += 1;
        continue;
      } catch (e) {
        if (!markMetaMissing(e)) throw e;
      }
    }
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
      base,
    );
    stored += 1;
  }
  return { seen: rows.length, mapped, unmapped, stored, skipped: { noTitle, closed } };
}

/**
 * 상세를 다시 부르지 않아도 되는 번호.
 *
 * - 이미 담은 공고. 단 **우리 사이트 공고인데 제목 칸이 빈 줄은 다시 부른다**: 새 칸이 생기기 전에 담은
 *   공고에 제목 · 분류 · 학위를 채우려는 것이다
 * - 뺀 공고(`v3_job_skips`): 마감이 지난 것은 늘, 제목이 없던 것은 일주일 동안
 */
export async function knownRefs(source: string, refs: string[]): Promise<Set<string>> {
  if (!refs.length) return new Set();
  const own = OWN_SITES.has(source);
  let rows: { source_ref: string }[] = [];
  try {
    if (!metaReady()) throw Object.assign(new Error("meta"), { code: "42703" });
    rows = await query<{ source_ref: string }>(
      `SELECT source_ref FROM v3_job_postings
        WHERE source = $1 AND source_ref = ANY($2::text[]) AND ($3::boolean = false OR title IS NOT NULL)
       UNION
       SELECT source_ref FROM v3_job_skips
        WHERE source = $1 AND source_ref = ANY($2::text[])
          AND (reason = 'closed' OR seen_at > now() - make_interval(days => $4::int))`,
      [source, refs, own, NO_TITLE_RETRY_DAYS]);
  } catch (e) {
    if (!markMetaMissing(e)) throw e;
    rows = await query<{ source_ref: string }>(
      `SELECT source_ref FROM v3_job_postings WHERE source = $1 AND source_ref = ANY($2::text[])`,
      [source, refs]);
  }
  const out = new Set(rows.map((x) => x.source_ref));
  const fresh = Date.now() - NO_TITLE_RETRY_DAYS * 86_400_000;
  for (const ref of refs) {
    const s = SKIPPED.get(`${source}\u0000${ref}`);
    if (s && (s.reason === "closed" || s.at > fresh)) out.add(ref);
  }
  return out;
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
