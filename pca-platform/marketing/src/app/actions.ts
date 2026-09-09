"use server";

import { appendFile, mkdir } from "node:fs/promises";
import { z } from "zod";
import { getSite } from "@/content";

export type ContactState = { ok?: boolean; error?: string; refCode?: string };

const schema = z.object({
  org: z.string().trim().min(1).max(200),
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(200),
  size: z.string().trim().max(50).optional(),
  message: z.string().trim().max(4000).optional(),
  kind: z.string().trim().max(40).optional(),
  plan: z.string().trim().max(40).optional(),
  dept: z.string().trim().max(200).optional(),
  phone: z.string().trim().max(50).optional(),
});

/**
 * 소개 사이트에서 보내는 나라 코드.
 *
 * 이건 "어느 나라 사이트에서 들어왔는가" 일 뿐이고, 기관에 실제로 박히는
 * 국가는 운영자가 승인할 때 고른다. 글로벌판은 나라가 하나로 정해지지
 * 않으므로 XX 로 보낸다.
 */
const SITE_COUNTRY: Record<string, string> = {
  kr: "KR",
  kz: "KZ",
  tr: "TR",
  global: "XX",
};

/** 인원 칸은 "30~50명" 처럼 적히기도 한다. 숫자가 보이면 그것만 뽑는다 */
function parseSize(raw?: string): number | undefined {
  if (!raw) return undefined;
  const m = raw.match(/\d[\d,]*/);
  if (!m) return undefined;
  const n = Number(m[0].replace(/,/g, ""));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/**
 * 도입 신청 접수.
 *
 * 소개 사이트는 플랫폼과 별개 앱이라 DB 를 갖고 있지 않다(설계 원칙 5).
 * 그래서 폼을 서버에서 플랫폼의 접수 엔드포인트로 넘긴다. 브라우저가 직접
 * 부르지 않으므로 CORS 를 열 필요가 없고, 신청자 화면에 플랫폼 주소가
 * 드러나지도 않는다.
 *
 * 플랫폼이 응답하지 않아도 신청을 잃지 않도록 파일에도 남긴다. 영업이
 * 대면으로 이뤄지는 동안 들어온 문의를 놓치지 않으려는 기존 장치를 그대로
 * 둔 것이다.
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
    plan: formData.get("plan") ?? "",
    dept: formData.get("dept") ?? "",
    phone: formData.get("phone") ?? "",
  });

  if (!parsed.success) return { error: site.contact.error };
  const d = parsed.data;

  const row = { at: new Date().toISOString(), site: site.key, ...d };
  try {
    await mkdir(".inquiries", { recursive: true });
    await appendFile(".inquiries/contact.jsonl", JSON.stringify(row) + "\n", "utf8");
  } catch (e) {
    console.error("[contact] 파일 저장 실패", e);
  }

  const endpoint = process.env.PLATFORM_INTAKE_URL;
  const secret = process.env.INTAKE_SECRET;
  if (!endpoint || !secret) {
    // 아직 플랫폼과 연결되지 않은 배포. 파일에는 남았으므로 접수로 본다.
    console.warn("[contact] PLATFORM_INTAKE_URL/INTAKE_SECRET 이 없어 파일에만 남깁니다");
    return { ok: true };
  }

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", "x-intake-secret": secret },
      body: JSON.stringify({
        site: site.key,
        country: SITE_COUNTRY[site.key] ?? "XX",
        orgName: d.org,
        deptName: d.dept || undefined,
        contactName: d.name,
        contactEmail: d.email,
        contactPhone: d.phone || undefined,
        expectedSize: parseSize(d.size),
        plan: d.plan || undefined,
        message: d.message || undefined,
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      console.error("[contact] 플랫폼 접수 실패", res.status, await res.text().catch(() => ""));
      // 파일에는 남아 있으므로 신청자에게는 접수된 것으로 보인다.
      return { ok: true };
    }

    const body = (await res.json()) as { refCode?: string };
    console.info("[contact] 접수", body.refCode, site.key, d.org);
    return { ok: true, refCode: body.refCode };
  } catch (e) {
    console.error("[contact] 플랫폼 접수 오류", e);
    return { ok: true };
  }
}
