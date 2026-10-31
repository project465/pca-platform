import { isSuperadmin } from "@/lib/session";
import { activeTrack } from "@/lib/track";

/**
 * **MAT(AI 취업비서)을 고객에게 보일지 정하는 스위치 하나**(2026-10-31 대표 지시: "가려",
 * "MAT은 기능 완성되면 그때 다시 하자"). 홈페이지 쪽 같은 이름의 스위치는
 * `marketing/src/lib/mat-public.ts` 에 따로 있다.
 *
 * false 인 동안:
 * - 작업공간 띠 · 손전화 아래 띠 · 앱 홈 · 요금 화면 · 결과지 끝 줄 · 계정 화면에서 MAT 으로
 *   가는 길이 보이지 않는다
 * - `/me/track/*` 와 `/m/mat` 은 운영자(superadmin)와 **이미 이용 기간이 있는 사람**만 열린다.
 *   그 밖의 사람은 작업공간 홈으로 돌아간다. 쓰던 사람의 길은 끊지 않는다
 * - 제휴 화면은 `brand.ts` 의 PARTNERS_PUBLIC 이 따로 가린다
 *
 * 다시 열 때는 `mat-switch.ts` 의 값 하나만 true 로 바꾼다.
 */
export { MAT_PUBLIC } from "./mat-switch";
import { MAT_PUBLIC } from "./mat-switch";

/** 이 사람에게 MAT 화면을 열어도 되는가 */
export async function matVisible(userId?: string | null): Promise<boolean> {
  if (MAT_PUBLIC) return true;
  if (await isSuperadmin()) return true;
  if (!userId) return false;
  const t = await activeTrack(userId).catch(() => null);
  return Boolean(t?.on);
}
