"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { cancelRequest, MentoringError, submitReview } from "@/lib/mentoring";
import { fieldErrors, reviewSchema, type FieldErrors } from "@/lib/validation";

export type RequestActionState = { message?: string; ok?: string; errors?: FieldErrors };

export async function cancelAction(
  _prev: RequestActionState,
  formData: FormData,
): Promise<RequestActionState> {
  const user = await requireUser();
  const requestId = String(formData.get("requestId") ?? "");

  try {
    await cancelRequest({ requestId, userId: user.id });
  } catch (e) {
    if (e instanceof MentoringError) return { message: e.message };
    throw e;
  }

  revalidatePath("/mentoring/requests");
  revalidatePath("/mentoring/mentor");
  return { ok: "취소했습니다. 상대방에게도 알렸습니다." };
}

export async function reviewAction(
  _prev: RequestActionState,
  formData: FormData,
): Promise<RequestActionState> {
  const user = await requireUser();

  const parsed = reviewSchema.safeParse({
    requestId: formData.get("requestId"),
    rating: formData.get("rating"),
    comment: formData.get("comment") ?? "",
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  try {
    await submitReview({
      requestId: parsed.data.requestId,
      applicantId: user.id,
      rating: parsed.data.rating,
      comment: parsed.data.comment?.trim() ? parsed.data.comment : null,
    });
  } catch (e) {
    if (e instanceof MentoringError) return { message: e.message };
    throw e;
  }

  revalidatePath("/mentoring/requests");
  return { ok: "후기를 남겼습니다." };
}
