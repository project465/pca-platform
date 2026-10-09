# 48. 직접 눌러 보기 (로컬)

> **아직 배포된 곳이 없다.** 이 글은 손으로 띄워서 눌러 보는 길이다.
> 운영 주소가 생기면 그때 이 문서 맨 위에 적는다.

## 0. 지금 어디에도 올라가 있지 않다

| 주소 | 지금 무엇이 있는가 |
|---|---|
| `careermatri.com` | 예전 CareerMatri 안내 페이지 (손대지 않았다) |
| `app.careermatri.com` | **DNS 기록이 없다.** 아직 만들지 않았다 |
| GitHub Pages | 정적 PCA 결과지 엔진뿐. 플랫폼이 아니다 |

플랫폼은 **한 번도 서버에 올라간 적이 없다.** 그래서 지금 눌러 보려면
손에서 띄운다. 운영용 Postgres · 앱 · PDF 저장 · 환경변수 · DNS 는 다음
단계다.

## 1. 띄우기

```bash
git clone -b claude/amazing-thompson-w3f2o2 <저장소> cm && cd cm
npm ci

# Postgres 하나. 도커를 쓰신다면
docker run -d --name cm-db -e POSTGRES_PASSWORD=dev \
  -e POSTGRES_DB=cm_dev -p 5432:5432 postgres:16-alpine

export DATABASE_URL="postgres://postgres:dev@127.0.0.1:5432/cm_dev"
npm run dev:setup          # 표 · 문항 · 승인된 가격 · 눌러 볼 자료

AUTH_SECRET=$(openssl rand -base64 48) ALLOW_MOCK_PAYMENTS=yes \
  npx next dev -p 3100
```

`npm run dev:setup` 은 **빈 DB 에서 한 번에** 올라간다. 차례가 곧
조건이라(스키마 셋이 서로를 참조하고, 문항은 표가 선 뒤에만 들어가고,
승인된 가격은 상품이 들어온 뒤에 얹힌다) 그 차례를 스크립트에 적어 뒀다.

## 2. 눌러 볼 자리

| | 주소 |
|---|---|
| 한국 가격표 | `/pricing?market=KR` |
| 글로벌 가격표 | `/pricing?market=GLOBAL&lang=en` |
| 한국 BASIC (무료) | 가격표에서 `무료로 시작하기`. **POST 로만 열린다** |
| 한국 STANDARD | `/checkout?product=ME_V2_STANDARD_KR` |
| 글로벌 BASIC | `/pricing?market=GLOBAL` 에서 `Start for free` |
| 글로벌 STANDARD | `/checkout?product=ME_V2_STANDARD_GL` |
| 로그인 · 가입 | `/login` · `/signup` |
| 개인 첫 화면 | `/my` |
| 운영 한눈에 | `/admin` |
| 런칭 Action Center | `/admin/launch` |

**무료 등급은 주소로 안 열린다.** `GET` 으로 열리면 링크 미리보기나
크롤러가 남의 계정에 주문을 만든다. 가격표의 단추를 눌러야 열린다.

## 3. 계정 (개발용)

| | 아이디 |
|---|---|
| 운영사 관리자 | `admin` |
| 학과 담당자 | `me-admin` |
| 학생 | `2021001234` |

**비밀번호는 문서에 적지 않는다.** 시드가 그 기계에서 만들어
`.dev-credentials.json`(gitignore)에 넣는다. 환경변수
`DEV_SEED_PW_ADMIN` 등으로 정할 수도 있다.

개인 흐름은 **새로 가입해서** 보시는 쪽이 맞다. 위 계정은 시드가 만든
것이라 `is_demo` 가 붙어 운영 지표에서 빠진다.

## 4. 결제는 가짜다

`ALLOW_MOCK_PAYMENTS=yes` 이면 결제창 자리에 **테스트 결제창**이 뜬다.
카드 정보를 묻지 않고 단추 하나로 '결제됨' 으로 넘어간다.

- **돈이 오가지 않는다.** PG 가 아직 정해지지 않았고 심사도 안 끝났다
- 주문 · 결제 · 이용권 · 환불 기록은 **진짜와 같은 길**로 쌓인다
- 가짜로 받을 때는 **지금 선 자리로 돌아온다**: 운영 정규 주소로
  돌려보내면 로컬에서 누른 사람이 빈 도메인으로 떨어진다

## 5. 한 바퀴

```
가격표 → (가입) → 결제 → 이용권 → 학위 단계 → 응시 → 중간에 닫기
      → 다시 열어 이어보기 → 제출 → 경험 입력 → 결과지 → PDF → /my
```

- **이어보기**: 응시 중에 창을 닫고 `/my` 로 돌아갔다가 다시 들어오면
  답한 자리에서 이어진다. 답은 묶음을 넘어갈 때마다 서버에 저장된다
- **경험 입력**: 건너뛰어도 결과지는 나온다. 무엇이 빠지는지를 결과지
  맨 위에 적는다
- **PDF**: 결과지 쪽의 내려받기. 없으면 단추를 그리지 않고 다시 만드는
  쪽으로 보낸다

## 6. 메일은 나가지 않는다

`MAIL_HOST` 가 비어 있으면 알림이 대기열에 쌓이기만 한다. 비밀번호 재설정
링크처럼 **열쇠가 든 메일은 쌓지 않고 그 자리에서 보내므로**, 메일 설정이
없으면 그 화면이 그 사실을 적고 다른 길을 안내한다.
