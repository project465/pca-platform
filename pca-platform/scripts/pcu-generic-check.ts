/**
 * **학과 이름만 바꾸면 같은 결과인가**(PCU 학과 콘텐츠 완성 §15).
 *
 * `pcu:content` 는 등록부에 **적힌 것**을 센다. 여기서 세는 것은 그 적어 둔
 * 것이 **학생이 받는 글에 실제로 닿았는가**다. 같은 Core 를 쓰는 학과 둘에
 * **똑같은 응답**을 넣고 결과 쪽을 받아 글자로 견준다.
 *
 * 둘이 받는 글은 같은 자리가 많은 것이 맞다(묶음 · 축 상태 · 할 일은 응답이
 * 정한다). 달라야 하는 것은 **그 전공의 사례와 읽는 차례**다. 그래서 두
 * 가지를 함께 센다: 쪽 전체의 겹침이 한도 아래인가, 그리고 **달라야 하는
 * 자리가 실제로 달라졌는가.**
 *
 *   UI_BASE=http://127.0.0.1:3100 V3_PREVIEW_OPEN='*' npm run pcu:generic
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";
import {
  BASE, assertFreshServer, assertPreviewServer, gateCreds, loadEnv, login, makeStudent,
} from "./_loop-fixture";
import { query } from "../src/lib/db";
import { allLeaves, offered, universities, visible } from "../src/lib/campus/registry";
import { core as coreEntry } from "../src/lib/me-v3/core-registry";
import {
  attemptOf, openAttempt, submit, type CampusEntry, type V3Attempt,
} from "../src/lib/me-v3/runtime/session";
import { PEOPLE, answerAll } from "./_v3-answer";

loadEnv();
const OUT = process.env.OUT ?? "var/pcu-generic";
const LIMIT = Number(process.env.LIMIT ?? "0");
/** 쪽 전체가 이만큼 겹치면 학과 이름만 바뀐 결과로 본다 */
const CAP = Number(process.env.CAP ?? "0.97");

function grams(s: string): Set<string> {
  const t = s.replace(/\s+/g, "");
  const out = new Set<string>();
  for (let i = 0; i + 3 <= t.length; i += 1) out.add(t.slice(i, i + 3));
  return out;
}
function jaccard(a: string, b: string): number {
  const A = grams(a), B = grams(b);
  if (!A.size || !B.size) return 0;
  let hit = 0;
  for (const g of A) if (B.has(g)) hit += 1;
  return hit / (A.size + B.size - hit);
}

/** 그 절의 글자. 없으면 빈 글 */
function section(text: string, head: string, until: string[]): string {
  const i = text.indexOf(head);
  if (i < 0) return "";
  let end = text.length;
  for (const u of until) {
    const j = text.indexOf(u, i + head.length);
    if (j >= 0 && j < end) end = j;
  }
  return text.slice(i, end);
}

async function main(): Promise<void> {
  assertFreshServer();
  mkdirSync(OUT, { recursive: true });
  const u = universities().find((x) => x.university_code === "PCU");
  if (!u) { console.error("PCU 를 등록부에서 찾지 못했다"); process.exit(1); }

  /* 같은 Core 를 쓰는 **서로 다른 학과** 둘을 고른다. Catalog 쌍둥이는 같은
     학과이므로 이름으로 가린다 */
  const leaves = allLeaves(u).filter(offered).filter((r) => visible(r.leaf))
    .filter((r) => r.leaf.core_code);
  const byCore = new Map<string, { code: string; name: string; entry: CampusEntry }[]>();
  for (const r of leaves) {
    const core = r.leaf.core_code as string;
    const list = byCore.get(core) ?? [];
    if (list.some((x) => x.name === r.leaf.name)) continue;
    list.push({
      code: r.leaf.code, name: r.leaf.name,
      entry: {
        university_code: u.university_code, college_code: r.college.code,
        department_code: r.leaf.code, core_code: core,
        specialization: r.leaf.specialization ?? null,
      },
    });
    byCore.set(core, list);
  }
  let pairs = [...byCore.entries()].filter(([, v]) => v.length >= 2)
    .map(([core, v]) => ({ core, a: v[0], b: v[1] }));
  if (LIMIT) pairs = pairs.slice(0, LIMIT);

  const gate = gateCreds();
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const out: string[] = [];
  let bad = 0;
  try {
    for (const { core } of pairs) {
      if (coreEntry(core).open_to_students === false) assertPreviewServer(core);
    }
    for (const { core, a, b } of pairs) {
      const texts: string[] = [];
      for (const side of [a, b]) {
        const mail = `gen-${side.code.toLowerCase()}@test.invalid`;
        const st = await makeStudent(mail);
        await query(
          `INSERT INTO entitlements
             (user_id, product_code, kind, tier, major_code, assessment_version, status)
           VALUES ($1,'ME_V3_PRO_KR','report','PRO','ME','ME_V3_2','active')`, [st.id]);
        const at = await openAttempt({
          userId: st.id, tier: "PRO", stage: "bachelor", gradField: null, campus: side.entry,
        });
        /* **두 자리에 똑같이 넣는다**: 다른 것은 학과뿐이다. 사람 B 는
           일부 경험과 일부 근거가 있는 처지라 결과지의 절이 가장 많이
           선다(사람 A 는 비어 있고 C 는 빈자리가 적다) */
        await answerAll(core, at, st.id, PEOPLE[1]);
        await submit((await attemptOf(at.id, st.id)) as V3Attempt);
        const ctx = await browser.newContext({
          viewport: { width: 1200, height: 900 },
          ...(gate ? { httpCredentials: gate } : {}),
        });
        const p = await login(ctx, mail, st.pw);
        await p.goto(`${BASE}/v3/${at.id}/result`, { waitUntil: "domcontentloaded" });
        await p.waitForTimeout(400);
        for (const d of await p.locator("details").all()) {
          await d.evaluate((el) => el.setAttribute("open", "")).catch(() => undefined);
        }
        const fold = p.locator("button", { hasText: "자세한 내용 보기" });
        if (await fold.count()) await fold.first().click().catch(() => undefined);
        await p.waitForTimeout(300);
        texts.push(await p.locator("body").innerText());
        await ctx.close();
      }
      const [ta, tb] = texts;
      writeFileSync(`${OUT}/${core}-${a.code}.txt`, `${ta}\n`);
      writeFileSync(`${OUT}/${core}-${b.code}.txt`, `${tb}\n`);
      const whole = jaccard(ta, tb);
      /* **달라야 하는 자리**: 그 전공의 사례와 읽는 차례가 서는 곳 */
      const where = section(ta, "어디에서 찾을지", ["이 다음에", "결과 읽는 기준"]);
      const whereB = section(tb, "어디에서 찾을지", ["이 다음에", "결과 읽는 기준"]);
      const sameWhere = where && whereB ? where === whereB : false;
      const line = `${core.padEnd(18)} ${a.name} ↔ ${b.name}`
        + ` — 쪽 겹침 ${whole.toFixed(2)}${sameWhere ? " · 이어 볼 곳이 글자까지 같다" : ""}`;
      if (whole >= CAP || sameWhere) { bad += 1; out.push(`  걸림  ${line}`); }
      else out.push(`  통과  ${line}`);
      console.log(out[out.length - 1]);
    }
  } finally {
    await browser.close();
  }
  console.log(`\n확인 ${pairs.length}짝 — 통과 ${pairs.length - bad} · 걸림 ${bad} · ${OUT}`);
  if (bad) process.exitCode = 1;
}

main().catch((e) => { console.error(e); process.exit(1); });
