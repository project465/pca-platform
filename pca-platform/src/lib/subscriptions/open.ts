import { appEnv } from "@/lib/env";

/**
 * **정기결제를 화면에 판다고 적어도 되는가.** 던지지 않는다.
 *
 * 정기결제 운영규정(/legal/subscription) 1조: "정기결제는 결제 화면에 판매를 표시한 날부터 시작합니다".
 * 그 날은 대표가 정한다. 그 전에는 지금처럼 1회 결제 기간권만 판다.
 *
 * - 운영(`APP_ENV=production`): `SUBSCRIPTIONS_LIVE=1` 일 때만 연다. **이 값은 대표 승인 전에는 넣지 않는다**
 * - 운영이 아닌 곳: `SUBSCRIPTIONS_ENABLED=1` 이면 연다(시험 · 공개 전 배포본). 결제는 시험 결제사로만 간다
 */
export function subscriptionsOpen(): boolean {
  if (appEnv() === "production") return process.env.SUBSCRIPTIONS_LIVE === "1";
  return process.env.SUBSCRIPTIONS_ENABLED === "1";
}

/**
 * **실제 카드에서 돈을 뺄 수 있는가.** 결제사 어댑터가 청구 직전에 다시 묻는다.
 * 운영에서 `SUBSCRIPTIONS_LIVE=1` 이 아니면 어떤 결제사도 청구하지 않는다(시험 열쇠가 들어 있어도)
 */
export function liveChargesAllowed(): boolean {
  return appEnv() !== "production" || process.env.SUBSCRIPTIONS_LIVE === "1";
}
