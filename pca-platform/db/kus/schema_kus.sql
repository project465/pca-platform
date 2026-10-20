-- ============================================================
--  고려대학교 세종캠퍼스(KUS) 기업탐방 기록. **KUS 전용 표 둘.**
--
--  공통 체인(`deploy/db-chain.json`)에 넣지 않았다. 넣는 일은 공통 DB
--  계약을 바꾸는 일이라 변경 요청서로 올린다(docs/kus/CHANGE_REQUESTS.md
--  KUS-CR-02). 그 전까지는 KUS 시연 DB 에만 손으로 올린다:
--
--    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/kus/schema_kus.sql
--
--  **공통 경험 표(`v3_experiences`)에 넣지 않는 까닭이 셋이다.**
--  1. 그 표는 기업 이름을 담지 않기로 했다(직업정보제공사업 범위 · 준식별자).
--     탐방 기록은 방문 기업이 첫 칸이다
--  2. 그 표의 줄은 재분석에서 판정에 들어간다. **방문했다는 사실만으로
--     직무 역량을 판정하지 않는다**: 탐방 기록은 판정에 들어가지 않고,
--     학생이 직접 해 본 활동만 공통 경험 입력으로 옮겨 그쪽 판정을 받는다
--     (`experience_id`)
--  3. 그 표의 `kind` CHECK 를 넓히는 일은 공통 스키마 변경이다
--
--  **학교 칸을 KUS 로 못 박는다.** 다른 기관이 같은 표를 쓰기 시작하면
--  기관 사이 격리가 이 한 칸에 걸린다. 그 날은 이 CHECK 를 지우는 것이
--  아니라 기관마다 제 표를 두는지부터 다시 정한다.
-- ============================================================

/* 탐방 기업. **관리자가 등록한다.** 학생이 지어 넣는 자리가 아니다.
   확인되지 않은 기업을 만들지 않으려고 `source_note` 를 함께 받는다 */
CREATE TABLE IF NOT EXISTS kus_visit_programs (
  id              BIGSERIAL PRIMARY KEY,
  university_code TEXT NOT NULL DEFAULT 'KUS' CHECK (university_code = 'KUS'),
  company_name    TEXT NOT NULL CHECK (length(company_name) BETWEEN 1 AND 80),
  /* 관리자가 확인한 업종·사업 한 줄. 모르면 비운다 */
  business_note   TEXT CHECK (business_note IS NULL OR length(business_note) <= 200),
  visit_date      DATE,
  status          TEXT NOT NULL DEFAULT 'PLANNED'
                  CHECK (status IN ('PLANNED', 'CONFIRMED', 'DONE', 'CANCELLED')),
  /* 어디서 확인했는가(공문 · 협약 · 담당자 확인). **비어 있으면 학생 화면에
     `확인 전` 이 선다** */
  source_note     TEXT CHECK (source_note IS NULL OR length(source_note) <= 200),
  /* 테스트로 만든 줄. 학생 화면과 PDF 에 `[테스트]` 가 따라간다 */
  is_test         BOOLEAN NOT NULL DEFAULT FALSE,
  created_by      BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

/* 학생 한 사람의 탐방 기록 한 건 */
CREATE TABLE IF NOT EXISTS kus_company_visits (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  university_code TEXT NOT NULL DEFAULT 'KUS' CHECK (university_code = 'KUS'),
  /* 등록된 탐방이면 그 줄. 없으면 학생이 적은 기업 이름만 있고 `확인 전` 이다 */
  program_id      BIGINT REFERENCES kus_visit_programs(id) ON DELETE SET NULL,
  company_name    TEXT NOT NULL CHECK (length(company_name) BETWEEN 1 AND 80),
  visited_on      DATE,
  /* 그 학생이 쓰는 Core. 직무·영역 보기를 어느 사전에서 읽었는지 남긴다 */
  core_code       TEXT,
  /* 관찰한 직무: 그 Core 의 역할 코드(보기) + 보기에 없을 때 한 줄 */
  role_codes      TEXT[] NOT NULL DEFAULT '{}',
  role_text       TEXT CHECK (role_text IS NULL OR length(role_text) <= 120),
  /* 이해한 기술·제품·사업 */
  understood      TEXT CHECK (understood IS NULL OR length(understood) <= 600),
  /* 실제로 한 활동. 고정 보기 열쇠(`src/lib/kus/visits.ts` ACTIVITIES) */
  activities      TEXT[] NOT NULL DEFAULT '{}',
  activity_text   TEXT CHECK (activity_text IS NULL OR length(activity_text) <= 300),
  /* 새로 알게 된 것 */
  learned         TEXT CHECK (learned IS NULL OR length(learned) <= 600),
  /* 학생이 스스로 잇는 전공 영역(그 Core 의 기술영역 코드) */
  td_codes        TEXT[] NOT NULL DEFAULT '{}',
  /* 직접 해 본 활동을 공통 경험 입력으로 옮겼을 때 그 줄 */
  experience_id   BIGINT REFERENCES v3_experiences(id) ON DELETE SET NULL,
  /* 자유 입력은 기한을 들고 다닌다(공통 경험 표와 같은 365일) */
  purge_after     DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kus_company_visits_user
  ON kus_company_visits(user_id, created_at DESC);

COMMENT ON TABLE kus_company_visits IS
  'KUS 기업탐방 기록. **판정에 들어가지 않는다**: 직접 해 본 활동만 공통 경험 입력으로 옮겨 그쪽 판정을 받는다';
