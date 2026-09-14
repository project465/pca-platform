/**
 * 무료 문이 받는 두 갈래.
 *
 * **화면에서 넘어온 상품 코드를 그대로 쓰지 않는다.** 결제 금액을 화면에서
 * 받지 않는 것과 같은 이유다 — 주소창에 `?track=` 을 고쳐 다른 상품의
 * 좌석을 받아 갈 수 있으면 안 된다. 여기 적힌 둘만 문이다.
 */
export const TRACKS = {
  hs: { product: "HS_FREE", brand: "메트리 플러스" },
  univ: { product: "UNIV_FREE", brand: "METRI" },
} as const;

export type TrackKey = keyof typeof TRACKS;

/** 모르는 값이면 고교판으로 떨어진다 — 모르면 덜 준다(설계 원칙 10). */
export function resolveTrack(raw: string | undefined): TrackKey {
  return raw === "univ" ? "univ" : "hs";
}
