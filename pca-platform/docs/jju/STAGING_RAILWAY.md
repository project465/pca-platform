# 전주대 시연 Staging — Railway 에서 누를 차례

> 이 세션은 Railway 에 닿지 못한다(네트워크 정책이 `backboard.railway.app` 과
> `docs.railway.com` 을 막고 토큰도 없다). 그래서 **만든 것이 아니라 만들 차례**를
> 적는다. 아래를 마치면 `https://<임시 주소>/jju` 에서 실제 로그인과 검사와 결과와
> PDF 를 눌러 볼 수 있다.

## 지키는 것

- 기존 `production` · `staging` 환경과 그 DB 를 **건드리지 않는다.** 새 환경 하나와
  새 PostgreSQL 하나만 만든다(Gate S0 · C16)
- 이 서비스는 `feature/jju-campus` 가지만 본다. 다른 기관 가지를 묶지 않는다
- `APP_ENV=staging` 이라 자물쇠(`STAGING_BASIC_AUTH`)와 `noindex` 가 붙고, 시연 자료
  스크립트는 운영 DB 를 거절한다
- 학생과 응시는 **합성 자료**다. 실제 학생 정보를 넣지 않는다

## 1. 환경과 DB

1. Railway 프로젝트 `feisty-generosity` → 환경 메뉴 → **New Environment** →
   이름 `jju-demo` (빈 환경으로)
2. 그 환경 안에서 **+ New → Database → PostgreSQL**

## 2. 앱 서비스

1. **+ New → GitHub Repo →** `project465/pca-platform`
2. Settings
   - Source → Branch: `feature/jju-campus`
   - Source → Root Directory: `pca-platform`
   - Networking → **Generate Domain** (임시 `*.up.railway.app` 주소)
3. Variables (Raw Editor 에 그대로 붙여 넣는다)

```
RAILWAY_DOCKERFILE_PATH=deploy/Dockerfile.jju-demo
APP_ENV=staging
DATABASE_URL=${{Postgres.DATABASE_URL}}
AUTH_SECRET=${{secret(48)}}
PLATFORM_URL=https://${{RAILWAY_PUBLIC_DOMAIN}}
STAGING_BASIC_AUTH=jju:<여기에 직접 정한 긴 비밀번호>
V3_CAMPUS_FIXTURE=/app/scripts/fixtures/campus-jju.json
V3_PREVIEW_OPEN=CS_CORE_V1
```

- `STAGING_BASIC_AUTH` 의 비밀번호는 **직접 정해서** 넣는다. 채팅이나 문서에 적지 않는다
- `V3_PREVIEW_OPEN` 은 운영(`APP_ENV=production`)에서는 어떤 값이어도 열리지 않는다

## 3. 빌드가 시연 이미지로 구워졌는지 확인

Deployments → 빌드 로그에서 **`jju-demo-setup`** 을 묶는 esbuild 줄이 보여야 한다.

- 보이면 맞다
- 안 보이면 저장소의 `railway.json`(`dockerfilePath: Dockerfile`)이 변수를 이긴 것이다.
  그때는 Settings → Build 의 Dockerfile Path 를 `deploy/Dockerfile.jju-demo` 로 바꾸거나,
  그 칸이 `railway.json` 때문에 잠겨 있으면 이 문서의 담당 세션에 알린다.
  운영 `Dockerfile` 로 구우면 `/jju` 가 404 로 선다(fixture 가 이미지에 없다)

## 4. DB 세우기와 시연 자료 (서비스 → ⋯ → Shell)

```bash
npm run db:init                     # 빈 DB 에 처음 한 번
npm run db:verify                   # 핵심 표 · ME_V3 표 · 내 CareerMatri 표
APPLY=yes JJU_DEMO_REMOTE=yes node ops/jju-demo-setup.cjs
```

마지막 줄이 사업단 담당자(`jju-admin`)와 합성 학생 여섯(`jju-demo-d001`~`d006`)의
비밀번호를 **그 자리에서 한 번만** 보여 준다. 받아 적고 창을 닫는다. 다시 돌리면
비밀번호가 새로 나고 앞의 것은 죽는다.

| 아이디 | 자리 | 상태 |
|---|---|---|
| `jju-admin` | 사업단 담당자 | `/jju/admin` |
| `jju-demo-d001` · `d002` | 인공지능학과 | 결과 있음 |
| `jju-demo-d003` | 인공지능학과 | 푸는 중 |
| `jju-demo-d004` · `d005` | 2026 AI 기초 과정 | 결과 있음 |
| `jju-demo-d006` | 2026 AI 기초 과정 | 푸는 중 |
| — | 후속 ND1~ND6 과정 | 계정 없음(검사 연결 전) |

## 5. 눌러 볼 길

브라우저에서 임시 주소를 열면 자물쇠가 먼저 묻는다(`jju` / 2절의 비밀번호).

1. `/jju` → 학과·과정 고르기 → 인공지능학과
2. `jju-demo-d001` 로 로그인 → 결과 → **결과 PDF 저장**
3. `jju-demo-d003` 로 로그인 → 이어하기 → 끝까지 → 결과
4. `jju-admin` 으로 로그인 → `/jju/admin` (학과·과정별 현황)

## 6. 이 세션에서 확인한 것 · 못 한 것

- 확인: 빈 PostgreSQL 16 에 `deploy/db-chain.json` 전체 → `jju-demo-setup` 이 한 번에
  돈다(응시 6 · 결과 4 · 학교 학생 6). `APP_ENV=production` 이면 한 줄도 쓰지 않고 멈춘다
- 고침: 검사가 이어지지 않은 ND 과정에서 스크립트가 멈추던 자리
  (`scripts/jju-demo-setup.ts`)
- 못 함: Railway 에서 실제로 굽고 띄운 것, 컨테이너 안의 묶은 스크립트
  (`ops/jju-demo-setup.cjs`)가 도는 것. **Staging 은 아직 없다**
