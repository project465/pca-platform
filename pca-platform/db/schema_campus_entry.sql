-- ============================================================
--  학교 진입 맥락 (Campus Entry Context)
--
--  **표를 새로 만들지 않는다.** 응시 하나가 어느 학교의 어느 학과에서
--  들어왔는가는 그 응시의 속성이고, 표를 따로 두면 같은 응시를 두 곳에서
--  읽게 된다. `undergrad_core` 와 `industry_interest` 를 칸으로 더한
--  것과 같은 자리다.
--
--  **이 값이 채점을 바꾸지 않는다**(규격 §12). 쓰이는 자리는 넷뿐이다:
--  routing · Campus 집계 · 학과 보고 · 지역 표시. 채점 함수는 이 칸을
--  인자로 받지 않고(`npm run campus:check` 가 그것을 센다), 같은 응답이면
--  학교를 적은 응시와 적지 않은 응시의 결과가 글자까지 같다.
--
--  **외래키를 걸지 않는다.** 학교와 단과대학과 학과의 정본은
--  `content/campus-universities.json` 이고, DB 에 한 벌 더 두면 학과를
--  늘리는 날 한쪽만 늘어난다. 이 저장소에서 `industries` 가 그렇게 깨졌다.
--
--  적용: 차례는 `deploy/db-chain.json` 하나가 들고 있다
-- ============================================================

-- 학교 코드(`PCU`). 일반 B2C 로 들어온 응시는 NULL 이고, **NULL 이
-- 기본값인 것이 일부러다**: 학교를 짐작해 채우면 그 응시가 어느 학교의
-- 집계에 들어가는지 아무도 모른다
ALTER TABLE v3_attempts ADD COLUMN IF NOT EXISTS university_code TEXT;
ALTER TABLE v3_attempts ADD COLUMN IF NOT EXISTS college_code    TEXT;
ALTER TABLE v3_attempts ADD COLUMN IF NOT EXISTS department_code TEXT;
-- Core 안의 갈래(`SPEC_CS_SW`). Core 는 `core_code` 가 이미 들고 있다
ALTER TABLE v3_attempts ADD COLUMN IF NOT EXISTS specialization_code TEXT;

-- **학교 없이 학과만 적힌 줄을 거절한다.** 학과만 있는 줄은 어느 학교의
-- 학과인지 알 수 없고, 그런 줄이 하나 생기면 집계가 그것을 조용히 뺀다
ALTER TABLE v3_attempts DROP CONSTRAINT IF EXISTS v3_campus_pair;
ALTER TABLE v3_attempts ADD CONSTRAINT v3_campus_pair
  CHECK (university_code IS NOT NULL
         OR (college_code IS NULL AND department_code IS NULL));

-- Campus 집계가 읽는 자리. 학교로 좁히고 단과대학과 학과로 묶는다
CREATE INDEX IF NOT EXISTS v3_attempts_campus
  ON v3_attempts (university_code, college_code, department_code)
  WHERE university_code IS NOT NULL;

COMMENT ON COLUMN v3_attempts.university_code IS
  '학교 전용 진입(/campus/{code})으로 들어온 응시의 학교. **채점에 들어가지
   않는다** — routing 과 Campus 집계와 학과 보고와 지역 표시에만 쓴다';
