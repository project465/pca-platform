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
import { resultMeta } from "@/lib/me-v3/result/meta";
import { drawResultPdf, PdfFailed, resolveChromium } from "@/lib/me-v3/result/pdf";
import { drawBookPdf } from "@/lib/me-v3/report-long/pdf";
import { hasEdition } from "@/lib/me-v3/i18n";
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
/* 영어 응시가 받는 같은 쪽의 글. 한국어 쪽은 아래 본문 그대로다 */
const SORRY_EN = {
  title: "Results PDF · CareerMatri",
  h1: "We couldn't create your PDF",
  p1: "Your web results are still available, with the same content as the PDF.",
  p2: "You can try again in a moment. If it still doesn't work, let our support team know."
    + " The problem is already in our logs, so we can look into it right away.",
  retry: "Try again", web: "View web results", support: "Support",
};

function sorryPage(attemptId: string, lang: string = "ko"): Response {
  const en = lang === "en";
  const id = encodeURIComponent(attemptId);
  const html = `<!doctype html><html lang="${en ? "en" : "ko"}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${en ? SORRY_EN.title : "결과지 PDF · CareerMatri"}</title>
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
 ${en ? `<h1>${SORRY_EN.h1}</h1>
 <p>${SORRY_EN.p1}</p>
 <p>${SORRY_EN.p2}</p>
 <div class="acts">
  <a class="main" href="/v3/${id}/result/pdf">${SORRY_EN.retry}</a>
  <a class="ghost" href="/v3/${id}/result">${SORRY_EN.web}</a>
  <a class="ghost" href="/support">${SORRY_EN.support}</a>
 </div>` : `<h1>PDF를 만들지 못했습니다</h1>
 <p>웹 결과는 그대로 볼 수 있습니다. 담긴 내용은 종이와 같습니다.</p>
 <p>잠시 뒤에 다시 눌러 보셔도 됩니다. 계속 안 되면 고객지원으로 알려
    주세요. 저희 쪽 기록에 남아 있어 바로 확인할 수 있습니다.</p>
 <div class="acts">
  <a class="main" href="/v3/${id}/result/pdf">다시 시도</a>
  <a class="ghost" href="/v3/${id}/result">웹 결과 보기</a>
  <a class="ghost" href="/support">고객지원</a>
 </div>`}
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
  /**
   * **시작했다는 것을 먼저 적는다.**
   *
   * 전에는 끝났을 때만 적었다. 그래서 `종이가 안 나온다` 는 신고를 받고
   * 로그를 뒤져도 **요청이 이 자리에 닿지 않은 것**과 **그리는 동안
   * 프로세스가 끊긴 것**(브라우저가 메모리를 다 쓰면 그렇게 된다)이 똑같이
   * 생겼다. 둘 다 줄이 하나도 없다. 시작 줄이 있으면 그 둘이 갈린다.
   */
  const t0 = Date.now();
  const got = resolveChromium();
  console.log(`[v3-pdf] start attempt=${attemptId} tier=${a.tier} base=${base} `
    + `chromium=${got.bin ?? "(없음)"}`);
  try {
    /* 쪽머리 한 줄. **값을 여기서 만들지 않는다**: 결과지 머리와 같은
       자리를 읽어(`resultMeta`) 종이와 화면이 다른 학과를 적지 않게 한다 */
    /* PRO 는 긴 결과지(책자)를 뽑는다. 책자 웹 쪽(`/result/book`)을 그대로
       인쇄하므로 웹과 종이가 같다. 쪽머리와 쪽번호는 책자가 스스로 그린다.
       BASIC 과 STANDARD 는 지금의 결과지를 그대로 뽑는다 */
    /* **영어 응시의 PRO 는 책자를 뽑지 않는다**(영어판 1단계,
       `docs/metri/GLOBAL_EN_PLAN.md`). 책자(`report-long/`)는 한국어로만
       쓰여 있어 영어 응시에 뽑으면 한국어 70쪽이 나간다. 1단계 동안은 웹
       결과 종이판을 그대로 내고, 책자 번역은 2단계에서 한다 */
    /* 영어 응시도 영어 원고가 다 갖춰진 전공(기계 · 전기전자 · 컴퓨터)은 책을 뽑는다(영어판 2단계) */
    const book = a.tier === "PRO" && (a.locale === "ko" || hasEdition(a.core_code, "en"));
    let pdf: Buffer;
    if (book) {
      pdf = await drawBookPdf({ attemptId, baseUrl: base, cookie: onlyScope(h.get("cookie") ?? "", user.scope), asStaff: user.scope === "staff" });
    } else {
      const meta = await resultMeta(attemptId, a.core_code);
      const header = [meta.school, meta.department]
        .filter(Boolean)
        .concat(a.locale === "en" ? "CareerMatri Career Analysis Report" : "CareerMatri 진로 분석 리포트")
        .join(" · ");
      pdf = await drawResultPdf({
        attemptId, baseUrl: base, cookie: onlyScope(h.get("cookie") ?? "", user.scope), asStaff: user.scope === "staff", header,
      });
    }
    console.log(`[v3-pdf] done attempt=${attemptId} ${book ? "book " : ""}${pdf.length}바이트 `
      + `${Date.now() - t0}ms`);
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
    const line = `[v3-pdf] attempt=${attemptId} tier=${a.tier}${a.tier === "PRO" ? " book?" : ""} step=${step} `
      + `base=${base} chromium=${got.bin ?? "(없음)"} tried=${got.tried.length} `
      + `${Date.now() - t0}ms :: ${why}`;
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
    return sorryPage(attemptId, a.locale);
  }
}

/**
 * 그리는 브라우저에 **누른 사람의 로그인만** 넘긴다. 담당자와 학생은 쿠키가
 * 따로라(`auth.ts`) 둘 다 넘기면 결과 쪽이 학생 쿠키를 먼저 읽고, 같은
 * 브라우저에 다른 학생이 들어가 있으면 남의 결과를 그리려다 막힌다.
 */
function onlyScope(header: string, scope: "staff" | "student" | undefined): string {
  const staffCookie = (name: string) => /(^|-)cm-staff\./.test(name);
  const studentCookie = (name: string) => /authjs\./.test(name);
  return header.split(";").map((x) => x.trim()).filter((pair) => {
    const name = pair.slice(0, Math.max(0, pair.indexOf("=")));
    return scope === "staff" ? !studentCookie(name) : !staffCookie(name);
  }).join("; ");
}
