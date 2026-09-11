# 데이터베이스

파일 — `db/schema.sql`(기존) → `db/schema_metri.sql`(확장) → `db/seed/metri/skill_tree.sql`(시드)

```bash
psql "$DATABASE_URL" -f db/schema.sql
psql "$DATABASE_URL" -f db/schema_metri.sql
psql "$DATABASE_URL" -f db/seed/metri/skill_tree.sql
```

**셋 다 실제 PostgreSQL 16 에 적용해 확인했다.**
시드 결과 — 역량 138 · 직무군 24 · 요구관계 261 · 동의어 565 · 번역 396행.

---

## 1. 기존 스키마를 하나도 지우지 않았다

`schema_metri.sql` 은 `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` 와
`CREATE TABLE` 로만 이뤄져 있다. **기존 테이블을 고치거나 지우지 않는다.**

기존 설계 원칙 세 개를 그대로 지킨다.

| 원칙 | METRI 에서 |
|---|---|
| 1. 로그인 주체는 `users` 하나 | 고등학생·대학생·개인결제자 전부 `users`. `learner_profiles` 가 옆에 붙는다 |
| 2. 이름은 전부 `translations` | 역량·직무·산업·트랙 이름이 전부 행으로 들어간다. 396행 |
| 3. 산식은 데이터 | `scoring_profiles` · `job_axis_weights` · `evidence_sources` |

**원칙 4를 하나 더한다 — 점수는 산식이, 문장은 모델이.**
LLM 이 만든 값은 `job_fit_scores` 에 들어가지 않는다.

---

## 2. 새 테이블 지도

```
[축·트랙]           indicator_axes · tracks · learner_goals · industries
                        │
[Skill Graph]       competencies(+layer,+major_id) · competency_aliases
                    job_clusters(+UNIQUE code) · job_competency_map(+criticality)
                    job_axis_weights · job_industry_map · job_cluster_tracks
                    major_fit_weights
                        │
[학습자]            learner_profiles · learner_evidence · evidence_sources
                    learner_competency_levels · learner_preferences
                        │
[채점]              scoring_profiles · norm_groups · norm_stats · attempt_quality
                        │
[결과]              job_fit_scores(+A,S,P,C,band) · major_fit_scores · skill_gap_items
                        │
[JD]                jd_sources · jd_raw · jd_postings · jd_skills
                    jd_skill_stats · skill_candidates · companies · jd_match_scores
                        │
[고교]              hs_subjects · hs_subject_major_map · hs_subject_competency_map
                    ncs_units · ncs_competency_map · certifications
                        │
[집계·루프]         cohort_reports · outcome_records · match_feedback
```

---

## 3. 설계 판단 열 가지

### (1) 트랙은 상품이 아니라 행이다

```sql
CREATE TABLE tracks (
  code            TEXT UNIQUE,   -- HS | UNIV_LOW | UNIV_HIGH | GRAD
  instrument_key  TEXT NOT NULL  -- HS_V1 | UNIV_V1
);
```

트랙은 4개인데 `instrument_key` 는 2개다. **만들어야 할 검사지가 두 벌이라는 뜻.**
코드에 `if (트랙)` 이 없다.

### (2) 일반계고와 마이스터고는 컬럼 하나로 흡수한다

```sql
CREATE TABLE learner_goals (code TEXT UNIQUE);  -- univ | job | any
```

학교 유형은 `learner_profiles.school_type` 에 **기록만** 하고 로직을 태우지 않는다.
로직은 `goal_code` 만 본다. 특성화고·영재학교가 늘어도 분기가 안 늘어난다.

### (3) 지표 축을 검사 버전에서 떼어냈다

기존 `indicators` 는 `instrument_id` 에 묶여 있다. 문항 버전이 올라가면 새 행이 생긴다.
그러면 작년 응시자와 올해 응시자를 비교할 수 없다.

```sql
CREATE TABLE indicator_axes (code TEXT UNIQUE, kind TEXT);
ALTER TABLE indicators ADD COLUMN axis_code TEXT REFERENCES indicator_axes(code);
```

**축은 고정, 문항은 버전.** 고1의 `ANALYZE` 와 대학 4학년의 `ANALYZE` 가 같은 자다.

### (4) 필수도를 안 넣으면 점수가 안 갈린다

```sql
ALTER TABLE job_competency_map ADD COLUMN criticality SMALLINT DEFAULT 2;  -- 3 필수 2 중요 1 보조
```

### (5) 보유 수준은 입력이 아니라 계산 결과다

`learner_evidence`(증거 낱개) → `learner_competency_levels`(계산 결과).
결과지의 "왜 2레벨인가" 가 `learner_evidence` 행을 그대로 펼친다.
증거 없이 레벨만 저장하면 그 질문에 답할 수 없다.

### (6) 점수의 내역을 저장한다

```sql
ALTER TABLE job_fit_scores ADD COLUMN a_score ...  s_score ...  p_score ...  c_score ...
                           ADD COLUMN band_low ... band_high ...
```

합쳐진 숫자 하나만 저장하면 설명할 수 없고, **설명 못 하는 점수는 안 팔린다.**

### (7) 신뢰도는 점수를 깎지 않고 구간을 넓힌다

`attempt_quality.band_width`. 깎으면 학생 간 비교가 깨지고, 넓히면 정직해진다.

### (8) 공고 원문을 지우지 않는다

`jd_raw.payload JSONB`. 추출기를 고칠 때마다 전량 재처리해야 한다.

### (9) 라이선스가 화면을 바꾼다

`jd_sources.redistributable`. false 면 원문 대신 링크와 요약만 띄운다.
코드에 박으면 실수 한 번이 소송이 된다.

### (10) 5명 미만 칸은 공개하지 않는다

```sql
cohort_reports.min_cell SMALLINT DEFAULT 5
```

익명 집계가 개인 식별로 바뀌는 순간 학생이 응답을 왜곡하고, 데이터가 죽는다.

---

## 4. B2C 는 테이블을 새로 만들지 않는다

개인 결제자도 `users` 한 행이다(원칙 1).

| B2B | B2C |
|---|---|
| `contracts` → `seats` 500개 → 학생에게 배정 | `contracts` 없이 `seats` 1개 발급 |
| 학과가 결제 | 학생이 결제 |
| `memberships` 로 학과에 소속 | `memberships` 행이 없다 |

**결제 이력만 새로 필요하다.** 1차에서는 PG 사 거래ID 를 `seats` 에 남기는 정도로 시작하고,
정기결제가 생기면 그때 `payments` 를 만든다. 지금 만들면 쓰지 않는 컬럼이 남는다.

---

## 5. 스킬 트리를 고치는 법

**SQL 을 직접 고치지 않는다.**

```
data/metri/major_ME.json   ← 여기를 고친다
        ↓  npm run metri:build
db/seed/metri/skill_tree.sql        (자동 생성)
docs/metri/generated/skill_tree.md  (자동 생성)
prototypes/metri/data.js            (자동 생성)
```

시드 SQL 은 전부 `ON CONFLICT ... DO UPDATE` 라 **몇 번 돌려도 안전하다.**
운영 DB 에 다시 적용해도 기존 응시 결과에 영향이 없다.

---

## 6. 아직 안 만든 것

- **`payments`** — 정기결제가 생기면
- **인덱스 튜닝** — `jd_postings` 가 10만 행을 넘으면 그때 실측하고 잡는다
- **파티셔닝** — `jd_skill_stats` 월별. 2년치가 쌓이면
- **감사 로그** — 기업이 학생 정보를 열람한 기록. 기업 화면을 만들 때 같이
