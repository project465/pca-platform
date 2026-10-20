-- 생성물: node --experimental-strip-types scripts/sejong/seed-demo.mjs --psql-vars
-- 직접 고치지 않는다. 합성 DEMO 자료만 들어 있고 비밀번호는 없다.
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 --single-transaction \
--     -v pw_admin=… -v pw_counsel=… -v pw_seeker=… -v pw_virtual=… \
--     -f db/sejong/seed_sejong_demo.sql
--
-- 지키는 것 둘: 비밀번호 변수가 없으면 멈춘다 · 시연이 아닌 사용자가 한 명이라도
-- 있는 DB(운영·배재대 Staging 같은)에서는 멈춘다.
\if :{?pw_admin}
\else
\echo 'pw_admin · pw_counsel · pw_seeker · pw_virtual 을 -v 로 주십시오.'
\quit
\endif
SELECT count(*) AS sj_real_users FROM users WHERE NOT is_demo \gset
SELECT :sj_real_users > 0 AS sj_has_real \gset
\if :sj_has_real
\echo '시연이 아닌 사용자가 있는 DB 입니다. 세종 시연 시드를 넣지 않습니다.'
\quit
\endif
-- 세종 시연 자료 (scripts/sejong/seed-demo.mjs). 개발·시연 DB 전용
CREATE EXTENSION IF NOT EXISTS pgcrypto;
INSERT INTO organizations (code, country, org_type, name, language, workspace_settings, aggregate_min_cell, is_demo)
     VALUES ('SJEPA_DEMO', 'KR', 'agency', '세종일자리경제진흥원 (시연)', 'ko',
             '{"individual_access": true, "tenant": "sejong", "demo": true}'::jsonb, 5, true)
     ON CONFLICT (code) DO NOTHING;
INSERT INTO sj_programs (code, org_id, name, region_rule, is_demo) VALUES
     ('SJ-DEMO-A', (SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), '시연 사업 A · 구직 역량 진단 (가상)', 'NONE', true),
     ('SJ-DEMO-B', (SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), '시연 사업 B · 세종 지역 취업 연계 (가상, 세종 한정)', 'SEJONG_ONLY', true)
     ON CONFLICT (code) DO NOTHING;
INSERT INTO users (login_id, password_hash, display_name, must_reset_pw, is_demo, pw_login)
       VALUES ('sj-admin', crypt(:'pw_admin', gen_salt('bf', 12)), '시연 관리자', false, true, true)
       ON CONFLICT DO NOTHING;
INSERT INTO memberships (user_id, org_id, role) VALUES ((SELECT id FROM users WHERE login_id = 'sj-admin'), (SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), 'org_admin')
       ON CONFLICT (user_id, org_id, role) DO NOTHING;
INSERT INTO sj_staff (user_id, org_id, kind) VALUES ((SELECT id FROM users WHERE login_id = 'sj-admin'), (SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), 'admin') ON CONFLICT DO NOTHING;
INSERT INTO users (login_id, password_hash, display_name, must_reset_pw, is_demo, pw_login)
       VALUES ('sj-counsel1', crypt(:'pw_counsel', gen_salt('bf', 12)), '시연 상담사 1', false, true, true)
       ON CONFLICT DO NOTHING;
INSERT INTO users (login_id, password_hash, display_name, must_reset_pw, is_demo, pw_login)
       VALUES ('sj-counsel2', crypt(:'pw_counsel', gen_salt('bf', 12)), '시연 상담사 2', false, true, true)
       ON CONFLICT DO NOTHING;
INSERT INTO memberships (user_id, org_id, role) VALUES ((SELECT id FROM users WHERE login_id = 'sj-counsel1'), (SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), 'instructor')
       ON CONFLICT (user_id, org_id, role) DO NOTHING;
INSERT INTO sj_staff (user_id, org_id, kind) VALUES ((SELECT id FROM users WHERE login_id = 'sj-counsel1'), (SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), 'counselor') ON CONFLICT DO NOTHING;
INSERT INTO memberships (user_id, org_id, role) VALUES ((SELECT id FROM users WHERE login_id = 'sj-counsel2'), (SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), 'instructor')
       ON CONFLICT (user_id, org_id, role) DO NOTHING;
INSERT INTO sj_staff (user_id, org_id, kind) VALUES ((SELECT id FROM users WHERE login_id = 'sj-counsel2'), (SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), 'counselor') ON CONFLICT DO NOTHING;
INSERT INTO users (login_id, password_hash, display_name, must_reset_pw, is_demo, pw_login)
       VALUES ('sj-demo01', crypt(:'pw_seeker', gen_salt('bf', 12)), '시연 구직자', false, true, true)
       ON CONFLICT DO NOTHING;
INSERT INTO memberships (user_id, org_id, role) VALUES ((SELECT id FROM users WHERE login_id = 'sj-demo01'), (SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), 'student')
       ON CONFLICT (user_id, org_id, role) DO NOTHING;
INSERT INTO sj_participants (user_id, org_id, program_code, participant_no)
     VALUES ((SELECT id FROM users WHERE login_id = 'sj-demo01'), (SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), 'SJ-DEMO-A', 'SJ-A-000') ON CONFLICT DO NOTHING;
INSERT INTO sj_counselor_assignments (org_id, counselor_user_id, participant_user_id)
     VALUES ((SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), (SELECT id FROM users WHERE login_id = 'sj-counsel1'), (SELECT id FROM users WHERE login_id = 'sj-demo01')) ON CONFLICT DO NOTHING;
INSERT INTO users (login_id, password_hash, display_name, must_reset_pw, is_demo, pw_login)
       VALUES ('sj-v01', crypt(:'pw_virtual', gen_salt('bf', 12)), '가상 참여자 01', false, true, true)
       ON CONFLICT DO NOTHING;
INSERT INTO memberships (user_id, org_id, role) VALUES ((SELECT id FROM users WHERE login_id = 'sj-v01'), (SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), 'student')
       ON CONFLICT (user_id, org_id, role) DO NOTHING;
INSERT INTO sj_participants (user_id, org_id, program_code, participant_no)
       VALUES ((SELECT id FROM users WHERE login_id = 'sj-v01'), (SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), 'SJ-DEMO-A', 'SJ-A-001') ON CONFLICT DO NOTHING;
INSERT INTO sj_counselor_assignments (org_id, counselor_user_id, participant_user_id)
       VALUES ((SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), (SELECT id FROM users WHERE login_id = 'sj-counsel1'), (SELECT id FROM users WHERE login_id = 'sj-v01')) ON CONFLICT DO NOTHING;
INSERT INTO users (login_id, password_hash, display_name, must_reset_pw, is_demo, pw_login)
       VALUES ('sj-v02', crypt(:'pw_virtual', gen_salt('bf', 12)), '가상 참여자 02', false, true, true)
       ON CONFLICT DO NOTHING;
INSERT INTO memberships (user_id, org_id, role) VALUES ((SELECT id FROM users WHERE login_id = 'sj-v02'), (SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), 'student')
       ON CONFLICT (user_id, org_id, role) DO NOTHING;
INSERT INTO sj_participants (user_id, org_id, program_code, participant_no)
       VALUES ((SELECT id FROM users WHERE login_id = 'sj-v02'), (SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), 'SJ-DEMO-A', 'SJ-A-002') ON CONFLICT DO NOTHING;
INSERT INTO sj_counselor_assignments (org_id, counselor_user_id, participant_user_id)
       VALUES ((SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), (SELECT id FROM users WHERE login_id = 'sj-counsel2'), (SELECT id FROM users WHERE login_id = 'sj-v02')) ON CONFLICT DO NOTHING;
INSERT INTO users (login_id, password_hash, display_name, must_reset_pw, is_demo, pw_login)
       VALUES ('sj-v03', crypt(:'pw_virtual', gen_salt('bf', 12)), '가상 참여자 03', false, true, true)
       ON CONFLICT DO NOTHING;
INSERT INTO memberships (user_id, org_id, role) VALUES ((SELECT id FROM users WHERE login_id = 'sj-v03'), (SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), 'student')
       ON CONFLICT (user_id, org_id, role) DO NOTHING;
INSERT INTO sj_participants (user_id, org_id, program_code, participant_no)
       VALUES ((SELECT id FROM users WHERE login_id = 'sj-v03'), (SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), 'SJ-DEMO-A', 'SJ-A-003') ON CONFLICT DO NOTHING;
INSERT INTO sj_counselor_assignments (org_id, counselor_user_id, participant_user_id)
       VALUES ((SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), (SELECT id FROM users WHERE login_id = 'sj-counsel1'), (SELECT id FROM users WHERE login_id = 'sj-v03')) ON CONFLICT DO NOTHING;
INSERT INTO users (login_id, password_hash, display_name, must_reset_pw, is_demo, pw_login)
       VALUES ('sj-v04', crypt(:'pw_virtual', gen_salt('bf', 12)), '가상 참여자 04', false, true, true)
       ON CONFLICT DO NOTHING;
INSERT INTO memberships (user_id, org_id, role) VALUES ((SELECT id FROM users WHERE login_id = 'sj-v04'), (SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), 'student')
       ON CONFLICT (user_id, org_id, role) DO NOTHING;
INSERT INTO sj_participants (user_id, org_id, program_code, participant_no)
       VALUES ((SELECT id FROM users WHERE login_id = 'sj-v04'), (SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), 'SJ-DEMO-A', 'SJ-A-004') ON CONFLICT DO NOTHING;
INSERT INTO sj_counselor_assignments (org_id, counselor_user_id, participant_user_id)
       VALUES ((SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), (SELECT id FROM users WHERE login_id = 'sj-counsel2'), (SELECT id FROM users WHERE login_id = 'sj-v04')) ON CONFLICT DO NOTHING;
INSERT INTO users (login_id, password_hash, display_name, must_reset_pw, is_demo, pw_login)
       VALUES ('sj-v05', crypt(:'pw_virtual', gen_salt('bf', 12)), '가상 참여자 05', false, true, true)
       ON CONFLICT DO NOTHING;
INSERT INTO memberships (user_id, org_id, role) VALUES ((SELECT id FROM users WHERE login_id = 'sj-v05'), (SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), 'student')
       ON CONFLICT (user_id, org_id, role) DO NOTHING;
INSERT INTO sj_participants (user_id, org_id, program_code, participant_no)
       VALUES ((SELECT id FROM users WHERE login_id = 'sj-v05'), (SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), 'SJ-DEMO-A', 'SJ-A-005') ON CONFLICT DO NOTHING;
INSERT INTO sj_counselor_assignments (org_id, counselor_user_id, participant_user_id)
       VALUES ((SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), (SELECT id FROM users WHERE login_id = 'sj-counsel1'), (SELECT id FROM users WHERE login_id = 'sj-v05')) ON CONFLICT DO NOTHING;
UPDATE users SET last_login_at = now() - interval '4 days' - interval '1 hour' WHERE id = (SELECT id FROM users WHERE login_id = 'sj-v05');
INSERT INTO consents (user_id, kind, version, granted, org_id)
         VALUES ((SELECT id FROM users WHERE login_id = 'sj-v05'), 'data_visibility', 'SJ-DEMO-COUNSELOR-1', true, (SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'));
INSERT INTO users (login_id, password_hash, display_name, must_reset_pw, is_demo, pw_login)
       VALUES ('sj-v06', crypt(:'pw_virtual', gen_salt('bf', 12)), '가상 참여자 06', false, true, true)
       ON CONFLICT DO NOTHING;
INSERT INTO memberships (user_id, org_id, role) VALUES ((SELECT id FROM users WHERE login_id = 'sj-v06'), (SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), 'student')
       ON CONFLICT (user_id, org_id, role) DO NOTHING;
INSERT INTO sj_participants (user_id, org_id, program_code, participant_no)
       VALUES ((SELECT id FROM users WHERE login_id = 'sj-v06'), (SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), 'SJ-DEMO-A', 'SJ-A-006') ON CONFLICT DO NOTHING;
INSERT INTO sj_counselor_assignments (org_id, counselor_user_id, participant_user_id)
       VALUES ((SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), (SELECT id FROM users WHERE login_id = 'sj-counsel2'), (SELECT id FROM users WHERE login_id = 'sj-v06')) ON CONFLICT DO NOTHING;
UPDATE users SET last_login_at = now() - interval '5 days' - interval '1 hour' WHERE id = (SELECT id FROM users WHERE login_id = 'sj-v06');
INSERT INTO consents (user_id, kind, version, granted, org_id)
         VALUES ((SELECT id FROM users WHERE login_id = 'sj-v06'), 'data_visibility', 'SJ-DEMO-COUNSELOR-1', true, (SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'));
INSERT INTO users (login_id, password_hash, display_name, must_reset_pw, is_demo, pw_login)
       VALUES ('sj-v07', crypt(:'pw_virtual', gen_salt('bf', 12)), '가상 참여자 07', false, true, true)
       ON CONFLICT DO NOTHING;
INSERT INTO memberships (user_id, org_id, role) VALUES ((SELECT id FROM users WHERE login_id = 'sj-v07'), (SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), 'student')
       ON CONFLICT (user_id, org_id, role) DO NOTHING;
INSERT INTO sj_participants (user_id, org_id, program_code, participant_no)
       VALUES ((SELECT id FROM users WHERE login_id = 'sj-v07'), (SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), 'SJ-DEMO-A', 'SJ-A-007') ON CONFLICT DO NOTHING;
INSERT INTO sj_counselor_assignments (org_id, counselor_user_id, participant_user_id)
       VALUES ((SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), (SELECT id FROM users WHERE login_id = 'sj-counsel1'), (SELECT id FROM users WHERE login_id = 'sj-v07')) ON CONFLICT DO NOTHING;
UPDATE users SET last_login_at = now() - interval '6 days' - interval '1 hour' WHERE id = (SELECT id FROM users WHERE login_id = 'sj-v07');
INSERT INTO sj_attempts (user_id, org_id, program_code, instrument_version, profile, started_at)
         VALUES ((SELECT id FROM users WHERE login_id = 'sj-v07'), (SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), 'SJ-DEMO-A', 'SJ_JOBSEEKER_DEMO_V0', '{"audience":"career_changer","job_areas":["JA05","JA10"],"region_range":"ADJACENT","skills":[]}'::jsonb, now() - interval '7 days');
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v07') ORDER BY started_at DESC LIMIT 1), 'J1a', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v07') ORDER BY started_at DESC LIMIT 1), 'J1b', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v07') ORDER BY started_at DESC LIMIT 1), 'J1c', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v07') ORDER BY started_at DESC LIMIT 1), 'J3b', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v07') ORDER BY started_at DESC LIMIT 1), 'J3c', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v07') ORDER BY started_at DESC LIMIT 1), 'J4b', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v07') ORDER BY started_at DESC LIMIT 1), 'J4c', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v07') ORDER BY started_at DESC LIMIT 1), 'J5b', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v07') ORDER BY started_at DESC LIMIT 1), 'J6b', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v07') ORDER BY started_at DESC LIMIT 1), 'J7a', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v07') ORDER BY started_at DESC LIMIT 1), 'J8c', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO users (login_id, password_hash, display_name, must_reset_pw, is_demo, pw_login)
       VALUES ('sj-v08', crypt(:'pw_virtual', gen_salt('bf', 12)), '가상 참여자 08', false, true, true)
       ON CONFLICT DO NOTHING;
