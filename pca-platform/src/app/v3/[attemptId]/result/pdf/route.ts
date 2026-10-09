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
import { query } from "@/lib/db";
import { attemptOf, latestResult } from "@/lib/me-v3/runtime/session";
import { drawResultPdf, PdfFailed, resolveChromium } from "@/lib/me-v3/result/pdf";
import { participantOf, record } from "@/lib/me-v3/pilot/store";
import { mark } from "@/lib/me-v3/pilot/funnel";

/**
 * 못 뽑았을 때 **사용자에게 보이는 쪽.**
 *
 * `pdf failed` 라는 날글자를 그대로 내보내고 있었다. 받은 사람은 그것이
 * 자기 잘못인지 서비스 탈인지 모르고, 웹 결과지가 그대로 열려 있다는
 * 사실도 모른다. 상태 코드는 503 그대로 두고(화면이 다른 길을 안내할 수
 * 있게) 사람이 읽는 문장과 나갈 길을 함께 준다.
 */
function sorryPage(attemptId: string): Response {
  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>결과지 PDF · CareerMatri</title>
<style>
 :root { color-scheme: light }
 body { margin:0; background:#f6f7f9; color:#1e2838;
        font:15px/1.7 "Pretendard","Noto Sans KR",system-ui,sans-serif;
        display:flex; min-height:100vh; align-items:center; justify-content:center; padding:24px }
 main { max-width:520px; background:#fff; border:1px solid #e3e7ee; border-radius:16px; padding:28px }
 h1 { margin:0 0 12px; font-size:20px; letter-spacing:-.02em }
 p { margin:0 0 14px; color:#475569 }
 .acts { display:flex; flex-wrap:wrap; gap:10px; margin-top:18px }
 a { display:inline-flex; align-items:center; min-height:44px; padding:0 16px;
     border-radius:10px; text-decoration:none; font-weight:600; font-size:14px }
 .main { background:#1d4ed8; color:#fff }
 .ghost { border:1px solid #e3e7ee; color:#1e2838 }
</style></head><body><main>
 <h1>지금은 PDF 를 만들지 못했습니다</h1>
 <p>결과 자체는 그대로 있습니다. 웹 결과지는 지금 바로 열리고, 내용은
    종이와 같습니다.</p>
 <p>잠시 뒤에 다시 눌러 보셔도 됩니다. 계속 안 되면 고객지원으로 알려
    주세요. 저희 쪽 기록에 남아 있어 바로 확인할 수 있습니다.</p>
 <div class="acts">
  <a class="main" href="/v3/${encodeURIComponent(attemptId)}/result">웹 결과지 보기</a>
  <a class="ghost" href="/me">내 CareerMatri</a>
  <a class="ghost" href="/support">고객지원</a>
 </div>
</main></body></html>`;
  return new Response(html, {
    status: 503,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}

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
  } catch (e) {
    /**
     * **왜 못 뽑았는지를 버리지 않는다.**
     *
     * 전에는 `catch {}` 였다. 그래서 운영에서 `pdf failed` 를 본 사람이
     * 로그를 뒤져도 아무 줄이 없었고, 브라우저가 안 뜬 것과 결과 쪽이
     * 500 인 것과 시간 초과가 전부 같은 상태로 보였다. 셋은 고치는
     * 사람이 다르다.
     *
     * 적는 자리가 셋이다: 서버 로그 한 줄 · 운영 표(`job_failures`) ·
     * 파일럿 참가자면 그 응시 기록. **운영 표에 적는 것을 파일럿
     * 참가자로 좁히지 않는다**: 돈을 낸 사람이 못 뽑은 날을 아무도 못
     * 보는 것이 가장 비싸다.
     */
    const step = e instanceof PdfFailed ? e.step : "unknown";
    const why = String((e as Error)?.message ?? e).split("\n")[0].slice(0, 300);
    const { bin, tried } = resolveChromium();
    const line = `[v3-pdf] attempt=${attemptId} tier=${a.tier} step=${step} `
      + `base=${base} chromium=${bin ?? "(없음)"} tried=${tried.length} :: ${why}`;
    console.error(line);
    /* **`attempt_id` 에 V3 응시 번호를 넣지 않는다.** 그 칸의 외래키는
       옛 응시 표(`attempts`)를 가리키고 V3 는 `v3_attempts` 라 다른 표다.
       넣으면 외래키에서 거절되고, `.catch` 가 그것을 삼켜 **운영 표에
       한 줄도 안 남는다**(이 저장소에서 같은 모양으로 여러 번 났다).
       응시 번호는 글자 칸인 `trace_id` 가 들고 간다 */
    await query(
      `INSERT INTO job_failures (kind, trace_id, message)
       VALUES ('pdf', $1, $2)`,
      [`v3-pdf-${step}-${attemptId}`, line.slice(0, 400)],
    ).catch((err) => {
      /* 적는 자리가 막힌 것도 조용히 넘기지 않는다. 그러면 다음 사람이
         `로그에도 표에도 없다` 를 또 겪는다 */
      console.error(`[v3-pdf] 운영 표에 못 적었습니다: ${String(err).slice(0, 200)}`);
    });
    if (await participantOf(user.id)) {
      await record(attemptId, "pdf_fail", []).catch(() => undefined);
    }
    return sorryPage(attemptId);
  }
}
