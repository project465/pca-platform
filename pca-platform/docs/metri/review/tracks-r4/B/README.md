# Track B 4차 · 학과 — PCU 2026 · 2027 지원 학과 행렬 · 학과별 결과 · 자율전공

기준 HEAD `feb3ea13`(B 검사 셋 실행 시점). 실행 도중 다른 트랙이 `98e08907` · `697b4b19` 를 올렸으나 바뀐 코드는
`src/lib/me-v3/report-gm/` 새 파일 둘 · `scripts/lab/gm-ed.ts` · `trackE-r4.ts` · `data/report-gm/biz-editorial.v1.json` 뿐이라
학교 진입 · 응시 · 채점 경로와 겹치지 않는다(`git diff --stat feb3ea13 697b4b19 -- src scripts data db sites deploy`).
측정 · 채점 · Core · 등록부 · 학과 콘텐츠를 **한 글자도 고치지 않았다**(전공 Core 측정/판정 강제 수정 없음).

## 1. 실제 구현

- 코드 · 콘텐츠 변경 **없음**. 새로 둔 것은 읽기 전용 행렬 스크립트 하나: `matrix.ts`(이 폴더). 등록부 모듈
  `src/lib/campus/registry.ts` 의 내보낸 함수(`leavesOf` · `mappingStatusOf` · `readinessOf` · `statusOf` ·
  `specializationName` · `replacesOf`)만 부르고 DB 에 닿지 않는다. 결과: **`SUPPORT_MATRIX.md`** · `support-matrix.json`.
- 행렬은 **미리보기 없이**(`V3_PREVIEW_OPEN` 미지정 · `{preview:false}`) 잰 학생 실제 상태다. 학과 층(먼저 읽는 영역 ·
  역할 · 산업 · 도구·기술 · 근거 예시 · 행동 제안)은 같은 회차 `trackB-content.ts` 출력 `dept-content.json` 에서 잇는다.

### 지원 학과 행렬 요약 (`SUPPORT_MATRIX.md`)

| Catalog | 자리 | 학생 목록 | 매핑 EXACT | RESULT_READY | ASSESSMENT_READY | CATALOG_ONLY | 학생 상태 READY | Core 수 | 학과 층 |
|---|---|---|---|---|---|---|---|---|---|
| `PCU_CUR` 2026 · ACTIVE | 57 | 57 | 56 | **1** (`PCU26_BIZ`) | 55 | 1 (`PCU26_SELFDESIGN`) | 1 | 19 | 56 |
| `PCU_2027` 2027 · FUTURE | 60 | 60 | 59 | 0 | 59 | 1 (`PCU27_SELFDESIGN`) | 0 | 19 | 59 |

- 학생에게 열린 자리는 `student_open` LEAF 목록 그대로 `PCU26_BIZ` **하나**다(Canary). 나머지 자리는 자료가 다 섰고
  (ASSESSMENT_READY) 학생 화면에는 `준비 중` 으로 선다. 공개 범위를 넓히는 것은 이 트랙 범위 밖(사업주 · PM).
- 자율전공(`PCU26_SELFDESIGN` · `PCU27_SELFDESIGN`)은 Core 를 갖지 않는 `routing_only` 자리다: 학생이 전공을 고른 뒤
  그 전공의 Core 로 잰다. 성인학습자(`ADULT_LEARNER`) 2026 6 · 2027 6, 외국인(`INTERNATIONAL`) 2026 6 · 2027 7 자리는
  빼지 않고 표시만 한다.

## 2. 테스트 증거

