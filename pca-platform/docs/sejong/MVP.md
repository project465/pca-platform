# 세종 MVP — 무엇이 있고, 어떻게 띄우고, 어디까지 확인했는가

## 1. 확인 상태 (2026-10-20, GitHub Actions `sejong-verify` run 39392001156 · 커밋 d91f0e00)

세션 환경은 npm 레지스트리가 막혀 있어, 아래는 전부 GitHub 러너(일회용 PostgreSQL 16 ·
합성 DEMO 시드 · 실행마다 무작위 비밀번호)에서 돌린 결과다. **CI PASS 는 Staging 접속이 아니다.**

| 구분 | 결과 |
|---|---|
| `npm ci` | 통과 |
| 전체 TypeScript (`tsc --noEmit`) | 통과 |
| Next.js 실제 빌드 (`next build`, standalone) | 통과 |
| 공통 DB 체인 (HEAD · 기준 두 벌) | 통과 |
| 기존 측정·채점 회귀 16종 (기준 `0bff307c` 대조) | 14 통과 · 2 걸림(`golden:check` · `evidence:check`) — **기준 커밋에서도 똑같이 걸림 → 세종과 무관.** 세종 때문에 걸린 회귀 0 |
| 세종 분석 규칙 | 23 / 23 |
| DB 층 · 권한 경계 (`db-check.mjs`) | 16 / 16 |
| 공통 파일 변경 | 0 |
| 브라우저 E2E (구직자 · 상담사 · 관리자 · PDF) | **30 / 30** — PDF 200 · 11쪽 · 렌더 기록 남음 |

CI 가 찾아 고친 결함 하나: 응시 시각이 Date 로 와서 결과지(`/sejong/report`)·PDF·상담사
열람이 그리는 순간 터졌다 → `store.ts` 에서 `::text` 로 읽는다. E2E 쪽 답 패턴 하나도 고쳤다.

캡처·PDF 는 공개 저장소에 올리지 않는다(아래 Staging 계획 0-1).

## 2. 무엇이 있는가

### 구직자
| 주소 | 화면 |
|---|---|
| `/sejong` | 전용 홈. 시연판 띠, 진행 순서, 세종 산업 묶음 |
| `/sejong/login` | 로그인. 인증은 공통 Auth.js 그대로. 세종 자리가 없는 계정은 세션을 남기지 않는다 |
| `/sejong/password` | 첫 로그인 비밀번호 변경. 바꾼 뒤 세종 화면으로 돌아온다 |
| `/sejong/me` | 대시보드. 여섯 단계, 상담사 열람 동의/철회 |
| `/sejong/diagnosis` | 시작 정보: 희망 직무(1~3) · 지역 범위 · 대상 구분(선택) · 보유 기술. **판정에 안 들어간다** |
| `/sejong/diagnosis/[id]` | 24문항. 고르는 즉시 저장, 실패하면 고른 칸을 되돌린다. 이어하기 |
| `/sejong/experience` | 경험 기록(경력·아르바이트·인턴·프로젝트·훈련·자격·봉사), 근거 다섯 칸 |
| `/sejong/result` | 결과: 희망 직무별 핵심 판단 상태 · 판단 여덟 갈래 · 근거 경험. 총점·순위 없음 |
| `/sejong/explore` | 세종 사업장 기업·기관 35곳. 본사/사업장 구분 · 주소 · 업종 · 확인 상태 · 출처 · **채용 여부 미확인** |
| `/sejong/plan` | 30·60·90일 실행 계획. 했어요/되돌리기 |
| `/sejong/report` · `/sejong/report/pdf` | 개인별 취업 전략 결과지. PDF 는 공통 엔진 `drawPagePdf` 로 이 쪽을 인쇄 |

### 기관
| 주소 | 화면 |
|---|---|
| `/sejong/admin` | 사업별 깔때기(발급→로그인→시작→완료→PDF→동의) · 관심 직무 · 지역 범위 · 판단별 확인 인원 · 열람 기록. n<5 가림 |
| `/sejong/admin/participants` | 참여자 표(결과 내용 없음) · 계정 발급(임시 비밀번호 한 번 표시) · 중지/다시 열기 |
| `/sejong/admin/counselors` | 상담사 · 배정 · 동의 현황 |
| `/sejong/counselor` · `/sejong/counselor/[id]` | 상담사: 배정 + 본인 동의 + 기관 허용일 때만 결과지 열람. 열람·거절 모두 기록 |

