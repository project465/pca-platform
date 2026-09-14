/**
 * 정산 금액 계산. DB 를 부르지 않는 순수 함수라서 화면·스크립트 어디서나 쓴다.
 *
 * payout.ts 의 SQL 과 같은 식이어야 한다. 멘토에게 보여준 금액과 실제 이체
 * 금액이 1원이라도 다르면 그건 설명할 수 없는 차이가 된다.
 * 원 단위로 끊고 항상 내림한다 — 올림하면 받는 사람이 손해를 본다.
 */
export type PayoutBreakdown = {
  gross: number;
  fee: number;
  withholding: number;
  net: number;
};

export function payoutOf(gross: number, feePercent: number, withholdingPercent: number): PayoutBreakdown {
  const fee = Math.floor((gross * feePercent) / 100);
  // 원천징수는 수수료를 뺀 뒤의 금액에 붙는다. 멘토의 소득은 그쪽이다
  const withholding = Math.floor(((gross - fee) * withholdingPercent) / 100);
  return { gross, fee, withholding, net: gross - fee - withholding };
}

export const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;
