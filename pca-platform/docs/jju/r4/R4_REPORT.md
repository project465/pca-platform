# 전주대 R4 보고 (진행 중)

기준 HEAD `9364bca1`(지시서와 같음을 직접 확인) · 가지 `feature/jju-campus` · 2026-10-20

## 받은 것

`JJU_R4_PLATFORM_DEMO_AND_COMMAND.zip`: 정적 시연 `index.html` · `report-data.json` · R3 PDF 셋 · `CLAUDE_CODE_NEXT.md`.
정적 시연은 지시대로 **정보 위계 참고용**으로만 본다. 그 안의 데이터와 문구를 제품 코드에 옮기지 않았다.

## Gate 0 — C16 (이번 회차에 한 것)

사용자(본체 PM)가 이 세션에서 `승인함 · 이 가지에 적용` 을 골랐다. 그래서 R3 의 수정안을 이 가지에 적용했다.

| 바뀐 파일 | 무엇 |
|---|---|
| `src/lib/campus/students.ts` | `provisionStudent()` 를 한 거래로 묶고 아이디별 advisory lock. 이미 있는 아이디가 같은 학교 학생이 아니면 `LoginTaken`(어느 칸도 바꾸지 않음 · 누구 것인지 적지 않음). 새로 만들 때 `ON CONFLICT DO NOTHING` · 학교 칸을 덮지 않음 |
| `src/lib/campus/manage.ts` | 학생 추가는 `{ ok:false, why }`, CSV 는 그 줄을 `rejected` 로 |
| `scripts/pcu-students.ts` · `scripts/staging-bootstrap.ts` | rotate 경로의 `LoginTaken` 을 거절 줄로 받고 이어 간다 |
| `scripts/jju-access.ts` | R2 의 `코드 읽기` 고정 줄을 실제 rotate 시험으로 바꿨다 |

검증(`tests/logs/SUMMARY.txt` · 오프라인 하네스 · PostgreSQL 16):

- `jju-c16` **8/8**: 양방향 단건 추가 · 담당자·B2C 아이디 · CSV · rotate · 비밀번호 재발급 · 동시 생성 → 전부 거절 · 줄 변화 0 · 동시 생성은 한쪽만 성공.
- `jju-access` **26/26**(R3 23/26). `jju-verify` 42/42 · `jju-report` 14/14 · `jju-report-http` 20/20.
- 공통 회귀 13묶음 통과 · 동결 다섯 기록 그대로.
- 오염 확인 질의(`c16_readonly_audit.after.txt`): 학과·학교 불일치 0 · 학생 다중 소속 0 · 소속 없는 학교 학생 0. 넷째 질의에 R2 재현이 남긴 감사 기록 3줄이 그대로 잡힌다(되돌린 줄의 감사 기록 · 의도한 대로).
- typecheck: 바뀐 파일의 오류 수가 수정 전후 26 으로 같다(전부 패키지 타입 부재에서 오는 것).

**아직 아닌 것**: 실제 bcrypt·Auth.js 를 거친 서버 액션 E2E, 운영 DB 에서 오염 확인 질의, main/PCU 가지 병합과 운영 반영(본체 병합 결정).

## Track A~E

네트워크 정책이 그대로라(`registry.npmjs.org` DNS 응답 없음 · `www.jj.ac.kr`·`app.careermatri.com` CONNECT 403) Next 빌드 · Auth.js 로그인 · 브라우저 캡처 · 학생 E2E UI 는 **NOT VERIFIED** 다. 사용자가 네트워크를 허용한 뒤 이어서 돌린다.