INSERT INTO memberships (user_id, org_id, role) VALUES ((SELECT id FROM users WHERE login_id = 'sj-v08'), (SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), 'student')
       ON CONFLICT (user_id, org_id, role) DO NOTHING;
INSERT INTO sj_participants (user_id, org_id, program_code, participant_no)
       VALUES ((SELECT id FROM users WHERE login_id = 'sj-v08'), (SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), 'SJ-DEMO-A', 'SJ-A-008') ON CONFLICT DO NOTHING;
INSERT INTO sj_counselor_assignments (org_id, counselor_user_id, participant_user_id)
       VALUES ((SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), (SELECT id FROM users WHERE login_id = 'sj-counsel2'), (SELECT id FROM users WHERE login_id = 'sj-v08')) ON CONFLICT DO NOTHING;
UPDATE users SET last_login_at = now() - interval '0 days' - interval '1 hour' WHERE id = (SELECT id FROM users WHERE login_id = 'sj-v08');
INSERT INTO consents (user_id, kind, version, granted, org_id)
         VALUES ((SELECT id FROM users WHERE login_id = 'sj-v08'), 'data_visibility', 'SJ-DEMO-COUNSELOR-1', true, (SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'));
INSERT INTO sj_attempts (user_id, org_id, program_code, instrument_version, profile, started_at)
         VALUES ((SELECT id FROM users WHERE login_id = 'sj-v08'), (SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), 'SJ-DEMO-A', 'SJ_JOBSEEKER_DEMO_V0', '{"audience":"career_changer","job_areas":["JA08","JA05"],"region_range":"ADJACENT","skills":[]}'::jsonb, now() - interval '1 days');
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v08') ORDER BY started_at DESC LIMIT 1), 'J1b', 3)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v08') ORDER BY started_at DESC LIMIT 1), 'J1c', 2)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v08') ORDER BY started_at DESC LIMIT 1), 'J2a', 2)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v08') ORDER BY started_at DESC LIMIT 1), 'J3c', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v08') ORDER BY started_at DESC LIMIT 1), 'J4a', 2)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v08') ORDER BY started_at DESC LIMIT 1), 'J4c', 2)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v08') ORDER BY started_at DESC LIMIT 1), 'J5b', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v08') ORDER BY started_at DESC LIMIT 1), 'J6a', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v08') ORDER BY started_at DESC LIMIT 1), 'J6b', 2)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v08') ORDER BY started_at DESC LIMIT 1), 'J7a', 3)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v08') ORDER BY started_at DESC LIMIT 1), 'J7b', 3)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v08') ORDER BY started_at DESC LIMIT 1), 'J7c', 2)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v08') ORDER BY started_at DESC LIMIT 1), 'J8a', 3)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v08') ORDER BY started_at DESC LIMIT 1), 'J8c', 2)
         ON CONFLICT DO NOTHING;
INSERT INTO users (login_id, password_hash, display_name, must_reset_pw, is_demo, pw_login)
       VALUES ('sj-v09', crypt(:'pw_virtual', gen_salt('bf', 12)), '가상 참여자 09', false, true, true)
       ON CONFLICT DO NOTHING;
INSERT INTO memberships (user_id, org_id, role) VALUES ((SELECT id FROM users WHERE login_id = 'sj-v09'), (SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), 'student')
       ON CONFLICT (user_id, org_id, role) DO NOTHING;
INSERT INTO sj_participants (user_id, org_id, program_code, participant_no)
       VALUES ((SELECT id FROM users WHERE login_id = 'sj-v09'), (SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), 'SJ-DEMO-A', 'SJ-A-009') ON CONFLICT DO NOTHING;
INSERT INTO sj_counselor_assignments (org_id, counselor_user_id, participant_user_id)
       VALUES ((SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), (SELECT id FROM users WHERE login_id = 'sj-counsel1'), (SELECT id FROM users WHERE login_id = 'sj-v09')) ON CONFLICT DO NOTHING;
UPDATE users SET last_login_at = now() - interval '1 days' - interval '1 hour' WHERE id = (SELECT id FROM users WHERE login_id = 'sj-v09');
INSERT INTO consents (user_id, kind, version, granted, org_id)
         VALUES ((SELECT id FROM users WHERE login_id = 'sj-v09'), 'data_visibility', 'SJ-DEMO-COUNSELOR-1', true, (SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'));
INSERT INTO sj_attempts (user_id, org_id, program_code, instrument_version, profile, started_at)
         VALUES ((SELECT id FROM users WHERE login_id = 'sj-v09'), (SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), 'SJ-DEMO-A', 'SJ_JOBSEEKER_DEMO_V0', '{"audience":"youth_student","job_areas":["JA10","JA09"],"region_range":"HOME_ONLY","skills":[]}'::jsonb, now() - interval '2 days');
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v09') ORDER BY started_at DESC LIMIT 1), 'J1a', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v09') ORDER BY started_at DESC LIMIT 1), 'J1b', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v09') ORDER BY started_at DESC LIMIT 1), 'J2c', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v09') ORDER BY started_at DESC LIMIT 1), 'J4b', 3)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v09') ORDER BY started_at DESC LIMIT 1), 'J4c', 2)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v09') ORDER BY started_at DESC LIMIT 1), 'J5b', 3)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v09') ORDER BY started_at DESC LIMIT 1), 'J6a', 2)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v09') ORDER BY started_at DESC LIMIT 1), 'J6c', 2)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v09') ORDER BY started_at DESC LIMIT 1), 'J7a', 2)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v09') ORDER BY started_at DESC LIMIT 1), 'J7b', 2)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v09') ORDER BY started_at DESC LIMIT 1), 'J7c', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v09') ORDER BY started_at DESC LIMIT 1), 'J8a', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO users (login_id, password_hash, display_name, must_reset_pw, is_demo, pw_login)
       VALUES ('sj-v10', crypt(:'pw_virtual', gen_salt('bf', 12)), '가상 참여자 10', false, true, true)
       ON CONFLICT DO NOTHING;
INSERT INTO memberships (user_id, org_id, role) VALUES ((SELECT id FROM users WHERE login_id = 'sj-v10'), (SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), 'student')
       ON CONFLICT (user_id, org_id, role) DO NOTHING;
INSERT INTO sj_participants (user_id, org_id, program_code, participant_no)
       VALUES ((SELECT id FROM users WHERE login_id = 'sj-v10'), (SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), 'SJ-DEMO-A', 'SJ-A-010') ON CONFLICT DO NOTHING;
INSERT INTO sj_counselor_assignments (org_id, counselor_user_id, participant_user_id)
       VALUES ((SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), (SELECT id FROM users WHERE login_id = 'sj-counsel2'), (SELECT id FROM users WHERE login_id = 'sj-v10')) ON CONFLICT DO NOTHING;
UPDATE users SET last_login_at = now() - interval '2 days' - interval '1 hour' WHERE id = (SELECT id FROM users WHERE login_id = 'sj-v10');
INSERT INTO sj_attempts (user_id, org_id, program_code, instrument_version, profile, started_at)
         VALUES ((SELECT id FROM users WHERE login_id = 'sj-v10'), (SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), 'SJ-DEMO-A', 'SJ_JOBSEEKER_DEMO_V0', '{"audience":"jobseeker","job_areas":["JA05","JA03"],"region_range":"ANYWHERE","skills":[]}'::jsonb, now() - interval '3 days');
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v10') ORDER BY started_at DESC LIMIT 1), 'J1b', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v10') ORDER BY started_at DESC LIMIT 1), 'J2a', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v10') ORDER BY started_at DESC LIMIT 1), 'J2b', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v10') ORDER BY started_at DESC LIMIT 1), 'J2c', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v10') ORDER BY started_at DESC LIMIT 1), 'J3a', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v10') ORDER BY started_at DESC LIMIT 1), 'J4a', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v10') ORDER BY started_at DESC LIMIT 1), 'J4b', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v10') ORDER BY started_at DESC LIMIT 1), 'J4c', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v10') ORDER BY started_at DESC LIMIT 1), 'J5b', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v10') ORDER BY started_at DESC LIMIT 1), 'J6a', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v10') ORDER BY started_at DESC LIMIT 1), 'J6c', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v10') ORDER BY started_at DESC LIMIT 1), 'J7a', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v10') ORDER BY started_at DESC LIMIT 1), 'J8c', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO users (login_id, password_hash, display_name, must_reset_pw, is_demo, pw_login)
       VALUES ('sj-v11', crypt(:'pw_virtual', gen_salt('bf', 12)), '가상 참여자 11', false, true, true)
       ON CONFLICT DO NOTHING;
INSERT INTO memberships (user_id, org_id, role) VALUES ((SELECT id FROM users WHERE login_id = 'sj-v11'), (SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), 'student')
       ON CONFLICT (user_id, org_id, role) DO NOTHING;
INSERT INTO sj_participants (user_id, org_id, program_code, participant_no)
       VALUES ((SELECT id FROM users WHERE login_id = 'sj-v11'), (SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), 'SJ-DEMO-A', 'SJ-A-011') ON CONFLICT DO NOTHING;
INSERT INTO sj_counselor_assignments (org_id, counselor_user_id, participant_user_id)
       VALUES ((SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), (SELECT id FROM users WHERE login_id = 'sj-counsel1'), (SELECT id FROM users WHERE login_id = 'sj-v11')) ON CONFLICT DO NOTHING;
UPDATE users SET last_login_at = now() - interval '3 days' - interval '1 hour' WHERE id = (SELECT id FROM users WHERE login_id = 'sj-v11');
INSERT INTO consents (user_id, kind, version, granted, org_id)
         VALUES ((SELECT id FROM users WHERE login_id = 'sj-v11'), 'data_visibility', 'SJ-DEMO-COUNSELOR-1', true, (SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'));
INSERT INTO sj_experiences (user_id, kind, title, job_area, checks, skills)
         VALUES ((SELECT id FROM users WHERE login_id = 'sj-v11'), 'intern', '카페 매장 운영', 'JA06', ARRAY['used_where']::text[], ARRAY[]::text[]);
INSERT INTO sj_experiences (user_id, kind, title, job_area, checks, skills)
         VALUES ((SELECT id FROM users WHERE login_id = 'sj-v11'), 'work', '공공기관 행정 인턴', 'JA06', ARRAY['verifications']::text[], ARRAY[]::text[]);
INSERT INTO sj_experiences (user_id, kind, title, job_area, checks, skills)
         VALUES ((SELECT id FROM users WHERE login_id = 'sj-v11'), 'project', '물류센터 출고 검수', 'JA01', ARRAY['decisions','artifacts','verifications']::text[], ARRAY[]::text[]);
INSERT INTO sj_attempts (user_id, org_id, program_code, instrument_version, profile, status, result,
                                  analysis_version, started_at, scored_at)
         VALUES ((SELECT id FROM users WHERE login_id = 'sj-v11'), (SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), 'SJ-DEMO-A', 'SJ_JOBSEEKER_DEMO_V0', '{"audience":"midcareer","job_areas":["JA06","JA01"],"region_range":"UNDECIDED","skills":[]}'::jsonb, 'scored',
                 '{"analysis_version":"sj-demo-analysis.0","instrument_version":"SJ_JOBSEEKER_DEMO_V0","demo":true,"profile":{"audience":"midcareer","job_areas":["JA06","JA01"],"region_range":"UNDECIDED","skills":[]},"axes":[{"axis":"J1","name":"문제 정의","question":"무엇을 다룰지 누가 정했는가","level":1,"evidence":[],"evidence_possible":true,"state":"EXPOSED"},{"axis":"J2","name":"요구사항 해석","question":"요구를 수치와 제약으로 옮겼는가","level":1,"evidence":[],"evidence_possible":false,"state":"EXPOSED"},{"axis":"J3","name":"직접 기술 판단","question":"내가 정한 항목이 무엇인가","level":1,"evidence":[{"id":"10-2","title":"물류센터 출고 검수"}],"evidence_possible":true,"state":"EXPOSED"},{"axis":"J4","name":"방법·도구","question":"무엇으로 어떻게 했는가","level":1,"evidence":[],"evidence_possible":false,"state":"EXPOSED"},{"axis":"J5","name":"산출물","question":"무엇이 남았는가","level":1,"evidence":[{"id":"10-2","title":"물류센터 출고 검수"}],"evidence_possible":true,"state":"EXPOSED"},{"axis":"J6","name":"비교·검증","question":"무엇과 견주었는가","level":0,"evidence":[{"id":"10-1","title":"공공기관 행정 인턴"},{"id":"10-2","title":"물류센터 출고 검수"}],"evidence_possible":true,"state":"NONE"},{"axis":"J7","name":"실패·수정","question":"틀린 것을 어떻게 좁혔는가","level":0,"evidence":[],"evidence_possible":false,"state":"NONE"},{"axis":"J8","name":"조직 활용","question":"누가 무엇에 썼는가","level":1,"evidence":[{"id":"10-0","title":"카페 매장 운영"}],"evidence_possible":true,"state":"EXPOSED"}],"areas":[{"code":"JA06","name":"바이오·제약·식품","one_line":"규정과 위생 기준 안에서 제조·시험·품질 업무를 한다","core_ref":["BT_CORE_V1","FOOD_CORE_V1"],"key":[{"axis":"J2","name":"요구사항 해석","state":"EXPOSED"},{"axis":"J4","name":"방법·도구","state":"EXPOSED"},{"axis":"J6","name":"비교·검증","state":"NONE"},{"axis":"J7","name":"실패·수정","state":"NONE"}],"counts":{"confirmed":0,"claimed":0,"to_fill":4}},{"code":"JA01","name":"공공행정·정책 지원","one_line":"기관의 사업과 민원, 행정 절차를 기준에 맞게 처리한다","core_ref":["PUBADM_CORE_V1"],"key":[{"axis":"J1","name":"문제 정의","state":"EXPOSED"},{"axis":"J2","name":"요구사항 해석","state":"EXPOSED"},{"axis":"J6","name":"비교·검증","state":"NONE"},{"axis":"J8","name":"조직 활용","state":"EXPOSED"}],"counts":{"confirmed":0,"claimed":0,"to_fill":4}}],"strengths":[],"gaps":[{"area":"JA06","axis":"J2"},{"area":"JA06","axis":"J4"},{"area":"JA06","axis":"J6"},{"area":"JA06","axis":"J7"},{"area":"JA01","axis":"J1"},{"area":"JA01","axis":"J2"},{"area":"JA01","axis":"J6"},{"area":"JA01","axis":"J8"}],"actions":[{"code":"RG-EXPLORE","horizon":"D30","kind":"region","text":"세종 사업장 기업·기관 탐색에서 관심 있는 곳 세 곳을 고르고, 공식 누리집의 채용 안내를 직접 확인하기"},{"code":"GR-J2","horizon":"D60","axis":"J2","kind":"growth","text":"맡은 일의 기준(기한·수량·규정)을 표 하나로 정리해 보기"},{"code":"GR-J4","horizon":"D60","axis":"J4","kind":"growth","text":"희망 직무에서 많이 쓰는 도구 하나를 정해 실습하기 (직업훈련 과정 확인)"},{"code":"GR-J6","horizon":"D60","axis":"J6","kind":"growth","text":"결과를 기준이나 이전 값과 비교한 기록을 하나 남기기"},{"code":"GR-J7","horizon":"D60","axis":"J7","kind":"growth","text":"틀어졌던 일 하나를 골라 원인과 고친 방법을 적어 보기"},{"code":"GR-J1","horizon":"D60","axis":"J1","kind":"growth","text":"다음 업무·훈련에서 ''무엇이 문제였는지''를 한 문장으로 적어 두기"},{"code":"GR-J8","horizon":"D60","axis":"J8","kind":"growth","text":"내 결과를 누가 어디에 썼는지 확인해 경험 기록에 적기"},{"code":"GR-TRAINING","horizon":"D60","kind":"growth","text":"희망 직무의 직업훈련·자격 과정을 고용24에서 찾아 하나를 정하기"},{"code":"AP-POSTING","horizon":"D90","kind":"apply","text":"고용24나 기업 누리집의 원 공고를 찾아 지원서에 이 결과의 근거 경험을 넣어 직접 지원하기"},{"code":"AP-RECHECK","horizon":"D90","kind":"apply","text":"새로 쌓은 경험을 기록하고 진단을 다시 받아 달라진 칸 확인하기"}],"quality":{"answered":24,"of":24,"flat":false},"evidence_count":3,"computed_at":"2026-10-20T00:00:00.000Z"}'::jsonb, 'sj-demo-analysis.0', now() - interval '4 days', now() - interval '4 days' + interval '25 minutes');
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v11') ORDER BY started_at DESC LIMIT 1), 'J1a', 2)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v11') ORDER BY started_at DESC LIMIT 1), 'J1b', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v11') ORDER BY started_at DESC LIMIT 1), 'J1c', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v11') ORDER BY started_at DESC LIMIT 1), 'J2a', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v11') ORDER BY started_at DESC LIMIT 1), 'J2b', 2)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v11') ORDER BY started_at DESC LIMIT 1), 'J2c', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v11') ORDER BY started_at DESC LIMIT 1), 'J3a', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v11') ORDER BY started_at DESC LIMIT 1), 'J3b', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v11') ORDER BY started_at DESC LIMIT 1), 'J3c', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v11') ORDER BY started_at DESC LIMIT 1), 'J4a', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v11') ORDER BY started_at DESC LIMIT 1), 'J4b', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v11') ORDER BY started_at DESC LIMIT 1), 'J4c', 2)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v11') ORDER BY started_at DESC LIMIT 1), 'J5a', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v11') ORDER BY started_at DESC LIMIT 1), 'J5b', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v11') ORDER BY started_at DESC LIMIT 1), 'J5c', 2)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v11') ORDER BY started_at DESC LIMIT 1), 'J6a', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v11') ORDER BY started_at DESC LIMIT 1), 'J6b', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v11') ORDER BY started_at DESC LIMIT 1), 'J6c', 2)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v11') ORDER BY started_at DESC LIMIT 1), 'J7a', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v11') ORDER BY started_at DESC LIMIT 1), 'J7b', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v11') ORDER BY started_at DESC LIMIT 1), 'J7c', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v11') ORDER BY started_at DESC LIMIT 1), 'J8a', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v11') ORDER BY started_at DESC LIMIT 1), 'J8b', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v11') ORDER BY started_at DESC LIMIT 1), 'J8c', 2)
         ON CONFLICT DO NOTHING;
