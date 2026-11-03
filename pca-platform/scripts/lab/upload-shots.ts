/**
 * MAT 파일 읽기를 실제 브라우저로 눌러 보고 찍는다(로컬·staging 전용).
 *
 *   ANTHROPIC_API_KEY=... ANTHROPIC_BASE_URL=<가짜 서버> 로 띄운 배포본에서
 *   UI_BASE=http://127.0.0.1:3100 OUT=var/upload-shots \
 *     npx tsx scripts/lab/upload-shots.ts [login]
 *
 * 동의 칸 → 파일 고르기 → 초안 목록 → 초안 열기 차례로 찍는다. 붙인
 * 이용권과 쌓인 초안은 끝에서 지운다.
 */
import { mkdirSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { chromium } from "playwright";
import { BASE, gateCreds, loadEnv, login } from "../_loop-fixture";
import { query, queryOne } from "../../src/lib/db";
import { hashPassword } from "../../src/lib/password";

loadEnv();

const HTML = `<html><body style="font-family:sans-serif;padding:30px"><h2>성 적 증 명 서</h2>
<p>성명: 시험학생 · 학번: 2023000000</p><table border=1 cellpadding=4>
<tr><th>과목</th><th>성적</th></tr><tr><td>캡스톤디자인</td><td>A+</td></tr><tr><td>자료구조</td><td>A0</td></tr></table></body></html>`;

async function main(): Promise<void> {
  const who = process.argv[2] ?? "test-jju-cs-01";
  const OUT = process.env.OUT ?? "var/upload-shots";
  mkdirSync(OUT, { recursive: true });
  const u = await queryOne<{ id: string }>(`SELECT id::text FROM users WHERE login_id=$1`, [who]);
  if (!u) throw new Error(`${who} 이 없다`);
  const pw = randomBytes(18).toString("base64url");
  await query(`UPDATE users SET password_hash=$2 WHERE id=$1`, [u.id, await hashPassword(pw)]);
  await query(`DELETE FROM assistant_uploads WHERE user_id=$1`, [u.id]);
  await query(`DELETE FROM assistant_drafts WHERE user_id=$1 AND draft->>'from'='file'`, [u.id]);
  await query(`UPDATE assistant_settings SET file_consent_at=NULL WHERE user_id=$1`, [u.id]);
  const ent = await queryOne<{ id: string }>(
    `INSERT INTO entitlements (user_id, product_code, kind, status, starts_at, ends_at)
     VALUES ($1,'TRACK_30D','track','active',now(),now()+interval '30 days') RETURNING id::text`, [u.id]);

  const b = await chromium.launch({ args: ["--no-sandbox"] });
  const gate = gateCreds();
  const fp = await b.newPage();
  await fp.setContent(HTML);
  const pdf = await fp.pdf({ format: "A4" });
  let fails = 0;
  const check = (name: string, c: boolean) => { if (!c) fails++; console.log(`  ${c ? "통과" : "걸림"}  ${name}`); };
  try {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, ...(gate ? { httpCredentials: gate } : {}) });
    const p = await login(ctx, who, pw);
    await p.goto(`${BASE}/me/experience/new`, { waitUntil: "networkidle" });
    const box = p.locator("#upload");
    check("경험 추가에 파일로 옮기기가 선다", await box.isVisible());
    check("동의 전에는 놓는 자리가 닫혀 있다", (await p.locator(".cm-drop.is-off").count()) === 1);
    await p.screenshot({ path: `${OUT}/01-before-consent.png` });
    await p.locator('input[name="consent"]').check();
    await p.locator('input[name="file"]').setInputFiles({ name: "transcript.pdf", mimeType: "application/pdf", buffer: pdf });
    await p.getByText("읽는 중입니다").waitFor({ timeout: 5000 }).catch(() => undefined);
    await p.screenshot({ path: `${OUT}/02-reading.png` });
    await p.getByText(/가지를 옮겨 두었습니다/).waitFor({ timeout: 30000 });
    await box.screenshot({ path: `${OUT}/03-drafts.png` });
    check("초안 둘이 링크로 선다", (await box.locator("a[href*='draft=']").count()) === 2);
    await box.locator("a[href*='draft=']").first().click();
    await p.waitForURL(/draft=/);
    await p.waitForLoadState("networkidle");
    check("초안을 열면 파일에서 옮겼다고 적힌다", await p.getByText("올리신 파일에서 읽은 것을").isVisible());
    check("초안의 종류가 켜져 있다", await p.locator('input[name="kind"][value="capstone"]').isChecked());
    check("학번이 화면에 없다", !(await p.content()).includes("2023000000"));
    await p.screenshot({ path: `${OUT}/04-draft-open.png` });

    const m = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
      ...(gate ? { httpCredentials: gate } : {}) });
    const mp = await login(m, who, pw);
    await mp.goto(`${BASE}/me/experience/new#upload`, { waitUntil: "networkidle" });
    await mp.locator("#upload").screenshot({ path: `${OUT}/05-mobile.png` });
    const sw = await mp.evaluate(() => document.documentElement.scrollWidth);
    check("손전화에서 가로로 밀리지 않는다", sw <= 390);
  } finally {
    await b.close();
    await query(`DELETE FROM entitlements WHERE id=$1`, [ent!.id]);
    await query(`DELETE FROM assistant_uploads WHERE user_id=$1`, [u.id]);
    await query(`DELETE FROM assistant_drafts WHERE user_id=$1 AND draft->>'from'='file'`, [u.id]);
    await query(`UPDATE assistant_settings SET file_consent_at=NULL WHERE user_id=$1`, [u.id]);
  }
  console.log(fails ? `걸림 ${fails}` : "전부 통과");
  process.exit(fails ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
