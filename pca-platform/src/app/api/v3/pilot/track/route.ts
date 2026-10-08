import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { attemptOf } from "@/lib/me-v3/runtime/session";
import { isEventKind, participantOf, record } from "@/lib/me-v3/pilot/store";
import { mark, stepForSection } from "@/lib/me-v3/pilot/funnel";

export const dynamic = "force-dynamic";

/**
 * 파일럿 참가자의 결과지 발자국 하나를 받는다.
 *
 * 지키는 것 셋이다.
 *
 *   1. **그 사람의 응시만.** `attemptOf(id, user.id)` 가 남의 번호를
 *      거른다. 주소에 숫자를 바꿔 넣어 남의 자리에 발자국을 남길 수 없다.
 *   2. **참가자만.** 파일럿에 들어오지 않은 사람의 행동은 적지 않는다.
 *      재겠다고 모두를 재면 그것은 파일럿이 아니라 추적이다.
 *   3. **적는 것은 종류와 자리 이름뿐.** 문항 번호도 본문도 받지 않는다.
 *
 * 실패해도 화면은 멈추지 않는다. 결과를 읽는 일이 재는 일보다 앞선다.
 */
export async function POST(req: Request) {
  const no = (status: number) =>
    NextResponse.json({ ok: false }, { status, headers: { "cache-control": "no-store" } });

  let body: { attemptId?: string; kind?: string; refs?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return no(400);
  }
  const { attemptId, kind } = body;
  if (!attemptId || !kind || !isEventKind(kind)) return no(400);
  /* 자리 이름은 짧다. 긴 글이 오면 적을 자리를 잘못 쓴 것이다. 한 번에
     스무 자리까지만 받는다 */
  const refs = (Array.isArray(body.refs) ? body.refs : [])
    .filter((x): x is string => typeof x === "string")
    .map((x) => x.slice(0, 120))
    .slice(0, 20);

  const user = await requireUser();
  const a = await attemptOf(attemptId, user.id);
  if (!a) return no(404);
  const p = await participantOf(user.id);
  if (!p) return NextResponse.json({ ok: true, recorded: 0 },
    { headers: { "cache-control": "no-store" } });

  /* **한 번에 모아서 적는다.** 한 줄씩 보내면 쪽을 한 번 굴리는 동안
     아홉 벌이 줄을 서고, 재는 일이 읽는 일을 느리게 만든다 */
  await record(attemptId, kind, refs);

  /* 같은 발자국이 퍼널의 한 걸음도 된다. **둘을 한 표에 두지 않는다**:
     발자국은 어느 절을 봤는가를 묻고 퍼널은 어느 걸음에서 사람이 줄었는가를
     묻는다. 한 표에 섞으면 줄어든 자리가 조회 수에 묻힌다 */
  const who = {
    userId: user.id, attemptId, participant: p.code, wave: p.wave, tier: a.tier,
  };
  if (kind === "result_open") await mark("result_opened", who);
  if (kind === "action_save") await mark("action_saved", who);
  if (kind === "section_view") {
    for (const step of new Set(refs.map(stepForSection))) {
      if (step) await mark(step, who);
    }
  }

  return NextResponse.json({ ok: true, recorded: refs.length || 1 },
    { headers: { "cache-control": "no-store" } });
}
