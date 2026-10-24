/**
 * 결과 문장을 언어로 고르는 **유일한 자리.**
 *
 * 두 벌(`text.ko.ts` · `text.en.ts`)이 같은 이름을 내보낸다. 결과지 화면이
 * 언어마다 분기를 흩어 두면 한 절이 빠지는 날 영어 결과지 한가운데 한국어가
 * 선다. 고르는 값은 **그 응시의 언어**(`v3_attempts.locale`)다.
 */
import * as KO from "./text.ko";
import * as EN from "./text.en";

export type ResultText = typeof KO;

/* 영어 벌이 한국어 벌의 이름을 빠짐없이 내보내는지 타입이 센다 */
const EN_T: ResultText = EN as unknown as ResultText;
const _check: { [K in keyof typeof KO]: (typeof EN)[K] } = EN;
void _check;

export function textFor(lang?: string | null): ResultText {
  return lang === "en" ? EN_T : KO;
}
