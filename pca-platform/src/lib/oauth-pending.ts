/**
 * 아직 계정이 없는 소셜 신원을 **동의 화면까지 들고 가는 봉투.**
 *
 * 처음 구글로 들어온 사람은 계정이 없다. 그 자리에서 바로 만들면 **동의
 * 없는 계정**이 생긴다(가입 화면은 필수 동의를 받고, 빠지면 가입을
 * 통째로 되돌린다). 그래서 만들기 전에 동의 화면을 한 번 거치는데, 그
 * 사이에 신원을 어딘가 들고 있어야 한다.
 *
 * **주소에 이름과 메일을 날것으로 싣지 않는다.** 주소는 기록에 남고
 * 어깨 너머로 보이고 공유된다. 그래서 봉투를 **봉한다**: AES-256-GCM 으로
 * 싸서 주소에는 알아볼 수 없는 글자만 간다.
 *
 * **표를 새로 만들지 않는다.** 십 분짜리 값 하나를 담자고 표를 만들면
 * 그 표를 비우는 일이 또 생긴다. 열쇠는 `AUTH_SECRET` 에서 뽑고, 그
 * 값은 이미 세션 쿠키를 봉하는 데 쓰고 있다.
 *
 * **한 번만 쓰이는 것을 코드가 보장하지는 않는다.** 그래도 이 봉투로 할
 * 수 있는 일은 계정 하나를 만드는 것뿐이고, `(provider, sub)` 에 유일
 * 제약이 걸려 있어 두 번째는 DB 가 거절한다.
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import type { ProviderIdentity } from "@/lib/auth-accounts";
import { isProvider } from "@/lib/auth-accounts";

/** 십 분. 동의문을 읽기에 넉넉하고, 흘린 주소가 오래 살지 않는다 */
const TTL_MS = 10 * 60 * 1000;

function key(): Buffer {
  const secret = process.env.AUTH_SECRET ?? "";
  if (!secret) throw new Error("AUTH_SECRET 이 없습니다");
  /* **값을 그대로 열쇠로 쓰지 않는다.** 길이가 맞지 않고, 같은 값을 두
     가지 용도로 쓰는 것을 줄이려고 한 번 더 돌린다 */
  return createHash("sha256").update(`cm-oauth-pending:${secret}`).digest();
}

export type Pending = ProviderIdentity & { iat: number };

export function seal(id: ProviderIdentity): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([
    c.update(JSON.stringify({ ...id, iat: Date.now() }), "utf8"),
    c.final(),
  ]);
  return Buffer.concat([iv, c.getAuthTag(), body]).toString("base64url");
}

/** 열어 본다. 봉투가 상했거나 시간이 지났으면 `null` 이다 */
export function open(token: string): Pending | null {
  try {
    const raw = Buffer.from(token, "base64url");
    if (raw.length < 29) return null;
    const d = createDecipheriv("aes-256-gcm", key(), raw.subarray(0, 12));
    d.setAuthTag(raw.subarray(12, 28));
    const json = Buffer.concat([d.update(raw.subarray(28)), d.final()]).toString("utf8");
    const p = JSON.parse(json) as Pending;
    if (!p || typeof p.iat !== "number" || Date.now() - p.iat > TTL_MS) return null;
    if (!isProvider(p.provider) || !p.subject) return null;
    return p;
  } catch {
    /* 봉투가 상한 것과 시간이 지난 것을 화면에서 가르지 않는다. 둘 다
       "다시 눌러 주세요" 이고, 가르면 공격하는 쪽에만 쓸모가 있다 */
    return null;
  }
}
