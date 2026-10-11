import { createHash } from "node:crypto";

/**
 * 로그인 시도 제한.
 *
 * **막는 자리는 서버다.** 화면에서 단추를 꺼 두는 것은 안내이고,
 * `POST /api/auth/callback/credentials` 를 직접 두드리는 쪽은 그 화면을
 * 거치지 않는다. 그래서 세고 막는 일을 `authorize()` 안에서 한다.
 *
 * **계정이 있는지 없는지로 세지 않는다.** 없는 아이디로 틀려도 똑같이
 * 세고 똑같이 막는다. 있는 계정에서만 잠기면 "잠겼다" 는 응답 자체가
 * 그 아이디가 있다는 답이 된다.
 *
 * **아이디와 IP 를 날것으로 들고 있지 않는다.** 열쇠는 둘을 이어 붙인
 * 것의 sha256 이라, 이 과정의 메모리를 들여다봐도 누가 언제 틀렸는지
 * 읽히지 않는다.
 *
 * ## 선을 둔 자리
 *
 * 창은 15분이고 **아이디 하나에 대해서만** 바로 조인다. 학교 실습실은
 * 한 IP 를 서른 명이 나눠 쓰고, 나눠 준 비밀번호를 받아 적다 틀리는 일이
 * 흔하다. IP 로 먼저 조이면 **그 수업이 통째로 잠긴다.** 그래서 IP 쪽은
 * 한 사람의 실수로는 닿지 않는 자리에 두고(15분에 쉰 번), 거기까지 간
 * 것은 한 자리에서 아이디를 바꿔 가며 찍고 있는 모양이다.
 *
 * ## 이 모듈이 보장하지 않는 것
 *
 * 셈이 **이 프로세스의 메모리에 있다.** 앱을 두 벌로 늘리면 두 벌이 따로
 * 세고, 다시 띄우면 셈이 0 이 된다. 지금 배포본이 한 벌이라 그대로 두고,
 * 늘리는 날에는 공용 저장소(Redis 나 표 하나)로 옮긴다. **표를 지금
 * 만들지 않는 까닭**은 로그인 실패마다 쓰기가 한 번 늘고, 그 쓰기가
 * 느려지는 날 로그인이 같이 느려지기 때문이다.
 */

/** 세는 창. 이 시간보다 오래된 실패는 없던 것으로 본다. */
const WINDOW_MS = 15 * 60 * 1000;

/**
 * 아이디 하나(+ 그 IP)에 대한 사다리. **순서가 곧 정책이다.**
 *
 * 처음부터 15분을 잠그지 않는다. 비밀번호를 섞어 치는 사람은 다섯 번
 * 안에 맞히는 일이 많고, 1분이면 찍는 쪽의 속도는 꺾이고 사람은 기다릴
 * 수 있다.
 */
const ACCOUNT_STEPS: ReadonlyArray<{ fails: number; lockMs: number }> = [
  { fails: 12, lockMs: 15 * 60 * 1000 },
  { fails: 8, lockMs: 5 * 60 * 1000 },
  { fails: 5, lockMs: 60 * 1000 },
];

/** 한 자리에서 아이디를 바꿔 가며 찍는 모양. 한 사람의 실수로는 닿지 않는다. */
const IP_STEPS: ReadonlyArray<{ fails: number; lockMs: number }> = [
  { fails: 100, lockMs: 30 * 60 * 1000 },
  { fails: 50, lockMs: 10 * 60 * 1000 },
];

/** 메모리가 한없이 늘지 않게 둔 상한. 넘으면 오래된 쪽부터 버린다. */
const MAX_KEYS = 20000;

type Entry = { fails: number[]; until: number };

const seen = new Map<string, Entry>();

function hash(parts: string[]): string {
  return createHash("sha256").update(parts.join("\n")).digest("hex").slice(0, 32);
}

function accountKey(ip: string, identifier: string): string {
  return "a:" + hash([ip, identifier.trim().toLowerCase()]);
}

function ipKey(ip: string): string {
  return "i:" + hash([ip]);
}

