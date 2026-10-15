/**
 * 그 Core 의 **산업 장면 화면 한 자리**만 브라우저로 읽는다.
 *
 * 학교 자리가 없는 Core(배재대에 기계공학 자리가 없다)를 개인 길로 확인하는
 * 자리다. 끝까지 밟지 않는다: 보려는 것이 그 한 화면의 큰 글씨다.
 */
import { chromium } from "playwright";
import {
  BASE, gateCreds, loadEnv, login, makeStudent,
} from "../_loop-fixture";
import { query } from "../../src/lib/db";
import { core as coreOf } from "../../src/lib/me-v3/core-registry";

loadEnv();
const CORE = process.env.CORE ?? "ME_CORE_V3";
const MAIL = `scene-${CORE.toLowerCase().replace(/_/g, "-")}@test.invalid`;

(async () => {
  const st = await makeStudent(MAIL);
  await query(
    `INSERT INTO entitlements (user_id, product_code, kind, tier,
                               major_code, assessment_version, status)
     VALUES ($1,'ME_V3_PRO_KR','report','PRO','ME','ME_V3_2','active')`, [st.id]);
  const b = await chromium.launch();
  const g = gateCreds();
  const ctx = await b.newContext({
    viewport: { width: 1440, height: 900 }, ...(g ? { httpCredentials: g } : {}),
  });
  const p = await login(ctx, MAIL, st.pw);
  await p.goto(`${BASE}/v3/start?core=${CORE}`, { waitUntil: "networkidle" });
  await p.getByText("학부", { exact: true }).click();
  await p.getByRole("button", { name: /시작|검사/ }).first().click();
  await p.waitForURL(/\/v3\/\d+/, { timeout: 30000 });
  /* 시작 안내 → 기본 정보 → 관심 산업 → 장면 */
  for (let i = 0; i < 8; i += 1) {
    await p.waitForLoadState("networkidle");
    const q = (await p.locator("h1.qs-q").first().textContent()
      .catch(() => ""))?.trim() ?? "";
    if (/다루는 일$/.test(q)) {
      console.log(`${CORE} (${coreOf(CORE).name_ko}) → ${q}`);
      await b.close();
      process.exit(0);
    }
    const labels = p.locator("fieldset.qs-opts label, .qs-cards label, .qs-list label");
    if (await labels.count()) {
      const n = Math.min(2, await labels.count());
      for (let k = 0; k < n; k += 1) {
        await labels.nth(k).click({ timeout: 2000 }).catch(() => undefined);
      }
    }
    const go = p.locator("button.qs-btn-main, a.qs-btn-main");
    if (await go.count()) await go.first().click({ force: true }).catch(() => undefined);
    await p.waitForTimeout(500);
  }
  console.log(`${CORE} → 장면 화면에 닿지 못했습니다 (${p.url()})`);
  await b.close();
  process.exit(1);
})();
