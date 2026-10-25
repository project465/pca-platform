# CareerMatri 를 앱으로 만드는 방법 (조사 · 2026-10-25)

지금 CareerMatri 는 `app.careermatri.com` 웹 앱 하나다. 이 문서는 휴대전화 앱으로 내놓는 길을
견주고 권하는 순서를 적는다. **아직 아무것도 만들지 않았다.** 결정은 사업주가 한다.

## 1. 지금 상태

- 웹 앱은 손전화 폭(390px)에서 가로 넘침 없이 선다(검사 · 결과 · 작업공간 화면 점검 통과).
- 설치 아이콘·홈 화면 추가·웹 알림(PWA)에 필요한 `manifest` 와 서비스 워커가 **없다**.
- 알림은 메일뿐이다(MAT 주간 할 일 · 공고 마감).

## 2. 길 셋

| | A. PWA (웹 앱 설치) | B. 감싼 앱 (Capacitor) | C. 새로 만든 앱 (React Native · Flutter) |
|---|---|---|---|
| 무엇 | 지금 웹에 설치 정보와 알림을 더한다. 브라우저에서 "홈 화면에 추가" | 지금 웹을 앱 껍데기에 넣고 앱에서만 되는 기능을 붙여 스토어에 올린다 | 화면을 앱으로 다시 만든다 |
| 스토어 | 안 거침(안드로이드는 TWA 로 플레이에도 올릴 수 있음) | 플레이 · 앱스토어 | 플레이 · 앱스토어 |
| 걸리는 시간(추정) | 1~2주 | 4~8주 | 3~6개월 |
| 고칠 곳 | 한 벌(웹) | 거의 한 벌 + 앱 전용 기능 | 두 벌(웹 + 앱) |
| 알림 | 안드로이드 잘 됨. 아이폰은 iOS 16.4 부터 홈 화면에 추가한 경우만, 몇 주 뒤 구독이 끊긴다는 보고가 있다 | 기기 알림(안정) | 기기 알림 |
| 심사 위험 | 없음 | **있다**: 웹을 감싸기만 하면 두 스토어 모두 거절한다 | 낮음 |
| 비용 | 거의 없음 | 애플 개발자 연 99달러 · 구글 25달러 1회 · 앱 전용 기능 개발 | 가장 큼 |

근거:
- 구글 플레이: 웹사이트를 웹뷰로만 감싼 앱은 "최소 기능" 위반(webview spam)으로 내려간다
  ([Android Developers Blog](https://android-developers.googleblog.com/2020/10/developer-tips-and-guides-common-policy.html),
  [사례](https://www.testerscommunity.com/blog/google-play-app-rejected)).
- 애플 4.2 최소 기능: 웹사이트를 옮긴 앱은 거절되고, 푸시·위치·공유만 더해도 거절된 사례가 있다
  ([Apple 개발자 포럼](https://developer.apple.com/forums/thread/835422),
  [정리 글](https://www.mobiloud.com/blog/app-store-review-guidelines-webview-wrapper),
  [2026 심사 안내](https://capgo.app/blog/how-to-pass-app-store-review-2026/)).
  2025년 심사 거절 2,093,244건 가운데 디자인(최소 기능 포함) 415,532건이라는 2차 요약이 있다
  ([choicely](https://www.choicely.com/tutorials/app-store-rejection-reasons), 애플 원문 미확인).
- 아이폰 웹 알림: iOS 16.4 부터 홈 화면 웹앱에서 가능, 사용자 동작 뒤 권한, 오래 안 쓰면 구독이 끊긴다는 보고
  ([iClarified](https://www.iclarified.com/89346/apple-announces-web-push-for-web-apps),
  [OneSignal](https://documentation.onesignal.com/docs/web-push-for-ios),
  [2026 정리](https://webscraft.org/blog/pwa-pushspovischennya-na-ios-u-2026-scho-realno-pratsyuye?lang=en)).

## 3. 돈 받는 길 (가장 큰 갈림길)

검사·결과지·MAT 는 앱 안에서 쓰는 **디지털 상품**이라 스토어 결제 규칙을 받는다.

- **학교·기관 계약(B2B)**: 애플 3.1.3(c) "기관이 직원·학생을 위해 직접 산 것"은 앱 안 결제 없이 열 수 있다.
  다만 개인·가족에게 파는 것은 앱 안 결제(IAP)를 요구하고, 기관용과 개인 결제를 섞은 앱에는 명확한 답이 없다
  ([포럼 1](https://developer.apple.com/forums/thread/773357), [포럼 2](https://developer.apple.com/forums/thread/777802)).
  **애플 원문은 이 환경에서 열리지 않아 확인하지 못했다.**
- **개인 결제(B2C)**: 앱 안에서 팔면 구글·애플 수수료(최대 30%, 구글은 2026-03 최대 20% 개편안)가 붙는다.
  외부 결제를 골라도 26% 수수료와 PG 비용이 든다는 보도가 있다
  ([비즈워치](https://news.bizwatch.co.kr/article/mobile/2026/03/20/0049),
  [더팩트](https://news.tf.co.kr/read/ogmeta/2330395.htm),
  [머니투데이](https://www.mt.co.kr/article/2026061812375249948)).
  지금 값(14,900원 · 21,900원 · MAT 4,900원)은 웹 결제(PortOne) 기준이다.

그래서 **앱에서는 결제를 열지 않고, 학교 계정과 웹에서 이미 산 것을 쓰는 앱**이 가장 단순하다.
다만 개인 사용자가 앱 안에서 살 길이 없으면 애플이 문제 삼을 수 있어, B 로 갈 때 심사 전에 확인해야 한다.

## 4. 권하는 순서

1. **지금 PWA (1~2주)**: 설치 아이콘 · 홈 화면 추가 · 오프라인 안내 쪽 · 웹 알림(MAT 주간 할 일, 공고 마감).
   스토어 수수료와 심사가 없고, 학교 담당자가 학생에게 "홈 화면에 추가" 한 줄로 안내할 수 있다.
   안드로이드는 같은 웹으로 플레이 스토어에 TWA 로 올리는 길도 열린다(정책상 앱다운 기능이 있어야 한다).
2. **학교 계약이 늘면 Capacitor 앱 (4~8주)**: 웹을 그대로 쓰되 **앱에서만 되는 것**을 붙여 심사 기준을 넘는다.
   - 카메라로 성적증명서·수료증을 찍어 경험 초안 만들기(지금은 파일 올리기)
   - 기기 알림으로 MAT 할 일·공고 마감(아이폰 웹 알림의 불안정을 피한다)
   - 받은 결과지 PDF 를 기기에 보관해 오프라인으로 열기
   - 결제는 열지 않는다(학교 계정 · 웹에서 산 것만). 개인 결제를 앱에 넣을지는 그때 정한다.
3. **C(새로 만든 앱)는 권하지 않는다**: 같은 화면을 두 벌로 고쳐야 하고, 지금 제품이 매주 바뀐다.

## 5. 사업주가 정할 것

- PWA 를 먼저 할지(권함)
- 스토어 앱을 낸다면 개인 결제를 앱에 넣을지(수수료 20~30%) 아니면 학교 계정·웹 구매만 쓸지
- 애플·구글 개발자 계정을 어느 사업자 이름으로 열지(주식회사 에이치에이연구원)
