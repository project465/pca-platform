"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { saveRegion } from "@/lib/me-v3/platform";

/**
 * 희망 지역과 이동 범위를 적는다.
 *
 * **Core 판정에 들어가지 않는다.** 이 값이 바꾸는 것은 탐색 화면과 결과를
 * 읽는 순서뿐이고, 축 수준과 영역 묶음은 한 글자도 달라지지 않는다.
 */
export async function pickRegion(form: FormData): Promise<void> {
  const user = await requireUser();
  await saveRegion(
    user.id,
    String(form.get("region") ?? "") || null,
    String(form.get("move") ?? "") || null);
  revalidatePath("/me");
  revalidatePath("/me/region");
}
