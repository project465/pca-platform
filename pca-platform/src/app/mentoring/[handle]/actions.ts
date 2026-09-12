"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { createRequest, mentorByHandle, MentoringError } from "@/lib/mentoring";
import { fieldErrors, mentoringRequestSchema, type FieldErrors } from "@/lib/validation";

export type ApplyState = { errors?: FieldErrors; message?: string };

export async function applyAction(
  _prev: ApplyState,
  formData: FormData,
): Promise<ApplyState> {
  const user = await requireUser();

  const handle = String(formData.get("handle") ?? "");
  const parsed = mentoringRequestSchema.safeParse({
    slotId: formData.get("slotId"),
    applicantStage: formData.get("applicantStage"),
    question: formData.get("question"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const mentor = await mentorByHandle(handle);
  if (!mentor) return { message: "멘토를 찾을 수 없습니다." };

  try {
    await createRequest({
      mentorId: mentor.id,
      slotId: parsed.data.slotId,
      applicantId: user.id,
      question: parsed.data.question,
      applicantStage: parsed.data.applicantStage,
    });
  } catch (e) {
    // 시간대를 뺏긴 경우가 대부분이다. 무슨 일이 났는지 그대로 알려준다.
    if (e instanceof MentoringError) return { message: e.message };
    throw e;
  }

  revalidatePath(`/mentoring/${handle}`);
  revalidatePath("/mentoring/requests");
  redirect("/mentoring/requests?applied=1");
}
