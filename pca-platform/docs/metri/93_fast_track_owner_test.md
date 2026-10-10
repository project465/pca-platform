# Production Owner Test 시작 상태

판정: `READY FOR PRODUCTION OWNER TEST / PRODUCTION UNVERIFIED`

이 문서는 사업주가 운영에서 Owner Test 를 바로 시작하는 데 필요한 여덟
가지만 담는다. 이 회차에 제품 코드를 고치지 않았고 측정체계는
`ME_V3_MEASUREMENT_FREEZE_1` 에 그대로 머문다.

---

## 1. approved HEAD SHA

```
848408eedea90b6ab5146dfdf6601046a9ea613f
branch  claude/amazing-thompson-w3f2o2
origin  동일 (origin/claude/amazing-thompson-w3f2o2)
```

직전 회차(`docs/metri/92_visual_acceptance.md`)의 작업이 이 commit 까지
들어가 있고 `npm run v3:all` 이 마흔 묶음 모두 걸림 0 으로 끝났다.

## 2. deployed SHA

```
deployed SHA   848408e        (approved HEAD 와 같다)
deployment id  6980315600
environment    feisty-generosity / production
creator        railway-app[bot]
created        2026-10-10T11:50:38Z
status         in_progress 11:50:38Z  ->  success 11:53:13Z
```

**approved HEAD 와 deployed SHA 가 같으므로 재배포가 필요하지 않다.**

위의 `success` 는 Railway 가 GitHub Deployments 에 적은 빌드 결과를 읽은
값이다. 컨테이너가 떠서 요청을 받는지는 이 세션에서 확인하지 못했고,
그것은 아래 4단의 Owner 확인 항목으로 남는다.

## 3. Production access

`PRODUCTION ACCESS: 불가능`

```
curl -s -o /dev/null -w '%{http_code}' https://app.careermatri.com/api/health   ->  000
curl -s -o /dev/null -w '%{http_code}' https://app.careermatri.com/            ->  000
agent proxy: app.careermatri.com:443  connect_rejected (organization policy)
Railway Shell: 권한 없음
```

HTTP 000 은 이 컨테이너의 네트워크 정책이 연결을 거절한 것이고 사이트가
죽었다는 뜻이 아니다. 운영 화면과 운영 DB 와 운영 로그를 이 세션에서 한
번도 열지 못했으므로, 아래 6단의 열 걸음은 전부 사업주가 직접 눌러야
답이 나온다.

## 4. DB impact

```
운영 응답 건수        UNKNOWN   (연결 문자열 없음 · Shell 권한 없음)
운영 db:upgrade 적용  UNKNOWN
CJ_GIVEN_REV 호환성   BACKWARD COMPATIBLE
migration             불필요
```

`CJ_GIVEN_REV` 의 문면을 겪은 장면으로 다시 쓰고 역방향 표시를 내린 것이
이미 저장된 응답의 뜻을 바꾸지 않는 까닭은 넷이다.

- 보기 규격이 `OWNERSHIP_4` 로 그대로고 보기 자리 번호와 축도 그대로다
- 채점이 응답을 읽는 자리(`scoring/normalize.ts` 의 `read()`)가 보는 것은 `kind` 와 `index` 와 `value` 뿐이라 문면을 읽지 않는다
- `reverse_flag` 를 읽는 자리는 `quality.ts` 의 `REVERSE_PAIR_AGREED` 하나이고, 그 규칙은 같은 묶음·같은 축의 정방향 짝을 요구하는데 그 짝이 은행에 없었다
- 굳은 결과는 `v3_snapshots.result_model` 에 적힌 값을 그대로 꺼내 그리므로 다시 계산되지 않는다

운영 건수는 사업주가 컨테이너에서 한 줄을 치면 그 자리에서 나온다. 이
질의는 읽기만 하고 아무것도 쓰지 않으며 이미 이미지 안에 들어 있다.

```
psql "$DATABASE_URL" -f /app/db/checks/v3_measurement_impact.sql
```

전체 응답 수 하나로는 답이 나오지 않아서 다섯을 따로 센다: 응답과 응시와
제출과 굳은 결과의 수, `CJ_GIVEN_REV` 응답을 시연 계정과 가른 수, 그
응답의 보기 분포, 굳은 결과에 걸린 문항 은행 판본의 섞임이다.

## 5. Wave 0 blockers

