/**
 * 시장과 값이 한 줄로 흐르는가.
 *
 * 한국어 화면에 `$14.99` 가 찍혀 있었다. 까닭은 번역이 아니라 **시장을
 * 호스트 하나로만 정하고 있었기 때문**이다: 모르는 호스트가 조용히
 * 글로벌로 떨어졌고, 플랫폼 주소(`app.careermatri.com`)와 개발용
 * `127.0.0.1` 이 거기 걸렸다.
 *
 * 그래서 이 검사는 **값이 지나가는 자리 전부**를 한 기준으로 본다:
 * 표(`products`) → 가격표 → 상품 쪽 → 결제 → 주문 기록. 그리고 **언어를
 * 바꿔도 시장이 안 바뀌는 것**을 두 언어로 각각 확인한다.
 *
 *   DATABASE_URL=... npx tsx scripts/market-check.ts
 *
 * 브라우저로 보는 쪽은 서버가 떠 있어야 한다(`MARKET_BASE`, 기본 3100).
 */
import { query, queryOne } from "../src/lib/db";
import { hashPassword } from "../src/lib/password";
import { startCheckout } from "../src/lib/orders";
import { catalogFor, productByCode, priceState, type Market } from "../src/lib/catalog";
import { formatMoney } from "../src/lib/money";

const B = process.env.MARKET_BASE ?? "http://127.0.0.1:3100";

const T: { n: string; pass: boolean; d?: string }[] = [];
const ok = (n: string, pass: boolean, d?: string) => T.push({ n, pass, d });

/**
 * 승인된 값. **여기 적힌 숫자가 사업 결정이고 표가 그것을 들고 있다.**
 * 표가 달라지면 이 검사가 먼저 깨진다(규격의 가격 정본은 `products`다).
 */
const APPROVED: Record<Market, { code: string; amount: number; currency: string; shown: string }[]> = {
  KR: [
    { code: "ME_V2_BASIC_KR", amount: 0, currency: "KRW", shown: "무료" },
    { code: "ME_V2_STANDARD_KR", amount: 14900, currency: "KRW", shown: "14,900원" },
    { code: "ME_V2_PRO_KR", amount: 21900, currency: "KRW", shown: "21,900원" },
  ],
  GLOBAL: [
    { code: "ME_V2_BASIC_GL", amount: 0, currency: "USD", shown: "Free" },
    { code: "ME_V2_STANDARD_GL", amount: 1499, currency: "USD", shown: "$14.99" },
    { code: "ME_V2_PRO_GL", amount: 2499, currency: "USD", shown: "$24.99" },
  ],
};

