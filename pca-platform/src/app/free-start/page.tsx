import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { productByCode, priceState } from "@/lib/catalog";
import { openFreeOrder } from "@/lib/orders";

/**
 * 가입을 마치고 돌아오는 자리.
 *
 * 무료는 POST 로만 연다. 그런데 가입 화면은 끝나면 `next` 주소로
 * **GET** 으로 돌려보내므로, 돌아올 자리가 하나 필요하다.
 *
 * **그래서 이 쪽은 로그인한 사람에게만 동작한다.** 로그인하지 않은
 * 요청은 주문을 만들지 않고 가격표로 돌아간다. 링크 미리보기나 크롤러가
 * 이 주소를 눌러도 계정이 없으므로 아무 일도 일어나지 않는다.
 */
export default async function FreeStartPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>;
}) {
  const sp = await searchParams;
  const code = (sp.product ?? "").trim();
  const user = await currentUser();
  if (!user) redirect(`/signup?next=${encodeURIComponent(`/free-start?product=${code}`)}`);

  const p = code ? await productByCode(code) : null;
  if (!p || !p.active || priceState(p) !== "FREE_APPROVED") redirect("/pricing");

  await openFreeOrder(user.id, p.code);
  redirect("/assessment/start");
}
