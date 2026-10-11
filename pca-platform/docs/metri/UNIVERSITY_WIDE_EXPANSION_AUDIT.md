# 종합대학 확장 감사 (UNIVERSITY-WIDE EXPANSION AUDIT)

**2026-10-11 · 코드와 DB 를 바꾸지 않고 읽기만 했다.** 측정 architecture 와
DB 를 크게 바꾸기 전에 멈추라는 지시에 따라, 이 회차에 고친 파일은 0개다.
아래 숫자는 전부 저장소 파일과 이 기계의 DB 에서 실제로 센 것이고,
화면이 뜬다는 이유로 PASS 를 적은 줄은 하나도 없다.

최종 상태: **UNIVERSITY-WIDE EXPANSION AUDIT READY / OWNER REVIEW REQUIRED**

---

## 1. Mechanical Engineering Audit

### 1-1. 잘 되는 것 (실제로 센 값)

| 무엇 | 실측 |
|---|---|
| 기술영역 | **12개** (TD01~TD12), 각각 `owns` 한 줄 · `subareas` 3~4 · `required_axes` 2 |
| 판단축 | **8개** (J1~J8) |
| 체크리스트 | **256항목**. 96칸(12영역 × 8축) 가운데 **빈 칸 0** · 가장 얇은 칸도 2항목 |
| 영역별 자산 | 12영역 전부 `tools` 4~5 · `artifacts` 5~6 · `verify_targets` 5~6 · `workflow` 8 · `org_outcomes` 7 |
| 산업팩 | **8개**, 각각 요구 4 · 문항 10 · `axis_emphasis` · `gloss` · `gap_language` · `result_line` · `job_aliases` · `org_mix` · `vocabulary` |
| 역할팩 | **8개**, 각각 문항 7 · `core_ref{td,rf}` · `required_axes` · `compare_with` |
| 관계표 | `td_industry` **96줄**(12×8) · `td_role` **96줄**. 강도 3단계(중심 13·있음 47·드묾 36 / 중심 19·있음 18·드묾 59) + `appears_as` + `axes_watched` |
| 결과지 | 9절 (`focus` `zones` `evidence` `gaps` `industry` `role` `plan` `region` `next`) |

**사용자가 요구한 산업 8개와 직무 7개가 전부 있다.** 산업은 이름만 있는
것이 하나도 없다: 문항마다 `domain` 과 `axis` 가 붙어 Core 의 칸을 가리키고,
`gloss` 가 그 판단을 일반 기계공학 말로 바꿔 적는다. 역할은 8개(사용자
목록 7 + 설비·보전)이고 전부 `core_ref` 로 TD 와 RF 를 가리킨다.

### 1-2. 빠진 것 (전공지식 12영역과의 대조)

사용자가 적어 주신 12영역을 지금 taxonomy 와 한 줄씩 맞췄다.

| 요구 영역 | 지금 어디에 | 판정 |
|---|---|---|
| 역학 | TD02 구조·내구 해석과 TD06 재료·강도에 **흡수** | **독립 칸 없음** |
| 재료 | TD06 재료·강도·파손 | 있음 |
| 열 | TD03 열·유체 시스템 | **유체와 한 칸** |
| 유체 | TD03 열·유체 시스템 | **열과 한 칸** |
| 동역학/진동 | TD04 동역학·진동·소음 | 있음 (체크 17로 가장 얇음) |
| 설계 | TD01 기구·제품 설계 | 있음 |
| 생산/가공 | TD08 생산·공정기술 | 있음 |
| 제어/자동화 | TD05 구동·전달·동작(`시운전과 응답 조정` 한 줄), TD12 반복작업 자동화 | **어느 칸도 제어를 맡지 않음** |
| 해석/CAE | TD02 · TD03 · TD04 셋에 나뉨 | 있음 (의도된 분할) |
| 실험/측정 | TD07 시험·계측 | 있음 |
| 시스템 | TD11 요구조건·제약·일정 | **부분** |
| 프로젝트/설계 경험 | TD11 에 겹침 | **독립 칸 없음** |

지금 taxonomy 에만 있고 요구 목록에 없는 칸 둘: TD09 장비·설비 운용 ·
TD12 반복작업 자동화·데이터. 둘 다 현장에서 쓰이는 칸이라 빼자는 말이
아니다.

### 1-3. 잘못된 정보

**없다.** 결과지가 재지 않은 것을 단정하는지 세는 검사(`v3:result:copy`
일곱째 줄, 막는 말 열 가지)와 공개 원고가 제품이 계산하지 않는 값을 적는지
세는 검사(`claims:check`)가 둘 다 통과한다. 적합도 % · percentile ·
종합 점수를 만드는 자리는 스냅샷 검사가 `total` · `fit` · `overall` ·
`composite` 를 찾아 막고 있다.

