# 운영으로 바꾸는 열 걸음

`APP_ENV=staging` 에서 `APP_ENV=production` 으로 넘기는 날 할 일. **지금은
넘기지 않는다** — staging 을 그대로 둔다. 이 문서는 넘길 수 있게 됐을 때
읽는 것이고, 조건이 안 찼으면 1번에서 멈춘다.

바꾸는 것은 **변수 한 줄과 지우는 변수 한 줄**이다. 코드는 바꾸지 않는다.
그 두 줄이 코드 안의 다섯 자리를 한꺼번에 돌린다. 어디가 돌아가는지
2번 표에 적어 둔다.

---

## 1. 넘길 수 있는 상태인가 — 먼저 센다

컨테이너 안에서 한 줄.

```
npm run ops:check
```

| 갈래 | 넘기기 전에 | 아니면 |
|---|---|---|
| `DEPLOY` | READY | 올라간 커밋이 최신인지 본다 |
| `DOCKER_RUNTIME` | READY | **BLOCKED 면 넘기지 않는다.** 결과지나 약관이 빠진다 |
| `DOMAIN` | READY | **BLOCKED 면 넘기지 않는다.** 결제 콜백이 돌아올 자리가 없다 |
| `DATABASE` | READY | **BLOCKED·WARNING 이면 넘기지 않는다.** 5년 보존이 깨진다 |
| `PDF_VOLUME` | READY | **BLOCKED 면 넘기지 않는다.** 구매자 PDF 가 재배포에 사라진다 |
| `EMAIL` | READY | **BLOCKED 면 넘기지 않는다.** 결제 확인 메일이 한 통도 안 나간다 |
| `LEGAL` | READY | **BLOCKED 면 넘기지 않는다.** 약관 없이 결제를 받는 상태다 |
| `BUSINESS` | READY | 통신판매업 신고번호 한 칸이면 아래 9번을 읽는다 |
| `BACKUP` | READY | **BLOCKED 면 넘기지 않는다.** 되돌아올 수 있는지 모른다 |
| `PAYMENT` | READY | **BLOCKED 면 서버가 뜨지도 않는다**(아래 3번) |

UNKNOWN 은 BLOCKED 가 아니다. **다만 UNKNOWN 으로 넘기지 않는다** — 못 본
자리는 Railway 에서 눈으로 확인하고 그 줄을 READY 로 만든 뒤에 넘긴다.
`ops:check` 가 UNKNOWN 줄마다 어디를 볼지 적어 준다.

## 2. 무엇이 돌아가는가 — 다섯 자리

`APP_ENV` 하나가 돌리는 것 전부다. 다른 데서 따로 읽지 않는다
(`src/lib/env.ts` 가 정본이고 다섯 자리가 그것을 부른다).

| 자리 | staging | production | 어디 |
|---|---|---|---|
| 공개 전 자물쇠(Basic 인증) | `STAGING_BASIC_AUTH` 가 있으면 건다 | **안 건다** | `src/middleware.ts` |
| 검색엔진 색인 | `X-Robots-Tag: noindex, nofollow` | 헤더 없음 | `src/middleware.ts` |
| 화면 위 "공개 전 시험 배포" 띠 | 그린다 | **안 그린다** | `src/components/staging-mark.tsx` |
| 가짜 결제 | 쓸 수 있다 | **어떤 변수로도 못 쓴다.** 서버가 뜨지 않는다 | `src/lib/env.ts` · `src/lib/payments/index.ts` |
| 공개 상거래 화면(`/pricing`·`/product`) | 늘 열린다 | 제10조 일곱 칸과 지원 주소가 다 찬 뒤에만 열린다 | `src/lib/public-gate.ts` |

**`APP_ENV` 값은 `staging` 또는 `production` 그대로 적는다.** `stage` ·
`prod` 도 받지만, 받는 자리를 늘리면 어느 날 한 글자가 틀린다.

## 3. 결제가 먼저다 — 순서를 거꾸로 하면 서버가 안 뜬다

`APP_ENV=production` 이고 `PAYMENTS_PROVIDER` 가 `mock` 이면
`paymentProvider()` 가 **던진다.** 결제를 거치는 화면이 500 이 되고,
그것이 손님이 보는 첫 화면일 수 있다.

그래서 순서가 정해져 있다.

```
1  PAYMENTS_PROVIDER=portone  + PortOne 다섯 줄을 먼저 넣는다
2  재배포 → staging 에서 실제 결제 한 번(소액)
3  그 다음에 APP_ENV=production
```

