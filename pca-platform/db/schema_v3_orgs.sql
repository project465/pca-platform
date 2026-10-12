-- ============================================================
--  Region Organization Registry
--
--  **기존 `org_registry` 를 건드리지 않는다.** 그 표는 권역 × 기관유형 ×
--  산업 × 연도의 **집계 수**이고 기업 한 곳 한 곳의 목록이 아니다. 거기에
--  이름을 끼우면 기본키가 깨지고 집계와 목록이 한 표에 섞인다.
--
--  이 저장소는 이름이 겹쳐서 여덟 번 깨졌다(`.btn` · `--sf-r` · `.lg` ·
--  `empty` · `industries` · `OC*` · `.qs-steps` · `.cm-snap`). 그래서
--  새 이름을 쓴다.
--
--    org_registry          권역×유형×산업 집계 수   ← 그대로 둔다
--    region_organizations  기관 한 곳이 한 줄        ← 여기
--
--  둘 다 필요하다. 담당자에게 `충청권 출연연 N곳` 을 말하는 것과
--  `그 가운데 이 다섯 곳` 을 보여주는 것은 다른 질문이다.
-- ============================================================

CREATE TABLE IF NOT EXISTS region_organizations (
  organization_id   TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  /* 기관 유형. `region-layer.json` 의 ORG_* 를 글자로 들고 외래키를 걸지
     않는다: V3 의 정본은 그 파일이고, 옛 `industries` 표와 이름이 겹쳐
     이미 한 번 깨졌다 */
  org_type_code     TEXT NOT NULL,
  region_code       TEXT NOT NULL REFERENCES regions(code),
  /* 세종 · 대전 유성 처럼 사람이 읽는 자리 */
  city              TEXT,
  /* 산업팩 코드. 느슨하게 들고 외래키를 걸지 않는다 */
  industry_code     TEXT,
  /* 이 기관에서 설 법한 직무(ROLE_*). **적합도가 아니다** */
  roles             TEXT[] NOT NULL DEFAULT '{}',
  /* 이어지는 전공(`major_programs.code` 또는 Major Core 의 `major`) */
  related_majors    TEXT[] NOT NULL DEFAULT '{}',
  homepage_url      TEXT NOT NULL,
  career_url        TEXT,
  /* 어디서 확인했는가. NST · ALIO · 산업단지공단 · 공식 홈페이지 */
  source            TEXT NOT NULL,
  /* **언제 확인했는가.** 기관은 자리를 옮기거나 사라진다. 이 날짜가 없으면
     그 줄이 언제 틀려졌는지 아무도 모른다 */
  source_verified_at DATE NOT NULL,
  active            BOOLEAN NOT NULL DEFAULT true,
  /* **보여주는 차례이지 적합도가 아니다.** 작은 수가 먼저 선다 */
  display_priority  SMALLINT NOT NULL DEFAULT 100,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  /* **출처 없는 줄을 DB 가 거절한다.** 사람이 손으로 채우는 표라
     `반드시 출처가 있어야 한다` 를 문서에만 적으면 바쁜 날 비는 칸이 된다 */
  CONSTRAINT region_organizations_source_chk
    CHECK (btrim(source) <> '' AND btrim(homepage_url) <> ''),
  CONSTRAINT region_organizations_name_chk CHECK (btrim(name) <> '')
);

CREATE INDEX IF NOT EXISTS region_organizations_region_idx
  ON region_organizations (region_code, display_priority)
  WHERE active;
CREATE INDEX IF NOT EXISTS region_organizations_major_idx
  ON region_organizations USING GIN (related_majors);

COMMENT ON TABLE region_organizations IS
  '지역정주 관점에서 함께 탐색할 수 있는 기관. **추천이 아니다**:
   적합도·합격 가능성·취업 확률을 뜻하지 않는다. 직업정보제공사업으로 할 수
   있는 것은 정보를 띄우는 데까지이고 알선은 안 된다';

COMMENT ON COLUMN region_organizations.display_priority IS
  '보여주는 차례. **적합도가 아니다** — 작은 수가 먼저 선다';

COMMENT ON COLUMN region_organizations.source_verified_at IS
  '언제 확인했는가. 오래된 줄은 운영 화면이 경고로 돌린다. 추측해서 채우지 않는다';