### 1-4. Information Quality (7가지 질문)

| # | 질문 | 어느 절이 답하는가 | 판정 |
|---|---|---|---|
| 1 | 지금 무엇을 설명할 수 있는가 | `#focus` · `#zones` · `#evidence` | **PASS** |
| 2 | 어떤 경험이 근거가 되는가 | `#evidence` (고르신 항목을 그대로 돌려줌) | **PASS** |
| 3 | 어떤 부분이 부족한가 | `#gaps` (무엇이 비었나 · 왜 필요한가 · 무엇을 하면) | **PASS** |
| 4 | 어떤 산업과 연결되는가 | `#industry`(고르신 **산업 하나만**) | **PARTIAL** |
| 5 | 어떤 직무와 연결되는가 | `#role`(고르신 **직무 하나만**) | **PARTIAL** |
| 6 | 다음에 무엇을 준비하는가 | `#plan` | **PASS** |
| 7 | 우리 지역에서 어떤 기업·기관을 보는가 | `#region`(기업·기관 **0줄**) | **FAIL** |

4·5 가 PARTIAL 인 까닭은 자료가 없어서가 아니다. `td_industry` 96줄과
`td_role` 96줄이 **이미 있는데 결과지가 역방향을 쓰지 않는다**: 고른 쪽
하나만 깊게 적고, `내 강한 영역 → 어떤 산업·직무로 이어지는가` 는
`/me/explore` 에만 있다. **읽는 층만 바꾸면 되는 자리라서 측정 동결에
닿지 않는다.**

7 은 데이터가 0줄이라 지금은 답할 수 없다. 자세한 것은 4·5절.

### 1-5. 수정 필요 여부

| 항목 | 성격 | 동결에 닿는가 | 판단 |
|---|---|---|---|
| 열/유체 분리 · 제어 칸 신설 · 역학 칸 · 시스템/프로젝트 분리 | taxonomy 를 고치는 일 | **측정 동결 재설계** | **STOP · 승인 필요** |
| TD04 체크리스트 보강 (17 → 20+) | 콘텐츠 | 측정 동결(checklists) | 승인 필요 |
| 결과지에 `내 영역 → 산업·직무` 역방향 | 읽는 층 | 닿지 않음 | 안전하게 가능 |
| 지역 기업·기관 | 데이터 | 닿지 않음 | 자료 확보가 먼저 |

**임의로 taxonomy 를 손대지 않았다.** TD 를 12에서 14~15로 늘리면 문항
자리와 체크리스트 96칸과 관계표 96×2 와 사람 열두 벌 지문이 전부 다시
서고, 그것은 `ME_V3_MEASUREMENT_FREEZE_1` 을 다시 여는 일이다.

---

## 2. Major Coverage Matrix

**기존 taxonomy 를 Source of Truth 로 삼았다**: `data/metri/majors_kr.json`
(METRICAREER 제안서 2026-09-16, 6계열 **28학과**, 학과마다 `departments`
별칭 목록이 이미 있다). 그리고 `sites/pca-platform/content/major-cores.json`
에 Major Core **10개**가 등록돼 있다(ME 하나가 `building`, 아홉이 `planned`).

**지금 응시할 수 있는 전공은 기계공학 하나다.** `major_programs` 표는 이
기계에서 0줄이다(시드 미실행).