INSERT INTO users (login_id, password_hash, display_name, must_reset_pw, is_demo, pw_login)
       VALUES ('sj-v12', crypt(:'pw_virtual', gen_salt('bf', 12)), '가상 참여자 12', false, true, true)
       ON CONFLICT DO NOTHING;
INSERT INTO memberships (user_id, org_id, role) VALUES ((SELECT id FROM users WHERE login_id = 'sj-v12'), (SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), 'student')
       ON CONFLICT (user_id, org_id, role) DO NOTHING;
INSERT INTO sj_participants (user_id, org_id, program_code, participant_no)
       VALUES ((SELECT id FROM users WHERE login_id = 'sj-v12'), (SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), 'SJ-DEMO-A', 'SJ-A-012') ON CONFLICT DO NOTHING;
INSERT INTO sj_counselor_assignments (org_id, counselor_user_id, participant_user_id)
       VALUES ((SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), (SELECT id FROM users WHERE login_id = 'sj-counsel2'), (SELECT id FROM users WHERE login_id = 'sj-v12')) ON CONFLICT DO NOTHING;
UPDATE users SET last_login_at = now() - interval '4 days' - interval '1 hour' WHERE id = (SELECT id FROM users WHERE login_id = 'sj-v12');
INSERT INTO consents (user_id, kind, version, granted, org_id)
         VALUES ((SELECT id FROM users WHERE login_id = 'sj-v12'), 'data_visibility', 'SJ-DEMO-COUNSELOR-1', true, (SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'));
INSERT INTO sj_experiences (user_id, kind, title, job_area, checks, skills)
         VALUES ((SELECT id FROM users WHERE login_id = 'sj-v12'), 'intern', '공공기관 행정 인턴', 'JA04', ARRAY['decisions','artifacts','verifications','used_where']::text[], ARRAY[]::text[]);
INSERT INTO sj_experiences (user_id, kind, title, job_area, checks, skills)
         VALUES ((SELECT id FROM users WHERE login_id = 'sj-v12'), 'credential', '물류센터 출고 검수', 'JA04', ARRAY['decisions']::text[], ARRAY[]::text[]);
INSERT INTO sj_experiences (user_id, kind, title, job_area, checks, skills)
         VALUES ((SELECT id FROM users WHERE login_id = 'sj-v12'), 'project', '카페 매장 운영', 'JA04', ARRAY['problems','verifications','used_where']::text[], ARRAY[]::text[]);
INSERT INTO sj_attempts (user_id, org_id, program_code, instrument_version, profile, status, result,
                                  analysis_version, started_at, scored_at)
         VALUES ((SELECT id FROM users WHERE login_id = 'sj-v12'), (SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), 'SJ-DEMO-A', 'SJ_JOBSEEKER_DEMO_V0', '{"audience":"youth_jobseeker","job_areas":["JA09","JA04"],"region_range":"UNDECIDED","skills":[]}'::jsonb, 'scored',
                 '{"analysis_version":"sj-demo-analysis.0","instrument_version":"SJ_JOBSEEKER_DEMO_V0","demo":true,"profile":{"audience":"youth_jobseeker","job_areas":["JA09","JA04"],"region_range":"UNDECIDED","skills":[]},"axes":[{"axis":"J1","name":"문제 정의","question":"무엇을 다룰지 누가 정했는가","level":2,"evidence":[{"id":"11-2","title":"카페 매장 운영"}],"evidence_possible":true,"state":"PARTIAL"},{"axis":"J2","name":"요구사항 해석","question":"요구를 수치와 제약으로 옮겼는가","level":3,"evidence":[],"evidence_possible":false,"state":"CLAIMED"},{"axis":"J3","name":"직접 기술 판단","question":"내가 정한 항목이 무엇인가","level":3,"evidence":[{"id":"11-0","title":"공공기관 행정 인턴"},{"id":"11-1","title":"물류센터 출고 검수"}],"evidence_possible":true,"state":"CONFIRMED"},{"axis":"J4","name":"방법·도구","question":"무엇으로 어떻게 했는가","level":1,"evidence":[],"evidence_possible":false,"state":"EXPOSED"},{"axis":"J5","name":"산출물","question":"무엇이 남았는가","level":2,"evidence":[{"id":"11-0","title":"공공기관 행정 인턴"}],"evidence_possible":true,"state":"PARTIAL"},{"axis":"J6","name":"비교·검증","question":"무엇과 견주었는가","level":1,"evidence":[{"id":"11-0","title":"공공기관 행정 인턴"},{"id":"11-2","title":"카페 매장 운영"}],"evidence_possible":true,"state":"EXPOSED"},{"axis":"J7","name":"실패·수정","question":"틀린 것을 어떻게 좁혔는가","level":2,"evidence":[],"evidence_possible":false,"state":"CLAIMED"},{"axis":"J8","name":"조직 활용","question":"누가 무엇에 썼는가","level":1,"evidence":[{"id":"11-0","title":"공공기관 행정 인턴"},{"id":"11-2","title":"카페 매장 운영"}],"evidence_possible":true,"state":"EXPOSED"}],"areas":[{"code":"JA09","name":"영업·고객·홍보","one_line":"고객과 이용자의 요구를 읽고 결과로 연결한다","core_ref":["BIZ_CORE_V1","MEDIA_CORE_V1"],"key":[{"axis":"J1","name":"문제 정의","state":"PARTIAL"},{"axis":"J2","name":"요구사항 해석","state":"CLAIMED"},{"axis":"J5","name":"산출물","state":"PARTIAL"},{"axis":"J8","name":"조직 활용","state":"EXPOSED"}],"counts":{"confirmed":2,"claimed":1,"to_fill":1}},{"code":"JA04","name":"품질·안전 관리","one_line":"기준에 맞는지 확인하고 문제가 반복되지 않게 막는다","core_ref":["IE_CORE_V1"],"key":[{"axis":"J2","name":"요구사항 해석","state":"CLAIMED"},{"axis":"J6","name":"비교·검증","state":"EXPOSED"},{"axis":"J7","name":"실패·수정","state":"CLAIMED"},{"axis":"J8","name":"조직 활용","state":"EXPOSED"}],"counts":{"confirmed":0,"claimed":2,"to_fill":2}}],"strengths":["J1","J3","J5"],"gaps":[{"area":"JA09","axis":"J8"},{"area":"JA04","axis":"J6"},{"area":"JA04","axis":"J8"}],"actions":[{"code":"EV2-J1","horizon":"D30","axis":"J1","kind":"evidence","text":"''문제 정의'' 근거가 하나 있습니다. 다른 경험에서 하나 더 찾아 적기"},{"code":"EV2-J5","horizon":"D30","axis":"J5","kind":"evidence","text":"''산출물'' 근거가 하나 있습니다. 다른 경험에서 하나 더 찾아 적기"},{"code":"RG-EXPLORE","horizon":"D30","kind":"region","text":"세종 사업장 기업·기관 탐색에서 관심 있는 곳 세 곳을 고르고, 공식 누리집의 채용 안내를 직접 확인하기"},{"code":"GR-J8","horizon":"D60","axis":"J8","kind":"growth","text":"내 결과를 누가 어디에 썼는지 확인해 경험 기록에 적기"},{"code":"GR-J6","horizon":"D60","axis":"J6","kind":"growth","text":"결과를 기준이나 이전 값과 비교한 기록을 하나 남기기"},{"code":"GR-TRAINING","horizon":"D60","kind":"growth","text":"희망 직무의 직업훈련·자격 과정을 고용24에서 찾아 하나를 정하기"},{"code":"AP-POSTING","horizon":"D90","kind":"apply","text":"고용24나 기업 누리집의 원 공고를 찾아 지원서에 이 결과의 근거 경험을 넣어 직접 지원하기"},{"code":"AP-RECHECK","horizon":"D90","kind":"apply","text":"새로 쌓은 경험을 기록하고 진단을 다시 받아 달라진 칸 확인하기"}],"quality":{"answered":24,"of":24,"flat":false},"evidence_count":3,"computed_at":"2026-10-20T00:00:00.000Z"}'::jsonb, 'sj-demo-analysis.0', now() - interval '5 days', now() - interval '5 days' + interval '25 minutes');
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v12') ORDER BY started_at DESC LIMIT 1), 'J1a', 2)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v12') ORDER BY started_at DESC LIMIT 1), 'J1b', 2)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v12') ORDER BY started_at DESC LIMIT 1), 'J1c', 2)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v12') ORDER BY started_at DESC LIMIT 1), 'J2a', 3)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v12') ORDER BY started_at DESC LIMIT 1), 'J2b', 3)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v12') ORDER BY started_at DESC LIMIT 1), 'J2c', 2)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v12') ORDER BY started_at DESC LIMIT 1), 'J3a', 3)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v12') ORDER BY started_at DESC LIMIT 1), 'J3b', 3)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v12') ORDER BY started_at DESC LIMIT 1), 'J3c', 2)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v12') ORDER BY started_at DESC LIMIT 1), 'J4a', 2)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v12') ORDER BY started_at DESC LIMIT 1), 'J4b', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v12') ORDER BY started_at DESC LIMIT 1), 'J4c', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v12') ORDER BY started_at DESC LIMIT 1), 'J5a', 3)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v12') ORDER BY started_at DESC LIMIT 1), 'J5b', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v12') ORDER BY started_at DESC LIMIT 1), 'J5c', 2)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v12') ORDER BY started_at DESC LIMIT 1), 'J6a', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v12') ORDER BY started_at DESC LIMIT 1), 'J6b', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v12') ORDER BY started_at DESC LIMIT 1), 'J6c', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v12') ORDER BY started_at DESC LIMIT 1), 'J7a', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v12') ORDER BY started_at DESC LIMIT 1), 'J7b', 2)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v12') ORDER BY started_at DESC LIMIT 1), 'J7c', 2)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v12') ORDER BY started_at DESC LIMIT 1), 'J8a', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v12') ORDER BY started_at DESC LIMIT 1), 'J8b', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v12') ORDER BY started_at DESC LIMIT 1), 'J8c', 2)
         ON CONFLICT DO NOTHING;
INSERT INTO users (login_id, password_hash, display_name, must_reset_pw, is_demo, pw_login)
       VALUES ('sj-v13', crypt(:'pw_virtual', gen_salt('bf', 12)), '가상 참여자 13', false, true, true)
       ON CONFLICT DO NOTHING;
INSERT INTO memberships (user_id, org_id, role) VALUES ((SELECT id FROM users WHERE login_id = 'sj-v13'), (SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), 'student')
       ON CONFLICT (user_id, org_id, role) DO NOTHING;
INSERT INTO sj_participants (user_id, org_id, program_code, participant_no)
       VALUES ((SELECT id FROM users WHERE login_id = 'sj-v13'), (SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), 'SJ-DEMO-A', 'SJ-A-013') ON CONFLICT DO NOTHING;
INSERT INTO sj_counselor_assignments (org_id, counselor_user_id, participant_user_id)
       VALUES ((SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), (SELECT id FROM users WHERE login_id = 'sj-counsel1'), (SELECT id FROM users WHERE login_id = 'sj-v13')) ON CONFLICT DO NOTHING;
