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
