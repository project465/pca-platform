"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { importActions, latestResult, setActionState } from "@/lib/me-v3/platform";
import { domainName } from "@/lib/me-v3/runtime/session";
import { actionKo } from "@/lib/me-v3/result/text.ko";
import { mark } from "@/lib/me-v3/workspace-events";

/** 결과지가 낸 할 일을 내 CareerMatri 로 옮긴다. 두 번 눌러도 늘지 않는다 */
export async function pullActions(): Promise<void> {
  const user = await requireUser();
  const result = await latestResult(user.id);
  if (!result) return;
  const H = { NOW: 30, NEXT: 90, LATER: 365 } as const;
  await importActions(user.id, result.actions.map((a) => ({
    td: a.domain, axis: a.axis,
    /* **문장을 여기서 짓지 않는다.** 결과지와 같은 함수를 부른다: 두
       곳에서 따로 적으면 상담 자리에서 다른 종이를 들고 앉는다 */
    body: actionKo(a, a.domain ? domainName(a.domain) : "", result.stage).do,
    horizon: H[a.horizon],
  })));
  await mark("action_saved", user.id, { from: "import", n: result.actions.length });
  revalidatePath("/me/next");
  revalidatePath("/me");
}

export async function moveAction(form: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(form.get("id") ?? "");
  const state = String(form.get("state") ?? "");
  if (!id || !["open", "doing", "done", "dropped"].includes(state)) return;
  await setActionState(user.id, id, state as "open" | "doing" | "done" | "dropped");
  await mark("action_saved", user.id, { from: state });
  revalidatePath("/me/next");
  revalidatePath("/me");
}
