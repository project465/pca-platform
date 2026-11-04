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

/**
 * **첫 비밀번호는 하이픈을 넣어 적어도 받는다**(2026-11-04 테스트 방: 진흥원 참여자의 첫 비밀번호는 휴대전화 번호
 * 숫자만인데, 안내문을 보고 `010-1234-5678` 로 적을 수 있다). **아직 비밀번호를 바꾸지 않은 계정만**(`must_reset_pw`)
 * 이고, 하이픈 · 띄어쓰기를 걷은 값이 숫자 4~13자리일 때만 한 번 더 맞춰 본다. 바꾼 뒤의 비밀번호는 적은 그대로만 맞는다
 */
export async function verifyLoginPassword(password: string, hash: string, mustReset: boolean): Promise<boolean> {
  if (await verifyPassword(password, hash)) return true;
  if (!mustReset) return false;
  const digits = password.replace(/[\s-]/g, "");
  if (digits === password || !/^\d{4,13}$/.test(digits)) return false;
  return verifyPassword(digits, hash);
}
