# Track F 4차 · 출시 검증 — CI · Staging · 브라우저 13걸음 상태

작성 2026-10-20 · HEAD `697b4b19`. **이 회차에 브라우저로 밟은 걸음은 0 이다. 어느 걸음도 `통과` 로 적지 않는다.**

## 1. 실제 구현

- 코드 · 워크플로 · 인프라 변경 **없음**.
- **CI**: 최소 권한 워크플로 `pcu-verify`(권한 `contents: read` · 손으로 또는 `[pcu-verify]` · 일회용 PostgreSQL · 합성 계정)의 초안은
  `../../tracks-r3/F/ci/pcu-verify.yml.draft`(163줄) 그대로다. **승인이 오지 않아 `.github/workflows/` 에 두지 않았다**
  (저장소 루트 · 앱 폴더 모두 `.github/` 없음 · `logs/build-env.log`).
- **Staging**: 만들지 않았다. 계획은 `../../tracks-r3/F/STAGING_PLAN.md`(운영과 분리 · 새 환경 · 새 Postgres · 평소 0 replica ·
  필요할 때만 켬 · 시험 계정만) 그대로이고 **인프라 생성 승인 대기**다.

## 2. 테스트 증거

| 검사 | 결과 | 로그 |
|---|---|---|
| 빌드 의존성 확인(읽기만) | `node_modules/next` · `typescript` · `react` · `pg` · `@types/node` 가 **빈 폴더**(파일 0) · `.bin` 없음 · `npm view` 네트워크 오류 → `npm ci` · typecheck · production build 실행 불가 | `logs/build-env.log` |
| `www.pcu.ac.kr` 접근(한 번 · 우회 없음) | `000` · `CONNECT tunnel failed, response 403` (exit 56) | `logs/pcu-reach.log` |
| `trackF-audit.ts` 담당자 내려받기 접근 기록 | **10 / 10** (PDF 쪽 1줄은 NOT VERIFIED 로 따로 적힘) | `logs/trackF-audit.log` |
| 서버 수준 대응(브라우저 아님) | B 115/115 · 153/153 · 21/21 · C race R1~R5 · 반 40/40 · 26/26 · 11/11 · auth 46/46 · D 33/33 · 38/38 | `../B/README.md` · `../C/README.md` · `../D/README.md` |

### 브라우저 13걸음 (`../../tracks-r3/F/BROWSER_CHECKLIST.md`)

| # | 걸음 | 브라우저 | 이 회차 서버 수준 증거 |
|---|---|---|---|
| 1 | 학교 계정 로그인 | **NOT VERIFIED** | auth-check 46/46(판단 함수 · 시도 제한) |
| 2 | 검사 시작(학과 맥락 · PRO) | **NOT VERIFIED** | D seed 학교 응시 36 전부 PRO |
| 3 | 임시 저장 | **NOT VERIFIED** | C race 10판 |
| 4 | 새로고침 | **NOT VERIFIED** | C stability C4 |
| 5 | 재개 | **NOT VERIFIED** | C stability C4 |
| 6 | 제출(중복 · 다른 탭) | **NOT VERIFIED** | C stability C5 · race R1 · 반 40/40 |
| 7 | 개인 결과 | **NOT VERIFIED** | race R2 · stability C7 · C8 |
| 8 | 학생 PDF 다운로드 | **NOT VERIFIED** | 없음(GM 은 E 승인 대기) |
| 9 | 담당자 조회 | **NOT VERIFIED** | D seed 집계 = SQL 10/10 |
| 10 | 담당자 거절 | **NOT VERIFIED** | D admin D2 · D3 · D8 · seed S5 |
| 11 | 모바일 | **NOT VERIFIED** | 없음 |
| 12 | 세션 만료 | **NOT VERIFIED** | 없음 |
| 13 | 오류 복구(DB 끊김) | **NOT VERIFIED** | C outage 11/11 |

