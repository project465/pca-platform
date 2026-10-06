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
import { canonicalFor, listSites } from "./sites";
import { appDomain } from "./app-domain";

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
  /* **앱 주소를 읽는 자리가 하나다**(`app-domain.ts`). 런칭 준비 화면도
     같은 함수를 보므로, 화면이 초록인데 메일 링크가 빈 도메인으로 가는
     일이 생기지 않는다 */
  const app = appDomain();
  if (app.ok) return app.url;
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

/**
 * 공식 홈페이지.
 *
 * **앱과 홈페이지는 다른 자리다.** `app.careermatri.com` 은 가입하고
 * 결제하고 응시하는 SaaS 이고, `careermatri.com` 은 서비스를 설명하고
 * 영업하는 홈페이지다. 로그인하지 않은 사람이 머리띠의 로고를 누르면
 * 그쪽으로 돌아간다.
 *
 * **주소를 코드에 적지 않는다.** `site_configs` 에서 읽고, 운영 쪽에서
 * 급히 돌려야 하면 `MARKETING_URL` 로 덮는다.
 *
 * **소유가 확인된 자리만 가리킨다.** 안 산 도메인으로 손님을 보내면
 * 주차 페이지나 남의 사이트에 떨어진다. `careermatri.co.kr` 이 아직
 * 그 상태라, 한국 시장이어도 소유가 확인된 쪽으로 간다.
 *
 * 가리킬 자리가 없으면 `null` 이고, 부르는 쪽이 앱 안의 길로 되돌린다.
 * **지어낸 주소를 내보내지 않는다.**
 */
export async function marketingHome(
  market: "KR" | "GLOBAL" = "KR",
): Promise<string | null> {
  const forced = usable(process.env.MARKETING_URL);
  if (forced) return forced;

  const sites = await listSites().catch(() => []);
  const owned = sites.filter((s) => s.active && s.ownership === "confirmed");
  const pick = owned.find((s) => s.payment_market === market) ?? owned[0];
  if (!pick) return null;
  return usable(pick.canonical_url ?? (pick.domain ? `https://${pick.domain}` : null));
}
