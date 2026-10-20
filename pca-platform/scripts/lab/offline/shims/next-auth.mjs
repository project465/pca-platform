// harness-only stub. **Auth.js 가 아니다.** 하네스 HTTP 서버(scripts/lab/offline/route-http.ts)가
// 요청마다 `globalThis.__harnessAuth` 를 꽂으면 그 세션을 돌려주고, 아니면 전처럼 던진다.
// 여기서 통과한 것을 실제 로그인·쿠키·미들웨어 검증으로 적지 않는다.
export default function NextAuth() {
  const no = () => { throw new Error("next-auth unavailable in harness"); };
  const auth = async () => { const f = globalThis.__harnessAuth; if (typeof f === "function") return f(); return no(); };
  return { handlers: {}, auth, signIn: no, signOut: no };
}
export const CredentialsSignin = class extends Error {};
export function Credentials(c) { return c; }
