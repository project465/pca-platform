/**
 * 화면에서 퍼널을 적을 때 쓰는 자리.
 *
 * `funnel.ts` 를 쪼개 둔 까닭은 **검사 스크립트가 그것을 읽기 때문**이다.
 * 거기에 `next/headers` 를 넣으면 `tsx` 로 돌리는 스크립트가 터진다
 * (`locale.ts` 와 `locale-server.ts` 를 나눠 둔 것과 같은 규칙이다).
 */
import { cookies } from "next/headers";
import { ANON_COOKIE } from "@/middleware";
import { track, type FunnelStep, type FunnelProps } from "./funnel";

/** 로그인 전 방문자의 열쇠. 미들웨어가 심어 둔 쿠키 하나다 */
export async function anonId(): Promise<string | null> {
  try {
    return (await cookies()).get(ANON_COOKIE)?.value ?? null;
  } catch {
    return null;
  }
}

/**
 * 한 걸음을 적는다. 로그인했으면 사람으로, 아니면 쿠키로 센다.
 *
 * **기다리지 않아도 된다.** 던지지 않으므로 화면이 이 줄 때문에 늦거나
 * 깨지지 않는다.
 */
export async function step(
  name: FunnelStep,
  opts: { userId?: string | null; props?: FunnelProps } = {},
): Promise<void> {
  await track(name, {
    userId: opts.userId ?? null,
    anonId: opts.userId ? null : await anonId(),
    props: opts.props,
  });
}
