/**
 * Google · Apple 공급자.
 *
 * **새 인증 시스템을 하나 더 만들지 않는다.** 이 저장소는 전부터
 * NextAuth(Auth.js) v5 를 쓰고 있고, 늘어나는 것은 그 안의 공급자
 * 둘뿐이다. 세션도 쿠키도 콜백도 그대로다.
 *
 * **값이 안 꽂혀 있으면 단추를 띄우지 않는다.** 꽂히지 않은 공급자를
 * 화면에 세우면 누른 사람이 공급자 쪽 오류 화면에서 끝난다. 켜졌는지는
 * `enabledProviders()` 하나가 답하고 로그인 화면이 그것을 읽는다.
 *
 * **열쇠를 저장소에 적지 않는다.** 여기 있는 것은 **환경변수 이름**뿐이고
 * 값은 운영에서 꽂는다. 이름은 `.env.example` 에도 적어 둔다.
 *
 * ## 물어보는 범위
 *
 * 로그인에 필요한 최소만 받는다. 구글은 `openid email profile`, 애플은
 * `name email` 이다. **드라이브도 달력도 연락처도 요구하지 않는다**:
 * 안 받은 것은 샐 수 없고, 동의 화면에 줄이 하나 더 뜨면 거기서 닫는
 * 사람이 생긴다.
 *
 * ## 애플의 가려 준 주소
 *
 * 애플은 사람이 고르면 `...@privaterelay.appleid.com` 을 준다. 그것은
 * 기존 이메일 계정과 **다른 주소**이고, 그래서 같은 사람이어도 자동으로
 * 합쳐지지 않는다. 합치는 길은 로그인한 뒤 계정 화면에서 연결하는
 * 것뿐이다(`auth-accounts.ts` 의 규칙 ②).
 */
import Google from "next-auth/providers/google";
import Apple from "next-auth/providers/apple";
import type { Provider as AuthProvider } from "next-auth/providers";
import type { Provider } from "@/lib/auth-accounts";

const env = (k: string): string => (process.env[k] ?? "").trim();

/** 꽂혀 있는 공급자. 화면이 이것만 세운다 */
export function enabledProviders(): Provider[] {
  const out: Provider[] = [];
  if (env("AUTH_GOOGLE_ID") && env("AUTH_GOOGLE_SECRET")) out.push("google");
  /* 애플은 값이 넷이다. 하나라도 비면 켜지 않는다 */
  if (env("AUTH_APPLE_ID") && env("AUTH_APPLE_SECRET")) out.push("apple");
  return out;
}

/**
 * NextAuth 에 넘길 공급자 목록.
 *
 * **켜지지 않은 것은 등록하지 않는다.** 등록해 두면 `/api/auth/signin/
 * google` 이 열려 있고, 누른 사람이 공급자 쪽에서 `invalid_client` 를
 * 받는다. 우리 화면에 단추가 없어도 주소는 열려 있다.
 */
export function oauthProviders(): AuthProvider[] {
  const on = enabledProviders();
  const out: AuthProvider[] = [];
  if (on.includes("google")) {
    out.push(Google({
      clientId: env("AUTH_GOOGLE_ID"),
      clientSecret: env("AUTH_GOOGLE_SECRET"),
      authorization: {
        params: {
          /* 최소만 받는다. `prompt=select_account` 는 기기를 같이 쓰는
             사람이 남의 계정으로 들어가는 것을 줄인다 */
          scope: "openid email profile",
          prompt: "select_account",
        },
      },
    }));
  }
  if (on.includes("apple")) {
    out.push(Apple({
      clientId: env("AUTH_APPLE_ID"),
      clientSecret: env("AUTH_APPLE_SECRET"),
    }));
  }
  return out;
}

/**
 * 공급자가 준 것에서 **우리가 쓰는 넷만** 꺼낸다.
 *
 * `sub` 과 이메일과 그 이메일이 확인됐는지와 이름이다. 나머지는 쓰지
 * 않으므로 꺼내지도 않는다.
 *
 * **`email_verified` 를 공급자마다 다르게 읽는다.** 구글은 boolean 이고
 * 애플은 `"true"` 라는 글자로 줄 때가 있다. 글자 `"true"` 를 boolean 으로
 * 보면 `Boolean("false")` 가 `true` 가 되므로 그 모양으로 읽지 않는다.
 */
export function identityFrom(
  provider: Provider,
  profile: Record<string, unknown> | undefined,
  account: { providerAccountId?: string | null } | null | undefined,
): { provider: Provider; subject: string; email: string | null;
     emailVerified: boolean; name: string | null } | null {
  const sub = String(profile?.sub ?? account?.providerAccountId ?? "").trim();
  if (!sub) return null;

  const rawEmail = profile?.email;
  const email = typeof rawEmail === "string" && rawEmail.includes("@")
    ? rawEmail.trim().toLowerCase() : null;

  const v = profile?.email_verified;
  const emailVerified = v === true || v === "true";

  const rawName = profile?.name;
  const given = profile?.given_name;
  const name = typeof rawName === "string" && rawName.trim() ? rawName.trim()
    : typeof given === "string" && given.trim() ? given.trim() : null;

  return { provider, subject: sub, email, emailVerified, name };
}

/**
 * 애플이 **가려 준 주소**인가.
 *
 * 화면이 이 사실을 적는다. 적지 않으면 받은 사람이 모르는 주소를 보고
 * 자기 계정이 아니라고 생각한다.
 */
export function isPrivateRelay(email: string | null): boolean {
  return !!email && email.endsWith("@privaterelay.appleid.com");
}
