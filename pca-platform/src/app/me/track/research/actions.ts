"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { canUseMat } from "@/lib/mat-access";
import { setFileConsent } from "@/lib/assistant/settings";
import { deleteResearchDoc, readResearch, researchFailKo, type ResearchResult } from "@/lib/assistant/research-docs";
import { opFail, ref } from "@/lib/oplog";
import { saveFeedback } from "@/lib/assistant/research-eval";

export type ResearchState = { ok: boolean; msg: string; id?: string } | null;

/**
 * 논문 · PPT · 이력서 · 자기소개서 하나를 읽는다.
 *
 * **열려 있는지는 서버가 본다**(`mat-access.ts`): 기간권이 있거나, 결과가 있고
 * 무료 한 번이 남아 있어야 한다. 동의 칸을 켜고 보내면 그때 동의를 적는다.
 */
export async function uploadResearch(_prev: ResearchState, form: FormData): Promise<ResearchState> {
  const user = await requireUser();
  const can = await canUseMat(user.id, "research");
  if (!can.ok) {
    return { ok: false, msg: can.why === "needtest"
      ? "자료 읽기는 무료 검사를 마친 뒤에 열립니다."
      : "무료로 읽어 볼 수 있는 자료 1건을 쓰셨습니다. MAT 기간권을 고르시면 한 달 10건까지 읽어 드립니다." };
  }
  if (String(form.get("consent") ?? "") === "1") await setFileConsent(user.id, true);
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, msg: "올릴 파일을 골라 주세요." };
  let r: ResearchResult;
  try {
    r = await readResearch(user.id, Buffer.from(await file.arrayBuffer()));
  } catch (e) {
    opFail({ operation: "assistant.research", ref: ref("user", user.id), step: "read", category: "db" }, e);
    return { ok: false, msg: researchFailKo("error") };
  }
  if (!r.ok) return { ok: false, msg: researchFailKo(r.reason) };
  revalidatePath("/me/track/research");
  return { ok: true, id: r.id,
    msg: r.reused ? "전에 올리신 자료라 그때 정리한 것을 다시 보여 드립니다." : "읽었습니다. 아래에 정리했습니다." };
}

export async function removeResearch(form: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(form.get("id") ?? "");
  if (/^\d+$/.test(id)) await deleteResearchDoc(user.id, id);
  revalidatePath("/me/track/research");
  redirect("/me/track/research");
}

/** 채점표 한 칸. 본인 자료에만 적히고(`saveFeedback`), 같은 칸을 다시 누르면 바뀐다 */
export async function gradeResearch(form: FormData): Promise<void> {
  const user = await requireUser();
  await saveFeedback(user.id, String(form.get("id") ?? ""), String(form.get("part") ?? ""), String(form.get("verdict") ?? ""));
  revalidatePath("/me/track/research");
}
