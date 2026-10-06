/**
 * 손님 화면에 적는 말.
 *
 * **안쪽 이름을 손님에게 보여 주지 않는다.** `ME_V2_BASIC_KR` · `paid` ·
 * `v2-scoring:c089…` 는 우리가 되짚을 때 쓰는 값이고, 받은 사람에게는
 * 뜻이 없는 글자다. 뜻이 없는 글자가 결제 화면에 있으면 그 화면 전체가
 * 덜 만든 것으로 읽힌다.
 *
 * **DB 의 값을 바꾸지 않는다.** 바꾸는 것은 적는 자리뿐이고, 되짚을 때
 * 쓰는 원본은 운영 화면과 감사 기록에 그대로 남는다.
 */
import { BRAND, type Lang2 } from "@/lib/surface-text";
import { formatMoney } from "@/lib/money";

/** 상품 코드에서 등급만 꺼낸다. 모르는 코드는 그대로 두지 않고 비운다 */
export function tierOfCode(code: string | null | undefined): string | null {
  const m = /_(BASIC|STANDARD|PRO)_/.exec(String(code ?? ""));
  return m ? m[1] : null;
}

/**
 * 상품 이름.
 *
 * **시장을 적지 않는다.** `_KR` 과 `_GL` 은 어느 표에서 값을 읽을지를
 * 정하는 값이지 손님이 산 것의 이름이 아니다. 산 사람에게는 통화가 이미
 * 금액 자리에 적혀 있다.
 */
export function productLabel(code: string | null | undefined, lang: Lang2 = "ko"): string {
  const tier = tierOfCode(code);
  if (tier) return `${BRAND.root} ${tier}`;
  /* 옛 상품은 등급 이름이 없다. 코드를 내보이는 대신 제품 이름만 적는다 */
  if (!code) return BRAND.root;
  if (/^HS_/.test(code)) return lang === "en" ? "CareerMatri Plus" : "커리어메트리 플러스";
  return BRAND.root;
}

/**
 * 주문 상태.
 *
 * **0원 주문을 '결제 완료' 라고 적지 않는다.** 무료 구간은 결제를 거치지
 * 않았는데 그렇게 적으면 받은 사람이 어딘가에 돈을 냈다고 읽는다.
 */
export function orderStatusLabel(
  status: string | null | undefined,
  amount: number | null | undefined,
  lang: Lang2 = "ko",
): string {
  const free = (amount ?? 0) === 0;
  const en = lang === "en";
  switch (status) {
    case "paid":
      return free ? (en ? "Free access" : "무료 이용") : (en ? "Payment complete" : "결제 완료");
    case "pending": return en ? "Awaiting payment" : "결제 대기";
    case "failed": return en ? "Payment failed" : "결제 실패";
    case "cancelled": return en ? "Cancelled" : "취소됨";
    case "refunded": return en ? "Refunded" : "환불 완료";
    default: return en ? "In progress" : "처리 중";
  }
}

/** 0원은 '무료' 로 적는다. `0` 만 찍히면 값이 빠진 것으로 읽힌다 */
export function amountLabel(
  amount: number | null | undefined,
  currency: string | null | undefined,
  lang: Lang2 = "ko",
): string {
  if ((amount ?? 0) === 0) return lang === "en" ? "Free" : "무료";
  /* `formatMoney` 는 값이 없으면 null 을 돌려준다. 그 자리를 비워 두지
     않고 무료로 적는다: 빈 칸은 읽는 사람이 값이 빠진 것으로 읽는다 */
  return formatMoney(amount ?? 0, currency ?? "KRW", lang)
    ?? (lang === "en" ? "Free" : "무료");
}

/**
 * 결과지 판본.
 *
 * **지문을 손님에게 보여 주지 않는다.** `v2-scoring:c089…` 는 실제로
 * 돌아간 파일의 지문이라 되짚을 때 꼭 필요하지만, 받은 사람에게는 읽을
 * 수 없는 글자다. 손님에게는 검사 판본만 적는다.
 */
export function reportVersionLabel(version: string | null | undefined): string {
  return version === "ME_V2" ? "v2.0" : version === "ME_V1" ? "v1.0" : "—";
}
