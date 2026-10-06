import type { SiteContent } from "@/content";

/**
 * 플랫폼으로 들어가는 주소.
 *
 * 설계 원칙 5 — 소개 사이트는 나라마다 있지만 학생이 검사를 보는 플랫폼은
 * 전 세계 하나다. 그래야 국가 간 비교가 되고, 그게 이 서비스의 자산이다.
 * 그래서 어느 나라 사이트에서 눌러도 같은 곳으로 간다.
 *
 * 개발 중에는 localhost 를 봐야 하므로 환경변수로 덮을 수 있게 둔다.
 */
export function platformUrl(site: SiteContent, path = "/"): string {
  const base = (process.env.NEXT_PUBLIC_PLATFORM_URL || site.platformUrl).replace(/\/$/, "");
  return base + path;
}

/**
 * 언어를 들고 간다. 튀르키예어 사이트에서 누른 사람이 한국어 화면을 만나면
 * 거기서 끝난다. 플랫폼은 ?lang= 을 쿠키로 굳히므로 한 번만 붙이면 된다.
 */
export function platformStart(site: SiteContent, path = "/start"): string {
  // 카자흐어 화면은 플랫폼에 아직 없다. 영어로 보낸다.
  const lang = site.lang === "kk" ? "en" : site.lang;
  return platformUrl(site, `${path}?lang=${encodeURIComponent(lang)}`);
}

/**
 * 앱이 맡은 길은 앱으로 보낸다.
 *
 * **홈페이지와 앱은 하는 일이 다르다.** `careermatri.com` 은 서비스를
 * 설명하고, 가입·로그인·결제·검사·결과는 전부 `app.careermatri.com` 이
 * 한다. 그런데 원고의 단추가 `/pricing` · `/login` 처럼 **상대 주소**로
 * 적혀 있어서 눌리면 홈페이지 안에서 끝났다. 값을 두 곳에 적어 두면
 * 어느 날 갈리고, 갈린 날 사는 쪽은 둘 중 하나를 보고 결제한다.
 *
 * 그래서 **원고를 고치지 않고 읽는 자리에서 돌린다**(`getSite()`).
 * 나라 원고 네 벌에 같은 주소를 네 번 적어 두면 한 벌은 반드시 뒤처진다.
 */
const APP_PATHS = new Set([
  "/pricing", "/login", "/signup", "/product", "/start", "/free", "/support",
]);

/** 앱이 맡은 길이면 플랫폼 주소로, 아니면 그대로 */
export function appHref(site: SiteContent, href: string): string {
  if (!href.startsWith("/")) return href;
  const path = href.split(/[?#]/)[0];
  if (!APP_PATHS.has(path)) return href;
  /* 언어를 들고 간다. 튀르키예어 화면에서 누른 사람이 한국어 가격표를
     만나면 거기서 끝난다 */
  return platformStart(site, href);
}

/**
 * 원고 전체를 훑어 앱이 맡은 주소만 돌린다.
 *
 * **단추마다 고치지 않는다.** 원고를 그리는 자리가 열두 곳이라 거기서
 * 돌리면 한 곳을 빠뜨리고, 빠뜨린 그 단추가 404 로 간다.
 */
export function withAppLinks<T>(site: SiteContent, node: T): T {
  if (typeof node === "string") return node as T;
  if (Array.isArray(node)) return node.map((x) => withAppLinks(site, x)) as T;
  if (node && typeof node === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      out[k] = k === "href" && typeof v === "string" ? appHref(site, v) : withAppLinks(site, v);
    }
    return out as T;
  }
  return node;
}

/**
 * 주소에서 작은 글씨 이름표를 뽑는다 (`/anchor` → `anchor`).
 *
 * **`href.replace("/", "")` 로는 안 된다.** 앞 글자 하나만 떼기 때문에
 * 앱으로 돌린 주소에서는 `https:/app.careermatri.com/pricing?lang=ko` 가
 * 그대로 띠 위에 찍힌다. 이름표 자리에 주소가 보이면 읽는 사람은
 * 고장으로 본다. 마지막 칸만 쓰고 물음표 뒤는 버린다.
 */
export function hrefSlug(href: string): string {
  const path = href.split(/[?#]/)[0].replace(/\/+$/, "");
  return path.split("/").pop() ?? "";
}
