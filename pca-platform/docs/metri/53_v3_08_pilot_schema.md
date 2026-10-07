# I. 파일럿 데이터 schema 수정안

## 1. 왜 지금 받아야 하는가

파일럿은 **지금 제품(ME_V2)으로 돌린다.** 그런데 분석은 ME_V3 의 가정을
재는 데 쓴다. 그래서 학위와 전공계열을 **파일럿을 돌리기 전에** 받아
두어야 한다. 받지 않고 돌리면 끝난 뒤에 되물을 수 없고, 되물으면 그
답이 결과지를 본 뒤의 답이 된다.

지금 `attempts` 에 있는 것은 `education_stage` 하나다. 전공과 계열과
현재 상태가 없으므로 **대학원생 응답을 계열별로 가를 수 없다.**

## 2. 더하는 칸 여섯

표를 새로 만들지 않는다. `attempts` 에 칸을 더한다. 등급을 정하는 자리가
둘이 되지 않게 하는 것과 같은 규칙이다.

```sql
-- db/schema_v3_pilot.sql (구현 단계에서 적용. 이번 회차는 설계만)

ALTER TABLE attempts ADD COLUMN IF NOT EXISTS major_module    TEXT;
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS ug_major_name   TEXT;
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS ug_major_field  TEXT;
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS grad_field      TEXT;
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS grad_major_name TEXT;
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS current_status  TEXT;
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS target_interest TEXT;

ALTER TABLE attempts DROP CONSTRAINT IF EXISTS attempts_field_chk;
ALTER TABLE attempts ADD CONSTRAINT attempts_field_chk
  CHECK ((ug_major_field IS NULL OR ug_major_field IN ('stem','hss','interdisc'))
     AND (grad_field     IS NULL OR grad_field     IN ('stem','hss','interdisc')));

ALTER TABLE attempts DROP CONSTRAINT IF EXISTS attempts_status_chk;
ALTER TABLE attempts ADD CONSTRAINT attempts_status_chk
  CHECK (current_status IS NULL OR current_status IN
         ('enrolled_ug','enrolled_grad','graduated','employed','preparing'));

/* 석사 이상은 전공계열이 반드시 있어야 한다. 없으면 그 응시의 대학원
   경험을 어느 모듈로 번역했는지 뒤에서 알 수 없다 */
ALTER TABLE attempts DROP CONSTRAINT IF EXISTS attempts_gradfield_required_chk;
ALTER TABLE attempts ADD CONSTRAINT attempts_gradfield_required_chk
  CHECK (education_stage IS NULL
         OR education_stage = 'bachelor'
         OR grad_field IS NOT NULL);
```

마지막 제약이 이번 지시의 `석사 이상은 전공계열 분기가 반드시 저장되게
합니다` 를 DB 가 지키는 자리다. **화면이 지키게 두지 않는다.** 화면은
늘어나고, 늘어난 화면 가운데 하나가 빠뜨린다.

### 2-1. 제약을 켜는 순서

`education_stage` 가 이미 들어 있는 기존 응시 행에는 `grad_field` 가
없다. 그래서 제약을 그대로 켜면 운영 DB 에서 거절된다. 순서를 적어 둔다.

1. 칸 일곱을 먼저 더한다(전부 `NULL` 허용).
2. 기존 ME_V2 응시 행에 `grad_field` 를 추정으로 채우지 **않는다.**
3. 제약에 `NOT VALID` 를 붙여 **새 행에만** 적용한다.
4. 파일럿 참가자는 전부 새 행이므로 제약 안에서 들어온다.

**추정으로 채우지 않는 까닭**은 그 값이 분석의 기준이기 때문이다. 채우면
그 행이 어느 계열인지 아무도 모르는 상태로 분석에 들어간다.

## 3. 파일럿 설문에 더하는 문항

`attempts` 에 담는 값은 응시 시작 화면에서 받는다. 설문에는 **결과지를
본 뒤에 답해야 하는 것**만 더한다.

| 코드 | topic | kind | cohort | 묻는 것 |
|---|---|---|---|---|
| `P18_FIELDFIT` | `fieldfit` | scale | all | 제 전공과 학위에 맞는 장면으로 물어졌습니까 |
| `P19_FIELDMISS` | `fieldfit` | text | all | 제 경험 가운데 물어 주지 않은 것이 있습니까 |
| `P20_TDCLEAR` | `domain` | scale | all | 결과에 나온 기술영역의 이름과 뜻이 분명했습니까 |

`P19_FIELDMISS` 가 번역 모듈의 보기 메뉴를 고치는 자료다. **보기에 없는
일을 한 사람이 몇 명인지**를 그 칸으로 센다. 계열 분기가 천장이 되고
있는지를 재는 유일한 자리다.

기존 열여덟 문항은 문면을 고치지 않는다. 받은 규격 열 문항은 한 글자도
고치지 않는다.

## 4. 분석 구조

네 축으로 가를 수 있어야 한다. 학위별 · 전공계열별 · 등급별 · 주요
기술영역별이다.

