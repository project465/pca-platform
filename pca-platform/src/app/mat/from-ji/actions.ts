"use server";

import { matLang } from "@/lib/mat/lang";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { queryOne } from "@/lib/db";
import { jiPostFromCookie } from "@/lib/attribution";
import { matAccess, runAnalysis } from "@/lib/mat-access";
import { jiPosting } from "@/lib/mat/ji-posting";
import { fetchJobPage } from "@/lib/partner-job";
import { analyzePosting } from "@/lib/assistant/posting";
import { opFail, ref } from "@/lib/oplog";
import { matAnalyzeJob } from "../actions";

/**
 * 잡인더스트리 공고 입구의 `내 경험과 맞춰 보기`. 무료 1회 칸은 다른 분석과 같은 자리(`runAnalysis`)에서 잡는다.
 *
 * - 모아 둔 공고면 공고 화면의 `바로 분석` 과 같은 길(`matAnalyzeJob`)
 * - 아직 모으지 않은 공고면 서버가 만든 상세 주소(허용 게시판만)를 열어 글을 읽는다
 * - 전공이 없는 사람(검사 없이 가입)은 그 공고의 전공으로 시작한다
 */
export async function matJiAnalyze(): Promise<void> {
  const user = await requireUser();
  const post = await jiPostFromCookie();
  if (!post) redirect("/mat/jobs");
  const row = await jiPosting(post.idx);
  const acc = await matAccess(user.id);
  if (!acc.core && row?.core) {
    const { sellableCores } = await import("@/lib/me-v3/core-registry");
    if (sellableCores("KR").some((c) => c.code === row.core)) {
      await queryOne(`INSERT INTO career_profiles (user_id, core_code, market_code) VALUES ($1, $2, 'KR')
                      ON CONFLICT (user_id, core_code) DO NOTHING RETURNING id`, [user.id, row.core]).catch(() => null);
    }
  }
  if (row && row.req.length) {
    const fd = new FormData();
    fd.set("job", row.id);
    await matAnalyzeJob(fd);
    return;
  }
  const got = await fetchJobPage(post.url);
  if (!got.ok) redirect("/mat/jobs?e=noread#paste");
  const r = await runAnalysis(user.id, async () => {
    try {
      return (await analyzePosting(user.id, { label: `잡인더스트리 공고 idx ${post.idx}`.slice(0, 80), text: got.text, deadline: null, lang: await matLang() })).id;
    } catch (e) {
      opFail({ operation: "assistant.posting", ref: ref("user", user.id), step: "mat.ji", category: "db" }, e);
      return "";
    }
  });
  if ("blocked" in r) redirect(r.blocked === "needcore" ? "/mat?e=needcore" : "/mat/pricing?from=free");
  if ("failed" in r) redirect("/mat/jobs?e=save");
  revalidatePath("/mat");
  redirect(`/mat/jobs/${r.id}`);
}