UPDATE users SET last_login_at = now() - interval '5 days' - interval '1 hour' WHERE id = (SELECT id FROM users WHERE login_id = 'sj-v13');
INSERT INTO sj_experiences (user_id, kind, title, job_area, checks, skills)
         VALUES ((SELECT id FROM users WHERE login_id = 'sj-v13'), 'volunteer', '공공기관 행정 인턴', 'JA04', ARRAY['artifacts','verifications','used_where']::text[], ARRAY[]::text[]);
INSERT INTO sj_attempts (user_id, org_id, program_code, instrument_version, profile, status, result,
                                  analysis_version, started_at, scored_at)
         VALUES ((SELECT id FROM users WHERE login_id = 'sj-v13'), (SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), 'SJ-DEMO-A', 'SJ_JOBSEEKER_DEMO_V0', '{"audience":"midcareer","job_areas":["JA01","JA04"],"region_range":"ADJACENT","skills":[]}'::jsonb, 'scored',
                 '{"analysis_version":"sj-demo-analysis.0","instrument_version":"SJ_JOBSEEKER_DEMO_V0","demo":true,"profile":{"audience":"midcareer","job_areas":["JA01","JA04"],"region_range":"ADJACENT","skills":[]},"axes":[{"axis":"J1","name":"문제 정의","question":"무엇을 다룰지 누가 정했는가","level":1,"evidence":[],"evidence_possible":true,"state":"EXPOSED"},{"axis":"J2","name":"요구사항 해석","question":"요구를 수치와 제약으로 옮겼는가","level":0,"evidence":[],"evidence_possible":false,"state":"NONE"},{"axis":"J3","name":"직접 기술 판단","question":"내가 정한 항목이 무엇인가","level":1,"evidence":[],"evidence_possible":true,"state":"EXPOSED"},{"axis":"J4","name":"방법·도구","question":"무엇으로 어떻게 했는가","level":1,"evidence":[],"evidence_possible":false,"state":"EXPOSED"},{"axis":"J5","name":"산출물","question":"무엇이 남았는가","level":1,"evidence":[{"id":"12-0","title":"공공기관 행정 인턴"}],"evidence_possible":true,"state":"EXPOSED"},{"axis":"J6","name":"비교·검증","question":"무엇과 견주었는가","level":2,"evidence":[{"id":"12-0","title":"공공기관 행정 인턴"}],"evidence_possible":true,"state":"PARTIAL"},{"axis":"J7","name":"실패·수정","question":"틀린 것을 어떻게 좁혔는가","level":1,"evidence":[],"evidence_possible":false,"state":"EXPOSED"},{"axis":"J8","name":"조직 활용","question":"누가 무엇에 썼는가","level":0,"evidence":[{"id":"12-0","title":"공공기관 행정 인턴"}],"evidence_possible":true,"state":"NONE"}],"areas":[{"code":"JA01","name":"공공행정·정책 지원","one_line":"기관의 사업과 민원, 행정 절차를 기준에 맞게 처리한다","core_ref":["PUBADM_CORE_V1"],"key":[{"axis":"J1","name":"문제 정의","state":"EXPOSED"},{"axis":"J2","name":"요구사항 해석","state":"NONE"},{"axis":"J6","name":"비교·검증","state":"PARTIAL"},{"axis":"J8","name":"조직 활용","state":"NONE"}],"counts":{"confirmed":1,"claimed":0,"to_fill":3}},{"code":"JA04","name":"품질·안전 관리","one_line":"기준에 맞는지 확인하고 문제가 반복되지 않게 막는다","core_ref":["IE_CORE_V1"],"key":[{"axis":"J2","name":"요구사항 해석","state":"NONE"},{"axis":"J6","name":"비교·검증","state":"PARTIAL"},{"axis":"J7","name":"실패·수정","state":"EXPOSED"},{"axis":"J8","name":"조직 활용","state":"NONE"}],"counts":{"confirmed":1,"claimed":0,"to_fill":3}}],"strengths":["J6"],"gaps":[{"area":"JA01","axis":"J1"},{"area":"JA01","axis":"J2"},{"area":"JA01","axis":"J8"},{"area":"JA04","axis":"J2"},{"area":"JA04","axis":"J7"},{"area":"JA04","axis":"J8"}],"actions":[{"code":"EV2-J6","horizon":"D30","axis":"J6","kind":"evidence","text":"''비교·검증'' 근거가 하나 있습니다. 다른 경험에서 하나 더 찾아 적기"},{"code":"RG-EXPLORE","horizon":"D30","kind":"region","text":"세종 사업장 기업·기관 탐색에서 관심 있는 곳 세 곳을 고르고, 공식 누리집의 채용 안내를 직접 확인하기"},{"code":"GR-J1","horizon":"D60","axis":"J1","kind":"growth","text":"다음 업무·훈련에서 ''무엇이 문제였는지''를 한 문장으로 적어 두기"},{"code":"GR-J2","horizon":"D60","axis":"J2","kind":"growth","text":"맡은 일의 기준(기한·수량·규정)을 표 하나로 정리해 보기"},{"code":"GR-J8","horizon":"D60","axis":"J8","kind":"growth","text":"내 결과를 누가 어디에 썼는지 확인해 경험 기록에 적기"},{"code":"GR-J7","horizon":"D60","axis":"J7","kind":"growth","text":"틀어졌던 일 하나를 골라 원인과 고친 방법을 적어 보기"},{"code":"GR-TRAINING","horizon":"D60","kind":"growth","text":"희망 직무의 직업훈련·자격 과정을 고용24에서 찾아 하나를 정하기"},{"code":"AP-POSTING","horizon":"D90","kind":"apply","text":"고용24나 기업 누리집의 원 공고를 찾아 지원서에 이 결과의 근거 경험을 넣어 직접 지원하기"},{"code":"AP-RECHECK","horizon":"D90","kind":"apply","text":"새로 쌓은 경험을 기록하고 진단을 다시 받아 달라진 칸 확인하기"}],"quality":{"answered":24,"of":24,"flat":false},"evidence_count":1,"computed_at":"2026-10-20T00:00:00.000Z"}'::jsonb, 'sj-demo-analysis.0', now() - interval '6 days', now() - interval '6 days' + interval '25 minutes');
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v13') ORDER BY started_at DESC LIMIT 1), 'J1a', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v13') ORDER BY started_at DESC LIMIT 1), 'J1b', 2)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v13') ORDER BY started_at DESC LIMIT 1), 'J1c', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v13') ORDER BY started_at DESC LIMIT 1), 'J2a', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v13') ORDER BY started_at DESC LIMIT 1), 'J2b', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v13') ORDER BY started_at DESC LIMIT 1), 'J2c', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v13') ORDER BY started_at DESC LIMIT 1), 'J3a', 2)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v13') ORDER BY started_at DESC LIMIT 1), 'J3b', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v13') ORDER BY started_at DESC LIMIT 1), 'J3c', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v13') ORDER BY started_at DESC LIMIT 1), 'J4a', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v13') ORDER BY started_at DESC LIMIT 1), 'J4b', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v13') ORDER BY started_at DESC LIMIT 1), 'J4c', 2)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v13') ORDER BY started_at DESC LIMIT 1), 'J5a', 2)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v13') ORDER BY started_at DESC LIMIT 1), 'J5b', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v13') ORDER BY started_at DESC LIMIT 1), 'J5c', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v13') ORDER BY started_at DESC LIMIT 1), 'J6a', 2)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v13') ORDER BY started_at DESC LIMIT 1), 'J6b', 2)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v13') ORDER BY started_at DESC LIMIT 1), 'J6c', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v13') ORDER BY started_at DESC LIMIT 1), 'J7a', 2)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v13') ORDER BY started_at DESC LIMIT 1), 'J7b', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v13') ORDER BY started_at DESC LIMIT 1), 'J7c', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v13') ORDER BY started_at DESC LIMIT 1), 'J8a', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v13') ORDER BY started_at DESC LIMIT 1), 'J8b', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v13') ORDER BY started_at DESC LIMIT 1), 'J8c', 2)
         ON CONFLICT DO NOTHING;
INSERT INTO users (login_id, password_hash, display_name, must_reset_pw, is_demo, pw_login)
       VALUES ('sj-v14', crypt(:'pw_virtual', gen_salt('bf', 12)), '가상 참여자 14', false, true, true)
       ON CONFLICT DO NOTHING;
INSERT INTO memberships (user_id, org_id, role) VALUES ((SELECT id FROM users WHERE login_id = 'sj-v14'), (SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), 'student')
       ON CONFLICT (user_id, org_id, role) DO NOTHING;
INSERT INTO sj_participants (user_id, org_id, program_code, participant_no)
       VALUES ((SELECT id FROM users WHERE login_id = 'sj-v14'), (SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), 'SJ-DEMO-A', 'SJ-A-014') ON CONFLICT DO NOTHING;
INSERT INTO sj_counselor_assignments (org_id, counselor_user_id, participant_user_id)
       VALUES ((SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), (SELECT id FROM users WHERE login_id = 'sj-counsel2'), (SELECT id FROM users WHERE login_id = 'sj-v14')) ON CONFLICT DO NOTHING;
UPDATE users SET last_login_at = now() - interval '6 days' - interval '1 hour' WHERE id = (SELECT id FROM users WHERE login_id = 'sj-v14');
INSERT INTO consents (user_id, kind, version, granted, org_id)
         VALUES ((SELECT id FROM users WHERE login_id = 'sj-v14'), 'data_visibility', 'SJ-DEMO-COUNSELOR-1', true, (SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'));
INSERT INTO consents (user_id, kind, version, granted, org_id, created_at)
         VALUES ((SELECT id FROM users WHERE login_id = 'sj-v14'), 'data_visibility', 'SJ-DEMO-COUNSELOR-1', false, (SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), now() + interval '1 second');
INSERT INTO sj_experiences (user_id, kind, title, job_area, checks, skills)
         VALUES ((SELECT id FROM users WHERE login_id = 'sj-v14'), 'work', '카페 매장 운영', 'JA09', ARRAY['problems','used_where']::text[], ARRAY[]::text[]);
INSERT INTO sj_experiences (user_id, kind, title, job_area, checks, skills)
         VALUES ((SELECT id FROM users WHERE login_id = 'sj-v14'), 'training', '직업훈련 데이터 분석 과정', 'JA08', ARRAY['verifications','used_where']::text[], ARRAY[]::text[]);
INSERT INTO sj_experiences (user_id, kind, title, job_area, checks, skills)
         VALUES ((SELECT id FROM users WHERE login_id = 'sj-v14'), 'training', '카페 매장 운영', 'JA08', ARRAY[]::text[], ARRAY[]::text[]);
INSERT INTO sj_attempts (user_id, org_id, program_code, instrument_version, profile, status, result,
                                  analysis_version, started_at, scored_at)
         VALUES ((SELECT id FROM users WHERE login_id = 'sj-v14'), (SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), 'SJ-DEMO-A', 'SJ_JOBSEEKER_DEMO_V0', '{"audience":"career_changer","job_areas":["JA08","JA09"],"region_range":"ADJACENT","skills":[]}'::jsonb, 'scored',
                 '{"analysis_version":"sj-demo-analysis.0","instrument_version":"SJ_JOBSEEKER_DEMO_V0","demo":true,"profile":{"audience":"career_changer","job_areas":["JA08","JA09"],"region_range":"ADJACENT","skills":[]},"axes":[{"axis":"J1","name":"문제 정의","question":"무엇을 다룰지 누가 정했는가","level":1,"evidence":[{"id":"13-0","title":"카페 매장 운영"}],"evidence_possible":true,"state":"EXPOSED"},{"axis":"J2","name":"요구사항 해석","question":"요구를 수치와 제약으로 옮겼는가","level":1,"evidence":[],"evidence_possible":false,"state":"EXPOSED"},{"axis":"J3","name":"직접 기술 판단","question":"내가 정한 항목이 무엇인가","level":0,"evidence":[],"evidence_possible":true,"state":"NONE"},{"axis":"J4","name":"방법·도구","question":"무엇으로 어떻게 했는가","level":2,"evidence":[],"evidence_possible":false,"state":"CLAIMED"},{"axis":"J5","name":"산출물","question":"무엇이 남았는가","level":1,"evidence":[],"evidence_possible":true,"state":"EXPOSED"},{"axis":"J6","name":"비교·검증","question":"무엇과 견주었는가","level":0,"evidence":[{"id":"13-1","title":"직업훈련 데이터 분석 과정"}],"evidence_possible":true,"state":"NONE"},{"axis":"J7","name":"실패·수정","question":"틀린 것을 어떻게 좁혔는가","level":0,"evidence":[],"evidence_possible":false,"state":"NONE"},{"axis":"J8","name":"조직 활용","question":"누가 무엇에 썼는가","level":0,"evidence":[{"id":"13-0","title":"카페 매장 운영"},{"id":"13-1","title":"직업훈련 데이터 분석 과정"}],"evidence_possible":true,"state":"NONE"}],"areas":[{"code":"JA08","name":"경영지원·사무·회계","one_line":"문서와 숫자를 정확하게 다뤄 조직이 움직이게 한다","core_ref":["BIZ_CORE_V1","ACCT_CORE_V1"],"key":[{"axis":"J2","name":"요구사항 해석","state":"EXPOSED"},{"axis":"J4","name":"방법·도구","state":"CLAIMED"},{"axis":"J5","name":"산출물","state":"EXPOSED"},{"axis":"J8","name":"조직 활용","state":"NONE"}],"counts":{"confirmed":0,"claimed":1,"to_fill":3}},{"code":"JA09","name":"영업·고객·홍보","one_line":"고객과 이용자의 요구를 읽고 결과로 연결한다","core_ref":["BIZ_CORE_V1","MEDIA_CORE_V1"],"key":[{"axis":"J1","name":"문제 정의","state":"EXPOSED"},{"axis":"J2","name":"요구사항 해석","state":"EXPOSED"},{"axis":"J5","name":"산출물","state":"EXPOSED"},{"axis":"J8","name":"조직 활용","state":"NONE"}],"counts":{"confirmed":0,"claimed":0,"to_fill":4}}],"strengths":[],"gaps":[{"area":"JA08","axis":"J2"},{"area":"JA08","axis":"J5"},{"area":"JA08","axis":"J8"},{"area":"JA09","axis":"J1"},{"area":"JA09","axis":"J2"},{"area":"JA09","axis":"J5"},{"area":"JA09","axis":"J8"}],"actions":[{"code":"RG-EXPLORE","horizon":"D30","kind":"region","text":"세종 사업장 기업·기관 탐색에서 관심 있는 곳 세 곳을 고르고, 공식 누리집의 채용 안내를 직접 확인하기"},{"code":"GR-J2","horizon":"D60","axis":"J2","kind":"growth","text":"맡은 일의 기준(기한·수량·규정)을 표 하나로 정리해 보기"},{"code":"GR-J5","horizon":"D60","axis":"J5","kind":"growth","text":"지금까지 한 일 중 하나를 결과물(문서·사진·기록)로 묶어 두기"},{"code":"GR-J8","horizon":"D60","axis":"J8","kind":"growth","text":"내 결과를 누가 어디에 썼는지 확인해 경험 기록에 적기"},{"code":"GR-J1","horizon":"D60","axis":"J1","kind":"growth","text":"다음 업무·훈련에서 ''무엇이 문제였는지''를 한 문장으로 적어 두기"},{"code":"GR-TRAINING","horizon":"D60","kind":"growth","text":"희망 직무의 직업훈련·자격 과정을 고용24에서 찾아 하나를 정하기"},{"code":"AP-POSTING","horizon":"D90","kind":"apply","text":"고용24나 기업 누리집의 원 공고를 찾아 지원서에 이 결과의 근거 경험을 넣어 직접 지원하기"},{"code":"AP-RECHECK","horizon":"D90","kind":"apply","text":"새로 쌓은 경험을 기록하고 진단을 다시 받아 달라진 칸 확인하기"}],"quality":{"answered":24,"of":24,"flat":false},"evidence_count":3,"computed_at":"2026-10-20T00:00:00.000Z"}'::jsonb, 'sj-demo-analysis.0', now() - interval '7 days', now() - interval '7 days' + interval '25 minutes');
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v14') ORDER BY started_at DESC LIMIT 1), 'J1a', 2)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v14') ORDER BY started_at DESC LIMIT 1), 'J1b', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v14') ORDER BY started_at DESC LIMIT 1), 'J1c', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v14') ORDER BY started_at DESC LIMIT 1), 'J2a', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v14') ORDER BY started_at DESC LIMIT 1), 'J2b', 2)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v14') ORDER BY started_at DESC LIMIT 1), 'J2c', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v14') ORDER BY started_at DESC LIMIT 1), 'J3a', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v14') ORDER BY started_at DESC LIMIT 1), 'J3b', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v14') ORDER BY started_at DESC LIMIT 1), 'J3c', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v14') ORDER BY started_at DESC LIMIT 1), 'J4a', 2)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v14') ORDER BY started_at DESC LIMIT 1), 'J4b', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v14') ORDER BY started_at DESC LIMIT 1), 'J4c', 2)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v14') ORDER BY started_at DESC LIMIT 1), 'J5a', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v14') ORDER BY started_at DESC LIMIT 1), 'J5b', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v14') ORDER BY started_at DESC LIMIT 1), 'J5c', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v14') ORDER BY started_at DESC LIMIT 1), 'J6a', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v14') ORDER BY started_at DESC LIMIT 1), 'J6b', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v14') ORDER BY started_at DESC LIMIT 1), 'J6c', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v14') ORDER BY started_at DESC LIMIT 1), 'J7a', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v14') ORDER BY started_at DESC LIMIT 1), 'J7b', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v14') ORDER BY started_at DESC LIMIT 1), 'J7c', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v14') ORDER BY started_at DESC LIMIT 1), 'J8a', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v14') ORDER BY started_at DESC LIMIT 1), 'J8b', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v14') ORDER BY started_at DESC LIMIT 1), 'J8c', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO users (login_id, password_hash, display_name, must_reset_pw, is_demo, pw_login)
       VALUES ('sj-v15', crypt(:'pw_virtual', gen_salt('bf', 12)), '가상 참여자 15', false, true, true)
       ON CONFLICT DO NOTHING;
