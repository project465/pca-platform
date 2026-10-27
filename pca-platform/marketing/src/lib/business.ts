import { PLATFORM_URL } from "./domains";

/**
 * 사업자 표시 가운데 **앱의 운영 화면이 정본인 칸**을 읽어 온다.
 *
 * 통신판매업 신고번호는 `/admin/business` 에서 채우고, 이 사이트는 앱의
 * 표를 못 본다. 번호를 원고에 적어 두면 바뀐 날 고칠 자리가 둘이 되고
 * `launch:check` 도 그것을 막는다. 그래서 앱이 내주는 공개 표시를 읽는다.
 *
 * **못 읽으면 원고 값으로 둔다.** 빌드하는 자리에서 앱에 닿지 않거나 앱이
 * 잠깐 느린 날, 꼬리말 때문에 쪽 전체가 서지 않으면 안 된다. 그때는 원고의
 * 빈칸이 그대로 `확인 필요` 로 찍힌다.
 */
export async function liveMailOrderNo(): Promise<string> {
  if (process.env.STATIC === "1") return "";
  const base = (process.env.NEXT_PUBLIC_PLATFORM_URL || PLATFORM_URL).replace(/\/$/, "");
  try {
    const res = await fetch(`${base}/api/public/business`, {
      next: { revalidate: 600 },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return "";
    const j = (await res.json()) as { mailorder?: unknown };
    return typeof j.mailorder === "string" ? j.mailorder.trim() : "";
  } catch {
    return "";
  }
}
