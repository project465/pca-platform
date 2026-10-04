-- ============================================================
--  데모 참여자.
--
--  **실제 사람이 아니다.** 이름이 '가상 01' 인 것은 일부러다: 화면 캡처에
--  실제 사람처럼 읽히는 이름이 들어가면 그 캡처가 돌아다닐 때 누구인지
--  묻는 일이 생긴다. 운영 DB 에 넣지 않는다.
--
--  `platform_demo.sql` 이 만든 한빛대학교 기계공학과 계약의 좌석에
--  사람을 붙이고, 일부는 응시까지 끝낸 상태로 둔다. 화면을 눌러 보려고
--  만든 것이라 **점수는 지어낸 값이고 채점 엔진을 거치지 않았다.**
--  그래서 이 자료로 산식을 판단하지 않는다.
--
--  적용: platform_demo.sql 다음
-- ============================================================

-- 24명. 비밀번호 해시는 로그인할 수 없는 값으로 둔다: 데모 계정으로
-- 들어올 길을 만들어 두지 않는다.
INSERT INTO users (login_id, display_name, password_hash, must_reset_pw, status)
SELECT 'demo-' || lpad(g::text, 3, '0'),
       '가상 ' || lpad(g::text, 2, '0'),
       'x-demo-no-login', false, 'active'
  FROM generate_series(1, 24) g
ON CONFLICT (login_id) DO NOTHING;

INSERT INTO memberships (user_id, org_id, role)
SELECT u.id, o.id, 'student'
  FROM users u, organizations o
 WHERE u.login_id LIKE 'demo-%' AND o.code = 'DEMO_HANBIT_ME'
ON CONFLICT DO NOTHING;

-- 기수 둘에 나눠 담는다. **한 기수에 몰아넣지 않는다**: 기수 비교 화면이
-- 한 줄짜리가 되면 그 화면이 무엇을 하는 자리인지 보이지 않는다.
INSERT INTO cohort_members (cohort_id, user_id)
SELECT c.id, u.id
  FROM users u
  JOIN LATERAL (
    SELECT id FROM cohorts WHERE org_id = (SELECT id FROM organizations WHERE code='DEMO_HANBIT_ME')
     ORDER BY id OFFSET (CASE WHEN right(u.login_id, 1)::int % 2 = 0 THEN 0 ELSE 1 END) LIMIT 1
  ) c ON true
 WHERE u.login_id LIKE 'demo-%'
ON CONFLICT DO NOTHING;

-- 좌석을 붙인다. 상태를 섞어 둔다: 완료만 있으면 흐름 화면이 직선이 된다.
WITH ranked AS (
  SELECT u.id AS user_id, row_number() OVER (ORDER BY u.login_id) AS rn
    FROM users u WHERE u.login_id LIKE 'demo-%'
), free AS (
  SELECT s.id, row_number() OVER (ORDER BY s.id) AS rn
    FROM seats s JOIN contracts c ON c.id = s.contract_id
    JOIN organizations o ON o.id = c.org_id
   WHERE o.code = 'DEMO_HANBIT_ME' AND s.user_id IS NULL
)
-- **같은 사람에게 좌석을 두 번 붙이지 않는다.** 이 파일을 두 번 돌렸을 때
-- 한 사람이 좌석 둘을 들고 응시가 중복되는 것을 한 번 겪었다
UPDATE seats s
   SET user_id = r.user_id,
       status = CASE WHEN r.rn <= 14 THEN 'completed'
                     WHEN r.rn <= 18 THEN 'started'
                     WHEN r.rn <= 22 THEN 'claimed'
                     ELSE 'invited' END,
       claimed_at = now() - (r.rn || ' days')::interval,
       completed_at = CASE WHEN r.rn <= 14 THEN now() - (r.rn || ' days')::interval END
  FROM ranked r JOIN free f ON f.rn = r.rn
 WHERE s.id = f.id
   AND NOT EXISTS (SELECT 1 FROM seats s2 WHERE s2.user_id = r.user_id);

-- 검사지 한 줄. **문항은 넣지 않는다**: 이 자료는 화면을 눌러 보려는
-- 것이고, 문항까지 지어내면 그것으로 응시가 되는 것처럼 보인다.
-- 실제 문항은 `npm run metri:items` 가 원본 엑셀에서 넣는다.
INSERT INTO instruments (major_id, version, status, published_at, track_code,
                         item_count, est_minutes, instrument_key)
SELECT m.id, 'demo', 'published', now(), 'UNIV_HIGH', 0, 0, 'DEMO_UNIV'
  FROM majors m
 WHERE NOT EXISTS (SELECT 1 FROM instruments i WHERE i.instrument_key = 'DEMO_UNIV')
 LIMIT 1;

-- 회차 하나. 응시는 회차에 매달려 있어야 기관 집계가 센다.
INSERT INTO test_sessions (org_id, contract_id, instrument_id, name,
                           opens_at, closes_at, release_mode, kind)
