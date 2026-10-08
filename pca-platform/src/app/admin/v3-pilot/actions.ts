"use server";

import { headers } from "next/headers";
import { requireRole } from "@/lib/session";
import { createInvites, inviteLink, WAVES } from "@/lib/me-v3/pilot/enroll";
import { syncFunnel } from "@/lib/me-v3/pilot/sync";

/**
 * 초대 자리를 만든다.
 *
 * **열쇠를 한 번만 돌려준다.** 돌려준 값을 어디에도 적어 두지 않으므로
 * 이 화면을 새로 고치면 사라진다. 다시 보여줄 수 있게 두려면 열쇠를
 * 날것으로 저장해야 하고, 그러면 DB 가 새는 순간 전부가 샌다.
 */
export type InviteState = {
  links?: { code: string; url: string }[];
  error?: "wave" | "count";
};

export async function makeInvites(
  _prev: InviteState, form: FormData,
): Promise<InviteState> {
  await requireRole(["superadmin"]);

  const wave = Number(form.get("wave"));
  if (!(WAVES as readonly number[]).includes(wave)) return { error: "wave" };
  const count = Number(form.get("count"));
  if (!Number.isInteger(count) || count < 1 || count > 20) return { error: "count" };
  const note = String(form.get("note") ?? "").trim().slice(0, 200) || undefined;

  /* 받는 사람이 실제로 누르는 주소여야 한다. 공개 전 배포본에서는
     `PLATFORM_URL` 이 그 자리이고, 없으면 지금 들어온 자리를 쓴다 */
  const h = await headers();
  const base = (process.env.PLATFORM_URL ?? "").trim()
    || `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host") ?? "127.0.0.1:3000"}`;

  const made = await createInvites(wave, count, note);
  return {
    links: made.map((m) => ({ code: m.code, url: inviteLink(base, m.token) })),
  };
}

/**
 * 퍼널의 앞 걸음을 DB 상태에서 메운다.
 *
 * 응시 화면이 동결돼 있어 `assessment_started` 와 `*_completed` 를 그 자리에서
 * 적지 못한다. 둘은 이미 응답과 `submitted_at` 에 적혀 있으므로 여기서 옮긴다.
 * 여러 번 눌러도 같은 자리에 선다.
 */
export async function runSync(): Promise<void> {
  await requireRole(["superadmin"]);
  await syncFunnel();
}
