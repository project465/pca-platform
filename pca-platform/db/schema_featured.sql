-- ============================================================
--  기관 프로그램(기수)의 중점 기업 (2026-11-03)
--
--  기업탐방 같은 프로그램에 든 참여자의 결과 지역 부분 맨 위에 그 회사를
--  자세히 세운다. **누가 그 프로그램에 드는지**는 이미 있는 기수 표
--  (`cohorts` · `cohort_members`)가 들고, 여기서 더하는 것은 기수가 어느
--  프로그램인지 가리키는 칸 하나다. 프로그램 내용과 회사 사실은
--  `sites/pca-platform/content/featured-programs.v1.json` ·
--  `featured-companies.v1.json` 에 있다(명단은 저장소에 두지 않는다).
--
--  칸이 없는 DB 에서도 앱은 돈다: 그때는 기수 이름(`cohort_name`)으로 찾는다.
-- ============================================================

ALTER TABLE cohorts ADD COLUMN IF NOT EXISTS program_code TEXT;
CREATE INDEX IF NOT EXISTS cohorts_program_idx ON cohorts(program_code) WHERE program_code IS NOT NULL;
COMMENT ON COLUMN cohorts.program_code IS
  '기관 프로그램 코드(content/featured-programs.v1.json 의 code). 그 기수에 든 사람의 결과 지역 절 맨 위에 중점 기업 카드가 선다';