### 공통 엔진에서 그대로 쓰는 것 (고치지 않았다)
`users` · `organizations` · `memberships` · `consents` 표, Auth.js 로그인과 시도 제한,
`@/lib/db`, `@/lib/password`, `@/lib/validation`, PDF 인쇄 `drawPagePdf`,
ME_V3 taxonomy 의 판단 축 이름(J1~J8)과 단계(L0~L3), 경험 근거 다섯 칸의 축 연결.

### 세종 전용으로 더한 것 (전부 새 파일)
- `db/sejong/` — `sj_` 표 10개. `deploy/db-chain.json` 에 넣지 않았다
- `src/sejong/` — 콘텐츠(JSON) · 분석 · 저장 · 권한 · 집계 · 화면 조각
- `src/app/sejong/` — 화면
- `scripts/sejong/` — 분석 검사 · 시드 · 브라우저 E2E

**고친 공통 파일: 0개.** `git diff --stat 0bff307c -- . ':!docs/sejong' ':!db/sejong' ':!src/sejong' ':!src/app/sejong' ':!scripts/sejong' ':!public/sejong'` 가 비어 있어야 한다. `public/sejong` 은 세종 전용 글꼴(Pretendard, OFL)만 든다.

## 3. 로컬에서 띄우기

```bash
cd pca-platform
npm ci                                   # registry.npmjs.org 접근 필요
createdb cm_sejong_dev
export DATABASE_URL=postgres://.../cm_sejong_dev
export AUTH_SECRET=$(openssl rand -base64 32)
# 공통 스키마 체인 (기존 그대로)
node -e 'const c=require("./deploy/db-chain.json");for(const f of [...c.base,...c.upgrade])console.log(f)' \
  | while read f; do psql "$DATABASE_URL" -v ON_ERROR_STOP=1 --single-transaction -f "$f"; done
# 세종 층 + 시연 자료
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/sejong/schema_sejong_demo.sql
SJ_PW_OUT=$HOME/.sj-demo-pw node --experimental-strip-types scripts/sejong/seed-demo.mjs > /tmp/sj-seed.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 --single-transaction -f /tmp/sj-seed.sql
npm run dev                              # http://localhost:3000/sejong
# 검증
node --experimental-strip-types scripts/sejong/analysis-check.mjs
BASE=http://127.0.0.1:3000 OUT=docs/sejong/shots node scripts/sejong/e2e-shots.mjs
```

시연 계정 (로컬·시연 DB 전용): `sj-demo01`(구직자) · `sj-admin`(기관 관리자) ·
`sj-counsel1`(상담사). **비밀번호는 저장소에 적지 않는다.** 시드를 돌릴 때
`SJ_PW_ADMIN` · `SJ_PW_COUNSEL` · `SJ_PW_SEEKER` · `SJ_PW_VIRTUAL` 로 주거나, 주지
않으면 시드가 무작위로 만들어 표준 오류에 한 번만 찍는다. E2E 는 같은 환경변수를 읽는다.

## 4. DEMO 로 남는 것

- 진단 `SJ_JOBSEEKER_DEMO_V0` · 분석 `sj-demo-analysis.0` — 인지 인터뷰·예비 검사 전.
  화면·결과지·띠에 DEMO 로 적었다
- 대상 구분(청년·일반 구직자·경력 전환·신중년)은 **고르지 않아도 되는 선택값**이다.
  사업 대상이 확정되지 않아 판정에 넣지 않았다
- 기업 자료는 공식 출처의 검색 발췌로 확인했고 원문 재확인 전(`display_ready: false`)
- 직무 영역 ↔ 기업 연결은 시연용 해석이다(기업이 밝힌 채용 직무가 아니다)
- 사업 두 개와 참여자 20명은 가상이다
- 진흥원 지원사업 안내 장은 비워 두었다