/** 창을 지난 실패와 풀린 잠금을 버린다. */
function prune(now: number): void {
  for (const [k, e] of seen) {
    e.fails = e.fails.filter((t) => now - t < WINDOW_MS);
    if (e.fails.length === 0 && e.until <= now) seen.delete(k);
  }
  if (seen.size <= MAX_KEYS) return;
  /* Map 은 넣은 차례를 지키므로 앞쪽이 오래된 쪽이다 */
  const drop = seen.size - MAX_KEYS;
  let i = 0;
  for (const k of seen.keys()) {
    if (i++ >= drop) break;
    seen.delete(k);
  }
}

function entry(key: string): Entry {
  let e = seen.get(key);
  if (!e) {
    e = { fails: [], until: 0 };
    seen.set(key, e);
  }
  return e;
}

function lockFor(
  e: Entry,
  steps: ReadonlyArray<{ fails: number; lockMs: number }>,
  now: number,
): void {
  const n = e.fails.length;
  for (const s of steps) {
    if (n >= s.fails) {
      e.until = Math.max(e.until, now + s.lockMs);
      return;
    }
  }
}

export type LoginGate =
  | { ok: true }
  | { ok: false; retryAfterSec: number };

/**
 * 지금 이 시도를 받아 줄 것인가.
 *
 * **비밀번호를 비교하기 전에 묻는다.** 잠긴 동안에도 해시를 계산하면
 * 찍는 쪽이 우리 CPU 를 그만큼 쓰게 된다.
 */
export function loginGate(ip: string, identifier: string, now = Date.now()): LoginGate {
  prune(now);
  const a = seen.get(accountKey(ip, identifier));
  const i = seen.get(ipKey(ip));
  const until = Math.max(a?.until ?? 0, i?.until ?? 0);
  if (until <= now) return { ok: true };
  return { ok: false, retryAfterSec: Math.ceil((until - now) / 1000) };
}

/**
 * 틀렸다. 세고, 선을 넘었으면 잠근다.
 *
 * **아이디가 없어서 틀린 것도 여기로 온다**(그래야 응답으로 계정이 있는지
 * 알 수 없다).
 */
export function loginFailed(ip: string, identifier: string, now = Date.now()): void {
  prune(now);
  const a = entry(accountKey(ip, identifier));
  a.fails.push(now);
  lockFor(a, ACCOUNT_STEPS, now);

  const i = entry(ipKey(ip));
  i.fails.push(now);
  lockFor(i, IP_STEPS, now);
}

/**
 * 맞았다. 그 아이디의 셈을 지운다.
 *
 * **IP 쪽 셈은 지우지 않는다.** 한 사람이 들어왔다는 것이 같은 자리에서
 * 아이디를 바꿔 가며 찍던 일을 없던 것으로 만들지는 않는다. 들어온
 * 사람은 이미 지나갔으므로 막히지도 않는다.
 */
export function loginSucceeded(ip: string, identifier: string, now = Date.now()): void {
  seen.delete(accountKey(ip, identifier));
  prune(now);
}

/**
 * 요청이 온 자리.
 *
 * Railway 앞단이 `x-forwarded-for` 를 붙인다. 맨 앞 칸이 손님이고 뒤는
 * 거쳐 온 앞단이다. 아무것도 없으면 `unknown` 한 칸으로 모이는데, 그러면
 * 그 칸이 IP 쪽 사다리를 공유한다 — 그래서 IP 선을 한 사람의 실수로는
 * 닿지 않는 자리에 둔 것이기도 하다.
 */
export function clientIpFrom(h: {
  get(name: string): string | null | undefined;
}): string {
  const xff = h.get("x-forwarded-for") ?? "";
  const first = xff.split(",")[0]?.trim();
  if (first) return first;
  const real = h.get("x-real-ip")?.trim();
  return real || "unknown";
}

/** 검사에서만 쓴다. 과정의 셈을 비운다. */
export function resetLoginThrottle(): void {
  seen.clear();
}