| # | 전공 | 현재 상태 | Major Core | Industry | Role | Evidence | Region | 필요한 작업 |
|---|---|---|---|---|---|---|---|---|
| 1 | 기계공학 | **BUILDING** | 있음 (TD12·축8) | 8팩 · 96줄 | 8팩 · 96줄 | 체크 256 | 권역만 | TD 경계 넷 확인 · 지역 기관 자료 (기준모델) |
| 2 | 전자공학 | FOUNDATION | 등록만 (EE_CORE_V1) | 없음 | 없음 | 없음 | 권역 공유 | taxonomy·domains·checklists·blueprint 4벌 + 팩 2벌 (EE 가 전기와 한 줄) |
| 3 | 전기공학 | FOUNDATION | 등록만 (EE_CORE_V1) | 없음 | 없음 | 없음 | 권역 공유 | taxonomy·domains·checklists·blueprint 4벌 + 팩 2벌 (EE 가 전자와 한 줄) |
| 4 | 반도체공학 | 없음 | 없음 | 없음 | 없음 | 없음 | 권역 공유 | taxonomy 줄부터 신설 (새로) |
| 5 | 신소재·재료공학 | FOUNDATION | 등록만 (MSE_CORE_V1) | 없음 | 없음 | 없음 | 권역 공유 | taxonomy·domains·checklists·blueprint 4벌 + 팩 2벌 (`MSE`) |
| 6 | 화학공학 | FOUNDATION | 등록만 (CHE_CORE_V1) | 없음 | 없음 | 없음 | 권역 공유 | taxonomy·domains·checklists·blueprint 4벌 + 팩 2벌 (`CHE`) |
| 7 | 산업공학 | FOUNDATION | 등록만 (IE_CORE_V1) | 없음 | 없음 | 없음 | 권역 공유 | taxonomy·domains·checklists·blueprint 4벌 + 팩 2벌 (등록만) |
| 8 | 컴퓨터공학 | FOUNDATION | 등록만 (CS_CORE_V1) | 없음 | 없음 | 없음 | 권역 공유 | taxonomy·domains·checklists·blueprint 4벌 + 팩 2벌 (등록만) |
| 9 | 소프트웨어공학 | FOUNDATION | 등록만 (CS_CORE_V1) | 없음 | 없음 | 없음 | 권역 공유 | taxonomy·domains·checklists·blueprint 4벌 + 팩 2벌 (CS 아래 specialization) |
| 10 | 인공지능·데이터 | FOUNDATION | 등록만 (CS_CORE_V1) | 없음 | 없음 | 없음 | 권역 공유 | taxonomy·domains·checklists·blueprint 4벌 + 팩 2벌 (CS 아래 specialization) |
| 11 | 로봇공학 | 없음 | 없음 | 없음 | 없음 | 없음 | 권역 공유 | taxonomy 줄부터 신설 (ME+EE 경계) |
| 12 | 자동차·모빌리티 | 없음 | 없음 | 없음 | 없음 | 없음 | 권역 공유 | taxonomy 줄부터 신설 (ME alias 후보) |
| 13 | 에너지공학 | 없음 | 없음 | 없음 | 없음 | 없음 | 권역 공유 | taxonomy 줄부터 신설 (새로) |
| 14 | 환경공학 | 없음 | 없음 | 없음 | 없음 | 없음 | 권역 공유 | taxonomy 줄부터 신설 (새로) |
| 15 | 건축공학 | 없음 | 없음 | 없음 | 없음 | 없음 | 권역 공유 | taxonomy 줄부터 신설 (새로) |
| 16 | 토목공학 | TAXONOMY ONLY | 없음 | 없음 | 없음 | 없음 | 권역 공유 | core 등록 + 파일 4벌 + 팩 2벌 (taxonomy 만) |
| 17 | 수학·통계 | FOUNDATION | 등록만 (NS_CORE_V1) | 없음 | 없음 | 없음 | 권역 공유 | taxonomy·domains·checklists·blueprint 4벌 + 팩 2벌 (NS 아래) |
| 18 | 물리학 | FOUNDATION | 등록만 (NS_CORE_V1) | 없음 | 없음 | 없음 | 권역 공유 | taxonomy·domains·checklists·blueprint 4벌 + 팩 2벌 (NS 아래) |
| 19 | 화학 | FOUNDATION | 등록만 (NS_CORE_V1) | 없음 | 없음 | 없음 | 권역 공유 | taxonomy·domains·checklists·blueprint 4벌 + 팩 2벌 (NS 아래) |
| 20 | 생명과학 | TAXONOMY ONLY | 없음 | 없음 | 없음 | 없음 | 권역 공유 | core 등록 + 파일 4벌 + 팩 2벌 (BIO 가 바이오와 한 줄) |
| 21 | 바이오·생명공학 | TAXONOMY ONLY | 없음 | 없음 | 없음 | 없음 | 권역 공유 | core 등록 + 파일 4벌 + 팩 2벌 (BIO 가 생명과학과 한 줄) |
| 22 | 식품공학 | TAXONOMY ONLY | 없음 | 없음 | 없음 | 없음 | 권역 공유 | core 등록 + 파일 4벌 + 팩 2벌 (FOOD 는 식품영양) |
| 23 | 경영학 | FOUNDATION | 등록만 (BIZ_CORE_V1) | 없음 | 없음 | 없음 | 권역 공유 | taxonomy·domains·checklists·blueprint 4벌 + 팩 2벌 (등록만) |
| 24 | 경제학 | FOUNDATION | 등록만 (ECON_CORE_V1) | 없음 | 없음 | 없음 | 권역 공유 | taxonomy·domains·checklists·blueprint 4벌 + 팩 2벌 (등록만) |
| 25 | 회계·세무 | 없음 | 없음 | 없음 | 없음 | 없음 | 권역 공유 | taxonomy 줄부터 신설 (BIZ 아래 specialization 후보) |
| 26 | 금융 | 없음 | 없음 | 없음 | 없음 | 없음 | 권역 공유 | taxonomy 줄부터 신설 (BIZ/ECON 경계) |
| 27 | 무역·국제통상 | 없음 | 없음 | 없음 | 없음 | 없음 | 권역 공유 | taxonomy 줄부터 신설 (새로) |
| 28 | 행정학 | FOUNDATION | 등록만 (HS_CORE_V1) | 없음 | 없음 | 없음 | 권역 공유 | taxonomy·domains·checklists·blueprint 4벌 + 팩 2벌 (HS 아래) |
| 29 | 정치외교·정책 | FOUNDATION | 등록만 (HS_CORE_V1) | 없음 | 없음 | 없음 | 권역 공유 | taxonomy·domains·checklists·blueprint 4벌 + 팩 2벌 (HS 아래) |
| 30 | 사회학 | FOUNDATION | 등록만 (HS_CORE_V1) | 없음 | 없음 | 없음 | 권역 공유 | taxonomy·domains·checklists·blueprint 4벌 + 팩 2벌 (HS 아래) |
| 31 | 심리학 | FOUNDATION | 등록만 (HS_CORE_V1) | 없음 | 없음 | 없음 | 권역 공유 | taxonomy·domains·checklists·blueprint 4벌 + 팩 2벌 (HS 아래) |
| 32 | 미디어·광고홍보 | TAXONOMY ONLY | 없음 | 없음 | 없음 | 없음 | 권역 공유 | core 등록 + 파일 4벌 + 팩 2벌 (MEDIA 는 미디어영상) |
| 33 | 국어·언어·문학 | TAXONOMY ONLY | 없음 | 없음 | 없음 | 없음 | 권역 공유 | core 등록 + 파일 4벌 + 팩 2벌 (taxonomy 만) |
| 34 | 교육학 | 없음 | 없음 | 없음 | 없음 | 없음 | 권역 공유 | taxonomy 줄부터 신설 (SPEDU(특수교육)만 있음) |
| 35 | 상담·아동청소년 | 없음 | 없음 | 없음 | 없음 | 없음 | 권역 공유 | taxonomy 줄부터 신설 (SOCWEL(사회복지)만 있음) |


