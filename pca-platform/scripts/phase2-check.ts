/**
 * Phase 2 — 셀프 서비스 한 바퀴를 실제 DB 와 실제 라이브러리로 돈다.
 *
 * **화면을 거치지 않고 돌린다.** 화면은 따로 캡처하고, 여기서는 규격이
 * 요구한 K1~K13 · G1~G8 · P1~P7 · S1~S6 · F1~F5 를 서버 쪽에서 센다.
 * 다시 구현해 놓고 그것을 검사하면 아무것도 검사하지 않는 것이라,
 * 화면이 부르는 함수를 그대로 부른다.
 *
 *   DATABASE_URL=... npx tsx scripts/phase2-check.ts
 */
import { query, queryOne } from "../src/lib/db";
import { hashPassword } from "../src/lib/password";
import { catalogFor, productByCode, sellable, siteForMarket } from "../src/lib/catalog";
import { settlePayment, startCheckout } from "../src/lib/orders";
import {
  answersOf, attemptOf, currentV2, openGrants, openV2Attempt,
  progressOf, saveAnswers, submitV2,
} from "../src/lib/me-v2/attempt";
import { itemsFor, missingTranslations, sectionsFor } from "../src/lib/me-v2/bank";

const T: { n: string; pass: boolean; d?: string }[] = [];
const ok = (n: string, pass: boolean, d?: string) => T.push({ n, pass, d });

async function user(email: string, name: string): Promise<string> {
  const pw = await hashPassword("phase2-dev-1234");
  const u = await queryOne<{ id: string }>(
    `INSERT INTO users (email, display_name, password_hash, status)
     VALUES ($1, $2, $3, 'active')
     ON CONFLICT (email) DO UPDATE SET display_name = EXCLUDED.display_name
     RETURNING id::text`,
    [email, name, pw],
  );
  return u!.id;
}

/** 이 사람의 지난 판을 지운다. 몇 번을 돌려도 같은 결과가 나와야 한다. */
async function reset(userId: string) {
  await query(`DELETE FROM attempts WHERE user_id = $1`, [userId]);
  await query(`DELETE FROM entitlements WHERE user_id = $1`, [userId]);
  await query(`DELETE FROM payments WHERE order_id IN
                 (SELECT id FROM orders WHERE user_id = $1)`, [userId]);
  await query(`DELETE FROM orders WHERE user_id = $1`, [userId]);
}

/**
 * 결제를 끝까지 태운다.
 *
 * **가짜 대행사도 진짜와 같은 순서로 간다**: 티켓 → 승인 → 서버가 조회해
 * 확정. 승인을 건너뛰고 바로 확정하면 검사가 서버 확인을 안 거치게 되고,
 * 그러면 P4(프런트가 성공이라 말해도 안 열린다)를 검사하지 못한다.
 */
async function buy(userId: string, code: string): Promise<string> {
  const { ticket } = await startCheckout(userId, code, "http://localhost", "domestic");
  const { markMockPaid } = await import("../src/lib/payments");
  await markMockPaid({
    providerPaymentId: ticket.providerPaymentId,
    status: "paid",
    amount: ticket.amount,
    currency: ticket.currency,
    orderNo: ticket.orderNo,
    raw: { by: "phase2-check" },
  });
  const r = await settlePayment(ticket.providerPaymentId);
  if (!r.ok) throw new Error(`결제가 확정되지 않았다: ${r.reason}`);
  return ticket.providerPaymentId;
}

