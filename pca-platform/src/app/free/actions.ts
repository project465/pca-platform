"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { openFreeOrder } from "@/lib/orders";
import { lastScoredAttempt } from "@/lib/attempts";
import { productByCode } from "@/lib/catalog";
import { startPathFor } from "@/lib/engine-entry";
import { TRACKS, resolveTrack } from "./tracks";

export type FreeState = { error?: string };

/**
 * 무료 진단을 연다.
 *
 * GET 으로 열지 않는다. 주소만 눌러도 주문이 생기면 링크 미리보기나
 * 크롤러가 학생 계정에 주문을 만들어 버린다. 그래서 버튼(POST)만 문이다.
 */
export async function openFreeAction(_prev: FreeState, formData: FormData): Promise<FreeState> {
  const user = await requireUser();
  // 폼에서 온 값을 그대로 상품 코드로 쓰지 않는다. 아는 갈래 둘 중 하나로
  // 접어서 쓴다. 주소를 고쳐 다른 상품의 좌석을 받아 갈 수 없어야 한다
  const track = resolveTrack(String(formData.get("track") ?? ""));
  try {
    await openFreeOrder(user.id, TRACKS[track].product);
  } catch {
    return { error: "fail" };
  }
  // 이미 다 풀어 채점까지 끝냈으면 그 결과지로 간다. 무료는 한 번이므로
  // 그냥 응시 화면으로 보내면 "좌석이 없습니다" 를 보게 된다.
  const done = await lastScoredAttempt(user.id);
  if (done) redirect(`/report/${done}`);

  /**
   * **신규 사용자를 옛 검사로 보내지 않는다.**
   *
   * 전에는 여기가 `/test`(ME_V1 253문항) 였다. 이 문으로 들어온 사람이
   * 지금 제품이 아닌 검사를 풀었다. 산 상품이 가리키는 검사로 보내고,
   * 그 상품이 옛 판본이면 전공 고르는 화면으로 돌린다 — **이 문이 옛
   * 검사의 신규 진입 동선이 되지 않게 한다.**
   *
   * 옛 판본으로 **이미 응시하신 분**의 이어하기는 위의 결과지 줄과
   * `/my/assessments` 가 들고 있다(`engine-entry.ts` 의 route 표).
   */
  const bought = await productByCode(TRACKS[track].product);
  redirect(startPathFor(bought?.assessment_version) ?? "/cores");
}
