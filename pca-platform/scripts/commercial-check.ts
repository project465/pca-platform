/**
 * 상용화 준비 — **무엇이 되고 무엇이 막혀 있는지**를 센다.
 *
 * 이 검사는 두 가지를 섞지 않는다.
 *
 *   [됨]      우리가 끝낼 수 있고 끝낸 것. 깨지면 실패다
 *   [블로커]  우리 밖에서 정해져야 하는 것. **실패로 세지 않고 적는다**
 *
 * 둘을 섞으면 검사가 늘 빨간불이어서 아무도 보지 않게 되고, 그러면 진짜
 * 회귀가 그 빨간불에 섞여 들어간다. 가격과 PG 가 정해지지 않은 것은
 * 코드의 잘못이 아니고, 코드가 **그 상태를 정확히 말하고 있는가**가
 * 코드의 일이다.
 *
 *   DATABASE_URL=... npx tsx scripts/commercial-check.ts
 */
import { readFileSync, existsSync } from "node:fs";
import { query, queryOne } from "../src/lib/db";
import {
  catalogFor, priceState, productByCode, sellable, type CatalogItem,
} from "../src/lib/catalog";
import { marketReadiness, matchesOrder } from "../src/lib/payments";
import type { PaymentFact } from "../src/lib/payments";

const T: { n: string; pass: boolean; d?: string }[] = [];
const B: { n: string; why: string; who: string }[] = [];
const ok = (n: string, pass: boolean, d?: string) => T.push({ n, pass, d });
/** 우리 밖에서 정해져야 하는 것. 실패로 세지 않는다 */
const blocker = (n: string, why: string, who: string) => B.push({ n, why, who });

const fact = (o: Partial<PaymentFact>): PaymentFact => ({
  providerPaymentId: "p1", status: "paid", amount: 29000, currency: "KRW",
  raw: {}, ...o,
});

