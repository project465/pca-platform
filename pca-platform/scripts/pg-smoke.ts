/**
 * 실제 PG 를 붙이기 전에 **돈을 한 푼도 움직이지 않고** 배선을 센다.
 *
 * 여기서 보는 것은 "결제가 될 것 같다" 가 아니라 **PortOne 과 우리 코드
 * 사이의 다섯 자리가 맞물려 있는가**다.
 *
 *   1. 다섯 값이 꽂혀 있는가            (값은 적지 않는다)
 *   2. API 열쇠가 실제로 먹는가          조회 한 번으로 본다
 *   3. 웹훅 서명을 우리가 제대로 가리는가 맞는 것 · 틀린 것 · 오래된 것
 *   4. 금액과 통화가 다르면 막는가       `verify.ts` 한 곳
 *   5. 돌아오는 주소가 이 배포본인가     그 한 줄이 틀리면 결제가 끊긴다
 *
 * **승인을 내지 않는다.** 결제 한 건은 사람이 브라우저에서 눌러야 하고,
 * 그 뒤를 `npm run pg:confirm` 이 받는다. 스크립트가 카드를 긁는 구조를
 * 만들면 그 스크립트가 언젠가 운영에서 돌아간다.
 *
 * **공개 판매를 열지 않는다.** 이 명령은 아무 설정도 바꾸지 않는다.
 *
 *   PAYMENTS_PROVIDER=portone PORTONE_... npx tsx scripts/pg-smoke.ts
 */
import { createHmac } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { queryOne } from "../src/lib/db";
import { matchesOrder } from "../src/lib/payments/verify";
import type { PaymentFact } from "../src/lib/payments/types";
import { portoneProvider, globalChannelReady } from "../src/lib/payments/portone";
import { publicCommerceGate } from "../src/lib/public-gate";
import { appEnv } from "../src/lib/env";
import { appDomain } from "../src/lib/app-domain";

type Mark = "OK" | "막힘" | "못 봄" | "실패";
const T: { m: Mark; n: string; d?: string }[] = [];
const ok = (n: string, pass: boolean, d?: string) => T.push({ m: pass ? "OK" : "실패", n, d });
/** 자격증명이 없어서 못 하는 것. **실패와 섞지 않는다** */
const blocked = (n: string, d: string) => T.push({ m: "막힘", n, d });
const unknown = (n: string, d: string) => T.push({ m: "못 봄", n, d });

const NEED = [
  "PORTONE_STORE_ID", "PORTONE_CHANNEL_KEY",
  "PORTONE_API_SECRET", "PORTONE_WEBHOOK_SECRET",
] as const;

