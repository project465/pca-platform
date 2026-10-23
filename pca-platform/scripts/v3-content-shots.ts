/**
 * **대표 Core 여덟의 실제 화면을 찍는다**(상용 콘텐츠 QA §21).
 *
 * 코드가 통과한 것으로 상용 품질을 판정하지 않는다. 자리마다 다섯 장이다:
 * 응시 화면 · 결과 첫 화면 · 종이 첫 쪽 · 종이 중간 쪽 · 종이 마지막 쪽.
 * 종이는 `v3:content:qa` 가 떠 둔 것을 쪽 그림으로 바꾼다(같은 파일을 두
 * 번 뽑지 않는다).
 *
 * 응시 화면은 **그 자리에서 새로 연다**: 끝낸 응시로는 묻는 화면을 볼 수
 * 없다. 찍는 자리는 `보기 넷이 선 화면` 이고, 그 화면이 **그 전공의 말에
 * 붙는 쉬운 말 한 줄**(§5)을 들고 있는지도 같이 센다.
 *
 *   UI_BASE=http://127.0.0.1:3100 V3_PREVIEW_OPEN='*' npx tsx scripts/v3-content-shots.ts
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { chromium } from "playwright";
import {
  BASE, assertFreshServer, assertPreviewServer, gateCreds, loadEnv, login, makeStudent,
} from "./_loop-fixture";
import { query } from "../src/lib/db";
import { allLeaves, university } from "../src/lib/campus/registry";
import {
  attemptOf, content, moveTo, openAttempt, saveAnswer, viewOf, itemOf,
  type CampusEntry, type V3Attempt,
} from "../src/lib/me-v3/runtime/session";
import { termGlossOf } from "../src/lib/me-v3/runtime/terms";

loadEnv();

/** 받은 규격 §21 의 여덟 자리 */
const CORES = (process.env.CORES ?? [
  "BIZ_CORE_V1", "EE_CORE_V1", "CS_CORE_V1", "PUBADM_CORE_V1",
  "BT_CORE_V1", "NURSING_CORE_V1", "MEDIA_CORE_V1", "CIV_CORE_V1",
].join(",")).split(",");
const SRC = process.env.SRC ?? "var/content-qa-final";
const OUT = process.env.OUT ?? "docs/metri/shots/content-qa";

function leafOf(core: string): CampusEntry | null {
  const u = university("PCU");
  if (!u) return null;
  const row = allLeaves(u).find((r) => r.leaf.core_code === core);
  if (!row) return null;
  return {
    university_code: u.university_code, college_code: row.college.code,
    department_code: row.leaf.code, core_code: core,
    specialization: row.leaf.specialization ?? null,
  };
}

/** 종이 한 쪽을 그림으로. 같은 종이를 다시 뽑지 않는다 */
function page(pdf: string, n: number, out: string): boolean {
  try {
    execFileSync("pdftoppm", ["-png", "-r", "110", "-f", String(n), "-l", String(n),
      pdf, out]);
    return true;
  } catch { return false; }
}

