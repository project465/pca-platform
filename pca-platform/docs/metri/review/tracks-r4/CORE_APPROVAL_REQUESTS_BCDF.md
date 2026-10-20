# 4차 승인 요청 — Track B · C · D · F

작성 2026-10-20 · HEAD `697b4b19` · 받는 사람: 본체 총괄 PM · Core · 사업주.
**이 회차는 아래 어느 것도 하지 않았다**(공통 금지: 측정 · 채점 · 공통 Core · DB/API 계약 · 인증 · PDF 엔진 · 병합 · 인프라 · 운영 DB).
승인이 오면 그 항목만 따로 수행하고 증거를 남긴다.

| # | 승인 받을 것 | 담당 | 위험 | 풀리는 것 | 근거 |
|---|---|---|---|---|---|
| A1 | **CI 워크플로 `pcu-verify` 추가**(`contents: read` 하나 · 손으로 또는 `[pcu-verify]` · 일회용 DB · 합성 계정 · 글 결과만 7일) | PM | 낮음 — 쓰기 · 배포 · 비밀값 없음 · 파일 하나 지우면 되돌림. 러너 1회 30~60분 | `npm ci` · typecheck · production build · 브라우저 E2E(B `pcu:coverage` · C 두 탭 · D `pcu:ops`) — 지금 전부 NOT VERIFIED | `tracks-r3/F/CI_AND_APPROVAL_REQUEST.md` · 초안 `tracks-r3/F/ci/pcu-verify.yml.draft` · `F/logs/build-env.log` |
| A2 | **Railway Staging 생성**(운영과 분리 · 새 Postgres · 평소 0 replica · 검증 때만 켬 · 시험 계정만) | PM · 사업주(비용) | 중간 — 변수 · DB 를 운영과 섞으면 사고. 운영 환경 복제 금지 · 운영 덤프 반입 금지로 막음 | PC · 모바일 13걸음 · 세션 만료 · 운영 요약 PDF 접근 기록 · 재응시 | `tracks-r3/F/STAGING_PLAN.md` · `BROWSER_CHECKLIST.md` |
| A3 | **API 계약 `c5f22344` 운영 병합**(`{ok:false}` 가 나오는 경우 확장 · 반환 꼴 그대로) | PM | 낮음 — 소비자 한 화면(`screen.tsx`). 거절하면 제출 뒤 메모 기록 · 거짓 `저장됨` 이 다시 열림 | C 3차 P1 의 운영 반영 | `C/PM_REQUEST_API_CONTRACT.md` · `tracks-r3/C/API_CONTRACT_REVIEW.md` |
| A4 | (선택) `ok:false` 에 `reason` 칸 추가 · 다른 탭 제출 안내 문구 | PM | 낮음 — 반환 꼴 확장 · 문구 판본 갱신 | `저장 실패` 가 계속 되풀이되는 경우의 안내 | 같은 문서 3-2 |
| A5 | **파기 목록에 `v3_experiences` 추가**(제목 · `note_text`) · `erasure.ts` 가 `purgeGm*` 를 부르게 함 | Core · PM | 중간 — 공통 파기 변경 · 결제 5년 보존과의 양립 검토 필요. 하지 않으면 탈퇴 뒤 자유입력이 남음(배포 게이트 5 BLOCKED) | 게이트 5(파기) 일부 | `tracks-r3/E/README.md` · `tracks-r3/E/APPROVAL_PACKAGE.md` 01 · 이 회차 `erasure.ts` 에 0회 확인 |
| A6 | **`eligible()` 학부 `"ME"` 고정**(`src/lib/me-v3/runtime/routing.ts:247`): 경영학 학부를 거친 경영학과 대학원생이 `NON_ME_GRADUATE` 로 거절됨 | 사업주 | 중간 — 응시 자격 정책 · 측정 범위와 묶임 | 대학원생 응시 자격 | CLAUDE.md `고치지 않고 적어 두는 것`(9685행) · 이 회차 코드 그대로 확인 |
| A7 | 자율전공 학생이 **고른 전공을 기억해 두는 칸**(DB 변경이라 이전 회차부터 보류) | 사업주 · Core | 중간 — DB 스키마 · 집계 · 등급이 함께 바뀜 | 자율전공 재개 · 집계의 전공 줄 | CLAUDE.md 9252 · 9434행 · `B/logs/trackB-routing.log` |
| A8 | 담당자 재응시 상품 줄(`CM_V3_CAMPUS_PRO`)을 Staging · 운영에 올리는 `npm run db:upgrade` 한 번 | PM · 사업주(운영 DB) | 낮음 — 꺼 둔 상품 한 줄 추가 · 운영 DB 쓰기라 무단 금지 | 운영에서 재응시 열기(로컬 D7 은 통과) | CLAUDE.md R35 · `D/logs/trackD-admin.log` D7 |
| A9 | 등록부 Catalog `verification` 올리기(공식 원문 대조 뒤) · 계보 후보 6 확정 | 사업주(원문 대조) → Core(등록부) | 낮음 — 학생 판정 불변. 대조 없이 올리면 확인 안 된 것을 확인됐다고 적게 됨 | B 공식 교육과정 NOT VERIFIED 해소 | `B/SUPPORT_MATRIX.md` · `B/logs/pcu-reach.log`(403) |
| A10 | KODATA 학생 배포 권리 · 처리방침에 GM 자료 반영 · 학교 발급 계정 동의 절차 | 사업주 · 법률 | 높음 — 권리 · 개인정보. 그때까지 GM 학생 배포 OFF · 담당자 개인 PDF 기본 거절 유지 | 게이트 5(권리 · 개인정보) | `tracks-r3/F/PRELAUNCH_CHECK.md` · 00_의사결정 D6 · D8 |
| A11 | 실험 HTML 잔재 `var/pdf-gm/gm-student-*.html` 5개 정리 | Track E · PM | 낮음 — gitignore 된 로컬 파일 · 학생 자료 모양 | 잔재 정리 | `tracks-r3/E/README.md` 다음 행동 3 · `F/README.md` |

## 닫힌 것 (승인 불필요 · 브라우저만 남음)

| 무엇 | 상태 | 남은 것 |
|---|---|---|
| 학교 계정이 쿠키 없이 `/v3/start` 를 치면 개인 응시가 열리던 길 | R35(2026-10-19)에서 `src/lib/campus/start-gate.ts` 로 닫힘 | 브라우저 NOT VERIFIED |
| 로그인 시도 제한 없음 | 2026-10-11 회차에서 닫힘 · 이 회차 `auth-check` ⑯ 아홉 통과(`C/logs/auth-check-realpg.log`) | 브라우저 로그인 NOT VERIFIED |
| 반 전체 동시 제출 P0(`93ba9265` · 계약 변경 없음) | 이 회차 반 40명 40/40(`C/logs/race-realpg-r4.log`) | 운영 풀 크기 · Staging 1회 |

## 권고 차례

A1 → A3 → A2 → (A2 위에서) 13걸음 · A8 → A5 · A10 → 배포 게이트 여섯 재판정. A6 · A7 · A9 는 출시 게이트와 따로 사업주 판단.
