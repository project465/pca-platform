"use server";

import { appendFile, mkdir } from "node:fs/promises";
import { z } from "zod";
import { getSite } from "@/content";

export type ContactState = { ok?: boolean; error?: string };

const schema = z.object({
  org: z.string().trim().min(1).max(200),
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(200),
  size: z.string().trim().max(50).optional(),
  message: z.string().trim().max(4000).optional(),
  kind: z.string().trim().max(40).optional(),
});

/**
 * 문의 접수.
 *
 * TODO: 지금은 서버 파일에 줄 단위로 쌓아둘 뿐이다. 운영에 올리기 전에
 * 메일 발송이나 CRM 연동으로 바꿔야 한다. 접수 화면만 먼저 만들어 둔 것은,
 * 영업이 대면으로 이뤄지는 동안에도 들어오는 문의를 놓치지 않기 위해서다.
 */
export async function submitContact(
  _prev: ContactState,
  formData: FormData,
): Promise<ContactState> {
  const site = getSite();

  const parsed = schema.safeParse({
    org: formData.get("org"),
    name: formData.get("name"),
    email: formData.get("email"),
    size: formData.get("size") ?? "",
    message: formData.get("message") ?? "",
    kind: formData.get("kind") ?? "",
  });

  if (!parsed.success) return { error: site.contact.error };

  const row = {
    at: new Date().toISOString(),
    site: site.key,
    ...parsed.data,
  };

  try {
    await mkdir(".inquiries", { recursive: true });
    await appendFile(".inquiries/contact.jsonl", JSON.stringify(row) + "\n", "utf8");
  } catch (e) {
    console.error("[contact] 저장 실패", e);
    return { error: site.contact.error };
  }

  console.info("[contact] 접수", row.site, row.kind, row.org);
  return { ok: true };
}