INSERT INTO memberships (user_id, org_id, role) VALUES ((SELECT id FROM users WHERE login_id = 'sj-v15'), (SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), 'student')
       ON CONFLICT (user_id, org_id, role) DO NOTHING;
INSERT INTO sj_participants (user_id, org_id, program_code, participant_no)
       VALUES ((SELECT id FROM users WHERE login_id = 'sj-v15'), (SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), 'SJ-DEMO-B', 'SJ-B-015') ON CONFLICT DO NOTHING;
INSERT INTO sj_counselor_assignments (org_id, counselor_user_id, participant_user_id)
       VALUES ((SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), (SELECT id FROM users WHERE login_id = 'sj-counsel1'), (SELECT id FROM users WHERE login_id = 'sj-v15')) ON CONFLICT DO NOTHING;
UPDATE users SET last_login_at = now() - interval '0 days' - interval '1 hour' WHERE id = (SELECT id FROM users WHERE login_id = 'sj-v15');
INSERT INTO consents (user_id, kind, version, granted, org_id)
         VALUES ((SELECT id FROM users WHERE login_id = 'sj-v15'), 'data_visibility', 'SJ-DEMO-COUNSELOR-1', true, (SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'));
INSERT INTO sj_experiences (user_id, kind, title, job_area, checks, skills)
         VALUES ((SELECT id FROM users WHERE login_id = 'sj-v15'), 'training', '제조 현장 생산 보조', 'JA03', ARRAY['problems','verifications','used_where']::text[], ARRAY[]::text[]);
INSERT INTO sj_attempts (user_id, org_id, program_code, instrument_version, profile, status, result,
                                  analysis_version, started_at, scored_at)
         VALUES ((SELECT id FROM users WHERE login_id = 'sj-v15'), (SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), 'SJ-DEMO-B', 'SJ_JOBSEEKER_DEMO_V0', '{"audience":"youth_student","job_areas":["JA08","JA03"],"region_range":"ANYWHERE","skills":[]}'::jsonb, 'scored',
                 '{"analysis_version":"sj-demo-analysis.0","instrument_version":"SJ_JOBSEEKER_DEMO_V0","demo":true,"profile":{"audience":"youth_student","job_areas":["JA08","JA03"],"region_range":"ANYWHERE","skills":[]},"axes":[{"axis":"J1","name":"문제 정의","question":"무엇을 다룰지 누가 정했는가","level":0,"evidence":[{"id":"14-0","title":"제조 현장 생산 보조"}],"evidence_possible":true,"state":"NONE"},{"axis":"J2","name":"요구사항 해석","question":"요구를 수치와 제약으로 옮겼는가","level":2,"evidence":[],"evidence_possible":false,"state":"CLAIMED"},{"axis":"J3","name":"직접 기술 판단","question":"내가 정한 항목이 무엇인가","level":1,"evidence":[],"evidence_possible":true,"state":"EXPOSED"},{"axis":"J4","name":"방법·도구","question":"무엇으로 어떻게 했는가","level":0,"evidence":[],"evidence_possible":false,"state":"NONE"},{"axis":"J5","name":"산출물","question":"무엇이 남았는가","level":1,"evidence":[],"evidence_possible":true,"state":"EXPOSED"},{"axis":"J6","name":"비교·검증","question":"무엇과 견주었는가","level":2,"evidence":[{"id":"14-0","title":"제조 현장 생산 보조"}],"evidence_possible":true,"state":"PARTIAL"},{"axis":"J7","name":"실패·수정","question":"틀린 것을 어떻게 좁혔는가","level":2,"evidence":[],"evidence_possible":false,"state":"CLAIMED"},{"axis":"J8","name":"조직 활용","question":"누가 무엇에 썼는가","level":0,"evidence":[{"id":"14-0","title":"제조 현장 생산 보조"}],"evidence_possible":true,"state":"NONE"}],"areas":[{"code":"JA08","name":"경영지원·사무·회계","one_line":"문서와 숫자를 정확하게 다뤄 조직이 움직이게 한다","core_ref":["BIZ_CORE_V1","ACCT_CORE_V1"],"key":[{"axis":"J2","name":"요구사항 해석","state":"CLAIMED"},{"axis":"J4","name":"방법·도구","state":"NONE"},{"axis":"J5","name":"산출물","state":"EXPOSED"},{"axis":"J8","name":"조직 활용","state":"NONE"}],"counts":{"confirmed":0,"claimed":1,"to_fill":3}},{"code":"JA03","name":"생산·공정 운영","one_line":"설비와 공정을 돌려 정해진 품질과 수량을 맞춘다","core_ref":["IE_CORE_V1","ME_CORE_V3"],"key":[{"axis":"J3","name":"직접 기술 판단","state":"EXPOSED"},{"axis":"J4","name":"방법·도구","state":"NONE"},{"axis":"J7","name":"실패·수정","state":"CLAIMED"},{"axis":"J8","name":"조직 활용","state":"NONE"}],"counts":{"confirmed":0,"claimed":1,"to_fill":3}}],"strengths":["J6"],"gaps":[{"area":"JA08","axis":"J4"},{"area":"JA08","axis":"J5"},{"area":"JA08","axis":"J8"},{"area":"JA03","axis":"J3"},{"area":"JA03","axis":"J4"},{"area":"JA03","axis":"J8"}],"actions":[{"code":"EV2-J6","horizon":"D30","axis":"J6","kind":"evidence","text":"''비교·검증'' 근거가 하나 있습니다. 다른 경험에서 하나 더 찾아 적기"},{"code":"RG-EXPLORE","horizon":"D30","kind":"region","text":"세종 사업장 기업·기관 탐색에서 관심 있는 곳 세 곳을 고르고, 공식 누리집의 채용 안내를 직접 확인하기"},{"code":"GR-J4","horizon":"D60","axis":"J4","kind":"growth","text":"희망 직무에서 많이 쓰는 도구 하나를 정해 실습하기 (직업훈련 과정 확인)"},{"code":"GR-J5","horizon":"D60","axis":"J5","kind":"growth","text":"지금까지 한 일 중 하나를 결과물(문서·사진·기록)로 묶어 두기"},{"code":"GR-J8","horizon":"D60","axis":"J8","kind":"growth","text":"내 결과를 누가 어디에 썼는지 확인해 경험 기록에 적기"},{"code":"GR-J3","horizon":"D60","axis":"J3","kind":"growth","text":"내가 정한 것 하나와 그 까닭을 기록으로 남기기"},{"code":"GR-TRAINING","horizon":"D60","kind":"growth","text":"희망 직무의 직업훈련·자격 과정을 고용24에서 찾아 하나를 정하기"},{"code":"AP-POSTING","horizon":"D90","kind":"apply","text":"고용24나 기업 누리집의 원 공고를 찾아 지원서에 이 결과의 근거 경험을 넣어 직접 지원하기"},{"code":"AP-RECHECK","horizon":"D90","kind":"apply","text":"새로 쌓은 경험을 기록하고 진단을 다시 받아 달라진 칸 확인하기"}],"quality":{"answered":24,"of":24,"flat":false},"evidence_count":1,"computed_at":"2026-10-20T00:00:00.000Z"}'::jsonb, 'sj-demo-analysis.0', now() - interval '1 days', now() - interval '1 days' + interval '25 minutes');
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v15') ORDER BY started_at DESC LIMIT 1), 'J1a', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v15') ORDER BY started_at DESC LIMIT 1), 'J1b', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v15') ORDER BY started_at DESC LIMIT 1), 'J1c', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v15') ORDER BY started_at DESC LIMIT 1), 'J2a', 2)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v15') ORDER BY started_at DESC LIMIT 1), 'J2b', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v15') ORDER BY started_at DESC LIMIT 1), 'J2c', 2)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v15') ORDER BY started_at DESC LIMIT 1), 'J3a', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v15') ORDER BY started_at DESC LIMIT 1), 'J3b', 2)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v15') ORDER BY started_at DESC LIMIT 1), 'J3c', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v15') ORDER BY started_at DESC LIMIT 1), 'J4a', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v15') ORDER BY started_at DESC LIMIT 1), 'J4b', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v15') ORDER BY started_at DESC LIMIT 1), 'J4c', 2)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v15') ORDER BY started_at DESC LIMIT 1), 'J5a', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v15') ORDER BY started_at DESC LIMIT 1), 'J5b', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v15') ORDER BY started_at DESC LIMIT 1), 'J5c', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v15') ORDER BY started_at DESC LIMIT 1), 'J6a', 2)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v15') ORDER BY started_at DESC LIMIT 1), 'J6b', 2)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v15') ORDER BY started_at DESC LIMIT 1), 'J6c', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v15') ORDER BY started_at DESC LIMIT 1), 'J7a', 2)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v15') ORDER BY started_at DESC LIMIT 1), 'J7b', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v15') ORDER BY started_at DESC LIMIT 1), 'J7c', 2)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v15') ORDER BY started_at DESC LIMIT 1), 'J8a', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v15') ORDER BY started_at DESC LIMIT 1), 'J8b', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v15') ORDER BY started_at DESC LIMIT 1), 'J8c', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO users (login_id, password_hash, display_name, must_reset_pw, is_demo, pw_login)
       VALUES ('sj-v16', crypt(:'pw_virtual', gen_salt('bf', 12)), '가상 참여자 16', false, true, true)
       ON CONFLICT DO NOTHING;
INSERT INTO memberships (user_id, org_id, role) VALUES ((SELECT id FROM users WHERE login_id = 'sj-v16'), (SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), 'student')
       ON CONFLICT (user_id, org_id, role) DO NOTHING;
INSERT INTO sj_participants (user_id, org_id, program_code, participant_no)
       VALUES ((SELECT id FROM users WHERE login_id = 'sj-v16'), (SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), 'SJ-DEMO-B', 'SJ-B-016') ON CONFLICT DO NOTHING;
INSERT INTO sj_counselor_assignments (org_id, counselor_user_id, participant_user_id)
       VALUES ((SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), (SELECT id FROM users WHERE login_id = 'sj-counsel2'), (SELECT id FROM users WHERE login_id = 'sj-v16')) ON CONFLICT DO NOTHING;
UPDATE users SET last_login_at = now() - interval '1 days' - interval '1 hour' WHERE id = (SELECT id FROM users WHERE login_id = 'sj-v16');
INSERT INTO sj_experiences (user_id, kind, title, job_area, checks, skills)
         VALUES ((SELECT id FROM users WHERE login_id = 'sj-v16'), 'project', '사무 보조 계약직', 'JA01', ARRAY['problems','decisions']::text[], ARRAY[]::text[]);
INSERT INTO sj_experiences (user_id, kind, title, job_area, checks, skills)
         VALUES ((SELECT id FROM users WHERE login_id = 'sj-v16'), 'credential', '품질 검사 아르바이트', 'JA08', ARRAY['problems','decisions','verifications','used_where']::text[], ARRAY[]::text[]);
INSERT INTO sj_experiences (user_id, kind, title, job_area, checks, skills)
         VALUES ((SELECT id FROM users WHERE login_id = 'sj-v16'), 'intern', '물류센터 출고 검수', 'JA08', ARRAY['problems','decisions','artifacts','used_where']::text[], ARRAY[]::text[]);
