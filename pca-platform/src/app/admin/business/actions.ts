"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/session";
import { businessFields } from "@/lib/business";
import { set } from "@/lib/settings";
import { audit } from "@/lib/audit";

/**
 * 사업자 표시를 넣는다.
 *
 * **값을 지어내지 않는다.** 비워 두면 그 줄이 지워지고 환경변수로
 * 되돌아가며, 둘 다 없으면 `launch:check` 가 런칭을 막는다.
 *
 * **누가 언제 넣었는지 남긴다.** 법이 요구하는 표시라, 틀린 값이 올라간
 * 날 물어볼 수 있어야 한다.
 */
export async function saveBusinessAction(form: FormData): Promise<void> {
  const user = await requireRole(["superadmin"]);
  const keys = [...businessFields().map((f) => f.key), "jobinfo_license", "support_hours"];
  const changed: string[] = [];
  for (const k of keys) {
    const v = form.get(k);
    if (v === null) continue;
    await set(k, String(v), user.id);
    changed.push(k);
  }
  /* **값을 감사 기록에 담지 않는다.** 주소와 전화번호가 그 표로 복사되면
     파기가 반쪽이 된다. 무엇을 고쳤는지까지만 적는다 */
  await audit({
    actorId: Number(user.id), action: "business.update",
    targetKind: "site_settings", targetId: changed.join(","),
    detail: { count: changed.length },
  }).catch(() => null);
  revalidatePath("/admin/business");
  revalidatePath("/admin/launch");
}
