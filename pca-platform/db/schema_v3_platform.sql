-- ============================================================
--  내 CareerMatri. **검사가 끝난 뒤의 자리.**
--
--  검사 하나로 끝나는 서비스가 아니다. 경험이 늘면 Gap 이 다시 계산되고,
--  목표가 바뀌면 다시 견주고, 공고 자료가 들어오면 내 근거와 대조한다.
--  그 흐름을 담는 표다.
--
--  적용: `npm run db:v3:platform` (`db:init` 과 `db:upgrade` 가 부른다).
--  `db/schema_v3_arch.sql` 다음이다: 여기 표가 `career_profiles` 와
--  `regions` 를 가리킨다.
--
--  **담지 않는 것 셋.** 기업 이름(직업정보제공사업 범위 밖) · 전공명과
--  소속처럼 사람을 좁히는 글 · 결과지 본문. 앞의 둘은 준식별자이고
--  마지막은 굳은 값이라 `v3_snapshots` 에 있다.
-- ============================================================


-- ============================================================
--  1. 경험 추가
--
--  **자유입력을 주 입력으로 두지 않는다.** 커리어메트리는 적어 주신 글을
--  모델이 읽는 서비스가 아니다. 종류를 고르고, 그 종류의 기술영역과 판단과
--  산출물과 검증을 **보기에서 고른다.** 한 줄짜리 메모는 결과지가 그
--  사람의 말로 옮길 때만 읽고, 기한이 지나면 지운다.
-- ============================================================

