# CareerMatri 본체 Staging (개인 B2C) — 세우는 차례

배재대 Staging(`charming-reverence-staging`)과 운영(`feisty-generosity / production`)을
**건드리지 않는** 별도 배포본이다. 코드는 같은 이미지를 쓴다(`Dockerfile` · `railway.json`).
새로 만드는 코드는 없다: DB 를 세우는 길과 운영자 한 명을 만드는 길이 이미 이미지 안에 있다.

## 1. Railway (사람이 누른다 · 승인 후)

1. **새 프로젝트**를 만든다(예: `careermatri-core-staging`). 운영 프로젝트 안에 환경을 더하지 않는다:
   운영 변수를 참조할 길 자체를 없애기 위해서다. 운영 환경을 `Duplicate` 하지 않는다.
2. 그 프로젝트에 **Postgres** 하나를 더한다.
3. **GitHub 서비스**를 더한다: 저장소 `project465/pca-platform` · 가지 `claude/charming-dijkstra-wlblwl` ·
   Root Directory `pca-platform`. 빌더는 `railway.json` 이 정한다(Dockerfile).
4. 서비스 변수(아래 2절)를 넣고 **Settings → Networking → Generate Domain**(포트 3000).
5. 결과지 PDF 를 재배포 뒤에도 남기려면 볼륨을 `/app/var/reports` 에 붙인다(선택).
6. 이 세션이 배포를 대신하려면 **그 프로젝트에만 걸린 Project Token** 을 환경 설정의 secret 으로
   `RAILWAY_TOKEN` 에 넣는다. 채팅에 붙여 넣지 않는다.

## 2. 서비스 변수

| 변수 | 값 | 까닭 |
|---|---|---|
| `APP_ENV` | `staging` | 가짜 결제·자물쇠·noindex 를 켠다. 운영 차단 규칙이 이 값으로 갈린다 |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` | **참조로** 넣는다. 글자로 붙이지 않는다 |
| `AUTH_SECRET` | 새로 만든 값 (`openssl rand -base64 48`) | 운영 값을 쓰지 않는다 |
| `STAGING_BASIC_AUTH` | `<아이디>:<24자 이상>` | 비우면 누구에게나 열린다. 배재대 Staging 과 다른 값 |
| `PLATFORM_URL` | 4번에서 만든 도메인 | 메일·결제 콜백·PDF 가 이 주소로 돌아온다 |
| `PAYMENTS_PROVIDER` | `mock` (또는 비움) | 실제 결제를 열지 않는다 |
| `DB_IS_PERSISTENT` | `yes` | 관리형 Postgres 임을 확인했을 때만 |

**넣지 않는 것**: `MAIL_*` · `PORTONE_*` · `AUTH_GOOGLE_*` · `AUTH_APPLE_*` · `V3_PREVIEW_OPEN` ·
`V3_CAMPUS_FIXTURE`. 앞의 넷이 없으면 외부 발송·실결제·소셜 로그인이 그려지지 않는다.
`V3_PREVIEW_OPEN` 을 비우면 등록부가 연 전공(지금 ME · BIZ)만 응시할 수 있다.

## 3. DB (서비스 Shell 에서 한 번)

```bash
npm run db:init                                   # 빈 DB: 표와 문항. 시드·시연 자료는 넣지 않는다
npm run make:admin -- <아이디> <이메일> <이름>        # 운영자 한 명. 비밀번호는 그 자리에서 한 번만 보인다
npm run db:verify                                 # 7/7 · 5/5 · 5/5
npm run staging:check                             # 공개 전답게 섰는가
```

`npm run staging:bootstrap` 은 **치지 않는다**: 배재대 기관과 학생을 만드는 길이라 본체 Staging 에
학교 자료가 섞인다. 개인 사용자는 화면에서 가입한다.

## 4. 확인 (밖에서 · 브라우저)

```bash
BASE=https://<도메인> STAGING_BASIC_AUTH=<아이디:비밀번호> OUT=var/b2c \
  npx tsx scripts/b2c-journey.ts
```

열 걸음을 실제 브라우저로 밟는다: 공개 첫 화면 → 가입 → 전공 고르기 → 검사·이어하기·제출 → 결과 →
PDF → 내 CareerMatri → 로그아웃·재로그인 → 다른 사용자 차단 → 손전화. DB 를 열지 않으므로 Staging
에도 그대로 쓴다. 계정은 `@b2c.test.invalid` 로 만들어 시연 자료로 걸러진다.

## 5. 끄는 법

프로젝트를 지우면 그날부터 과금이 멈춘다. 운영과 배재대 Staging 의 비용은 바뀌지 않는다.
