# 세종 MVP 독립 Staging — 안전한 배포 계획 (승인 전, 실행하지 않음)

## 0-1. 이 세션이 대신 한 것 (Staging URL 이 아니다)

npm 레지스트리가 막혀 이 세션에서는 설치·빌드·브라우저 확인을 못 한다. 그래서
`.github/workflows/sejong-verify.yml` 이 GitHub 러너에서 `npm ci` → 전체 TypeScript →
`next build` → 회귀(기준 대조) → DB·권한 → 브라우저 E2E·PDF 를 돌린다.

- 토큰은 `contents: read` 만. **저장소에 아무것도 커밋하지 않는다.**
- 손으로 돌리거나(workflow_dispatch) 커밋 메시지에 `[sejong-verify]` 가 있을 때만 돈다.
- DB 는 러너 안의 일회용 PostgreSQL, 자료는 합성 DEMO 시드, 시연 비밀번호는 실행마다 무작위.
- 공개 저장소의 artifact 는 로그인한 누구나 받을 수 있으므로 **글로 된 결과만** 올린다.
  캡처·PDF 는 `SEJONG_ARTIFACT_KEY` 비밀값이 있을 때만 AES-256 으로 잠가 3일 보관한다.
- **CI PASS 는 실제 서비스 접속이 아니다.** 바깥에서 열 주소는 아래 Railway 프로젝트가 서야 생긴다.

## 0. 지금 사실

2026-10-20 GitHub deployments API 로 확인한 것이다.

| 항목 | 값 |
|---|---|
| 운영 | Railway `feisty-generosity` / `production` ← `claude/amazing-thompson-w3f2o2` @ `02b6c610` |
| 공용 Staging | 같은 프로젝트 `staging` 환경, `https://charming-reverence-staging.up.railway.app` ← `claude/careermatri-screen-review-p0c8kb`. 커밋마다 자동 배포. **배재대 작업이 쓰는 환경이다** |
| 세종 가지 | `claude/epic-galileo-lrvgxr`. 어느 Railway 서비스에도 연결돼 있지 않다 (푸시해도 배포되지 않는다) |
| 이 세션의 권한 | Railway 토큰·CLI 없음. `*.railway.app` 접속은 프록시가 막는다. **만들 수도, 바꿀 수도 없다** |

**공용 Staging 에 세종을 올리지 않는다.** 배재대가 쓰는 DB 에 `sj_` 표와 가상 참여자가
섞이고, 그 환경의 배포 가지를 바꾸면 배재대 검수가 끊긴다.

## 1. 권하는 방식: 별도 Railway 프로젝트

| 비교 | A. 별도 프로젝트 (권장) | B. 같은 프로젝트의 새 환경 |
|---|---|---|
| 운영 변수 오염 | 없음. 다른 프로젝트라 `${{Postgres.DATABASE_URL}}` 참조가 운영으로 닿을 수 없다 | `Duplicate` 를 고르면 운영 `DATABASE_URL` 이 따라온다(R33 문서 경고) |
| 비용 구분 | 청구가 따로 보인다 | 운영과 섞인다 |
| 권한 | 진흥원 시연에 필요한 사람만 초대 | 운영 프로젝트 접근이 같이 열린다 |
| 손이 더 가는 것 | 변수 일곱을 새로 넣는다 | 적다 |

## 2. 차례 (사람이 Railway 에서, 승인 뒤)

1. 새 프로젝트 `careermatri-sejong-staging` → **Empty**.
2. **PostgreSQL** 추가(이 프로젝트 전용).
3. **GitHub Repo** 서비스 추가 → `project465/pca-platform` · 가지 **`claude/epic-galileo-lrvgxr`**.
   - Root Directory 는 지금 공용 Staging 서비스의 값을 그대로 확인해서 맞춘다.
     **추측해서 적지 않는다.** 저장소에서 `Dockerfile` 은 `pca-platform/` 아래에 있다.
   - 자동 배포는 켜 두되, 이 가지에는 세종 작업만 올라간다.
