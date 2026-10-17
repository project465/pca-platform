/**
 * **R5 제출 캡처 아홉 장**(§33).
 *
 * 확정된 Visual Direction(Variant C 기반 + Variant A 중앙 Hero)을 실제
 * 제품 코드에 적용한 뒤의 BIZ Result Hero + Summary 다. 긴 쪽을 통째로
 * 떠서 줄여 보내지 않는다: §33 이 요구한 자리를 그 자리의 폭 그대로
 * 잘라 떠서 **글자가 읽히는 크기**로 낸다.
 *
 *   Desktop 1440   첫 viewport 전체 · Hero · Summary 전체 · Action
 *   Mobile  390    첫 viewport · Hero · 내가 해본 경험 · Action · 거드는 둘
 *
 * **근거가 있는 응시로 뜬다**: 보기를 흔들어 고르면 경험이 거의 없는
 * 응답이 되고 그 결과지는 `아직 없어요` 로 찬다. 그 그림으로는 상품성을
 * 가릴 수 없다(`PERSON=C`).
 *
 *   UI_BASE=http://127.0.0.1:3100 V3_PREVIEW_OPEN='*' \
 *     OUT=docs/metri/shots/review-loop/r5 npx tsx scripts/lab/r5-shots.ts
 */
import {
  loadEnv, BASE, assertFreshServer, assertPreviewServer, gateCreds, login,
} from "../_loop-fixture";
loadEnv();
import { chromium } from "playwright";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import { query, queryOne } from "../../src/lib/db";
import { addStudentAccount } from "../../src/lib/campus/manage";
import { allLeaves, coreOf, university } from "../../src/lib/campus/registry";
import { attemptOf, type V3Attempt } from "../../src/lib/me-v3/runtime/session";
import { enterAssessment } from "../_v3-walk";
import { PEOPLE, answerAll } from "../_v3-answer";

const UNI = "PCU";
const CORE = process.env.CORE ?? "BIZ_CORE_V1";
const LEAF = process.env.LEAF ?? "PCU26_BIZ";
const OUT = process.env.OUT ?? "docs/metri/shots/review-loop/r5";

const seen = new Map<string, string>();
/** 같은 그림이 두 이름으로 저장되면 그 자리에서 멈춘다 */
function mark(file: string): void {
  const sum = createHash("sha256").update(readFileSync(file)).digest("hex").slice(0, 16);
  const had = seen.get(sum);
  if (had) throw new Error(`같은 그림이 두 이름으로: ${had} = ${file}`);
  seen.set(sum, file);
  console.log(`  떴다 ${file}`);
}

/** 첫 자리부터 끝 자리까지를 잘라 뜬다. 줄여 보내지 않게 폭을 그대로 둔다 */
async function clipTo(
  p: import("playwright").Page, from: string, to: string, file: string,
): Promise<void> {
  const box = await p.evaluate(([a, b]) => {
    const s = document.querySelector(a as string);
    const e = document.querySelector(b as string);
    if (!s) return null;
    const sr = s.getBoundingClientRect();
    const er = (e ?? s).getBoundingClientRect();
    /* **폭은 그 묶음에서 가장 넓은 자리를 따른다.** 첫 자리의 폭으로
       자르면 그보다 넓은 카드가 오른쪽에서 잘려 나간다 */
    const box = (s.parentElement ?? s).getBoundingClientRect();
    const left = Math.min(sr.left, er.left, box.left);
    const right = Math.max(sr.right, er.right, box.right);
    return {
      x: Math.max(0, left + window.scrollX - 8),
      y: Math.max(0, sr.top + window.scrollY - 8),
      width: Math.min(window.innerWidth, right - left + 16),
      height: er.bottom + window.scrollY - (sr.top + window.scrollY) + 16,
    };
  }, [from, to]);
  if (!box) throw new Error(`${from} 자리를 찾지 못했습니다`);
  await p.screenshot({ path: file, fullPage: true, clip: box });
  mark(file);
}

