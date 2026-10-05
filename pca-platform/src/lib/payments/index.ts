import type { PaymentProvider, PayRegion } from "./types";
import { mockProvider } from "./mock";
import { mockPaymentsAllowed } from "@/lib/env";
import { portoneProvider } from "./portone";

export * from "./types";
export { matchesOrder } from "./verify";
export { markMockPaid } from "./mock";
export { globalChannelReady } from "./portone";

/**
 * PAYMENTS_PROVIDER 로 고른다. 기본값은 mock 이다.
 *
 * **운영에서 가짜 결제는 어떤 환경변수로도 열리지 않는다.** 전에는
 * `NODE_ENV=production` 을 보고 `ALLOW_MOCK_PAYMENTS=yes` 가 그 문을
 * 열 수 있었는데, 두 가지가 다 틀렸다.
 *
 *   1. `NODE_ENV` 는 **빌드가 최적화됐다는 뜻**이지 손님이 돈을 내는
 *      자리라는 뜻이 아니다. staging 도 똑같이 production 으로 빌드된다
 *   2. 열쇠가 있는 자물쇠는 언젠가 열린다. 그 한 줄이 운영 설정에 섞여
 *      들어가면 **돈을 안 받고 이용권이 나간다**
 *
 * 그래서 판단을 `APP_ENV` 로 옮기고 문을 없앴다(`src/lib/env.ts`).
 */
export function paymentProvider(): PaymentProvider {
  const name = process.env.PAYMENTS_PROVIDER ?? "mock";

  if (name === "portone") return portoneProvider;

  if (name === "mock") {
    if (!mockPaymentsAllowed()) {
      throw new Error(
        "운영(APP_ENV=production)에서는 가짜 결제를 쓸 수 없습니다. " +
        "PAYMENTS_PROVIDER=portone 으로 바꾸거나, 아직 심사 중이면 " +
        "APP_ENV=staging 으로 띄우십시오.",
      );
    }
    return mockProvider;
  }

  throw new Error(`알 수 없는 PAYMENTS_PROVIDER: ${name}`);
}

/** 시장과 그 시장의 결제를 받을 준비가 얼마나 됐는가 */
export type MarketReadiness = {
  market: "KR" | "GLOBAL";
  region: PayRegion;
  /** 이 시장의 결제를 지금 받을 수 있는가 */
  ready: boolean;
  /** 받을 수 없으면 무엇이 없어서인가. 받을 수 있으면 null */
  blocker: string | null;
  /** 어느 대행사가 받는가. 아직 안 정했으면 null */
  provider: string | null;
};

/**
 * 이 시장의 결제를 누가 받는가.
 *
 * **대행사가 시장마다 다를 수 있다.** 국내 PG 의 일반 카드결제로는 해외
 * 발급 Visa·Mastercard 가 승인되지 않아서, 글로벌은 해외결제 채널이나
 * 다른 대행사를 거쳐야 한다.
 *
 * **없는 것을 켜 두지 않는다.** 글로벌 쪽 대행사가 아직 정해지지 않았고,
 * 그래서 여기는 '정해지지 않았다' 를 **값으로** 돌려준다. 주석으로만
 * 적어 두면 화면이 결제 버튼을 그리고, 누른 사람이 예외 화면을 만난다.
 * 상용화를 막는 항목은 코드가 말해야 검사가 셀 수 있다.
 */
export function marketReadiness(market: "KR" | "GLOBAL"): MarketReadiness {
  const region: PayRegion = market === "KR" ? "domestic" : "global";
  const name = process.env.PAYMENTS_PROVIDER ?? "mock";

  if (name === "mock") {
    /* 가짜는 두 시장을 다 흉내 낸다. 운영에서는 `paymentProvider()` 가
       예외를 던져 막는다 */
    const devOk = process.env.NODE_ENV !== "production";
    return {
      market, region, ready: devOk, provider: devOk ? "mock" : null,
      blocker: devOk ? null : "운영에서 mock 결제를 쓸 수 없습니다.",
    };
  }

  if (name !== "portone") {
    return { market, region, ready: false, provider: null,
      blocker: `알 수 없는 PAYMENTS_PROVIDER: ${name}` };
  }

  if (!process.env.PORTONE_STORE_ID || !process.env.PORTONE_API_SECRET) {
    return { market, region, ready: false, provider: "portone",
      blocker: "PORTONE_STORE_ID · PORTONE_API_SECRET 이 채워지지 않았습니다." };
  }
  if (!process.env.PORTONE_WEBHOOK_SECRET) {
    return { market, region, ready: false, provider: "portone",
      blocker: "PORTONE_WEBHOOK_SECRET 이 없어 웹훅을 검증할 수 없습니다." };
  }

  if (region === "domestic") {
    return process.env.PORTONE_CHANNEL_KEY
      ? { market, region, ready: true, provider: "portone", blocker: null }
      : { market, region, ready: false, provider: "portone",
          blocker: "PORTONE_CHANNEL_KEY(국내 카드 채널)가 없습니다." };
  }

  /* 글로벌. **채널 값이 비어 있으면 닫혀 있는 것이 맞다**: 해외 PG 를
     아직 고르지 않았고, 고르지 않은 것을 열어 두면 해외 응시자가 결제
     버튼을 누르고 예외를 만난다 */
  return process.env.PORTONE_CHANNEL_KEY_GLOBAL
    ? { market, region, ready: true, provider: "portone", blocker: null }
    : {
        market, region, ready: false, provider: null,
        blocker: "해외 결제 대행사가 정해지지 않았습니다 " +
          "(PORTONE_CHANNEL_KEY_GLOBAL 이 비어 있습니다).",
      };
}

/**
 * 지금 결제를 받을 수 있는 상태인가. **던지지 않는다.**
 *
 * `paymentProvider()` 는 운영에서 mock 이면 예외를 던진다(그게 맞다.
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
