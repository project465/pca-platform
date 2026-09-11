"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/session";
import {
  createSession,
  enrollRoster,
  releaseSession,
  reissuePassword,
  type EnrollResult,
} from "@/lib/org";
import { parseFile, parseText, MAX_LINES } from "@/lib/roster";
import { MAX_UPLOAD } from "@/lib/sheet-read";

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

/**
 * 명단 올리기. 파일이 붙어 있으면 파일을, 없으면 붙여넣은 글을 읽는다.
 * 파일 형식을 아는 곳은 roster.ts 하나이고, 여기서는 어느 쪽인지만 고른다.
 */
export async function uploadRoster(_prev: RosterState, form: FormData): Promise<RosterState> {
  const user = await requireRole(["org_admin"]);
  const sessionId = String(form.get("sessionId") ?? "");
  const file = form.get("file");
  const text = String(form.get("roster") ?? "").trim();

  try {
    let parsed;
    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_UPLOAD) throw new Error("파일이 너무 큽니다. 4MB 이하로 올려 주세요.");
      const buf = Buffer.from(await file.arrayBuffer());
      parsed = parseFile(file.name, buf);
    } else if (text) {
      parsed = parseText(text);
    } else {
      throw new Error("엑셀 파일을 고르거나 명단을 붙여넣어 주세요.");
    }

    if (!parsed.lines.length) {
      return {
        error:
          parsed.skipped.length > 0
            ? "읽을 수 있는 줄이 없습니다. 이름과 학번 두 칸이 있는지 확인해 주세요."
            : "명단이 비어 있습니다.",
        result: { created: [], reused: 0, skipped: parsed.skipped, columns: parsed.columns },
      };
    }
    if (parsed.lines.length > MAX_LINES) {
      throw new Error(`한 번에 ${MAX_LINES}명까지 올릴 수 있습니다. 나눠서 올려 주세요.`);
    }

    const result = await enrollRoster(user.id, sessionId, parsed);
    revalidatePath(`/org/sessions/${sessionId}`);
    return { result };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "명단을 올리지 못했습니다." };
  }
}

export type ReissueState = {
  error?: string;
  issued?: { name: string; loginId: string; tempPassword: string };
};

export async function reissue(_prev: ReissueState, form: FormData): Promise<ReissueState> {
  const user = await requireRole(["org_admin"]);
  const sessionId = String(form.get("sessionId") ?? "");
  try {
    const issued = await reissuePassword(user.id, sessionId, String(form.get("studentId") ?? ""));
    revalidatePath(`/org/sessions/${sessionId}`);
    return { issued };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "재발급하지 못했습니다." };
  }
}

export async function release(form: FormData): Promise<void> {
  const user = await requireRole(["org_admin"]);
  const sessionId = String(form.get("sessionId") ?? "");
  await releaseSession(user.id, sessionId);
  revalidatePath(`/org/sessions/${sessionId}`);
}