**거꾸로 하지 않는다.**

## 4. 바꾸는 변수 — Railway 어디서

Railway → 프로젝트 → 서비스(앱) → **Variables** 탭.

| 할 일 | 변수 | 값 |
|---|---|---|
| 바꾼다 | `APP_ENV` | `staging` → `production` |
| **지운다** | `STAGING_BASIC_AUTH` | 남겨 두면 운영에서는 안 걸리지만, 다음 사람이 staging 으로 되돌릴 때 옛 비밀번호가 다시 산다 |
| 넣는다 | `PAYMENTS_PROVIDER` | `portone` |

변수를 고치면 Railway 가 **스스로 다시 띄운다.** 건드린 뒤 Deployments
탭에서 새 줄이 초록이 되는 것까지 본다.

## 5. 되돌리는 길 — 먼저 읽는다

넘긴 뒤 뭔가 틀렸으면 **변수를 되돌리는 것으로 끝난다.** 코드를 되돌릴
일이 없다.

```
APP_ENV=staging 로 되돌리고 STAGING_BASIC_AUTH 를 다시 넣는다
```

다만 **그 사이에 들어온 주문은 그대로 남는다.** 실제 결제가 한 건이라도
들어왔으면 되돌리기는 "없던 일" 이 아니다. 그 주문은 환불로 처리한다
(`/admin/refunds`).

**DB 는 되돌리지 않는다.** 되돌릴 일이 생겼다는 것은 설정이 틀렸다는
뜻이고, 자료는 멀쩡하다.

## 6. 색인이 열리는 것을 알고 넘긴다

`noindex` 가 빠지는 순간 검색엔진이 들어온다. 들어와서 보는 것이
`/pricing` 과 `/product` 와 법정 문서 셋이다. 그 넷이 그날 최종본이어야
한다 — 색인은 지우는 것보다 올라가는 것이 빠르다.

## 7. 공개 전 자물쇠가 풀리는 것을 알고 넘긴다

주소를 아는 사람 누구나 들어온다. 그 전에 **시연 자료가 운영 DB 에 없는지**
본다.

```
npm run db:verify     # "사람 N명 (시연 M명)" 줄에서 M 이 0 이어야 한다
```

`npm run db:demo` 는 운영에서 돌지 않게 막혀 있다
(`scripts/not-in-production.mjs`). 그래도 사람이 손으로 부을 수 있다.

## 8. 띠가 사라지는 것을 알고 넘긴다

"공개 전 시험 배포 · 결제는 가짜입니다" 띠가 없어진다. **그 띠가 없어진
뒤에 가짜 결제가 열려 있으면 안 되는데**, 운영에서는 코드가 그것을 막으니
확인은 한 줄로 끝난다.

```
npm run ops:check     # APP_ENV 줄이 "production 입니다. 가짜 결제가 막혀 있습니다."
```

## 9. 통신판매업 신고번호 한 칸 — 일부러 막혀 있다

일곱 칸 중 그 한 칸이 비어 있고, **지어내지 않는다.** 그래서 운영에서
`publicCommerceGate()` 가 `/pricing` 과 `/product` 를 닫는다. 그것이
의도된 상태다: 신고 전에 유료 판매를 열면 그 표시 자체가 거짓이 된다.

- QA 는 계속 돈다 (staging 에서 가짜 결제로 끝까지)
- **유료 판매 오픈만 보류**
- 번호가 나오면 `/admin/business` 에 넣는다. 배포하지 않는다

이 한 칸 때문에 넘기기를 미루지도, 번호 없이 넘기지도 않는다. 번호를 넣는
것이 9번이고, 그것이 끝나면 1번의 `BUSINESS` 가 READY 가 된다.

## 10. 넘긴 다음 — 바로 보는 다섯 줄

```
npm run ops:check            # 열한 줄 전부
npm run launch:check         # 갈래별 블로커
npm run prod:check           # 밖에서 두드린다 (DNS·HTTPS·꼬리말·가로 넘침)
npm run db:verify            # 상품 여섯 줄과 동의문 넷
npm run mail:check           # 자격증명을 들고 돌리면 진짜로 한 통 보낸다
```

그리고 **사람이 한 번 산다.** 제 카드로 가장 싼 등급을 사고, 메일이 오는지
보고, 결과지를 열고, PDF 를 내려받고, 환불을 요청한다. 그 한 바퀴를 돌지
않고 켠 가게는 켠 것이 아니다.
