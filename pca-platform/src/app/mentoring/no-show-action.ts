"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { NoShowError, reportNoShow } from "@/lib/noshow";

export type NoShowActionState = { message?: string; ok?: string };

/** 신청자 화면과 멘토 콘솔이 같은 동작을 쓴다. 지목 대상은 서버가 정한다 */
export async function reportNoShowAction(
  _prev: NoShowActionState,
  formData: FormData,
): Promise<NoShowActionState> {
  const user = await requireUser();

  try {
    await reportNoShow({
      requestId: String(formData.get("requestId") ?? ""),
      userId: user.id,
      note: String(formData.get("note") ?? ""),
    });
  } catch (e) {
    if (e instanceof NoShowError) return { message: e.message };
    throw e;
  }

  revalidatePath("/mentoring/requests");
  revalidatePath("/mentoring/mentor");
  return { ok: "신고를 접수했습니다. 운영사가 확인한 뒤 알려드립니다." };
}
