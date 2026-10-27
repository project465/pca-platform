/**
 * **포트원 결제를 끝까지 돌려 본다. 돈은 움직이지 않는다.**
 *
 * 가짜 포트원(이 과정 안의 작은 서버)을 세우고, 앱을 그쪽으로 묻게 띄운 뒤
 * 실제 브라우저로 MAT 30일권을 산다. 결제창은 포트원 SDK 를 흉내 낸 스크립트가
 * 대신하고, PC 결제창처럼 **돌아오지 않고 값만 돌려준다**(리다이렉트 없음).
 *
 *   PORTONE_API_BASE=http://127.0.0.1:3199 APP_ENV=staging \
 *   STAGING_BASIC_AUTH=probe:probe-pass PAYMENTS_PROVIDER=portone \
 *   PORTONE_STORE_ID=store-e2e PORTONE_CHANNEL_KEY=channel-key-e2e \
 *   PORTONE_API_SECRET=x PORTONE_WEBHOOK_SECRET=whsec_ZTJlZTJlZTJlZTJlZTJl \
 *     bash scripts/stage-serve.sh 3152
 *   (같은 변수로) UI_BASE=http://127.0.0.1:3152 npx tsx scripts/portone-e2e.ts
 *
 * 세는 것.
 *   ① 결제창이 값만 돌려줘도 완료 화면으로 넘어간다(PC 반환값 방식)
 *   ② 완료 화면이 포트원에 **하위 상점 아이디를 붙여** 묻는다
 *   ③ MAT 이용권이 한 장 생기고 주문이 paid 가 된다
 *   ④ 시험 서버 자물쇠가 웹훅을 막지 않는다
 *   ⑤ 같은 결제의 웹훅이 다시 와도 이용권이 늘지 않는다
 *   ⑥ 포트원 조회가 실패하면 웹훅이 503 을 돌려 다시 보내게 한다
 *   ⑦ 승인 전이면 `실패` 가 아니라 `확인 중` 이라고 적는다
 */
import { loadEnv, BASE, login } from "./_loop-fixture";
loadEnv();
/* eslint-disable import/first */
import { createServer } from "node:http";
import { createHmac } from "node:crypto";
import { chromium } from "playwright";
import { query, queryOne } from "../src/lib/db";
import { seedMatStudent } from "./_mat-brief-fixtures";

const FAKE_PORT = Number(new URL(process.env.PORTONE_API_BASE ?? "http://127.0.0.1:3199").port);
const STORE = process.env.PORTONE_STORE_ID ?? "";
const SECRET = (process.env.PORTONE_WEBHOOK_SECRET ?? "").replace(/^whsec_/, "");

let bad = 0;
const ok = (n: string, c: boolean, d = "") => {
  if (!c) bad += 1;
  console.log(`  ${c ? "통과" : "걸림"}  ${n}${d ? ` — ${d}` : ""}`);
};

/* 가짜 포트원. 결제창 흉내가 `/pay` 로 알려 준 결제만 PAID 로 답한다 */
const paid = new Map<string, { amount: number; currency: string; status: string }>();
const seenStore: string[] = [];
let down = false;
const fake = createServer((req, res) => {
  const u = new URL(req.url ?? "/", `http://127.0.0.1:${FAKE_PORT}`);
  res.setHeader("access-control-allow-origin", "*");
  if (u.pathname === "/pay") {
    paid.set(u.searchParams.get("id") ?? "", {
      amount: Number(u.searchParams.get("amt")), currency: u.searchParams.get("cur") ?? "KRW",
      status: u.searchParams.get("status") ?? "PAID",
    });
    res.end("ok"); return;
  }
  const m = /^\/payments\/([^/]+)$/.exec(u.pathname);
  if (m && req.method === "GET") {
    seenStore.push(u.searchParams.get("storeId") ?? "");
    if (down) { res.statusCode = 500; res.end("{}"); return; }
    const p = paid.get(decodeURIComponent(m[1]));
    if (!p) { res.statusCode = 404; res.end("{}"); return; }
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ id: decodeURIComponent(m[1]), status: p.status,
      amount: { total: p.amount }, currency: p.currency, method: { type: "PaymentMethodCard" } }));
    return;
  }
  res.statusCode = 404; res.end("{}");
});

function signed(body: string): Record<string, string> {
  const id = `msg_${Date.now()}`;
  const ts = String(Math.floor(Date.now() / 1000));
  const sig = createHmac("sha256", Buffer.from(SECRET, "base64"))
    .update(`${id}.${ts}.${body}`).digest("base64");
  return { "content-type": "application/json", "webhook-id": id,
    "webhook-timestamp": ts, "webhook-signature": `v1,${sig}` };
}