async function main() {
  /* ── 1. 설정 ──────────────────────────────────────────────────── */
  /**
   * **없는 자격증명을 실패로 적지 않는다.**
   *
   * 계약이 끝나지 않아 값이 없는 것은 고칠 코드가 없는 줄이고, 그것을
   * 빨강으로 적으면 다음부터 이 표를 아무도 안 본다. 그래서 `막힘` 이고,
   * 막힌 줄에는 **받아야 하는 값의 이름**을 같이 적는다.
   */
  const provider = (process.env.PAYMENTS_PROVIDER ?? "mock").trim();
  if (provider === "portone") {
    ok("PAYMENTS_PROVIDER 가 portone 이다", true, provider);
  } else {
    blocked("PAYMENTS_PROVIDER 가 portone 이다",
      `지금 ${provider} 다. 실결제 확인은 portone 으로 띄운 자리에서만 된다`);
  }

  /* **값을 적지 않는다.** 있는지만 적는다: 이 출력은 캡처로 돌아다닌다 */
  const have = NEED.filter((k) => (process.env[k] ?? "").trim().length > 0);
  const lack = NEED.filter((k) => !have.includes(k));
  if (lack.length === 0) {
    ok("필요한 네 값이 꽂혀 있다", true, "네 값 모두 있음");
  } else {
    blocked("필요한 네 값이 꽂혀 있다", `없는 것: ${lack.join(" · ")}`);
  }
  T.push({ m: globalChannelReady() ? "OK" : "못 봄",
    n: "해외 카드 채널", d: globalChannelReady()
      ? "PORTONE_CHANNEL_KEY_GLOBAL 있음" : "없음. 지금은 국내 채널만 연다" });

  /* ── 2. 열쇠가 먹는가 ─────────────────────────────────────────── */
  if (!process.env.PORTONE_API_SECRET) {
    blocked("API 열쇠가 먹는다", "PORTONE_API_SECRET 이 없다");
  } else {
    /* **없는 결제 번호를 하나 조회한다.** 돈이 움직이지 않고, 열쇠가
       틀리면 401·403 이 오고 맞으면 404 가 온다. 그 차이가 답이다 */
    const probe = `SMOKE-${Date.now()}`;
    try {
      const res = await fetch(`https://api.portone.io/payments/${probe}`, {
        headers: { Authorization: `PortOne ${process.env.PORTONE_API_SECRET}` },
        cache: "no-store",
      });
      if (res.status === 401 || res.status === 403) {
        ok("API 열쇠가 먹는다", false, `${res.status} — 열쇠가 거절됐다`);
      } else if (res.status === 404) {
        ok("API 열쇠가 먹는다", true, "404 (없는 결제) — 인증은 통과했다");
      } else {
        unknown("API 열쇠가 먹는다", `${res.status} 가 왔다. 네트워크나 프록시를 본다`);
      }
    } catch (e) {
      unknown("API 열쇠가 먹는다",
        `밖으로 못 나갔다: ${e instanceof Error ? e.message : e}`);
    }
  }

  /* ── 3. 결제창에 넘길 표 ──────────────────────────────────────── */
  if (lack.includes("PORTONE_STORE_ID") || lack.includes("PORTONE_CHANNEL_KEY")) {
    blocked("국내 결제창 표를 만든다", "상점 식별값이나 국내 채널이 없다");
  } else {
    try {
      const t = await portoneProvider.createCheckout({
        orderNo: "SMOKE0000", orderName: "확인용", amount: 14900,
        currency: "KRW", region: "domestic",
        redirectUrl: "https://app.careermatri.com/checkout/complete",
      } as Parameters<typeof portoneProvider.createCheckout>[0]);
      ok("국내 결제창 표를 만든다",
        t.provider === "portone" && !!t.storeId && !!t.channelKey
        && t.amount === 14900 && t.currency === "KRW");
    } catch (e) {
      ok("국내 결제창 표를 만든다", false, e instanceof Error ? e.message : String(e));
    }
  }

  /* ── 4. 웹훅 서명 ─────────────────────────────────────────────── */
  const whs = (process.env.PORTONE_WEBHOOK_SECRET ?? "").replace(/^whsec_/, "");
  if (!whs) {
    blocked("웹훅 서명을 가린다", "PORTONE_WEBHOOK_SECRET 이 없다");
  } else {
    const body = JSON.stringify({ type: "Transaction.Paid", data: { paymentId: "SMOKE0000" } });
    const sign = (id: string, ts: string, raw: string) =>
      createHmac("sha256", Buffer.from(whs, "base64")).update(`${id}.${ts}.${raw}`).digest("base64");
    const now = String(Math.floor(Date.now() / 1000));
    const id = "msg_smoke";

    const good = await portoneProvider.handleWebhook!(body, {
      "webhook-id": id, "webhook-timestamp": now,
      "webhook-signature": `v1,${sign(id, now, body)}`,
    });
    ok("맞는 서명은 받는다", good.ok === true && good.providerPaymentId === "SMOKE0000");

    const bad = await portoneProvider.handleWebhook!(body, {
      "webhook-id": id, "webhook-timestamp": now,
      "webhook-signature": `v1,${sign(id, now, body).slice(0, -2)}xx`,
    });
    ok("틀린 서명은 거절한다", bad.ok === false, bad.ok ? "" : bad.reason);

    const old = String(Math.floor(Date.now() / 1000) - 3600);
    const stale = await portoneProvider.handleWebhook!(body, {
      "webhook-id": id, "webhook-timestamp": old,
      "webhook-signature": `v1,${sign(id, old, body)}`,
    });
    ok("한 시간 지난 것은 거절한다", stale.ok === false);

    const nohdr = await portoneProvider.handleWebhook!(body, {});
    ok("헤더가 없으면 거절한다", nohdr.ok === false);

    /* 본문이 한 글자라도 다르면 서명이 깨져야 한다 */
    const tampered = await portoneProvider.handleWebhook!(
      body.replace("SMOKE0000", "SMOKE0001"),
      { "webhook-id": id, "webhook-timestamp": now,
        "webhook-signature": `v1,${sign(id, now, body)}` });
    ok("본문을 바꾸면 거절한다", tampered.ok === false);
  }

  /* ── 5. 금액과 통화 ──────────────────────────────────────────── */
  const fact = (
    o: Partial<{ status: PaymentFact["status"]; amount: number; currency: string }>,
  ): PaymentFact => ({
    providerPaymentId: "SMOKE0000", status: o.status ?? "paid",
    amount: o.amount ?? 14900, currency: o.currency ?? "KRW", raw: {},
  });
  const want = { amount: 14900, currency: "KRW" };
  ok("금액과 통화가 맞으면 통과한다", matchesOrder(fact({}), want).ok === true);
  ok("금액이 다르면 막는다", matchesOrder(fact({ amount: 100 }), want).ok === false);
  ok("통화가 다르면 막는다", matchesOrder(fact({ currency: "USD" }), want).ok === false);
  ok("승인 전이면 막는다", matchesOrder(fact({ status: "ready" }), want).ok === false);

  /* ── 6. 돌아오는 자리 ─────────────────────────────────────────── */
  const dom = appDomain();
  ok("돌아올 주소가 정해져 있다", !!dom.url, dom.url ?? "PLATFORM_URL 이 비어 있다");
  if (dom.url) {
    const u = dom.url;
    ok("돌아올 주소가 localhost 나 임시 주소가 아니다",
      !/localhost|127\.0\.0\.1|up\.railway\.app/.test(u), u);
  }

  /* ── 7. 멱등과 경계 ──────────────────────────────────────────── */
  const uniq = await queryOne<{ n: number }>(
    `SELECT count(*)::int AS n FROM pg_indexes
      WHERE tablename = 'payments' AND indexdef ILIKE '%UNIQUE%'
        AND indexdef ILIKE '%provider_payment_id%'`).catch(() => null);
  if (uniq) {
    ok("같은 결제가 두 번 적히지 않는다", (uniq.n ?? 0) >= 1, `제약 ${uniq.n}개`);
  } else {
    unknown("같은 결제가 두 번 적히지 않는다", "DB 에 붙지 못했다");
  }

  /* 소스를 읽는 두 줄. **배포본 안에는 소스가 없다** — 그때는 못 봄이고,
     실패로 적으면 컨테이너에서 돌린 사람이 고칠 것 없는 빨간 줄을 받는다 */
  const hook = "src/app/api/payments/webhook/route.ts";
  const hookSrc = existsSync(hook) ? readFileSync(hook, "utf8") : "";
  if (!hookSrc) {
    unknown("웹훅 받는 길이 서 있다", "배포본 안에는 소스가 없다. 저장소에서 본다");
  } else {
    ok("웹훅 받는 길이 서 있다", true, hook);
    ok("웹훅이 서명을 먼저 가린다", /handleWebhook/.test(hookSrc));
  }

  const gate = await publicCommerceGate();
  T.push({ m: "OK", n: "공개 판매 상태",
    d: appEnv() === "production"
      ? (gate.open ? "열려 있다 — 이 명령은 그것을 바꾸지 않았다"
        : `닫혀 있다 (${gate.missing.join(" · ")})`)
      : `${appEnv()} 이라 상거래 화면은 열려 있다. 운영에서는 표시 일곱 칸이 정한다` });

  /* ── 결과 ─────────────────────────────────────────────────────── */
  const fail = T.filter((t) => t.m === "실패");
  const block = T.filter((t) => t.m === "막힘");
  for (const t of T) {
    console.log(`  ${t.m.padEnd(4)} ${t.n}${t.d ? `  (${t.d})` : ""}`);
  }
  console.log(
    `\nPG 배선 ${T.length}줄 — 실패 ${fail.length} · 막힘 ${block.length}`);
  if (block.length) {
    console.log("\n막힌 것은 코드로 풀리지 않습니다. 받아야 하는 값:");
    for (const k of NEED) {
      if (!(process.env[k] ?? "").trim()) console.log(`  · ${k}`);
    }
  }
  if (!fail.length && !block.length) {
    console.log(`
돈이 움직이는 자리는 여기까지 코드로 못 봅니다. 사람이 한 번 눌러야 합니다.

  1. 로그인한 뒤 /pricing 에서 STANDARD 를 고르고 결제까지 갑니다
     (PortOne 테스트 채널이면 실제 청구가 없습니다)
  2. 돌아온 화면이 '결제 완료' 인지 보고 주문번호를 적어 둡니다
  3. 확정과 멱등을 확인합니다
       npm run pg:confirm -- <주문번호>
  4. 되돌리기까지 봅니다
       npm run pg:confirm -- <주문번호> --환불`);
  }
  process.exit(fail.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
