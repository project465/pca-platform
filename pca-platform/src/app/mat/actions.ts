"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { queryOne } from "@/lib/db";
import { activeCore, addApplication, applicationsOf, experiencesOf, importActions, removeApplication, setApplicationState } from "@/lib/me-v3/platform";
import { openActions } from "@/lib/me-v3/open-actions";
import { mark } from "@/lib/me-v3/workspace-events";
import { canUseMat, matAccess, runAnalysis } from "@/lib/mat-access";
import { analyzePosting, livePostingOf, reanalyzePosting, type PostingAnalysis, type PostingHint } from "@/lib/assistant/posting";
import { smallTasks, taskBody } from "@/lib/assistant/prep";
import { SOURCE_KO } from "@/lib/mat/stage";
import { setAiConsent, setEmailDigest } from "@/lib/assistant/settings";
import { draftExperience } from "@/lib/assistant/draft";
import { opFail, ref } from "@/lib/oplog";
import { moveAction } from "../me/next/actions";
import { matLang } from "@/lib/mat/lang";

/**
 * 검사 없이 시작한 사람이 **전공 하나를 고른다**(공고 목록과 요건 사전이 전공 단위다). 지금 값 줄
 * (`career_profiles`)을 빈 칸으로 하나 세운다: 제출 뒤 `syncProfile` 이 세우는 줄과 같은 모양이라
 * 검사를 마치면 그대로 이어진다. 고를 수 있는 전공만 받는다
 */
export async function matPickCore(form: FormData): Promise<void> {
  const user = await requireUser();
  const code = String(form.get("core") ?? "");
  const { sellableCores } = await import("@/lib/me-v3/core-registry");
  if (!sellableCores("KR").some((c) => c.code === code)) redirect("/mat?e=needcore");
  await queryOne(
    `INSERT INTO career_profiles (user_id, core_code, market_code) VALUES ($1, $2, 'KR')
     ON CONFLICT (user_id, core_code) DO NOTHING RETURNING id`, [user.id, code]).catch(() => null);
  revalidatePath("/mat");
  redirect("/mat");
}

/** 할 일 한 줄을 끝내거나 되돌린다(웹 작업공간과 같은 함수). 끝나면 MAT 홈으로 */
export async function matMoveAction(form: FormData): Promise<void> {
  await moveAction(form);
  revalidatePath("/mat");
  redirect("/mat");
}

/**
 * 새 분석 하나를 무료 칸과 함께 만든다(`runAnalysis`). 기간권이면 바로, 아니면 무료 칸을 먼저 잡는다.
 * **서버가 본다**: 화면이 단추를 꺼 두는 것은 안내일 뿐이다. 무료를 다 썼으면 요금 화면으로
 */
async function analyzeOrPay(userId: string, make: () => Promise<string>, back: string): Promise<string> {
  const r = await runAnalysis(userId, make);
  if ("blocked" in r) redirect(r.blocked === "needcore" ? "/mat?e=needcore" : "/mat/pricing?from=free");
  if ("failed" in r) redirect(back);
  return r.id;
}

/** 이미 센 분석을 다시 읽는 것은 무료 횟수를 새로 쓰지 않는다. 전공을 못 정한 사람만 막는다 */
async function canReread(userId: string): Promise<void> {
  const r = await canUseMat(userId, "posting");
  if (!r.ok && r.why === "needcore") redirect("/mat?e=needcore");
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
  const hint = await hintOf(job);
  const had = await queryOne<{ id: string; analysis: PostingAnalysis }>(
    `SELECT id::text, analysis FROM assistant_postings WHERE user_id = $1 AND label = $2 ORDER BY id DESC LIMIT 1`,
    [user.id, label]).catch(() => null);
  if (had) {
    /* 전에 읽은 결과에 경험 영역이 하나도 이어지지 않았으면 같은 줄에서 다시 읽는다(직무 이름으로 본 영역을 더한다) */
    if (!had.analysis.items.some((i) => i.domain)) {
      await canReread(user.id);
      await reanalyzePosting(user.id, had.id, hint ?? undefined, false, await matLang()).catch((e) =>
        opFail({ operation: "assistant.posting", ref: ref("user", user.id), step: "mat.job.reread", category: "db" }, e));
      revalidatePath("/mat");
    }
    redirect(`/mat/jobs/${had.id}`);
  }
  /* 영어 화면이면 영어로 읽는다(AI 가 켜져 있으면 공고마다 영어 요약도 남는다) */
  const lang = await matLang();
  const id = await analyzeOrPay(user.id, async () => {
    try {
      return (await analyzePosting(user.id, { label, text: p.req.join("\n"), deadline: p.closes_on, hint: hint ?? undefined, lang })).id;
    } catch (e) {
      opFail({ operation: "assistant.posting", ref: ref("user", user.id), step: "mat.job", category: "db" }, e);
      return "";
    }
  }, "/mat/jobs?e=save");
  revalidatePath("/mat");
  redirect(`/mat/jobs/${id}`);
}

