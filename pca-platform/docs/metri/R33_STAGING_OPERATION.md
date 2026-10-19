# R33. 운영 완성과 직접 검수: Staging 접속 안내

> 이 문서는 **사용자가 직접 브라우저로 열어 끝까지 눌러 보기** 위한 안내다.
> 보고서가 아니다. 접속 URL · 배포 Commit/Build · 계정을 받는 법 · 누르는 차례 ·
> 저장과 재로그인을 확인하는 법 · 아직 안 되는 것 · 운영 배포 전 승인을 적는다.
>
> 운영(`app.careermatri.com`)과 운영 DB 는 **이 회차에서 한 바이트도 바꾸지
> 않았다.** 운영이 보는 가지(`claude/amazing-thompson-w3f2o2`)에 푸시하지
> 않았다.

## 0. 먼저, 지금 상태를 사실대로

| 묻는 것 | 답 |
|---|---|
| 운영이 어느 가지를 굽는가 | **`claude/amazing-thompson-w3f2o2`** (Railway 프로젝트 `feisty-generosity` · 환경 `production` · 최신 배포 커밋 `02b6c610` · 2026-10-19 02:04 UTC `success`) |
| 이번 작업 가지 | **`claude/careermatri-screen-review-p0c8kb`** (운영 가지 + R30 후반 · R31 · R32 · R33). GitHub 커밋 상태가 `pending` 이다 = **Railway 가 한 번도 굽지 않았다.** 어디에도 떠 있지 않다 |
| 이 세션에서 Staging 을 만들 수 있었는가 | **없다.** Railway 토큰도 CLI 도 없고, 네트워크 정책이 `backboard.railway.app` 와 `app.careermatri.com` 을 막는다(둘 다 `HTTP 000`). 그래서 아래 1절은 **사용자가 Railway 에서 눌러야 하는 차례**다 |
| localhost 를 접속 URL 로 내놓는가 | **아니다.** 이 기계의 `127.0.0.1:3100` 은 사용자가 열 수 없다. 이 회차의 자동 검증은 그 서버에서 돌렸고(2절), 사용자가 여는 URL 은 1절을 마친 뒤의 Railway 도메인이다 |

**URL 은 1절 6번에서 Railway 가 만들어 준다.** 그 전에는 적을 값이 없고,
지어내지 않는다.

## 1. Staging 을 세우는 차례 (사용자가 Railway 에서 · 약 15분)

운영 서비스와 운영 Postgres 는 **건드리지 않는다.** 새 환경 하나에 새
Postgres 하나와 새 앱 서비스 하나를 둔다. 운영 환경을 `Duplicate` 하지
않는다: 복제하면 운영 `DATABASE_URL` 이 그대로 따라와 **staging 이 운영 DB 에
쓴다.**

### 1-1. 새 환경

