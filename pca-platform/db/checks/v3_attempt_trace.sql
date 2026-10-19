-- 한 응시의 **응답 → 고른 근거 → 굳은 결과**가 DB 에 실제로 적혀 있는가.
-- 읽기만 한다. INSERT · UPDATE · DELETE · DDL 이 한 줄도 없다.
--
-- Staging 컨테이너에서(Railway -> staging 서비스 -> ... -> Shell):
--   psql "$DATABASE_URL" -v att=<응시번호> -f /app/db/checks/v3_attempt_trace.sql
--
-- 응시번호는 결과 주소의 숫자다: /v3/<응시번호>/result
-- 학생의 이름과 비밀번호는 어디에도 찍히지 않는다. 아이디(login_id)만 선다.

\pset border 2
\echo ''
\echo '== 1. 응시 한 줄 =='
select a.id, a.status, a.core_code, a.tier, a.education_stage, a.university_code,
       a.department_code, a.specialization_code, a.industry_pack, a.role_pack,
       a.started_at, a.submitted_at, u.login_id
  from v3_attempts a join users u on u.id = a.user_id
 where a.id = :att;

\echo ''
\echo '== 2. 저장된 응답 수 (종류별) =='
select kind, count(*) as n from v3_responses where attempt_id = :att group by kind order by kind;
select count(*) as "응답 전체" from v3_responses where attempt_id = :att;

\echo ''
\echo '== 3. 고른 근거 (영역 · 자리 · 글자 그대로) =='
select domain_code, slot, item_text from v3_evidence_picks
 where attempt_id = :att order by domain_code, slot, item_text;
select count(*) as "고른 근거 전체" from v3_evidence_picks where attempt_id = :att;

\echo ''
\echo '== 4. 굳은 결과 (한 줄이어야 한다) =='
select id, created_at, result_model_version, result_copy_version,
       module_versions->>'core_code'       as core,
       module_versions->>'item_bank_version' as bank,
       module_versions->>'scoring_version' as scoring,
       module_versions->>'result_ui_version' as result_ui,
       response_quality
  from v3_snapshots where attempt_id = :att order by created_at desc;

\echo ''
\echo '== 5. 결과 모델이 든 판정 (머리글 · 먼저 볼 영역 · 영역별 묶음) =='
select result_model->'overview'->>'headline' as headline,
       result_model->'overview'->'focus'      as focus
  from v3_snapshots where attempt_id = :att order by created_at desc limit 1;

select d->>'code' as domain, d->>'zone' as zone,
       jsonb_array_length(coalesce(d->'did','[]'::jsonb))           as did,
       jsonb_array_length(coalesce(d->'decided','[]'::jsonb))       as decided,
       jsonb_array_length(coalesce(d->'artifacts','[]'::jsonb))     as artifacts,
       jsonb_array_length(coalesce(d->'verifications','[]'::jsonb)) as verifications
  from v3_snapshots s, jsonb_array_elements(s.result_model->'domains') d
 where s.attempt_id = :att
 order by s.created_at desc, d->>'code';

\echo ''
\echo '== 6. 고른 근거가 결과 모델에 그대로 들어갔는가 (없으면 0줄) =='
select p.domain_code, p.slot, p.item_text,
       exists (
         select 1 from v3_snapshots s, jsonb_array_elements(s.result_model->'domains') d
          where s.attempt_id = :att and d->>'code' = p.domain_code
            and (d->'did' ? p.item_text or d->'decided' ? p.item_text
                 or d->'artifacts' ? p.item_text or d->'verifications' ? p.item_text)
       ) as in_result_model
  from v3_evidence_picks p where p.attempt_id = :att order by 1,2,3;

\echo ''
\echo '== 7. 종이 실패 기록 (이 응시) =='
select kind, trace_id, created_at, left(message, 160) as message
  from job_failures where kind = 'pdf' and trace_id like 'v3-pdf-%-' || :att
 order by created_at desc limit 5;
