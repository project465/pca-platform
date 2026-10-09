/**
 * 등급마다 **얼마나 걸리는가.**
 *
 * 가격표에서 문항 수를 뺀 자리에 들어간다. 세 등급의 차이는 문항 수가
 * 아니라 판단의 깊이이고(`tiers.ts`), 그래도 사는 쪽은 시간을 비워 둬야
 * 하므로 시간은 보조 정보로 적는다.
 *
 * **세는 자리를 하나로 둔다.** 전에는 가격표가 `itemsFor(tier).length`
 * 를 읽어 앞 판본(ME_V2)의 48 · 68 · 92 를 적고 있었고, 시작 화면은
 * 실제 계획을 세우는 `estimate()` 를 읽고 있었다. 두 수가 달랐고 가격표
 * 쪽이 **받는 수보다 많고 걸리는 시간보다 짧은 쪽으로 둘 다 틀렸다.**
 *
 * **반올림하지 않고 올린다.** 12분을 10분으로 적으면 적게 말한 쪽으로
 * 틀리고, 시간을 그만큼만 비워 둔 사람이 중간에 끊는다.
 */
import { estimate } from "@/lib/me-v3/runtime/session";
import type { Tier } from "@/lib/tiers";

/** 다섯 단위로 올린다. **분 단위로 못 박지 않는다**: 재어 본 값처럼 읽힌다 */
const round5 = (raw: number): number => Math.max(5, Math.ceil(raw / 5) * 5);

/**
 * 가장 짧은 경우와 가장 긴 경우.
 *
 * 긴 쪽은 타계열 대학원이고 번역 맥락 묶음이 더 붙는 자리다. 두 값이
 * 같으면 하나만 적는다.
 */
export function tierMinutes(): Record<Tier, { low: number; high: number }> {
  const low = estimate("bachelor", null);
  const high = estimate("master", "BUSINESS");
  const pick = (e: ReturnType<typeof estimate>, tier: Tier) =>
    tier === "BASIC" ? e.minutes.basic
      : tier === "STANDARD" ? e.minutes.standardFresh : e.minutes.proFresh;
  const out = {} as Record<Tier, { low: number; high: number }>;
  for (const t of ["BASIC", "STANDARD", "PRO"] as Tier[]) {
    out[t] = { low: round5(pick(low, t)), high: round5(pick(high, t)) };
  }
  return out;
}

/** 화면에 적는 말. `약 15분` 또는 `약 15~20분` */
export function minutesLabel(
  m: { low: number; high: number }, lang: "ko" | "en",
): string {
  const span = m.low === m.high ? `${m.low}` : `${m.low}~${m.high}`;
  return lang === "en" ? `About ${span} min` : `약 ${span}분`;
}
