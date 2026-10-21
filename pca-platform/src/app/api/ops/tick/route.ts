import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { flushOutbox, checkCodeStock } from "@/lib/outbox";
import { runAssistantTick } from "@/lib/assistant/nudges";
import { runJobsTick } from "@/lib/jobs/tick";

export const dynamic = "force-dynamic";

/**
 * 밤 당번의 손.
 *
 * 몇 분에 한 번 밖에서 두드려 주면 쌓인 알림을 내보내고 코드 재고를
 * 센다. 사람이 자는 동안 이것이 도는 덕에 아침에 "왜 아무 메일도 안
 * 갔지" 가 없다.
 *
 * **토큰이 없으면 아예 열지 않는다.** 인증 없는 주소를 두면 누구나
 * 눌러 메일 발송을 반복시킬 수 있다. 비어 있을 때 통과시키는 쪽으로
 * 기울면, 채우는 것을 잊은 날 그대로 열린 채 운영된다.
 */
function allowed(req: Request): boolean {
  const want = process.env.OPS_TOKEN ?? "";
  if (want.length < 16) return false;
  const got = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(got);
  const b = Buffer.from(want);
  // 길이가 다르면 비교 자체가 던진다. 먼저 거른다
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  if (!allowed(req)) {
    return NextResponse.json({ ok: false }, { status: 401, headers: { "cache-control": "no-store" } });
  }
  const low = await checkCodeStock();
  /* AI 취업비서 알림을 먼저 쌓는다. 그래야 같은 당번이 그 메일까지 내보낸다.
     **실패해도 메일 내보내기를 막지 않는다** */
  const assistant = await runAssistantTick().catch(() => null);
  const mail = await flushOutbox(200);
  /* 공고는 맨 뒤다. 남의 서버를 기다리는 일이라 메일을 붙들지 않게 한다 */
  const jobs = await runJobsTick().catch(() => null);
  return NextResponse.json(
    { ok: true, ...mail, lowStock: low.length, assistant, jobs },
    { headers: { "cache-control": "no-store" } },
  );
}