/**
 * 파일 대신 **메모로 경험 초안 만들기**(MAT 경험 파일 화면). 파일 읽기가 꺼져 있을 때 같은 화면에서 쓴다
 * (2026-11-02 운영 시험: "메모로 적어 주세요" 라는데 메모 칸이 없었다). 웹 작업공간의 메모와 같은 동작
 */
export async function matMemoDraft(form: FormData): Promise<void> {
  const user = await requireUser();
  const r = await canUseMat(user.id, "draft");
  if (!r.ok) redirect(r.why === "needcore" ? "/mat?e=needcore" : "/mat/pricing?from=draft");
  const note = String(form.get("note") ?? "").trim().slice(0, 4000);
  if (note.length < 10) redirect("/mat/files?e=memo#memo");
  let id = "";
  try {
    id = (await draftExperience(user.id, note, await matLang())).id;
  } catch (e) {
    opFail({ operation: "assistant.draft", ref: ref("user", user.id), step: "mat.memo", category: "db" }, e);
  }
  if (!id) redirect("/mat/files?e=save#memo");
  redirect(`/me/experience/new?draft=${id}`);
}

/** 모을 때 단 전공 · 영역(많이 걸린 차례) · 직무 이름 */
async function hintOf(job: string): Promise<PostingHint | null> {
  const h = await queryOne<{ core: string | null; td: Record<string, number> | null; role: string | null }>(
    `SELECT core_code AS core, required_td AS td, role_code AS role FROM v3_job_postings WHERE id = $1`, [job],
  ).catch(() => null);
  if (!h) return null;
  const td = Object.entries(h.td ?? {}).sort((a, b) => Number(b[1]) - Number(a[1])).map(([k]) => k);
  return { core: h.core, td, role: h.role };
}

/**
 * MAT 공고 화면에서 **AI 분석을 켜고 그 공고를 다시 읽는다**(2026-11-02 운영 시험: 켜는 곳이 이 화면에 없었다).
 * 동의 문구는 화면의 단추 바로 위에 있다. 켠 뒤에는 `/me/track` 설정에서 끌 수 있다
 */
export async function matAiOn(form: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(form.get("id") ?? "");
  if (!/^\d{1,18}$/.test(id)) redirect("/mat/jobs");
  await canReread(user.id);
  /* 동의 창(시안 Consent)의 '다음부터 묻지 않기' 는 **기본이 꺼짐**이다. 켠 사람만 동의를 저장하고,
     끈 사람은 이번 한 번만 Claude 로 읽는다 */
  const remember = String(form.get("remember") ?? "") === "1";
  if (remember) await setAiConsent(user.id, true);
  const row = await queryOne<{ label: string }>(
    `SELECT label FROM assistant_postings WHERE user_id = $1 AND id = $2`, [user.id, id]).catch(() => null);
  if (!row) redirect("/mat/jobs");
  const jobNo = /^(잡인더스트리|고용24) 공고 (\d{1,18})$/.exec(row.label)?.[2] ?? null;
  await reanalyzePosting(user.id, id, jobNo ? (await hintOf(jobNo)) ?? undefined : undefined, !remember, await matLang()).catch((e) =>
    opFail({ operation: "assistant.posting", ref: ref("user", user.id), step: "mat.job.ai", category: "db" }, e));
  revalidatePath("/mat");
  redirect(`/mat/jobs/${id}`);
}