SELECT o.id, c.id, i.id, '2026-1학기 기계공학과 진단',
       now() - interval '30 days', now() + interval '30 days', 'manual', 'org'
  FROM organizations o
  JOIN contracts c ON c.org_id = o.id
  JOIN instruments i ON i.instrument_key = 'DEMO_UNIV'
 WHERE o.code = 'DEMO_HANBIT_ME'
   AND NOT EXISTS (SELECT 1 FROM test_sessions t WHERE t.org_id = o.id)
LIMIT 1;

-- 응시. 좌석 상태와 맞춘다: 완료 좌석은 채점까지, 시작 좌석은 응시 중.
INSERT INTO attempts (session_id, user_id, seat_id, status, started_at, submitted_at, scored_at)
SELECT ts.id, s.user_id, s.id,
       CASE WHEN s.status = 'completed' THEN 'scored' ELSE 'in_progress' END,
       s.claimed_at,
       CASE WHEN s.status = 'completed' THEN s.completed_at END,
       CASE WHEN s.status = 'completed' THEN s.completed_at END
  FROM seats s
  JOIN contracts c ON c.id = s.contract_id
  JOIN organizations o ON o.id = c.org_id
  JOIN test_sessions ts ON ts.org_id = o.id
 WHERE o.code = 'DEMO_HANBIT_ME'
   AND s.user_id IS NOT NULL
   AND s.status IN ('completed', 'started')
   AND NOT EXISTS (SELECT 1 FROM attempts a WHERE a.seat_id = s.id);

-- 직무 적합. **지어낸 값이다**: 채점 엔진을 거치지 않았다. 화면이 순위를
-- 어떻게 그리는지 보려고 넣는 것이고, 분포가 한쪽으로 쏠리게 둔다.
INSERT INTO job_fit_scores (attempt_id, job_id, fit_score, a_score, p_score,
                            band_low, band_high, rank_no, tier)
SELECT a.id, j.id,
       90 - (j.rn * 3), 80 - j.rn, 75 - j.rn,
       85 - (j.rn * 3), 95 - (j.rn * 3), j.rn, j.rn
  FROM attempts a
  JOIN LATERAL (
    SELECT jc.id, row_number() OVER (ORDER BY (jc.id + a.id) % 7, jc.id) AS rn
      FROM job_clusters jc LIMIT 3
  ) j ON true
 WHERE a.status = 'scored'
   AND NOT EXISTS (SELECT 1 FROM job_fit_scores f WHERE f.attempt_id = a.id);

-- 비어 있는 증거. 상위 5개만 남긴다(20개를 처방하면 0개를 처방한 것과 같다).
INSERT INTO skill_gap_items (attempt_id, job_id, competency_id, required_level,
                             held_level, priority, action_kind, rank_no)
SELECT a.id, f.job_id, c.id, 4,
       CASE WHEN c.rn % 3 = 0 THEN 4 WHEN c.rn % 3 = 1 THEN 2 ELSE 0 END,
       5 - c.rn,
       (ARRAY['project', 'course', 'cert', 'online', 'camp'])[c.rn],
       c.rn
  FROM attempts a
  JOIN LATERAL (SELECT job_id FROM job_fit_scores WHERE attempt_id = a.id
                 ORDER BY rank_no LIMIT 1) f ON true
  JOIN LATERAL (
    SELECT cm.id, row_number() OVER (ORDER BY (cm.id + a.id) % 11, cm.id) AS rn
      FROM competencies cm LIMIT 5
  ) c ON true
 WHERE a.status = 'scored'
   AND NOT EXISTS (SELECT 1 FROM skill_gap_items g WHERE g.attempt_id = a.id);

-- 적어 주신 경험. 도구 이름만 적은 줄과 경험에 걸린 줄을 섞는다:
-- 두 상태를 가르는 화면이 있어서 둘 다 있어야 한다.
INSERT INTO learner_evidence (user_id, competency_id, source_code, ref_label,
                              grade, raw_point)
SELECT u.id, c.id, es.code,
       CASE WHEN right(u.login_id, 1)::int % 2 = 0
            THEN '브래킷 경량화 캡스톤' ELSE NULL END,
       NULL, 1.0
  FROM users u
  JOIN LATERAL (SELECT id FROM competencies ORDER BY (id + length(u.login_id)) % 13 LIMIT 2) c ON true
  JOIN LATERAL (SELECT code FROM evidence_sources ORDER BY code LIMIT 1) es ON true
 WHERE u.login_id LIKE 'demo-%'
   AND NOT EXISTS (SELECT 1 FROM learner_evidence le WHERE le.user_id = u.id);

-- 학년. 학위 단계 칸이 없어서 학년으로 센다(화면도 '학년' 이라고 적는다).
INSERT INTO learner_profiles (user_id, track_code, grade_year)
SELECT u.id, 'UNIV_HIGH', 3 + (right(u.login_id, 1)::int % 2)
  FROM users u WHERE u.login_id LIKE 'demo-%'
ON CONFLICT (user_id) DO NOTHING;
