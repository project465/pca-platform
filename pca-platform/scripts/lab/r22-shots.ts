/**
 * **작업공간 홈 제출 캡처**(R22 · 목표 화면 대조).
 *
 * 받은 목표 화면(`docs/metri/shots/reference/reference-home-2026-10-18.png`)
 * 과 나란히 놓고 읽을 그림만 뜬다. 자리 목록을 주소로 열지 않고 **제품과
 * 같은 길**로 선다: 학과를 고른 학생 계정을 세우고 끝낸 응시를 붙이고
 * 경험 하나를 적어 둔 뒤 홈을 연다. 그래야 그 화면에 영역 칸과 기록 줄이
 * 실제로 서고, 빈 상태의 그림으로 목표 화면과 견주지 않게 된다.
 *
 *   UI_BASE=http://127.0.0.1:3100 V3_PREVIEW_OPEN='*' \
 *     V3_CAMPUS_FIXTURE=scripts/fixtures/campus-zztest.json \
 *     OUT=docs/metri/shots/review-loop/r22 npx tsx scripts/lab/r22-shots.ts
 */
import {
  loadEnv, BASE, assertFreshServer, assertPreviewServer,
  makeStudent, cloneFinished, login,
} from "../_loop-fixture";
loadEnv();
import { chromium, type Page } from "playwright";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import { query } from "../../src/lib/db";

const CORE = process.env.CORE ?? "BIZ_CORE_V1";
const OUT = process.env.OUT ?? "docs/metri/shots/review-loop/r22";

const seen = new Map<string, string>();
/** 같은 그림이 두 이름으로 저장되면 그 자리에서 멈춘다 */
function mark(file: string): void {
  const sum = createHash("sha256").update(readFileSync(file)).digest("hex").slice(0, 16);
  const had = seen.get(sum);
  if (had) throw new Error(`같은 그림이 두 이름으로: ${had} = ${file}`);
  seen.set(sum, file);
  console.log(`  떴다 ${file}`);
}

/** 한 자리와 그 **아래로 떠 있는 것**까지 뜬다(결과 목록 · 서랍) */
async function clip(
  p: Page, sel: string, down: number, file: string,
): Promise<void> {
  const box = await p.evaluate(([q, h]) => {
    const e = document.querySelector(q as string);
    if (!e) return null;
    const r = e.getBoundingClientRect();
    return {
      x: Math.max(0, r.left + window.scrollX - 16),
      y: Math.max(0, r.top + window.scrollY - 16),
      width: Math.min(window.innerWidth, r.width + 32),
      height: r.height + 32 + (h as number),
    };
  }, [sel, down] as [string, number]);
  if (!box) throw new Error(`${sel} 자리가 없습니다`);
  await p.screenshot({ path: file, clip: box });
  mark(file);
}

/** 한 자리를 뜬다. **붙어 있는 띠를 잠시 감춘다** */
async function shot(p: Page, sel: string, file: string): Promise<void> {
  const e = p.locator(sel).first();
  if (!(await e.count())) throw new Error(`${sel} 자리가 없습니다`);
  await e.scrollIntoViewIfNeeded().catch(() => undefined);
  await p.waitForTimeout(160);
  await e.screenshot({ path: file });
  mark(file);
}

