/**
 * 원화 값을 영어 화면에서 달러로 **어림해** 보여 준다(앱 `/pricing`).
 *
 * **결제는 원화 그대로다.** 한국 시장 상품은 원화로 받고, 카드사가 그날 환율로
 * 바꾼다. 그래서 어림한 값과 함께 "원화로 결제된다" 와 환율 기준일을 적는다.
 * 글로벌 시장 상품은 처음부터 달러 값이 승인돼 있어 여기를 거치지 않는다.
 *
 * 환율은 유럽중앙은행(ECB) 기준 환율(Frankfurter), 못 받으면 open.er-api.com.
 * **서버에서 한 시간에 한 번만 받는다**(방문자 브라우저가 바깥을 부르지 않는다).
 * 둘 다 못 받으면 null 이고 화면은 원화만 적는다. 홈페이지 쪽은
 * `marketing/src/lib/fx.ts` 가 같은 규칙으로 엔화 · 위안화까지 다룬다.
 *
 * 시험할 때는 `FX_FIXTURE='{"date":"2026-10-24","USD":0.000697}'`.
 */
export type UsdRate = { date: string; source: string; USD: number };

export async function krwToUsd(): Promise<UsdRate | null> {
  if (process.env.FX_FIXTURE) {
    try {
      const f = JSON.parse(process.env.FX_FIXTURE);
      return f?.date && f.USD > 0 ? { date: f.date, source: "fixture", USD: f.USD } : null;
    } catch { return null; }
  }
  const tries: [string, (j: any) => UsdRate | null][] = [
    ["https://api.frankfurter.dev/v1/latest?base=KRW&symbols=USD",
      (j) => (j?.date && j?.rates?.USD > 0 ? { date: j.date, source: "ECB", USD: j.rates.USD } : null)],
    ["https://open.er-api.com/v6/latest/KRW",
      (j) => (j?.time_last_update_utc && j?.rates?.USD > 0
        ? { date: new Date(j.time_last_update_utc).toISOString().slice(0, 10), source: "ExchangeRate-API", USD: j.rates.USD }
        : null)],
  ];
  for (const [url, read] of tries) {
    try {
      const res = await fetch(url, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(5000) });
      if (!res.ok) continue;
      const r = read(await res.json());
      if (r) return r;
    } catch { /* 다음 곳을 본다. 둘 다 안 되면 원화만 적는다 */ }
  }
  return null;
}

/** `≈ $10.43` — 영어 화면 · 원화 값 · 환율이 있을 때만 */
export function usdApprox(amountKrw: number, fx: UsdRate | null): string | null {
  if (!fx || !(amountKrw > 0)) return null;
  return "≈ " + new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amountKrw * fx.USD);
}

export function usdNote(fx: UsdRate): string {
  return `Charged in Korean won; your card issuer converts it. Rate: ${fx.date} (${fx.source}).`;
}
