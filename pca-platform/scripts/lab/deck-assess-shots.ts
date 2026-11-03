/**
 * 소개 PPT 의 '검사는 이렇게 풉니다' 장에 넣을 화면을 찍는다.
 *
 * 학교가 계정을 발급한 학생 하나로 학과 자리에서 검사를 열고, 사람 C 의
 * 규칙으로 답을 채운 뒤 **단계마다 첫 화면**을 그 순서대로 찍는다. 답이
 * 들어 있는 상태라 고른 칸이 보인다. 끝에 제출하고 끝 화면까지 찍는다.
 *
 *   UNI=JJU LEAF=JJU26_AI CORE=CS_CORE_V1 OUT=var/deck/jju \
 *     UI_BASE=http://127.0.0.1:3100 V3_PREVIEW_OPEN='*' \
 *     npx tsx scripts/lab/deck-assess-shots.ts
 */
import { loadEnv, BASE, gateCreds } from "../_loop-fixture";
loadEnv();
import { chromium, type Page } from "playwright";
import { mkdirSync } from "node:fs";
import { query, queryOne } from "../../src/lib/db";
import { addStudentAccount } from "../../src/lib/campus/manage";
import { allLeaves, coreOf, university } from "../../src/lib/campus/registry";
import { attemptOf, planFor, type V3Attempt } from "../../src/lib/me-v3/runtime/session";
import { enterAssessment } from "../_v3-walk";
import { PEOPLE, answerAll } from "../_v3-answer";

const UNI = process.env.UNI ?? "JJU";
const LEAF = process.env.LEAF ?? "JJU26_AI";
const CORE = process.env.CORE ?? "CS_CORE_V1";
const OUT = process.env.OUT ?? "var/deck/jju";

