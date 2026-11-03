/**
 * `/me/jobs` 를 공고가 모인 상태와 모이기 전 상태로 찍는다.
 *
 *   UI_BASE=http://127.0.0.1:3100 OUT=docs/metri/shots/jobs npx tsx scripts/lab/jobs-shots.ts
 *
 * 넣는 공고는 전부 `source = 'zz-shot'` 이고 끝에서 지운다. **화면이 어떻게
 * 서는지를 보는 재료**이고 시장 자료가 아니다.
 */
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
import { loadEnv, BASE, makeStudent, cloneFinished, login, gateCreds } from "../_loop-fixture";

loadEnv();

async function main() {
  const { query, queryOne } = await import("../../src/lib/db");
  const { coreFile } = await import("../../src/lib/me-v3/core-registry");
  const { ingest } = await import("../../src/lib/jobs/ingest");
  const OUT = process.env.OUT || "docs/metri/shots/jobs";
  mkdirSync(OUT, { recursive: true });
  const SRC = "zz-shot";
  await query(`DELETE FROM v3_job_postings WHERE source = $1`, [SRC]);

  const who = "zz-jobs-shot";
  const { id, pw } = await makeStudent(who);
  const att = await cloneFinished(id, "PRO");
  if (!att) throw new Error("베껴 올 끝낸 응시가 없습니다");
  const core = (await queryOne<{ c: string }>(
    `SELECT core_code AS c FROM v3_attempts WHERE id = $1::bigint`, [att]))!.c;
  const aliases = (coreFile<{ job_aliases?: { posting_name: string }[] }>(core, "taxonomy")
    .job_aliases ?? []).map((a) => a.posting_name);

  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
  const shot = async (name: string, width: number) => {
    const ctx = await browser.newContext({
      viewport: { width, height: 900 }, httpCredentials: gateCreds() ?? undefined,
    });
    const p = await login(ctx, who, pw);
    await p.goto(`${BASE}/me/jobs`, { waitUntil: "networkidle" });
    const h = await p.locator("h1").first().innerText().catch(() => "");
    const over = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    await p.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
    console.log(`  ${name} — 머리 "${h}" · 가로 넘침 ${over ? "있음" : "없음"}`);
    await ctx.close();
  };

  try {
    await shot("jobs-empty-desktop", 1440);
    await shot("jobs-empty-mobile", 390);

    const today = new Date();
    const day = (n: number) => new Date(today.getTime() - n * 86400_000).toISOString().slice(0, 10);
    const addr = ["서울 중구", "세종 어진동", "대전 유성구", "부산 해운대구", "광주 북구", "경기 성남시"];
    const rows = Array.from({ length: 42 }, (_, i) => ({
      source: SRC, sourceRef: `s${i}`,
      title: `${aliases[i % Math.max(1, aliases.length)] ?? "담당"} 신입`,
      body: "", address: addr[i % addr.length], postedOn: day(i % 40),
    }));
    const r = await ingest(rows);
    const mapped = await queryOne<{ n: number }>(
      `SELECT count(*)::int AS n FROM v3_job_postings WHERE source = $1 AND core_code = $2`, [SRC, core]);
    console.log(`  넣은 공고 ${r.seen} · 그 전공으로 분류 ${mapped?.n} (${core})`);

    await shot("jobs-ready-desktop", 1440);
    await shot("jobs-ready-mobile", 390);
  } finally {
    await browser.close();
    await query(`DELETE FROM v3_job_postings WHERE source = $1`, [SRC]);
    process.exit(0);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