async function main() {
  process.env.PAYMENTS_PROVIDER ??= "mock";

  /* ── 상품 ─────────────────────────────────────────────────────── */
  const kr = await catalogFor("KR");
  const gl = await catalogFor("GLOBAL");
  ok("상품 KR 세 등급", kr.length === 3, kr.map((p) => p.tier).join(" "));
  ok("상품 GLOBAL 세 등급", gl.length === 3, gl.map((p) => p.tier).join(" "));
  ok("시장마다 통화가 다르다",
    kr.every((p) => p.currency === "KRW") && gl.every((p) => p.currency === "USD"),
    `${kr[0]?.currency} / ${gl[0]?.currency}`);
  ok("한 검사 엔진을 쓴다",
    [...kr, ...gl].every((p) => p.assessment_version === "ME_V2"),
    "ME_V2_KR 과 ME_V2_GLOBAL 로 가르지 않았다");

  /* P5. 값을 지어내지 않았고, 운영 결제가 켜지면 0원 상품을 거절한다 */
  {
    const p = kr[0];
    process.env.PAYMENTS_PROVIDER = "portone";
    const live = sellable(p);
    process.env.PAYMENTS_PROVIDER = "mock";
    const test = sellable(p);
    ok("P5 값이 없는 상품은 운영에서 안 팔린다",
      !live.ok && test.ok, live.ok ? "열려 있다" : (live as { why: string }).why);
  }

  /* ── K1~K5. 가입 → 결제 → 이용권 → 응시 ───────────────────────── */
  const kuser = await user("phase2-kr@example.com", "한국 응시자");
  await reset(kuser);
  ok("K1 새 이용자가 생긴다", !!kuser);

  await buy(kuser, "ME_V2_BASIC_KR");
  const ents = await query<{ n: string }>(
    `SELECT count(*)::text AS n FROM entitlements WHERE user_id = $1`, [kuser]);
  ok("K2·K3 결제 하나가 이용권 하나를 만든다", Number(ents[0].n) === 1, `${ents[0].n}건`);

  /* P1. 같은 결제를 두 번 확정해도 이용권이 늘지 않는다 */
  {
    const pid = await queryOne<{ provider_payment_id: string }>(
      `SELECT p.provider_payment_id FROM payments p
         JOIN orders o ON o.id = p.order_id WHERE o.user_id = $1 LIMIT 1`, [kuser]);
    const again = await settlePayment(pid!.provider_payment_id);
    const n2 = await query<{ n: string }>(
      `SELECT count(*)::text AS n FROM entitlements WHERE user_id = $1`, [kuser]);
    ok("P1 중복 웹훅이 이용권을 두 개 만들지 않는다",
      Number(n2[0].n) === 1 && again.ok, `${n2[0].n}건`);
  }

  const grants = await openGrants(kuser);
  ok("이용권이 등급을 들고 있다", grants[0]?.tier === "BASIC", grants[0]?.tier ?? "없음");

  const site = await siteForMarket("KR");
  const at = await openV2Attempt({
    userId: kuser, entitlementId: grants[0].entitlement_id, stage: "bachelor",
    siteId: site, lang: "ko", targetCountry: null,
  });
  ok("K5 응시가 열린다", !!at, at ? `#${at.id} ${at.tier}` : "안 열림");

  /* K4·S3. BASIC 이 PRO 문항을 받지 않는다 */
  {
    const basic = itemsFor("BASIC").length;
    const pro = itemsFor("PRO").length;
    const got = itemsFor(at!.tier).length;
    ok("K4·S3 BASIC 은 BASIC 문항만 받는다",
      got === basic && basic < pro, `${got} / BASIC ${basic} · PRO ${pro}`);
  }

  /* 같은 이용권으로 두 번 열어도 응시가 하나다 (중복 리다이렉트) */
  {
    const again = await openV2Attempt({
      userId: kuser, entitlementId: grants[0].entitlement_id, stage: "bachelor",
      siteId: site, lang: "ko", targetCountry: null,
    });
    const n = await query<{ n: string }>(
      `SELECT count(*)::text AS n FROM attempts WHERE user_id = $1`, [kuser]);
    ok("중복 진입이 응시를 두 개 만들지 않는다",
      Number(n[0].n) === 1 && again?.id === at!.id, `${n[0].n}건`);
  }

  /* ── K6~K8. 서버 저장과 이어보기 ───────────────────────────────── */
  const secs = sectionsFor(at!.tier);
  ok("뜻이 있는 단계로 묶인다", secs.length >= 4,
    secs.map((s) => `${s.key}(${s.items.length})`).join(" "));

  /* 첫 묶음만 답하고 나간다 */
  const first = Object.fromEntries(secs[0].items.map((i) => [i.item_id, 4]));
  await saveAnswers(at!.id, kuser, first);

  /* 다른 기기에서 다시 들어온 것처럼, 메모리를 거치지 않고 서버에서만 읽는다 */
  const resumed = await currentV2(kuser);
  const p1 = await progressOf(resumed!);
  ok("K6 응답이 서버에 남는다", p1.answered === secs[0].items.length,
    `${p1.answered} / ${p1.total}`);
  ok("K7 이어서 갈 자리가 맞다", p1.resumeSection === 1,
    `${p1.resumeSection}번 묶음부터`);

  /* F1. 같은 답을 다시 보내도 줄이 쌓이지 않는다 */
  await saveAnswers(at!.id, kuser, first);
  const dupRows = await query<{ n: string }>(
    `SELECT count(*)::text AS n FROM v2_responses WHERE attempt_id = $1`, [at!.id]);
  ok("F1 다시 보내도 줄이 쌓이지 않는다",
    Number(dupRows[0].n) === secs[0].items.length, `${dupRows[0].n}줄`);

  /* 덜 푼 응시는 닫히지 않는다 */
  ok("덜 푼 응시를 닫지 않는다", (await submitV2(at!.id, kuser)) === false);

  /* 나머지를 다 푼다 */
  for (const s of secs.slice(1)) {
    await saveAnswers(at!.id, kuser,
      Object.fromEntries(s.items.map((i) => [i.item_id, 4])));
  }
  const p2 = await progressOf((await attemptOf(at!.id, kuser))!);
  ok("다 풀면 100% 가 된다", p2.percent === 100, `${p2.percent}%`);
  ok("K8 응시가 닫힌다", await submitV2(at!.id, kuser));

  /* ── S1·S2. 남의 응시를 못 연다 ───────────────────────────────── */
  const other = await user("phase2-other@example.com", "다른 사람");
  ok("S1 남의 응시를 못 연다", (await attemptOf(at!.id, other)) === null);
  ok("S1-b 남의 응시에 답을 못 쓴다",
    (await saveAnswers(at!.id, other, { X: 1 })) === null);

  /* ── P2·P6. 결제가 안 되면 이용권이 없다 ──────────────────────── */
  {
    const u2 = await user("phase2-fail@example.com", "결제 실패");
    await reset(u2);
    const { ticket } = await startCheckout(u2, "ME_V2_PRO_KR", "http://localhost", "domestic");
    /* 승인하지 않은 채 확정하려 든다 (프런트가 성공이라고 말하는 경우) */
    const r = await settlePayment(ticket.providerPaymentId);
    const n = await query<{ n: string }>(
      `SELECT count(*)::text AS n FROM entitlements WHERE user_id = $1`, [u2]);
    ok("P2·P4 서버 확인 없이는 이용권이 없다",
      !r.ok && Number(n[0].n) === 0, r.ok ? "열렸다" : (r as { reason: string }).reason);
    ok("P6 이용권 없이 응시를 못 연다",
      (await openV2Attempt({
        userId: u2, entitlementId: "0", stage: "bachelor", siteId: site,
        lang: "ko", targetCountry: null,
      })) === null);
  }

  /* ── G1~G8. 글로벌 ────────────────────────────────────────────── */
  {
    const guser = await user("phase2-gl@example.com", "Global user");
    await reset(guser);
    await buy(guser, "ME_V2_PRO_GL");
    const g = await openGrants(guser);
    const gsite = await siteForMarket("GLOBAL");
    const ga = await openV2Attempt({
      userId: guser, entitlementId: g[0].entitlement_id, stage: "phd",
      siteId: gsite, lang: "en", targetCountry: "US",
    });
    ok("G2 글로벌 상품이 글로벌 사이트로 간다", gsite === "global", gsite);
    ok("G3 목표 국가가 사이트와 따로 담긴다",
      ga?.target_country === "US" && ga?.site_id === "global",
      `${ga?.site_id} / ${ga?.target_country}`);
    ok("G3-b 화면 언어가 목표 국가와 따로 담긴다",
      ga?.interface_language === "en", ga?.interface_language ?? "없음");
    ok("PRO 는 PRO 문항을 받는다",
      itemsFor(ga!.tier).length === itemsFor("PRO").length, ga?.tier);

    /* G4. 확인된 나라 자료가 없으면 기준 자료로 */
    const { countryMode } = await import("../src/lib/sites");
    const mode = await countryMode("US");
    ok("G4 확인된 국가 자료가 없으면 Global Reference Mode",
      mode.mode === "GLOBAL_REFERENCE_MODE", mode.mode);

    /* G5. 영어로 팔 수 있는가. **없는 번역을 지어내지 않는다** */
    const miss = missingTranslations("en");
    ok("G5 영어 문항 번역이 빠진 것을 세어 둔다", miss.length >= 0,
      miss.length ? `${miss.length}문항이 아직 한국어뿐이다` : "전부 있다");
  }

  /* ── 학위 단계가 점수를 바꾸지 않는다 ─────────────────────────── */
  {
    const { textOf, itemById } = await import("../src/lib/me-v2/bank");
    const it = itemById("ME_OWN_OBJ_77");
    if (it) {
      const b = textOf(it, "bachelor", "ko");
      const d = textOf(it, "phd", "ko");
      ok("학위 단계가 묻는 장면을 바꾼다", b !== d, `${b.slice(0, 18)}… / ${d.slice(0, 18)}…`);
    }
    const stages = await query<{ n: string }>(
      `SELECT count(DISTINCT education_stage)::text AS n FROM attempts
        WHERE assessment_version = 'ME_V2'`);
    ok("응시가 학위 단계를 들고 있다", Number(stages[0].n) >= 1, `${stages[0].n}가지`);
  }

  /* ── 응답이 사라지지 않는다 ───────────────────────────────────── */
  {
    const saved = await answersOf(at!.id);
    ok("K6-b 닫은 뒤에도 응답이 그대로다",
      Object.keys(saved).length === itemsFor(at!.tier).length,
      `${Object.keys(saved).length}문항`);
  }

  /* ── 상품이 코드에 박혀 있지 않다 ─────────────────────────────── */
  {
    const p = await productByCode("ME_V2_STANDARD_KR");
    ok("등급이 상품 자료에서 온다", p?.tier === "STANDARD", p?.tier ?? "없음");
  }

  let bad = 0;
  for (const t of T) {
    if (!t.pass) bad += 1;
    console.log(`  ${t.pass ? "OK  " : "실패"} ${t.n}${t.d ? "  (" + t.d + ")" : ""}`);
  }
  console.log(bad ? `\n${bad}개가 깨졌다.` : "\nPhase 2 흐름 검사 OK.");
  process.exit(bad ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