INSERT INTO sj_attempts (user_id, org_id, program_code, instrument_version, profile, status, result,
                                  analysis_version, started_at, scored_at)
         VALUES ((SELECT id FROM users WHERE login_id = 'sj-v16'), (SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), 'SJ-DEMO-B', 'SJ_JOBSEEKER_DEMO_V0', '{"audience":"jobseeker","job_areas":["JA08","JA01"],"region_range":"UNDECIDED","skills":[]}'::jsonb, 'scored',
                 '{"analysis_version":"sj-demo-analysis.0","instrument_version":"SJ_JOBSEEKER_DEMO_V0","demo":true,"profile":{"audience":"jobseeker","job_areas":["JA08","JA01"],"region_range":"UNDECIDED","skills":[]},"axes":[{"axis":"J1","name":"문제 정의","question":"무엇을 다룰지 누가 정했는가","level":1,"evidence":[{"id":"15-0","title":"사무 보조 계약직"},{"id":"15-1","title":"품질 검사 아르바이트"},{"id":"15-2","title":"물류센터 출고 검수"}],"evidence_possible":true,"state":"EXPOSED"},{"axis":"J2","name":"요구사항 해석","question":"요구를 수치와 제약으로 옮겼는가","level":0,"evidence":[],"evidence_possible":false,"state":"NONE"},{"axis":"J3","name":"직접 기술 판단","question":"내가 정한 항목이 무엇인가","level":0,"evidence":[{"id":"15-0","title":"사무 보조 계약직"},{"id":"15-1","title":"품질 검사 아르바이트"},{"id":"15-2","title":"물류센터 출고 검수"}],"evidence_possible":true,"state":"NONE"},{"axis":"J4","name":"방법·도구","question":"무엇으로 어떻게 했는가","level":0,"evidence":[],"evidence_possible":false,"state":"NONE"},{"axis":"J5","name":"산출물","question":"무엇이 남았는가","level":0,"evidence":[{"id":"15-2","title":"물류센터 출고 검수"}],"evidence_possible":true,"state":"NONE"},{"axis":"J6","name":"비교·검증","question":"무엇과 견주었는가","level":1,"evidence":[{"id":"15-1","title":"품질 검사 아르바이트"}],"evidence_possible":true,"state":"EXPOSED"},{"axis":"J7","name":"실패·수정","question":"틀린 것을 어떻게 좁혔는가","level":0,"evidence":[],"evidence_possible":false,"state":"NONE"},{"axis":"J8","name":"조직 활용","question":"누가 무엇에 썼는가","level":1,"evidence":[{"id":"15-1","title":"품질 검사 아르바이트"},{"id":"15-2","title":"물류센터 출고 검수"}],"evidence_possible":true,"state":"EXPOSED"}],"areas":[{"code":"JA08","name":"경영지원·사무·회계","one_line":"문서와 숫자를 정확하게 다뤄 조직이 움직이게 한다","core_ref":["BIZ_CORE_V1","ACCT_CORE_V1"],"key":[{"axis":"J2","name":"요구사항 해석","state":"NONE"},{"axis":"J4","name":"방법·도구","state":"NONE"},{"axis":"J5","name":"산출물","state":"NONE"},{"axis":"J8","name":"조직 활용","state":"EXPOSED"}],"counts":{"confirmed":0,"claimed":0,"to_fill":4}},{"code":"JA01","name":"공공행정·정책 지원","one_line":"기관의 사업과 민원, 행정 절차를 기준에 맞게 처리한다","core_ref":["PUBADM_CORE_V1"],"key":[{"axis":"J1","name":"문제 정의","state":"EXPOSED"},{"axis":"J2","name":"요구사항 해석","state":"NONE"},{"axis":"J6","name":"비교·검증","state":"EXPOSED"},{"axis":"J8","name":"조직 활용","state":"EXPOSED"}],"counts":{"confirmed":0,"claimed":0,"to_fill":4}}],"strengths":[],"gaps":[{"area":"JA08","axis":"J2"},{"area":"JA08","axis":"J4"},{"area":"JA08","axis":"J5"},{"area":"JA08","axis":"J8"},{"area":"JA01","axis":"J1"},{"area":"JA01","axis":"J2"},{"area":"JA01","axis":"J6"},{"area":"JA01","axis":"J8"}],"actions":[{"code":"RG-EXPLORE","horizon":"D30","kind":"region","text":"세종 사업장 기업·기관 탐색에서 관심 있는 곳 세 곳을 고르고, 공식 누리집의 채용 안내를 직접 확인하기"},{"code":"GR-J2","horizon":"D60","axis":"J2","kind":"growth","text":"맡은 일의 기준(기한·수량·규정)을 표 하나로 정리해 보기"},{"code":"GR-J4","horizon":"D60","axis":"J4","kind":"growth","text":"희망 직무에서 많이 쓰는 도구 하나를 정해 실습하기 (직업훈련 과정 확인)"},{"code":"GR-J5","horizon":"D60","axis":"J5","kind":"growth","text":"지금까지 한 일 중 하나를 결과물(문서·사진·기록)로 묶어 두기"},{"code":"GR-J8","horizon":"D60","axis":"J8","kind":"growth","text":"내 결과를 누가 어디에 썼는지 확인해 경험 기록에 적기"},{"code":"GR-J1","horizon":"D60","axis":"J1","kind":"growth","text":"다음 업무·훈련에서 ''무엇이 문제였는지''를 한 문장으로 적어 두기"},{"code":"GR-J6","horizon":"D60","axis":"J6","kind":"growth","text":"결과를 기준이나 이전 값과 비교한 기록을 하나 남기기"},{"code":"GR-TRAINING","horizon":"D60","kind":"growth","text":"희망 직무의 직업훈련·자격 과정을 고용24에서 찾아 하나를 정하기"},{"code":"AP-POSTING","horizon":"D90","kind":"apply","text":"고용24나 기업 누리집의 원 공고를 찾아 지원서에 이 결과의 근거 경험을 넣어 직접 지원하기"},{"code":"AP-RECHECK","horizon":"D90","kind":"apply","text":"새로 쌓은 경험을 기록하고 진단을 다시 받아 달라진 칸 확인하기"}],"quality":{"answered":24,"of":24,"flat":false},"evidence_count":3,"computed_at":"2026-10-20T00:00:00.000Z"}'::jsonb, 'sj-demo-analysis.0', now() - interval '2 days', now() - interval '2 days' + interval '25 minutes');
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v16') ORDER BY started_at DESC LIMIT 1), 'J1a', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v16') ORDER BY started_at DESC LIMIT 1), 'J1b', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v16') ORDER BY started_at DESC LIMIT 1), 'J1c', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v16') ORDER BY started_at DESC LIMIT 1), 'J2a', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v16') ORDER BY started_at DESC LIMIT 1), 'J2b', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v16') ORDER BY started_at DESC LIMIT 1), 'J2c', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v16') ORDER BY started_at DESC LIMIT 1), 'J3a', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v16') ORDER BY started_at DESC LIMIT 1), 'J3b', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v16') ORDER BY started_at DESC LIMIT 1), 'J3c', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v16') ORDER BY started_at DESC LIMIT 1), 'J4a', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v16') ORDER BY started_at DESC LIMIT 1), 'J4b', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v16') ORDER BY started_at DESC LIMIT 1), 'J4c', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v16') ORDER BY started_at DESC LIMIT 1), 'J5a', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v16') ORDER BY started_at DESC LIMIT 1), 'J5b', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v16') ORDER BY started_at DESC LIMIT 1), 'J5c', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v16') ORDER BY started_at DESC LIMIT 1), 'J6a', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v16') ORDER BY started_at DESC LIMIT 1), 'J6b', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v16') ORDER BY started_at DESC LIMIT 1), 'J6c', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v16') ORDER BY started_at DESC LIMIT 1), 'J7a', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v16') ORDER BY started_at DESC LIMIT 1), 'J7b', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v16') ORDER BY started_at DESC LIMIT 1), 'J7c', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v16') ORDER BY started_at DESC LIMIT 1), 'J8a', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v16') ORDER BY started_at DESC LIMIT 1), 'J8b', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v16') ORDER BY started_at DESC LIMIT 1), 'J8c', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO users (login_id, password_hash, display_name, must_reset_pw, is_demo, pw_login)
       VALUES ('sj-v17', crypt(:'pw_virtual', gen_salt('bf', 12)), '가상 참여자 17', false, true, true)
       ON CONFLICT DO NOTHING;
INSERT INTO memberships (user_id, org_id, role) VALUES ((SELECT id FROM users WHERE login_id = 'sj-v17'), (SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), 'student')
       ON CONFLICT (user_id, org_id, role) DO NOTHING;
INSERT INTO sj_participants (user_id, org_id, program_code, participant_no)
       VALUES ((SELECT id FROM users WHERE login_id = 'sj-v17'), (SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), 'SJ-DEMO-B', 'SJ-B-017') ON CONFLICT DO NOTHING;
INSERT INTO sj_counselor_assignments (org_id, counselor_user_id, participant_user_id)
       VALUES ((SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), (SELECT id FROM users WHERE login_id = 'sj-counsel1'), (SELECT id FROM users WHERE login_id = 'sj-v17')) ON CONFLICT DO NOTHING;
UPDATE users SET last_login_at = now() - interval '2 days' - interval '1 hour' WHERE id = (SELECT id FROM users WHERE login_id = 'sj-v17');
INSERT INTO consents (user_id, kind, version, granted, org_id)
         VALUES ((SELECT id FROM users WHERE login_id = 'sj-v17'), 'data_visibility', 'SJ-DEMO-COUNSELOR-1', true, (SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'));
INSERT INTO sj_experiences (user_id, kind, title, job_area, checks, skills)
         VALUES ((SELECT id FROM users WHERE login_id = 'sj-v17'), 'project', '제조 현장 생산 보조', 'JA05', ARRAY['artifacts','used_where']::text[], ARRAY[]::text[]);
INSERT INTO sj_experiences (user_id, kind, title, job_area, checks, skills)
         VALUES ((SELECT id FROM users WHERE login_id = 'sj-v17'), 'work', '물류센터 출고 검수', 'JA05', ARRAY['problems','artifacts','used_where']::text[], ARRAY[]::text[]);
INSERT INTO sj_attempts (user_id, org_id, program_code, instrument_version, profile, status, result,
                                  analysis_version, started_at, scored_at)
         VALUES ((SELECT id FROM users WHERE login_id = 'sj-v17'), (SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), 'SJ-DEMO-B', 'SJ_JOBSEEKER_DEMO_V0', '{"audience":"midcareer","job_areas":["JA05","JA07"],"region_range":"ANYWHERE","skills":[]}'::jsonb, 'scored',
                 '{"analysis_version":"sj-demo-analysis.0","instrument_version":"SJ_JOBSEEKER_DEMO_V0","demo":true,"profile":{"audience":"midcareer","job_areas":["JA05","JA07"],"region_range":"ANYWHERE","skills":[]},"axes":[{"axis":"J1","name":"문제 정의","question":"무엇을 다룰지 누가 정했는가","level":1,"evidence":[{"id":"16-1","title":"물류센터 출고 검수"}],"evidence_possible":true,"state":"EXPOSED"},{"axis":"J2","name":"요구사항 해석","question":"요구를 수치와 제약으로 옮겼는가","level":2,"evidence":[],"evidence_possible":false,"state":"CLAIMED"},{"axis":"J3","name":"직접 기술 판단","question":"내가 정한 항목이 무엇인가","level":2,"evidence":[],"evidence_possible":true,"state":"CLAIMED"},{"axis":"J4","name":"방법·도구","question":"무엇으로 어떻게 했는가","level":2,"evidence":[],"evidence_possible":false,"state":"CLAIMED"},{"axis":"J5","name":"산출물","question":"무엇이 남았는가","level":3,"evidence":[{"id":"16-0","title":"제조 현장 생산 보조"},{"id":"16-1","title":"물류센터 출고 검수"}],"evidence_possible":true,"state":"CONFIRMED"},{"axis":"J6","name":"비교·검증","question":"무엇과 견주었는가","level":2,"evidence":[],"evidence_possible":true,"state":"CLAIMED"},{"axis":"J7","name":"실패·수정","question":"틀린 것을 어떻게 좁혔는가","level":3,"evidence":[],"evidence_possible":false,"state":"CLAIMED"},{"axis":"J8","name":"조직 활용","question":"누가 무엇에 썼는가","level":2,"evidence":[{"id":"16-0","title":"제조 현장 생산 보조"},{"id":"16-1","title":"물류센터 출고 검수"}],"evidence_possible":true,"state":"CONFIRMED"}],"areas":[{"code":"JA05","name":"화학·소재·이차전지","one_line":"소재와 화학 공정의 조건을 다루고 결과를 검증한다","core_ref":["CHE_CORE_V1","MSE_CORE_V1"],"key":[{"axis":"J2","name":"요구사항 해석","state":"CLAIMED"},{"axis":"J3","name":"직접 기술 판단","state":"CLAIMED"},{"axis":"J6","name":"비교·검증","state":"CLAIMED"},{"axis":"J7","name":"실패·수정","state":"CLAIMED"}],"counts":{"confirmed":0,"claimed":4,"to_fill":0}},{"code":"JA07","name":"IT·데이터·디지털 운영","one_line":"시스템과 데이터를 다뤄 업무가 돌아가게 한다","core_ref":["CS_CORE_V1"],"key":[{"axis":"J1","name":"문제 정의","state":"EXPOSED"},{"axis":"J3","name":"직접 기술 판단","state":"CLAIMED"},{"axis":"J4","name":"방법·도구","state":"CLAIMED"},{"axis":"J5","name":"산출물","state":"CONFIRMED"}],"counts":{"confirmed":1,"claimed":2,"to_fill":1}}],"strengths":["J5","J8"],"gaps":[{"area":"JA07","axis":"J1"}],"actions":[{"code":"EV-J3","horizon":"D30","axis":"J3","kind":"evidence","text":"''직접 기술 판단''을(를) 해 본 경험 하나를 경험 기록에 적고 근거 칸을 고르기"},{"code":"EV-J6","horizon":"D30","axis":"J6","kind":"evidence","text":"''비교·검증''을(를) 해 본 경험 하나를 경험 기록에 적고 근거 칸을 고르기"},{"code":"RG-EXPLORE","horizon":"D30","kind":"region","text":"세종 사업장 기업·기관 탐색에서 관심 있는 곳 세 곳을 고르고, 공식 누리집의 채용 안내를 직접 확인하기"},{"code":"GR-J1","horizon":"D60","axis":"J1","kind":"growth","text":"다음 업무·훈련에서 ''무엇이 문제였는지''를 한 문장으로 적어 두기"},{"code":"GR-TRAINING","horizon":"D60","kind":"growth","text":"희망 직무의 직업훈련·자격 과정을 고용24에서 찾아 하나를 정하기"},{"code":"AP-POSTING","horizon":"D90","kind":"apply","text":"고용24나 기업 누리집의 원 공고를 찾아 지원서에 이 결과의 근거 경험을 넣어 직접 지원하기"},{"code":"AP-RECHECK","horizon":"D90","kind":"apply","text":"새로 쌓은 경험을 기록하고 진단을 다시 받아 달라진 칸 확인하기"}],"quality":{"answered":24,"of":24,"flat":false},"evidence_count":2,"computed_at":"2026-10-20T00:00:00.000Z"}'::jsonb, 'sj-demo-analysis.0', now() - interval '3 days', now() - interval '3 days' + interval '25 minutes');
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v17') ORDER BY started_at DESC LIMIT 1), 'J1a', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v17') ORDER BY started_at DESC LIMIT 1), 'J1b', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v17') ORDER BY started_at DESC LIMIT 1), 'J1c', 3)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v17') ORDER BY started_at DESC LIMIT 1), 'J2a', 3)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v17') ORDER BY started_at DESC LIMIT 1), 'J2b', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v17') ORDER BY started_at DESC LIMIT 1), 'J2c', 2)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v17') ORDER BY started_at DESC LIMIT 1), 'J3a', 2)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v17') ORDER BY started_at DESC LIMIT 1), 'J3b', 2)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v17') ORDER BY started_at DESC LIMIT 1), 'J3c', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v17') ORDER BY started_at DESC LIMIT 1), 'J4a', 3)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v17') ORDER BY started_at DESC LIMIT 1), 'J4b', 2)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v17') ORDER BY started_at DESC LIMIT 1), 'J4c', 2)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v17') ORDER BY started_at DESC LIMIT 1), 'J5a', 3)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v17') ORDER BY started_at DESC LIMIT 1), 'J5b', 2)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v17') ORDER BY started_at DESC LIMIT 1), 'J5c', 3)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v17') ORDER BY started_at DESC LIMIT 1), 'J6a', 2)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v17') ORDER BY started_at DESC LIMIT 1), 'J6b', 2)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v17') ORDER BY started_at DESC LIMIT 1), 'J6c', 2)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v17') ORDER BY started_at DESC LIMIT 1), 'J7a', 3)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v17') ORDER BY started_at DESC LIMIT 1), 'J7b', 3)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v17') ORDER BY started_at DESC LIMIT 1), 'J7c', 3)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v17') ORDER BY started_at DESC LIMIT 1), 'J8a', 2)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v17') ORDER BY started_at DESC LIMIT 1), 'J8b', 3)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v17') ORDER BY started_at DESC LIMIT 1), 'J8c', 2)
         ON CONFLICT DO NOTHING;
