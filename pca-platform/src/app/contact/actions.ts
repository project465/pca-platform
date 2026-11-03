"use server";

import { redirect } from "next/navigation";
import { submitInquiry } from "@/lib/inquiry";

/**
 * 문의 보내기. **새 외부 서비스를 들이지 않는다**: 받은 문의는 `inquiries` 표에 남고, 담당자 알림은 이미 쓰는
 * 메일 길(`sendStaffAlert`)로 간다(`lib/inquiry.ts`). 동의가 없으면 줄이 서지 않는다
 */
export async function contactAction(form: FormData): Promise<void> {
  const lang = String(form.get("lang") ?? "") === "en" ? "en" : "ko";
  const r = await submitInquiry({
    kind: "contact",
    topic: String(form.get("topic") ?? ""),
    contactName: String(form.get("name") ?? ""),
    email: String(form.get("email") ?? ""),
    message: String(form.get("message") ?? ""),
    lang,
    source: `app:/contact`,
    consent: String(form.get("consent") ?? "") === "1",
    honeypot: String(form.get("website") ?? ""),
    renderedAt: Number(form.get("t") ?? 0) || null,
  });
  const q = new URLSearchParams({ lang, ...(r.ok ? { sent: "1" } : { e: r.why }) });
  redirect(`/contact?${q}`);
}
