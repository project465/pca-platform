"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/session";
import { createSession, enrollRoster, releaseSession, type EnrollResult } from "@/lib/org";

export type SessionState = { error?: string };

export async function makeSession(_prev: SessionState, form: FormData): Promise<SessionState> {
  const user = await requireRole(["org_admin"]);
  let id: string;
  try {
    id = await createSession(user.id, {
      contractId: String(form.get("contractId") ?? ""),
      name: String(form.get("name") ?? ""),
      opensAt: String(form.get("opensAt") ?? ""),
      closesAt: String(form.get("closesAt") ?? ""),
      instant: form.get("instant") === "on",
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "회차를 만들지 못했습니다." };
  }
  revalidatePath("/org");
  redirect(`/org/sessions/${id}`);
}

export type RosterState = { error?: string; result?: EnrollResult };

export async function uploadRoster(_prev: RosterState, form: FormData): Promise<RosterState> {
  const user = await requireRole(["org_admin"]);
  const sessionId = String(form.get("sessionId") ?? "");
  try {
    const result = await enrollRoster(user.id, sessionId, String(form.get("roster") ?? ""));
    revalidatePath(`/org/sessions/${sessionId}`);
    return { result };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "명단을 올리지 못했습니다." };
  }
}

export async function release(form: FormData): Promise<void> {
  const user = await requireRole(["org_admin"]);
  const sessionId = String(form.get("sessionId") ?? "");
  await releaseSession(user.id, sessionId);
  revalidatePath(`/org/sessions/${sessionId}`);
}