async function buy(who: string, status: "PAID" | "READY") {
  const s = await seedMatStudent(who);
  await query(`DELETE FROM entitlements WHERE user_id = $1 AND kind = 'track'`, [s.id]);
  const br = await chromium.launch();
  const ctx = await br.newContext({
    httpCredentials: { username: "probe", password: "probe-pass" },
  });
  /* 포트원 SDK 대신. PC 결제창처럼 성공해도 돌아오지 않고 값만 돌려준다 */
  await ctx.route("https://cdn.portone.io/**", (r) => r.fulfill({
    status: 200, contentType: "application/javascript",
    body: `window.PortOne={requestPayment:async(q)=>{
      await fetch('http://127.0.0.1:${FAKE_PORT}/pay?id='+encodeURIComponent(q.paymentId)
        +'&amt='+q.totalAmount+'&cur='+q.currency.replace('CURRENCY_','')+'&status=${status}',{mode:'no-cors'});
      return {paymentId:q.paymentId,txId:'tx-e2e'};}};`,
  }));
  const p = await login(ctx, who, s.pw);
  await p.goto(`${BASE}/checkout?product=TRACK_30D`, { waitUntil: "networkidle" });
  await p.getByRole("button", { name: /결제하기|Pay/ }).first().click();
  await p.waitForURL((u) => u.pathname === "/checkout/complete", { timeout: 30000 })
    .catch(() => undefined);
  await p.waitForLoadState("networkidle").catch(() => undefined);
  const url = new URL(p.url());
  const text = (await p.locator("body").innerText().catch(() => "")).replace(/\s+/g, " ");
  await br.close();
  return { userId: s.id, url, text, paymentId: url.searchParams.get("paymentId") ?? "" };
}

async function main(): Promise<void> {
  await new Promise<void>((r) => fake.listen(FAKE_PORT, "127.0.0.1", r));
  try {
    console.log("\n── 결제가 승인된 경우");
    const a = await buy("zz-pg-e2e-paid", "PAID");
    ok("① 결제창이 값만 돌려줘도 완료 화면으로 넘어간다",
      a.url.pathname === "/checkout/complete" && !!a.paymentId, a.url.pathname + a.url.search);
    ok("② 포트원에 하위 상점 아이디를 붙여 묻는다",
      seenStore.length > 0 && seenStore.every((x) => x === STORE), seenStore.join(","));
    ok("③ 완료 화면이 MAT 이 열렸다고 적는다", /MAT이 열렸습니다/.test(a.text), a.text.slice(0, 80));
    const ent = await queryOne<{ n: number }>(
      `SELECT count(*)::int n FROM entitlements WHERE user_id = $1 AND kind = 'track'`, [a.userId]);
    const ord = await queryOne<{ status: string }>(
      `SELECT status FROM orders WHERE order_no = $1`, [a.paymentId]);
    ok("③ MAT 이용권이 한 장 · 주문이 paid", ent?.n === 1 && ord?.status === "paid",
      `이용권 ${ent?.n} · 주문 ${ord?.status}`);

    const body = JSON.stringify({ type: "Transaction.Paid", timestamp: new Date().toISOString(),
      data: { paymentId: a.paymentId, storeId: STORE, transactionId: "tx-e2e" } });
    const w1 = await fetch(`${BASE}/api/payments/webhook`, {
      method: "POST", headers: signed(body), body });
    ok("④ 시험 서버 자물쇠가 웹훅을 막지 않는다", w1.status === 200, String(w1.status));
    const ent2 = await queryOne<{ n: number }>(
      `SELECT count(*)::int n FROM entitlements WHERE user_id = $1 AND kind = 'track'`, [a.userId]);
    ok("⑤ 같은 결제의 웹훅이 다시 와도 이용권이 늘지 않는다", ent2?.n === 1, `${ent2?.n}장`);

    down = true;
    const w2 = await fetch(`${BASE}/api/payments/webhook`, {
      method: "POST", headers: signed(body.replace("tx-e2e", "tx-e2e-2")),
      body: body.replace("tx-e2e", "tx-e2e-2") });
    ok("⑥ 포트원 조회가 실패하면 503 으로 다시 보내게 한다", w2.status === 503, String(w2.status));
    down = false;

    console.log("\n── 승인이 아직인 경우");
    const b = await buy("zz-pg-e2e-ready", "READY");
    ok("⑦ `실패` 가 아니라 `확인 중` 이라고 적는다",
      /결제를 확인하고 있습니다/.test(b.text) && !/결제가 완료되지 않았습니다/.test(b.text),
      b.text.slice(0, 80));
  } finally {
    fake.close();
  }
  console.log(`\n포트원 E2E — 걸림 ${bad}`);
  process.exit(bad ? 1 : 0);
}

void main();