async function main(): Promise<void> {
  assertFreshServer();
  assertPreviewServer(CORE);
  mkdirSync(OUT, { recursive: true });

  const who = `r22-${Date.now().toString(36)}`;
  const { id, pw } = await makeStudent(who);
  /* 목표 화면은 **기록이 쌓인 사람**의 홈이다. 빈 상태로 견주면 칸이
     서지 않아 무엇이 다른지 읽을 수 없다 */
  const att = await cloneFinished(id, "PRO");
  if (!att) throw new Error("끝낸 응시를 베껴 올 수 없습니다");
  await query(
    `INSERT INTO v3_experiences
       (user_id, core_code, kind, title, started_on, td_codes, decisions)
     VALUES ($1, $2, 'project', '학생회 예산 배분 회의 정리', '2025-09-01',
             ARRAY['TD01'], ARRAY['쓸 돈과 안 쓸 돈을 갈라 적었다'])`, [id, CORE]);

  const b = await chromium.launch();
  try {
    const d = await b.newContext({ viewport: { width: 1440, height: 900 } });
    const p = await login(d, who, pw);
    await p.goto(`${BASE}/me`, { waitUntil: "networkidle" });
    await p.waitForTimeout(400);
    await p.screenshot({ path: `${OUT}/d1-home.png` });
    mark(`${OUT}/d1-home.png`);
    /* **쪽이 창에 들어오면 전체 그림을 따로 뜨지 않는다.** 같은 그림이
       두 이름으로 남고, 그러면 다음 사람이 둘을 다른 상태로 읽는다 */
    const tall = await p.evaluate(() =>
      document.documentElement.scrollHeight > window.innerHeight + 1);
    if (tall) {
      await p.screenshot({ path: `${OUT}/d2-home-full.png`, fullPage: true });
      mark(`${OUT}/d2-home-full.png`);
    } else {
      console.log("  쪽이 창에 들어온다 — 전체 그림은 뜨지 않는다");
    }
    /* 머리 오른쪽 줄 셋을 따로 뜬다: 목표 화면의 그 자리와 견주는 그림 */
    await shot(p, ".cm-utilrow", `${OUT}/d3-utilrow.png`);
    /* 바로가기 찾기가 **실제로 찾는다**는 것을 그림으로 남긴다 */
    await p.fill(".cm-find input", "경험");
    await p.waitForTimeout(260);
    /* **찾은 줄까지 담는다.** 결과는 `.cm-find` 밖으로 떠 있어서 그
       칸만 뜨면 찍히지 않는다. 한 번 그렇게 찍혀 빈 칸 그림이 남았다 */
    await clip(p, ".cm-utilrow", 520, `${OUT}/d4-find.png`);
    const hits = await p.locator(".cm-find-pop a").count();
    if (!hits) throw new Error("바로가기 찾기가 한 줄도 내놓지 않았습니다");
    console.log(`  찾았다 ${hits}줄`);
    /* 없는 말로 찾으면 그 사실과 무엇으로 찾는지가 선다 */
    await p.fill(".cm-find input", "zzqq");
    await p.waitForTimeout(260);
    await clip(p, ".cm-utilrow", 520, `${OUT}/d5-find-none.png`);
    await shot(p, ".cm-tiles", `${OUT}/d6-tiles.png`);
    await d.close();

    const mc = await b.newContext({
      viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true,
      hasTouch: true,
    });
    const m = await login(mc, who, pw);
    await m.goto(`${BASE}/me`, { waitUntil: "networkidle" });
    await m.waitForTimeout(400);
    await m.screenshot({ path: `${OUT}/m7-home.png` });
    mark(`${OUT}/m7-home.png`);
    const mtall = await m.evaluate(() =>
      document.documentElement.scrollHeight > window.innerHeight + 1);
    if (mtall) {
      await m.screenshot({ path: `${OUT}/m8-home-full.png`, fullPage: true });
      mark(`${OUT}/m8-home-full.png`);
    }
    /* 좁은 화면에서는 그 줄이 서지 않는다(위 띠가 그 일을 한다).
       **그것도 적어 둔다**: 안 서는 것이 설계이고 빠뜨린 것이 아니다 */
    const row = await m.locator(".cm-utilrow").isVisible().catch(() => false);
    console.log(`  손전화 실용 줄: ${row ? "선다" : "서지 않는다(위 띠가 든다)"}`);
    const wide = await m.evaluate(() =>
      document.documentElement.scrollWidth - window.innerWidth);
    if (wide > 1) throw new Error(`손전화에서 가로로 ${wide}px 밀린다`);
    await mc.close();
  } finally {
    await b.close();
  }
  console.log(`\n떴다 ${seen.size}장 — ${OUT}`);
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