| 검사 | 결과 | 로그 · 표 |
|---|---|---|
| `trackB-dept-e2e.ts` (cm_dev · 실제 node-postgres · 동시 4 · 7분 59초) — 학교 등록 → 학교 맥락 응시 → 끝까지 답함 → 제출 → 결과 모델 · 판본 · 학교/학과 표시 | 학과 자리 **115 / 115** · 전체 **153 / 153** · 학생별 결과 갈림 **19 / 19 Core** | `logs/trackB-dept-e2e.log` · `DEPT_E2E.md` |
| `trackB-content.ts` (격리 5433 `cm_iso_c` · 155초) — 같은 Core 학과 짝의 여섯 칸 | 짝 176 · GENERIC **0** · 개편 계보 후보 6 · Gap 갈림 19/19 · 사람 갈림 19/19 | `logs/trackB-content.log` · `DEPT_CONTENT.md` · `dept-content.json` |
| `trackB-routing.ts` (격리 5433 `cm_iso_c` · fixture) — `PCU26_SELFDESIGN → PCU26_BIZ` · `PCU27_SELFDESIGN → PCU27_AISW_SOFTWARE` · 집계 | **21 / 21** | `logs/trackB-routing.log` · `ROUTING_SELFDESIGN.md` |
| `matrix.ts` (DB 없음) — 2026 · 2027 모든 고르는 자리 → Core · 갈래 · 준비도 | 자리 117 = 57 + 60 · 학과 층 연결 115 | `logs/matrix.log` · `SUPPORT_MATRIX.md` |
| `www.pcu.ac.kr` 접근 확인(한 번) | **000 · CONNECT 403** (exit 56) | `logs/pcu-reach.log` |

같은 Core 안에서 Evidence/Gap 이 학과에 따라 갈리지 않는 것은 설계다(측정 동결). 학과마다 갈리는 것은 갈래 다섯 층이다.

## 3. BLOCKED

- **2026/2027 공식 교육과정 원문 대조**: `www.pcu.ac.kr` CONNECT 403(네트워크 정책 · 우회하지 않음). 두 Catalog 모두
  `verification = SECONDARY_EVIDENCE` · `verified_at` 없음(근거 `docs/metri/evidence/PCU_OFFICIAL_EVIDENCE_2026_2027.md`).
  개편 계보 후보 6(`lineage_candidates`) 확정도 같은 까닭으로 보류.

## 4. NOT VERIFIED

- **공식 교육과정 대조 전부**: 행렬의 학과 · 전공 이름, 학과별 먼저 읽는 영역 · 역할 · 도구·기술 · 근거 예시 · 행동 제안이
  PCU 2026/2027 공식 교육과정과 맞는지.
- 근거 예시 · 행동 제안이 그 전공에서 실제로 나오는 경험인지(전공자 검토).
- 학과 고르기 · 학교 시작 · 결과 화면 · 모바일(브라우저 · Next 빌드 불가).

## 5. 다음 행동

1. 공식 원문에 닿는 자리(사람 또는 허용된 네트워크)에서 `SUPPORT_MATRIX.md` 를 2026 · 2027 교육과정과 대조 →
   맞으면 Catalog `verification` 을 올리는 등록부 변경을 **별도 요청**(이 트랙은 등록부를 고치지 않았다).
2. 계보 후보 6 확정(같은 근거).
3. CI 승인 뒤 `pcu:coverage`(브라우저 · 자리 115) — `../F/README.md` · `../CORE_APPROVAL_REQUESTS_BCDF.md` A1.

```bash
DATABASE_URL=postgres:///cm_dev V3_PREVIEW_OPEN='*' WORKERS=4 OUT=docs/metri/review/tracks-r4/B npx tsx scripts/lab/trackB-dept-e2e.ts
PGPORT=5433 DATABASE_URL=postgres:///cm_iso_c V3_PREVIEW_OPEN='*' OUT=docs/metri/review/tracks-r4/B npx tsx scripts/lab/trackB-content.ts
PGPORT=5433 DATABASE_URL=postgres:///cm_iso_c V3_PREVIEW_OPEN='*' V3_CAMPUS_FIXTURE=scripts/fixtures/campus-zztest.json OUT=docs/metri/review/tracks-r4/B npx tsx scripts/lab/trackB-routing.ts
OUT=docs/metri/review/tracks-r4/B npx tsx docs/metri/review/tracks-r4/B/matrix.ts      # V3_PREVIEW_OPEN 없이
```

이 환경에서는 `npx tsx` 대신 저장소 밖 임시 실행기(`run-realpg` = 실제 node-postgres 8.16.3 · `run` = 대체 드라이버)로 돌렸다.
실행기는 타입을 검사하지 않는다.
