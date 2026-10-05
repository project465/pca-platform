"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/session";
import { resolve } from "@/lib/incidents";

/**
 * 사람이 봤다고 적는다.
 *
 * **지우지 않는다.** 줄은 남고 처리한 사람과 때가 붙는다. 지우면 같은
 * 사고가 다시 났을 때 앞의 것을 못 찾는다.
 */
export async function resolveAction(form: FormData): Promise<void> {
  const user = await requireRole(["superadmin"]);
  const id = String(form.get("id") ?? "");
  if (id) await resolve(id, user.id);
  revalidatePath("/admin/incidents");
}
