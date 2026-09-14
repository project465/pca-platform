/**
 * 응시권 코드를 찍는다. 쇼핑몰에 붙여 넣을 목록이 나온다.
 *
 * **평문은 지금 이 화면에만 있다.** DB 에는 sha256 만 들어간다. 창을 닫으면
 * 다시 볼 수 없고 새로 찍는 수밖에 없다 — 임시 비밀번호와 같은 규칙이다.
 * 그래서 파일로 받아 두고, 쇼핑몰에 올린 뒤에는 그 파일을 지운다.
 *
 *   npm run metri:codes -- --product REPORT_HS --count 50 --batch imweb-2026-09
 *   npm run metri:codes -- --product REPORT_HS --count 50 --batch x --days 365 > codes.csv
 *
 * 옵션
 *   --product  상품 코드 (기본 REPORT_HS)
 *   --count    장수 (기본 10, 최대 2000)
 *   --batch    묶음 이름. 나중에 현황을 보거나 통째로 막을 때 쓴다
 *   --days     이 날짜 뒤에는 못 쓴다. 없으면 기한 없음
 *   --ref      쇼핑몰 주문번호 등 대조용 메모. 개인정보는 넣지 않는다
 */
import { issueCodes, batchStatus } from "../../src/lib/redeem";

function arg(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

async function main() {
  const productCode = arg("product", "REPORT_HS")!;
  const count = Number(arg("count", "10"));
  const batch = arg("batch") ?? `manual-${new Date().toISOString().slice(0, 10)}`;
  const days = arg("days") ? Number(arg("days")) : null;
  const externalRef = arg("ref") ?? null;

  if (!Number.isInteger(count) || count < 1) throw new Error("--count 는 1 이상의 정수입니다.");

  const expiresAt = days ? new Date(Date.now() + days * 86_400_000) : null;
  const codes = await issueCodes({ productCode, count, batch, expiresAt, externalRef });

  // 쇼핑몰 쿠폰 업로드에 그대로 쓰도록 CSV 로 낸다
  console.log("code,product,batch,expires_at");
  for (const c of codes) {
    console.log(`${c.display},${productCode},${batch},${expiresAt ? expiresAt.toISOString() : ""}`);
  }

  console.error(`\n${codes.length}장 · 상품 ${productCode} · 묶음 ${batch}`);
  console.error(expiresAt ? `기한 ${expiresAt.toISOString().slice(0, 10)}` : "기한 없음");
  for (const row of await batchStatus(batch)) {
    console.error(`  누적 — 발행 ${row.total} · 사용 ${row.used} · 취소 ${row.voided}`);
  }
  console.error("\n이 목록은 여기에만 있습니다. DB 에는 해시만 들어갑니다.");
  console.error("쇼핑몰에 올린 뒤에는 내려받은 파일을 지우십시오.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
