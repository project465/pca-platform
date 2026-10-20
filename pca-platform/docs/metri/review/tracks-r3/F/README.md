# Track F · 출시 검증 (3차 신설)

목표: 학생이 **브라우저에서** 검사 → 제출 → 결과 → PDF 까지 가는 것을 증명한다.
이 회차의 결론: **브라우저 증명은 아직 0 걸음이다.** 막힌 까닭과 그것을 푸는 승인 요청 · 계획을 냈고,
허용된 범위에서 서버 수준 검증과 출시 점검을 실제로 돌려 결함 둘을 고쳤다.

## 실제 구현

| 무엇 | 파일 | 커밋 |
|---|---|---|
| 학교 담당자의 내려받기 접근 기록(명단 CSV · 학과 집계 CSV · 운영 요약 PDF) · 기록 실패 시 내보내지 않음 | `src/lib/campus/export-audit.ts` · `src/lib/audit.ts` · `src/app/org/v3/export/*/route.ts` · `src/app/org/v3/report.pdf/route.ts` | Track F 커밋 |
| 그 검사 | `scripts/lab/trackF-audit.ts` | 같은 커밋 |
| CI 워크플로 **초안**(저장소에 두지 않음) | `ci/pcu-verify.yml.draft` | 문서 |
| (Track C 와 공유) 반 전체 동시 제출 실패 P0 수정 | `src/lib/me-v3/runtime/session.ts` | `93ba9265` |

## 테스트 증거

| 검사 | 결과 | 로그 |
|---|---|---|
| `trackF-audit.ts` (실제 pg · 격리 시드 DB) | BEFORE `55b20bfb` **5/10** → AFTER **10/10** | `logs/trackF-audit-before-55b20bfb.log` · `logs/trackF-audit.log` |
| 백업 → 빈 DB 복구 드릴(로컬 · `READ_ONLY=1`) | 14표 줄 수 같음 · 제약 10 · 외래키 218 · 굳은 결과 4장 | `logs/backup-plan.log` · `logs/backup-restore.log` |
| 서버 수준 E2E 대응표 | 13걸음 가운데 10걸음에 서버 수준 증거(C · D) | `BROWSER_CHECKLIST.md` |

BEFORE 로그의 `통과` 셋(누가 · 범위 · 이름 없음)은 **앞서 AFTER 가 적어 둔 줄을 읽은 것**이라 뜻이 없다.
뜻 있는 줄은 `기록이 한 줄 늘었다` 류의 셈 넷과 F3 · F4 이고, 다섯 다 BEFORE 에서 걸렸다.

## BLOCKED

| 무엇 | 까닭 | 푸는 것 |
|---|---|---|
| `npm ci` · typecheck · production build · 브라우저 E2E | 이 환경 npm 레지스트리 막힘(네트워크 정책) · 기존 워크플로는 다른 가지 전용 | `CI_AND_APPROVAL_REQUEST.md` 승인 |
| Staging 브라우저 13걸음 | Staging 미생성(인프라 생성 승인 전 금지) | `STAGING_PLAN.md` 승인 |
| 학생 GM PDF | KODATA 권리 · 기업 수치 원문 대조 · E 패키지 승인 | 사업주 · PM |

## NOT VERIFIED

- 13걸음 전부(브라우저) · 모바일 · 세션 만료 · 운영 PDF 다운로드
- 운영 요약 PDF 의 접근 기록(코드 자리만 확인 · 그리는 브라우저 필요)
- 운영 백업 복구 · 운영 파기 · 처리방침 법률 검토 · 학교 동의 절차

## 다음 행동

1. PM: CI 워크플로 승인 → typecheck · build · 브라우저 E2E 를 러너에서 한 번
2. PM: Staging 생성 승인 → `BROWSER_CHECKLIST.md` 13걸음 · 증거 묶음
3. 사업주: KODATA 학생 배포 권리 · 처리방침에 GM 자료 반영 여부
4. 그 셋이 끝난 뒤 `PRELAUNCH_CHECK.md` 의 배포 게이트 여섯을 다시 판정
