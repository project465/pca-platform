import { NextResponse } from "next/server";
import { submitInquiry } from "@/lib/inquiry";
import { clientIpFrom } from "@/lib/login-throttle";

export const dynamic = "force-dynamic";

/**
 * 도입 문의 · 출시 알림 신청을 받는다.
 *
 * **보통의 폼 POST 로 받는다.** 홈페이지(`careermatri.com`)는 다른 배포본이라
 * 자바스크립트로 보내면 출처 허용(CORS)을 열어야 하고, 스크립트가 꺼진
 * 브라우저에서는 단추가 아무 일도 안 한다. 폼이 이 주소로 오고, 여기서 저장한
 * 뒤 **보낸 쪽 화면으로 되돌려 보낸다**(`?sent=1` 또는 `?err=…`).
 *
 * **되돌아갈 주소를 아무 곳으로나 보내지 않는다.** 우리 홈페이지와 이 앱,
 * 개발 중의 로컬만 받는다. 밖으로 보내는 열린 리다이렉트가 되면 피싱 링크에
 * 우리 도메인이 쓰인다.
 */

const hits = new Map<string, number[]>();
/** 한 곳에서 10분에 열 번까지. 넘으면 저장하지 않고 **그 사실을 적어 돌려보낸다**:
    접수된 것처럼 보내면 학교 전산실처럼 주소를 나눠 쓰는 자리에서 열한째
    사람이 신청했다고 믿고 기다린다 */
function tooMany(ip: string, now = Date.now()): boolean {
  const xs = (hits.get(ip) ?? []).filter((t) => now - t < 600_000);
  xs.push(now);
  hits.set(ip, xs);
  return xs.length > 10;
}

function safeBack(raw: string, origin: string): URL {
  try {
    const u = new URL(raw, origin);
    const host = u.hostname.toLowerCase();
    const app = (() => { try { return new URL(process.env.PLATFORM_URL ?? origin).hostname; } catch { return ""; } })();
    const ok = host === app || host === new URL(origin).hostname
      || host === "careermatri.com" || host.endsWith(".careermatri.com")
      || host === "localhost" || host === "127.0.0.1";
    if (ok && (u.protocol === "https:" || u.protocol === "http:")) return u;
  } catch { /* 아래로 */ }
  return new URL("/support", origin);
}

export async function POST(req: Request) {
  const origin = new URL(req.url).origin;
  let f: FormData;
  try { f = await req.formData(); } catch { return NextResponse.redirect(new URL("/support", origin), 303); }
  const s = (k: string) => (typeof f.get(k) === "string" ? String(f.get(k)) : "");
  const back = safeBack(s("back") || req.headers.get("referer") || "/support", origin);
  const ip = clientIpFrom(req.headers);

  const r = tooMany(ip)
    ? { ok: false as const, why: "busy" as const }
    : await submitInquiry({
      kind: s("kind") === "launch_notify" ? "launch_notify" : "contact",
      topic: s("topic") || null,
      orgName: s("org_name"), contactName: s("contact_name"), phone: s("phone"),
      email: s("email"), headcount: s("headcount"), timing: s("timing"),
      message: s("message"), productCode: s("product") || null,
      lang: s("lang") || null, source: s("source") || null,
      sourceBrand: s("brand") || null,
      consent: s("consent") === "yes",
      honeypot: s("website"),
      renderedAt: Number(s("t")) || null,
    }).catch(() => ({ ok: false as const, why: "required" as const }));

  /* 알림 신청은 **상품 코드로** 돌려준다. 한 쪽에 칸이 여럿이라 `1` 로
     돌려주면 다른 상품의 칸까지 신청한 것으로 그린다 */
  const key = s("kind") === "launch_notify" ? (s("product") || "1") : "1";
  for (const k of ["sent", "err", "for"]) back.searchParams.delete(k);
  if (r.ok) back.searchParams.set("sent", key);
  else { back.searchParams.set("err", r.why); back.searchParams.set("for", key); }
  return NextResponse.redirect(back, 303);
}
