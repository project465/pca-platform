"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/session";
import { addEvidence, removeEvidence } from "@/lib/evidence";

export type EvidenceState = { error?: string; ok?: boolean };

export async function add(_prev: EvidenceState, form: FormData): Promise<EvidenceState> {
  const user = await requireRole(["student"]);
  const competencyId = String(form.get("competencyId") ?? "");
  const sourceCode = String(form.get("sourceCode") ?? "");
  const refLabel = String(form.get("refLabel") ?? "");
  const gradeRaw = String(form.get("grade") ?? "");

  try {
    await addEvidence(user.id, {
      competencyId,
      sourceCode,
      refLabel,
      grade: gradeRaw || null,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "저장하지 못했습니다." };
  }
  revalidatePath("/evidence");
  return { ok: true };
}

export async function remove(form: FormData): Promise<void> {
  const user = await requireRole(["student"]);
  await removeEvidence(user.id, String(form.get("evidenceId") ?? ""));
  revalidatePath("/evidence");
}