### 2-1. 요약

| 상태 | 수 |
|---|---|
| BUILDING (실제 응시 가능) | **1**, 기계공학 |
| FOUNDATION (등록만, 파일 0벌) | **13** 줄 (core 9개가 여러 전공에 걸림) |
| TAXONOMY ONLY (`majors_kr.json` 에만) | **7** |
| 없음 (줄부터 신설) | **14** |

**세 전공 쌍이 지금 한 줄로 묶여 있다**: 전자/전기(`EE`) · 생명과학/바이오
(`BIO`) · 그리고 사용자 목록의 소프트웨어·AI 가 `CS_CORE_V1` 하나를 가리킨다.
묶을지 쪼갤지는 사업 판단이라 임의로 정하지 않았다.

**기존 28학과에 있고 요구 35에 없는 것 11개**(지질 · 간호 · 보건의료복지 ·
스포츠과학 · 사회복지 · 산업디자인 · 시각디자인 · 패션디자인 · 호텔관광 ·
외식조리 · 미용 · 특수교육 일부). 35를 Source of Truth 로 삼으면 이 줄들의 거취를 정해야 한다는 뜻이고,
지우자는 말은 아니다.

---

## 3. Reusable Major Architecture

### 3-1. 이미 서 있고, 증명됐다

`npm run v3:extend` 가 **가짜 core 둘(전기전자 STEM · 경영학 BUSINESS)을
데이터로만 만들어 같은 코드를 고치지 않고 돌린다.** 이번 감사에서 다시
돌려 **14/14 통과**했고, 그 가운데 두 줄이 이 설계의 합격선이다:

- `core 를 모르게 짠 파일에 core 이름이 없다 (5벌)`
- `저장소 내용 파일을 건드리지 않는다 (지문 그대로)`

전기전자는 영역 **6개**, 경영학은 영역 **5개 · 역할 6 · 조직 5** 로
일부러 다르게 잡았다. `TD 12 · RF 7 · OC 7` 이 코드에 박혀 있으면 그
자리에서 터지게 하려는 것이고, 터지지 않았다. **엔진은 이미 전공 수를
모른다.**

### 3-2. 지금 계약 (`major-cores.json`)

