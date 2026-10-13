/**
 * **배재대 학생 한 사람의 전체 길을 브라우저로 끝까지 밟는다.**
 *
 *   /campus/pcu → 학과 → 검사 시작 → 응시 → 제출 → 결과 → PDF
 *   → 내 CareerMatri → 경험 추가 → 반영 → 현재 상태
 *
 * `core:walk` 이 보는 것은 **종이까지**이고, 여기서는 그 뒤 작업공간의
 * 되돌아오는 길까지 본다. 짓고 있는 Core 는 학생에게 닫혀 있으므로 그
 * 칸을 잠시 열고 **반드시 되돌린다**.
 *
 *   UI_BASE=http://127.0.0.1:3100 CORE=BIZ_CORE_V1 TIER=BASIC \
 *     npx tsx scripts/v3-pcu-flow.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { chromium, type Page } from "playwright";
import {
  BASE, assertFreshServer, fillExperience, gateCreds, loadEnv, login, makeStudent,
} from "./_loop-fixture";
import { walk } from "./_v3-walk";
import { query, queryOne } from "../src/lib/db";
import { core as coreEntry, defaultCore } from "../src/lib/me-v3/core-registry";
import { allLeaves, university } from "../src/lib/campus/registry";

loadEnv();

const CORE = process.env.CORE ?? defaultCore();
const TIER = (process.env.TIER ?? "BASIC") as "BASIC" | "STANDARD" | "PRO";
const REGS = [
  "sites/pca-platform/content/major-cores.json",
  ".next/standalone/sites/pca-platform/content/major-cores.json",
];

let pass = 0; const bad: string[] = [];
const ok = (w: string, c: boolean, saw = "") => {
  if (c) { pass += 1; console.log(`  통과  ${w}${saw ? " — " + saw : ""}`); }
  else { bad.push(w); console.log(`  걸림  ${w}${saw ? " — " + saw : ""}`); }
};

function setOpen(open: boolean): void {
  for (const f of REGS) {
    const reg = JSON.parse(readFileSync(f, "utf8")) as
      { cores: { code: string; open_to_students?: boolean }[] };
    const row = reg.cores.find((c) => c.code === CORE);
    if (row) { row.open_to_students = open; writeFileSync(f, `${JSON.stringify(reg, null, 1)}\n`); }
  }
}

async function main(): Promise<void> {
  assertFreshServer();
  const u = university("PCU");
  if (!u) throw new Error("등록부에 PCU 가 없습니다");
  const row = allLeaves(u).find((r) => r.leaf.core_code === CORE);
  if (!row) throw new Error(`${CORE} 를 가리키는 배재대 자리가 없습니다`);
  const leaf = row.leaf;
  console.log(`  ${CORE} · ${TIER} · ${leaf.name} (${leaf.code})\n`);

  const mail = `pcu-flow-${CORE.toLowerCase().replace(/_/g, "-")}@test.invalid`;
  const st = await makeStudent(mail);
  await query(
    `INSERT INTO entitlements
       (user_id, product_code, kind, tier, major_code, assessment_version, status)
     VALUES ($1,$2,'report',$3,'ME','ME_V3_2','active')`,
    [st.id, `ME_V3_${TIER}_KR`, TIER]);

  const closed = coreEntry(CORE).open_to_students === false;
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const gate = gateCreds();
  try {
    if (closed) setOpen(true);
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      ...(gate ? { httpCredentials: gate } : {}),
    });
    const errs: string[] = [];
    const p: Page = await login(ctx, mail, st.pw);
    p.on("pageerror", (e) => errs.push(String(e.message).slice(0, 120)));
    p.on("response", (r) => { if (r.status() >= 500) errs.push(`${r.status()} ${r.url()}`); });

    /* 1. 학교 진입 */
    await p.goto(`${BASE}/campus/${u.university_code.toLowerCase()}`, { waitUntil: "networkidle" });
    ok("학교 진입이 열린다", (await p.locator("body").innerText()).includes(u.university_name));

    /* 2. 학과 상세 */
    await p.goto(`${BASE}/campus/${u.university_code.toLowerCase()}/d/${leaf.code}`,
      { waitUntil: "networkidle" });
    const det = await p.locator("body").innerText();
    ok("학과 상세가 선다", det.includes(leaf.name), leaf.name);
    ok("검사 시작 단추가 있다", await p.getByRole("button", { name: "이 전공으로 검사 시작" }).count() > 0);

    /* 3. 검사 시작 */
    await p.getByRole("button", { name: "이 전공으로 검사 시작" }).click();
    await p.waitForURL(/\/v3\/start/, { timeout: 30000 });
    await p.getByText("학부", { exact: true }).click();
    await p.getByRole("button", { name: "검사 시작" }).click();
    await p.waitForURL(/\/v3\/\d+/, { timeout: 30000 }).catch(() => undefined);
    const m = /\/v3\/(\d+)/.exec(p.url());
    ok("응시가 열린다", !!m, new URL(p.url()).pathname);
    const attempt = m?.[1] ?? "";

    /* 4. 끝까지 */
    const w = await walk(p, 200);
    ok("끝까지 간다", w.done, `화면 ${w.screens}`);
    const saved = await queryOne<{ n: string }>(
      `SELECT count(*)::text AS n FROM v3_responses WHERE attempt_id = $1`, [attempt]);
    ok("답이 서버에 쌓인다", Number(saved?.n ?? 0) > 20, `${saved?.n ?? 0}개`);

    /* 5. 결과와 종이 */
    await p.goto(`${BASE}/v3/${attempt}/result`, { waitUntil: "domcontentloaded" });
    const res = await p.locator("body").innerText();
    ok("결과 첫 화면이 선다", res.includes("지금 확인된 것"));
    /* **제목 줄을 본다.** 본문 어딘가에 전공 이름이 있는 것으로는 모자란다:
       제목이 다른 전공을 적고 있어도 그 검사는 지나간다 */
    const kicker = (res.match(/([가-힣·A-Za-z ]+) 진로 진단 결과/) ?? ["", ""])[1].trim();
    ok("결과지 제목이 이 전공을 적는다", kicker === (coreEntry(CORE).name_ko ?? ""),
      `${kicker || "없다"} ≠ ${coreEntry(CORE).name_ko ?? ""}`);
    const pdf = await p.request.get(`${BASE}/v3/${attempt}/result/pdf`, { timeout: 180000 });
    ok("종이가 나온다", pdf.status() === 200, `${pdf.status()}`);

    /* 6. 작업공간 */
    await p.goto(`${BASE}/me`, { waitUntil: "networkidle" });
    const home = await p.locator("body").innerText();
    ok("작업공간 홈이 결과를 든다", /결과|현재 상태/.test(home));

    /* 7. 경험 추가 */
    const picked = await fillExperience(p, "학생회 행사 예산 집행");
    ok("경험이 저장된다", picked > 0 || /저장|더했/.test(await p.locator("body").innerText()),
      `고른 영역 ${picked}`);
    const exp = await queryOne<{ n: string }>(
      `SELECT count(*)::text AS n FROM v3_experiences WHERE user_id = $1`, [st.id]);
    ok("경험 줄이 쌓인다", Number(exp?.n ?? 0) > 0, `${exp?.n ?? 0}개`);

    /* 8. 반영 */
    const apply = p.getByRole("button", { name: /현재 상태에 반영|반영하기/ });
    if (await apply.count()) {
      await apply.first().click();
      await p.waitForLoadState("networkidle").catch(() => undefined);
    }
    const prof = await queryOne<{ at: string | null }>(
      `SELECT recomputed_at::text AS at FROM career_profiles
        WHERE user_id = $1 AND core_code = $2`, [st.id, CORE]);
    ok("지금 값이 적힌다", !!prof?.at, prof?.at ?? "없다");

    /* 9. 현재 상태 */
    await p.goto(`${BASE}/me/state`, { waitUntil: "networkidle" });
    const state = await p.locator("body").innerText();
    ok("현재 상태가 선다", state.includes("현재 상태"));
    ok("현재 상태에 안쪽 코드가 없다",
      !new RegExp(`${CORE}|\\bTD\\d\\d\\b|\\bJ[1-8]\\b`).test(state),
      (state.match(new RegExp(`${CORE}|\\bTD\\d\\d\\b|\\bJ[1-8]\\b`)) ?? ["없다"])[0]);

    ok("브라우저 오류 0", errs.length === 0, errs[0] ?? "없음");
    await ctx.close();
  } finally {
    if (closed) setOpen(false);
    await browser.close();
  }
  console.log(`\n확인 ${pass + bad.length}가지 — 통과 ${pass} · 걸림 ${bad.length}`);
  if (bad.length) process.exitCode = 1;
}

main().catch((e) => { console.error(e); process.exit(1); });