INSERT INTO users (login_id, password_hash, display_name, must_reset_pw, is_demo, pw_login)
       VALUES ('sj-v18', crypt(:'pw_virtual', gen_salt('bf', 12)), '가상 참여자 18', false, true, true)
       ON CONFLICT DO NOTHING;
INSERT INTO memberships (user_id, org_id, role) VALUES ((SELECT id FROM users WHERE login_id = 'sj-v18'), (SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), 'student')
       ON CONFLICT (user_id, org_id, role) DO NOTHING;
INSERT INTO sj_participants (user_id, org_id, program_code, participant_no)
       VALUES ((SELECT id FROM users WHERE login_id = 'sj-v18'), (SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), 'SJ-DEMO-B', 'SJ-B-018') ON CONFLICT DO NOTHING;
INSERT INTO sj_counselor_assignments (org_id, counselor_user_id, participant_user_id)
       VALUES ((SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), (SELECT id FROM users WHERE login_id = 'sj-counsel2'), (SELECT id FROM users WHERE login_id = 'sj-v18')) ON CONFLICT DO NOTHING;
UPDATE users SET last_login_at = now() - interval '3 days' - interval '1 hour' WHERE id = (SELECT id FROM users WHERE login_id = 'sj-v18');
INSERT INTO consents (user_id, kind, version, granted, org_id)
         VALUES ((SELECT id FROM users WHERE login_id = 'sj-v18'), 'data_visibility', 'SJ-DEMO-COUNSELOR-1', true, (SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'));
INSERT INTO sj_experiences (user_id, kind, title, job_area, checks, skills)
         VALUES ((SELECT id FROM users WHERE login_id = 'sj-v18'), 'project', '사무 보조 계약직', 'JA01', ARRAY['problems','verifications']::text[], ARRAY[]::text[]);
INSERT INTO sj_experiences (user_id, kind, title, job_area, checks, skills)
         VALUES ((SELECT id FROM users WHERE login_id = 'sj-v18'), 'work', '카페 매장 운영', 'JA01', ARRAY['problems','verifications']::text[], ARRAY[]::text[]);
INSERT INTO sj_attempts (user_id, org_id, program_code, instrument_version, profile, status, result,
                                  analysis_version, started_at, scored_at)
         VALUES ((SELECT id FROM users WHERE login_id = 'sj-v18'), (SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), 'SJ-DEMO-B', 'SJ_JOBSEEKER_DEMO_V0', '{"audience":"jobseeker","job_areas":["JA06","JA01"],"region_range":"ADJACENT","skills":[]}'::jsonb, 'scored',
                 '{"analysis_version":"sj-demo-analysis.0","instrument_version":"SJ_JOBSEEKER_DEMO_V0","demo":true,"profile":{"audience":"jobseeker","job_areas":["JA06","JA01"],"region_range":"ADJACENT","skills":[]},"axes":[{"axis":"J1","name":"문제 정의","question":"무엇을 다룰지 누가 정했는가","level":1,"evidence":[{"id":"17-0","title":"사무 보조 계약직"},{"id":"17-1","title":"카페 매장 운영"}],"evidence_possible":true,"state":"EXPOSED"},{"axis":"J2","name":"요구사항 해석","question":"요구를 수치와 제약으로 옮겼는가","level":1,"evidence":[],"evidence_possible":false,"state":"EXPOSED"},{"axis":"J3","name":"직접 기술 판단","question":"내가 정한 항목이 무엇인가","level":0,"evidence":[],"evidence_possible":true,"state":"NONE"},{"axis":"J4","name":"방법·도구","question":"무엇으로 어떻게 했는가","level":2,"evidence":[],"evidence_possible":false,"state":"CLAIMED"},{"axis":"J5","name":"산출물","question":"무엇이 남았는가","level":1,"evidence":[],"evidence_possible":true,"state":"EXPOSED"},{"axis":"J6","name":"비교·검증","question":"무엇과 견주었는가","level":1,"evidence":[{"id":"17-0","title":"사무 보조 계약직"},{"id":"17-1","title":"카페 매장 운영"}],"evidence_possible":true,"state":"EXPOSED"},{"axis":"J7","name":"실패·수정","question":"틀린 것을 어떻게 좁혔는가","level":2,"evidence":[],"evidence_possible":false,"state":"CLAIMED"},{"axis":"J8","name":"조직 활용","question":"누가 무엇에 썼는가","level":1,"evidence":[],"evidence_possible":true,"state":"EXPOSED"}],"areas":[{"code":"JA06","name":"바이오·제약·식품","one_line":"규정과 위생 기준 안에서 제조·시험·품질 업무를 한다","core_ref":["BT_CORE_V1","FOOD_CORE_V1"],"key":[{"axis":"J2","name":"요구사항 해석","state":"EXPOSED"},{"axis":"J4","name":"방법·도구","state":"CLAIMED"},{"axis":"J6","name":"비교·검증","state":"EXPOSED"},{"axis":"J7","name":"실패·수정","state":"CLAIMED"}],"counts":{"confirmed":0,"claimed":2,"to_fill":2}},{"code":"JA01","name":"공공행정·정책 지원","one_line":"기관의 사업과 민원, 행정 절차를 기준에 맞게 처리한다","core_ref":["PUBADM_CORE_V1"],"key":[{"axis":"J1","name":"문제 정의","state":"EXPOSED"},{"axis":"J2","name":"요구사항 해석","state":"EXPOSED"},{"axis":"J6","name":"비교·검증","state":"EXPOSED"},{"axis":"J8","name":"조직 활용","state":"EXPOSED"}],"counts":{"confirmed":0,"claimed":0,"to_fill":4}}],"strengths":[],"gaps":[{"area":"JA06","axis":"J2"},{"area":"JA06","axis":"J6"},{"area":"JA01","axis":"J1"},{"area":"JA01","axis":"J2"},{"area":"JA01","axis":"J6"},{"area":"JA01","axis":"J8"}],"actions":[{"code":"RG-EXPLORE","horizon":"D30","kind":"region","text":"세종 사업장 기업·기관 탐색에서 관심 있는 곳 세 곳을 고르고, 공식 누리집의 채용 안내를 직접 확인하기"},{"code":"GR-J2","horizon":"D60","axis":"J2","kind":"growth","text":"맡은 일의 기준(기한·수량·규정)을 표 하나로 정리해 보기"},{"code":"GR-J6","horizon":"D60","axis":"J6","kind":"growth","text":"결과를 기준이나 이전 값과 비교한 기록을 하나 남기기"},{"code":"GR-J1","horizon":"D60","axis":"J1","kind":"growth","text":"다음 업무·훈련에서 ''무엇이 문제였는지''를 한 문장으로 적어 두기"},{"code":"GR-J8","horizon":"D60","axis":"J8","kind":"growth","text":"내 결과를 누가 어디에 썼는지 확인해 경험 기록에 적기"},{"code":"GR-TRAINING","horizon":"D60","kind":"growth","text":"희망 직무의 직업훈련·자격 과정을 고용24에서 찾아 하나를 정하기"},{"code":"AP-POSTING","horizon":"D90","kind":"apply","text":"고용24나 기업 누리집의 원 공고를 찾아 지원서에 이 결과의 근거 경험을 넣어 직접 지원하기"},{"code":"AP-RECHECK","horizon":"D90","kind":"apply","text":"새로 쌓은 경험을 기록하고 진단을 다시 받아 달라진 칸 확인하기"}],"quality":{"answered":24,"of":24,"flat":false},"evidence_count":2,"computed_at":"2026-10-20T00:00:00.000Z"}'::jsonb, 'sj-demo-analysis.0', now() - interval '4 days', now() - interval '4 days' + interval '25 minutes');
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v18') ORDER BY started_at DESC LIMIT 1), 'J1a', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v18') ORDER BY started_at DESC LIMIT 1), 'J1b', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v18') ORDER BY started_at DESC LIMIT 1), 'J1c', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v18') ORDER BY started_at DESC LIMIT 1), 'J2a', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v18') ORDER BY started_at DESC LIMIT 1), 'J2b', 2)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v18') ORDER BY started_at DESC LIMIT 1), 'J2c', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v18') ORDER BY started_at DESC LIMIT 1), 'J3a', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v18') ORDER BY started_at DESC LIMIT 1), 'J3b', 2)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v18') ORDER BY started_at DESC LIMIT 1), 'J3c', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v18') ORDER BY started_at DESC LIMIT 1), 'J4a', 2)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v18') ORDER BY started_at DESC LIMIT 1), 'J4b', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v18') ORDER BY started_at DESC LIMIT 1), 'J4c', 2)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v18') ORDER BY started_at DESC LIMIT 1), 'J5a', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v18') ORDER BY started_at DESC LIMIT 1), 'J5b', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v18') ORDER BY started_at DESC LIMIT 1), 'J5c', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v18') ORDER BY started_at DESC LIMIT 1), 'J6a', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v18') ORDER BY started_at DESC LIMIT 1), 'J6b', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v18') ORDER BY started_at DESC LIMIT 1), 'J6c', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v18') ORDER BY started_at DESC LIMIT 1), 'J7a', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v18') ORDER BY started_at DESC LIMIT 1), 'J7b', 2)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v18') ORDER BY started_at DESC LIMIT 1), 'J7c', 2)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v18') ORDER BY started_at DESC LIMIT 1), 'J8a', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v18') ORDER BY started_at DESC LIMIT 1), 'J8b', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v18') ORDER BY started_at DESC LIMIT 1), 'J8c', 2)
         ON CONFLICT DO NOTHING;
INSERT INTO users (login_id, password_hash, display_name, must_reset_pw, is_demo, pw_login)
       VALUES ('sj-v19', crypt(:'pw_virtual', gen_salt('bf', 12)), '가상 참여자 19', false, true, true)
       ON CONFLICT DO NOTHING;
INSERT INTO memberships (user_id, org_id, role) VALUES ((SELECT id FROM users WHERE login_id = 'sj-v19'), (SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), 'student')
       ON CONFLICT (user_id, org_id, role) DO NOTHING;
INSERT INTO sj_participants (user_id, org_id, program_code, participant_no)
       VALUES ((SELECT id FROM users WHERE login_id = 'sj-v19'), (SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), 'SJ-DEMO-B', 'SJ-B-019') ON CONFLICT DO NOTHING;
INSERT INTO sj_counselor_assignments (org_id, counselor_user_id, participant_user_id)
       VALUES ((SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), (SELECT id FROM users WHERE login_id = 'sj-counsel1'), (SELECT id FROM users WHERE login_id = 'sj-v19')) ON CONFLICT DO NOTHING;
UPDATE users SET last_login_at = now() - interval '4 days' - interval '1 hour' WHERE id = (SELECT id FROM users WHERE login_id = 'sj-v19');
INSERT INTO sj_experiences (user_id, kind, title, job_area, checks, skills)
         VALUES ((SELECT id FROM users WHERE login_id = 'sj-v19'), 'volunteer', '사무 보조 계약직', 'JA01', ARRAY['decisions','artifacts','verifications']::text[], ARRAY[]::text[]);
