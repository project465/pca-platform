# F · 배포 전 점검 — 개인정보 · 권한 · 재배포 권리 · 백업 · 파기 · 접근 기록 (작업 5)

판정은 **이 저장소와 격리 DB 에서 확인한 것까지**다. 법률 판단이 아니며 운영에서 돌린 것은 하나도 없다.

| 항목 | 지금 상태(근거) | 판정 | 남은 일 · 누가 |
|---|---|---|---|
| 개인정보 처리방침 | `sites/careermetri/legal/02-privacy.md`(7.8KB) 가 기관 부여 ID · 의뢰 기관 명단 발급 · 익명 집계 제공 · 보유 · 파기(사람을 떼어 냄)를 적는다. 운영 이미지에 담기는지 `image:check` 가 센다(전 회차) | 문서 있음 · **법률 검토 NOT VERIFIED** | GM PDF(기업 후보 · 2차 출처) 를 학생에게 열기 전 처리방침에 그 자료와 보관 자리를 더할지 — 사업주 · 법률 |
| 수집 동의 | `consent_documents` · `consent_records` 표(`db/schema_phase2_1.sql`) · 가입 쪽 동의 기록 실패를 성공으로 바꾸지 않음(R30대 회차) | 구조 있음 · 학교 발급 계정의 동의 절차 **NOT VERIFIED** | 학교 계약서에 "의뢰 기관의 동의 절차" 가 들어가는지 — 사업주 · 배재대 |
| 학생 · 관리자 권한 | D admin 38/38 · D seed 33/33(이 회차 재실행) · 다른 학교 격리 · 담당자 개인 결과 **기본 거절**(`canReadParticipantReport` 가 어느 역할에도 없음) | **PASS (서버 수준)** · 화면 NOT VERIFIED | Staging 브라우저 #9 · #10 |
| 자료 재배포 권리 | KODATA 는 제3자 자료 · 학생 배포 권리 미확정 · 기업 공식 수치 원문 대조 0건(Track A) · GM 학생 배포 플래그 **OFF**(E 승인 패키지 `GM_STUDENT_DISTRIBUTION` 기본 거절) | **BLOCKED** | KODATA 계약상 학생 배포 가능 여부 · DART 원문 대조 — 사업주 |
| 백업 및 복구 | `scripts/backup-restore.sh` 를 로컬에서 끝까지: 받기 644KB · 표 136 · 빈 DB 에 붓기 · 14표 줄 수 같음 · 제약 10 · 외래키 218 · 굳은 결과 4장 판본째 복원(`logs/backup-restore.log` · `READ_ONLY=1`) | 로컬 **PASS** · 운영 **NOT VERIFIED** | 운영 컨테이너에서 `PLAN=1` → `RESTORE_URL` 로 한 번(사람). 참고: 소켓만 든 URL(`postgres:///db`)을 주면 스크립트가 `postgres:/db` 로 바꿔 실패한다 — 운영 URL(TCP)에서는 나지 않는다 |
| 파기 | `src/lib/erasure.ts`(사람을 떼어 냄 · 결제 5년 보존과 양립) · GM 파일 파기 함수 `purgeGm*`(2차) · **erasure → GM 연결은 승인 대기**(E 패키지 01) | 부분 | E 패키지 01 승인 · 적용 |
| 접근 기록 | 계정 추가 · 수정 · 멈춤 · 재발급 · 일괄 등록 · 재응시 허용이 `audit_logs` 에 남는다. **이 회차에 고침**: 명단 CSV · 학과 집계 CSV · 운영 요약 PDF 를 받아 간 일이 남지 않았다 → `campus.export.*` 셋 추가 · 기록 실패 시 내보내지 않음. `trackF-audit.ts` BEFORE 5/10 → AFTER **10/10** | **PASS (서버 수준)** · PDF 쪽은 코드 자리만 확인 | 담당자 화면에 내려받기 기록을 보여 줄지(새 기능 · 범위 밖) |
| 운영 장애 · 백업 | DB 를 실제로 멈췄다 띄움(C outage 11/11) · 반 40명 동시 제출(C race R5) · 백업 복구 로컬 PASS | 로컬 PASS · 운영 NOT VERIFIED | Staging 1회 |

## 정식 배포 게이트 (지시 그대로 · 지금 상태)

| # | 게이트 | 상태 |
|---|---|---|
| 1 | production 빌드 | **NOT VERIFIED** (CI 승인 대기) |
| 2 | 브라우저 학생 검사 ~ 결과 E2E | **NOT VERIFIED** |
| 3 | 데이터 격리 · 권한 | 서버 수준 PASS · 브라우저 NOT VERIFIED |
| 4 | 개인별 PDF 생성 · 다운로드 | 운영 PDF 경로 재검 없음 · GM 은 승인 대기 → **NOT VERIFIED** |
| 5 | 권리 · 개인정보 · 파기 | **BLOCKED** (KODATA 권리 · erasure 연결 승인) |
| 6 | 운영 장애 · 백업 | 로컬 PASS · 운영 NOT VERIFIED |

**여섯 모두 PASS 전에는 배재대 학생 대상 정식 배포를 하지 않는다.** 이 회차 판정: **배포 불가**.
