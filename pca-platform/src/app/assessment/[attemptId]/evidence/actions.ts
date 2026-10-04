"use server";

import { requireUser } from "@/lib/session";
import { attemptOf } from "@/lib/me-v2/attempt";
import { saveProfile, type EvidencePayload } from "@/lib/me-v2/evidence";

/**
 * 적어 주신 경험을 저장한다.
 *
 * **응시 주인인지 서버가 다시 본다.** 화면이 보낸 응시 번호를 믿지 않는다:
 * 남의 번호를 넣어도 그 사람의 경험이 아니라 **보낸 사람 자신의** 경험에
 * 저장되므로 남의 것을 덮을 수 없고, 응시가 남의 것이면 그 자리에서 끊는다.
 *
 * **경험이 적합도를 흔들지 않는다.** 여기서 하는 일은 저장뿐이고 점수를
 * 다시 계산하지 않는다. 다시 그리는 것은 결과지이고, 그것도 사람이 누를 때다.
 */
export async function saveEvidenceAction(
  attemptId: string,
  payload: { evidence: unknown; research: unknown; target: unknown },
): Promise<{ ok: boolean; version?: number }> {
  const user = await requireUser();
  const a = await attemptOf(attemptId, user.id);
  if (!a) return { ok: false };

  const p: EvidencePayload = {
    evidence: (payload.evidence ?? {}) as Record<string, unknown>,
    research: Array.isArray(payload.research) ? payload.research : [],
    target: (payload.target ?? {}) as Record<string, unknown>,
  };
  const r = await saveProfile(user.id, p).catch(() => null);
  return r ? { ok: true, version: r.version } : { ok: false };
}