async function main(): Promise<void> {
  assertFreshServer();
  assertPreviewServer(CORE);
  mkdirSync(OUT, { recursive: true });
  const u = university(UNI);
  if (!u) throw new Error("등록부에 PCU 가 없습니다");
  const seat = allLeaves(u).find(
    (r) => r.leaf.code === LEAF && coreOf(r.leaf)?.code === CORE);
  if (!seat) throw new Error(`${LEAF} 자리가 ${CORE} 를 가리키지 않습니다`);

  const sid = `zzr2${Date.now().toString().slice(-8)}`;
  const org = await queryOne<{ id: string }>(
    `SELECT id::text FROM organizations WHERE code = $1`, [UNI]);
  if (!org) throw new Error("PCU 기관 줄이 없습니다");
  const actor = await queryOne<{ user_id: string; role: string; org_id: number }>(
    `SELECT m.user_id::text, m.role, m.org_id FROM memberships m
      WHERE m.org_id = $1::bigint AND m.role IN ('org_admin','org_manager')
      LIMIT 1`, [org.id]);
  if (!actor) throw new Error("PCU 담당자 줄이 없습니다");
  const st = await addStudentAccount(UNI, org.id, {
    student_id: sid, name: "검수용 학생", email: null, login_id: sid,
    college_code: seat.college.code, department_code: seat.leaf.code,
  }, { userId: actor.user_id, role: actor.role, orgId: Number(actor.org_id) });
  if (!st.ok || !st.password) throw new Error(`계정 발급 ${st.why ?? ""}`);
  const stu = await queryOne<{ id: string }>(
    `SELECT id::text FROM users WHERE login_id = $1`, [sid]);
  if (!stu) throw new Error("발급한 계정을 찾지 못했습니다");
  await query(`UPDATE users SET is_demo = FALSE WHERE id = $1::bigint`, [stu.id]);

  const browser = await chromium.launch();
  const gate = gateCreds();
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    ...(gate ? { httpCredentials: gate } : {}),
  });
  try {
    const p = await login(ctx, sid, st.password);
    await p.goto(`${BASE}/campus/${UNI.toLowerCase()}/d/${seat.leaf.code}`,
      { waitUntil: "networkidle" });
    for (let t = 0; t < 2 && !/\/v3\//.test(p.url()); t += 1) {
      await p.locator('form button[type="submit"]').first().click({ timeout: 5000 })
        .catch(() => undefined);
      await p.waitForURL((x) => !/\/campus\//.test(new URL(x).pathname),
        { timeout: 20000 }).catch(() => undefined);
      await p.waitForLoadState("networkidle").catch(() => undefined);
    }
    if (/\/v3\/start/.test(p.url())) {
      await p.getByText("학부", { exact: true }).click({ timeout: 5000 })
        .catch(() => undefined);
      await p.getByRole("button", { name: "검사 시작" }).click({ timeout: 5000 })
        .catch(() => undefined);
      await p.waitForURL(/\/v3\/\d+/, { timeout: 30000 }).catch(() => undefined);
      await p.waitForLoadState("networkidle").catch(() => undefined);
    }
    const att = /\/v3\/(\d+)/.exec(p.url())?.[1] ?? "";
    if (!att) throw new Error(`응시가 열리지 않았습니다 ${p.url()}`);
    await enterAssessment(p);

    const a = (await attemptOf(att, stu.id)) as V3Attempt;
    const pol = PEOPLE.find((x) => x.id === "C");
    if (!pol) throw new Error("사람 C 가 없습니다");
    await answerAll(CORE, a, stu.id, pol);
    await p.goto(`${BASE}/v3/${att}`, { waitUntil: "networkidle" });
    for (let t = 0; t < 3 && !/\/(done|result)$/.test(p.url()); t += 1) {
      const btn = p.locator("button.qs-btn-main, a.qs-btn-main").first();
      if (!(await btn.count())) break;
      const was = p.url();
      await btn.click({ force: true }).catch(() => undefined);
      await p.waitForURL((x) => x.href !== was, { timeout: 30000 })
        .catch(() => undefined);
      await p.waitForLoadState("networkidle").catch(() => undefined);
    }
    if (!/\/(done|result)/.test(p.url())) throw new Error(`제출 못함 ${p.url()}`);

    /* ── Desktop 1440 ── OPENING · NOW · NEXT */
    await p.goto(`${BASE}/v3/${att}/result`, { waitUntil: "networkidle" });
    await p.waitForTimeout(400);
    await clipTo(p, ".rs-open", ".rs-next", `${OUT}/desk-1-first.png`);
    /* 자른 자리가 겹치지만 **같은 그림은 아니다**: `mark()` 가 지문을
       견주므로 둘이 같은 그림이면 그 자리에서 멈춘다 */
    await clipTo(p, ".rs-open", ".rs-open", `${OUT}/desk-2-hero.png`);
    await clipTo(p, ".rs-now", ".rs-now", `${OUT}/desk-3-summary.png`);
    await clipTo(p, ".rs-next", ".rs-next", `${OUT}/desk-4-action.png`);

    /* ── Mobile 390 ── 첫 장은 **창 그대로** 뜬다: 묻는 것이
       `첫 viewport 에 무엇이 들어오는가` 이므로 긴 쪽을 이어 붙이면 그
       물음에 답할 수 없다 */
    const m = await ctx.newPage();
    await m.setViewportSize({ width: 390, height: 844 });
    await m.goto(`${BASE}/v3/${att}/result`, { waitUntil: "networkidle" });
    await m.waitForTimeout(400);
    await m.screenshot({ path: `${OUT}/mob-1-first.png` });
    mark(`${OUT}/mob-1-first.png`);
    await clipTo(m, ".rs-open", ".rs-open", `${OUT}/mob-2-hero.png`);
    await clipTo(m, ".rs-now", ".rs-now", `${OUT}/mob-3-experience.png`);
    await clipTo(m, ".rs-next", ".rs-next", `${OUT}/mob-4-action.png`);
    /* 다섯째는 **이어지는 자리**다. 첫 화면이 셋으로 끝난 뒤 스크롤이
       어디로 가는지를 보여 준다 */
    await clipTo(m, "section#evidence", "section#evidence",
      `${OUT}/mob-5-support.png`);

    console.log(`  응시 ${att} · ${CORE}`);
  } finally {
    await browser.close();
  }
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e); process.exit(1);
});