CREATE TABLE IF NOT EXISTS v3_experiences (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  core_code   TEXT NOT NULL DEFAULT 'ME_CORE_V3',
  /* 여덟 갈래. 응시자가 자기 경험을 찾을 수 있는 말로 적는다 */
  kind        TEXT NOT NULL CHECK (kind IN (
                'course',      -- 수업·과제
                'capstone',    -- 캡스톤·설계 과제
                'research',    -- 연구·실험
                'paper',       -- 논문·학회
                'internship',  -- 인턴·현장실습
                'project',     -- 개인·동아리 프로젝트
                'work',        -- 직장 경험
                'credential'   -- 자격·교육 이수
              )),
  title       TEXT NOT NULL,
  started_on  DATE,
  ended_on    DATE,
  /* 어느 기술영역의 일인가. 보기에서 고른다 */
  td_codes    TEXT[] NOT NULL DEFAULT '{}',
  /* 어느 판단축에 걸리는가 */
  axis_codes  TEXT[] NOT NULL DEFAULT '{}',
  /* 직접 정한 것 · 남긴 것 · 견준 것. **전부 체크리스트 열쇠다** */
  decisions     TEXT[] NOT NULL DEFAULT '{}',
  artifacts     TEXT[] NOT NULL DEFAULT '{}',
  verifications TEXT[] NOT NULL DEFAULT '{}',
  /* 한 줄 메모. **판정에 들어가지 않는다**: 줄 하나로 축이 섰다고 세면
     적는 사람에게만 유리해진다. 결과지가 그 사람의 말로 옮길 때 읽는다 */
  note_text   TEXT,
  /* 메모를 지우는 날. 자유입력은 기한을 들고 다닌다 */
  purge_after DATE,
  status      TEXT NOT NULL DEFAULT 'saved'
              CHECK (status IN ('draft', 'saved', 'reflected')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS v3_experiences_user
  ON v3_experiences(user_id, created_at DESC);

COMMENT ON TABLE v3_experiences IS
  '경험 하나. 보기에서 고른 값이 주 입력이고 한 줄 메모는 기한을 들고 다닌다';
COMMENT ON COLUMN v3_experiences.status IS
  'reflected 는 재분석에 들어간 뒤다. **저장만으로 Gap 이 바뀌지 않는다**';


-- ============================================================
--  2. 다음 행동
--
--  결과지가 내놓는 할 일과 사용자가 직접 적는 할 일을 **한 표에** 둔다.
--  두 표로 나누면 내 CareerMatri 의 `이번 달 할 일` 을 두 곳에서 읽게
--  되고, 그러면 한쪽이 뒤처진다(설계 원칙 10).
-- ============================================================

CREATE TABLE IF NOT EXISTS v3_actions (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  core_code   TEXT NOT NULL DEFAULT 'ME_CORE_V3',
  /* 어디서 온 할 일인가. 결과지가 낸 것과 직접 적은 것을 가른다 */
  source      TEXT NOT NULL CHECK (source IN ('result', 'experience', 'manual')),
  /* 무엇을 메우는 할 일인가. 비어 있어도 된다 */
  td_code     TEXT,
  axis_code   TEXT,
  body        TEXT NOT NULL,
  /* 언제 할 수 있는가. **급한 차례가 아니라 할 수 있는 때다** */
  horizon     SMALLINT NOT NULL DEFAULT 30 CHECK (horizon IN (30, 90, 365)),
  state       TEXT NOT NULL DEFAULT 'open'
              CHECK (state IN ('open', 'doing', 'done', 'dropped')),
  done_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS v3_actions_user
  ON v3_actions(user_id, state, horizon);

COMMENT ON COLUMN v3_actions.horizon IS
  '30 · 90 · 365. 급한 차례가 아니라 할 수 있는 때다';


-- ============================================================
--  3. 채용공고 · **1차에서 줄이 없다**
--
--  수집 → 산업 분류 → 역할 분류 → 요구역량 추출 → 기술영역과 판단축과
--  근거로 사상 → 내 근거와 대조 → Gap 변화 → 알림. 이 흐름의 **계약만**
--  둔다.
--
--  줄이 없는 까닭. 공고를 모으는 일은 저작권과 이용약관을 따지고 시작해야
--  하고, 그 검토가 끝나지 않았다. **빈 표를 먼저 두는 까닭**은 나중에
--  채울 때 근거 없는 사상이 들어오는 것을 막으려는 것이다: 사상 등급과
--  표본 수 칸이 비면 줄이 서지 않는다.
--
--  **기업 이름을 담지 않는다.** 직업정보제공사업 신고로 할 수 있는 것은
--  공고를 띄우고 응시자가 직접 지원하는 데까지다. 알선은 범위 밖이고,
--  이력서 발송 대행과 취업추천서는 금지다.
-- ============================================================

CREATE TABLE IF NOT EXISTS v3_job_postings (
  id            BIGSERIAL PRIMARY KEY,
  /* 어디서 왔는가. 출처 없이 줄을 세우지 않는다 */
  source        TEXT NOT NULL,
  source_ref    TEXT NOT NULL,
  source_url    TEXT,
  posted_on     DATE,
  closes_on     DATE,
  captured_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  /* 분류. 모르면 비운다. **짐작으로 채우지 않는다** */
  /* 산업팩의 코드. **외래키를 걸지 않는다**: `industries` 라는 이름이
     이미 옛 표에 있고, V3 의 산업 정본은 산업팩 파일이다 */
  industry_code TEXT,
  region_code   TEXT REFERENCES regions(code),
  oc_code       TEXT,
  role_code     TEXT,
  /* 공고에서 뽑은 요구. 날것 그대로 둔다: 사상이 틀렸을 때 되짚을 자리다 */
  raw_requirements TEXT[] NOT NULL DEFAULT '{}',
  /* 기술영역 · 판단축 · 근거로 사상한 결과. {TD02:{J3:3,...},...} */
  required_td   JSONB NOT NULL DEFAULT '{}',
  required_rf   JSONB NOT NULL DEFAULT '{}',
  /* 사상을 얼마나 믿을 수 있는가. **등급 없이 사상만 담지 않는다** */
  mapping_grade TEXT NOT NULL CHECK (mapping_grade IN ('약함', '보통', '충분')),
  mapping_note  TEXT,
  UNIQUE (source, source_ref)
);

COMMENT ON TABLE v3_job_postings IS
  '공고 한 줄. 1차에서 줄이 없다. **기업 이름을 담지 않는다** (직업정보제공사업 범위)';
COMMENT ON COLUMN v3_job_postings.mapping_grade IS
  '사상을 얼마나 믿을 수 있는가. 등급 없이 사상만 담으면 눈대중이 근거처럼 읽힌다';

CREATE TABLE IF NOT EXISTS v3_saved_jobs (
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  posting_id BIGINT NOT NULL REFERENCES v3_job_postings(id) ON DELETE CASCADE,
  /* 지원까지 갔는가. **알선하지 않는다**: 사용자가 직접 지원하고 여기에
     그 사실만 적는다 */
  state      TEXT NOT NULL DEFAULT 'saved'
             CHECK (state IN ('saved', 'applied', 'closed')),
  saved_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, posting_id)
);

COMMENT ON TABLE v3_saved_jobs IS
  '저장한 공고. 지원은 사용자가 직접 하고 여기에 사실만 적는다';


-- ============================================================
--  4. CareerMatri Track
--
--  **산업팩을 더 여는 상품이 아니다.** 산업 여덟과 역할 여덟은 진단에
--  포함된다. Track 이 파는 것은 **내 커리어 상황이 바뀔 때 다시 계산해
--  주는 일**이다: 새 공고 추적 · 산업별 요구 변화 · 근거와 공고 대조 ·
--  Gap 변화 · 월간 리포트.
--
--  이용권 표를 새로 만들지 않았다. `entitlements.kind` 에 `track` 을 더한
--  것이 `schema_v3_arch.sql` 에 있다. 여기 두는 것은 **구독 전**에 받는
--  관심 표시뿐이고 **결제가 아니다.**
-- ============================================================

CREATE TABLE IF NOT EXISTS v3_track_interest (
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  /* 어느 기능을 기다리는가. 켜는 차례를 정하는 데 쓴다 */
  feature    TEXT NOT NULL CHECK (feature IN (
               'posting.watch',    -- 새 채용공고 추적
               'industry.shift',   -- 산업별 요구역량 변화
               'evidence.match',   -- 내 근거와 공고 자동 비교
               'gap.timeline',     -- Gap 변화 추적
               'monthly.report',   -- 월간 Career Report
               'target.change',    -- 목표 변경 시 재분석
               'apply.track'       -- 지원 기업과 직무 관리
             )),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, feature)
);

COMMENT ON TABLE v3_track_interest IS
  '구독 전에 받는 관심 표시. **결제가 아니다**: 켜는 차례를 정하는 데만 쓴다';
