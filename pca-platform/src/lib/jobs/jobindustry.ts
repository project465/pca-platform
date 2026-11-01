import { isProduction } from "@/lib/env";
import { opFail, ref } from "@/lib/oplog";
import { query } from "@/lib/db";
import { ingest, knownRefs, type RawPosting } from "./ingest";
import { needsVision, readPostingImages, visionEnabled, visionMax } from "./jobindustry-vision";
import { JI_API_READY, fromApi, jiApiKey, listApi, type JiApiPosting } from "./jobindustry-api";
import { JI_BOARDS, closesOf, hasPage, listRefs, parseView } from "./jobindustry-parse";

/**
 * 잡인더스트리 공고를 MAT 공고로 받아 온다(2026-10-31 대표 지시: "공고는 잡인더꺼로").
 *
 * **열쇠가 없다.** 공고가 아임웹 게시판 글이고 RSS 가 없어서, 로그인 없이 열리는
 * 공개 목록과 상세 화면을 읽는다. 우리 회사 사이트다.
 *
 * **그 사이트 주소만 연다.** 바탕 주소는 코드에 고정이고, 시험용 바탕은 운영이
 * 아닌 배포본에서 `JOBINDUSTRY_BASE` 로만 바꾼다(`partner-job.ts` 와 같은 까닭).
 *
 * **새 공고만 상세를 부른다.** 목록은 게시판마다 첫 쪽만 본다. 이 소스로 들어온
 * 공고가 하나도 없을 때만 `JOBINDUSTRY_BACKFILL_PAGES`(기본 5) 쪽까지 거슬러 간다.
 * 한 번에 부르는 상세는 `JOBINDUSTRY_MAX_DETAIL`(기본 40)까지다.
 *
 * **저장하는 것은 늘 하던 대로다**(`ingest`): 원문 링크 · 마감일 · 읽어 낸 요구.
 * 제목과 본문은 요구를 읽는 데만 쓰고 표에 담지 않는다. 학생은 원문 링크로 그
 * 공고에 직접 지원한다.
 */

export const JI_SOURCE = "jobindustry";
const PROD_BASE = "https://www.jobindustry.co.kr";

export function jiBase(): string {
  const t = (process.env.JOBINDUSTRY_BASE ?? "").trim().replace(/\/+$/, "");
  return t && !isProduction() ? t : PROD_BASE;
}

/** 몇 분마다 받아 오나. 기본 10분(2026-10-31 대표 지시) */
export function jiIntervalMs(): number {
  const n = Number(process.env.JOBINDUSTRY_INTERVAL_MIN ?? 10);
  return (Number.isFinite(n) && n >= 1 ? n : 10) * 60_000;
}

/** 끄려면 `JOBINDUSTRY_SYNC=off` */
export function jiEnabled(): boolean {
  return (process.env.JOBINDUSTRY_SYNC ?? "").trim().toLowerCase() !== "off";
}

