import bcrypt from "bcryptjs";
import { randomBytes, createHash } from "node:crypto";

const ROUNDS = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * 일괄 발급용 임시 비밀번호.
 * 혼동하기 쉬운 글자(0/O, 1/l/I)는 뺀다. 명단을 종이로 나눠주는 상황을 전제한다.
 */
const SAFE = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
export function generateTempPassword(len = 10): string {
  const bytes = randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += SAFE[bytes[i] % SAFE.length];
  return out;
}

/** 재설정 토큰: 원문은 링크에만 담고 DB에는 해시만 저장한다. */
export function createResetToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
