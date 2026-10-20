/**
 * 검사용 `bcryptjs` 대체. **제품에 들어가지 않는다**(로더가 `SC_SHIMS=1`
 * 일 때만 돌린다).
 *
 * 재현 검사가 묻는 것은 `어느 열쇠가 어느 계정을 여는가` 이고 bcrypt 의
 * 비용은 그 질문과 무관하다. 그래서 같은 꼴(`hash` · `compare`)만 지키는
 * sha256 판을 쓴다. 소금(salt)을 넣어 같은 평문이 같은 해시가 되지 않게
 * 한다: 그래야 `해시가 바뀌었다` 가 `열쇠가 바뀌었다` 를 뜻한다.
 */
import { createHash, randomBytes } from "node:crypto";

function digest(salt, plain) {
  return createHash("sha256").update(`${salt}:${plain}`).digest("hex");
}

async function hash(plain) {
  const salt = randomBytes(8).toString("hex");
  return `$shim$${salt}$${digest(salt, String(plain))}`;
}

async function compare(plain, h) {
  const m = /^\$shim\$([0-9a-f]+)\$([0-9a-f]+)$/.exec(String(h ?? ""));
  if (!m) return false;
  return digest(m[1], String(plain)) === m[2];
}

export default { hash, compare };
export { hash, compare };
