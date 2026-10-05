# 결제 — 경계와 집행

Phase 2.1 의 9~11번이다. **PG 가 정해지지 않은 부분을 임의로 구현하지
않는 것**이 이 문서의 규칙이다.

## 1. 한 줄

```
가격표 → startCheckout() → 어댑터.createCheckout() → 결제창
       → 리다이렉트 또는 웹훅 → settlePayment()
       → 금액·통화 대조 → payments 적기(멱등) → 이용권 발급
```

화면은 이 사슬에 끼어들지 못한다. **금액은 서버가 `products` 에서 다시
읽는다**: 화면에서 넘어온 금액을 쓰면 개발자 도구에서 29000 을 100 으로
고쳐 결제할 수 있다.

## 2. 어댑터 경계

`src/lib/payments/types.ts` 의 `PaymentProvider` 하나가 경계다. 화면과
주문 로직은 이 인터페이스만 알고 PG 를 모른다.

```ts
interface PaymentProvider {
  readonly name: string;
  readonly markets: readonly PayRegion[];   // 받을 수 있는 시장
  createCheckout(...)    // 결제창에 넘길 값
  getPaymentStatus(...)  // PG 에 직접 물어본다
  verifyPayment(...)     // 이 주문의 금액·통화로 승인됐는가
  handleWebhook(...)     // 서명 검증
  refundPayment(...)     // 집행만. 금액은 refund.ts 가 정한다
}
```

구현 둘: `mock`(심사 전 흐름을 눌러 보는 가짜) · `portone`(PortOne V2).

**운영에서 mock 이 켜지면 코드가 거절한다.** 돈을 안 받고 이용권이
나가는 사고는 설정 실수 하나로 일어나고, 그런 종류의 사고는 코드가
막아야 한다.

## 3. 믿는 것과 안 믿는 것

| | 믿는가 |
|---|---|
| 브라우저가 돌려준 값 | **아니다** |
| 리다이렉트 쿼리 | **아니다** |
| PG 에 직접 물어본 결과 | 그렇다 |
| 서명이 맞은 웹훅 | 어떤 결제인지까지만 |

웹훅은 **서명을 검증하고 결제 번호만 꺼낸다.** 본문의 상태를 믿지 않고
`settlePayment` 이 다시 PG 에 물어본다.

## 4. 멱등

리다이렉트와 웹훅이 같은 결제로 동시에 들어온다. 두 번 들어와도 이용권은
하나만 생긴다.

```
payments  UNIQUE(provider, provider_payment_id)   같은 결제를 두 번 못 적는다
payment_events  UNIQUE(provider, event_id)        같은 웹훅을 두 번 못 쌓는다
seats  부분 UNIQUE                                 좌석이 두 번 안 생긴다
```

그 위에 트랜잭션을 덮고, **중복이면 아무것도 더 하지 않고 완료 화면에
쓸 값만 돌려준다.** 두 번째 호출도 화면을 그려야 하고, 그 화면은 업그레이드
결제인지 새 응시권인지에 따라 다른 문장을 고른다.

## 5. 웹훅 보안

```
webhook-id · webhook-timestamp · webhook-signature   (Standard Webhooks)
서명 대상: {id}.{timestamp}.{body}
시크릿:    base64
비교:      timingSafeEqual
```

- **타임스탬프가 5분을 넘으면 받지 않는다.** 재전송을 받으면 같은 결제가
  다시 확정 경로로 들어간다
- **서명이 틀리면 200 을 주지 않는다.** PG 가 재전송하도록 둔다
- **확정에 실패해도 200 을 준다.** 아직 승인 전인 상태 변경 알림일 수
  있고, 그걸 4xx 로 돌려주면 PG 가 무한히 재전송한다
- **검증 전에 일단 기록한다.** 서명이 틀린 요청도 남긴다: 공격을 받고
  있는지 나중에 알아야 한다. 그 줄은 고치거나 지울 수 없다(트리거)

## 6. 금액과 통화

`src/lib/payments/verify.ts` 의 `matchesOrder()` **한 곳**이 대조한다.