async function snap(p: Page, id: string, full = false): Promise<void> {
  await p.waitForTimeout(500);
  await p.screenshot({ path: `${OUT}/${id}.png`, fullPage: full });
  console.log(`  찍음  ${id}  ${p.url().replace(BASE, "")}`);
}

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  const u = university(UNI);
  if (!u) throw new Error(`등록부에 ${UNI} 가 없습니다`);
  const seat = allLeaves(u).find((r) => r.leaf.code === LEAF && coreOf(r.leaf)?.code === CORE);
  if (!seat) throw new Error(`${LEAF} 자리가 ${CORE} 를 가리키지 않습니다`);
  const org = await queryOne<{ id: string }>(`SELECT id::text FROM organizations WHERE code = $1`, [UNI]);
  if (!org) throw new Error(`${UNI} 기관 줄이 없습니다`);
  const actor = await queryOne<{ user_id: string; role: string; org_id: number }>(
    `SELECT m.user_id::text, m.role, m.org_id FROM memberships m
      WHERE m.org_id = $1::bigint AND m.role IN ('org_admin','org_manager') LIMIT 1`, [org.id]);
  if (!actor) throw new Error(`${UNI} 담당자 줄이 없습니다`);
  const sid = `20261${Date.now().toString().slice(-4)}`;
  const st = await addStudentAccount(UNI, org.id, {
    student_id: sid, name: "김지우", email: null, login_id: sid,
    college_code: seat.college.code, department_code: seat.leaf.code,
  }, { userId: actor.user_id, role: actor.role, orgId: Number(actor.org_id) });
  if (!st.ok || !st.password) throw new Error(`계정 발급 ${st.why ?? ""}`);
  const loginId = st.login_id ?? sid;
  const stu = await queryOne<{ id: string }>(`SELECT id::text FROM users WHERE login_id = $1`, [loginId]);
  if (!stu) throw new Error("발급한 계정을 찾지 못했습니다");

  const browser = await chromium.launch();
  const gate = gateCreds();
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, locale: "ko-KR",
    ...(gate ? { httpCredentials: gate } : {}),
  });
  const p = await ctx.newPage();
  try {
    await p.goto(`${BASE}/campus/${UNI.toLowerCase()}/login`, { waitUntil: "networkidle" });
    await p.waitForTimeout(1200);
    await p.fill('input[name="identifier"]', loginId);
    await p.fill('input[type="password"]', st.password);
    await p.click('button[type="submit"]');
    await p.waitForURL((x) => !/\/login/.test(new URL(x).pathname), { timeout: 30000 }).catch(() => undefined);
    await p.goto(`${BASE}/campus/${UNI.toLowerCase()}/d/${seat.leaf.code}`, { waitUntil: "networkidle" });
    await snap(p, "00-dept");
    for (let t = 0; t < 2 && !/\/v3\//.test(p.url()); t += 1) {
      await p.getByRole("button", { name: /검사 시작|이어서|이어하기/ }).first().click({ timeout: 5000 }).catch(() => undefined);
      await p.waitForURL((x) => !/\/campus\//.test(new URL(x).pathname), { timeout: 20000 }).catch(() => undefined);
      await p.waitForLoadState("networkidle").catch(() => undefined);
    }
    if (/\/v3\/start/.test(p.url())) {
      await p.getByText("학부", { exact: true }).click({ timeout: 5000 }).catch(() => undefined);
      await p.waitForTimeout(400);
      await snap(p, "01-start");
      await p.getByRole("button", { name: "검사 시작" }).click({ timeout: 5000 }).catch(() => undefined);
      await p.waitForURL(/\/v3\/\d+/, { timeout: 30000 }).catch(() => undefined);
      await p.waitForLoadState("networkidle").catch(() => undefined);
    }
    const att = /\/v3\/(\d+)/.exec(p.url())?.[1] ?? "";
    if (!att) throw new Error(`응시가 열리지 않았다 ${p.url()}`);
    await snap(p, "02-intro");
    await enterAssessment(p);

    const a0 = (await attemptOf(att, stu.id)) as V3Attempt;
    const pol = PEOPLE.find((x) => x.id === "C")!;
    await answerAll(CORE, a0, stu.id, pol);
    const a = (await attemptOf(att, stu.id)) as V3Attempt;
    const plan = await planFor(a);
    const want: [string, (s: { stage: string; kind: string; id: string }) => boolean][] = [
      ["10-industry", (s) => s.kind === "pick-industry"],
      ["11-scene", (s) => s.kind === "scene"],
      ["12-sweep", (s) => s.kind === "sweep"],
      ["13-judge", (s) => s.stage === "JUDGE" && s.kind === "pair"],
      ["14-deep", (s) => s.stage === "DEEP"],
      ["15-evidence", (s) => s.kind === "checklist"],
      ["16-pack", (s) => s.stage === "PACK" && s.kind === "single"],
      ["17-translate", (s) => s.stage === "TRANSLATE" && s.kind === "group"],
    ];
    for (const [name, f] of want) {
      const i = plan.screens.findIndex(f as never);
      if (i < 0) { console.log(`  없음  ${name}`); continue; }
      await p.goto(`${BASE}/v3/${att}?s=${i}`, { waitUntil: "networkidle" });
      await snap(p, name);
      await snap(p, `${name}-full`, true);
    }
    /* 마지막 화면에서 제출 */
    await p.goto(`${BASE}/v3/${att}`, { waitUntil: "networkidle" });
    for (let t = 0; t < 4 && !/\/(done|result)$/.test(p.url()); t += 1) {
      const btn = p.locator("button.qs-btn-main, a.qs-btn-main").first();
      if (!(await btn.count())) break;
      const was = p.url();
      await btn.click({ force: true }).catch(() => undefined);
      await p.waitForURL((x) => x.href !== was, { timeout: 30000 }).catch(() => undefined);
      await p.waitForLoadState("networkidle").catch(() => undefined);
    }
    await snap(p, "20-done");
    console.log(`  응시 ${att} · 화면 ${plan.screens.length}`);
  } finally {
    await browser.close();
    await query(`SELECT 1`);
  }
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