async function main() {
  /* ── 1. 표가 정본이다 ───────────────────────────────────────────── */
  for (const market of ["KR", "GLOBAL"] as Market[]) {
    const list = await catalogFor(market);
    const want = APPROVED[market];
    ok(`${market} 상품 셋`, list.length === 3, `${list.length}개`);
    for (const w of want) {
      const got = list.find((p) => p.code === w.code);
      ok(`${w.code} 금액`, got?.amount === w.amount && got?.currency === w.currency,
        got ? `${got.amount} ${got.currency}` : "없음");
      /* **0원 두 가지를 가른다.** 승인된 무료와 아직 못 정한 값 */
      const st = got ? priceState(got) : null;
      ok(`${w.code} 승인 상태`,
        st === (w.amount > 0 ? "PAID_APPROVED" : "FREE_APPROVED"), String(st));
    }
    /* 한 시장의 상품이 다른 시장 통화를 들고 있지 않은가 */
    ok(`${market} 통화가 한 가지`,
      new Set(list.map((p) => p.currency)).size === 1,
      [...new Set(list.map((p) => p.currency))].join(","));
  }

  /* ── 2. 적는 자리는 통화를 본다 ─────────────────────────────────── */
  for (const market of ["KR", "GLOBAL"] as Market[]) {
    for (const w of APPROVED[market]) {
      if (w.amount === 0) continue;
      const ko = formatMoney(w.amount, w.currency, "ko");
      const en = formatMoney(w.amount, w.currency, "en");
      ok(`${w.code} 적는 꼴`, ko !== null && en !== null, `${ko} · ${en}`);
      /* **최소 단위를 사람이 읽는 값으로 되돌린다.** 1499 USD 가 `$1,499`
         로 나가면 백 배짜리 가격표가 된다 */
      if (w.currency === "USD") {
        ok(`${w.code} 소수 두 자리`, en === w.shown, String(en));
      } else {
        ok(`${w.code} 원화 표기`, ko === w.shown, String(ko));
      }
    }
  }

  /* ── 3. 주문은 그 순간의 표를 굳힌다 ───────────────────────────── */
  const pw = await hashPassword("market-dev-1234");
  const u = await queryOne<{ id: string }>(
    `INSERT INTO users (email, display_name, password_hash, status, locale)
     VALUES ('market-check@example.test','시장검사',$1,'active','ko')
     ON CONFLICT (email) DO UPDATE SET display_name = EXCLUDED.display_name
     RETURNING id::text`, [pw]);
  const userId = u!.id;
  await query(`DELETE FROM payments WHERE order_id IN (SELECT id FROM orders WHERE user_id = $1)`, [userId]);
  await query(`DELETE FROM orders WHERE user_id = $1`, [userId]);

  for (const code of ["ME_V2_STANDARD_KR", "ME_V2_STANDARD_GL", "ME_V2_PRO_KR", "ME_V2_PRO_GL"]) {
    const p = await productByCode(code);
    if (!p) { ok(`${code} 주문`, false, "상품 없음"); continue; }
    const { order } = await startCheckout(userId, code, "http://localhost",
      p.market === "GLOBAL" ? "global" : "domestic");
    const row = await queryOne<{ amount: number; currency: string }>(
      `SELECT amount, currency FROM orders WHERE id = $1`, [order.id]);
    ok(`${code} 주문 기록`,
      row?.amount === p.amount && row?.currency === p.currency,
      `${row?.amount} ${row?.currency} (상품 ${p.amount} ${p.currency})`);
  }

  /* ── 4. 화면이 같은 값을 적는가 ─────────────────────────────────── */
  let browserRan = false;
  try {
    const r = await fetch(`${B}/pricing?market=KR`, { redirect: "manual" });
    browserRan = r.ok;
  } catch { browserRan = false; }

  if (!browserRan) {
    ok("서버가 떠 있는가", false, `${B} 에 닿지 않아 화면 검사를 건너뛴다`);
  } else {
    const { chromium } = await import("playwright");
    const browser = await chromium.launch({ args: ["--no-sandbox"] });

    /** 그 주소를 열고 글자를 통째로 돌려준다 */
    async function textAt(path: string, ctx: import("playwright").BrowserContext) {
      const p = await ctx.newPage();
      await p.goto(B + path, { waitUntil: "networkidle" });
      const t = (await p.textContent("body")) ?? "";
      await p.close();
      return t;
    }

    /* 4-1. 시장마다 제 값만 보인다. **언어를 바꿔도 그대로다** */
    for (const market of ["KR", "GLOBAL"] as Market[]) {
      const other = market === "KR" ? "GLOBAL" : "KR";
      for (const lang of ["ko", "en"]) {
        const ctx = await browser.newContext();
        const t = await textAt(`/pricing?market=${market}&lang=${lang}`, ctx);
        const mine = APPROVED[market].filter((x) => x.amount > 0);
        const theirs = APPROVED[other].filter((x) => x.amount > 0);
        const hasMine = mine.every((x) => t.includes(
          (formatMoney(x.amount, x.currency, lang === "ko" ? "ko" : "en") ?? "!")));
        /* 남의 시장 값이 한 글자도 없어야 한다 */
        const hasTheirs = theirs.some((x) =>
          t.includes(formatMoney(x.amount, x.currency, "ko") ?? "!!")
          || t.includes(formatMoney(x.amount, x.currency, "en") ?? "!!"));
        ok(`가격표 ${market}/${lang} 제 값`, hasMine);
        ok(`가격표 ${market}/${lang} 남의 값 없음`, !hasTheirs);
        await ctx.close();
      }
    }

    /* 4-2. **언어만 바꾸면 시장이 그대로다.** 쿠키 하나로 이어 본다 */
    for (const market of ["KR", "GLOBAL"] as Market[]) {
      const ctx = await browser.newContext();
      await textAt(`/pricing?market=${market}`, ctx);          // 시장을 고른다
      const t = await textAt(`/pricing?lang=en`, ctx);          // 언어만 바꾼다
      const paid = APPROVED[market].find((x) => x.amount > 0)!;
      ok(`${market}: 언어만 바꿔도 시장 유지`,
        t.includes(formatMoney(paid.amount, paid.currency, "en") ?? "!"));
      await ctx.close();
    }

    /* 4-3. 가격표에서 고른 시장이 **상품 쪽과 결제 화면까지** 간다 */
    for (const market of ["KR", "GLOBAL"] as Market[]) {
      const ctx = await browser.newContext();
      await textAt(`/pricing?market=${market}`, ctx);
      const prod = await textAt(`/product`, ctx);
      const paid = APPROVED[market].filter((x) => x.amount > 0)
        .sort((a, b) => a.amount - b.amount)[0];
      const shown = formatMoney(paid.amount, paid.currency, "ko")
        ?? formatMoney(paid.amount, paid.currency, "en")!;
      ok(`${market}: 상품 쪽이 같은 시장`,
        prod.includes(shown) || prod.includes(formatMoney(paid.amount, paid.currency, "en")!),
        shown);
      await ctx.close();
    }

    /* 4-4. 기본값. **아무것도 안 고른 손님은 한국 시장이다** */
    {
      const ctx = await browser.newContext();
      const t = await textAt(`/pricing`, ctx);
      ok("아무것도 안 고르면 한국 시장",
        t.includes("14,900원"), t.includes("$14.99") ? "달러가 보인다" : "");
      await ctx.close();
    }

    await browser.close();
  }

  const bad = T.filter((t) => !t.pass);
  for (const t of T) {
    console.log(`  ${t.pass ? "OK  " : "실패"} ${t.n}${t.d ? `  (${t.d})` : ""}`);
  }
  console.log(`\n시장·가격 ${T.length}가지 가운데 ${bad.length}가지가 걸렸다.`);
  process.exit(bad.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
