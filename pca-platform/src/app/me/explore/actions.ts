"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { activeCoreOrPick, saveTargets } from "@/lib/me-v3/platform";
import { industryChoices, roleChoices } from "@/lib/me-v3/runtime/session";
import { activeTrack } from "@/lib/track";

/**
 * 관심 산업·직무를 다시 고른다. **Track 이 열려 있을 때만.**
 *
 * **막는 자리는 서버다.** 화면에서 폼을 감추는 것은 안내이고, 폼을 직접
 * 보내는 쪽은 그 화면을 거치지 않는다.
 *
 * **고를 수 있는 값만 받는다.** 그 전공의 산업팩과 역할팩에 없는 코드는
 * 버린다. 남의 전공 코드가 지금 값에 들어가면 탐색이 그 이름을 못 찾아
 * 빈 줄을 세운다. 둘씩까지다: 검사가 산업을 둘까지 받는 것과 같은 수다.
 *
 * **굳은 결과를 고치지 않는다.** 바뀌는 것은 `career_profiles` 의 지금
 * 값뿐이고, 그때 낸 결과지는 그대로다.
 */
export async function changeTargets(form: FormData): Promise<void> {
  const user = await requireUser();
  const t = await activeTrack(user.id);
  if (!t.on) redirect("/me/track");

  const core = await activeCoreOrPick(user.id);
  const okInd = new Set(industryChoices(core).map((x) => x.code));
  const okRole = new Set(roleChoices(core).map((x) => x.code));
  const pick = (k: string, ok: Set<string>) =>
    [...new Set(form.getAll(k).map(String))].filter((c) => ok.has(c)).slice(0, 2);

  await saveTargets(user.id, pick("industry", okInd), pick("role", okRole));
  revalidatePath("/me/explore");
  revalidatePath("/me");
  redirect("/me/explore?targets=1");
}
