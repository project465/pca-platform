"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { canUseMat } from "@/lib/mat-access";
import { setFileConsent } from "@/lib/assistant/settings";
import { deleteResearchDoc, readResearch, researchDocsOf, researchFailKo, type ResearchResult } from "@/lib/assistant/research-docs";
import { consultFailKo, requestConsult } from "@/lib/careerpeak-consult";
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
      : "무료 2번을 다 쓰셨습니다. MAT 기간권을 고르시면 한 달 10건까지 읽어 드립니다." };
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

export type ConsultState = { ok: boolean; msg: string } | null;

/**
 * 커리어피크 상담 신청(`careerpeak-consult.ts`). **동의 칸이 꺼져 있으면 아무것도
 * 보내지 않는다**: 화면의 단추가 막혀 있어도 서버가 다시 본다. 보낼 정리는 본인
 * 것만 고른다(`researchDocsOf` 가 그 사람 것만 읽는다).
 */
export async function requestCareerpeak(_prev: ConsultState, form: FormData): Promise<ConsultState> {
  const user = await requireUser();
  const docId = String(form.get("doc") ?? "");
  const docs = await researchDocsOf(user.id);
  const doc = docs.find((d) => d.id === docId) ?? null;
  const email = String(form.get("email") ?? "").trim().slice(0, 200);
  const phone = String(form.get("phone") ?? "").trim().slice(0, 40);
  const name = String(form.get("name") ?? "").trim().slice(0, 60);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, msg: "답을 받으실 메일 주소를 적어 주세요." };
  if (phone && !/^[0-9+\-() ]{8,20}$/.test(phone)) return { ok: false, msg: "전화번호는 숫자와 - 만 적어 주세요. 비워 두셔도 됩니다." };
  const r = await requestConsult({
    userId: user.id, doc, consent: String(form.get("consent") ?? "") === "1", name, email, phone,
  }).catch((e) => {
    opFail({ operation: "careerpeak.consult", ref: ref("user", user.id), step: "send", category: "db" }, e);
    return { ok: false as const, reason: "db" as const };
  });
  if (!r.ok) return { ok: false, msg: consultFailKo(r.reason) };
  revalidatePath("/me/track/research");
  return { ok: true, msg: "보냈습니다. 커리어피크에서 적어 주신 메일로 연락드립니다." };
}
