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

그다음 셋을 치고 전부 통과하는지 본다:

```bash
npm run staging:check   # 공개 전답게 섰는가 (APP_ENV · 자물쇠 · 가짜 결제)
npm run db:verify       # 핵심 7 / 7 · ME_V3 5 / 5 · 내 CareerMatri 5 / 5
npm run pcu:open        # 열린 자리. V3_PREVIEW_OPEN=* 이면 115 자리
```

### 1-6. 승인이 필요한 것 (이 절을 하기 전에)

| 항목 | 누가 | 왜 |
|---|---|---|
| **유료 리소스**: 앱 서비스 1 + Postgres 1 이 늘어 Railway 사용량이 늘어난다 | 사업주 | 요금제의 사용량 한도에 따라 월 수 달러 단위가 추가된다. 끝나면 `staging` 환경을 지우면 사라진다 |
| GitHub 가지 `claude/careermatri-screen-review-p0c8kb` 를 Railway 가 읽는 것 | 사업주 | 이미 저장소 연결이 있어 추가 권한은 없다. 운영 가지는 그대로다 |

## 2. 이 회차가 실제로 검증한 것 (이 기계 · 같은 코드 · 실제 브라우저와 DB)

빌드 **`<<BUILD_ID>>`** · 커밋 **`<<COMMIT>>`** · 서버 `APP_ENV=staging` ·
`V3_PREVIEW_OPEN=*` · PostgreSQL 16 (로컬). 운영 DB 는 읽지도 쓰지도 않았다.

### 2-1. 한 학생의 하루 (`scripts/lab/r33-e2e.ts`, <<E2E_SUMMARY>>)

<<E2E_ROWS>>

### 2-2. 고친 것 (확인된 오류만)

<<FIXES>>

### 2-3. 배재대학교 Campus

<<PCU_ROWS>>

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

<<KNOWN>>

## 5. 운영 배포 전 승인 (이 가지를 운영에 올리려면)

| | 승인 | 뜻 |
|---|---|---|
| 1 | Staging 에서 3절 열두 걸음을 **사람이** PASS | 운영 Canary 가 아직 `BLOCKED` 다. 이 기계의 PASS 를 운영 PASS 로 바꿔 적지 않는다 |
| 2 | 운영 가지에 합치는 것 | `claude/careermatri-screen-review-p0c8kb` → `claude/amazing-thompson-w3f2o2`. **푸시하는 순간 Railway 가 운영을 다시 배포한다.** 이 회차는 하지 않았다 |
| 3 | 운영 `db:upgrade` | 이 회차는 스키마를 바꾸지 않았다(새 표 · 새 칸 0). 운영 컨테이너에서 `npm run db:verify` 로 지금 코드까지 올라와 있는지 먼저 본다 |
| 4 | 학생 공개 상태 | `open_to_students` 는 그대로다(열린 Core 는 운영 Canary 의 `BIZ_CORE_V1` 하나). 다른 전공을 열려면 등록부의 그 칸을 올리는 별도 결정이다 |
| 5 | 실결제 · 메일 | 켜지 않았다. PG 열쇠와 SMTP 가 없다 |
| 6 | Staging 을 지우는 날 | Railway `staging` 환경 → Settings → Delete. 시험 계정과 응시는 그 DB 와 함께 사라진다 |
