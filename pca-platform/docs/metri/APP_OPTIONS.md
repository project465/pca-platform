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

## 6. 1단계를 만들었다 (2026-10-26)

PWA 1단계를 코드로 세웠다. **스토어도 결제도 거치지 않는다.**

| 무엇 | 어디 |
|---|---|
| 설치 정보(이름 · 아이콘 · 여는 자리 `/me` · 색) | `src/app/manifest.ts` |
| 홈 화면 아이콘 넷(상표 한 벌에서 뽑는다) | `npm run pwa:icons` → `public/brand/careermatri/app-*.png` |
| 연결이 끊기면 안내 한 장 · 알림 띄우기 · 누르면 열기 | `public/sw.js` · `public/offline.html` |
| 웹 알림 보내기(VAPID 서명 · RFC 8291 암호화, 패키지 없이) | `src/lib/push.ts` |
| 구독 받기 · 끊기 | `src/app/api/push/route.ts` · 표 `push_subscriptions`(`db/schema_push.sql`) |
| MAT 밤 당번이 새 할 일 · 마감 알림을 기기로도 보낸다 | `src/lib/assistant/nudges.ts` |
| 화면: 설치 안내 한 칸 · MAT 설정의 `이 기기로 알림 받기` | `src/components/install-card.tsx` · `push-toggle.tsx` |
| 검사 | `npm run pwa:check` (암호를 받는 쪽 열쇠로 다시 열고, 서명을 공개 열쇠로 확인한다) |

**지키는 것**
- 로그인한 뒤의 쪽(결과지 · 경험 · 할 일)을 기기에 저장하지 않는다. 공용 PC 에서 연결을 끊고 열어 볼 수 있게 되기 때문이다
- 알림 글에 이름 · 점수 · 공고 이름을 적지 않는다(잠긴 화면에 그대로 뜬다)
- 같은 기기를 다른 사람이 켜면 앞사람 구독이 그 사람에게 옮겨 간다(공용 기기에서 남의 알림이 뜨지 않게)
- 탈퇴하면 구독을 지운다(`erasure.ts`)

**켜는 법 (사업주)**
1. Railway → `pca-platform` → Console 에서 열쇠 한 벌을 만든다
   ```
   node -e "const c=require('crypto').createECDH('prime256v1');c.generateKeys();console.log('VAPID_PUBLIC_KEY='+c.getPublicKey('base64url'));console.log('VAPID_PRIVATE_KEY='+c.getPrivateKey('base64url'))"
   ```
2. 나온 두 줄을 Variables 에 넣고 Deploy. **비밀 열쇠는 어디에도 적어 두지 않는다**
3. 열쇠를 바꾸면 그전에 켠 기기는 다시 켜야 한다. 그래서 한 번 정하면 바꾸지 않는다
4. 운영 DB 에 표를 올린다: `psql "$DATABASE_URL" --single-transaction -f db/schema_push.sql`

열쇠가 없으면 알림 단추가 서지 않고 아무것도 보내지 않는다. 설치(홈 화면 아이콘)와 연결 끊김 안내는 열쇠와 무관하게 돈다.

**켜기 전에 확인할 것**: 개인정보처리방침에 "웹 알림을 켠 기기의 알림 주소(푸시 서버가 주는 주소)를 알림을 보내는 데만 쓰고, 끄거나 탈퇴하면 지운다" 한 줄이 들어가야 한다. 문안은 사업주가 정한다.

## 7. 앱 화면을 미리 세웠다 (2026-10-26)

스토어 앱(Capacitor)이든 홈 화면 앱이든 **앱이 여는 자리**를 `/m` 아래에 실제 자료로 세웠다.
**아직 어디에서도 이 주소로 보내지 않는다**: 설치 정보의 여는 자리는 그대로 `/me` 이고, 앱을 낼 때
`src/app/manifest.ts` 의 `start_url` · `id` 를 `/m` 으로 바꾸면 된다. 검색에도 잡히지 않게 막았다(`noindex`).

| 화면 | 주소 | 무엇 |
|---|---|---|
| 첫 화면 | `/m/welcome` | 로그인 전. 세 줄 소개 · 로그인 · 처음이에요 |
| 홈 | `/m` | 이번 주 할 일(끝냈어요 한 번에) · 다가오는 마감 · 바로 하기 넷 · 확인된 영역 · 먼저 채울 자리 |
| 할 일 | `/m/todo` | 할 수 있는 때로 묶음(이번 달 · 다음 학기 전 · 올해 안). 동그라미 하나로 끝냄 |
| 경험 | `/m/experience` | 적어 둔 경험 · 반영 안 한 것 알림 · 더하는 길 셋(직접 · 사진 · 메모) |
| 사진으로 옮기기 | `/m/capture` | 뒤 카메라로 서류를 찍고 한 번 보고 보낸다. **앱에서만 되는 일**로 내세울 자리 |
| MAT | `/m/mat` | 이번 주 브리핑 · 보고 있는 공고(D-day) · 도구(메모 · 사진 · 달력 · 알림) |
| 알림 | `/m/alerts` | MAT 밤 당번이 쌓은 줄. 열기만 해서는 읽음으로 바꾸지 않는다 |
| 내 정보 | `/m/profile` | 결과 기록(고정된 결과 · 현재 상태) · PDF · 기기 알림 · 메일 브리핑 · 계정 · 로그아웃 |

**지키는 것**
- 판정·점수를 새로 만들지 않는다. 웹 작업공간과 같은 함수(`currentState` · `openActions` · `buildBrief` · `resultHistory`)를 읽는다
- **앱 안에서 결제하지 않는다.** MAT 를 쓰지 않는 분께는 무엇을 하는지만 적고 웹 MAT 화면으로 보낸다(3절의 스토어 결제 규칙)
- 깊은 일(경험 적기 단계 화면 · 공고 붙여 넣기 · 결과지)은 웹 화면으로 넘어간다. 두 벌로 두면 어느 날 갈린다
- 이름은 전부 `ma-` 로 시작한다(`src/app/m/app.css`). 색과 글자 크기는 `surface.css` 토큰 그대로
- 파일을 내려주는 주소(달력 · PDF)는 `Link` 로 걸지 않는다. Next 가 미리 불러오다 MAT 화면이 끝나지 않고 멈췄다

**찍어 보기**: `npm run build && bash scripts/stage-serve.sh 3150` 뒤
`UI_BASE=http://127.0.0.1:3150 npm run app:shots`. 여덟 화면을 390px 로 찍고 열리는가 · 가로 스크롤 ·
안쪽 코드 · 아래 띠 · 브라우저 오류를 센다. 그림은 `docs/metri/shots/app/`.
