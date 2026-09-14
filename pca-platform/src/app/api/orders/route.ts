import { NextResponse } from "next/server";
import { canFulfill, createOrder } from "@/lib/orders";
import { enabledCurrencies, isProduct, isSite, priceOf } from "@/lib/pricing";
import { paymentsEnabled } from "@/lib/payments";

/**
 * 개인 주문을 만드는 곳.
 *
 * 소개 사이트는 정적으로 나가므로 **브라우저가 여기를 직접 부른다.**
 * 단체 신청(/api/applications)과 달리 비밀 헤더를 쓸 수 없다 — 정적
 * 사이트에 비밀을 숨길 자리가 없기 때문이다. 그래서 대신 이렇게 막는다.
 *
 *   · 부를 수 있는 출처를 정해 둔다 (CORS 허용 목록)
 *   · **금액은 몸통에서 읽지 않는다.** 서버 가격표에서만 나온다
 *   · 주문이 생겨도 아무것도 발급되지 않는다. 발급은 결제 웹훅이 한다
 *
 * 주문 하나가 만들어져 봐야 남는 것은 행 하나다. 쓰레기 주문이 쌓일 수는
 * 있어도 그것으로 공짜 응시권이 나오지는 않는다.
 */

/** 판마다 도메인이 다르다. 쉼표로 나눠 적는다 */
function allowedOrigins(): string[] {
  return (process.env.MARKETING_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function corsHeaders(origin: string | null): Record<string, string> {
  const list = allowedOrigins();
  const ok = origin && list.includes(origin);
  return {
    "access-control-allow-origin": ok ? origin : "null",
    "access-control-allow-methods": "POST, GET, OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "600",
    vary: "origin",
  };
}

export async function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req.headers.get("origin")) });
}

/**
 * 지금 살 수 있는가.
 *
 * 소개 사이트의 "바로 구매" 단추는 이 대답으로 켜진다. 사람이 켜는
 * 스위치를 두지 않은 이유는, 사람은 문항이나 채점이 아직 없다는 걸
 * 잊고 켜기 때문이다. 못 주는 동안에는 화면에서 단추가 사라진다.
 */
export async function GET(req: Request) {
  const headers = corsHeaders(req.headers.get("origin"));
  const url = new URL(req.url);
  const site = url.searchParams.get("site");
  if (!isSite(site)) {
    return NextResponse.json({ error: "bad_site" }, { status: 400, headers });
  }

  const price = priceOf(site, "individual");
  const ready = await canFulfill();
  const sellable =
    ready.ok && paymentsEnabled() && enabledCurrencies().has(price.currency);

  return NextResponse.json(
    {
      sellable,
      amount: price.amount,
      currency: price.currency,
      /* 왜 못 파는지 숨기지 않는다. 화면에 띄울 것은 아니고 우리가 본다 */
      blockedBy: sellable
        ? []
        : [
            ...(ready.ok ? [] : ready.missing),
            ...(paymentsEnabled() ? [] : ["payments_not_configured"]),
            ...(enabledCurrencies().has(price.currency) ? [] : ["currency_" + price.currency]),
          ],
    },
    { headers },
  );
}

/** 같은 곳에서 쏟아져 들어오는 것만 막는다. 한 시간에 스무 건이면 충분하다 */
const seen = new Map<string, number[]>();
function tooMany(ip: string): boolean {
  const now = Date.now();
  const hour = now - 3_600_000;
  const hits = (seen.get(ip) ?? []).filter((t) => t > hour);
  hits.push(now);
  seen.set(ip, hits);
  if (seen.size > 5_000) seen.clear();
  return hits.length > 20;
}

export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);

  if (allowedOrigins().length === 0) {
    console.error("[order] MARKETING_ORIGINS 가 없어 주문을 받을 수 없습니다");
    return NextResponse.json({ error: "not_configured" }, { status: 503, headers });
  }
  if (headers["access-control-allow-origin"] === "null") {
    return NextResponse.json({ error: "origin_not_allowed" }, { status: 403, headers });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (tooMany(ip)) {
    return NextResponse.json({ error: "too_many" }, { status: 429, headers });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400, headers });
  }
  const b = body as Record<string, unknown>;

  /* 허니팟. 사람은 이 칸을 못 본다 */
  if (typeof b.website === "string" && b.website.trim() !== "") {
    return NextResponse.json({ ok: true, orderNo: "MT-0000-000000" }, { headers });
  }

  const site = b.site;
  const product = b.product ?? "individual";
  const email = typeof b.email === "string" ? b.email.trim() : "";
  const name = typeof b.name === "string" ? b.name.trim() : "";

  if (!isSite(site)) return NextResponse.json({ error: "bad_site" }, { status: 422, headers });
  if (!isProduct(product)) {
    return NextResponse.json({ error: "bad_product" }, { status: 422, headers });
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 200) {
    return NextResponse.json({ error: "bad_email" }, { status: 422, headers });
  }
  if (name.length < 1 || name.length > 100) {
    return NextResponse.json({ error: "bad_name" }, { status: 422, headers });
  }

  /* 못 줄 것은 팔지 않는다 */
  const ready = await canFulfill();
  if (!ready.ok) {
    console.warn("[order] 아직 팔 수 없습니다:", ready.missing.join(","));
    return NextResponse.json({ error: "not_sellable" }, { status: 409, headers });
  }
  if (!paymentsEnabled()) {
    return NextResponse.json({ error: "not_sellable" }, { status: 409, headers });
  }
  const price = priceOf(site, product);
  if (!enabledCurrencies().has(price.currency)) {
    return NextResponse.json({ error: "currency_not_enabled" }, { status: 409, headers });
  }

  try {
    const o = await createOrder({ site, product, email, name });
    console.info("[order] 주문", o.orderNo, site, o.amount, o.currency);
    /* 금액을 돌려주는 것은 결제창에 넘기기 위해서다. 되돌아 들어올 때는
       이 값을 믿지 않고 대행사에 다시 묻는다 (lib/payments.ts) */
    return NextResponse.json({ ok: true, ...o }, { status: 201, headers });
  } catch (e) {
    console.error("[order] 주문 생성 실패", e);
    return NextResponse.json({ error: "server" }, { status: 500, headers });
  }
}
