# KUS 변경 요청서 (총괄 PM 승인 전 · 미적용)

**R2 갱신(2026-10-20).** CR-01 · CR-02 · CR-03 은 적용할 수 있는 patch 와 회귀 근거가 `docs/kus/cr/` 에 있다(README 참고). 저장소에는 적용하지 않았다.

작성 2026-10-20 · 가지 `claude/ecstatic-cori-sv6lh5` · 기준 커밋 `4f02d79b`

KUS R1 은 공통 Core · 공통 DB 계약 · 공통 등록부 · 다른 기관 파일을 **한 줄도 고치지 않았다**
(`.github/workflows/kus-verify.yml` 의 `공통 파일 무변경 확인` 단계가 센다). 아래는 KUS 가 실제로
운영에 서려면 공통 쪽에서 정해야 하는 일이다. **승인 전에는 손대지 않는다.**

| 번호 | 대상 | 무엇을 | 왜 | 급한 정도 |
|---|---|---|---|---|
| KUS-CR-01 | `sites/pca-platform/content/campus-universities.json` (배재대 소유 구역) | KUS 블록을 fixture(`scripts/fixtures/campus-kus.json`)에서 운영 등록부로 옮긴다 | fixture 는 `APP_ENV=production` 에서 무시된다(`campusFixturePath`). 지금 KUS 는 시연·Staging 에서만 선다 | 운영 전 필수 |
| KUS-CR-02 | `deploy/db-chain.json` | `db/kus/schema_kus.sql`(표 둘: `kus_visit_programs` · `kus_company_visits`)을 체인 끝에 더한다 | 공통 DB 계약 변경이다. 지금은 KUS 시연 DB 에 손으로 올린다 | 운영 전 필수 |
| KUS-CR-03 | `src/lib/campus/students.ts` `checkStudent` | **Core 가 없는 학과의 학생에게도 계정을 발급**할 수 있게 한다(예: `core_code = null` 인 `PENDING` 맥락으로 `campus_students` 에 적고, 검사 시작은 지금처럼 `statusOf` 가 막는다) | 지금은 Core 매핑이 없는 자리를 거절한다(`어느 전공 검사로 이을지 아직 정해지지 않은 자리`). KUS 34자리 가운데 Core 가 붙은 자리는 5개(융합경영 둘 · 컴퓨터소프트웨어 · 전자및정보공학 · 정부행정)이고 자유전공 4자리는 전공 선택 경로로 계정을 받는다. **나머지 25자리의 학생은 로그인 계정조차 못 받는다**(R1 에서 `checkStudent` 로 확인: `KUS26_EMC` 거절). 기업탐방 기록은 검사와 무관하게 남길 수 있어야 한다 | **가장 급함** — 학생 명단을 받기 전에 정해야 한다 |
| KUS-CR-04 | 측정 동결 구역(`src/lib/me-v3/scoring/**`) · 결과 문장 | CONTRA 사례 검토: 모든 영역에서 `직접 정했고 그 결과가 쓰였다` 를 고르고 근거 체크리스트를 **하나도 고르지 않은** 응답이 `확인된 판단 32칸` 과 머리 상태 `정리만 하면 돼요` 를 받는다. 응답 품질은 `LOW_VARIANCE` 로만 서고 `CHECKLIST_MISMATCH_HIGH` 는 우선순위에서 가려진다 | KUS 화면은 응답 품질을 머리에 적고 근거 0 · 근거가 선 영역 0 을 함께 보이지만, 판정을 바꾸지는 않았다(공통 채점 변경 금지). 측정 담당이 의도된 동작인지 판정해야 한다. 재현: `scripts/kus/verify.ts` 의 CONTRA | 검토 요청 |
| KUS-CR-05 | 공통 PDF(`src/lib/me-v3/result/pdf.ts` `drawResultPdf`) | 결과 주소를 인자로 받게 한다(전주대 요청 C9 와 같은 내용) | 공통 PDF 가 `/v3/{id}/result` 를 못 박고 있어 학교 묶음을 그릴 수 없다. KUS 는 전주대처럼 HTML 한 벌을 `setContent` 로 뽑는 따로 된 길(`src/lib/kus/report-pdf.ts`)을 썼다. 합치면 두 길이 하나가 된다 | 정리 |
| KUS-CR-06 | 상위 운영 단위(새 구조) | KUS(학생 20) + 세종일자리경제진흥원(구직자 10) **공동 프로그램**을 묶는 상위 단위 | 두 기관은 별도 기관이고 개인 자료가 서로 보이지 않아야 한다. 묶는 단위는 **집계만** 읽는 쪽으로 제안한다: `programs(id, name, funder_org_id)` + `program_orgs(program_id, org_id)` 를 두고, 프로그램 화면은 기관별 `campusV3`·탐방 집계를 **5명 규칙을 지난 수로만** 나란히 놓는다. 개인 결과 · 응답 · 탐방 본문은 어느 쪽 담당자에게도 열지 않는다. 비용 부담 주체(진흥원)를 `funder_org_id` 로 적되 열람 권한을 주지 않는다 | 구조 검토만 · 구현하지 않음 |
| KUS-CR-07 | 학교 로그인 문구(`src/app/campus/[universityCode]/login/page.tsx`) | `아이디는 학번입니다` 가 모든 학교에 고정이다. KUS 아이디 규칙이 정해지면 등록부 칸으로 옮긴다 | 시연 계정은 `qa-kus-…` 라 문구와 다르다(시연 전용 문제) | 낮음 |

## 승인 없이 하지 않은 것

- 공통 검사 문항 · 채점 · 결과 모델 · 측정 동결 파일 수정
- 공통 DB 체인(`deploy/db-chain.json`) 수정
- 배재대 소유 구역(`campus-universities.json` · `src/lib/campus/**` · `src/app/campus/**`) 수정
- 다른 기관 가지(`feature/jju-campus` · `claude/epic-galileo-lrvgxr` · `feature/shared-core`) 병합
- 운영 · Staging 배포, Railway 자원 생성
- 담당자에게 개인별 결과 열람 권한 부여
- 학교 로고 · 교표 사용
