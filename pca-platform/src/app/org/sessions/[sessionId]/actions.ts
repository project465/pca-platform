"use server";

import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { canEditSession, sessionForIssueGuard } from "@/lib/org-guard";
import { issueChunk, parseRosterFile, RosterError, sessionForIssue } from "@/lib/roster";
import { CHUNK_SIZE, type IssueResult, type RosterEntry } from "@/lib/roster-types";
import { MAX_FILE_BYTES } from "@/lib/sheet";

export type PreviewState = {
  entries?: RosterEntry[];
  errors?: string[];
  message?: string;
  fileName?: string;
  freeSeats?: number;
  /** 이미 명단에 있는 사람 수. 다시 올려도 응시권을 또 쓰지 않는다는 것을 보여준다 */
  alreadyIn?: number;
};

/**
 * 명단 파일을 읽어 미리보기만 만든다. 이 단계에서는 아무것도 저장하지 않는다.
 * 계정 발급은 사람이 확인한 뒤 issueAction 이 묶음으로 진행한다.
 */
export async function previewRosterAction(
  _prev: PreviewState,
  formData: FormData,
): Promise<PreviewState> {
  const user = await requireUser();
  const sessionId = String(formData.get("sessionId") ?? "");
  if (!(await canEditSession(user, sessionId))) return { message: "명단을 올릴 권한이 없습니다. 학과 담당자만 할 수 있습니다." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { message: "파일을 고르세요." };
  if (file.size > MAX_FILE_BYTES) {
    return { message: `파일이 너무 큽니다. ${MAX_FILE_BYTES / 1024 / 1024}MB 이하만 올릴 수 있습니다.` };
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const parsed = parseRosterFile(file.name, buf);
  const session = await sessionForIssue(sessionId);

  let alreadyIn = 0;
  if (parsed.entries.length > 0) {
    const rows = await query<{ n: string }>(
      `SELECT count(*)::text AS n
         FROM attempts a JOIN users u ON u.id = a.user_id
        WHERE a.session_id = $1 AND u.login_id = ANY($2::text[])`,
      [sessionId, parsed.entries.map((e) => e.loginId)],
    );
    alreadyIn = Number(rows[0]?.n ?? 0);
  }

  return {
    entries: parsed.entries,
    errors: parsed.errors,
    fileName: file.name,
    freeSeats: session?.free_seats ?? 0,
    alreadyIn,
  };
}

export type IssueState = { results?: IssueResult[]; message?: string };

/**
 * 명단의 한 묶음을 발급한다. 화면이 CHUNK_SIZE 씩 잘라 반복해서 부른다.
 * 비밀번호 해싱이 1건당 0.4초라 한 번에 다 하면 응답이 수십 초가 된다.
 */
export async function issueAction(input: {
  sessionId: string;
  entries: RosterEntry[];
}): Promise<IssueState> {
  const user = await requireUser();
  if (!(await canEditSession(user, input.sessionId))) return { message: "발급 권한이 없습니다." };
  if (input.entries.length > CHUNK_SIZE) return { message: "한 번에 보낼 수 있는 인원을 넘었습니다." };

  const guard = sessionForIssueGuard(input.entries);
  if (guard) return { message: guard };

  try {
    const results = await issueChunk({ sessionId: input.sessionId, entries: input.entries });
    revalidatePath(`/org/sessions/${input.sessionId}`);
    return { results };
  } catch (e) {
    if (e instanceof RosterError) return { message: e.message };
    throw e;
  }
}

/**
 * 결과 공개. 학생은 이 버튼을 누르기 전에는 결과지를 볼 수 없다
 * (CLAUDE.md 「결과 공개 — 학과 담당자 승인 후 공개」).
 */
export async function releaseAction(
  _prev: { message?: string; ok?: string },
  formData: FormData,
): Promise<{ message?: string; ok?: string }> {
  const user = await requireUser();
  const sessionId = String(formData.get("sessionId") ?? "");
  if (!(await canEditSession(user, sessionId))) return { message: "명단을 올릴 권한이 없습니다. 학과 담당자만 할 수 있습니다." };

  const rows = await query<{ id: string }>(
    `UPDATE test_sessions SET released_at = now()
      WHERE id = $1 AND released_at IS NULL
      RETURNING id`,
    [sessionId],
  );
  if (rows.length === 0) return { message: "이미 공개된 회차입니다." };

  revalidatePath(`/org/sessions/${sessionId}`);
  revalidatePath("/org");
  return { ok: "결과를 공개했습니다. 학생 화면에 결과지가 나타납니다." };
}
