/**
 * 긴 결과지(PRO 책자)를 웹 쪽으로 내준다.
 *
 * 종이(`/v3/{id}/result/pdf`)는 이 쪽을 그대로 인쇄한다. 그래서 웹과 종이가 같은
 * HTML 이다.
 *
 * 남의 번호를 넣어도 열리지 않는다. `attemptOf` 가 `user_id` 로 거른다.
 * PRO 가 아닌 응시는 지금의 웹 결과로 보낸다: 책자는 여덟 판단과 심화와 경험 번역을
 * 읽어 쓰는데, 그 응답은 PRO 에서만 받는다.
 */
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { attemptOf, latestResult } from "@/lib/me-v3/runtime/session";
import { buildLongReport } from "@/lib/me-v3/report-long";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ attemptId: string }> },
) {
  const { attemptId } = await ctx.params;
  const user = await requireUser();
  const a = await attemptOf(attemptId, user.id);
  if (!a) return new Response("not found", { status: 404 });
  if (!(await latestResult(attemptId))) return new Response("not found", { status: 404 });
  if (a.tier !== "PRO") redirect(`/v3/${encodeURIComponent(attemptId)}/result`);
  const rep = await buildLongReport(attemptId, { fontBase: "/fonts/cm-book/" });
  return new Response(rep.html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "private, no-store",
      "x-robots-tag": "noindex",
    },
  });
}
