/**
 * **이미 로그인한 사람이** 로그인 방법을 하나 더 붙일 때.
 *
 * 평소 소셜 로그인은 "이 사람이 누구인가" 를 묻지만, 계정 화면에서 누른
 * 연결은 다른 질문이다: "**지금 이 사람에게** 이 공급자를 붙여라". 공급자
 * 쪽에서 돌아오는 요청에는 그 뜻이 실려 있지 않아서, 나갈 때 한 줄
 * 적어 두고 돌아올 때 읽는다.
 *
 * **쿠키를 봉한다.** 값이 사용자 번호라 날것으로 두면 고쳐 쓰는 순간
 * 남의 계정에 제 구글을 붙일 수 있다. `AUTH_SECRET` 으로 봉하므로 고친
 * 쿠키는 열리지 않는다.
 *
 * **공급자 이름까지 봉투 안에 넣는다.** 구글을 붙이려고 받은 봉투가
 * 애플 콜백에서 쓰이지 않게 한다.
 *
 * **십 분이면 끝난다.** 연결 한 번에 그보다 오래 걸릴 일이 없고, 오래
 * 사는 봉투는 흘렸을 때만 쓸모가 있다.
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import type { Provider } from "@/lib/auth-accounts";
import { isProvider } from "@/lib/auth-accounts";

export const LINK_COOKIE = "cm_link";
const TTL_MS = 10 * 60 * 1000;

function key(): Buffer {
  const secret = process.env.AUTH_SECRET ?? "";
  if (!secret) throw new Error("AUTH_SECRET 이 없습니다");
  /* 같은 비밀을 두 용도로 쓰는 것을 줄인다. 봉투마다 다른 열쇠다 */
  return createHash("sha256").update(`cm-oauth-link:${secret}`).digest();
}

type Intent = { userId: string; provider: Provider; iat: number };

export function sealIntent(userId: string, provider: Provider): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([
    c.update(JSON.stringify({ userId, provider, iat: Date.now() }), "utf8"),
    c.final(),
  ]);
  return Buffer.concat([iv, c.getAuthTag(), body]).toString("base64url");
}

/** 열어 본다. 공급자가 다르거나 시간이 지났으면 `null` 이다 */
export function openIntent(value: string | undefined, provider: Provider): Intent | null {
  if (!value) return null;
  try {
    const raw = Buffer.from(value, "base64url");
    if (raw.length < 29) return null;
    const d = createDecipheriv("aes-256-gcm", key(), raw.subarray(0, 12));
    d.setAuthTag(raw.subarray(12, 28));
    const json = Buffer.concat([d.update(raw.subarray(28)), d.final()]).toString("utf8");
    const i = JSON.parse(json) as Intent;
    if (!i?.userId || !isProvider(i.provider)) return null;
    if (i.provider !== provider) return null;
    if (typeof i.iat !== "number" || Date.now() - i.iat > TTL_MS) return null;
    return i;
  } catch {
    return null;
  }
}