1. [railway.app](https://railway.app) → 프로젝트 **`feisty-generosity`** 를 연다.
2. 화면 왼쪽 위 환경 선택(`production ▾`) → **`+ New Environment`**.
3. 이름 **`staging`** · 종류 **`Empty`**(Duplicate 가 아니다) → **Create**.
4. 환경 선택이 `staging` 으로 바뀐 것을 확인한다. 이 뒤의 모든 클릭은 **이 환경 안**에서 한다.

### 1-2. Postgres (staging 전용)

1. 캔버스의 **`+ Create`** (또는 `+ New`) → **Database** → **Add PostgreSQL**.
2. 만들어진 Postgres 카드를 눌러 **Variables** 탭에 `DATABASE_URL` 이 있는지 본다. **값을 복사하지 않는다**(아래에서 참조로 꽂는다).

### 1-3. 앱 서비스 (이 가지에서)

1. **`+ Create`** → **GitHub Repo** → `project465/pca-platform`.
2. 만들어진 서비스 카드 → **Settings** → **Source**:
   - **Branch** → **`claude/careermatri-screen-review-p0c8kb`** 로 바꾼다.
   - Root Directory 는 비워 둔다(저장소 뿌리에 `Dockerfile` 과 `railway.json` 이 있다. 빌더는 `railway.json` 이 `DOCKERFILE` 로 정한다).
   - 자동 배포(`Deploy on push`)는 켜 둔다. 이 가지에만 반응한다.
3. 같은 Settings → **Networking** → **Generate Domain**. 포트를 물으면 **3000**. 만들어진 주소(`xxxx.up.railway.app`)를 적어 둔다. **이것이 접속 URL 이다.**

### 1-4. 변수 (앱 서비스 → Variables → `Raw Editor`)

아래 일곱 줄을 넣는다. `<...>` 는 직접 만든다.

```
APP_ENV=staging
STAGING_BASIC_AUTH=qa:<24자 이상 비밀번호>
AUTH_SECRET=<openssl rand -base64 48 로 만든 값>
PLATFORM_URL=https://<1-3 에서 만든 도메인>
DATABASE_URL=${{Postgres.DATABASE_URL}}
V3_PREVIEW_OPEN=*
DB_IS_PERSISTENT=yes
```

| 변수 | 왜 |
|---|---|
| `APP_ENV=staging` | 가짜 결제가 열리고, 자물쇠와 `noindex` 가 걸리고, **`staging:bootstrap` 이 돈다.** `production` 이면 셋 다 반대다 |
| `STAGING_BASIC_AUTH` | **접근 제한.** 브라우저가 먼저 아이디·비밀번호를 묻는다. 비우면 주소를 아는 누구에게나 열리고 검색엔진이 들어온다 |
| `AUTH_SECRET` | 로그인 쿠키 서명. 운영 값을 쓰지 않는다 |
| `PLATFORM_URL` | 메일 링크·결과지 주소. 임시 도메인이면 그 임시 도메인을 그대로 적는다 |
| `DATABASE_URL=${{Postgres.DATABASE_URL}}` | **staging Postgres 참조.** 글자로 붙여 넣지 않는다. 운영 Postgres 를 가리키는 값이 들어가면 그 순간 격리가 깨진다 |
| `V3_PREVIEW_OPEN=*` | 배재대 전공 **전부**를 학생에게 연다. **운영에서는 어떤 값이든 무시된다**(`previewOpenCores()` 가 `production` 에서 빈 목록). 비우면 운영과 같이 `BIZ_CORE_V1` 하나만 열린다 |
| `DB_IS_PERSISTENT=yes` | `ops:check` 의 DATABASE 줄이 경고로 서지 않게 |

**넣지 않는 것**: `PORT`(Railway 가 넣어 준다) · `NODE_ENV` · `PAYMENTS_PROVIDER` ·
`MAIL_*`(staging 은 가짜 결제 · 메일 없음이 설계다).

변수를 저장하면 Railway 가 다시 배포한다. **Deployments** 탭에서 `Success` 와
`Healthy`(`/api/health`) 를 기다린다(5~8분).

### 1-5. 컨테이너에서 한 번. 계정이 여기서 나온다

앱 서비스 카드 → 오른쪽 위 **⋯** → **Shell** (없으면 Railway CLI:
`railway link` → 환경 `staging` → `railway ssh`).

```bash
npm run staging:bootstrap
```

이 한 줄이 차례대로 한다: 빈 DB 면 `db:init`, 아니면 `db:upgrade` → 배재대
기관 줄과 담당자 `pcu_admin` → 전공 여섯의 시험 학생
(`test-biz-01` · `test-cs-01` · `test-ee-01` · `test-nursing-01` ·
`test-pubadm-01` · `test-media-01`) → **비밀번호 표를 화면에 한 번만** 적는다.
어디에도 저장되지 않는다. 표를 받아 두고 창을 닫는다. 잃어버리면
`ROTATE=yes npm run staging:bootstrap` 으로 새로 낸다.

`APP_ENV` 가 `staging` 이 아니면 **한 줄도 쓰지 않고 멈춘다.** 운영 컨테이너에서
실수로 쳐도 아무 일이 일어나지 않는다.

그다음 넷을 치고 전부 통과하는지 본다:

```bash
npm run staging:check   # 공개 전답게 섰는가 (APP_ENV · 자물쇠 · 가짜 결제)
npm run db:verify       # 핵심 7 / 7 · ME_V3 5 / 5 · 내 CareerMatri 5 / 5
npm run pcu:open        # 열린 자리. V3_PREVIEW_OPEN=* 이면 115 자리
npm run ops:check       # DEPLOY 줄에 지금 서 있는 커밋(RAILWAY_GIT_COMMIT_SHA) · DATABASE 줄
cat .next/BUILD_ID      # 배포 Build ID
```

`ops:check` 의 `DEPLOY` 줄이 적는 커밋이 **배포 Commit** 이고 `.next/BUILD_ID` 가 **Build ID** 다. 둘을 받아 두면 3절을 밟은 결과가 어느 코드의 것인지 적을 수 있다.

### 1-6. 승인이 필요한 것 (이 절을 하기 전에)

| 항목 | 누가 | 왜 |
|---|---|---|
| **유료 리소스**: 앱 서비스 1 + Postgres 1 이 늘어 Railway 사용량이 늘어난다 | 사업주 | 요금제의 사용량 한도에 따라 월 수 달러 단위가 추가된다. 끝나면 `staging` 환경을 지우면 사라진다 |
| GitHub 가지 `claude/careermatri-screen-review-p0c8kb` 를 Railway 가 읽는 것 | 사업주 | 이미 저장소 연결이 있어 추가 권한은 없다. 운영 가지는 그대로다 |

### 1-7. 운영 DB 와 섞이지 않았는지 (사용자가 · 넷 다 맞아야 한다)

| | 어디서 | 보는 것 | 맞으면 | 틀리면 |
|---|---|---|---|---|
| ㄱ | staging 환경 → 앱 서비스 → **Variables** | `DATABASE_URL` 줄 | 값이 글자가 아니라 **참조**(`${{Postgres.DATABASE_URL}}`, 옆에 Postgres 아이콘)이고, 그 Postgres 가 **staging 환경 캔버스에 있는 카드**다 | 글자로 적힌 주소면 지우고 `Add Reference` 로 다시 꽂는다 |
| ㄴ | staging 환경 → Postgres 카드 → **Variables** | `PGHOST` | `production` 환경의 Postgres 카드 `PGHOST` 와 **다르다**(환경 선택을 바꿔 둘을 번갈아 본다. 값을 어디에도 적지 않는다) | 같으면 그 Postgres 는 운영 것이다. staging 의 참조를 끊고 새 Postgres 를 만든다 |
| ㄷ | staging Shell | `node -e 'console.log(new URL(process.env.DATABASE_URL).host)'` | ㄴ 에서 본 staging `PGHOST` 와 같은 호스트 | 운영 호스트가 찍히면 **`staging:bootstrap` 을 치지 않는다** |
| ㄹ | staging Shell · bootstrap **전** | `npm run db:verify` | `이 DB 는 비어 있습니다` 또는 사람 0 · 응시 0 | 사람과 응시가 이미 수백이면 운영 DB 다 |

**순서가 곧 안전장치다.** ㄱ~ㄹ 이 전부 맞은 뒤에만 1-5 를 친다. `staging:bootstrap` 자체도 `APP_ENV=staging` 이 아니면 멈추지만, 그 변수를 운영 DB 를 가리키는 서비스에 넣으면 그 장치는 뜻이 없다. 지키는 것은 **ㄷ** 이다.

### 1-8. 비밀번호를 안전하게 받는 법

- `staging:bootstrap` 의 표는 **그 Shell 화면에만** 선다. 파일로도 로그로도 남지 않고 DB 에는 해시만 있다.
- 표를 **비밀번호 관리자나 사람에게만 보이는 자리**에 옮겨 적고 창을 닫는다. 채팅 · 이슈 · 캡처 · 공개 로그에 붙이지 않는다. 이 세션에 결과를 알려 줄 때도 **비밀번호 열은 지우고** 아이디 열까지만 붙인다.
- 잃어버리면 `ROTATE=yes npm run staging:bootstrap` 이 새 열쇠를 낸다(옛 열쇠는 그 자리에서 죽는다). 학생 하나만 바꾸려면 `APPLY=yes ROTATE=yes npm run pcu:students rotate test-biz-01`.
- 자물쇠(`STAGING_BASIC_AUTH`) 비밀번호는 Railway 변수에만 있다. 브라우저가 묻는 첫 창에 넣는 값이다.

### 1-9. 비용

Railway 는 **쓴 만큼** 청구한다(요금제의 월 요금에 사용량 크레딧이 포함되고 넘는 만큼 추가). staging 환경을 만들면 **늘 켜져 있는 앱 컨테이너 하나와 Postgres 하나(볼륨 포함)** 가 추가로 사용량을 만든다. 작은 앱과 작은 Postgres 라 보통 월 몇 달러 단위이지만, 정확한 값은 Railway → 프로젝트 → **Usage** 가 보여 주는 실측만 믿는다. 끝나면 `staging` 환경을 지우면 그날부터 사용량이 멈춘다. **운영 서비스의 비용은 바뀌지 않는다.**

### 1-10. 끝났으면 이 세션에 알려 줄 것

| 붙여 넣어도 되는 것 | 붙이면 안 되는 것 |
|---|---|
| Staging 도메인 (`xxxx.up.railway.app`) | `STAGING_BASIC_AUTH` 의 비밀번호 · `AUTH_SECRET` · `DATABASE_URL` |
| Deployments 탭의 **커밋 7자리와 상태**(`Success`/`Healthy`) | 시험 계정의 비밀번호 열 |
| Shell 에서 친 `npm run ops:check` · `db:verify` · `pcu:open` · `staging:check` 의 출력 | `staging:bootstrap` 표의 비밀번호 열 |
| `cat .next/BUILD_ID` 의 값 | |

그러면 이 세션이 **GitHub 쪽에서** 그 커밋의 Deployment 가 `staging` 환경에 이 가지(`claude/careermatri-screen-review-p0c8kb`)로 섰는지와 상태를 대어 본다. **이 컨테이너는 Railway 와 `*.up.railway.app` 에 닿지 못한다**(네트워크 정책 · HTTP 000). 그 도메인을 이 세션이 브라우저로 직접 두드리려면, 이 클라우드 세션의 환경 설정(세션 제목 줄의 환경 메뉴 → Edit → Network access → Allowed domains)에 그 도메인(또는 `*.up.railway.app`)을 더해 주어야 한다. 더해 주면 자물쇠 · `noindex` · 로그인 화면 · PDF 응답을 밖에서 같은 검사로 두드린다. 더해 주지 않으면 3절은 사용자가 밟고, 이 세션은 Shell 출력과 GitHub 기록으로만 대어 본다.

## 2. 이 회차가 실제로 검증한 것 (이 기계 · 같은 코드 · 실제 브라우저와 DB)

빌드 **`bdT4uO5RJ8D_LfrMrD5PS`** · 커밋 **`16253110`** · 서버 `APP_ENV=staging` ·
`V3_PREVIEW_OPEN=*` · PostgreSQL 16 (로컬). 운영 DB 는 읽지도 쓰지도 않았다.

### 2-1. 한 학생의 하루 (`scripts/lab/r33-e2e.ts`, 확인 70가지: 통과 70 · 걸림 0)

**0. 계정 발급**

- 통과  DB 에 계정 줄과 학교 신분이 선다: 아이디 zzr33e1425616
- 통과  DB 에 평문 비밀번호가 없다

**1. 로그인**

- 통과  브라우저에서 로그인된다: /cores
- 통과  세션 쿠키가 생긴다: cm_a,authjs.callback-url,authjs.session-token

**2. 검사 시작**

- 통과  응시가 열린다: /v3/174
- 통과  DB 응시 줄: 이 Core · 이 학과 · in_progress: BIZ_CORE_V1 · PCU26_BIZ · in_progress
- 통과  학교 진입은 서버가 PRO 로 연다 (Campus PRO): PRO

**3. 응답 저장**

- 통과  화면 여섯을 지나면 답이 DB 에 쌓인다: 화면 6 · 답 12개
- 통과  어디까지 왔는지(current_screen)와 저장 시각이 적힌다: sweep-exposure-1

**4. 새로고침과 이어하기**

- 통과  새로고침해도 같은 화면에 선다: /v3/174?s=6
- 통과  새로고침으로 답이 늘거나 줄지 않는다: 12개
- 통과  앞 화면으로 돌아가면 고른 답이 서버에서 다시 켜진다: 켜진 보기 4개
- 통과  /v3/start 를 다시 치면 열린 응시로 이어진다 (새 응시를 만들지 않는다): /v3/174
- 통과  이 학생의 응시는 그대로 하나다: 1개
- 통과  브라우저를 닫고 다시 로그인해도 같은 응시로 이어진다: /v3/174

**5. 저장 실패**

- 통과  DB 가 멈추면 `저장 실패 · 다시 시도` 가 선다 (조용히 넘어가지 않는다): 고른 보기 ok
- 통과  저장 실패 상태에서 `저장됨` 을 적지 않는다
- 통과  DB 가 돌아온 뒤 `다시 시도` 를 누르면 저장된다
- 통과  다시 시도한 답이 DB 에 실제로 들어간다: 12 → 13
- 적어둠  DB 가 멈춘 동안 받은 응답: 500 http://127.0.0.1:3100/v3/174
- 통과  저장 실패 뒤에도 응시 화면에 그대로 있다 (로그인이나 홈으로 튕기지 않는다): /v3/174

**6. 응시 도중 서버 재시작**

- 통과  서버가 같은 빌드로 다시 뜬다
- 통과  재시작 뒤 세션이 살아 있다 (다시 로그인하라고 하지 않는다): /v3/174
- 통과  재시작 뒤 같은 화면에서 이어진다
- 통과  재시작으로 답이 사라지지 않는다: 13개

**7. 제출 (중복 클릭)**

- 통과  모든 화면을 눌러 끝까지 간다: 화면 61 · 5.0분
- 통과  응시가 제출돼 채점됐다 (status=scored · submitted_at): scored
- 통과  `결과 만들기` 를 두 번 눌러도 결과가 한 벌이다: 스냅샷 1개 · 두 번 누름 true
- 통과  답이 서버에 다 쌓였다: 109개
- 통과  제출 뒤 완료 안내나 결과에 선다: /v3/174/result

**7b. 동시 제출 (서버 함수 두 번 동시에)**

- 통과  같은 순간에 제출 둘이 들어와도 결과가 한 벌이다: 스냅샷 1개 · 호출 결과 fulfilled/fulfilled

**8. 결과**

- 통과  결과 모델이 DB 에 굳어 있다: 영역 12
- 통과  결과 화면이 열리고 머리글이 모델과 같다: "마케팅·시장 과제는 해 봤고, 정리만 남았어요"
- 통과  제출이 지금 값 줄을 만들고, 제출만 한 것을 반영으로 읽지 않는다: gaps object · recomputed_at 2026-10-19 06:36:06.753991+00

**9. PDF 다운로드**

- 통과  PDF 가 내려온다: 200 application/pdf
- 통과  PDF 파일이 비어 있지 않다: 1482953 바이트
- 통과  종이의 한글이 글자로 꺼내진다: 11쪽 · 한글 6044자
- 통과  종이에 학교와 학과가 선다

**10. 경험 추가와 현재 상태**

- 통과  저장 단추가 DB 에 경험 줄을 만든다: 기술영역 2개 (화면에서 고른 2)
- 통과  저장하면 달라진 것을 먼저 보여 준다 (/me/recompute?new=): /me/recompute?new=82&r=done
- 통과  저장하면 누르지 않아도 현재 상태에 반영된다 (recomputed_at · 밀린 일 0): recomputed_at 2026-10-19 06:36:16.114929+00 · 밀린 일 0
- 통과  저장 직후 쪽이 그 경험으로 달라지는 현재 상태를 적는다
- 통과  현재 상태 화면이 경험을 얹은 값이라고 적는다 (반영 시각 기준)
- 통과  경험 목록에 그 경험이 있고 더했는지가 적힌다
- 통과  홈의 최근 기록에 결과와 경험이 선다

**11. 로그아웃과 재로그인**

- 통과  계정 화면에 로그아웃 단추가 있다
- 통과  로그아웃하면 로그인 화면으로 간다: /login
- 통과  세션 쿠키가 지워진다: 0개 남음
- 통과  로그아웃 뒤 /me 는 로그인으로 돌려보낸다: 200 → /login
- 통과  로그아웃 뒤 PDF 가 막힌다: 307
- 통과  다시 로그인된다: /me
- 통과  재로그인 뒤 홈에 결과 기록과 경험이 그대로 있다
- 통과  결과 기록 목록에 그 응시가 있다
- 통과  재로그인 뒤 결과지가 같은 머리글로 열린다
- 통과  재로그인 뒤 PDF 가 다시 내려온다: 200
- 통과  재로그인 뒤 경험 목록이 그대로다
- 통과  결과를 받은 뒤 /v3/start 는 새 응시를 열지 않고 지난 결과로 보낸다: /v3/174/result
- 통과  이 학생의 응시는 여전히 하나다

**12. 권한**

- 통과  다른 학생에게 PDF 가 막힌다: 404
- 통과  다른 학생에게 결과 화면이 막힌다 (404 · 머리글이 새지 않는다): 404
- 통과  다른 학생에게 응시 화면이 막힌다: 404 /v3/174
- 통과  학생은 담당자 집계 화면을 열 수 없다: 200 /cores
- 통과  로그인하지 않으면 PDF 가 막힌다: 307
- 통과  로그인하지 않으면 결과 화면이 로그인으로 간다: /login

**13. PDF 오류**

- 통과  PDF 를 못 만들면 503 과 사람이 읽는 안내가 선다 (날글자 오류가 아니다): 503
- 통과  실패가 운영 표(job_failures)에 적힌다: 0 → 1
- 통과  PDF 가 깨져도 웹 결과는 그대로 열린다

**14. 서버 재시작 뒤**

- 통과  정상으로 다시 띄우면 PDF 가 다시 내려온다: 200
- 통과  재시작 전후로 답 · 결과 · 경험의 수가 같다: 답 109 · 결과 1 · 경험 1
- 통과  재시작 뒤 세션이 그대로 살아 있다
- 통과  브라우저 오류 · 5xx 0: 없음
- 적어둠  응시 174 · 아이디 zzr33e1425616 (비밀번호는 적지 않는다) · PDF 1482953 바이트 · 계정과 응시를 남겨 둔다

### 2-2. 고친 것 (확인된 오류만)

| 자리 | 확인된 오류 | 고친 것 |
|---|---|---|
| `src/lib/auth.ts` (jwt 콜백) | PostgreSQL 이 몇 초 멈춘 동안 사용자 줄을 다시 읽는 조회가 던지면 세션이 비어 **검사 한가운데 있던 학생이 `/me` 로 떨어지고 보내지 못한 답을 잃었다** (E2E 1차에서 실제로 떨어졌다) | 앞서 확인된 토큰은 그대로 두고, 저장 실패는 그 호출이 제 자리에서 `저장 실패 · 다시 시도` 로 적는다. 처음 들어오는 토큰은 전처럼 거절한다 |
| `submit()` (`runtime/session.ts`) | 같은 응시에 제출 둘이 같은 순간에 들어오면 **스냅샷이 두 줄** 쌓였다 (동시 호출 둘로 실제로 두 줄을 만들었다) | 응시 줄을 `FOR UPDATE` 로 잠그고 `in_progress` 일 때만 적는다. 늦게 온 쪽은 굳은 줄을 돌려받는다 |
| `scripts/v3-pcu-flow.ts` | 학교가 발급하지 않은 학생으로 들어가 학교 로그인으로 돌려보내진 것을 `검사가 열리지 않는다` 로 거꾸로 적었다 (검사 쪽 문제) | 학생을 그 학교의 학생으로 먼저 적는다 |

이 밖에 **재개발하지 않았다**: 로그인 · 저장 · 이어하기 · 제출 · 결과 · PDF · 경험 추가 · 반영 · 로그아웃 · 권한은 2-1 표대로 그대로 돈다. 측정 동결(`ME_V3_MEASUREMENT_FREEZE_1`)이 기록을 다시 적지 않은 채로 통과하고, 검사 화면 동결은 `runtime/session.ts` 의 지문만 다시 적었다(화면이 바뀌지 않았다).

### 2-3. 배재대학교 Campus

| 묻는 것 | 검사 | 결과 | 비고 |
|---|---|---|---|
| 학생 공개 상태 (등록부 · 미리보기 닫고) | `pcu-open-clean` | 통과 6 · 걸림 0 | 운영 기준으로 열린 자리는 `PCU26_BIZ` 하나 · 준비 중 116 자리는 열려 있지 않다 |
| 담당자 집계 · 5명 규칙 · Campus PRO | `pcu-ops` | 통과 19 · 걸림 0 | 학교 응시 전부 PRO · 5명 미만 학과는 수를 내지 않고 0 으로 적지 않는다 |
| 담당자 내려받기 · 권한 | `campus-export` | 통과 49 · 걸림 0 | 명단 CSV 에 개별 답변 0 · 학생은 `/org/v3*` 못 열고 담당자는 학생 결과를 못 연다 |
| 학교 계정 하나로 여덟 걸음 (BIZ) | `pcu-campus` | 통과 50 · 걸림 0 | 발급한 계정 = 응시한 계정 · 쿠키를 들고 바로 쳐도 학교 맥락이 적히지 않는다 |
| User A · B 격리 | `isolation` | 통과 11 · 걸림 0 | 응시 · 결과 · 종이 · 경험 · 결과 이력 · 운영 화면 |
| 학생 전체 길 (CS_CORE_V1 · 컴퓨터공학전공) | `v3-pcu-flow` | 통과 17 · 걸림 0 | 학과 → 응시 → 제출 → 결과 → PDF → 경험 추가 → 반영 → 현재 상태 |
| 학생 전체 길 (NURSING_CORE_V1 · 간호학과) | `v3-pcu-flow` | 통과 17 · 걸림 0 | 학과 → 응시 → 제출 → 결과 → PDF → 경험 추가 → 반영 → 현재 상태 |
| 학생 전체 길 (PUBADM_CORE_V1 · 일반행정트랙) | `v3-pcu-flow` | 통과 17 · 걸림 0 | 학과 → 응시 → 제출 → 결과 → PDF → 경험 추가 → 반영 → 현재 상태 |
| 학생 전체 길 (EE_CORE_V1 · 전기전자공학과) | `v3-pcu-flow` | 통과 17 · 걸림 0 | 학과 → 응시 → 제출 → 결과 → PDF → 경험 추가 → 반영 → 현재 상태 |
| 학생 전체 길 (MEDIA_CORE_V1 · 광고사진영상학과) | `v3-pcu-flow` | 통과 17 · 걸림 0 | 학과 → 응시 → 제출 → 결과 → PDF → 경험 추가 → 반영 → 현재 상태 |
| 학교 운영 업무의 CLI 의존 | `pcu-cli` | 통과 57 · 걸림 0 | 담당자 업무 13개가 화면에서 끝난다 |

**계약 Seat.** 학교 응시는 `contracts`/`seats` 를 소비하지 않는다. 학교 계약의 등급은 서버가 응시를 열 때 학교 맥락을 보고 PRO 로 못 박고(`openAttempt`), 재응시는 담당자가 이용권 한 줄로 열어 줄 때만이다. PCU 기관에 `contracts` 줄은 0 이고 그 상태로 집계와 PDF 와 권한이 전부 선다. 좌석 수를 계약에 적어 두고 세는 일은 아직 없는 기능이며, 이 회차에서 만들지 않았다.

**BIZ 의 성공을 PCU 전체의 성공으로 적지 않는다.** 위 표의 전공 다섯은 각자 끝까지 밟은 값이고, 나머지 자리 115 는 `pcu:coverage` 가 R32 까지 밟아 둔 값이라 이 회차에 다시 밟지 않았다.

## 3. 사용자가 누르는 차례 (Staging URL 이 선 뒤)

**학생 한 바퀴**: `test-biz-01` (경영학과) 기준. 다른 전공도 아이디만 다르다.

1. `https://<도메인>/campus/pcu` → 브라우저 자물쇠에 `qa` / `STAGING_BASIC_AUTH` 뒤 비밀번호.
2. 단과대학 탭 → **경영학과** → **검사 시작하기** → 학교 로그인 화면 → `test-biz-01` / 표의 비밀번호.
3. **학부** 를 고르고 **검사 시작** → 시작 안내 → **시작**.
4. 문항에 답한다. 머리띠에 `저장됨` 이 서는지 본다. 등급 선택이 없고(학교 계약은 서버가 PRO 로 연다) 안쪽 코드가 없다.
5. **중간에 브라우저를 새로고침한다** → 같은 화면 · 같은 답. 탭을 닫고 `https://<도메인>/v3/start` 를 치면 **열린 응시로 돌아온다.**
6. 끝 화면 **결과 만들기** → 완료 안내 → **결과 보기**.
7. 결과 첫 화면에서 **PDF 저장** (`/v3/<응시>/result/pdf`) → 파일이 내려온다(11~13쪽 · 표지에 학교와 학과).
8. 결과 아래 **경험 추가** (또는 `/me/experience/new`) → 종류 · 제목 · 시작한 달 → 다음 → 기술영역 둘 · 판단 → 다음 → 남긴 것 → **저장**.
9. 저장 직후 **`달라진 것`** 화면(`/me/recompute?new=…`) → `현재 상태 보기` → `새 경험을 더했습니다` 가 적힌다. **`/me/experience`** 에 그 경험이 `현재 상태에 더함` 으로 선다.
10. **새로고침** → 그대로 남아 있다(서버에 저장됐다는 뜻. 브라우저 저장소를 쓰지 않는다).
11. `/my` → **로그아웃** → 로그인 화면. 이 상태로 `/me` 를 치면 로그인으로 돌아간다.
12. 같은 아이디로 **다시 로그인** → `/me` 홈의 `최근 기록` 에 결과와 경험 → `결과 보기` · `PDF` 가 다시 열린다. `/v3/start` 를 쳐도 **새 검사가 열리지 않고 지난 결과로 간다**(재응시는 담당자가 열어 줄 때만).

**담당자 한 바퀴**: `pcu_admin`.

1. `https://<도메인>/login` → `pcu_admin` / 표의 비밀번호 → `/org`.
2. 메뉴 **전공 진단 집계** (`/org/v3`) → 대상자 · 시작 · 완료 · 단과대학 · 학과 줄. 학생 한 명이 끝낸 뒤면 **완료 1** 이 선다. 5명 미만 학과 칸은 수를 내지 않는다(가린 것이고 0 이 아니다).
3. **학생 명단** (`/org/v3/students`) → 학과로 좁혀 보기 · 비밀번호 재발급 · CSV.
4. 학생의 결과지 주소(`/v3/<응시>/result`)를 담당자 계정으로 치면 **열리지 않는다**(개인 결과는 기관에 기본으로 닫혀 있다).

## 4. 정상 동작하지 않는 것 · 범위 밖

| | 무엇 | 뜻 |
|---|---|---|
| 1 | **Staging URL 이 아직 없다** | 이 세션에서 Railway 에 만들 권한과 통신이 없다. 1절을 사용자가 눌러야 URL 이 생긴다. 그 전까지 `접속 URL` 칸은 비어 있고, 이 기계의 `127.0.0.1:3100` 은 사용자가 열 수 없다 |
| 2 | **운영 미검증** | 운영(`app.careermatri.com`)은 이 가지를 한 번도 굽지 않았다. 운영 Canary(`PCU CANARY BLOCKED`)는 그대로다 |
| 3 | DB 가 멈춘 동안의 500 | PostgreSQL 이 멈춘 몇 초 동안 쪽을 다시 그리는 요청은 500 을 받는다(E2E 가 `적어둠` 으로 남긴다). 학생 화면은 `저장 실패 · 다시 시도` 로 제 자리에 남고 DB 가 돌아오면 그 단추로 저장된다. 그 몇 초의 500 을 없애는 일(캐시 · 대기)은 이 회차 범위 밖이다 |
| 4 | 학생 공개 상태 | 등록부의 `open_to_students` 는 그대로다(열린 Core 는 `BIZ_CORE_V1` 하나). Staging 에서 전공 전부를 여는 것은 `V3_PREVIEW_OPEN=*` 이고 운영에서는 무시된다 |
| 5 | AI Advantage | LLM 호출 0. 개인화는 결과 모델과 사전과 규칙이 만든다 (R32 와 같다) |
| 6 | 실결제 · 메일 · 소셜 로그인 | 꽂힌 열쇠가 없어 켜지지 않았다. staging 은 가짜 결제다 |
| 7 | 재응시 | 기본 한 번. 담당자가 이용권 한 줄로 열어 줄 때만 다시 연다(화면에서 열어 주는 단추는 `/org/v3/students`) |
| 8 | iPhone Safari 실기기 | 이 환경에 WebKit 이 없어 Chromium 에 iOS 화면을 씌워 봤다. 실기기 확인이 남아 있다 |

## 5. 운영 배포 전 승인 (이 가지를 운영에 올리려면)

| | 승인 | 뜻 |
|---|---|---|
| 1 | Staging 에서 3절 열두 걸음을 **사람이** PASS | 운영 Canary 가 아직 `BLOCKED` 다. 이 기계의 PASS 를 운영 PASS 로 바꿔 적지 않는다 |
| 2 | 운영 가지에 합치는 것 | `claude/careermatri-screen-review-p0c8kb` → `claude/amazing-thompson-w3f2o2`. **푸시하는 순간 Railway 가 운영을 다시 배포한다.** 이 회차는 하지 않았다 |
| 3 | 운영 `db:upgrade` | 이 회차는 스키마를 바꾸지 않았다(새 표 · 새 칸 0). 운영 컨테이너에서 `npm run db:verify` 로 지금 코드까지 올라와 있는지 먼저 본다 |
| 4 | 학생 공개 상태 | `open_to_students` 는 그대로다(열린 Core 는 운영 Canary 의 `BIZ_CORE_V1` 하나). 다른 전공을 열려면 등록부의 그 칸을 올리는 별도 결정이다 |
| 5 | 실결제 · 메일 | 켜지 않았다. PG 열쇠와 SMTP 가 없다 |
| 6 | Staging 을 지우는 날 | Railway `staging` 환경 → Settings → Delete. 시험 계정과 응시는 그 DB 와 함께 사라진다 |