```sql
CREATE OR REPLACE VIEW pilot_profile AS
SELECT
  a.id                              AS attempt_id,
  a.education_stage,
  CASE WHEN a.education_stage = 'bachelor'
       THEN a.ug_major_field ELSE a.grad_field END AS field,
  a.ug_major_field,
  a.grad_field,
  a.current_status,
  a.tier,
  a.assessment_version,
  s.primary_domain,                 -- 결과 스냅샷에서 뽑은 대표 영역
  s.domain_count                    -- 확인된 축이 둘 이상인 영역 수
FROM attempts a
LEFT JOIN report_snapshots s ON s.attempt_id = a.id;
```

`primary_domain` 은 스냅샷의 결과 객체에서 뽑는다. **새로 계산하지
않는다.** 분석이 따로 계산하면 결과지와 분석이 다른 값을 말한다
(설계 원칙 10 과 같은 까닭이다). ME_V2 파일럿에서는 직무군 코드가 들어오고,
ME_V3 부터 TD 코드가 들어온다. 두 판본을 한 표에서 섞어 보지 않게
`assessment_version` 을 같이 둔다.

### 4-1. 교차표와 5명 규칙

| 교차 | 왜 보는가 | 5명 규칙 |
|---|---|---|
| 학위 × 결과 적합도 문항 | 대학원생에게 결과가 더 맞는지 | 5명 미만 칸은 평균을 내지 않는다 |
| 전공계열 × `P18_FIELDFIT` | 계열 장면이 맞는지 | 같다 |
| 전공계열 × `P19_FIELDMISS` | 보기 메뉴가 좁은지 | 자유입력은 5명 미만 칸에서 내놓지 않는다 |
| 등급 × `P16_TIERVALUE` | 유료 값이 느껴지는지 | 같다 |
| 주요 영역 × `P12_WHY` | 왜 그 영역인지 이해됐는지 | 같다 |
| 학위 × 전공계열 × 등급 | 분기가 겹친 자리 | 칸이 금방 작아진다. **집계를 내기 전에 칸 수를 먼저 적는다** |

세 축을 겹치면 20~30명 파일럿에서 칸마다 한두 명이 된다. 그래서 세 축
교차는 **숫자를 내지 않고 사례를 읽는 자리**로 쓴다. 그 사실을 분석
문서에 먼저 적어 둔다. 적지 않으면 한 명의 답이 비율로 보고된다.

### 4-2. 20~30명을 어떻게 나누는가

| 집단 | 인원 | 왜 |
|---|---|---|
| 학사 · 무료 | 6~8 | 무료 완료율과 소요 시간을 재는 집단 |
| 학사 · 유료 | 4~5 | 개수에서 이름으로 바뀌는 값을 재는 집단 |
| 이공계 석박 · 유료 | 7~9 | 번역이 값인지 재는 주 집단 |
| 인문·사회·경상 석박 · 유료 | 3~5 | 계열 번역이 서는지 재는 집단 |

인문·사회·경상 칸이 작다. **그 칸에서는 평균을 내지 않고 면담으로만
읽는다.** 숫자를 내려면 2차 파일럿이 필요하고, 그 사실을 미리 적어 둔다.

## 5. 개인정보

| 값 | 성격 | 어떻게 다루는가 |
|---|---|---|
| `ug_major_name` · `grad_major_name` | 준식별자 | 파기 목록에 넣는다. 집계는 계열 코드로만 한다 |
| `target_interest` | 자유입력 | 같다. 결과지에만 쓰고 집계에 넣지 않는다 |
| `current_status` | 코드 | 집계에 쓴다 |
| `P19_FIELDMISS` 본문 | 자유입력 | `pilot_feedback.text` 와 같은 취급. 파기 대상 |

**전공명과 학위와 지역을 함께 내보내지 않는다.** 셋을 묶으면 20명 안에서
사람이 특정된다. 기관 리포트와 파일럿 보고서 양쪽에 같은 규칙이다.

## 6. 파일럿 결과가 무엇을 바꾸는가

받기 전에 적어 둔다. 숫자를 보고 기준을 정하면 그 기준은 아무것도 막지
못한다.

| 신호 | 바꾸는 것 |
|---|---|
| 무료 완료율이 70% 미만 | 격자에서 학습 의향 칸을 빼거나 영역을 여섯으로 줄인다 |
| `P18_FIELDFIT` 평균이 3.5 미만 | 그 계열의 분기 블록 문면을 다시 쓴다 |
| `P19_FIELDMISS` 에 같은 방법이 세 번 이상 적힘 | 그 방법을 보기 메뉴에 올린다 |
| `P20_TDCLEAR` 평균이 3.5 미만 | 영역 이름과 한 줄 설명을 다시 쓴다 |
| `P16_TIERVALUE` 평균이 3.5 미만 | 등급 경계를 다시 본다 |
| 전 영역 동점이 응답의 3분의 1 초과 | 강제 선택을 둘에서 넷으로 늘린다 |
| 결과 적합도가 3.0 미만 | **멈춘다.** 측정 모델을 다시 본다 |
