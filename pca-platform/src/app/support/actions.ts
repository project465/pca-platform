"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { sendVerification } from "@/lib/verify-email";
import { isReason, requestRefund, withdraw } from "@/lib/refund-requests";

export type SupportState = {
  verify?: "sent" | "mail_off" | "no_email" | "already";
  refund?: "sent" | "denied" | "already_open" | "error";
  deny?: string;
};

async function origin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto")
    ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

/** 확인 메일을 다시 보낸다 */
export async function resendVerifyAction(): Promise<SupportState> {
  const user = await requireUser();
  const r = await sendVerification(user.id, await origin());
  revalidatePath("/support");
  if (r.ok) return { verify: "sent" };
  return { verify: r.reason ?? "mail_off" };
}

/**
 * 환불을 요청한다.
 *
 * **거절될 요청도 접수한다.** 규칙으로 안 되는 경우에 단추를 숨기면 그
 * 사람은 메일로 같은 것을 묻고, 그 메일에는 번호가 없다. 접수하고 그
 * 자리에서 판정을 보여 주는 쪽이 낫다.
 */
export async function refundAction(
  _prev: SupportState,
  form: FormData,
): Promise<SupportState> {
  const user = await requireUser();
  const orderNo = String(form.get("order") ?? "").trim();
  const reason = String(form.get("reason") ?? "");
  if (!orderNo || !isReason(reason)) return { refund: "error" };

  const r = await requestRefund({ orderNo, userId: user.id, reason });
  revalidatePath("/support");
  if (!r.ok) {
    return r.reason === "already_open"
      ? { refund: "already_open" }
      : { refund: "error" };
  }
  return r.verdict.ok
    ? { refund: "sent" }
    : { refund: "denied", deny: r.verdict.deny };
}

export async function withdrawAction(form: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(form.get("request") ?? "");
  if (id) await withdraw(id, user.id);
  revalidatePath("/support");
}
