import { mockPaymentsAllowed } from "@/lib/env";
import { kcpBilling } from "./kcp";
import { mockBilling } from "./mock";
import { paddleBilling } from "./paddle";
import type { BillingName, BillingProvider } from "./types";

/** 정기결제 결제사를 이름으로. 운영에서 mock 은 돌려주지 않는다 */
export function billingFor(name: BillingName): BillingProvider {
  if (name === "kcp") return kcpBilling;
  if (name === "paddle") return paddleBilling;
  if (!mockPaymentsAllowed()) throw new Error("운영에서 mock 정기결제는 열리지 않습니다.");
  return mockBilling;
}
