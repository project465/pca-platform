import type { SiteContent } from "@/content";
import { intakeUrl } from "@/lib/platform";

/**
 * 도입 문의 보내기.
 *
 * **브라우저에서 직접 보낸다.** 소개 사이트는 정적으로 나가므로(Firebase
 * Hosting) 서버가 없다. 서버 액션이 있던 자리다.
 *
 * 그래서 비밀 헤더를 쓰지 않는다 — 브라우저에 넣은 값은 비밀이 아니다.
 * 접수 창구가 Origin 허용 목록과 속도 제한, 허니팟으로 막는다 (R036).
 *
 * 지켜야 할 것 하나: **보내지 못했으면 보냈다고 하지 않는다.** 접수됐다고
 * 해 놓고 아무 데도 남지 않으면 학과 담당자는 회신을 기다리고 우리는 받은
 * 적이 없다. 이 사이트에서 가장 나쁜 고장이다.
 */
export type ContactState = { ok?: boolean; error?: string; refCode?: string };

/** 어느 나라 사이트에서 들어왔는가. 기관의 실제 국가는 승인할 때 고른다 */
const SITE_COUNTRY: Record<string, string> = {
  kr: "KR",
  kz: "KZ",
  tr: "TR",
  global: "XX",
};

/** 인원 칸은 "30~50명" 처럼 적히기도 한다. 숫자가 보이면 그것만 뽑는다 */
function parseSize(raw: string): number | undefined {
  const m = raw.match(/\d[\d,]*/);
  if (!m) return undefined;
  const n = Number(m[0].replace(/,/g, ""));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

export async function submitContact(
  site: SiteContent,
  fd: FormData,
): Promise<ContactState> {
  /* 허니팟. 사람에게는 보이지 않는 칸이라 채워져 있으면 사람이 아니다.
     오류를 돌려주면 상대가 규칙을 알아내므로 조용히 삼킨다 */
  if (str(fd, "website")) return { ok: true };

  const org = str(fd, "org");
  const name = str(fd, "name");
  const email = str(fd, "email");
  if (!org || !name || !email) return { error: site.contact.error };

  const body = {
    site: site.key,
    country: SITE_COUNTRY[site.key] ?? "XX",
    orgName: org,
    deptName: str(fd, "dept") || undefined,
    contactName: name,
    contactEmail: email,
    contactPhone: str(fd, "phone") || undefined,
    expectedSize: parseSize(str(fd, "size")),
    plan: str(fd, "plan") || undefined,
    message: str(fd, "message") || undefined,
  };

  try {
    const res = await fetch(intakeUrl(site), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });

    /* 창구가 거절하면 거절이다. ok:false 를 성공으로 보이지 않게 한다 */
    if (!res.ok) return { error: site.contact.unavailable };

    const data = (await res.json().catch(() => null)) as
      | { ok?: boolean; refCode?: string }
      | null;
    if (!data?.ok) return { error: site.contact.unavailable };

    return { ok: true, refCode: data.refCode };
  } catch {
    /* 망이 끊겼거나 창구가 죽었다. 어느 쪽이든 남은 것이 없다 */
    return { error: site.contact.unavailable };
  }
}
