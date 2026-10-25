import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { deleteSubscription, pushKeys, saveSubscription } from "@/lib/push";

export const dynamic = "force-dynamic";

const NO_STORE = { "cache-control": "no-store" };

/**
 * 웹 알림 구독. 화면(`push-toggle.tsx`)과 서비스 워커만 부른다.
 *
 *   GET     켜져 있는지와 공개 열쇠(브라우저가 구독할 때 쓴다)
 *   POST    이 기기를 구독한다      { endpoint, keys: { p256dh, auth } }
 *   DELETE  이 기기(또는 전부)를 끊는다 { endpoint? }
 *
 * **로그인한 본인 것만 다룬다.** 주소를 알아도 남의 구독을 지우거나 옮길 수
 * 없다. 비밀번호를 바꿔야 하는 계정은 다른 화면처럼 막는다.
 */
async function who() {
  const u = await currentUser();
  return u && !u.mustResetPw ? u : null;
}

export async function GET() {
  const keys = pushKeys();
  return NextResponse.json({ ok: true, on: Boolean(keys), key: keys?.publicKey ?? null }, { headers: NO_STORE });
}

export async function POST(req: Request) {
  const u = await who();
  if (!u) return NextResponse.json({ ok: false }, { status: 401, headers: NO_STORE });
  if (!pushKeys()) return NextResponse.json({ ok: false, reason: "off" }, { status: 503, headers: NO_STORE });
  const b = (await req.json().catch(() => null)) as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } } | null;
  const endpoint = typeof b?.endpoint === "string" ? b.endpoint : "";
  const p256dh = typeof b?.keys?.p256dh === "string" ? b.keys.p256dh : "";
  const auth = typeof b?.keys?.auth === "string" ? b.keys.auth : "";
  try {
    await saveSubscription(u.id, { endpoint, p256dh, auth });
  } catch {
    return NextResponse.json({ ok: false, reason: "bad" }, { status: 400, headers: NO_STORE });
  }
  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}

export async function DELETE(req: Request) {
  const u = await who();
  if (!u) return NextResponse.json({ ok: false }, { status: 401, headers: NO_STORE });
  const b = (await req.json().catch(() => null)) as { endpoint?: unknown } | null;
  const endpoint = typeof b?.endpoint === "string" && b.endpoint ? b.endpoint : undefined;
  const n = await deleteSubscription(u.id, endpoint);
  return NextResponse.json({ ok: true, removed: n }, { headers: NO_STORE });
}
