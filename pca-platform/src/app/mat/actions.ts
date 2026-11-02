"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { queryOne } from "@/lib/db";
import { activeCore, experiencesOf, importActions } from "@/lib/me-v3/platform";
import { openActions } from "@/lib/me-v3/open-actions";
import { mark } from "@/lib/me-v3/workspace-events";
import { canUseMat, matAccess } from "@/lib/mat-access";
import { analyzePosting, livePostingOf } from "@/lib/assistant/posting";
import { smallTasks, taskBody } from "@/lib/assistant/prep";
import { SOURCE_KO } from "@/lib/mat/stage";
import { opFail, ref } from "@/lib/oplog";
import { moveAction } from "../me/next/actions";

/** 할 일 한 줄을 끝내거나 되돌린다(웹 작업공간과 같은 함수). 끝나면 MAT 홈으로 */
export async function matMoveAction(form: FormData): Promise<void> {
  await moveAction(form);
  revalidatePath("/mat");
  redirect("/mat");
}

/**
 * 새 분석을 만들 수 있는가. 기간권이면 바로, 아니면 무료 남은 횟수(`mat-access.ts`).
 * **서버가 본다**: 화면이 단추를 꺼 두는 것은 안내일 뿐이다.
 */
async function canAnalyze(userId: string): Promise<void> {
  const r = await canUseMat(userId, "posting");
  if (!r.ok) redirect(r.why === "needtest" ? "/mat?e=needtest" : "/mat/pass?e=free");
}

/**
 * 모아 둔 공고 하나를 `바로 분석`.
 *
 * - **번호로 서버가 다시 읽는다.** 화면이 보낸 요구 글은 받지 않는다
 * - **같은 공고를 두 번 분석하지 않는다.** 이미 만든 분석이 있으면 그 화면으로 간다
 *   (무료 횟수를 다시 쓰지 않는다). 상태는 열 때마다 지금 경험으로 다시 단다(`livePostingOf`)
 */
export async function matAnalyzeJob(form: FormData): Promise<void> {
  const user = await requireUser();
  const job = String(form.get("job") ?? "").trim();
  if (!/^\d{1,18}$/.test(job)) redirect("/mat/jobs");
  const p = await queryOne<{ source: string; closes_on: string | null; req: string[] }>(
    `SELECT source, closes_on::text, raw_requirements AS req FROM v3_job_postings WHERE id = $1`, [job],
  ).catch(() => null);
  if (!p || !(p.req ?? []).length) redirect("/mat/jobs?e=noread");
  const label = `${SOURCE_KO[p.source] ?? p.source} 공고 ${job}`;
  const had = await queryOne<{ id: string }>(
    `SELECT id::text FROM assistant_postings WHERE user_id = $1 AND label = $2 ORDER BY id DESC LIMIT 1`,
    [user.id, label]).catch(() => null);
  if (had) redirect(`/mat/jobs/${had.id}`);
  await canAnalyze(user.id);
  let id = "";
  try {
    id = (await analyzePosting(user.id, { label, text: p.req.join("\n"), deadline: p.closes_on })).id;
  } catch (e) {
    opFail({ operation: "assistant.posting", ref: ref("user", user.id), step: "mat.job", category: "db" }, e);
  }
  if (!id) redirect("/mat/jobs?e=save");
  revalidatePath("/mat");
  redirect(`/mat/jobs/${id}`);
}

/** 붙여 넣은 공고 글을 분석한다(링크만으로는 남의 화면을 열지 않는다: 글을 붙여 넣는다) */
export async function matPasteJob(form: FormData): Promise<void> {
  const user = await requireUser();
  const text = String(form.get("text") ?? "").trim();
  const label = String(form.get("label") ?? "").trim().slice(0, 80) || "붙여 넣은 공고";
  if (text.length < 30) redirect("/mat/jobs?e=short#paste");
  await canAnalyze(user.id);
  let id = "";
  try {
    id = (await analyzePosting(user.id, { label, text, deadline: null })).id;
  } catch (e) {
    opFail({ operation: "assistant.posting", ref: ref("user", user.id), step: "mat.paste", category: "db" }, e);
  }
  if (!id) redirect("/mat/jobs?e=save#paste");
  revalidatePath("/mat");
  redirect(`/mat/jobs/${id}`);
}

/**
 * 분석 화면의 `마감 전 할 일` 을 이번 주 할 일에 담는다. 웹 작업공간의 `takePostingTasks` 와
 * 같은 규칙이다: 줄은 서버가 같은 함수로 다시 만들고, 두 번 눌러도 늘지 않고, 결과지가 낸
 * 할 일을 밀어내지 않는다.
 */
export async function matTakeTasks(form: FormData): Promise<void> {
  const user = await requireUser();
  if (!(await matAccess(user.id)).open) redirect("/mat/pass");
  const id = String(form.get("id") ?? "");
  const p = await livePostingOf(user.id, id);
  if (!p) redirect("/mat/jobs");
  const core = await activeCore(user.id);
  if ((p.core_code ?? core) !== core) redirect(`/mat/jobs/${id}?taken=x#tasks`);
  const tasks = smallTasks(core, p.analysis.items, await experiencesOf(user.id, core), "ko");
  const open = await openActions(user.id);
  if (open.fromResult && open.rows.length) {
    await importActions(user.id, open.rows.map((r) => ({
      td: r.td_code, axis: r.axis_code, body: r.body, horizon: r.horizon })));
  }
  const n = await importActions(user.id, tasks.map((t) => ({
    td: t.domain, axis: t.axis, body: taskBody(t, p.label, "ko"), horizon: 30,
  })), "manual");
  await mark("action_saved", user.id, { from: "mat.posting", n });
  revalidatePath("/mat");
  redirect(`/mat/jobs/${id}?taken=${n}#tasks`);
}
