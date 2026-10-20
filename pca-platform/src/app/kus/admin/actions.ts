"use server";

import { redirect } from "next/navigation";
import { requireKusAdmin } from "@/lib/kus/access";
import { addProgram, type VisitProgram } from "@/lib/kus/visits";

const STATUS: VisitProgram["status"][] = ["PLANNED", "CONFIRMED", "DONE", "CANCELLED"];

/**
 * 탐방 기업 한 줄을 등록한다. **담당자만.**
 *
 * 확인 근거(`source_note`)를 함께 받는다. 비우면 학생 화면에 `확인 전` 이
 * 선다: 확인되지 않은 기업을 확인된 것처럼 세우지 않는다.
 */
export async function registerProgram(form: FormData): Promise<void> {
  const { user } = await requireKusAdmin();
  const s = (k: string, n: number) => String(form.get(k) ?? "").trim().replace(/\s+/g, " ").slice(0, n) || null;
  const name = s("company_name", 80);
  if (!name) redirect("/kus/admin?e=name");
  const date = s("visit_date", 10);
  const status = (STATUS as string[]).includes(String(form.get("status"))) ? String(form.get("status")) as VisitProgram["status"] : "PLANNED";
  await addProgram(user.id, {
    company_name: name, business_note: s("business_note", 200),
    visit_date: date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null,
    status, source_note: s("source_note", 200), is_test: form.get("is_test") === "on",
  });
  redirect("/kus/admin?added=1");
}
