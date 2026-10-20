"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { requireSejong } from "@/sejong/lib/session";
import { sejongContent } from "@/sejong/lib/content";

const clip = (v: FormDataEntryValue | null, n: number) => String(v ?? "").trim().slice(0, n);

export async function addExperience(formData: FormData): Promise<void> {
  const a = await requireSejong("participant");
  const { instrument } = sejongContent();
  const kind = clip(formData.get("kind"), 20);
  const title = clip(formData.get("title"), 120);
  if (!instrument.experience_kinds.some((k) => k.code === kind) || !title) {
    redirect("/sejong/experience?e=1");
  }
  const checks = formData.getAll("checks").map(String)
    .filter((c) => instrument.experience_checks.some((x) => x.code === c));
  const area = clip(formData.get("job_area"), 8);
  const skills = clip(formData.get("skills"), 300).split(",").map((s) => s.trim()).filter(Boolean).slice(0, 10);
  await query(
    `INSERT INTO sj_experiences (user_id, kind, title, org_name, period_text, job_area, role_text, checks, skills)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [a.userId, kind, title, clip(formData.get("org_name"), 80) || null, clip(formData.get("period_text"), 40) || null,
     instrument.job_areas.some((j) => j.code === area) ? area : null,
     clip(formData.get("role_text"), 500) || null, checks, skills]);
  revalidatePath("/sejong/experience");
  redirect("/sejong/experience?saved=1");
}

export async function removeExperience(formData: FormData): Promise<void> {
  const a = await requireSejong("participant");
  const id = clip(formData.get("id"), 20);
  if (/^\d+$/.test(id)) {
    await query(`DELETE FROM sj_experiences WHERE id = $1 AND user_id = $2`, [id, a.userId]);
  }
  revalidatePath("/sejong/experience");
}
