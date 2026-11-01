import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { attemptOf, saveAnswer, saveNote, savePicks } from "@/lib/me-v3/runtime/session";
import type { Answer } from "@/lib/me-v3/scoring/types";

export const dynamic = "force-dynamic";

/**
 * 검사 화면의 저장(2026-11-01 대표 지시 "페이지 전환이 느린 이유 찾아서 고쳐").
 *
 * **서버 액션으로 보내지 않는 까닭.** 앱 라우터는 서버 액션과 화면 이동을 한 줄로 세워
 * 하나씩 처리한다. 보기를 고를 때마다 나가던 저장(약 200ms)이 그 줄에 서서, 답 넷이면
 * 800ms 뒤에야 `다음` 의 화면 요청이 출발했다. 이 길은 그 줄 밖이라 저장과 이동이 함께
 * 간다. 화면은 저장끼리만 차례를 지키고(같은 문항을 두 번 고르면 늦은 쪽이 남게),
 * 그 사이에 쌓인 답은 **한 번에 묶어** 보낸다.
 *
 * 지키는 것은 서버 액션 때와 같다.
 *   1. **그 사람의 응시만.** `attemptOf(id, user.id)` 가 남의 번호를 거른다
 *   2. **끝난 응시에는 쓰지 않는다.** 저장 함수가 다시 본다(`writable`)
 *   3. **다른 사이트가 보낸 요청을 받지 않는다.** JSON 이고 같은 출처일 때만 받는다
 *      (서버 액션은 출처를 스스로 보는데 이 길은 직접 본다)
 */
type Op =
  | { op: "answer"; itemId: string; answer: Answer }
  | { op: "note"; itemId: string; text: string }
  | { op: "picks"; domain: string; slot: string; items: string[] };

const str = (x: unknown, n = 120): x is string => typeof x === "string" && x.length > 0 && x.length <= n;

function answerOf(x: unknown): Answer | null {
  if (!x || typeof x !== "object") return null;
  const a = x as Record<string, unknown>;
  const int = (v: unknown, lo: number, hi: number) =>
    typeof v === "number" && Number.isInteger(v) && v >= lo && v <= hi;
  if (a.kind === "level" && int(a.index, 0, 3)) return { kind: "level", index: a.index as number };
  if (a.kind === "scale5" && int(a.value, 0, 5)) return { kind: "scale5", value: a.value as number };
  if (a.kind === "exposure" && int(a.value, 0, 5)) return { kind: "exposure", value: a.value as number };
  if (a.kind === "choice" && str(a.value, 80)) return { kind: "choice", value: a.value as string };
  return null;
}

function opOf(x: unknown): Op | null {
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, unknown>;
  if (o.op === "answer" && str(o.itemId)) {
    const answer = answerOf(o.answer);
    return answer ? { op: "answer", itemId: o.itemId as string, answer } : null;
  }
  if (o.op === "note" && str(o.itemId) && typeof o.text === "string" && o.text.length <= 400) {
    return { op: "note", itemId: o.itemId as string, text: o.text };
  }
  if (o.op === "picks" && str(o.domain, 40) && str(o.slot, 40) && Array.isArray(o.items)
    && o.items.length <= 40 && o.items.every((i) => str(i))) {
    return { op: "picks", domain: o.domain as string, slot: o.slot as string, items: o.items as string[] };
  }
  return null;
}

function sameOrigin(req: Request): boolean {
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return false;
  const origin = req.headers.get("origin");
  if (!origin) return site === "same-origin";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try { return Boolean(host) && new URL(origin).host === host; } catch { return false; }
}

export async function POST(req: Request) {
  const reply = (ok: boolean, status = 200) =>
    NextResponse.json({ ok }, { status, headers: { "cache-control": "no-store" } });

  if (!(req.headers.get("content-type") ?? "").includes("application/json")) return reply(false, 415);
  if (!sameOrigin(req)) return reply(false, 403);

  let body: { attemptId?: unknown; ops?: unknown };
  try { body = (await req.json()) as typeof body; } catch { return reply(false, 400); }
  if (!str(body.attemptId, 40) || !Array.isArray(body.ops) || !body.ops.length || body.ops.length > 60) {
    return reply(false, 400);
  }
  const ops = body.ops.map(opOf);
  if (ops.some((o) => o === null)) return reply(false, 400);

  const user = await requireUser();
  const a = await attemptOf(body.attemptId as string, user.id);
  if (!a || a.status !== "in_progress") return reply(false);

  /* 보낸 차례대로 쓴다. 하나라도 물러나면(제출이 끼었으면) 거짓을 돌려준다 */
  for (const o of ops as Op[]) {
    const ok = o.op === "answer" ? await saveAnswer(a.id, o.itemId, o.answer)
      : o.op === "note" ? await saveNote(a.id, o.itemId, o.text)
        : await savePicks(a.id, o.domain, o.slot, o.items);
    if (!ok) return reply(false);
  }
  return reply(true);
}
