/**
 * 밖으로 나가는 주소.
 *
 * **메일 링크와 결제 콜백은 요청 호스트를 그대로 쓰면 안 된다.** 받는
 * 사람은 다른 날 다른 자리에서 그 링크를 열고, 그때 staging 호스트나
 * `localhost` 가 적혀 있으면 아무 데도 닿지 않는다. 결제 콜백도 같다:
 * 대행사가 되돌려 보내는 주소라 우리 쪽 요청 맥락이 없다.
 *
 * **도메인을 코드에 적지 않는다.** `site_configs.canonical_url` 한
 * 자리에서 읽는다. 도메인을 옮기면 그 표의 한 줄만 바뀐다.
 *
 * 화면 안에서 끝나는 이동(버튼이 다음 쪽으로 보내는 것)은 요청 호스트를
 * 그대로 써도 된다. 그쪽은 **지금 보고 있는 창**에서 끝난다.
 */
import { canonicalFor } from "./sites";

/** 비었거나 localhost·staging 이면 믿지 않는다 */
function usable(url: string | null | undefined): string | null {
  const u = (url ?? "").trim().replace(/\/$/, "");
  if (!u) return null;
  if (/localhost|127\.0\.0\.1|staging|\.local(?::|$)/i.test(u)) return null;
  return u;
}

/**
 * 이 시장의 공개 주소.
 *
 * 순서가 있다: 사이트 설정의 정규 주소 → `PLATFORM_URL` → 비어 있음.
 * **비어 있으면 비어 있다고 돌려준다**: 지어낸 주소를 메일에 넣느니
 * 링크 없는 메일이 낫고, 비어 있는 것은 `launch:check` 가 막는다.
 */
export async function publicBase(market: "KR" | "GLOBAL" = "KR"): Promise<string | null> {
  /**
   * **플랫폼 주소가 먼저다.**
   *
   * 여기서 돌려주는 값이 가는 자리는 셋이다: 메일 링크 · 결제 콜백 ·
   * 결과지 주소. 셋 다 **플랫폼이 떠 있는 자리로 돌아와야 한다.**
   *
   * `site_configs` 의 정규 주소는 소개 사이트가 서는 자리
   * (`careermatri.co.kr` · `careermatri.com`)다. 플랫폼은 그 옆
   * (`app.careermatri.com`)에 따로 서므로, 정규 주소를 먼저 보면 결제를
   * 끝낸 사람이 **소개 사이트로 떨어진다.** 공개 전에는 아예 빈
   * 도메인으로 떨어졌고, 실제로 가짜 결제가 그렇게 끊겼다.
   *
   * `PLATFORM_URL` 이 비어 있을 때만 시장의 정규 주소로 되돌아간다.
   * 소개 사이트와 플랫폼이 한 주소에 있던 때의 설정을 위해 남겨 둔다.
   */
  const platform = usable(process.env.PLATFORM_URL);
  if (platform) return platform;
  return usable(await canonicalFor(market).catch(() => null));
}

/**
 * 받는 사람의 언어로 시장을 고른다.
 *
 * 메일 줄에는 시장이 없고 언어만 있다. 영어로 결제한 사람에게 한국
 * 주소를 보내면 그 사람은 원화 가격표를 만난다.
 */
export async function publicBaseForLocale(locale: string | null): Promise<string | null> {
  return publicBase(locale === "en" ? "GLOBAL" : "KR");
}

/** 개발에서만 쓰는 되돌림. 운영에서는 정규 주소가 늘 있어야 한다 */
export function devFallback(origin: string): string {
  return origin.replace(/\/$/, "");
}
