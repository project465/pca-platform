"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { actionsOf, importActions, latestResult, setActionState } from "@/lib/me-v3/platform";
import { domainName } from "@/lib/me-v3/runtime/session";
import { actionKo } from "@/lib/me-v3/result/text.ko";
import { mark } from "@/lib/me-v3/workspace-events";

/** 결과지가 낸 할 일을 내 CareerMatri 로 옮긴다. 두 번 눌러도 늘지 않는다 */
/** 담는 일 하나. 두 자리(결과지 · 할 일 쪽)가 같은 코드를 부른다 */
async function importActionRows(userId: string): Promise<number> {
  const result = await latestResult(userId);
  if (!result) return 0;
  const H = { NOW: 30, NEXT: 90, LATER: 365 } as const;
  const n = await importActions(userId, result.actions.map((a) => ({
    td: a.domain, axis: a.axis,
    /* **문장을 여기서 짓지 않는다.** 결과지와 같은 함수를 부른다: 두
       곳에서 따로 적으면 상담 자리에서 다른 종이를 들고 앉는다 */
    body: actionKo(a, a.domain ? domainName(a.domain) : "", result.stage).do,
    horizon: H[a.horizon],
  })));
  await mark("action_saved", userId, { from: "import", n });
  revalidatePath("/me/next");
  revalidatePath("/me");
  return n;
}

export async function pullActions(): Promise<void> {
  const user = await requireUser();
  await importActionRows(user.id);
}

/**
 * 결과지의 `지금 할 일로 담기` 가 실제로 담는다(규격 §16).
 *
 * **그 단추는 링크였다.** `/me/next` 로 옮기기만 하고 아무것도 담지
 * 않아서, 누른 사람이 그 쪽에서 `결과의 할 일 담기` 를 한 번 더 찾아
 * 눌러야 했다. 단추의 말이 약속한 일이 일어나지 않으면 그것은 **막다른
 * 길보다 나쁘다**: 읽는 사람은 담긴 줄 알고 떠난다.
 *
 * 담고 나서 그 쪽으로 보내되 **몇 개가 담겼는지를 주소에 싣는다**:
 * 이미 담아 둔 사람이 다시 눌러도 늘지 않으므로(`importActions` 가
 * 영역과 문장으로 본다) `0개` 가 정상인 자리가 있고, 그 사실을 화면이
 * 적어야 누른 사람이 고장으로 읽지 않는다.
 */
export async function takeActionsFromResult(): Promise<void> {
  const user = await requireUser();
  const n = await importActionRows(user.id);
  redirect(`/me/next?taken=${n}`);
}

/**
 * 할 일 한 줄의 상태를 바꾼다.
 *
 * **아직 표에 없는 줄일 수 있다.** 담아 둔 줄이 하나도 없는 사람에게는
 * 굳은 결과가 낸 할 일을 그대로 세우는데(`open-actions.ts`), 그 줄에는
 * 번호가 없다. 그때는 **먼저 담고 나서** 상태를 바꾼다: 누른 사람에게
 * 담기는 보이지 않는 일이어야 한다.
 */
export async function moveAction(form: FormData): Promise<void> {
  const user = await requireUser();
  let id = String(form.get("id") ?? "");
  const state = String(form.get("state") ?? "");
  if (!id || !["open", "doing", "done", "dropped"].includes(state)) return;
  if (id.startsWith("r")) {
    await importActionRows(user.id);
    const body = String(form.get("body") ?? "");
    const td = String(form.get("td") ?? "");
    const row = (await actionsOf(user.id)).find((a) =>
      a.body === body && (a.td_code ?? "") === td);
    if (!row) return;
    id = row.id;
  }
  await setActionState(user.id, id, state as "open" | "doing" | "done" | "dropped");
  await mark("action_saved", user.id, { from: state });
  revalidatePath("/me/next");
  revalidatePath("/me");
}
