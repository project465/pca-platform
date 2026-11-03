import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { mapPaddleEvent, paddleReady, verifyPaddleSignature } from "@/lib/subscriptions/paddle";
import { applySubEvent } from "@/lib/subscriptions/engine";

export const dynamic = "force-dynamic";

/**
 * Paddle 웹훅(sandbox). **서명이 맞을 때만** 사건을 옮긴다(`Paddle-Signature`, HMAC-SHA256).
 * 받은 것은 검증 전에 먼저 적는다(`payment_events`, 같은 사건 번호는 한 줄). 서명이 틀리면 400 으로 돌려
 * Paddle 이 다시 보내게 둔다. 모르는 사건은 받고 200 으로 끝낸다
 */
export async function POST(req: Request) {
  if (!paddleReady()) return NextResponse.json({ ok: false }, { status: 404 });
  const raw = await req.text();
  const sig = req.headers.get("paddle-signature");
  const good = verifyPaddleSignature(raw, sig);
  let body: { event_id?: string } = {};
  try { body = JSON.parse(raw); } catch { /* 아래에서 400 */ }
  await query(
    `INSERT INTO payment_events (provider, event_id, kind, payload) VALUES ('paddle', $1, 'webhook', $2)
     ON CONFLICT (provider, event_id) DO NOTHING`,
    [good ? body.event_id ?? null : null, JSON.stringify({ body: raw.slice(0, 20_000), verified: good })],
  ).catch(() => undefined);
  if (!good) return NextResponse.json({ ok: false, reason: "signature" }, { status: 400 });
  const ev = mapPaddleEvent(body as Parameters<typeof mapPaddleEvent>[0]);
  if (!ev) return NextResponse.json({ ok: true, note: "ignored" });
  const r = await applySubEvent("paddle", ev);
  return NextResponse.json(r);
}