async function main(): Promise<void> {
  assertFreshServer();
  mkdirSync(OUT, { recursive: true });
  const gate = gateCreds();
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const rows: string[] = [];
  try {
    for (const core of CORES) assertPreviewServer(core);
    for (const core of CORES) {
      const tag = core.toLowerCase().replace(/_core_v\d$/, "");
      const problems: string[] = [];

      /* ── 종이 세 쪽 ── */
      const pdf = `${SRC}/${core}-C.pdf`;
      if (!existsSync(pdf)) problems.push("종이가 없다(먼저 v3:content:qa)");
      else {
        const raw = readFileSync(pdf, "latin1");
        const pages = (raw.match(/\/Type\s*\/Page[^s]/g) ?? []).length;
        const mid = Math.max(2, Math.ceil(pages / 2));
        for (const [n, name] of [[1, "pdf1"], [mid, "pdfmid"], [pages, "pdflast"]] as
          [number, string][]) {
          if (!page(pdf, n, `${OUT}/${tag}-${name}`)) problems.push(`${n}쪽 그림을 못 만들었다`);
        }
      }

      /* ── 결과 첫 화면 ── */
      const mail = `shots-${tag}@test.invalid`;
      const st = await makeStudent(mail);
      await query(
        `INSERT INTO entitlements
           (user_id, product_code, kind, tier, major_code, assessment_version, status)
         VALUES ($1,'ME_V3_PRO_KR','report','PRO','ME','ME_V3_2','active')`, [st.id]);
      const leaf = leafOf(core);
      const a = await openAttempt({
        userId: st.id, tier: "PRO", stage: "bachelor", gradField: null, campus: leaf,
      });
      /* 격자만 채워 **보기 넷이 선 화면**까지 간다. 제출하지 않는다:
         여기서 찍는 것은 묻는 화면이다 */
      for (const d of content(core).domains.domains) {
        await saveAnswer(a.id, `G_${d.code}_INT`, { kind: "scale5", value: 5 });
        await saveAnswer(a.id, `G_${d.code}_EXP`, { kind: "exposure", value: 2 });
        await saveAnswer(a.id, `G_${d.code}_LEA`, { kind: "scale5", value: 4 });
      }
      let cur = (await attemptOf(a.id, st.id)) as V3Attempt;
      let want: string | null = null, at = -1, guard = 0, gloss = "";
      for (;;) {
        if ((guard += 1) > 200) break;
        const v = await viewOf(cur, want);
        const level = v.screen.items.some((id) =>
          itemOf(core, id)?.response_scale === "L0~L3");
        const g = termGlossOf(core, v.screen.items
          .map((id) => itemOf(core, id)?.wording ?? "").join(" "));
        /* **받침이 선 화면을 먼저 찍는다**: §5 가 묻는 자리가 그 화면이다 */
        if (level && (g || at < 0)) { at = v.index; gloss = g ?? ""; if (g) break; }
        if (!v.nextId) break;
        await moveTo(a.id, v.nextId);
        want = v.nextId;
        cur = (await attemptOf(a.id, st.id)) as V3Attempt;
      }
      const ctx = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        ...(gate ? { httpCredentials: gate } : {}),
      });
      const p = await login(ctx, mail, st.pw);
      await p.goto(`${BASE}/v3/${a.id}?s=${at}`, { waitUntil: "domcontentloaded" });
      await p.waitForTimeout(500);
      await p.screenshot({ path: `${OUT}/${tag}-assessment.png` });
      const seen = await p.locator("body").innerText();
      if (gloss && !seen.includes(gloss.split(/ — |: /)[0])) {
        problems.push("받침이 화면에 서지 않는다");
      }

      /* 결과 첫 화면은 끝낸 응시가 필요하다. `v3:content:qa` 의 그 사람으로 본다 */
      const done = await query<{ id: string }>(
        `SELECT a.id::text FROM v3_attempts a JOIN users u ON u.id = a.user_id
          WHERE u.login_id = $1 AND a.status = 'scored' ORDER BY a.id DESC LIMIT 1`,
        [`cqa-${tag}-C@test.invalid`]);
      if (!done.length) problems.push("끝낸 응시가 없다(먼저 v3:content:qa)");
      else {
        const pw2 = await makeStudentPw(`cqa-${tag}-C@test.invalid`);
        const ctx2 = await browser.newContext({
          viewport: { width: 1440, height: 900 },
          ...(gate ? { httpCredentials: gate } : {}),
        });
        const p2 = await login(ctx2, `cqa-${tag}-C@test.invalid`, pw2);
        await p2.goto(`${BASE}/v3/${done[0].id}/result`, { waitUntil: "domcontentloaded" });
        await p2.waitForTimeout(600);
        await p2.screenshot({ path: `${OUT}/${tag}-result.png` });
        await ctx2.close();
      }
      await ctx.close();
      rows.push(`  ${core.padEnd(18)} ${problems.length ? `걸림 ${problems.join(" / ")}` : "다섯 장"}`
        + (gloss ? ` · 받침 ${gloss.split(/ — |: /)[0]}` : ""));
      console.log(rows[rows.length - 1]);
    }
  } finally {
    await browser.close();
  }
  const bad = rows.filter((r) => r.includes("걸림"));
  console.log(`\n자리 ${CORES.length} · ${OUT} · 걸림 ${bad.length}`);
  if (bad.length) process.exitCode = 1;
}

/** 그 사람의 응시를 지우지 않고 비밀번호만 그 자리에서 다시 적는다 */
async function makeStudentPw(login0: string): Promise<string> {
  const { randomBytes } = await import("node:crypto");
  const { hashPassword } = await import("../src/lib/password");
  const pw = randomBytes(18).toString("base64url");
  await query(`UPDATE users SET password_hash = $2 WHERE login_id = $1`,
    [login0, await hashPassword(pw)]);
  return pw;
}

main().catch((e) => { console.error(e); process.exit(1); });
