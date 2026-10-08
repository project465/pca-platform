"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import {
  addApplication, removeApplication, setApplicationState,
} from "@/lib/me-v3/platform";

/**
 * 지원한 곳을 적는다.
 *
 * **알선하지 않는다.** 우리가 넣어 드리는 일은 없고, 직접 지원하신 사실을
 * 적어 두는 자리다. 기업 이름은 본인에게만 보이고 기한이 지나면 지워진다.
 */
export async function saveApplication(form: FormData): Promise<void> {
  const user = await requireUser();
  const org = String(form.get("org_name") ?? "").trim();
  const role = String(form.get("role_code") ?? "");
  if (!org && !role) return;
  await addApplication(user.id, {
    org_name: org || null,
    role_code: role || null,
    industry_code: String(form.get("industry_code") ?? "") || null,
    region_code: String(form.get("region_code") ?? "") || null,
    org_type_code: String(form.get("org_type_code") ?? "") || null,
    applied_on: String(form.get("applied_on") ?? "") || null,
    state: String(form.get("state") ?? "applied"),
    note_text: String(form.get("note") ?? ""),
  });
  revalidatePath("/me/apply");
  revalidatePath("/me");
}

export async function moveApplication(form: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(form.get("id") ?? "");
  const state = String(form.get("state") ?? "");
  if (!id || !state) return;
  await setApplicationState(user.id, id, state);
  revalidatePath("/me/apply");
}

export async function dropApplication(form: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(form.get("id") ?? "");
  if (!id) return;
  await removeApplication(user.id, id);
  revalidatePath("/me/apply");
}
