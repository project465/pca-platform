import { opFail, ref } from "@/lib/oplog";
import { ingest, knownRefs, type IngestResult, type RawPosting } from "./ingest";
import { hasPage, listCards, type ListCard } from "./jobindustry-parse";

/**
 * 아임웹 게시판을 **모든 쪽까지, 여러 당번에 나눠** 읽는다(2026-11-03 대표 "모든 게시판 · 모든 쪽").
 * 잡인더스트리(우리 회사 아임웹 사이트)가 쓴다. 커리어피크 캘린더는 공개 JSON 이라 이것을 쓰지 않는다.
 *
 * 전에는 게시판마다 첫 쪽만 읽고(비었을 때만 5쪽), 한 번에 상세 40개까지였다. 그래서 MAT 에 공고가
 * 일곱 건쯤만 섰다. 이제는 이렇게 읽는다.
 *
 * - **첫 쪽은 당번마다 읽는다.** 새 공고가 늦게 뜨지 않게
 * - **나머지 쪽은 게시판마다 당번 한 번에 `pagesPerTick` 쪽씩** 이어서 읽는다(`next`). 빈 쪽이나 앞 쪽과 같은
 *   카드만 든 쪽이 오거나 `maxPages` 에 닿으면 한 바퀴가 끝나고, `rewalkMs` 뒤에 처음부터 다시 돈다
 *   (지워진 글 · 고친 글을 다시 본다). 화면의 쪽 번호 링크는 열 개씩만 보여서 링크에 기대지 않는다
 * - 목록 카드의 `공지` 글은 공고가 아니라 상세를 부르지 않는다
 * - **상세는 당번 한 번에 `maxDetail` 개까지.** 못 부른 번호는 `pending` 에 남아 다음 당번이 이어서 부른다.
 *   첫 쪽에서 새로 본 번호가 먼저다. 밀린 번호가 `maxDetail` 보다 많으면 깊은 쪽을 더 읽지 않는다
 *   (읽어 둔 번호를 다 부르기 전에 목록만 앞서 가지 않게)
 * - **부를 때마다 `delayMs` 쉰다.** 우리 사이트지만 손님이 보는 사이트다
 *
 * 이어 읽는 자리(`next` · `pending`)는 **이 프로세스 안에만** 있다. 앱이 다시 뜨면 목록을 처음부터 다시
 * 돈다. 이미 담은 번호와 뺀 번호(`knownRefs`)는 상세를 다시 부르지 않으므로 다시 도는 값은 목록 쪽뿐이다.
 */

export type ImwebBoard = { path: string };

export type ImwebConfig<B extends ImwebBoard> = {
  /** `v3_job_postings.source` */
  source: string;
  /** 운영 기록(`opFail`)에 쓰는 이름 */
  operation: string;
  /** 실제로 부르는 바탕 주소(시험 때만 바뀐다) */
  base: string;
  boards: B[];
  get: (url: string) => Promise<string>;
  /** 상세 HTML 한 쪽을 담을 꼴로. 공고가 아니면 null */
  toRow: (board: B, idx: string, html: string, card: ListCard | undefined) => RawPosting | null;
  maxPages: number; pagesPerTick: number; maxDetail: number; delayMs: number; rewalkMs: number;
  /** 시험용 갈음(`jobindustry:feed` 가 DB 없이 돌린다). 비우면 `knownRefs` · `ingest` */
  known?: (refs: string[]) => Promise<Set<string>>;
  save?: (rows: RawPosting[]) => Promise<IngestResult>;
};

type Pending = { board: string; card?: ListCard; fresh: boolean; tries: number };
export type ImwebState = {
  /** 게시판마다: 다음에 읽을 쪽 · 한 바퀴를 마친 때 · 바로 앞에 읽은 쪽의 번호들 */
  boards: Map<string, { next: number; doneAt: number; prev: string[] }>;
  pending: Map<string, Pending>;
};
export const newImwebState = (): ImwebState => ({ boards: new Map(), pending: new Map() });

export type ImwebResult = {
  ok: boolean; listed: number; pages: number; fresh: number; pending: number;
  ingested: number; mapped: number; failed: number;
  skipped: IngestResult["skipped"]; error?: string;
};

/* 아임웹 게시판 한 쪽의 글 수. 첫 쪽이 이보다 적고 2쪽 링크도 없으면 그 게시판은 한 쪽뿐이다 */
const PAGE_FULL = 20;

const sleep = (ms: number) => (ms > 0 ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve());

/** 숫자 환경 변수. 비었거나 범위 밖이면 기본값 */
export function envInt(name: string, dflt: number, min: number, max: number): number {
  const raw = (process.env[name] ?? "").trim();
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n >= min && n <= max ? Math.floor(n) : dflt;
}

/** 목록 한 쪽 주소. 아임웹은 첫 쪽에 `page` 가 없다 */
export const listUrl = (base: string, path: string, page: number) => `${base}/${path}/${page > 1 ? `?page=${page}` : ""}`;
export const viewUrl = (base: string, path: string, idx: string) => `${base}/${path}/?bmode=view&idx=${idx}`;