4. 변수 (값은 Railway 에서 새로 만든다. 운영 값을 복사하지 않는다)

   | 변수 | 값 |
   |---|---|
   | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (참조) |
   | `AUTH_SECRET` | 새로 생성 (`openssl rand -base64 32`) |
   | `APP_ENV` | `staging` |
   | `STAGING_BASIC_AUTH` | `아이디:비밀번호` (공유는 따로) |
   | `PLATFORM_URL` | Railway 가 준 `*.up.railway.app` 주소 |
   | `PDF_BASE` | 같은 주소 |
   | `REPORT_PDF_DIR` | 볼륨을 붙일 경우만. 세종 PDF 는 디스크에 쓰지 않는다 |

   결제(`PORTONE_*`)·메일(`MAIL_*`)·소셜 로그인 변수는 **넣지 않는다**.
5. **도메인 생성** → `*.up.railway.app`.
6. DB 세우기. 저장소를 받은 컴퓨터에서 그 DB 를 대상으로 돌린다.
   ```bash
   node -e 'const c=require("./deploy/db-chain.json");for(const f of [...c.base,...c.upgrade])console.log(f)' \
     | while read f; do psql "$DATABASE_URL" -v ON_ERROR_STOP=1 --single-transaction -f "$f"; done
   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/sejong/schema_sejong_demo.sql
   node --experimental-strip-types scripts/sejong/seed-demo.mjs > sj-seed.sql   # 주소에 railway 가 있으면 멈춘다
   ```
   마지막 줄은 일부러 원격에서 멈추게 해 두었다. **원격 시드는 별도 승인 뒤**
   `seed-demo.mjs` 의 막는 줄을 그 한 번만 풀거나, 시연 계정만 손으로 만든다.
7. 확인: `/api/health` 200 → `/sejong` 에 Basic 인증 창 → 시연 계정 로그인 →
   `scripts/sejong/e2e-shots.mjs` 를 `BASE=<주소>` 로 돌린다.

## 3. 보안

- Basic 인증(`STAGING_BASIC_AUTH`)과 `X-Robots-Tag: noindex` 는 공통 미들웨어가 이미 건다.
  세종 레이아웃도 `robots: noindex` 다.
- 실제 개인정보를 넣지 않는다. 시드 참여자는 전부 `가상 참여자 NN` 이다.
- 진흥원 담당자에게 보여 줄 때는 시연 계정만 쓴다. 비밀번호는 시연 뒤 바꾼다.
- 운영 DB·운영 변수·운영 도메인과 연결하는 줄이 없어야 한다. 배포 뒤 변수 화면에서
  `DATABASE_URL` 이 이 프로젝트의 Postgres 를 가리키는지 확인한다.

## 4. 비용 (추정, 승인 전 확인)

Railway 는 사용량 과금이다(2026-10 공개 요금: RAM $10/GB·월, vCPU $20/vCPU·월,
분 단위, 송신 $0.05/GB. Hobby 는 월 $5 에 사용량 $5 포함).

| 자원 | 상시 크기(가정) | 월 추정 |
|---|---|---|
| 앱 서비스 1 (Next.js standalone + PDF 때만 Chromium) | RAM 0.4~0.8GB, 평소 CPU 거의 0 | $5~10 |
| PostgreSQL 1 (시연 자료 21명) | RAM 0.1~0.25GB + 디스크 1GB 안팎 | $1~3 |
| **합계** | | **월 $6~13 안팎** |

- 숫자는 가정한 크기로 계산한 **추정**이다. 실제는 Railway 사용량 화면으로 확인한다.
- 같은 워크스페이스의 기존 플랜(운영 프로젝트가 쓰는 것) 안에서 청구가 프로젝트별로 갈린다.
- 시연 기간이 끝나면 서비스를 멈추거나 프로젝트를 지운다. 멈추면 과금이 멈춘다.

## 5. 승인받을 것

1. 별도 프로젝트로 할지(A), 같은 프로젝트의 새 환경으로 할지(B)
2. 연결할 가지 `claude/epic-galileo-lrvgxr` 를 자동 배포 대상으로 둘지
3. 비용 부담과 시연 기간
4. 시연 DB 에 가상 자료를 넣는 것

**Production 과 운영 DB 는 어느 단계에서도 건드리지 않는다.**
