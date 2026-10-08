/**
 * 결과지 PDF 를 그 자리에서 뽑아 내려 준다.
 *
 * **미리 만들어 두지 않는다.** V3 결과지는 굳혀 둔 결과 모델 하나를 읽어
 * 그리므로 언제 뽑아도 같은 종이가 나온다. 미리 만들어 두면 뽑아 둔 뒤에
 * 결과지 화면을 고친 날 **웹과 종이가 갈린다.**
 *
 * **남의 번호를 넣어도 열리지 않는다.** `attemptOf` 가 `user_id` 로 거르고,
 * 그리는 브라우저에는 부른 사람의 쿠키를 그대로 넘긴다.
 */
import { headers } from "next/headers";
import { requireUser } from "@/lib/session";
import { attemptOf, latestResult } from "@/lib/me-v3/runtime/session";
import { drawResultPdf } from "@/lib/me-v3/result/pdf";
import { participantOf, record } from "@/lib/me-v3/pilot/store";
import { mark } from "@/lib/me-v3/pilot/funnel";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ attemptId: string }> },
) {
  const { attemptId } = await ctx.params;
  const user = await requireUser();
  const a = await attemptOf(attemptId, user.id);
  if (!a) return new Response("not found", { status: 404 });
  /* 굳혀 둔 결과가 없으면 종이도 없다. 여기서 만들지 않는다 */
  if (!(await latestResult(attemptId))) return new Response("not found", { status: 404 });

  const h = await headers();
  /* **제 주소로 제가 들어간다.** 그리는 브라우저가 이 서버에 다시 붙어야
     해서 지금 요청이 들어온 자리를 그대로 쓴다. `appDomain()` 을 쓰지 않는
     까닭은 그쪽이 공개 전 배포본을 거절하는 판정이기 때문이다 */
  const base = (process.env.PDF_BASE ?? "").trim()
    || `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host") ?? "127.0.0.1:3000"}`;
  try {
    const pdf = await drawResultPdf({
      attemptId, baseUrl: base, cookie: h.get("cookie") ?? "",
    });
    const p = await participantOf(user.id);
    if (p) {
      await mark("pdf_opened", {
        userId: user.id, attemptId, participant: p.code, wave: p.wave, tier: a.tier,
      });
    }
    return new Response(new Uint8Array(pdf), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition":
          `attachment; filename="careermatri-v3-${a.tier}-${attemptId}.pdf"`,
        "cache-control": "private, no-store",
      },
    });
  } catch {
    /* 못 뽑은 자리를 운영 표가 보게 적어 둔다. 한 사람이 못 뽑은 것과
       아무도 눌러 보지 않은 것은 다른 상황이고, 적지 않으면 화면에서 같이 보인다 */
    if (await participantOf(user.id)) {
      await record(attemptId, "pdf_fail", []).catch(() => undefined);
    }
    /* **왜 못 뽑았는지를 삼키지 않는다.** 화면이 다른 길을 안내할 수 있게
       상태 코드로 가른다: 결과는 있는데 종이만 못 만든 자리다 */
    return new Response("pdf failed", { status: 503 });
  }
}