```
cores[] = {
  code · family · major · name_ko · name_en · assessment_version
  status · markets[]
  files{ taxonomy · domains · checklists · items_blueprint }   ← required 4
  files{ checklist_additions · items · relations · migration · constructs } ← optional
  packs{ industry · role }
  domain_count · axis_count · role_function_count
  frozen[]                                                      ← 옛 판본 보존
}
```

엔진은 core 이름도 파일 이름도 모르고 **등록부가 가리키는 것만 읽는다**
(`src/lib/me-v3/core-registry.ts`). 시장 정책(`markets.json`)이
`allowed_core_families` 로 한 번 더 거른다: GLOBAL 에 경영학이 새지 않는
것을 검사가 센다.

### 3-3. 35개로 가려면 계약에 더해야 하는 것 셋

지금 계약에 **없고** 사용자 요구에 있는 것만 적는다.

| 더할 것 | 왜 | 지금 어디에 있나 |
|---|---|---|
| `aliases[]` | 기계공학과 · 기계시스템공학과 · 기계설계공학과가 **같은 core** 로 가야 한다 | `majors_kr.json` 의 `departments` 에 이미 있다. **옮기면 된다** |
| `specializations[]` | 소프트웨어·AI 가 CS 아래, 회계·금융이 BIZ 아래로 붙는 자리 | 없음 |
| `maturity` | `VALIDATED` / `READY_FOR_REVIEW` / `FOUNDATION` | `status`(`building`/`planned`)가 재는 것은 **판매 가능 여부**다 |

**`status` 와 `maturity` 를 한 칸에 담지 않는다.** 앞엣것은 `이 시장에서
응시할 수 있는가`를 묻고 뒤엣것은 `이 내용이 얼마나 검증됐는가`를 묻는다. 한 칸에
담으면 `전문가 검토 전이지만 켜 두고 싶다` 와 `검토는 끝났지만 아직 안
켠다` 를 적을 수 없다.

**`maturity` 는 손님 화면에 글자로 나가지 않는다.** 내부 QA metadata 이고,
손님 화면이 적는 것은 지금처럼 `준비 중인 전공` 한 마디다. 기계공학 외
어느 전공도 `검증된 검사` 로 적지 않는다(규준도 인지 면접도 없다).

### 3-4. 공유하는 것과 전공마다 바뀌는 것

```
          Country / Market     markets.json            공유 (시장 정책만)
       →  Major Core           cores[].files 4벌       ← 전공마다 교체
       →  Industry Pack        cores[].packs.industry  ← 전공마다 교체(내용) · 엔진 공유
       →  Role Pack            cores[].packs.role      ← 전공마다 교체(내용) · 엔진 공유
       →  Region Layer         region-layer.json       공유 (시장 단위)
       →  Evidence / Gap       scoring/* · result/*    공유 (코드 0줄 변경)
       →  Career Action        result/text.ko.ts       공유
```

**산업팩과 역할팩의 내용은 전공마다 다르지만 엔진은 하나다.** 반도체는
기계공학에도 전자공학에도 있고 묻는 판단이 다르다. `packs.ts` 가 이미
`core` 를 인자로 받고 기본값만 ME 라서, 그 기본값을 걷는 것이 전부다.

### 3-5. 35개 확장을 막는 **진짜** 코드 자리 다섯

`v3:extend` 가 증명한 것은 **응시 자료 파이프라인**(build · domains ·
items)까지다. 그 뒤의 runtime·platform 층은 아직 core 하나에 묶여 있다.

```
src/lib/me-v3/runtime/session.ts:40      export const CORE = "ME_CORE_V3"
src/lib/me-v3/platform.ts:22             export const CORE = "ME_CORE_V3"
src/lib/me-v3/recompute.ts:29            const CORE = "ME_CORE_V3"
src/lib/me-v3/runtime/domain-facts.ts:13 const CORE = "ME_CORE_V3"
src/lib/me-v3/scoring/packs.ts:28,58     core = "ME_CORE_V3"  (기본값)
```

**DB 는 이미 multi-core 다**: `career_profiles` · `v3_experiences` ·
`career_events` · `v3_actions` 가 전부 `core_code` 칸을 들고 있고
`career_profiles` 의 유일 제약이 `(user_id, core_code)` 다. **스키마를
바꿀 일이 아니다. 상수 다섯을 인자로 바꾸는 일이다.**

---

## 4. Region Layer Audit

### 4-1. 서 있는 것

| 무엇 | 실측 |
|---|---|
| 권역 | **5개** (수도권 · 충청권 · 영남권 · 호남권 · 그 밖), 각각 `includes` 시도 목록 + `scene` 한 줄 |
| `regions` 표 | **5줄** |
| 기관 유형 | **7개** (대기업 · 중견 · 중소 · 스타트업 · 출연연 · 공공기관 · 대학), `from_oc` 로 Core 의 조직환경과 다리를 놓음 |
| 이동 범위 | 있음 |
| 결과지 절 | `#region` 하나 |
| 고르는 화면 | `/me/region` (권역 · 기관 유형 · 이동 범위) |

