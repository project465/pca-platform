# F · Railway Staging 계획 (운영과 분리 · 필요할 때만 켠다)

작성 2026-10-20 · **상태: 계획. 인프라 생성 · 배포 · 운영 DB 접근은 본체 PM 승인 전 금지 — 아무것도 만들지 않았다.**

## 1. 원칙

| 원칙 | 어떻게 |
|---|---|
| 운영과 분리 | Railway **새 환경** `staging` · **새 Postgres** · 운영 DB 연결 문자열을 공유하지 않는다. 운영 볼륨 · 도메인을 붙이지 않는다 |
| 비용 절약 | 평소 **0 replica(멈춤)**. 검증 회차에만 켜고 끝나면 멈춘다. Postgres 는 작은 크기 · 백업 1일 |
| 공개 전 표시 | `APP_ENV=staging` · `STAGING_BASIC_AUTH` · `noindex` (코드가 이미 처리: `isStaging()`) |
| 가짜 결제 | staging 에서만 `ALLOW_MOCK_PAYMENTS=yes` 가 먹는다(운영에서는 코드가 거절) |
| 자료 | 시험 계정만(`TEST_ACCOUNTS.md`). 실제 학생 명단 · KODATA 원본 넣지 않음 |

## 2. 켜는 차례 (승인 뒤 · 사람이 Railway 화면에서)

1. 프로젝트 → **New Environment** `staging` (운영 환경을 복제하지 않는다 — 변수가 따라온다)
2. `staging` 에 **New → Database → PostgreSQL**
3. 서비스: 이 가지(`claude/happy-faraday-q85c13`)를 가리키는 서비스 하나 · Dockerfile 그대로
4. 변수 일곱: `APP_ENV=staging` · `DATABASE_URL=${{Postgres.DATABASE_URL}}` · `AUTH_SECRET`(새로) · `STAGING_BASIC_AUTH`(새로) ·
   `PLATFORM_URL`(staging 주소) · `V3_PREVIEW_OPEN=BIZ_CORE_V1` · `REPORT_PDF_DIR=/app/var/reports`(볼륨 하나 붙임)
5. 서비스 Shell: `npm run staging:bootstrap` (APP_ENV 가 staging 이 아니면 한 줄도 쓰지 않고 멈춘다) → 비밀번호 표가 **그 자리에서 한 번만** 보인다
6. `npm run ops:check` · `npm run db:verify` 로 UNKNOWN 0 확인
7. `BROWSER_CHECKLIST.md` 열세 걸음을 사람이 밟고 캡처 · HTTP 상태 · 서버 로그 줄 · Git SHA 를 기록
8. 끝나면 서비스 replica 0 · DB 는 다음 회차까지 유지(또는 지움)

## 3. 켜는 때

| 회차 | 무엇을 본다 | 예상 시간 |
|---|---|---|
| CI 승인 · 통과 뒤 1회 | 학생 E2E · PDF · 담당자 집계 · 권한 거절 · 모바일 | 2~3시간 |
| 커밋 B(API 계약) 승인 뒤 | 두 탭 경합 · `저장 실패` 표시 | 30분 |
| GM 승인 패키지 적용 뒤 | GM 다운로드 · 파기 · 볼륨 재배포 | 1시간 |

## 4. 하지 않는 것

- 운영 환경 변수 · DB · 볼륨 · 도메인 수정 · 운영 DB 덤프 반입
- staging 에 실제 학생 명단 업로드 · 외부 메일 발송(SMTP 비움)
- 브라우저 확인 없이 PASS 표기
