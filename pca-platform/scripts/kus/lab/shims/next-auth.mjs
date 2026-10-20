// harness-only stub. **Auth.js 가 아니다.** 세션은 server.mjs 가 꽂는 `__harnessAuth` 가 준다
export default function NextAuth() {
  const no = () => { throw new Error("next-auth unavailable in harness"); };
  const auth = async () => { const f = globalThis.__harnessAuth; return typeof f === "function" ? f() : no(); };
  return { handlers: { GET: no, POST: no }, auth, signIn: no, signOut: no };
}
export class AuthError extends Error { type = "AuthError"; }
export class CredentialsSignin extends AuthError {}
export function Credentials(c) { return c; }
export function Google(c) { return c; } export function Kakao(c) { return c; } export function Naver(c) { return c; }