**Core 판정에 들어가지 않는다**는 원칙이 코드로 지켜진다. 권역을 바꿔도
축 수준과 영역 묶음이 바뀌지 않고, 쓰이는 자리는 읽는 순서뿐이다.

### 4-2. 비어 있는 것 (세 표가 전부 0줄)

| 표 | 줄 | 적혀 있는 까닭 |
|---|---|---|
| `org_registry` | **0** | 기관 수가 공개 통계에서 와야 하고 어느 통계를 쓸지 정하지 않았다 |
| `region_industry` | **0** | 전국사업체조사 같은 공개 통계를 붙이면 채워진다. 기준 연도가 열쇠에 있어야 한다 |
| `industry_td_demand` | **0** | 공고를 모아 세는 일은 저작권과 이용약관을 먼저 따져야 한다 |

지금 결과지의 `#region` 이 실제로 적는 것은 **권역 5개의 `scene` 한 줄씩과
`기관 수와 기업 목록은 아직 담지 않았습니다` 한 문장**이다. 사용자가
금지한 `지역을 고려해보세요` 수준에 머물러 있는 것이 맞고, 그 사실을
화면이 숨기지 않는다는 점만 다르다.

### 4-3. 판정

**Region Layer 는 구조가 서 있고 자료가 0줄이다.** 구조를 다시 만들 일은
없고, 비어 있는 계약 셋 가운데 **기업·기관을 보여주려면 새 표가 하나 더
필요하다**(5절).

---

## 5. Organization Registry Proposal

### 5-1. 먼저, 이름이 이미 쓰이고 있다

**`org_registry` 라는 표가 이미 있다. 그런데 뜻이 다르다.**

```sql
CREATE TABLE org_registry (
  region_code · oc_code · industry_code · org_count · base_year · source
  PRIMARY KEY (region_code, oc_code, industry_code, base_year)
);
```

이것이 들고 있는 것은 **권역 × 기관유형 × 산업 × 연도의 집계 수**이고,
기업 한 곳 한 곳의 목록은 아니다. 여기에 `organization_name` 을 끼워 넣으면 기본키가 깨지고
집계와 목록이 한 표에 섞인다.

**이 저장소는 이름이 겹쳐서 일곱 번 깨졌다**(`.btn` · `--sf-r` · `.lg` ·
`empty` · `industries` · `OC*` · `.qs-steps`). 그래서 제안은 **새 이름**이다:

```
region_organizations   기업·기관 한 곳이 한 줄        ← 새로
org_registry           권역×유형×산업 집계 수         ← 그대로 둔다
```

둘 다 필요하다. 담당자에게 `충청권 출연연 N곳` 을 말하는 것과 `그 가운데
이 다섯 곳` 을 보여주는 것은 다른 질문이다.

### 5-2. 제안 스키마

사용자가 적어 주신 필드를 그대로 받되, 이 저장소의 규칙 둘을 더했다.

```sql
CREATE TABLE IF NOT EXISTS region_organizations (
  organization_id   TEXT PRIMARY KEY,         -- 'ORG-KR-0001'
  name              TEXT NOT NULL,
  org_type_code     TEXT NOT NULL,            -- ORG_GRI · ORG_PUBLIC …
  region_code       TEXT NOT NULL REFERENCES regions(code),
  city              TEXT,                     -- 세종 · 대전 유성 …
  industry_code     TEXT,                     -- 산업팩 코드 (느슨하게)
  roles             TEXT[] NOT NULL DEFAULT '{}',   -- ROLE_* 코드
  related_majors    TEXT[] NOT NULL DEFAULT '{}',   -- major_programs.code
  homepage_url      TEXT,
  career_url        TEXT,
  source            TEXT NOT NULL,            -- 어디서 확인했는가
  source_verified_at DATE NOT NULL,           -- **언제 확인했는가**
  active            BOOLEAN NOT NULL DEFAULT true,
  display_priority  SMALLINT NOT NULL DEFAULT 100,
  CHECK (source <> '' AND homepage_url IS NOT NULL)
);
```

**더한 규칙 둘.**

1. **`CHECK` 가 출처 없는 줄을 거절한다.** 사람이 손으로 채우는 표라
   `반드시 출처가 있어야 한다` 를 문서에만 적으면 바쁜 날 비는 칸이 된다.
