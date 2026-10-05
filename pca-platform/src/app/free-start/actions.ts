"use server";

import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { productByCode, priceState } from "@/lib/catalog";
import { openFreeOrder } from "@/lib/orders";
import { step } from "@/lib/funnel-server";

/**
 * 승인된 무료 상품을 연다.
 *
 * 결제를 거치지 않는 길이라 **여기가 등급을 올리는 문이 되면 안 된다.**
 * 막는 것은 셋이다.
 *
 *   ① 화면이 보낼 수 있는 것은 **상품 코드 하나**다. 등급은 보낼 수 없다
 *   ② 그 상품이 `FREE_APPROVED` 가 아니면 거절한다. 유료 상품 코드를
 *      적어 넣어도 여기서 걸린다
 *   ③ 등급은 상품이 정하고 이용권이 들고 간다(`openFreeOrder`). 주소의
 *      `?tier=PRO` 는 여기까지 오지 못한다
 *
 * **두 번 눌러도 이용권이 둘 생기지 않는다.** 주문 번호가 사람과 상품으로
 * 정해져 있어서 DB 가 두 번째를 거절한다(코드의 `if` 가 아니다).
 *
 * **POST 로만 연다.** 주소만 눌러도 주문이 생기면 링크 미리보기나
 * 크롤러가 계정에 주문을 만든다(`/free` 와 같은 규칙).
 */
export async function startFreeAction(form: FormData): Promise<void> {
  const code = String(form.get("product") ?? "").trim();
  if (!code) redirect("/pricing");

  const p = await productByCode(code);
  if (!p || !p.active) redirect("/pricing");
  if (priceState(p) !== "FREE_APPROVED") redirect("/pricing");

  /* 로그인하지 않았으면 가입으로 보내고, 끝나면 여기로 돌아온다.
     **로그인을 요구해 막지 않는다**: 처음 온 사람은 계정이 없다 */
  const user = await currentUser();
  if (!user) {
    redirect(`/signup?next=${encodeURIComponent(`/free-start?product=${code}`)}`);
  }

  await openFreeOrder(user.id, code);
  await step("purchase", {
    userId: user.id,
    props: { product: code, tier: p.tier, market: p.market, reason: "free" },
  });
  redirect("/assessment/start");
}