async function main() {
  /* ── 1. 가격 승인 상태 ──────────────────────────────────────────── */
  const rows = await query<{
    code: string; amount: number; price_status: string; assessment_version: string | null;
  }>(`SELECT code, amount, price_status, assessment_version FROM products ORDER BY code`);

  ok("products 에 가격 승인 칸이 있다", rows.every((r) => !!r.price_status),
    `${rows.length}개 상품`);

  /* 승인되지 않은 값은 금액이 0 이어야 한다. 숫자를 적어 두고 상태만
     '미승인' 으로 두면 그 값이 어느 날 그대로 결제된다 */
  const lying = rows.filter((r) => r.price_status === "not_approved" && r.amount !== 0);
  ok("승인되지 않은 가격에 금액이 적혀 있지 않다", lying.length === 0,
    lying.map((r) => r.code).join(" · ") || "없음");

  /* **0원 두 가지가 갈려 있는가.** 무료 구간과 미승인이 같은 모양이면
     '0원이면 팔지 않는다' 로 막을 때 법이 요구하는 시용 장치가 닫힌다 */
  const free = rows.filter((r) => r.amount === 0 && r.price_status === "approved");
  const tbd = rows.filter((r) => r.price_status === "not_approved");
  ok("무료 구간과 미승인이 갈려 있다", free.length > 0 && tbd.length > 0,
    `무료 ${free.map((r) => r.code).join("·") || "없음"} / ` +
    `미승인 ${tbd.length}개`);

  const hsFree = rows.find((r) => r.code === "HS_FREE");
  const univFree = rows.find((r) => r.code === "UNIV_FREE");
  ok("법이 요구하는 무료 구간이 승인된 0원이다",
    hsFree?.price_status === "approved" && univFree?.price_status === "approved",
    `HS_FREE ${hsFree?.price_status} · UNIV_FREE ${univFree?.price_status}`);

  /* 운영 결제가 켜진 척하고 물어본다. 환경변수를 되돌려 놓는다 */
  const keep = process.env.PAYMENTS_PROVIDER;
  process.env.PAYMENTS_PROVIDER = "portone";
  const freeP = await productByCode("UNIV_FREE");
  const tbdP = await productByCode("ME_V2_PRO_KR");
  ok("운영에서 미승인 상품은 팔지 않는다",
    !!tbdP && !sellable(tbdP as CatalogItem).ok,
    tbdP ? (sellable(tbdP as CatalogItem).ok ? "팔린다" : "거절") : "상품 없음");
  ok("운영에서도 무료 구간은 막지 않는다",
    !!freeP && sellable(freeP as CatalogItem).ok,
    freeP ? priceState(freeP) : "상품 없음");
  /* **되돌릴 때 지운다.** `process.env.X = undefined` 는 문자열
     "undefined" 를 넣어서, 그 뒤 판단이 전부 '알 수 없는 대행사' 로
     떨어진다 */
  if (keep === undefined) delete process.env.PAYMENTS_PROVIDER;
  else process.env.PAYMENTS_PROVIDER = keep;

  const kr = await catalogFor("KR");
  const gl = await catalogFor("GLOBAL");
  ok("두 시장에 같은 등급 셋이 있다",
    kr.length === 3 && gl.length === 3, `KR ${kr.length} · GLOBAL ${gl.length}`);
  ok("ME_V2 여섯 상품이 전부 미승인이다",
    [...kr, ...gl].every((p) => priceState(p) === "PRICE_NOT_APPROVED"),
    [...kr, ...gl].map((p) => priceState(p)).join(" "));

  /* ── 2. 결제 대조 ──────────────────────────────────────────────── */
  ok("금액이 다르면 거절한다",
    !matchesOrder(fact({ amount: 100 }), { amount: 29000, currency: "KRW" }).ok);
  /* **금액만 보면 USD 29 가 KRW 29 주문을 확정시킨다** */
  ok("금액이 같고 통화가 다르면 거절한다",
    !matchesOrder(fact({ amount: 29, currency: "USD" }), { amount: 29, currency: "KRW" }).ok,
    "USD 29 → KRW 29 주문");
  ok("승인 전이면 거절한다",
    !matchesOrder(fact({ status: "ready" }), { amount: 29000, currency: "KRW" }).ok);
  ok("금액과 통화가 같으면 통과한다",
    matchesOrder(fact({}), { amount: 29000, currency: "KRW" }).ok);
  /* 옛 결제 줄에는 통화 칸이 없다. 그것을 불일치로 보면 이미 확정된
     주문을 되돌리게 된다 */
  ok("통화를 모르는 옛 결제는 금액으로만 본다",
    matchesOrder(fact({ currency: "" }), { amount: 29000, currency: "KRW" }).ok);

  /* ── 3. 어댑터가 다섯 가지를 다 할 수 있는가 ───────────────────── */
  const need = ["createCheckout", "getPaymentStatus", "verifyPayment",
    "handleWebhook", "refundPayment"];
  for (const name of ["mock", "portone"]) {
    const mod = name === "mock"
      ? (await import("../src/lib/payments/mock")).mockProvider
      : (await import("../src/lib/payments/portone")).portoneProvider;
    const have = need.filter((k) => typeof (mod as never)[k as never] === "function");
    ok(`${name} 어댑터가 다섯 가지를 다 가진다`, have.length === need.length,
      have.length === need.length ? "다섯" : `빠진 것 ${need.filter((k) => !have.includes(k))}`);
    ok(`${name} 어댑터가 받을 시장을 밝힌다`, Array.isArray(mod.markets),
      (mod.markets || []).join("·") || "없음");
  }

  /* ── 4. 웹훅 ───────────────────────────────────────────────────── */
  const { mockProvider } = await import("../src/lib/payments/mock");
  ok("본문이 JSON 이 아닌 웹훅은 거절한다",
    !(await mockProvider.handleWebhook("not json", {})).ok);

  const po = (await import("../src/lib/payments/portone")).portoneProvider;
  const noHdr = await po.handleWebhook("{}", {});
  ok("서명 헤더가 없는 웹훅은 거절한다", !noHdr.ok,
    noHdr.ok ? "통과했다" : noHdr.reason);
  /* 재전송 공격. 타임스탬프가 오래된 것은 서명을 보기도 전에 떨어진다 */
  const old = await po.handleWebhook("{}", {
    "webhook-id": "x", "webhook-timestamp": "1000000000", "webhook-signature": "v1,zz",
  });
  ok("오래된 타임스탬프의 웹훅은 거절한다", !old.ok, old.ok ? "통과했다" : old.reason);

  /* ── 5. 멱등 ───────────────────────────────────────────────────── */
  const uniq = await queryOne<{ n: string }>(
    `SELECT count(*)::text AS n FROM pg_indexes
      WHERE tablename = 'payments' AND indexdef ILIKE '%unique%'
        AND indexdef ILIKE '%provider_payment_id%'`);
  ok("같은 결제를 두 번 적을 수 없다", Number(uniq?.n ?? 0) > 0,
    `UNIQUE 인덱스 ${uniq?.n}개`);
  const evUniq = await queryOne<{ n: string }>(
    `SELECT count(*)::text AS n FROM pg_indexes
      WHERE tablename = 'payment_events' AND indexdef ILIKE '%unique%'
        AND indexdef ILIKE '%event_id%'`);
  ok("같은 웹훅 이벤트를 두 번 쌓지 않는다", Number(evUniq?.n ?? 0) > 0,
    `UNIQUE 인덱스 ${evUniq?.n}개`);

  /* ── 6. 결제 이벤트가 고쳐지지 않는가 ──────────────────────────── */
  await query(
    `INSERT INTO payment_events (provider, event_id, kind, payload)
     VALUES ('mock', 'commercial-check-immutable', 'probe', '{}'::jsonb)
     ON CONFLICT (provider, event_id) DO NOTHING`);
  let frozen = false;
  try {
    await query(`UPDATE payment_events SET kind = 'tampered'
                  WHERE provider = 'mock' AND event_id = 'commercial-check-immutable'`);
  } catch { frozen = true; }
  ok("결제 이벤트를 고칠 수 없다", frozen, frozen ? "트리거가 막는다" : "고쳐졌다");
  let undeletable = false;
  try {
    await query(`DELETE FROM payment_events
                  WHERE provider = 'mock' AND event_id = 'commercial-check-immutable'`);
  } catch { undeletable = true; }
  ok("결제 이벤트를 지울 수 없다", undeletable, undeletable ? "트리거가 막는다" : "지워졌다");

  /* ── 7. 주문 상태가 못 박혀 있는가 ─────────────────────────────── */
  const st = await queryOne<{ def: string }>(
    `SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint
      WHERE conname = 'orders_status_chk'`);
  ok("주문 상태가 제약으로 못 박혀 있다", !!st?.def,
    st?.def ? st.def.slice(0, 80) : "제약 없음");

  /* ── 8. 동의 기록 구조 ─────────────────────────────────────────── */
  const cd = await queryOne<{ n: string }>(
    `SELECT count(*)::text AS n FROM information_schema.columns
      WHERE table_name = 'consent_documents'
        AND column_name IN ('kind','version','locale','effective_at')`);
  ok("동의문이 종류·판·언어·유효시점을 들고 있다", Number(cd?.n ?? 0) === 4,
    `칸 ${cd?.n}개`);
  const cr = await queryOne<{ n: string }>(
    `SELECT count(*)::text AS n FROM information_schema.columns
      WHERE table_name = 'consent_records'
        AND column_name IN ('user_id','document_id','site_id','agreed_at','withdrawn_at')`);
  ok("동의 기록이 사람·판·사이트·시각·철회를 들고 있다", Number(cr?.n ?? 0) === 5,
    `칸 ${cr?.n}개`);
  /* **개인정보를 더 담지 않는다.** IP 와 User-Agent 는 분쟁에 쓰이지
     않으면서 파기 대상만 늘린다 */
  const extra = await query<{ column_name: string }>(
    `SELECT column_name FROM information_schema.columns
      WHERE table_name = 'consent_records'
        AND column_name IN ('ip','ip_address','user_agent','ua')`);
  ok("동의 기록에 IP·User-Agent 를 담지 않는다", extra.length === 0,
    extra.map((x) => x.column_name).join(" · ") || "없음");

  /* ── 9. 도메인이 한 철자인가 ───────────────────────────────────── */
  const dom = await query<{ site_id: string; domain: string }>(
    `SELECT site_id, domain FROM site_configs ORDER BY site_id`);
  ok("도메인이 site_configs 한 곳에 있다", dom.length >= 2,
    dom.map((d) => `${d.site_id}=${d.domain}`).join(" · "));
  const spells = new Set(dom.map((d) => (d.domain.match(/careerm[ae]tri/) ?? [""])[0]));
  ok("두 철자가 섞여 있지 않다", spells.size <= 1, [...spells].join(" + ") || "없음");

  /* ── 10. 환경변수 예시가 있는가 ────────────────────────────────── */
  ok(".env.example 이 있다", existsSync(".env.example"));
  if (existsSync(".env.example")) {
    const env = readFileSync(".env.example", "utf8");
    const want = ["PAYMENTS_PROVIDER", "PORTONE_STORE_ID", "PORTONE_API_SECRET",
      "PORTONE_WEBHOOK_SECRET", "PORTONE_CHANNEL_KEY", "PORTONE_CHANNEL_KEY_GLOBAL"];
    const miss = want.filter((k) => !env.includes(k));
    ok(".env.example 이 결제 변수를 전부 적어 둔다", miss.length === 0,
      miss.join(" · ") || "전부");
    /* **값을 적어 두지 않는다.** 예시 파일에 진짜 키가 들어가면 저장소가
       곧 비밀 저장소가 된다 */
    /* 줄 안에서만 본다. `\s*` 로 두면 줄바꿈을 넘어가서
       `AUTH_SECRET=` 다음 줄의 `POSTGRES_PASSWORD=` 를 값으로 읽는다 */
    const looksReal = env.split("\n").some((l) =>
      /(?:SECRET|KEY|TOKEN|PASS)[A-Z_]*=\S{16,}/.test(l));
    ok(".env.example 에 진짜 키가 들어 있지 않다", !looksReal,
      looksReal ? "긴 값이 있다" : "값이 비어 있다");
  }

  /* ── 11. 거래 메일이 두 언어인가 ───────────────────────────────── */
  const { renderMail } = await import("../src/lib/outbox");
  const HAN = /[가-힣]/;
  for (const kind of ["signup", "report_ready", "upgrade_done"] as const) {
    const k = renderMail(kind, "ko");
    const e = renderMail(kind, "en");
    ok(`${kind} 메일이 두 언어로 있다`, !!k && !!e,
      `${k?.subject ?? "없음"} / ${e?.subject ?? "없음"}`);
    /* **영어 메일에 한국어가 섞이면 받은 사람이 결제가 됐는지 모른다** */
    ok(`${kind} 영어 메일에 한국어가 없다`,
      !!e && !HAN.test(e.subject) && !HAN.test(e.text),
      e ? (HAN.test(e.subject + e.text) ? "섞였다" : "없음") : "없음");
    ok(`${kind} 한국어 메일이 그대로다`, !!k && HAN.test(k.subject));
  }
  /* 언어를 모르면 한국어로 간다. **짐작하지 않는다** */
  const fallback = renderMail("signup", null);
  ok("언어를 모르는 메일은 한국어로 간다",
    !!fallback && HAN.test(fallback.subject), fallback?.subject);
  /* 운영 경보는 한국어만이다. 받는 사람이 우리 쪽 운영자다 */
  ok("운영 경보는 두 언어로 두지 않는다",
    renderMail("code_low", "en")?.subject === renderMail("code_low", "ko")?.subject);
  const loc = await queryOne<{ n: string }>(
    `SELECT count(*)::text AS n FROM information_schema.columns
      WHERE table_name = 'outbox' AND column_name = 'locale'`);
  ok("대기열이 받는 사람의 언어를 들고 있다", Number(loc?.n ?? 0) === 1,
    `칸 ${loc?.n}개`);

  /* ── 12. 동의가 실제로 돌아가는가 ──────────────────────────────── */
  const CS = await import("../src/lib/consent");
  for (const l of ["ko", "en"] as const) {
    const docs = await CS.activeDocs(l);
    ok(`${l} 동의문이 등록돼 있다`, docs.length >= 3,
      docs.map((d) => `${d.kind}/${d.version}`).join(" · ") || "없음");
    ok(`${l} 필수와 선택이 갈려 있다`,
      docs.some((d) => d.required) && docs.some((d) => !d.required),
      `필수 ${docs.filter((d) => d.required).length} · ` +
      `선택 ${docs.filter((d) => !d.required).length}`);
  }
  /* **번역이 없는 것을 없다고 적는가.** 기계로 옮긴 약관을 올리면
     그걸 읽고 동의한 사람이 생긴다 */
  const en = await CS.activeDocs("en");
  const pend = en.filter((d) => d.translation_status === "pending");
  ok("영문 번역이 없는 동의문은 그렇다고 적혀 있다", pend.length === en.length,
    `${pend.length}/${en.length}`);
  ok("번역이 없는 동의문은 기준 본문을 가리킨다",
    pend.every((d) => !!d.governing_locale),
    pend.map((d) => d.governing_locale ?? "없음").join(" "));

  /* 실제로 적고 읽어 본다. **필수가 빠지면 거절해야 한다** */
  const u = await queryOne<{ id: string }>(
    `INSERT INTO users (email, display_name, password_hash, status)
     VALUES ('commercial.consent@example.test', 'consent check', 'x', 'active')
     ON CONFLICT (email) DO UPDATE SET display_name = EXCLUDED.display_name
     RETURNING id::text`);
  if (u) {
    await query(`DELETE FROM consent_records WHERE user_id = $1`, [u.id]);
    const docs = await CS.activeDocs("ko");
    const need = CS.requiredIds(docs);
    const opt = docs.filter((d) => !d.required).map((d) => d.id);

    const partial = await CS.record({
      userId: u.id, locale: "ko", agreedIds: need.slice(1),
    });
    ok("필수 동의가 빠지면 거절한다", !partial.ok,
      partial.ok ? "통과했다" : partial.reason);
    ok("거절했으면 아무것도 적지 않는다",
      !(await CS.hasRequired(u.id, "ko")));

    const full = await CS.record({
      userId: u.id, locale: "ko", siteId: "kr", agreedIds: [...need, ...opt],
    });
    ok("필수를 다 받으면 적는다", full.ok, full.ok ? `${full.saved}줄` : full.reason);
    ok("필수 동의를 다 받은 것이 읽힌다", await CS.hasRequired(u.id, "ko"));

    /* **같은 판에 두 줄을 만들지 않는다** */
    await CS.record({ userId: u.id, locale: "ko", agreedIds: [...need, ...opt] });
    const n = await queryOne<{ n: string }>(
      `SELECT count(*)::text AS n FROM consent_records WHERE user_id = $1`, [u.id]);
    ok("같은 판에 두 번 동의해도 한 줄이다", Number(n?.n ?? 0) === docs.length,
      `${n?.n}줄 / 문서 ${docs.length}개`);

    /* 선택은 철회된다. 필수는 철회로 끄지 않는다(그건 탈퇴다) */
    ok("선택 동의는 철회된다", opt.length > 0 && await CS.withdraw(u.id, opt[0]));
    ok("필수 동의는 철회로 끄지 않는다", !(await CS.withdraw(u.id, need[0])));
    const st = await CS.statusOf(u.id, "ko");
    const w = st.find((x) => x.id === opt[0]);
    ok("철회한 때가 남는다", !!w?.withdrawn_at && !w.agreed,
      w?.withdrawn_at ? "남는다" : "없다");
    ok("철회해도 줄을 지우지 않는다", st.length === docs.length, `${st.length}줄`);

    /* 판을 올리면 다시 받아야 한다. **종류만 보면 고친 약관에 동의
       없이 서비스가 계속된다** */
    await query(
      `INSERT INTO consent_documents
         (kind, version, locale, title, body_path, required, translation_status)
       VALUES ('terms','v-probe','ko','판 올림 검사',NULL,true,'translated')
       ON CONFLICT (kind, version, locale) DO NOTHING`);
    const after = await CS.hasRequired(u.id, "ko");
    ok("판을 올리면 다시 받아야 한다", !after, after ? "그냥 통과했다" : "다시 받는다");
    await query(`DELETE FROM consent_documents WHERE version = 'v-probe'`);
  }

  /* ── 13. 우리 밖에서 정해져야 하는 것 ──────────────────────────── */
  for (const m of ["KR", "GLOBAL"] as const) {
    const r = marketReadiness(m);
    if (!r.ready && r.blocker) blocker(`${m} 결제`, r.blocker, "결제 대행사·심사");
  }
  if (tbd.length) {
    blocker("ME_V2 가격", `${tbd.length}개 상품의 값이 승인되지 않았습니다 ` +
      `(${tbd.map((r) => r.code).join(" · ")})`, "사업 결정");
  }
  /* 도메인. 규격 철자의 `.com` 에 이미 남이 있다 */
  blocker("도메인", "careermatri.com 에 이미 남의 서버가 응답합니다. " +
    "어느 철자를 살지와 소유 확인이 남아 있습니다 (WHOIS 가 이 컨테이너에서 막혀 있습니다)",
    "도메인 구매");
  blocker("사업자 정보", "전자상거래법 제10조 표시(상호·대표자·주소·전화·" +
    "사업자등록번호·통신판매업 신고번호)가 비어 있습니다. 지어내지 않았습니다",
    "사업자 등록");
  if (pend.length) {
    blocker("영문 약관", `${pend.length}개 문서의 영문 번역이 없습니다. ` +
      "구조는 다 되어 있고 본문만 넣으면 됩니다 " +
      "(지금은 한국어 본문이 기준이라고 영어로 적어 두었습니다)",
      "법률 검토·번역");
  }

  report();
}

function report(): void {
  const bad = T.filter((x) => !x.pass);
  console.log("── 우리가 끝낸 것 ────────────────────────────────");
  for (const t of T) {
    console.log(`  ${t.pass ? "OK  " : "실패"} ${t.n}${t.d ? `  (${t.d})` : ""}`);
  }
  console.log("\n── 상용화를 막는 것 (우리 밖에서 정해진다) ──────");
  if (!B.length) console.log("  없음");
  for (const b of B) console.log(`  · ${b.n} — ${b.why}  [${b.who}]`);

  console.log(bad.length
    ? `\n${bad.length}개가 걸렸다.`
    : `\n상용화 준비 검사 OK — 끝낸 것 ${T.length}가지 · 막힌 것 ${B.length}가지.`);
  process.exit(bad.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
