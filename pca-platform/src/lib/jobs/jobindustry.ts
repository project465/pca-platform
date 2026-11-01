import { isProduction } from "@/lib/env";
import { opFail, ref } from "@/lib/oplog";
import { ingest, knownRefs, type RawPosting } from "./ingest";
import { JI_API_READY, fromApi, jiApiKey, listApi, type JiApiPosting } from "./jobindustry-api";
import { JI_BOARDS, hasPage, listRefs, parseView } from "./jobindustry-parse";

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
  ok: boolean; via: "api" | "page"; listed: number; fresh: number; ingested: number; mapped: number; failed: number; error?: string;
};

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
  for (const f of fresh) {
    const url = `${PROD_BASE}/${f.board}/?bmode=view&idx=${f.idx}`;
    try {
      const v = parseView(await get(`${base}/${f.board}/?bmode=view&idx=${f.idx}`));
      if (!v.title && !v.body) { failed += 1; continue; }
      rows.push({
        source: JI_SOURCE, sourceRef: f.idx, url, title: v.title, body: v.body,
        address: null, postedOn: null, closesOn: v.closes || null,
      });
    } catch (e) {
      failed += 1;
      opFail({ operation: "jobs.jobindustry", ref: ref("posting", f.idx), step: "detail", category: "upstream" }, e);
    }
  }
  const r = await ingest(rows);
  return { ok: true, via: "page", listed: found.length, fresh: fresh.length, ingested: r.seen, mapped: r.mapped, failed };
}
