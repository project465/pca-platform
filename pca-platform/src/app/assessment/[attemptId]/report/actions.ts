"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { generateReport } from "@/lib/me-v2/render";

async function origin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto")
    ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * 결과지 한 판본을 만든다.
 *
 * **같은 응시로 눌러도 앞의 것을 고치지 않는다.** 줄이 쌓이고 가장 최근
 * 것이 지금 보는 것이다. 경험을 적고 다시 눌렀을 때 전의 결과지가 바뀌면
 * "어제 본 것과 다르다" 는 문의에 답할 수 없다.
 *
 * **등급과 응답은 화면에서 오지 않는다.** 응시 번호 하나만 받고 나머지는
 * 서버가 표에서 다시 읽는다.
 */
export async function generateAction(
  attemptId: string,
): Promise<{ ok: boolean; reason?: string; traceId?: string }> {
  const user = await requireUser();
  const r = await generateReport({
    attemptId, userId: user.id, baseUrl: await origin(),
  });
  if (!r.ok) return { ok: false, reason: r.reason, traceId: r.traceId };
  revalidatePath(`/assessment/${attemptId}/report`);
  revalidatePath("/my");
  return { ok: true, traceId: r.traceId };
}