/** 붙여 넣은 공고 글을 분석한다(링크만으로는 남의 화면을 열지 않는다: 글을 붙여 넣는다) */
export async function matPasteJob(form: FormData): Promise<void> {
  const user = await requireUser();
  const text = String(form.get("text") ?? "").trim();
  const lang = await matLang();
  const label = String(form.get("label") ?? "").trim().slice(0, 80) || (lang === "en" ? "Pasted posting" : "붙여 넣은 공고");
  if (text.length < 30) redirect("/mat/jobs?e=short#paste");
  const id = await analyzeOrPay(user.id, async () => {
    try {
      return (await analyzePosting(user.id, { label, text, deadline: null, lang })).id;
    } catch (e) {
      opFail({ operation: "assistant.posting", ref: ref("user", user.id), step: "mat.paste", category: "db" }, e);
      return "";
    }
  }, "/mat/jobs?e=save#paste");
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
  const acc = await matAccess(user.id);
  if (!acc.open) redirect("/mat/pricing");
  const id = String(form.get("id") ?? "");
  const p = await livePostingOf(user.id, id);
  if (!p) redirect("/mat/jobs");
  const core = await activeCore(user.id);
  if ((p.core_code ?? core) !== core) redirect(`/mat/jobs/${id}?taken=x#tasks`);
  const lang = await matLang();
  const tasks = smallTasks(core, p.analysis.items, await experiencesOf(user.id, core), lang);
  const open = await openActions(user.id);
  if (open.fromResult && open.rows.length) {
    await importActions(user.id, open.rows.map((r) => ({
      td: r.td_code, axis: r.axis_code, body: r.body, horizon: r.horizon })));
  }
  /* 무료는 이번 주 할 일 1개(`FREE_SCOPE.weekTasks`). 나머지는 기간권으로 */
  const n = await importActions(user.id, tasks.slice(0, acc.paid ? tasks.length : acc.weekTasks).map((t) => ({
    td: t.domain, axis: t.axis, body: taskBody(t, p.label, lang), horizon: 30,
  })), "manual");
  await mark("action_saved", user.id, { from: "mat.posting", n });
  revalidatePath("/mat");
  redirect(`/mat/jobs/${id}?taken=${n}#tasks`);
}

/**
 * 분석한 공고를 지원 현황(관심 칸)에 담는다.
 *
 * **회사 이름을 받지 않는다.** 공고 이름(사람이 붙인 이름이나 `출처 공고 번호`)만 메모 칸에 둔다.
 * 같은 공고는 두 번 담지 않는다. 메모는 기존 지원 기록과 같이 1년 뒤 지운다(`addApplication`).
 */
export async function matTrackApp(form: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(form.get("id") ?? "");
  const p = await livePostingOf(user.id, id);
  if (!p) redirect("/mat/jobs");
  const has = (await applicationsOf(user.id)).some((a) => a.note_text === p.label);
  if (!has) await addApplication(user.id, { state: "watching", note_text: p.label });
  revalidatePath("/mat");
  revalidatePath("/mat/jobs");
  redirect("/mat/jobs#track");
}

const STATES = new Set(["watching", "applied", "interview", "offer", "closed"]);

/** 지원 현황의 칸을 옮긴다. 지원 칸으로 처음 옮길 때 그날을 지원한 날로 적는다 */
export async function matMoveApp(form: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(form.get("id") ?? "");
  const state = String(form.get("state") ?? "");
  if (!/^\d{1,18}$/.test(id) || !STATES.has(state)) redirect("/mat/jobs#track");
  await setApplicationState(user.id, id, state);
  if (state === "applied") {
    await queryOne(`UPDATE v3_applications SET applied_on = coalesce(applied_on, (now() AT TIME ZONE 'Asia/Seoul')::date)
                     WHERE id = $1 AND user_id = $2 RETURNING id`, [id, user.id]).catch(() => null);
  }
  revalidatePath("/mat");
  revalidatePath("/mat/jobs");
  redirect("/mat/jobs#track");
}

export async function matDropApp(form: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(form.get("id") ?? "");
  if (/^\d{1,18}$/.test(id)) await removeApplication(user.id, id);
  revalidatePath("/mat/jobs");
  redirect("/mat/jobs#track");
}

/** 주간 브리핑 메일 켜고 끄기(웹 작업공간과 같은 칸) */
export async function matDigestAction(form: FormData): Promise<void> {
  const user = await requireUser();
  await setEmailDigest(user.id, String(form.get("on") ?? "") === "1");
  revalidatePath("/mat/brief");
  redirect("/mat/brief");
}
