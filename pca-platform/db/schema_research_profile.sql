-- ============================================================
--  MAT 연구 이력 · 공고 추천 (2026-11-05 대표 "MAT의 성능이 석박사들 커버해야돼")
--
--  research_items         논문 · 연구과제 · 특허 · 장비/기법 · 학위를 한 줄씩. **본인만 본다.**
--                         파일(내 자료 읽기, research_docs)로 칸을 미리 채워도, 사람이 확인하고
--                         저장해야 줄이 선다(초안을 이 표에 두지 않는다)
--  research_matches       내 연구 이력과 잡인더 · 커리어피크 공고를 맞춘 결과. 1차 점수는 AI 없이,
--                         2차 요건 풀이(ai)는 본인이 누른 공고만, 기간권 상한 안에서
--  research_alert_prefs   알림 설정. 화면 알림 · 하루 한 번 메일(끌 수 있다) · 볼 공고 종류 · 기준 점수
--
--  **새 표만 더한다.** 기존 표 · 제약을 바꾸지 않는다: 알림은 `assistant_nudges` 의 `match` 종류,
--  메일은 `outbox` 의 `assistant_digest` 종류를 그대로 쓴다(종류 제약을 다시 세우지 않는다).
--  사람이 탈퇴하면 같이 지워진다(ON DELETE CASCADE).
-- ============================================================

CREATE TABLE IF NOT EXISTS research_items (
  id            BIGSERIAL PRIMARY KEY,
  user_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind          TEXT NOT NULL CHECK (kind IN ('paper', 'project', 'patent', 'method', 'degree')),
  /* 칸 값(종류마다 다르다, `src/lib/research/profile.ts`) */
  data          JSONB NOT NULL DEFAULT '{}'::jsonb,
  /* 공고와 맞출 낱말. 사람이 적은 분야 낱말 · 기법 이름 · 전공에서만 나온다 */
  terms         TEXT[] NOT NULL DEFAULT '{}',
  /* 어느 자료로 미리 채웠나. 자료를 지워도 이 줄은 남는다 */
  source_doc_id BIGINT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS research_items_user_idx ON research_items(user_id, kind, created_at DESC);

COMMENT ON TABLE research_items IS
  'MAT 연구 이력(논문·과제·특허·장비/기법·학위). 본인만 본다. 사람이 확인하고 저장한 줄만 있다';

CREATE TABLE IF NOT EXISTS research_matches (
  user_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  posting_id    BIGINT NOT NULL REFERENCES v3_job_postings(id) ON DELETE CASCADE,
  score         INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  /* 겹친 낱말과 그 낱말이 나온 내 이력 · 학위 맞음 · 종류 맞음 */
  reasons       JSONB NOT NULL DEFAULT '{}'::jsonb,
  /* 2차 요건 풀이(충족 · 부족 · 근거 이력). 누른 공고만 */
  ai            JSONB,
  ai_at         TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  /* 화면 알림을 쌓은 때 · 메일에 담은 때. 처음 이력을 저장할 때 맞은 공고는 알림 없이 바로 채운다 */
  notified_at   TIMESTAMPTZ,
  mailed_at     TIMESTAMPTZ,
  PRIMARY KEY (user_id, posting_id)
);
CREATE INDEX IF NOT EXISTS research_matches_user_idx ON research_matches(user_id, score DESC);
CREATE INDEX IF NOT EXISTS research_matches_mail_idx ON research_matches(user_id) WHERE mailed_at IS NULL;

COMMENT ON TABLE research_matches IS
  'MAT 연구 이력과 공고를 맞춘 결과. 1차는 낱말·학위·종류(AI 없음), 2차 ai 는 본인이 누른 공고만';

CREATE TABLE IF NOT EXISTS research_alert_prefs (
  user_id       BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  screen        BOOLEAN NOT NULL DEFAULT true,
  email_daily   BOOLEAN NOT NULL DEFAULT true,
  /* 볼 공고 종류(출연연 · 기업 R&D · 공공기관 · 대학원 · 교원 임용 · 정출연). 비면 모두 */
  categories    TEXT[] NOT NULL DEFAULT '{}',
  min_score     INTEGER NOT NULL DEFAULT 40 CHECK (min_score BETWEEN 0 AND 100),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE research_alert_prefs IS
  'MAT 연구 공고 알림 설정. 메일은 하루 한 번 모아서, 끌 수 있다. 운영 메일 설정이 없으면 화면 알림만';
