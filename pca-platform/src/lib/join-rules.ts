/**
 * 전용 링크에 거는 등록 조건.
 *
 * 링크는 주소를 아는 사람이면 누구나 열 수 있다. 학교 홈페이지처럼 공개된
 * 곳에 걸면 더욱 그렇다. 응시권 수가 상한이라 계약분을 넘지는 않지만,
 * 엉뚱한 사람이 자리를 차지하는 것은 막고 싶을 수 있다.
 *
 * 담당자에게 정규식을 직접 쓰게 하지 않는다. 잘못 쓰면 아무도 못 들어오고,
 * 어떤 식은 검사에 아주 오래 걸려 서버를 묶는다. 대신 글자 하나가 무엇을
 * 뜻하는지만 정한 마스크를 받는다.
 */

/** 마스크 한 글자의 뜻 */
export const MASK_HELP = "9 는 숫자, A 는 영문, * 는 숫자나 영문 하나입니다. 나머지 글자는 그대로 있어야 합니다.";

/** 마스크에 쓸 수 있는 글자. 이 밖은 받지 않는다 */
const MASK_ALLOWED = /^[0-9A-Za-z*\-_]{1,40}$/;

export function isValidMask(mask: string): boolean {
  return MASK_ALLOWED.test(mask);
}

/**
 * 마스크를 정규식으로 옮긴다.
 *
 * 되풀이가 없는 형태로만 만들기 때문에 입력 길이에 비례한 시간만 쓴다 —
 * 사용자가 준 문자열이 검사에 오래 걸리는 일이 생기지 않는다.
 */
export function maskToRegex(mask: string): RegExp {
  let out = "";
  for (const ch of mask) {
    if (ch === "9") out += "[0-9]";
    else if (ch === "A") out += "[A-Za-z]";
    else if (ch === "*") out += "[0-9A-Za-z]";
    else out += ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${out}$`);
}

/** 마스크를 사람이 읽는 보기로. 화면에 "이런 모양이어야 합니다" 로 쓴다 */
export function maskExample(mask: string): string {
  let out = "";
  for (const ch of mask) {
    if (ch === "9") out += "0";
    else if (ch === "A") out += "A";
    else if (ch === "*") out += "0";
    else out += ch;
  }
  return out;
}

export function loginIdAllowed(loginId: string, mask: string | null): boolean {
  if (!mask) return true;
  if (!isValidMask(mask)) return true;  // 못 알아볼 마스크로 아무도 못 들어오게 하지 않는다
  return maskToRegex(mask).test(loginId);
}

/* ── 이메일 도메인 ────────────────────────────── */

/** 쉼표로 나눈 목록을 다듬는다. 앞의 @ 나 대소문자는 신경 쓰지 않아도 되게 */
export function parseDomains(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((d) => d.trim().toLowerCase().replace(/^@/, "").replace(/^\.+/, ""))
    .filter(Boolean);
}

export function isValidDomain(d: string): boolean {
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(d);
}

/**
 * 이 주소가 허용된 도메인인가.
 *
 * 적어 낸 것과 똑같거나, 그 아래 도메인이면 통과한다 — `ac.kr` 하나로
 * `hanyang.ac.kr` 까지 받을 수 있다. `x-ac.kr` 처럼 이름만 비슷한 것은
 * 점 하나를 반드시 요구하므로 걸러진다.
 */
export function emailAllowed(email: string, domains: string[]): boolean {
  if (domains.length === 0) return true;
  const at = email.lastIndexOf("@");
  if (at < 0) return false;
  const host = email.slice(at + 1).toLowerCase();
  return domains.some((d) => host === d || host.endsWith("." + d));
}

/** 화면에 보여줄 안내 한 줄 */
export function rulesNotice(mask: string | null, domains: string[]): string | null {
  const parts: string[] = [];
  if (mask && isValidMask(mask)) parts.push(`학번은 ${maskExample(mask)} 형태여야 합니다`);
  if (domains.length) {
    parts.push(`이메일은 ${domains.map((d) => "@" + d).join(", ")} 주소만 됩니다`);
  }
  return parts.length ? parts.join(" · ") : null;
}
