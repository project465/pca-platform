"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { deleteItem, itemOf, itemsOf, parseItem, saveItem, savePrefs } from "@/lib/research/profile";
import { refreshMatches } from "@/lib/research/match";
import { FREE_READINGS, readMatch, readingsUsed } from "@/lib/research/ai";
import { matAccess } from "@/lib/mat-access";
import { aiConsented } from "@/lib/assistant/settings";
import { aiReady } from "@/lib/assistant/claude";
import { matLang } from "@/lib/mat/lang";
import { opFail, ref } from "@/lib/oplog";

/**
 * 연구 이력 저장 · 지우기 · 알림 설정 · 요건 맞춰 보기. **모두 로그인한 본인 줄만** 건드린다
 * (`profile.ts` 의 함수가 `user_id` 로 거른다). 저장 뒤에는 맞는 공고를 그 자리에서 다시 센다.
 */

export async function saveResearchItem(form: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(form.get("id") ?? "").trim() || undefined;
  const p = parseItem(form);
  const back = (e: string) => {
    const q = new URLSearchParams({ e });
    for (const k of ["kind", "id", "from"]) { const v = String(form.get(k) ?? ""); if (v) q.set(k, v); }
    redirect(`/mat/research/item?${q.toString()}`);
  };
  if (!p.ok) back(p.why === "confirm" ? "confirm" : "required");
  if (!p.ok) return;
  if (id && !(await itemOf(user.id, id))) redirect("/mat/research");
  let saved: string | null = null;
  try {
    saved = await saveItem(user.id, { id, kind: p.kind, data: p.data, sourceDocId: String(form.get("from") ?? "") || null });
    await refreshMatches(user.id);
  } catch (e) {
    opFail({ operation: "research.item", ref: ref("user", user.id), step: "save", category: "db" }, e);
  }
  if (!saved) back("save");
  revalidatePath("/mat/research");
  redirect("/mat/research?ok=saved");
}

export async function deleteResearchItem(form: FormData): Promise<void> {
  const user = await requireUser();
  await deleteItem(user.id, String(form.get("id") ?? ""));
  await refreshMatches(user.id).catch(() => undefined);
  revalidatePath("/mat/research");
  redirect("/mat/research?ok=deleted");
}

export async function saveResearchPrefs(form: FormData): Promise<void> {
  const user = await requireUser();
  const min = Number(String(form.get("min_score") ?? "40"));
  await savePrefs(user.id, {
    screen: form.get("screen") === "1",
    email_daily: form.get("email_daily") === "1",
    categories: form.getAll("categories").map(String),
    min_score: [30, 40, 60].includes(min) ? min : 40,
  });
  await refreshMatches(user.id).catch(() => undefined);
  revalidatePath("/mat/research");
  redirect("/mat/research?ok=prefs#alerts");
}

/** 2차 요건 판단. 이용권이 있거나 무료 1건이 남았고, AI 동의 · 열쇠가 있어야 부른다(공고 분석 칸으로 센다) */
export async function readResearchMatch(form: FormData): Promise<void> {
  const user = await requireUser();
  const pid = String(form.get("posting") ?? "");
  if (!/^\d{1,18}$/.test(pid)) redirect("/mat/research/matches");
  const go = (e: string) => redirect(`/mat/research/matches?e=${e}#p${pid}`);
  if (!aiReady()) go("off");
  if (!(await matAccess(user.id)).paid && (await readingsUsed(user.id)) >= FREE_READINGS) go("pass");
  if (!(await aiConsented(user.id))) go("consent");
  const items = await itemsOf(user.id);
  const r = await readMatch(user.id, pid, items, await matLang());
  if (!r.ok) go(r.reason === "cap" || r.reason === "day" ? "cap" : "fail");
  revalidatePath("/mat/research/matches");
  redirect(`/mat/research/matches#p${pid}`);
}
