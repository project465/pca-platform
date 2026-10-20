# R5 승인 요청 — 본체 총괄 PM · Core · 사업주

작성 2026-10-20 · **이 회차는 아래 어느 것도 수행하지 않았다.** 승인이 오면 그 항목만 따로 수행하고 증거를 남긴다.
4차 통합 목록(`../tracks-r4/CORE_APPROVAL_REQUESTS.md` E-1 · E-2 · A-1~A-3 · A1~A12)은 그대로 살아 있고, 여기에는 **R5 에서 새로
생기거나 바뀐 것**만 적는다.

## 0. PCU 승인 영역에서 한 것 / 외부 승인 영역

| 구분 | 내용 |
|---|---|
| **PCU 영역 (승인 없이 함)** | 실험 경로 렌더러 `report-gm/render9.ts`(새 파일) · `editorial8.ts` 의 `ANSWER` 를 내보내기(값 변경 없음) · 뽑는 스크립트 `scripts/lab/gm-r5.ts` · Staging 읽기 전용 확인 스크립트 `scripts/lab/r5-staging-probe.ts` · 화면 캡처 스크립트 `r35-inventory.ts` 에 360 폭 선택(`VIEWS`, 기본값 그대로) · 문서. **운영 PDF 경로 · 학생 화면 · DB · 채점은 그대로** |
| **외부 승인 영역 (하지 않음)** | 아래 표 전부. 공통 워크플로 · Railway · 배포 · Staging 생성 · 운영 DB · 브랜치 병합 · Q1~92 · 측정 |

## 1. R5 에서 새로 요청하는 것

| # | 승인 받을 것 | 담당 | 위험 | 풀리는 것 | 최소 조치 |
|---|---|---|---|---|---|
| **R5-1** | **이 세션 환경의 Network access 에 `charming-reverence-staging.up.railway.app` 허용** | 사업주(환경 설정) | 낮음 — 읽기만 | 기존 Staging 의 `/me` · `/api/health` 를 이 세션에서 직접 열어 학생 · 담당자 화면을 찍는다 | claude.ai 환경 설정 → Network access → Allowed domains 에 그 한 줄 |
| **R5-2** | **기존 Staging 의 배포 가지 · 커밋 SHA · 실행 상태 · DB 분리 여부를 알려 주기** (Railway 화면에서 읽어 전달) | 사업주 · PM | 없음(읽기) | `04_RELEASE_GATE.md` §1 의 넷 칸을 UNVERIFIABLE 에서 사실로 | Railway → staging 환경 → 서비스 → Deployments 의 맨 위 줄(가지 · SHA · 상태) + Postgres 가 운영과 다른 서비스인지 |
| **R5-3** | **기존 Staging 에 최신 PCU 코드(이 가지)를 올리는 배포** — R5-2 결과 이 가지의 `a4a7121d` 이후가 아니면 | **본체 총괄 PM** | 중간 — 공유 Staging 이면 다른 팀 검증을 덮는다 | 학생 · 담당자 13걸음을 최신 코드로 밟는다 | **변경 요청으로 분리. 승인 전 배포하지 않는다**(사용자 지시) |
| **R5-4** | CI `pcu-verify` 추가 — 3차 A1 의 **R5 판**(`ci/pcu-verify.yml.draft` · 바뀐 곳 `ci/pcu-verify.r3-to-r5.diff`) | PM | 낮음 — `contents: read` 하나 | `npm ci` · typecheck · `next build` · 러너 안 E2E · **1440/390/360 캡처** · 기존 Staging 읽기 전용 확인 | 파일 하나를 `.github/workflows/` 에 두는 것 |
| R5-5 | (R5-4 와 함께) 저장소 비밀값 여섯: `PCU_ARTIFACT_KEY` · `STAGING_BASIC_AUTH` · `PCU_STAGING_STUDENT_ID/PW` · `PCU_STAGING_ADMIN_ID/PW` | PM · 사업주 | 중간 — 시험 계정 열쇠 | 캡처를 잠가 올리고 Staging 시험 계정으로 로그인해 화면을 찍는다 | 없으면 staging-probe job 은 저절로 건너뛴다 |
| R5-6 | **R5 결과지 사람 검수**(표지 · 4쪽 · 직무 비교 · 자기소개서 · 면접 · 마지막 쪽) | 사업주 · 검수자 | 없음 | Track A PASS 판정 | `02_HUMAN_REVIEW.md` 끝 표에 판정 |
| R5-7 | R5 렌더러를 승인 패키지 E-2 의 render 단계로(4차의 `edit8 → pages8 → html8` 자리를 `edit8 → pages9 → html9` 로) | Core · PM | 중간 | 학생별 GM PDF 운영 연결 | R5-6 뒤 |
| R5-8 | **글꼴 묶음 E-1 을 줄인다**: R5 는 명조를 쓰지 않으므로 **Noto Serif KR 추가는 필요 없다.** Pretendard 다섯 굵기(OFL)만 운영 이미지에 | PM · Core | 낮음 | 운영 렌더러가 R5 와 같은 글꼴 | E-1 을 이 내용으로 바꿔 승인 |

## 2. 그대로 유지되는 금지 · 기본값

- **학생 배포 플래그 OFF.** KODATA 학생 배포 권리(A10) · 기업 공식 수치 검증 전. R5 결과지는 기업 자료를 읽지 않지만, GM 운영 연결 자체는 E-2 승인 전이다.
- **담당자 개인 PDF 기본 거절.** 계약 · 동의 · 접근 기록 정책 확정 전.
- 3차 패키지 01~04 · E-1 · E-2 **미적용.** 파기 목록 `v3_experiences` · `note_text`(A5)도 그대로 승인 대기.

## 3. 권고 차례

R5-1 또는 R5-2(무엇이 떠 있는지부터) → R5-4 · R5-5(러너에서 빌드 · E2E · Staging 읽기) → R5-3(필요할 때만 · PM 승인) →
Staging 13걸음(`04_RELEASE_GATE.md`) → R5-6 → R5-8 · R5-7 · E-2 → 출시 게이트 재판정.