```
상태가 paid 인가
승인 금액 == 주문 금액
승인 통화 == 주문 통화      ← 이 줄이 없었다
```

통화를 안 보면 **USD 29 가 KRW 29 주문을 확정시킨다.** 숫자가 같아서
금액 대조를 그대로 통과한다. 한 시장만 열어 두었을 때는 드러나지 않고,
글로벌 시장을 여는 순간 열린다.

대조가 두 곳에 있으면 한쪽이 느슨해지고, 느슨해진 쪽이 확정 경로면 돈이
통과한다. 그래서 어댑터의 `verifyPayment` 와 `settlePayment` 이 같은
함수를 부른다.

## 7. 환불은 판정과 집행이 갈린다

```
refund.ts 의 refundable(orderId)   얼마를 돌려줄 것인가  (판정)
어댑터의 refundPayment(...)        그 금액을 PG 에 넘긴다 (집행)
```

둘을 합치면 환불선이 두 곳에서 정해진다. 선은 **제공이 개시된 때**이고
상품마다 다르다(`docs/metri/22_refund.md`).

**가짜 어댑터는 집행했다고 적지 않는다.** 적으면 검사가 환불을
통과시키고, 운영에서 돈이 안 돌아간 것을 아무도 모른다.

## 8. 아직 정해지지 않은 것 — **지어내지 않았다**

### 해외 결제 대행사

국내 PG 의 일반 카드결제로는 해외 발급 Visa·Mastercard 가 승인되지
않는다. PortOne 은 채널 단위로 PG 가 갈리므로 채널을 둘 둔다.

```
PORTONE_CHANNEL_KEY          국내 카드
PORTONE_CHANNEL_KEY_GLOBAL   해외 카드 — **비어 있다**
```

비어 있으면 `marketReadiness('GLOBAL')` 이 `ready: false` 와 그 까닭을
**값으로** 돌려주고, 화면은 그 선택지를 열지 않는다. 주석으로만 적어
두면 화면이 버튼을 그리고 누른 사람이 예외를 만난다.

**해외 PG 를 고르지 않았으므로 그 어댑터를 쓰지 않았다.** Eximbay·Stripe·
PayPal 가운데 무엇이 될지는 사업 쪽에서 정한다. 정해지면 어댑터 하나를
더 쓰고 `markets` 에 `global` 을 넣으면 된다.

### 가격

ME_V2 여섯 상품의 값이 승인되지 않았다. `PRICE_NOT_APPROVED` 로 두고
운영 결제가 켜진 데서는 팔지 않는다. 자세한 것은
`docs/metri/38_commercial_readiness.md` 1절.

### 사업자 정보

전자상거래법 제10조 표시가 없으면 결제를 받을 수 없다. 값을 지어내지
않았고, 비어 있으면 푸터에 "확인 필요" 로 찍힌다.

## 9. 환경변수

`.env.example` 에 전부 이름만 적혀 있다. **값은 적지 않는다**: 예시
파일에 진짜 키가 들어가면 저장소가 곧 비밀 저장소가 되고,
`commercial:check` 가 긴 값이 들어왔는지 센다.

```
PAYMENTS_PROVIDER            비우면 mock. 운영에서 mock 이면 코드가 거절한다
PORTONE_STORE_ID             공개값
PORTONE_API_SECRET           비밀
PORTONE_WEBHOOK_SECRET       비밀. 없으면 웹훅을 검증할 수 없다
PORTONE_CHANNEL_KEY          국내 카드 채널
PORTONE_CHANNEL_KEY_GLOBAL   해외 카드 채널. 비면 해외 결제가 닫힌다
```

## 10. 검사

```bash
npm run commercial:check   # 대조·멱등·웹훅·어댑터 계약 (끝낸 것 69가지)
npm run metri:pay          # 국내카드·해외카드·멱등·금액조작을 실제 DB 로
npm run phase2:check       # 가입 → 결제 → 이용권 → 응시 33가지
npm run global:check       # 두 시장을 결제부터 PDF 까지
```