INSERT INTO sj_attempts (user_id, org_id, program_code, instrument_version, profile, status, result,
                                  analysis_version, started_at, scored_at)
         VALUES ((SELECT id FROM users WHERE login_id = 'sj-v19'), (SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), 'SJ-DEMO-B', 'SJ_JOBSEEKER_DEMO_V0', '{"audience":"career_changer","job_areas":["JA01"],"region_range":"UNDECIDED","skills":[]}'::jsonb, 'scored',
                 '{"analysis_version":"sj-demo-analysis.0","instrument_version":"SJ_JOBSEEKER_DEMO_V0","demo":true,"profile":{"audience":"career_changer","job_areas":["JA01"],"region_range":"UNDECIDED","skills":[]},"axes":[{"axis":"J1","name":"문제 정의","question":"무엇을 다룰지 누가 정했는가","level":2,"evidence":[],"evidence_possible":true,"state":"CLAIMED"},{"axis":"J2","name":"요구사항 해석","question":"요구를 수치와 제약으로 옮겼는가","level":1,"evidence":[],"evidence_possible":false,"state":"EXPOSED"},{"axis":"J3","name":"직접 기술 판단","question":"내가 정한 항목이 무엇인가","level":2,"evidence":[{"id":"18-0","title":"사무 보조 계약직"}],"evidence_possible":true,"state":"PARTIAL"},{"axis":"J4","name":"방법·도구","question":"무엇으로 어떻게 했는가","level":3,"evidence":[],"evidence_possible":false,"state":"CLAIMED"},{"axis":"J5","name":"산출물","question":"무엇이 남았는가","level":3,"evidence":[{"id":"18-0","title":"사무 보조 계약직"}],"evidence_possible":true,"state":"PARTIAL"},{"axis":"J6","name":"비교·검증","question":"무엇과 견주었는가","level":1,"evidence":[{"id":"18-0","title":"사무 보조 계약직"}],"evidence_possible":true,"state":"EXPOSED"},{"axis":"J7","name":"실패·수정","question":"틀린 것을 어떻게 좁혔는가","level":2,"evidence":[],"evidence_possible":false,"state":"CLAIMED"},{"axis":"J8","name":"조직 활용","question":"누가 무엇에 썼는가","level":1,"evidence":[],"evidence_possible":true,"state":"EXPOSED"}],"areas":[{"code":"JA01","name":"공공행정·정책 지원","one_line":"기관의 사업과 민원, 행정 절차를 기준에 맞게 처리한다","core_ref":["PUBADM_CORE_V1"],"key":[{"axis":"J1","name":"문제 정의","state":"CLAIMED"},{"axis":"J2","name":"요구사항 해석","state":"EXPOSED"},{"axis":"J6","name":"비교·검증","state":"EXPOSED"},{"axis":"J8","name":"조직 활용","state":"EXPOSED"}],"counts":{"confirmed":0,"claimed":1,"to_fill":3}}],"strengths":["J3","J5"],"gaps":[{"area":"JA01","axis":"J2"},{"area":"JA01","axis":"J6"},{"area":"JA01","axis":"J8"}],"actions":[{"code":"EV-J1","horizon":"D30","axis":"J1","kind":"evidence","text":"''문제 정의''을(를) 해 본 경험 하나를 경험 기록에 적고 근거 칸을 고르기"},{"code":"EV2-J3","horizon":"D30","axis":"J3","kind":"evidence","text":"''직접 기술 판단'' 근거가 하나 있습니다. 다른 경험에서 하나 더 찾아 적기"},{"code":"EV2-J5","horizon":"D30","axis":"J5","kind":"evidence","text":"''산출물'' 근거가 하나 있습니다. 다른 경험에서 하나 더 찾아 적기"},{"code":"RG-EXPLORE","horizon":"D30","kind":"region","text":"세종 사업장 기업·기관 탐색에서 관심 있는 곳 세 곳을 고르고, 공식 누리집의 채용 안내를 직접 확인하기"},{"code":"GR-J2","horizon":"D60","axis":"J2","kind":"growth","text":"맡은 일의 기준(기한·수량·규정)을 표 하나로 정리해 보기"},{"code":"GR-J6","horizon":"D60","axis":"J6","kind":"growth","text":"결과를 기준이나 이전 값과 비교한 기록을 하나 남기기"},{"code":"GR-J8","horizon":"D60","axis":"J8","kind":"growth","text":"내 결과를 누가 어디에 썼는지 확인해 경험 기록에 적기"},{"code":"GR-TRAINING","horizon":"D60","kind":"growth","text":"희망 직무의 직업훈련·자격 과정을 고용24에서 찾아 하나를 정하기"},{"code":"AP-POSTING","horizon":"D90","kind":"apply","text":"고용24나 기업 누리집의 원 공고를 찾아 지원서에 이 결과의 근거 경험을 넣어 직접 지원하기"},{"code":"AP-RECHECK","horizon":"D90","kind":"apply","text":"새로 쌓은 경험을 기록하고 진단을 다시 받아 달라진 칸 확인하기"}],"quality":{"answered":24,"of":24,"flat":false},"evidence_count":1,"computed_at":"2026-10-20T00:00:00.000Z"}'::jsonb, 'sj-demo-analysis.0', now() - interval '5 days', now() - interval '5 days' + interval '25 minutes');
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v19') ORDER BY started_at DESC LIMIT 1), 'J1a', 2)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v19') ORDER BY started_at DESC LIMIT 1), 'J1b', 2)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v19') ORDER BY started_at DESC LIMIT 1), 'J1c', 3)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v19') ORDER BY started_at DESC LIMIT 1), 'J2a', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v19') ORDER BY started_at DESC LIMIT 1), 'J2b', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v19') ORDER BY started_at DESC LIMIT 1), 'J2c', 3)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v19') ORDER BY started_at DESC LIMIT 1), 'J3a', 2)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v19') ORDER BY started_at DESC LIMIT 1), 'J3b', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v19') ORDER BY started_at DESC LIMIT 1), 'J3c', 3)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v19') ORDER BY started_at DESC LIMIT 1), 'J4a', 3)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v19') ORDER BY started_at DESC LIMIT 1), 'J4b', 3)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v19') ORDER BY started_at DESC LIMIT 1), 'J4c', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v19') ORDER BY started_at DESC LIMIT 1), 'J5a', 3)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v19') ORDER BY started_at DESC LIMIT 1), 'J5b', 3)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v19') ORDER BY started_at DESC LIMIT 1), 'J5c', 3)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v19') ORDER BY started_at DESC LIMIT 1), 'J6a', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v19') ORDER BY started_at DESC LIMIT 1), 'J6b', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v19') ORDER BY started_at DESC LIMIT 1), 'J6c', 3)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v19') ORDER BY started_at DESC LIMIT 1), 'J7a', 2)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v19') ORDER BY started_at DESC LIMIT 1), 'J7b', 2)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v19') ORDER BY started_at DESC LIMIT 1), 'J7c', 3)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v19') ORDER BY started_at DESC LIMIT 1), 'J8a', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v19') ORDER BY started_at DESC LIMIT 1), 'J8b', 2)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v19') ORDER BY started_at DESC LIMIT 1), 'J8c', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO users (login_id, password_hash, display_name, must_reset_pw, is_demo, pw_login)
       VALUES ('sj-v20', crypt(:'pw_virtual', gen_salt('bf', 12)), '가상 참여자 20', false, true, true)
       ON CONFLICT DO NOTHING;
INSERT INTO memberships (user_id, org_id, role) VALUES ((SELECT id FROM users WHERE login_id = 'sj-v20'), (SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), 'student')
       ON CONFLICT (user_id, org_id, role) DO NOTHING;
INSERT INTO sj_participants (user_id, org_id, program_code, participant_no)
       VALUES ((SELECT id FROM users WHERE login_id = 'sj-v20'), (SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), 'SJ-DEMO-B', 'SJ-B-020') ON CONFLICT DO NOTHING;
INSERT INTO sj_counselor_assignments (org_id, counselor_user_id, participant_user_id)
       VALUES ((SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), (SELECT id FROM users WHERE login_id = 'sj-counsel2'), (SELECT id FROM users WHERE login_id = 'sj-v20')) ON CONFLICT DO NOTHING;
UPDATE users SET last_login_at = now() - interval '5 days' - interval '1 hour' WHERE id = (SELECT id FROM users WHERE login_id = 'sj-v20');
INSERT INTO consents (user_id, kind, version, granted, org_id)
         VALUES ((SELECT id FROM users WHERE login_id = 'sj-v20'), 'data_visibility', 'SJ-DEMO-COUNSELOR-1', true, (SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'));
INSERT INTO sj_experiences (user_id, kind, title, job_area, checks, skills)
         VALUES ((SELECT id FROM users WHERE login_id = 'sj-v20'), 'volunteer', '카페 매장 운영', 'JA08', ARRAY['problems','artifacts','used_where']::text[], ARRAY[]::text[]);
INSERT INTO sj_attempts (user_id, org_id, program_code, instrument_version, profile, status, result,
                                  analysis_version, started_at, scored_at)
         VALUES ((SELECT id FROM users WHERE login_id = 'sj-v20'), (SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'), 'SJ-DEMO-B', 'SJ_JOBSEEKER_DEMO_V0', '{"audience":"youth_jobseeker","job_areas":["JA08","JA07"],"region_range":"HOME_ONLY","skills":[]}'::jsonb, 'scored',
                 '{"analysis_version":"sj-demo-analysis.0","instrument_version":"SJ_JOBSEEKER_DEMO_V0","demo":true,"profile":{"audience":"youth_jobseeker","job_areas":["JA08","JA07"],"region_range":"HOME_ONLY","skills":[]},"axes":[{"axis":"J1","name":"문제 정의","question":"무엇을 다룰지 누가 정했는가","level":0,"evidence":[{"id":"19-0","title":"카페 매장 운영"}],"evidence_possible":true,"state":"NONE"},{"axis":"J2","name":"요구사항 해석","question":"요구를 수치와 제약으로 옮겼는가","level":1,"evidence":[],"evidence_possible":false,"state":"EXPOSED"},{"axis":"J3","name":"직접 기술 판단","question":"내가 정한 항목이 무엇인가","level":1,"evidence":[],"evidence_possible":true,"state":"EXPOSED"},{"axis":"J4","name":"방법·도구","question":"무엇으로 어떻게 했는가","level":1,"evidence":[],"evidence_possible":false,"state":"EXPOSED"},{"axis":"J5","name":"산출물","question":"무엇이 남았는가","level":2,"evidence":[{"id":"19-0","title":"카페 매장 운영"}],"evidence_possible":true,"state":"PARTIAL"},{"axis":"J6","name":"비교·검증","question":"무엇과 견주었는가","level":2,"evidence":[],"evidence_possible":true,"state":"CLAIMED"},{"axis":"J7","name":"실패·수정","question":"틀린 것을 어떻게 좁혔는가","level":0,"evidence":[],"evidence_possible":false,"state":"NONE"},{"axis":"J8","name":"조직 활용","question":"누가 무엇에 썼는가","level":0,"evidence":[{"id":"19-0","title":"카페 매장 운영"}],"evidence_possible":true,"state":"NONE"}],"areas":[{"code":"JA08","name":"경영지원·사무·회계","one_line":"문서와 숫자를 정확하게 다뤄 조직이 움직이게 한다","core_ref":["BIZ_CORE_V1","ACCT_CORE_V1"],"key":[{"axis":"J2","name":"요구사항 해석","state":"EXPOSED"},{"axis":"J4","name":"방법·도구","state":"EXPOSED"},{"axis":"J5","name":"산출물","state":"PARTIAL"},{"axis":"J8","name":"조직 활용","state":"NONE"}],"counts":{"confirmed":1,"claimed":0,"to_fill":3}},{"code":"JA07","name":"IT·데이터·디지털 운영","one_line":"시스템과 데이터를 다뤄 업무가 돌아가게 한다","core_ref":["CS_CORE_V1"],"key":[{"axis":"J1","name":"문제 정의","state":"NONE"},{"axis":"J3","name":"직접 기술 판단","state":"EXPOSED"},{"axis":"J4","name":"방법·도구","state":"EXPOSED"},{"axis":"J5","name":"산출물","state":"PARTIAL"}],"counts":{"confirmed":1,"claimed":0,"to_fill":3}}],"strengths":["J5"],"gaps":[{"area":"JA08","axis":"J2"},{"area":"JA08","axis":"J4"},{"area":"JA08","axis":"J8"},{"area":"JA07","axis":"J1"},{"area":"JA07","axis":"J3"},{"area":"JA07","axis":"J4"}],"actions":[{"code":"EV2-J5","horizon":"D30","axis":"J5","kind":"evidence","text":"''산출물'' 근거가 하나 있습니다. 다른 경험에서 하나 더 찾아 적기"},{"code":"EV-J6","horizon":"D30","axis":"J6","kind":"evidence","text":"''비교·검증''을(를) 해 본 경험 하나를 경험 기록에 적고 근거 칸을 고르기"},{"code":"RG-EXPLORE","horizon":"D30","kind":"region","text":"세종 사업장 기업·기관 탐색에서 관심 있는 곳 세 곳을 고르고, 공식 누리집의 채용 안내를 직접 확인하기"},{"code":"GR-J2","horizon":"D60","axis":"J2","kind":"growth","text":"맡은 일의 기준(기한·수량·규정)을 표 하나로 정리해 보기"},{"code":"GR-J4","horizon":"D60","axis":"J4","kind":"growth","text":"희망 직무에서 많이 쓰는 도구 하나를 정해 실습하기 (직업훈련 과정 확인)"},{"code":"GR-J8","horizon":"D60","axis":"J8","kind":"growth","text":"내 결과를 누가 어디에 썼는지 확인해 경험 기록에 적기"},{"code":"GR-J1","horizon":"D60","axis":"J1","kind":"growth","text":"다음 업무·훈련에서 ''무엇이 문제였는지''를 한 문장으로 적어 두기"},{"code":"GR-J3","horizon":"D60","axis":"J3","kind":"growth","text":"내가 정한 것 하나와 그 까닭을 기록으로 남기기"},{"code":"GR-TRAINING","horizon":"D60","kind":"growth","text":"희망 직무의 직업훈련·자격 과정을 고용24에서 찾아 하나를 정하기"},{"code":"AP-POSTING","horizon":"D90","kind":"apply","text":"고용24나 기업 누리집의 원 공고를 찾아 지원서에 이 결과의 근거 경험을 넣어 직접 지원하기"},{"code":"AP-RECHECK","horizon":"D90","kind":"apply","text":"새로 쌓은 경험을 기록하고 진단을 다시 받아 달라진 칸 확인하기"}],"quality":{"answered":24,"of":24,"flat":false},"evidence_count":1,"computed_at":"2026-10-20T00:00:00.000Z"}'::jsonb, 'sj-demo-analysis.0', now() - interval '6 days', now() - interval '6 days' + interval '25 minutes');
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v20') ORDER BY started_at DESC LIMIT 1), 'J1a', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v20') ORDER BY started_at DESC LIMIT 1), 'J1b', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v20') ORDER BY started_at DESC LIMIT 1), 'J1c', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v20') ORDER BY started_at DESC LIMIT 1), 'J2a', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v20') ORDER BY started_at DESC LIMIT 1), 'J2b', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v20') ORDER BY started_at DESC LIMIT 1), 'J2c', 2)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v20') ORDER BY started_at DESC LIMIT 1), 'J3a', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v20') ORDER BY started_at DESC LIMIT 1), 'J3b', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v20') ORDER BY started_at DESC LIMIT 1), 'J3c', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v20') ORDER BY started_at DESC LIMIT 1), 'J4a', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v20') ORDER BY started_at DESC LIMIT 1), 'J4b', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v20') ORDER BY started_at DESC LIMIT 1), 'J4c', 2)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v20') ORDER BY started_at DESC LIMIT 1), 'J5a', 2)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v20') ORDER BY started_at DESC LIMIT 1), 'J5b', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v20') ORDER BY started_at DESC LIMIT 1), 'J5c', 2)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v20') ORDER BY started_at DESC LIMIT 1), 'J6a', 2)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v20') ORDER BY started_at DESC LIMIT 1), 'J6b', 2)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v20') ORDER BY started_at DESC LIMIT 1), 'J6c', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v20') ORDER BY started_at DESC LIMIT 1), 'J7a', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v20') ORDER BY started_at DESC LIMIT 1), 'J7b', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v20') ORDER BY started_at DESC LIMIT 1), 'J7c', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v20') ORDER BY started_at DESC LIMIT 1), 'J8a', 1)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v20') ORDER BY started_at DESC LIMIT 1), 'J8b', 0)
         ON CONFLICT DO NOTHING;
INSERT INTO sj_responses (attempt_id, item_code, value) VALUES ((SELECT id FROM sj_attempts WHERE user_id = (SELECT id FROM users WHERE login_id = 'sj-v20') ORDER BY started_at DESC LIMIT 1), 'J8c', 0)
         ON CONFLICT DO NOTHING;