export async function runImweb<B extends ImwebBoard>(cfg: ImwebConfig<B>, st: ImwebState, now = Date.now()): Promise<ImwebResult> {
  let failed = 0, pages = 0, listed = 0, calls = 0;
  const pause = async () => { if (calls++ > 0) await sleep(cfg.delayMs); };
  const seen: { idx: string; board: string; card: ListCard; fresh: boolean }[] = [];

  for (const b of cfg.boards) {
    let w = st.boards.get(b.path);
    if (!w || (w.doneAt && now - w.doneAt >= cfg.rewalkMs)) { w = { next: 2, doneAt: 0, prev: [] }; st.boards.set(b.path, w); }
    const want = [1];
    if (!w.doneAt && st.pending.size < cfg.maxDetail) {
      for (let p = w.next; p < w.next + cfg.pagesPerTick && p <= cfg.maxPages; p += 1) want.push(p);
    }
    for (const p of want) {
      try {
        await pause();
        const html = await cfg.get(listUrl(cfg.base, b.path, p));
        pages += 1;
        const cards = listCards(html, b.path);
        listed += cards.length;
        /* 게시판 안내(공지) 글은 공고가 아니다. 상세를 부르지 않는다 */
        for (const c of cards) if (!c.notice && !seen.some((s) => s.idx === c.idx)) seen.push({ idx: c.idx, board: b.path, card: c, fresh: p === 1 });
        /*
         * **다음 쪽 링크에 기대지 않는다.** 화면의 쪽 번호는 열 개씩만 보여서(487 은 12쪽) 10쪽에 11쪽 링크가
         * 없을 수 있다. 쪽에 새 카드가 있는 동안 page 를 하나씩 올리고, 빈 쪽이거나 앞 쪽과 같은 카드만
         * 돌아오면(아임웹은 끝 뒤 쪽에 마지막 쪽을 다시 줄 수 있다) 한 바퀴를 마친다
         */
        const ids = cards.map((c) => c.idx);
        const same = ids.length > 0 && ids.every((x) => w.prev.includes(x));
        if (p === 1) {
          if (w.next === 2) w.prev = ids;
          if (!ids.length || (!hasPage(html, b.path, 2) && ids.length < PAGE_FULL)) { w.doneAt = now; break; }
          continue;
        }
        if (!ids.length || same) { w.doneAt = now; break; }
        w.prev = ids;
        w.next = p + 1;
        if (p >= cfg.maxPages) { w.doneAt = now; break; }
      } catch (e) {
        /* 한 게시판이 실패해도 나머지는 받는다. 이 게시판은 다음 당번에 같은 쪽부터 */
        failed += 1;
        opFail({ operation: cfg.operation, ref: ref("board", b.path), step: "list", category: "upstream" }, e);
        break;
      }
    }
  }

  if (seen.length) {
    const known = await (cfg.known ?? ((r: string[]) => knownRefs(cfg.source, r)))(seen.map((s) => s.idx));
    for (const s of seen) {
      if (known.has(s.idx)) { st.pending.delete(s.idx); continue; }
      const had = st.pending.get(s.idx);
      st.pending.set(s.idx, { board: s.board, card: s.card, fresh: s.fresh || !!had?.fresh, tries: had?.tries ?? 0 });
    }
  }
  /* 첫 쪽에서 본 새 공고가 먼저, 그다음 밀린 번호(들어온 차례) */
  const queue = [...st.pending.entries()].sort((a, b) => Number(b[1].fresh) - Number(a[1].fresh)).slice(0, cfg.maxDetail);
  const rows: RawPosting[] = [];
  for (const [idx, p] of queue) {
    const b = cfg.boards.find((x) => x.path === p.board);
    if (!b) { st.pending.delete(idx); continue; }
    try {
      await pause();
      const row = cfg.toRow(b, idx, await cfg.get(viewUrl(cfg.base, b.path, idx)), p.card);
      st.pending.delete(idx);
      if (row) rows.push(row); else failed += 1;
    } catch (e) {
      failed += 1;
      /* 세 번 실패한 번호는 놓는다. 다음 바퀴에 목록에서 다시 보이면 다시 해 본다 */
      if (++p.tries >= 3) st.pending.delete(idx);
      opFail({ operation: cfg.operation, ref: ref("posting", idx), step: "detail", category: "upstream" }, e);
    }
  }
  const r = rows.length ? await (cfg.save ?? ingest)(rows) : { seen: 0, mapped: 0, unmapped: 0, stored: 0, skipped: { noTitle: 0, closed: 0 } };
  return {
    ok: pages > 0 || failed === 0, listed, pages, fresh: queue.length, pending: st.pending.size,
    ingested: r.stored, mapped: r.mapped, failed, skipped: r.skipped,
    error: !pages && failed ? "list" : undefined,
  };
}
