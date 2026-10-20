"use server";

import { redirect } from "next/navigation";
import { requireKusStudent } from "@/lib/kus/access";
import { content, roleChoices } from "@/lib/me-v3/runtime/session";
import {
  addVisit, checkVisit, linkExperience, removeVisit, visitPrograms,
} from "@/lib/kus/visits";

/**
 * 탐방 기록 한 건을 저장한다.
 *
 * **보기 열쇠를 그 학생의 사전으로 다시 거른다**(`checkVisit`). 폼이 보낸
 * 직무·영역 코드를 그대로 믿으면 남의 Core 코드가 기록에 선다. 거절하면
 * 까닭을 주소에 실어 그 폼으로 돌려보낸다(조용히 돌아서지 않는다).
 */
export async function saveVisit(form: FormData): Promise<void> {
  const { user, me } = await requireKusStudent();
  const core = me.ctx.core_code;
  if (!core) redirect(`/kus/visits/new?e=${encodeURIComponent("전공을 고른 뒤에 기록할 수 있습니다")}`);
  const programs = await visitPrograms();
  const c = checkVisit({
    program_id: form.get("program_id"), company_name: form.get("company_name"),
    visited_on: form.get("visited_on"), role_codes: form.getAll("role_codes"),
    role_text: form.get("role_text"), understood: form.get("understood"),
    activities: form.getAll("activities"), activity_text: form.get("activity_text"),
    learned: form.get("learned"), td_codes: form.getAll("td_codes"),
  }, {
    roles: roleChoices(core).map((r) => r.code),
    tds: content(core).domains.domains.map((d) => d.code),
    programs,
  });
  if (!c.ok) redirect(`/kus/visits/new?e=${encodeURIComponent(c.why)}`);
  const id = await addVisit(user.id, core, c.value);
  redirect(`/kus/visits/${id}?saved=1`);
}

export async function deleteVisit(form: FormData): Promise<void> {
  const { user } = await requireKusStudent();
  await removeVisit(user.id, String(form.get("id") ?? ""));
  redirect("/kus/visits?deleted=1");
}

/** 적어 둔 공통 경험 하나와 잇는다. **남의 경험 번호는 잇지 않는다**(`linkExperience`) */
export async function linkVisitExperience(form: FormData): Promise<void> {
  const { user } = await requireKusStudent();
  const id = String(form.get("id") ?? "");
  const exp = String(form.get("experience_id") ?? "");
  const ok = /^\d+$/.test(exp) && await linkExperience(user.id, id, exp);
  redirect(`/kus/visits/${encodeURIComponent(id)}?${ok ? "linked=1" : "e=link"}`);
}