서버 수준 PASS 를 브라우저 PASS 로 읽지 않는다. **CI 빌드가 통과해도 브라우저 PASS 를 선언하지 않는다**(E2E 단계 · Staging 확인이 따로 있어야 한다).

## 3. BLOCKED

| 무엇 | 까닭 | 푸는 것 |
|---|---|---|
| `npm ci` · typecheck · production build | npm 레지스트리 막힘 · 워크플로 미승인 | CI 승인(`../CORE_APPROVAL_REQUESTS_BCDF.md` A1) |
| PC · 모바일 E2E 13걸음 | Staging 미생성(인프라 생성 승인 전 금지) | Staging 승인(A2) |
| 학생 GM PDF | KODATA 학생 배포 권리 · 기업 수치 원문 대조 · E 패키지 승인 | 사업주 · PM |
| 운영 확인 | `app.careermatri.com` 정책상 막힘 · 운영 무단 접근 금지 | 사람 |

## 4. NOT VERIFIED — 남은 미해결 (3차 문서에서 · 이 회차 다시 확인)

분류는 3차 `00_의사결정.md` 의 배포 게이트를 따른다. 게이트를 막는 것은 출시 차단(P0 상당), 나머지는 P1 상당으로 적는다.

| 분류 | 무엇 | 이 회차 확인 | 근거 |
|---|---|---|---|
| **출시 차단 · 게이트 5** | **파기 구멍**: 탈퇴 뒤에도 `v3_experiences`(제목 · `note_text`)가 남는다 | `src/lib/erasure.ts` 에 `v3_experiences` **0회** | `../../tracks-r3/E/README.md` · 00_의사결정 D9 |
| **출시 차단 · 게이트 5** | KODATA 학생 배포 권리 미확정 · 기업 공식 수치 원문 대조 0건 → GM 학생 배포 OFF 유지 | 변화 없음 | `../../tracks-r3/A/README.md` · D6 |
| **출시 차단 · 게이트 1 · 2 · 4** | production build · 브라우저 E2E 0걸음 | `logs/build-env.log` | 위 |
| P1 | 실험 HTML 잔재 `var/pdf-gm/gm-student-*.html` | **5개 남아 있음**(105 · 426 · 428 · 430 · 465 · gitignore 됨 · 지우지 않음 — 이 트랙 파일 아님) | E README 다음 행동 3 |
| P1 | API 계약 `c5f22344` 운영 병합 승인 대기 | 변화 없음 | `../C/PM_REQUEST_API_CONTRACT.md` |
| P1 | GM 글꼴(Pretendard) 이미지 포함 방식 미결 | 변화 없음 | `../../tracks-r3/E/README.md` |
| P1 | 처리방침 GM 자료 반영 · 학교 발급 계정 동의 절차 | 변화 없음 | `../../tracks-r3/F/PRELAUNCH_CHECK.md` · D8 |
| P1 | 담당자 재응시 상품 줄(`CM_V3_CAMPUS_PRO`): Staging · 운영에 `npm run db:upgrade` 한 번 필요 | 운영 미확인 | CLAUDE.md R35 |
| — | 운영 백업 복구 · 운영 파기 · 운영 요약 PDF 접근 기록 | 로컬만 | PRELAUNCH_CHECK |

## 5. 다음 행동

1. PM: CI 워크플로 승인 → `pcu-verify.yml.draft` 를 `.github/workflows/pcu-verify.yml` 로 두고 손으로 한 번(typecheck · build · E2E).
2. PM: Staging 생성 승인 → 13걸음을 사람이 PC · 모바일(360 · 390)로 밟고 걸음마다 캡처 · HTTP 상태 · 서버 로그 줄 · 명령 · Git SHA. 하나라도 없으면 그 걸음은 NOT VERIFIED.
3. Core: `erasure.ts` 에 `v3_experiences` 추가(E 패키지 01) — 승인 뒤.
4. 사업주: KODATA 권리 · 처리방침.
5. 위가 끝나면 배포 게이트 여섯을 다시 판정. **지금 판정: 정식 배포 불가**(게이트 PASS 0).