async function get(url: string): Promise<string> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(20_000),
    redirect: "error",
    headers: { "user-agent": "CareerMatri-MAT/1.0 (+https://app.careermatri.com)" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

/**
 * 어느 길로 받나(2026-11-01). **API 는 열쇠가 있고 그 자리가 채워졌을 때만**이다
 * (`jobindustry-api.ts` 의 `JI_API_READY`). 열쇠가 먼저 들어와도 그 전에는 화면을 읽는다
 */
export function jiSource(): "api" | "page" {
  return JI_API_READY && jiApiKey() ? "api" : "page";
}

type JiRun = {
  ok: boolean; via: "api" | "page"; listed: number; fresh: number; ingested: number; mapped: number; failed: number;
  /** 그림을 읽은 공고 수(새 공고 + 다시 읽은 옛 공고) */
  vision?: number;
  error?: string;
};

/**
 * 상세 한 쪽을 받아 저장 꼴로. 본문이 그림뿐이면 남은 몫 안에서 그림을 한 번 읽는다
 * (`jobindustry-vision.ts`). 읽었으면 `mapping_note` 에 `vision:read`, 읽을 글이 없었으면
 * `vision:none` 을 남겨 **같은 공고를 다시 읽지 않는다**(돈이 드는 일이라).
 */
async function detailRow(base: string, board: string, idx: string, budget: { left: number; used: number }): Promise<RawPosting | null> {
  const v = parseView(await get(`${base}/${board}/?bmode=view&idx=${idx}`));
  let body = v.body;
  let note: string | null = null;
  if (budget.left > 0 && needsVision(v.body, v.images)) {
    budget.left -= 1;
    budget.used += 1;
    const read = await readPostingImages(idx, v.title, v.images);
    note = read ? "vision:read" : "vision:none";
    if (read) body = [v.body, read].filter(Boolean).join("\n");
  }
  if (!v.title && !body) return null;
  return {
    source: JI_SOURCE, sourceRef: idx, url: `${PROD_BASE}/${board}/?bmode=view&idx=${idx}`,
    title: v.title, body, address: null, postedOn: null, closesOn: v.closes || closesOf(body) || null, note,
  };
}

/**
 * 그림 읽기를 붙이기 전에 들어온 그림 공고를 다시 읽는다. 요구를 하나도 못 읽었고, 아직
 * 마감 전이고, 그림을 읽어 본 적 없는 공고만. 새 공고에 쓰고 남은 몫까지만 쓴다.
 */
async function rereadThin(base: string, budget: { left: number; used: number }): Promise<{ rows: RawPosting[]; failed: number }> {
  if (budget.left <= 0) return { rows: [], failed: 0 };
  const old = await query<{ source_ref: string; source_url: string | null }>(
    `SELECT source_ref, source_url FROM v3_job_postings
      WHERE source = $1 AND cardinality(raw_requirements) = 0
        AND (closes_on IS NULL OR closes_on >= current_date)
        AND coalesce(mapping_note, '') NOT LIKE '%vision:%'
      ORDER BY captured_at DESC LIMIT $2`,
    [JI_SOURCE, budget.left]).catch(() => []);
  const rows: RawPosting[] = [];
  let failed = 0;
  for (const o of old) {
    const board = (o.source_url ?? "").match(/jobindustry\.co\.kr\/(\d+)\//)?.[1];
    if (!board) continue;
    try {
      const r = await detailRow(base, board, o.source_ref, budget);
      /* 그림이 없던 공고도 표를 남겨 다음에 다시 부르지 않는다 */
      if (r) rows.push(r.note ? r : { ...r, note: "vision:none" });
      /* 못 읽는 쪽(내려간 공고)도 표만 남긴다. 남기지 않으면 같은 공고가 줄 앞을 계속 막는다 */
      else {
        await query(
          `UPDATE v3_job_postings SET mapping_note = coalesce(mapping_note, '') || ' vision:none'
            WHERE source = $1 AND source_ref = $2`, [JI_SOURCE, o.source_ref]).catch(() => undefined);
      }
    } catch (e) {
      failed += 1;
      opFail({ operation: "jobs.jobindustry", ref: ref("posting", o.source_ref), step: "reread", category: "upstream" }, e);
    }
    if (budget.left <= 0) break;
  }
  return { rows, failed };
}

export async function runJobindustry(opts: { firstFill?: boolean } = {}): Promise<JiRun> {
  return jiSource() === "api" ? runApi(opts) : runPages(opts);
}

/** API 로 받는다. 이미 받은 공고는 다시 넣지 않는다(화면으로 받은 것과 같은 번호) */
async function runApi(opts: { firstFill?: boolean }): Promise<JiRun> {
  let items: JiApiPosting[];
  try {
    items = await listApi({ firstFill: Boolean(opts.firstFill) });
  } catch (e) {
    opFail({ operation: "jobs.jobindustry", step: "api", category: "upstream" }, e);
    return { ok: false, via: "api", listed: 0, fresh: 0, ingested: 0, mapped: 0, failed: 1, error: "api" };
  }
  const known = await knownRefs(JI_SOURCE, items.map((p) => p.id));
  const fresh = items.filter((p) => !known.has(p.id));
  const rows = fresh.map((p) => fromApi(p, JI_SOURCE)).filter((r): r is RawPosting => r !== null);
  const r = await ingest(rows);
  return { ok: true, via: "api", listed: items.length, fresh: fresh.length, ingested: r.seen, mapped: r.mapped, failed: fresh.length - rows.length };
}

/** 공개 목록과 상세 화면을 읽는다(2026-10-31 부터 운영에서 쓰는 길) */
async function runPages(opts: { firstFill?: boolean }): Promise<JiRun> {
  const base = jiBase();
  const pages = opts.firstFill ? Number(process.env.JOBINDUSTRY_BACKFILL_PAGES ?? 5) : 1;
  const maxDetail = Number(process.env.JOBINDUSTRY_MAX_DETAIL ?? 40);
  const found: { idx: string; board: string }[] = [];
  let failed = 0;
  for (const b of JI_BOARDS) {
    for (let p = 1; p <= pages; p += 1) {
      try {
        const html = await get(`${base}/${b.path}/${p > 1 ? `?page=${p}` : ""}`);
        for (const idx of listRefs(html, b.path)) {
          if (!found.some((f) => f.idx === idx)) found.push({ idx, board: b.path });
        }
        if (!hasPage(html, b.path, p + 1)) break;
      } catch (e) {
        /* 한 게시판이 실패해도 나머지는 받는다 */
        failed += 1;
        opFail({ operation: "jobs.jobindustry", ref: ref("board", b.path), step: "list", category: "upstream" }, e);
        break;
      }
    }
  }
  if (!found.length) {
    return { ok: failed === 0, via: "page", listed: 0, fresh: 0, ingested: 0, mapped: 0, failed, error: failed ? "list" : undefined };
  }
  const known = await knownRefs(JI_SOURCE, found.map((f) => f.idx));
  const fresh = found.filter((f) => !known.has(f.idx)).slice(0, maxDetail);
  const rows: RawPosting[] = [];
  const budget = { left: visionEnabled() ? visionMax() : 0, used: 0 };
  for (const f of fresh) {
    try {
      const row = await detailRow(base, f.board, f.idx, budget);
      if (!row) { failed += 1; continue; }
      rows.push(row);
    } catch (e) {
      failed += 1;
      opFail({ operation: "jobs.jobindustry", ref: ref("posting", f.idx), step: "detail", category: "upstream" }, e);
    }
  }
  const again = await rereadThin(base, budget);
  rows.push(...again.rows);
  failed += again.failed;
  const r = await ingest(rows);
  return { ok: true, via: "page", listed: found.length, fresh: fresh.length, ingested: r.seen, mapped: r.mapped, failed, vision: budget.used };
}
