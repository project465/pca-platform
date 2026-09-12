"use server";

import { revalidatePath } from "next/cache";
import { currentUser } from "@/lib/session";
import { createInquiry, InquiryError } from "@/lib/inquiry";

export type ContactState = {
  ok?: string;
  message?: string;
  /** 실패해도 적은 것이 남아 있어야 한다. 다시 타이핑하게 만들면 그냥 떠난다 */
  values?: { kind: string; name: string; email: string; message: string };
};

export async function contactAction(
  _prev: ContactState,
  formData: FormData,
): Promise<ContactState> {
  const user = await currentUser();
  const values = {
    kind: String(formData.get("kind") ?? "general"),
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    message: String(formData.get("message") ?? ""),
  };

  try {
    await createInquiry({
      userId: user?.id ?? null,
      ...values,
      fromPath: String(formData.get("fromPath") ?? "") || null,
    });
  } catch (e) {
    if (e instanceof InquiryError) return { message: e.message, values };
    throw e;
  }

  revalidatePath("/admin/inquiries");
  return { ok: "접수됐습니다. 적어주신 주소로 답을 보내드립니다." };
}