| 갈래 | 분류 | 지금 아는 것 |
|---|---|---|
| `APP_ENV` | REQUIRED FOR WAVE 0 | UNKNOWN. 배포본 밖에서는 값을 못 본다. `production` 이어야 가짜 결제가 거절된다 |
| 지속형 DB · `db:upgrade` | REQUIRED FOR WAVE 0 | UNKNOWN. `npm run db:verify` 가 `7 / 7 · 5 / 5 · 5 / 5` 를 찍어야 한다 |
| 개인정보 격리 | REQUIRED FOR WAVE 0 | 로컬에서 여섯 자리 PASS(`v3:isolation`). 운영 확인은 Owner Test 9단과 10단이 겸한다 |
| Backup · 복구 | REQUIRED BEFORE REAL USER DATA | 운영 DB 를 받아 복구해 본 적이 없다. 로컬 PostgreSQL 에서만 돌렸다 |
| PDF | NOT REQUIRED FOR WAVE 0 | V3 는 누를 때 그 자리에서 뽑으므로 볼륨 영속성에 매달리지 않는다. 웹 결과지는 그대로 열린다 |
| SMTP | NOT REQUIRED FOR WAVE 0 | 초대를 직접 전달하면 된다. 다만 비밀번호 재설정이 막히므로 참가자에게 그 사실을 미리 알린다 |
| OAuth | NOT REQUIRED FOR WAVE 0 | 아이디와 비밀번호로 들어가는 길이 열려 있다 |
| 실제 PG | PAYMENT COMMERCIAL GATE | Wave 0 참가자는 초대가 이용권을 주므로 결제를 거치지 않는다. 이 갈래가 Wave 0 를 막지 않는다 |

## 6. Owner Test 10-step checklist

운영 주소(`https://app.careermatri.com`)에서 순서대로 누른다. 보고는 각
줄에 `PASS` 또는 `FAIL` 과 실제 증상만 적는다.

```
 1. 로그인                 아이디와 비밀번호로 들어간다
 2. /me 홈                 현재 상태 · 지금 할 일 · 최근 달라진 것이 선다
 3. 검사 시작 또는 이어하기  /v3/start 에서 들어가 묶음 하나를 답한다
 4. 검사 완료 -> Result     마지막 단추를 누르고 결과 첫 화면을 읽는다
 5. Result -> PDF          결과 쪽에서 PDF 를 받는다
 6. 경험 추가 -> 저장       세 걸음을 채우고 저장한다
 7. 현재 상태 반영          반영을 누르고 달라진 수를 확인한다
 8. 다음 할 일              /me/next 에 할 일이 서는지 본다
 9. 과거 검사 Result 불변    결과 기록에서 옛 결과를 열어 값이 그대로인지 본다
10. 로그아웃 -> 재로그인     다시 들어와 2단과 8단이 그대로인지 본다
```

손전화에서는 다음 다섯만 다시 밟는다.

```
홈 -> 검사 -> 결과 -> 경험 추가 -> 현재 상태
```

보고 양식은 이렇게 쓴다. 실패한 줄만 화면을 찍어 함께 보낸다.

```
6. 경험 추가 — FAIL — 저장 후 현재 상태 이동 시 500
```

## 7. P0 / P1 현재 목록

```
P0  0건
P1  0건
```

이 수는 이 기계에서 운영과 같은 배치로 띄워 돌린 결과다. 근거는
`npm run v3:all` 의 마흔 묶음(통과 668 · 걸림 0)과 격리 검사 여섯 자리와
제품 루프 확인 마흔일곱 가지다. 운영에서 눌러 본 결과가 아니므로 Owner
Test 가 끝나기 전까지 `운영 P0 · P1 은 UNKNOWN` 이다.

Owner Test 에서 나온 FAIL 은 이 기준으로 가른다.

- P0: 데이터 유실 · 다른 사용자 데이터 노출 · 잘못된 결과 · 굳은 결과 변형 · 저장 실패 · 500 · 인증이나 권한 우회
- P1: 핵심 Journey 막다른 길 · 단추가 틀린 쪽으로 보냄 · 다음 할 일이 비어 있음 · 경험이 현재 상태에 반영되지 않음 · PDF 를 받을 수 없음 · 손전화에서 주요 기능 불가
- P2 는 기록만 하고 P3 는 지금 고치지 않는다

## 8. Owner 가 지금 해야 하는 정확한 다음 행동

재배포는 필요하지 않다. 아래 다섯을 순서대로 한다.

1. Railway 에서 서비스가 `848408e` 로 떠 있고 running 인지 본다. 다르면 그 자리에서 멈추고 알려 준다
2. Railway Shell 에서 두 줄을 친다. 첫 줄이 표를 올리고 둘째 줄이 올라간 것을 센다
```
npm run db:upgrade
npm run db:verify
```
3. 같은 Shell 에서 `npm run ops:check` 를 치고 `APP_ENV` 와 `DATABASE` 두 줄을 읽는다. 그 자리에서 4단의 읽기 전용 질의도 함께 돌린다
4. 밖의 브라우저로 6단의 열 걸음을 누른다. 손전화에서 다섯 걸음을 다시 누른다
5. 열 줄과 다섯 줄을 `PASS` 또는 `FAIL` 과 증상으로 적어 보낸다. FAIL 이 있으면 화면을 함께 보낸다

열 줄과 다섯 줄이 전부 `PASS` 면 다음 판정은
`OWNER TEST PASS — READY FOR WAVE 0` 이고, P0 나 P1 이 하나라도 남으면
`BLOCKED — P0/P1 REMAINS` 다. 그 둘이 갈리기 전까지
`COMMERCIAL READY` 를 쓰지 않는다.