2. **`source_verified_at` 이 `NOT NULL` 이다.** 기업은 사업장을 옮기거나 사라진다. 확인한 날짜가 없으면 그 줄이 언제 틀려졌는지 아무도 모른다.
   `/admin/launch` 의 백업 복구 줄과 같은 규칙으로, 오래된 줄은 경고로
   돌린다.

**산업 코드에 외래키를 걸지 않는다.** V3 의 산업 정본은 그 core 의
산업팩 파일이고, 옛 `industries` 표와 이름이 겹쳐 이미 한 번 깨졌다.

### 5-3. 자료를 어떻게 채우는가. **지어내지 않는다**

| 유형 | 확인 가능한 출처 |
|---|---|
| 출연연 | 국가과학기술연구회(NST) 소관 연구기관 공식 목록 |
| 공공기관 | 공공기관 경영정보 공개시스템(ALIO) 기관 목록 |
| 산업단지 | 한국산업단지공단 단지 정보 |
| 기업 | 기업 공식 홈페이지 · 공식 채용 페이지 |

**이 감사에서 기업 이름을 한 줄도 적지 않았다.** `세종=정부·공공` ·
`대전=출연연` 같은 방향은 사용자가 예시로 주신 것이고, 실제 줄은 위
출처에서 확인한 뒤에만 선다. 회사가 그 지역에 사업장을 두고 있는지는
추측할 수 있는 값이 아니다.

### 5-4. 결과지에서 어떻게 보이는가

```
이 지역에서 함께 볼 곳

[기관명]
출연연 · 해석·예측 / 시험·검증
구조·내구 해석에서 확인된 판단이 이 기관의 과제에서 같은 모양으로 섭니다

[기관명]
완성품 기업 · 생산기술
…

                                   지역 기업·기관 더 보기 →
```

**금지선을 데이터로 지킨다.** `적합도` · `합격 가능성` · `추천` · `당신에게
가장 맞는` 을 쓰지 않고, 표에 그런 칸을 두지 않는다. `display_priority`
는 **보여주는 차례**이고, 그 사실을 칸 주석에 적는다.
한 줄에 적는 까닭은 `왜 이 전공과 연결되는가` 이고, 그 문장은
`related_majors` 와 `roles` 와 Core 의 확인된 축에서 조립한다.
**새 점수를 만들지 않는다.**

법적으로도 이 선을 넘지 않는다. 직업정보제공사업 신고로 할 수 있는 것은
정보를 띄우는 데까지이고 알선은 안 된다(CLAUDE.md 법적 범위).
`추천 기업` 대신 `함께 탐색해볼 수 있는 조직` 으로 적는다.

---

## 6. University Demo Gap (담당자 질문 10개)

**지금 제품이 실제로 낼 수 있는 답만 적었다.**

| # | 질문 | 지금 답할 수 있는 것 | 판정 |
|---|---|---|---|
| 1 | 어떤 학과가 지원됩니까 | **기계공학 하나입니다.** 아홉 전공이 등록만 돼 있고 화면이 `준비 중` 으로 적는다 | **막힘** |
| 2 | 공대만 가능합니까 | 지금은 그렇습니다. 계열 넷(STEM·인문사회·경상·융합) 구조는 서 있습니다 | **막힘** |
| 3 | 인문사회·경상 학생도 가능합니까 | **아니오.** `HS_CORE_V1` 과 `BIZ_CORE_V1` 이 등록만 돼 있고 파일이 0벌 | **막힘** |
| 4 | 학사·석사·박사도 구분됩니까 | **예.** 학위 넷(학사·석사·박사·포닥)이 묻는 장면을 바꿉니다. 같은 답이면 점수가 같습니다 | **됨** |
| 5 | 학과별 결과가 실제로 달라집니까 | 전공이 하나라 **지금은 보여줄 수 없습니다.** 구조로는 영역 수가 다른 core 둘로 증명돼 있습니다(`v3:extend`) | **부분** |
| 6 | 산업별 차이가 있습니까 | **예.** 산업 여덟이 묻는 판단과 읽는 순서와 빈 축을 적는 말을 바꾼다. 다만 Core 판정은 일부러 바꾸지 않는다 | **됨** |
| 7 | 직무까지 연결됩니까 | **예.** 직무 여덟과 `td_role` 96줄입니다. 다만 결과지는 **고른 직무 하나만** 깊게 적는다 | **부분** |
| 8 | 우리 지역 기업도 나옵니까 | **아니오.** 권역 다섯의 성격 한 줄까지이고 기업·기관이 0줄입니다 | **막힘** |
| 9 | 학생이 검사 후 무엇을 해야 하는지 나옵니까 | **예.** 비어 있는 부분에서 다음 할 일, 경험 추가, 자동 반영, 현재 상태까지 루프가 돕니다 | **됨** |
| 10 | 대학에서 학생 결과를 활용할 수 있습니까 | **아니오.** Campus(`/org`)의 집계가 옛 검사 표(`responses`, `job_fit_scores`, `area_scores`)만 읽고 **V3 표를 한 줄도 읽지 않는다** | **막힘** |

