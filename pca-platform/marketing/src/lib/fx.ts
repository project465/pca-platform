/**
 * 원화 값을 그 언어 판의 통화로 **어림해** 보여 준다(영어 USD · 일본어 JPY · 중국어 CNY).
 *
 * **결제는 원화 그대로다.** 앱 결제는 원화로 받고, 카드사가 그날 환율로 바꾼다.
 * 그래서 화면에는 어림한 값을 크게, 실제로 결제되는 원화와 환율 기준일을 작게
 * 함께 적는다. 어림한 값만 적으면 사는 사람이 그 값이 청구될 줄 안다.
 *
 * 환율은 유럽중앙은행(ECB)이 영업일마다 내는 기준 환율(Frankfurter)을 쓰고,
 * 못 받으면 open.er-api.com 을 본다. **서버에서 한 시간마다 한 번만 받는다**:
 * 방문자 브라우저가 바깥 환율 서버를 부르면 그 사람의 IP 가 그쪽에 남는다.
 * 둘 다 못 받으면 **원화만 적는다**(어림을 지어내지 않는다).
 *
 * 시험할 때는 `FX_FIXTURE='{"date":"2026-10-24","USD":0.000723,...}'` 로 값을 넣는다.
 */
import type { Lang } from "@/content/model";

export type Rates = { date: string; source: string; USD: number; JPY: number; CNY: number };

const CURRENCY: Partial<Record<Lang, { code: "USD" | "JPY" | "CNY"; locale: string; digits: number }>> = {
  en: { code: "USD", locale: "en-US", digits: 2 },
  ja: { code: "JPY", locale: "ja-JP", digits: 0 },
  zh: { code: "CNY", locale: "zh-CN", digits: 2 },
};

const ok = (r: Partial<Rates>): r is Rates =>
  !!r.date && [r.USD, r.JPY, r.CNY].every((x) => typeof x === "number" && x > 0 && Number.isFinite(x));

export async function getRates(): Promise<Rates | null> {
  if (process.env.FX_FIXTURE) {
    try { const f = JSON.parse(process.env.FX_FIXTURE); return ok(f) ? { ...f, source: "fixture" } : null; } catch { return null; }
  }
  const tries: [string, (j: any) => Partial<Rates>][] = [
    ["https://api.frankfurter.dev/v1/latest?base=KRW&symbols=USD,JPY,CNY",
      (j) => ({ date: j?.date, source: "ECB", USD: j?.rates?.USD, JPY: j?.rates?.JPY, CNY: j?.rates?.CNY })],
    ["https://open.er-api.com/v6/latest/KRW",
      (j) => ({ date: j?.time_last_update_utc ? new Date(j.time_last_update_utc).toISOString().slice(0, 10) : "",
        source: "ExchangeRate-API", USD: j?.rates?.USD, JPY: j?.rates?.JPY, CNY: j?.rates?.CNY })],
  ];
  for (const [url, read] of tries) {
    try {
      const res = await fetch(url, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(5000) });
      if (!res.ok) continue;
      const r = read(await res.json());
      if (ok(r)) return r;
    } catch { /* 다음 곳을 본다. 둘 다 안 되면 원화만 적는다 */ }
  }
  return null;
}

/** `₩4,900` · `4,900원` 같은 원화 값 하나를 수로 */
export function wonOf(s: string): number | null {
  const m = /(?:₩\s?([\d,]+))|(?:([\d,]+)\s?원)/.exec(s);
  const n = m ? Number((m[1] ?? m[2]).replace(/,/g, "")) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** 원화 금액을 그 언어의 통화로 어림한 글자. 한국어거나 환율이 없으면 null */
export function approx(won: number, lang: Lang, fx: Rates | null): string | null {
  const c = CURRENCY[lang];
  if (!c || !fx) return null;
  const v = won * fx[c.code];
  return new Intl.NumberFormat(c.locale, {
    style: "currency", currency: c.code, minimumFractionDigits: c.digits, maximumFractionDigits: c.digits,
  }).format(v);
}

const NOTE: Partial<Record<Lang, (won: string, date: string) => string>> = {
  en: (_won, date) => `Amounts in brackets are estimates. You are charged in Korean won, and your card issuer converts it. Rate: ${date}.`,
  ja: (_won, date) => `括弧内は目安の金額です。お支払いは韓国ウォンで、カード会社の為替で換算されます。為替：${date}。`,
  zh: (_won, date) => `括号内为参考金额。实际以韩元支付，由发卡机构按当日汇率换算。汇率日期：${date}。`,
};

/**
 * 값 글자 안의 원화 옆에 그 나라 통화로 어림한 값을 붙이고, 기준일을 한 줄로 돌려준다.
 * `30-day pass ₩4,900 · 90-day pass ₩12,900` → `30-day pass ₩4,900 (≈ $3.66) · 90-day pass ₩12,900 (≈ $9.63)`
 *
 * **원화를 지우지 않는다**(2026-10-30 대표 결정: 가격 표기는 원화 기준). 결제는
 * 원화로만 되므로 어림한 값을 큰 글자로 세우면 화면과 청구액이 갈린다.
 */
export function localize(text: string, lang: Lang, fx: Rates | null): { main: string; note: string | null } {
  if (!CURRENCY[lang] || !fx) return { main: text, note: null };
  const wons: string[] = [];
  const main = text.replace(/₩\s?[\d,]+|[\d,]+\s?원/g, (hit) => {
    const n = wonOf(hit);
    const a = n ? approx(n, lang, fx) : null;
    if (!n || !a) return hit;
    wons.push(`₩${n.toLocaleString("en-US")}`);
    return `₩${n.toLocaleString("en-US")} (≈ ${a})`;
  });
  if (!wons.length) return { main: text, note: null };
  return { main, note: NOTE[lang]!(wons.join(" · "), `${fx.date} (${fx.source})`) };
}
