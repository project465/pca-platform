/**
 * 밤 당번.
 *
 * 사람이 자는 동안 돈이 들어오려면 넷이 사람 없이 돌아야 한다 — 팔리고,
 * 열리고, 알려지고, **막힌 것이 아침에 눈에 띄어야** 한다. 앞의 셋은
 * 화면과 `settlePayment` 가 이미 한다. 이 스크립트는 넷째다.
 *
 * 하는 일 셋. 순서가 곧 이유다.
 *
 *   1. 재고를 세고 모자라면 운영자에게 한 줄 적는다
 *      — 코드가 떨어지면 밤사이 구매가 조용히 멈춘다
 *   2. 대기열을 내보낸다
 *      — 가입·채점 알림은 화면이 적어만 두고 지나갔다
 *   3. 어젯밤에 무슨 일이 있었는지 한 장으로 찍는다
 *
 * 세는 일은 `src/lib/ops.ts` 가 한다. `/admin/ops` 화면과 같은 함수다 —
 * 두 곳에서 따로 세면 숫자가 갈리고, 갈리는 순간 둘 다 못 믿는다.
 *
 *   npm run metri:ops            어제 하루
 *   npm run metri:ops -- 7       최근 7일
 */
import { flushOutbox, checkCodeStock } from "../../src/lib/outbox";
import { briefing } from "../../src/lib/ops";

const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;
function table(rows: string[][]) {
  if (!rows.length) return "    (없음)";
  const w = rows[0].map((_, i) => Math.max(...rows.map((r) => [...r[i]].length)));
  return rows.map((r) => "    " + r.map((c, i) => c.padEnd(w[i] + 2)).join("").trimEnd()).join("\n");
}

async function main() {
  const days = Math.max(1, Number(process.argv[2] ?? 1));

  // 세기 전에 손부터 쓴다 — 브리핑이 방금 내보낸 결과를 담게 된다
  await checkCodeStock();
  const flushed = await flushOutbox(200);
  const b = await briefing(days);

  console.log("════════════════════════════════════════════════");
  console.log(`  Careermetri 운영 브리핑 — ${b.at.slice(0, 16).replace("T", " ")} UTC`);
  console.log(`  구간: 최근 ${b.days}일`);
  console.log("════════════════════════════════════════════════");

  console.log("\n[ 응시권 코드 재고 ]");
  console.log(table(b.stock.map((r) => [r.product, `${r.left}장`])));
  if (b.lowStock.length) console.log(`    기준 ${b.stockMin}장 아래: ${b.lowStock.map((s) => s.product).join(", ")}`);

  console.log("\n[ 보낼 것 대기열 ]");
  console.log(`    이번 실행 — 보냄 ${flushed.sent} · 접음 ${flushed.skipped}`
    + ` · 자격증명이 없어 그대로 둔 것 ${flushed.held} · 실패 ${flushed.failed}`);
  console.log(table(b.outbox.map((r) => [r.status, `${r.n}건`])));
  if (!b.gates.mail) console.log("    메일 자격증명(MAIL_HOST·MAIL_FROM)이 없어 쌓아만 둔다.");

  console.log("\n[ 들어온 사람 ]");
  console.log(`    가입 ${b.people.signups}명 · 응시 시작 ${b.people.started} · 채점 끝 ${b.people.scored}`);

  console.log("\n[ 돈 ]");
  console.log(table(b.sales.map((r) => [r.product, `${r.n}건`, won(r.sum)])));
  console.log(`    합계 ${won(b.salesTotal)}`);
  console.log(`    응시권 코드 교환 ${b.codesUsed}건 (금액은 쇼핑몰 장부에 있다)`);

  const rate = b.funnel.free ? Math.round((b.funnel.upgraded / b.funnel.free) * 1000) / 10 : null;
  console.log("\n[ 무료 → 유료 ]");
  console.log(`    무료 진단 ${b.funnel.free}건 · 결과지 확장 결제 ${b.funnel.upgraded}건`
    + (rate === null ? "" : ` · ${rate}%`));
  console.log("    (같은 구간 안에서 센 값이다. 무료로 풀고 며칠 뒤 사는 사람이 흔해 낮게 나온다)");

  if (b.refunds.length) {
    console.log("\n[ 환불 ]");
    console.log(table(b.refunds.map((r) => [r.reason, `${r.n}건`, won(r.sum)])));
  }

  console.log("\n[ 막힌 것 ]");
  console.log(`  확정 안 된 결제 ${b.stale.length}건`);
  if (b.stale.length) console.log(table(b.stale.map((r) => [r.orderNo, r.product, won(r.amount), r.age])));
  console.log(`  결제됐는데 열린 것이 없는 주문 ${b.orphan.length}건`);
  if (b.orphan.length) console.log(table(b.orphan.map((r) => [r.orderNo, r.product, won(r.amount)])));
  console.log(`  공개를 기다리는 회차 ${b.waiting.length}건`);
  if (b.waiting.length) console.log(table(b.waiting.map((r) => [`#${r.id}`, r.name, `채점 끝 ${r.n}명`])));

  console.log("\n[ 팔 수 있는 상태인가 ]");
  console.log(`    켜져 있는 상품 ${b.products.length}개 — ${b.products.map((p) => p.code).join(", ") || "없음"}`);
  console.log(`    카드 결제 ${b.gates.card
    ? (b.gates.mock ? "열림 — 다만 가짜 결제(mock)다. 돈은 들어오지 않는다" : "열림")
    : "닫힘 (PORTONE_* 가 비어 있다)"}`);
  console.log(`    코드 교환 ${b.gates.codes ? "열림" : "닫힘 (쓸 수 있는 코드가 없다)"}`);

  console.log("\n════════ 사람이 할 일 ════════");
  if (!b.todo.length) console.log("  없다. 그대로 두면 된다.");
  else b.todo.forEach((t, i) => console.log(`  ${i + 1}. ${t}`));
  console.log("");
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