### 6-1. 가장 비싼 구멍 둘

**10번이 이번 감사에서 새로 드러난 가장 무거운 자리다.** Campus 화면은
멀쩡히 뜨고 5명 규칙도 살아 있는데, 읽는 표가 ME_V1 것이라 **지금 파는
검사를 친 학생의 결과가 학과 담당자 화면에 한 명도 잡히지 않는다.**
종합대학 담당자에게 보여주는 자리가 바로 거기다.

**1·2·3번은 하나의 문제다**: 35개를 따로 만드는 일이 아니다. **공통 구조에
전공을 꽂는 일**이고, 구조는 이미 증명돼 있다(3-1). 막는 것은 코드가
아니라 전공마다 그 분야를 아는 사람이 써야 하는 콘텐츠다.

---

## 7. Implementation Order (6단계)

각 단계가 끝나는 선과, 그 단계가 측정 동결에 닿는지를 함께 적는다.

| # | 단계 | 끝나는 선 | 측정 동결 | 승인 |
|---|---|---|---|---|
| 1 | **ME taxonomy 경계 결정** | 열/유체 · 제어 · 역학 · 시스템/프로젝트 넷을 지금대로 둘지 쪼갤지 **사업주가 정한다**. 쪼개면 `ME_V3_MEASUREMENT_FREEZE_2` 를 연다 | **닿는다** | **필요** |
| 2 | **Core 상수 다섯을 인자로** | `session.ts` · `platform.ts` · `recompute.ts` · `domain-facts.ts` · `packs.ts` 의 `ME_CORE_V3` 를 걷고, 두 core 로 같은 회귀를 돌려 결과가 갈리는 것을 본다. DB 변경 0 | 닿지 않음 | 불필요 |
| 3 | **등록부 계약 확장** | `aliases` · `specializations` · `maturity` 세 칸을 더하고, 35줄을 `majors_kr.json` 의 `departments` 에서 옮겨 채운다. **내용 0벌이어도 FOUNDATION 으로 선다** | 닿지 않음 | 불필요 |
| 4 | **전공 2~3개 실제 제작** | 전기전자 · 컴퓨터 · 경영학 가운데 둘을 **ME 와 같은 깊이로**(영역 · 체크리스트 96칸 · 산업팩 · 역할팩 · 관계표) 만든다. 복붙 금지 검사(`v3:wording` 의 묶음 간 겹침)가 그것을 센다 | 닿지 않음 | 분야 전문가 필요 |
| 5 | **Region Organization Registry** | `region_organizations` 표 + 출처 확인된 줄 + 결과지 `#region` 이 실제 기관을 적는다. **출처 없는 줄은 DB 가 거절한다** | 닿지 않음 | 자료 확보 |
| 6 | **Campus V3 집계** | `/org` 이 `v3_snapshots` · `career_profiles` 를 읽어 5명 규칙으로 집계한다. 10번 질문의 답이 바뀐다 | 닿지 않음 | 불필요 |

**순서를 바꾸면 손해 보는 자리 둘.** 2를 3보다 먼저 해야 하는 까닭은,
등록부를 35줄로 늘려 놓고 코드가 한 core 만 읽으면 **나머지 34줄이 눌러도
안 되는 메뉴**가 되기 때문이다. 4를 5보다 먼저 두는 까닭은, 기관 자료가
전공과 직무로 이어지는데 전공이 하나뿐이면 그 연결을 확인할 수 없어서다.

**Track 결제·구독은 이 여섯 뒤다.** 지난 회차 점검대로 팔 내용의 자료가
0줄이고, 그 자료가 5단계에서 들어온다.

---

## 멈추는 자리

**측정 architecture 와 DB 를 크게 바꾸기 전에 멈춘다.** 1단계는 사업주
결정이고, 2~6단계는 결정이 난 뒤에 순서대로 간다.

이번 회차에 바꾼 파일은 **0개**다. 문항 은행 · 채점 · 소유 판정 · 묶음 ·
ResultModel · 굳은 스냅샷 · 가격 · 이용권 · DB 스키마가 그대로이고,
`v3:freeze:measure` 가 기록을 다시 적지 않은 채로 통과한다.

**UNIVERSITY-WIDE EXPANSION AUDIT READY / OWNER REVIEW REQUIRED**
