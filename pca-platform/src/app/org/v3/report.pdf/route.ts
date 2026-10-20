/**
 * 대학 운영 요약 PDF(규격 §19).
 *
 * **웹과 종이가 같은 쪽을 읽는다.** 그리는 것은 `/org/v3/report` 하나이고
 * 여기서 하는 일은 그 쪽을 인쇄 매체로 열어 종이로 접는 것뿐이다. 따로
 * 그리면 어느 날 둘이 갈리고, 갈린 날 담당자가 회의 자리에서 화면과 다른
 * 종이를 들고 앉는다.
 *
 * **개인 응답이 한 칸도 들어가지 않는다**(규격 §19·§23). 그 쪽에 들어가는
 * 값이 전부 세는 값이고 `5명 미만` 칸은 애초에 만들어지지 않는다.
 */
import { headers } from "next/headers";
import { query } from "@/lib/db";
import { campusNames } from "@/lib/campus/labels";
import {
  campusQuery, campusQueryKo, campusQueryString, campusViewer,
} from "@/lib/campus/viewer";
import { drawPagePdf, PdfFailed, resolveChromium } from "@/lib/me-v3/result/pdf";
import { auditExport } from "@/lib/campus/export-audit";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * 못 뽑았을 때 **담당자에게 보이는 쪽.**
 *
 * `pdf failed` 를 그대로 내보내면 받은 사람은 그것이 자기 잘못인지 서비스
 * 탈인지 모르고, **같은 내용이 화면에 그대로 열려 있다는 사실**도 모른다.
 * 상태 코드는 503 그대로 두고 사람이 읽는 문장과 나갈 길을 함께 준다
 * (규격 §21 · generic 500 page 금지).
 */
function sorryPage(qs: string): Response {
  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>운영 요약 PDF · CareerMatri Campus</title>
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
 .main { background:#1c5fb0; color:#fff }
 .ghost { border:1px solid #e3e7ee; color:#1e2838 }
</style></head><body><main>
 <h1>PDF를 만들지 못했습니다</h1>
 <p>같은 내용이 화면에 그대로 열립니다. 브라우저에서 인쇄하시면 같은
    종이가 나옵니다.</p>
 <p>잠시 뒤에 다시 눌러 보셔도 됩니다. 계속 안 되면 고객지원으로 알려
    주세요. 저희 쪽 기록에 남아 있어 바로 확인할 수 있습니다.</p>
 <div class="acts">
  <a class="main" href="/org/v3/report${qs}">화면으로 보기</a>
  <a class="ghost" href="/org/v3/report.pdf${qs}">다시 시도</a>
  <a class="ghost" href="/org/v3">집계 화면</a>
 </div>
</main></body></html>`;
  return new Response(html, {
    status: 503,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}

export async function GET(req: Request): Promise<Response> {
  /* **범위를 여기서 다시 정하지 않는다.** 집계와 명단과 이 종이가 같은
     함수에 묻는다(설계 원칙 10) */
  const view = await campusViewer();
  if (!view.uni) {
    /* **날글자를 내려받게 하지 않는다**(규격 §21). 내려받기 링크를 누른
       사람에게 글자 한 줄이 든 빈 쪽이 뜨면 그것이 고장으로 읽힌다.
       보던 화면으로 돌려보내고 거기서 까닭을 적는다 */
    return Response.redirect(new URL("/org/v3?e=scope", req.url), 303);
  }
  const sp = Object.fromEntries(new URL(req.url).searchParams);
  const q = campusQuery(sp);
  const withDemo = sp.demo === "1";
  const qs = campusQueryString(q, withDemo ? { demo: "1" } : {});
  const name = campusNames(view.uni);

  const h = await headers();
  /* **제 주소로 제가 들어간다.** 그리는 브라우저가 이 서버에 다시 붙어야
     해서 지금 요청이 들어온 자리를 그대로 쓴다. `appDomain()` 을 쓰지
     않는 까닭은 그쪽이 공개 전 배포본을 거절하는 판정이기 때문이다 */
  const base = (process.env.PDF_BASE ?? "").trim()
    || `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host") ?? "127.0.0.1:3000"}`;

  /* **시작했다는 것을 먼저 적는다.** 끝났을 때만 적으면 요청이 이 자리에
     닿지 않은 것과 그리는 동안 프로세스가 끊긴 것이 로그에서 똑같이
     생긴다(둘 다 줄이 하나도 없다) */
  const t0 = Date.now();
  const got = resolveChromium();
  console.log(`[org-pdf] start uni=${view.uni} base=${base} `
    + `chromium=${got.bin ?? "(없음)"}`);
  try {
    const header = [view.org?.name ?? view.uni, campusQueryKo(q, name)]
      .concat("CareerMatri Campus 운영 요약").join(" · ");
    const pdf = await drawPagePdf({
      path: `/org/v3/report${qs}`, baseUrl: base,
      cookie: h.get("cookie") ?? "", header,
      /* 표지가 섰는지로 본다. **`networkidle` 로 기다리지 않는다**: 쪽에
         미리 불러오는 요청이 있으면 멈추지 않는 날이 있다 */
      waitFor: ".og .og-cover h1",
    });
    console.log(`[org-pdf] done uni=${view.uni} ${pdf.length}바이트 `
      + `${Date.now() - t0}ms`);
    /* 종이를 건네기 직전에 적는다. 못 뽑은 날은 받아 간 것이 없으니 적지 않는다 */
    await auditExport(view, "campus.export.report", q, { demo: withDemo });
    return new Response(new Uint8Array(pdf), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="careermatri-campus-`
          + `${view.uni}-${new Date().toISOString().slice(0, 10)}.pdf"`,
        "cache-control": "private, no-store",
      },
    });
  } catch (e) {
    /* **왜 못 뽑았는지를 버리지 않는다.** 브라우저가 안 뜬 것과 쪽이 500
       인 것과 시간 초과는 고치는 사람이 다르다 */
    const step = e instanceof PdfFailed ? e.step : "unknown";
    const why = String((e as Error)?.message ?? e).split("\n")[0].slice(0, 300);
    const line = `[org-pdf] uni=${view.uni} step=${step} base=${base} `
      + `chromium=${got.bin ?? "(없음)"} tried=${got.tried.length} `
      + `${Date.now() - t0}ms :: ${why}`;
    console.error(line);
    await query(
      `INSERT INTO job_failures (kind, trace_id, message)
       VALUES ('pdf', $1, $2)`,
      [`org-pdf-${step}-${view.uni}`, line.slice(0, 400)],
    ).catch((err) => {
      console.error(`[org-pdf] 운영 표에 못 적었습니다: ${String(err).slice(0, 200)}`);
    });
    return sorryPage(qs);
  }
}
