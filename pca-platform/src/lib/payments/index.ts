import type { PaymentProvider } from "./types";
import { mockProvider } from "./mock";
import { portoneProvider } from "./portone";

export * from "./types";
export { markMockPaid } from "./mock";
export { globalChannelReady } from "./portone";

/**
 * PAYMENTS_PROVIDER 로 고른다. 기본값은 mock 이다.
 *
 * 운영에서 mock 이 켜지면 돈을 안 받고 좌석이 나간다. 그래서 막는다 —
 * 설정 실수 하나로 매출이 새는 종류의 사고는 코드가 거절해야 한다.
 */
export function paymentProvider(): PaymentProvider {
  const name = process.env.PAYMENTS_PROVIDER ?? "mock";

  if (name === "portone") return portoneProvider;

  if (name === "mock") {
    if (process.env.NODE_ENV === "production" && process.env.ALLOW_MOCK_PAYMENTS !== "yes") {
      throw new Error(
        "운영에서 mock 결제를 쓸 수 없습니다. PAYMENTS_PROVIDER=portone 으로 바꾸세요.",
      );
    }
    return mockProvider;
  }

  throw new Error(`알 수 없는 PAYMENTS_PROVIDER: ${name}`);
}

/**
 * 지금 결제를 받을 수 있는 상태인가. **던지지 않는다.**
 *
 * `paymentProvider()` 는 운영에서 mock 이면 예외를 던진다(그게 맞다 —
 * 돈을 안 받고 좌석이 나가는 것을 막는다). 그런데 무료 구간은 PG 를
 * 거치지 않으므로, 가맹점 심사가 끝나기 전에도 무료로 켤 수 있다.
 * 그 상태에서 결과지가 "남은 절 열기" 버튼을 그리면 학생이 그 버튼을
 * 눌러 예외 화면을 만난다. 그래서 **버튼을 그릴지 먼저 물어본다.**
 */
export function checkoutReady(): boolean {
  const name = process.env.PAYMENTS_PROVIDER ?? "mock";
  if (name === "portone") return true;
  // mock 은 개발·검증에서만 결제창을 흉내 낸다
  return name === "mock" && process.env.NODE_ENV !== "production";
}
