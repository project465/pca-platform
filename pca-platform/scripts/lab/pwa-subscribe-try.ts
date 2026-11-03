/** 실제 크로뮴으로 `이 기기로 알림 받기` 를 눌러 구독이 서버 표까지 닿는지 본다(구글 푸시 서버에 닿아야 한다) */
import { BASE, cloneFinished, login, makeStudent } from "../_loop-fixture";
import { chromium } from "playwright";
import { query } from "../../src/lib/db";
async function main() {
  const who = `pwa-sub-${Date.now()}`;
  const { id, pw } = await makeStudent(who);
  await cloneFinished(id, "PRO");
  await query(`INSERT INTO entitlements (user_id, product_code, kind, status, starts_at, ends_at)
               VALUES ($1,'TRACK_30D','track','active',now(),now()+interval '30 days')`, [id]);
  const br = await chromium.launch({ channel: "chromium" });
  const ctx = await br.newContext({ permissions: ["notifications"] });
  const p = await login(ctx, who, pw);
  await p.goto(`${BASE}/me/track#settings`, { waitUntil: "networkidle" });
  await p.getByRole("button", { name: "이 기기로 알림 받기" }).click();
  await p.waitForTimeout(8000);
  const said = await p.locator("#settings").innerText();
  const rows = await query<{ n: number }>(`SELECT count(*)::int n FROM push_subscriptions WHERE user_id=$1`, [id]);
  console.log("화면:", /이 기기 알림 받음/.test(said) ? "켜짐" : said.split("\n").slice(-3).join(" / "));
  console.log("서버 표의 구독:", rows[0].n);
  await br.close(); process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
