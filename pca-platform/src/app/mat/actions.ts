"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { moveAction } from "../me/next/actions";

/** 할 일 한 줄을 끝내거나 되돌린다(웹 작업공간과 같은 함수). 끝나면 MAT 홈으로 */
export async function matMoveAction(form: FormData): Promise<void> {
  await moveAction(form);
  revalidatePath("/mat");
  redirect("/mat");
}
