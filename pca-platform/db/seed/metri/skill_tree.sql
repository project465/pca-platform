-- 자동 생성 파일. 고치지 말 것. 원본은 data/metri/*.json, 생성은 scripts/metri/build.mjs
-- 적용 순서: db/schema.sql → db/schema_metri.sql → 이 파일
BEGIN;

-- 지표 축
INSERT INTO indicator_axes (code, kind, sort_no) VALUES ('ANALYZE', 'activity', 1) ON CONFLICT (code) DO UPDATE SET kind = EXCLUDED.kind, sort_no = EXCLUDED.sort_no;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'indicator_axes', id, 'ko', 'name', '해석·계산' FROM indicator_axes WHERE code = 'ANALYZE'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'indicator_axes', id, 'ko', 'description', '현상을 수식과 모델로 풀어 답을 내는 활동' FROM indicator_axes WHERE code = 'ANALYZE'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'indicator_axes', id, 'en', 'name', 'Analysis' FROM indicator_axes WHERE code = 'ANALYZE'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO indicator_axes (code, kind, sort_no) VALUES ('DESIGN', 'activity', 2) ON CONFLICT (code) DO UPDATE SET kind = EXCLUDED.kind, sort_no = EXCLUDED.sort_no;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'indicator_axes', id, 'ko', 'name', '설계·구상' FROM indicator_axes WHERE code = 'DESIGN'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'indicator_axes', id, 'ko', 'description', '요구조건에서 형상·구조·구성을 만들어내는 활동' FROM indicator_axes WHERE code = 'DESIGN'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'indicator_axes', id, 'en', 'name', 'Design' FROM indicator_axes WHERE code = 'DESIGN'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO indicator_axes (code, kind, sort_no) VALUES ('BUILD', 'activity', 3) ON CONFLICT (code) DO UPDATE SET kind = EXCLUDED.kind, sort_no = EXCLUDED.sort_no;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'indicator_axes', id, 'ko', 'name', '제작·실험' FROM indicator_axes WHERE code = 'BUILD'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'indicator_axes', id, 'ko', 'description', '직접 만들고 측정해 확인하는 활동' FROM indicator_axes WHERE code = 'BUILD'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'indicator_axes', id, 'en', 'name', 'Build & Test' FROM indicator_axes WHERE code = 'BUILD'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO indicator_axes (code, kind, sort_no) VALUES ('CODE', 'activity', 4) ON CONFLICT (code) DO UPDATE SET kind = EXCLUDED.kind, sort_no = EXCLUDED.sort_no;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'indicator_axes', id, 'ko', 'name', '구현·프로그래밍' FROM indicator_axes WHERE code = 'CODE'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'indicator_axes', id, 'ko', 'description', '코드로 동작을 만드는 활동' FROM indicator_axes WHERE code = 'CODE'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'indicator_axes', id, 'en', 'name', 'Programming' FROM indicator_axes WHERE code = 'CODE'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO indicator_axes (code, kind, sort_no) VALUES ('FIELD', 'activity', 5) ON CONFLICT (code) DO UPDATE SET kind = EXCLUDED.kind, sort_no = EXCLUDED.sort_no;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'indicator_axes', id, 'ko', 'name', '현장·설비' FROM indicator_axes WHERE code = 'FIELD'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'indicator_axes', id, 'ko', 'description', '설비와 공정이 있는 현장에서 돌아가게 만드는 활동' FROM indicator_axes WHERE code = 'FIELD'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'indicator_axes', id, 'en', 'name', 'Field & Plant' FROM indicator_axes WHERE code = 'FIELD'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO indicator_axes (code, kind, sort_no) VALUES ('OPTIMIZE', 'activity', 6) ON CONFLICT (code) DO UPDATE SET kind = EXCLUDED.kind, sort_no = EXCLUDED.sort_no;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'indicator_axes', id, 'ko', 'name', '개선·효율' FROM indicator_axes WHERE code = 'OPTIMIZE'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'indicator_axes', id, 'ko', 'description', '이미 있는 것을 더 빠르고 싸고 안정되게 만드는 활동' FROM indicator_axes WHERE code = 'OPTIMIZE'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'indicator_axes', id, 'en', 'name', 'Optimization' FROM indicator_axes WHERE code = 'OPTIMIZE'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO indicator_axes (code, kind, sort_no) VALUES ('RESEARCH', 'activity', 7) ON CONFLICT (code) DO UPDATE SET kind = EXCLUDED.kind, sort_no = EXCLUDED.sort_no;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'indicator_axes', id, 'ko', 'name', '탐구·이론' FROM indicator_axes WHERE code = 'RESEARCH'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'indicator_axes', id, 'ko', 'description', '원리를 파고들어 새 방법을 찾는 활동' FROM indicator_axes WHERE code = 'RESEARCH'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'indicator_axes', id, 'en', 'name', 'Research' FROM indicator_axes WHERE code = 'RESEARCH'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO indicator_axes (code, kind, sort_no) VALUES ('ORCHESTRATE', 'activity', 8) ON CONFLICT (code) DO UPDATE SET kind = EXCLUDED.kind, sort_no = EXCLUDED.sort_no;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'indicator_axes', id, 'ko', 'name', '조율·관리' FROM indicator_axes WHERE code = 'ORCHESTRATE'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'indicator_axes', id, 'ko', 'description', '사람·일정·이해관계를 맞춰 굴러가게 하는 활동' FROM indicator_axes WHERE code = 'ORCHESTRATE'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'indicator_axes', id, 'en', 'name', 'Coordination' FROM indicator_axes WHERE code = 'ORCHESTRATE'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO indicator_axes (code, kind, sort_no) VALUES ('INDEP', 'trait', 1) ON CONFLICT (code) DO UPDATE SET kind = EXCLUDED.kind, sort_no = EXCLUDED.sort_no;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'indicator_axes', id, 'ko', 'name', '독립형' FROM indicator_axes WHERE code = 'INDEP'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'indicator_axes', id, 'en', 'name', 'Independent' FROM indicator_axes WHERE code = 'INDEP'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO indicator_axes (code, kind, sort_no) VALUES ('CHALLENGE', 'trait', 2) ON CONFLICT (code) DO UPDATE SET kind = EXCLUDED.kind, sort_no = EXCLUDED.sort_no;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'indicator_axes', id, 'ko', 'name', '도전형' FROM indicator_axes WHERE code = 'CHALLENGE'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'indicator_axes', id, 'en', 'name', 'Challenging' FROM indicator_axes WHERE code = 'CHALLENGE'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO indicator_axes (code, kind, sort_no) VALUES ('SPEED', 'trait', 3) ON CONFLICT (code) DO UPDATE SET kind = EXCLUDED.kind, sort_no = EXCLUDED.sort_no;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'indicator_axes', id, 'ko', 'name', '속도중시형' FROM indicator_axes WHERE code = 'SPEED'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'indicator_axes', id, 'en', 'name', 'Speed-oriented' FROM indicator_axes WHERE code = 'SPEED'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO indicator_axes (code, kind, sort_no) VALUES ('COLLAB', 'trait', 4) ON CONFLICT (code) DO UPDATE SET kind = EXCLUDED.kind, sort_no = EXCLUDED.sort_no;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'indicator_axes', id, 'ko', 'name', '협력형' FROM indicator_axes WHERE code = 'COLLAB'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'indicator_axes', id, 'en', 'name', 'Collaborative' FROM indicator_axes WHERE code = 'COLLAB'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO indicator_axes (code, kind, sort_no) VALUES ('STABLE', 'trait', 5) ON CONFLICT (code) DO UPDATE SET kind = EXCLUDED.kind, sort_no = EXCLUDED.sort_no;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'indicator_axes', id, 'ko', 'name', '안정형' FROM indicator_axes WHERE code = 'STABLE'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'indicator_axes', id, 'en', 'name', 'Stable' FROM indicator_axes WHERE code = 'STABLE'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO indicator_axes (code, kind, sort_no) VALUES ('QUALITY', 'trait', 6) ON CONFLICT (code) DO UPDATE SET kind = EXCLUDED.kind, sort_no = EXCLUDED.sort_no;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'indicator_axes', id, 'ko', 'name', '품질중시형' FROM indicator_axes WHERE code = 'QUALITY'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'indicator_axes', id, 'en', 'name', 'Quality-oriented' FROM indicator_axes WHERE code = 'QUALITY'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;

-- 트랙
INSERT INTO tracks (code, stage, instrument_key, sort_no) VALUES ('HS', 'high', 'HS_V1', 1) ON CONFLICT (code) DO UPDATE SET stage = EXCLUDED.stage, instrument_key = EXCLUDED.instrument_key, sort_no = EXCLUDED.sort_no;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'tracks', id, 'ko', 'name', '고등학생' FROM tracks WHERE code = 'HS'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO tracks (code, stage, instrument_key, sort_no) VALUES ('UNIV_LOW', 'univ', 'UNIV_V1', 2) ON CONFLICT (code) DO UPDATE SET stage = EXCLUDED.stage, instrument_key = EXCLUDED.instrument_key, sort_no = EXCLUDED.sort_no;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'tracks', id, 'ko', 'name', '대학 1–2학년' FROM tracks WHERE code = 'UNIV_LOW'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO tracks (code, stage, instrument_key, sort_no) VALUES ('UNIV_HIGH', 'univ', 'UNIV_V1', 3) ON CONFLICT (code) DO UPDATE SET stage = EXCLUDED.stage, instrument_key = EXCLUDED.instrument_key, sort_no = EXCLUDED.sort_no;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'tracks', id, 'ko', 'name', '대학 3–4학년' FROM tracks WHERE code = 'UNIV_HIGH'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO tracks (code, stage, instrument_key, sort_no) VALUES ('GRAD', 'grad', 'UNIV_V1', 4) ON CONFLICT (code) DO UPDATE SET stage = EXCLUDED.stage, instrument_key = EXCLUDED.instrument_key, sort_no = EXCLUDED.sort_no;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'tracks', id, 'ko', 'name', '졸업예정·대학원' FROM tracks WHERE code = 'GRAD'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;

-- 진로 목표 (고교 결과지 분기)
INSERT INTO learner_goals (code, sort_no) VALUES ('univ', 1) ON CONFLICT (code) DO UPDATE SET sort_no = EXCLUDED.sort_no;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'learner_goals', id, 'ko', 'name', '진학형' FROM learner_goals WHERE code = 'univ'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO learner_goals (code, sort_no) VALUES ('job', 2) ON CONFLICT (code) DO UPDATE SET sort_no = EXCLUDED.sort_no;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'learner_goals', id, 'ko', 'name', '취업형' FROM learner_goals WHERE code = 'job'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO learner_goals (code, sort_no) VALUES ('any', 3) ON CONFLICT (code) DO UPDATE SET sort_no = EXCLUDED.sort_no;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'learner_goals', id, 'ko', 'name', '해당 없음' FROM learner_goals WHERE code = 'any'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;

-- 산업
INSERT INTO industries (code, sort_no) VALUES ('AUTO', 1) ON CONFLICT (code) DO UPDATE SET sort_no = EXCLUDED.sort_no;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'industries', id, 'ko', 'name', '자동차·모빌리티' FROM industries WHERE code = 'AUTO'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO industries (code, sort_no) VALUES ('SEMI', 2) ON CONFLICT (code) DO UPDATE SET sort_no = EXCLUDED.sort_no;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'industries', id, 'ko', 'name', '반도체·디스플레이' FROM industries WHERE code = 'SEMI'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO industries (code, sort_no) VALUES ('BATT', 3) ON CONFLICT (code) DO UPDATE SET sort_no = EXCLUDED.sort_no;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'industries', id, 'ko', 'name', '이차전지·에너지' FROM industries WHERE code = 'BATT'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO industries (code, sort_no) VALUES ('AERO', 4) ON CONFLICT (code) DO UPDATE SET sort_no = EXCLUDED.sort_no;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'industries', id, 'ko', 'name', '항공우주' FROM industries WHERE code = 'AERO'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO industries (code, sort_no) VALUES ('DEF', 5) ON CONFLICT (code) DO UPDATE SET sort_no = EXCLUDED.sort_no;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'industries', id, 'ko', 'name', '방위산업' FROM industries WHERE code = 'DEF'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO industries (code, sort_no) VALUES ('ROBOT', 6) ON CONFLICT (code) DO UPDATE SET sort_no = EXCLUDED.sort_no;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'industries', id, 'ko', 'name', '로봇·자동화' FROM industries WHERE code = 'ROBOT'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO industries (code, sort_no) VALUES ('MACH', 7) ON CONFLICT (code) DO UPDATE SET sort_no = EXCLUDED.sort_no;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'industries', id, 'ko', 'name', '기계·장비' FROM industries WHERE code = 'MACH'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO industries (code, sort_no) VALUES ('CHEM', 8) ON CONFLICT (code) DO UPDATE SET sort_no = EXCLUDED.sort_no;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'industries', id, 'ko', 'name', '화학·소재' FROM industries WHERE code = 'CHEM'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO industries (code, sort_no) VALUES ('POWER', 9) ON CONFLICT (code) DO UPDATE SET sort_no = EXCLUDED.sort_no;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'industries', id, 'ko', 'name', '전력·인프라' FROM industries WHERE code = 'POWER'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO industries (code, sort_no) VALUES ('TELCO', 10) ON CONFLICT (code) DO UPDATE SET sort_no = EXCLUDED.sort_no;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'industries', id, 'ko', 'name', '통신·네트워크' FROM industries WHERE code = 'TELCO'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO industries (code, sort_no) VALUES ('SW', 11) ON CONFLICT (code) DO UPDATE SET sort_no = EXCLUDED.sort_no;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'industries', id, 'ko', 'name', '소프트웨어·플랫폼' FROM industries WHERE code = 'SW'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO industries (code, sort_no) VALUES ('AI', 12) ON CONFLICT (code) DO UPDATE SET sort_no = EXCLUDED.sort_no;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'industries', id, 'ko', 'name', 'AI·데이터' FROM industries WHERE code = 'AI'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO industries (code, sort_no) VALUES ('MED', 13) ON CONFLICT (code) DO UPDATE SET sort_no = EXCLUDED.sort_no;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'industries', id, 'ko', 'name', '의료기기·바이오' FROM industries WHERE code = 'MED'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO industries (code, sort_no) VALUES ('SHIP', 14) ON CONFLICT (code) DO UPDATE SET sort_no = EXCLUDED.sort_no;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'industries', id, 'ko', 'name', '조선·해양' FROM industries WHERE code = 'SHIP'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO industries (code, sort_no) VALUES ('CONST', 15) ON CONFLICT (code) DO UPDATE SET sort_no = EXCLUDED.sort_no;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'industries', id, 'ko', 'name', '건설·플랜트' FROM industries WHERE code = 'CONST'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;

-- 증거 출처
INSERT INTO evidence_sources (code, max_point, reliability, needs_proof) VALUES ('COURSE', 2, 0.95, false)
  ON CONFLICT (code) DO UPDATE SET max_point = EXCLUDED.max_point, reliability = EXCLUDED.reliability, needs_proof = EXCLUDED.needs_proof;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'evidence_sources', id, 'ko', 'name', '이수 과목' FROM evidence_sources WHERE code = 'COURSE'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO evidence_sources (code, max_point, reliability, needs_proof) VALUES ('PROJECT', 2.5, 0.8, true)
  ON CONFLICT (code) DO UPDATE SET max_point = EXCLUDED.max_point, reliability = EXCLUDED.reliability, needs_proof = EXCLUDED.needs_proof;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'evidence_sources', id, 'ko', 'name', '프로젝트' FROM evidence_sources WHERE code = 'PROJECT'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO evidence_sources (code, max_point, reliability, needs_proof) VALUES ('CERT', 2.5, 1, true)
  ON CONFLICT (code) DO UPDATE SET max_point = EXCLUDED.max_point, reliability = EXCLUDED.reliability, needs_proof = EXCLUDED.needs_proof;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'evidence_sources', id, 'ko', 'name', '자격증' FROM evidence_sources WHERE code = 'CERT'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO evidence_sources (code, max_point, reliability, needs_proof) VALUES ('INTERN', 2.5, 0.85, true)
  ON CONFLICT (code) DO UPDATE SET max_point = EXCLUDED.max_point, reliability = EXCLUDED.reliability, needs_proof = EXCLUDED.needs_proof;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'evidence_sources', id, 'ko', 'name', '인턴·현장실습' FROM evidence_sources WHERE code = 'INTERN'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO evidence_sources (code, max_point, reliability, needs_proof) VALUES ('SOFTWARE', 1.5, 0.6, false)
  ON CONFLICT (code) DO UPDATE SET max_point = EXCLUDED.max_point, reliability = EXCLUDED.reliability, needs_proof = EXCLUDED.needs_proof;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'evidence_sources', id, 'ko', 'name', '소프트웨어 사용' FROM evidence_sources WHERE code = 'SOFTWARE'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO evidence_sources (code, max_point, reliability, needs_proof) VALUES ('SELF', 1.5, 0.5, false)
  ON CONFLICT (code) DO UPDATE SET max_point = EXCLUDED.max_point, reliability = EXCLUDED.reliability, needs_proof = EXCLUDED.needs_proof;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'evidence_sources', id, 'ko', 'name', '검사 내 자기평가' FROM evidence_sources WHERE code = 'SELF'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO evidence_sources (code, max_point, reliability, needs_proof) VALUES ('AWARD', 1.5, 0.9, true)
  ON CONFLICT (code) DO UPDATE SET max_point = EXCLUDED.max_point, reliability = EXCLUDED.reliability, needs_proof = EXCLUDED.needs_proof;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'evidence_sources', id, 'ko', 'name', '공모전·수상' FROM evidence_sources WHERE code = 'AWARD'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO evidence_sources (code, max_point, reliability, needs_proof) VALUES ('NCS_UNIT', 2, 0.95, true)
  ON CONFLICT (code) DO UPDATE SET max_point = EXCLUDED.max_point, reliability = EXCLUDED.reliability, needs_proof = EXCLUDED.needs_proof;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'evidence_sources', id, 'ko', 'name', 'NCS 능력단위 이수' FROM evidence_sources WHERE code = 'NCS_UNIT'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;

-- 트랙별 채점 프로파일
INSERT INTO scoring_profiles (track_code, goal_code, w_aptitude, w_skill, w_preference, w_coursework, display_mode, top_n)
  VALUES ('HS', 'univ', 0.6, 0.1, 0.3, 0, 'band', 3)
  ON CONFLICT (track_code, goal_code) DO UPDATE SET w_aptitude = EXCLUDED.w_aptitude, w_skill = EXCLUDED.w_skill,
    w_preference = EXCLUDED.w_preference, w_coursework = EXCLUDED.w_coursework,
    display_mode = EXCLUDED.display_mode, top_n = EXCLUDED.top_n;
INSERT INTO scoring_profiles (track_code, goal_code, w_aptitude, w_skill, w_preference, w_coursework, display_mode, top_n)
  VALUES ('HS', 'job', 0.4, 0.3, 0.2, 0.1, 'band', 5)
  ON CONFLICT (track_code, goal_code) DO UPDATE SET w_aptitude = EXCLUDED.w_aptitude, w_skill = EXCLUDED.w_skill,
    w_preference = EXCLUDED.w_preference, w_coursework = EXCLUDED.w_coursework,
    display_mode = EXCLUDED.display_mode, top_n = EXCLUDED.top_n;
INSERT INTO scoring_profiles (track_code, goal_code, w_aptitude, w_skill, w_preference, w_coursework, display_mode, top_n)
  VALUES ('UNIV_LOW', 'any', 0.45, 0.25, 0.2, 0.1, 'score', 6)
  ON CONFLICT (track_code, goal_code) DO UPDATE SET w_aptitude = EXCLUDED.w_aptitude, w_skill = EXCLUDED.w_skill,
    w_preference = EXCLUDED.w_preference, w_coursework = EXCLUDED.w_coursework,
    display_mode = EXCLUDED.display_mode, top_n = EXCLUDED.top_n;
INSERT INTO scoring_profiles (track_code, goal_code, w_aptitude, w_skill, w_preference, w_coursework, display_mode, top_n)
  VALUES ('UNIV_HIGH', 'any', 0.3, 0.4, 0.15, 0.15, 'score', 8)
  ON CONFLICT (track_code, goal_code) DO UPDATE SET w_aptitude = EXCLUDED.w_aptitude, w_skill = EXCLUDED.w_skill,
    w_preference = EXCLUDED.w_preference, w_coursework = EXCLUDED.w_coursework,
    display_mode = EXCLUDED.display_mode, top_n = EXCLUDED.top_n;
INSERT INTO scoring_profiles (track_code, goal_code, w_aptitude, w_skill, w_preference, w_coursework, display_mode, top_n)
  VALUES ('GRAD', 'any', 0.25, 0.45, 0.15, 0.15, 'score', 8)
  ON CONFLICT (track_code, goal_code) DO UPDATE SET w_aptitude = EXCLUDED.w_aptitude, w_skill = EXCLUDED.w_skill,
    w_preference = EXCLUDED.w_preference, w_coursework = EXCLUDED.w_coursework,
    display_mode = EXCLUDED.display_mode, top_n = EXCLUDED.top_n;

-- 전공
INSERT INTO majors (code) VALUES ('ME') ON CONFLICT (code) DO NOTHING;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'majors', id, 'ko', 'name', '기계공학' FROM majors WHERE code = 'ME'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO majors (code) VALUES ('EE') ON CONFLICT (code) DO NOTHING;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'majors', id, 'ko', 'name', '전기·전자공학' FROM majors WHERE code = 'EE'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO majors (code) VALUES ('CE') ON CONFLICT (code) DO NOTHING;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'majors', id, 'ko', 'name', '컴퓨터공학' FROM majors WHERE code = 'CE'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO majors (code) VALUES ('CHE') ON CONFLICT (code) DO NOTHING;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'majors', id, 'ko', 'name', '화학공학' FROM majors WHERE code = 'CHE'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO majors (code) VALUES ('MSE') ON CONFLICT (code) DO NOTHING;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'majors', id, 'ko', 'name', '신소재공학' FROM majors WHERE code = 'MSE'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO majors (code) VALUES ('IE') ON CONFLICT (code) DO NOTHING;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'majors', id, 'ko', 'name', '산업공학' FROM majors WHERE code = 'IE'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO majors (code) VALUES ('CIV') ON CONFLICT (code) DO NOTHING;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'majors', id, 'ko', 'name', '건설·환경공학' FROM majors WHERE code = 'CIV'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO majors (code) VALUES ('BME') ON CONFLICT (code) DO NOTHING;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'majors', id, 'ko', 'name', '바이오·의공학' FROM majors WHERE code = 'BME'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;

-- 고교 전공적합 가중치
INSERT INTO major_fit_weights (major_id, axis_code, weight)
  SELECT id, 'DESIGN', 0.26 FROM majors WHERE code = 'ME'
  ON CONFLICT (major_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO major_fit_weights (major_id, axis_code, weight)
  SELECT id, 'ANALYZE', 0.22 FROM majors WHERE code = 'ME'
  ON CONFLICT (major_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO major_fit_weights (major_id, axis_code, weight)
  SELECT id, 'BUILD', 0.2 FROM majors WHERE code = 'ME'
  ON CONFLICT (major_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO major_fit_weights (major_id, axis_code, weight)
  SELECT id, 'FIELD', 0.12 FROM majors WHERE code = 'ME'
  ON CONFLICT (major_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO major_fit_weights (major_id, axis_code, weight)
  SELECT id, 'OPTIMIZE', 0.1 FROM majors WHERE code = 'ME'
  ON CONFLICT (major_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO major_fit_weights (major_id, axis_code, weight)
  SELECT id, 'RESEARCH', 0.06 FROM majors WHERE code = 'ME'
  ON CONFLICT (major_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO major_fit_weights (major_id, axis_code, weight)
  SELECT id, 'CODE', 0.04 FROM majors WHERE code = 'ME'
  ON CONFLICT (major_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO major_fit_weights (major_id, axis_code, weight)
  SELECT id, 'ANALYZE', 0.24 FROM majors WHERE code = 'EE'
  ON CONFLICT (major_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO major_fit_weights (major_id, axis_code, weight)
  SELECT id, 'BUILD', 0.2 FROM majors WHERE code = 'EE'
  ON CONFLICT (major_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO major_fit_weights (major_id, axis_code, weight)
  SELECT id, 'DESIGN', 0.18 FROM majors WHERE code = 'EE'
  ON CONFLICT (major_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO major_fit_weights (major_id, axis_code, weight)
  SELECT id, 'RESEARCH', 0.14 FROM majors WHERE code = 'EE'
  ON CONFLICT (major_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO major_fit_weights (major_id, axis_code, weight)
  SELECT id, 'CODE', 0.14 FROM majors WHERE code = 'EE'
  ON CONFLICT (major_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO major_fit_weights (major_id, axis_code, weight)
  SELECT id, 'FIELD', 0.1 FROM majors WHERE code = 'EE'
  ON CONFLICT (major_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO major_fit_weights (major_id, axis_code, weight)
  SELECT id, 'CODE', 0.38 FROM majors WHERE code = 'CE'
  ON CONFLICT (major_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO major_fit_weights (major_id, axis_code, weight)
  SELECT id, 'ANALYZE', 0.2 FROM majors WHERE code = 'CE'
  ON CONFLICT (major_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO major_fit_weights (major_id, axis_code, weight)
  SELECT id, 'DESIGN', 0.16 FROM majors WHERE code = 'CE'
  ON CONFLICT (major_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO major_fit_weights (major_id, axis_code, weight)
  SELECT id, 'OPTIMIZE', 0.14 FROM majors WHERE code = 'CE'
  ON CONFLICT (major_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO major_fit_weights (major_id, axis_code, weight)
  SELECT id, 'RESEARCH', 0.08 FROM majors WHERE code = 'CE'
  ON CONFLICT (major_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO major_fit_weights (major_id, axis_code, weight)
  SELECT id, 'BUILD', 0.04 FROM majors WHERE code = 'CE'
  ON CONFLICT (major_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO major_fit_weights (major_id, axis_code, weight)
  SELECT id, 'ANALYZE', 0.26 FROM majors WHERE code = 'CHE'
  ON CONFLICT (major_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO major_fit_weights (major_id, axis_code, weight)
  SELECT id, 'RESEARCH', 0.22 FROM majors WHERE code = 'CHE'
  ON CONFLICT (major_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO major_fit_weights (major_id, axis_code, weight)
  SELECT id, 'FIELD', 0.2 FROM majors WHERE code = 'CHE'
  ON CONFLICT (major_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO major_fit_weights (major_id, axis_code, weight)
  SELECT id, 'OPTIMIZE', 0.16 FROM majors WHERE code = 'CHE'
  ON CONFLICT (major_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO major_fit_weights (major_id, axis_code, weight)
  SELECT id, 'BUILD', 0.1 FROM majors WHERE code = 'CHE'
  ON CONFLICT (major_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO major_fit_weights (major_id, axis_code, weight)
  SELECT id, 'DESIGN', 0.06 FROM majors WHERE code = 'CHE'
  ON CONFLICT (major_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO major_fit_weights (major_id, axis_code, weight)
  SELECT id, 'RESEARCH', 0.3 FROM majors WHERE code = 'MSE'
  ON CONFLICT (major_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO major_fit_weights (major_id, axis_code, weight)
  SELECT id, 'BUILD', 0.24 FROM majors WHERE code = 'MSE'
  ON CONFLICT (major_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO major_fit_weights (major_id, axis_code, weight)
  SELECT id, 'ANALYZE', 0.22 FROM majors WHERE code = 'MSE'
  ON CONFLICT (major_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO major_fit_weights (major_id, axis_code, weight)
  SELECT id, 'OPTIMIZE', 0.12 FROM majors WHERE code = 'MSE'
  ON CONFLICT (major_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO major_fit_weights (major_id, axis_code, weight)
  SELECT id, 'FIELD', 0.08 FROM majors WHERE code = 'MSE'
  ON CONFLICT (major_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO major_fit_weights (major_id, axis_code, weight)
  SELECT id, 'DESIGN', 0.04 FROM majors WHERE code = 'MSE'
  ON CONFLICT (major_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO major_fit_weights (major_id, axis_code, weight)
  SELECT id, 'OPTIMIZE', 0.3 FROM majors WHERE code = 'IE'
  ON CONFLICT (major_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO major_fit_weights (major_id, axis_code, weight)
  SELECT id, 'ORCHESTRATE', 0.24 FROM majors WHERE code = 'IE'
  ON CONFLICT (major_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO major_fit_weights (major_id, axis_code, weight)
  SELECT id, 'ANALYZE', 0.2 FROM majors WHERE code = 'IE'
  ON CONFLICT (major_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO major_fit_weights (major_id, axis_code, weight)
  SELECT id, 'CODE', 0.12 FROM majors WHERE code = 'IE'
  ON CONFLICT (major_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO major_fit_weights (major_id, axis_code, weight)
  SELECT id, 'FIELD', 0.1 FROM majors WHERE code = 'IE'
  ON CONFLICT (major_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO major_fit_weights (major_id, axis_code, weight)
  SELECT id, 'DESIGN', 0.04 FROM majors WHERE code = 'IE'
  ON CONFLICT (major_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO major_fit_weights (major_id, axis_code, weight)
  SELECT id, 'FIELD', 0.3 FROM majors WHERE code = 'CIV'
  ON CONFLICT (major_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO major_fit_weights (major_id, axis_code, weight)
  SELECT id, 'DESIGN', 0.24 FROM majors WHERE code = 'CIV'
  ON CONFLICT (major_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO major_fit_weights (major_id, axis_code, weight)
  SELECT id, 'ANALYZE', 0.2 FROM majors WHERE code = 'CIV'
  ON CONFLICT (major_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO major_fit_weights (major_id, axis_code, weight)
  SELECT id, 'ORCHESTRATE', 0.16 FROM majors WHERE code = 'CIV'
  ON CONFLICT (major_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO major_fit_weights (major_id, axis_code, weight)
  SELECT id, 'OPTIMIZE', 0.1 FROM majors WHERE code = 'CIV'
  ON CONFLICT (major_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO major_fit_weights (major_id, axis_code, weight)
  SELECT id, 'RESEARCH', 0.3 FROM majors WHERE code = 'BME'
  ON CONFLICT (major_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO major_fit_weights (major_id, axis_code, weight)
  SELECT id, 'ANALYZE', 0.22 FROM majors WHERE code = 'BME'
  ON CONFLICT (major_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO major_fit_weights (major_id, axis_code, weight)
  SELECT id, 'BUILD', 0.2 FROM majors WHERE code = 'BME'
  ON CONFLICT (major_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO major_fit_weights (major_id, axis_code, weight)
  SELECT id, 'DESIGN', 0.14 FROM majors WHERE code = 'BME'
  ON CONFLICT (major_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO major_fit_weights (major_id, axis_code, weight)
  SELECT id, 'CODE', 0.14 FROM majors WHERE code = 'BME'
  ON CONFLICT (major_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;

-- ======== ME 기계공학 ========
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('ME.MATH', 'theory', 'L1', (SELECT id FROM majors WHERE code = 'ME'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '공학수학·미적분' FROM competencies WHERE code = 'ME.MATH'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Engineering Mathematics' FROM competencies WHERE code = 'ME.MATH'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('공학수학·미적분') FROM competencies WHERE code = 'ME.MATH'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Engineering Mathematics') FROM competencies WHERE code = 'ME.MATH'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('미분방정식') FROM competencies WHERE code = 'ME.MATH'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('선형대수') FROM competencies WHERE code = 'ME.MATH'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Calculus') FROM competencies WHERE code = 'ME.MATH'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('ME.PHYS', 'theory', 'L1', (SELECT id FROM majors WHERE code = 'ME'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '일반물리' FROM competencies WHERE code = 'ME.PHYS'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Physics' FROM competencies WHERE code = 'ME.PHYS'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('일반물리') FROM competencies WHERE code = 'ME.PHYS'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Physics') FROM competencies WHERE code = 'ME.PHYS'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('역학') FROM competencies WHERE code = 'ME.PHYS'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('전자기') FROM competencies WHERE code = 'ME.PHYS'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('ME.STAT', 'theory', 'L1', (SELECT id FROM majors WHERE code = 'ME'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '확률·통계' FROM competencies WHERE code = 'ME.STAT'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Probability & Statistics' FROM competencies WHERE code = 'ME.STAT'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('확률·통계') FROM competencies WHERE code = 'ME.STAT'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Probability & Statistics') FROM competencies WHERE code = 'ME.STAT'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('통계학') FROM competencies WHERE code = 'ME.STAT'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('DOE') FROM competencies WHERE code = 'ME.STAT'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('ME.THERMO', 'theory', 'L2', (SELECT id FROM majors WHERE code = 'ME'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '열역학' FROM competencies WHERE code = 'ME.THERMO'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Thermodynamics' FROM competencies WHERE code = 'ME.THERMO'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('열역학') FROM competencies WHERE code = 'ME.THERMO'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Thermodynamics') FROM competencies WHERE code = 'ME.THERMO'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Thermodynamics') FROM competencies WHERE code = 'ME.THERMO'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('ME.FLUID', 'theory', 'L2', (SELECT id FROM majors WHERE code = 'ME'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '유체역학' FROM competencies WHERE code = 'ME.FLUID'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Fluid Mechanics' FROM competencies WHERE code = 'ME.FLUID'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('유체역학') FROM competencies WHERE code = 'ME.FLUID'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Fluid Mechanics') FROM competencies WHERE code = 'ME.FLUID'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('유체') FROM competencies WHERE code = 'ME.FLUID'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Fluid') FROM competencies WHERE code = 'ME.FLUID'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('ME.SOLID', 'theory', 'L2', (SELECT id FROM majors WHERE code = 'ME'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '고체역학' FROM competencies WHERE code = 'ME.SOLID'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Solid Mechanics' FROM competencies WHERE code = 'ME.SOLID'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('고체역학') FROM competencies WHERE code = 'ME.SOLID'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Solid Mechanics') FROM competencies WHERE code = 'ME.SOLID'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('재료역학') FROM competencies WHERE code = 'ME.SOLID'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Mechanics of Materials') FROM competencies WHERE code = 'ME.SOLID'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('ME.DYN', 'theory', 'L2', (SELECT id FROM majors WHERE code = 'ME'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '동역학' FROM competencies WHERE code = 'ME.DYN'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Dynamics' FROM competencies WHERE code = 'ME.DYN'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('동역학') FROM competencies WHERE code = 'ME.DYN'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Dynamics') FROM competencies WHERE code = 'ME.DYN'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Dynamics') FROM competencies WHERE code = 'ME.DYN'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('ME.HEAT', 'theory', 'L2', (SELECT id FROM majors WHERE code = 'ME'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '열전달' FROM competencies WHERE code = 'ME.HEAT'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Heat Transfer' FROM competencies WHERE code = 'ME.HEAT'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('열전달') FROM competencies WHERE code = 'ME.HEAT'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Heat Transfer') FROM competencies WHERE code = 'ME.HEAT'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Heat Transfer') FROM competencies WHERE code = 'ME.HEAT'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('ME.VIB', 'theory', 'L2', (SELECT id FROM majors WHERE code = 'ME'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '기계진동' FROM competencies WHERE code = 'ME.VIB'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Mechanical Vibration' FROM competencies WHERE code = 'ME.VIB'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('기계진동') FROM competencies WHERE code = 'ME.VIB'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Mechanical Vibration') FROM competencies WHERE code = 'ME.VIB'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Vibration') FROM competencies WHERE code = 'ME.VIB'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('NVH') FROM competencies WHERE code = 'ME.VIB'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('ME.DESIGN', 'theory', 'L2', (SELECT id FROM majors WHERE code = 'ME'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '기계설계' FROM competencies WHERE code = 'ME.DESIGN'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Machine Design' FROM competencies WHERE code = 'ME.DESIGN'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('기계설계') FROM competencies WHERE code = 'ME.DESIGN'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Machine Design') FROM competencies WHERE code = 'ME.DESIGN'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('기계요소설계') FROM competencies WHERE code = 'ME.DESIGN'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('ME.ELEM', 'theory', 'L2', (SELECT id FROM majors WHERE code = 'ME'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '기계요소' FROM competencies WHERE code = 'ME.ELEM'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Machine Elements' FROM competencies WHERE code = 'ME.ELEM'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('기계요소') FROM competencies WHERE code = 'ME.ELEM'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Machine Elements') FROM competencies WHERE code = 'ME.ELEM'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('베어링') FROM competencies WHERE code = 'ME.ELEM'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('기어') FROM competencies WHERE code = 'ME.ELEM'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('체결') FROM competencies WHERE code = 'ME.ELEM'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('ME.MATL', 'theory', 'L2', (SELECT id FROM majors WHERE code = 'ME'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '기계재료' FROM competencies WHERE code = 'ME.MATL'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Engineering Materials' FROM competencies WHERE code = 'ME.MATL'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('기계재료') FROM competencies WHERE code = 'ME.MATL'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Engineering Materials') FROM competencies WHERE code = 'ME.MATL'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('재료공학') FROM competencies WHERE code = 'ME.MATL'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('열처리') FROM competencies WHERE code = 'ME.MATL'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('ME.MFG', 'theory', 'L2', (SELECT id FROM majors WHERE code = 'ME'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '생산가공' FROM competencies WHERE code = 'ME.MFG'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Manufacturing Processes' FROM competencies WHERE code = 'ME.MFG'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('생산가공') FROM competencies WHERE code = 'ME.MFG'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Manufacturing Processes') FROM competencies WHERE code = 'ME.MFG'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('절삭') FROM competencies WHERE code = 'ME.MFG'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('소성가공') FROM competencies WHERE code = 'ME.MFG'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('주조') FROM competencies WHERE code = 'ME.MFG'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('ME.CTRL', 'theory', 'L2', (SELECT id FROM majors WHERE code = 'ME'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '자동제어' FROM competencies WHERE code = 'ME.CTRL'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Control Engineering' FROM competencies WHERE code = 'ME.CTRL'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('자동제어') FROM competencies WHERE code = 'ME.CTRL'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Control Engineering') FROM competencies WHERE code = 'ME.CTRL'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('제어공학') FROM competencies WHERE code = 'ME.CTRL'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('PID') FROM competencies WHERE code = 'ME.CTRL'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('ME.FEM', 'theory', 'L2', (SELECT id FROM majors WHERE code = 'ME'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '유한요소법' FROM competencies WHERE code = 'ME.FEM'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Finite Element Method' FROM competencies WHERE code = 'ME.FEM'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('유한요소법') FROM competencies WHERE code = 'ME.FEM'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Finite Element Method') FROM competencies WHERE code = 'ME.FEM'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('FEM') FROM competencies WHERE code = 'ME.FEM'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('FEA 이론') FROM competencies WHERE code = 'ME.FEM'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('ME.CFDT', 'theory', 'L2', (SELECT id FROM majors WHERE code = 'ME'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '전산유체 이론' FROM competencies WHERE code = 'ME.CFDT'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'CFD Theory' FROM competencies WHERE code = 'ME.CFDT'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('전산유체 이론') FROM competencies WHERE code = 'ME.CFDT'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('CFD Theory') FROM competencies WHERE code = 'ME.CFDT'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('수치해석') FROM competencies WHERE code = 'ME.CFDT'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('난류모델') FROM competencies WHERE code = 'ME.CFDT'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('ME.GDT', 'theory', 'L2', (SELECT id FROM majors WHERE code = 'ME'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '공차·GD&T' FROM competencies WHERE code = 'ME.GDT'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'GD&T' FROM competencies WHERE code = 'ME.GDT'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('공차·GD&T') FROM competencies WHERE code = 'ME.GDT'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('GD&T') FROM competencies WHERE code = 'ME.GDT'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('기하공차') FROM competencies WHERE code = 'ME.GDT'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('치수공차') FROM competencies WHERE code = 'ME.GDT'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Tolerance') FROM competencies WHERE code = 'ME.GDT'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('ME.HYD', 'theory', 'L2', (SELECT id FROM majors WHERE code = 'ME'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '유공압' FROM competencies WHERE code = 'ME.HYD'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Hydraulics & Pneumatics' FROM competencies WHERE code = 'ME.HYD'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('유공압') FROM competencies WHERE code = 'ME.HYD'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Hydraulics & Pneumatics') FROM competencies WHERE code = 'ME.HYD'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('유압') FROM competencies WHERE code = 'ME.HYD'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('공압') FROM competencies WHERE code = 'ME.HYD'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('ME.COMB', 'theory', 'L2', (SELECT id FROM majors WHERE code = 'ME'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '연소·내연기관' FROM competencies WHERE code = 'ME.COMB'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Combustion' FROM competencies WHERE code = 'ME.COMB'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('연소·내연기관') FROM competencies WHERE code = 'ME.COMB'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Combustion') FROM competencies WHERE code = 'ME.COMB'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('엔진') FROM competencies WHERE code = 'ME.COMB'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Combustion') FROM competencies WHERE code = 'ME.COMB'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('ME.ROBOT', 'theory', 'L2', (SELECT id FROM majors WHERE code = 'ME'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '로봇공학' FROM competencies WHERE code = 'ME.ROBOT'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Robotics' FROM competencies WHERE code = 'ME.ROBOT'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('로봇공학') FROM competencies WHERE code = 'ME.ROBOT'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Robotics') FROM competencies WHERE code = 'ME.ROBOT'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('기구학') FROM competencies WHERE code = 'ME.ROBOT'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Kinematics') FROM competencies WHERE code = 'ME.ROBOT'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('ME.MECHA', 'theory', 'L2', (SELECT id FROM majors WHERE code = 'ME'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '메카트로닉스' FROM competencies WHERE code = 'ME.MECHA'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Mechatronics' FROM competencies WHERE code = 'ME.MECHA'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('메카트로닉스') FROM competencies WHERE code = 'ME.MECHA'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Mechatronics') FROM competencies WHERE code = 'ME.MECHA'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('센서·액추에이터') FROM competencies WHERE code = 'ME.MECHA'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('ME.RELIAB', 'theory', 'L2', (SELECT id FROM majors WHERE code = 'ME'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '신뢰성공학' FROM competencies WHERE code = 'ME.RELIAB'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Reliability Engineering' FROM competencies WHERE code = 'ME.RELIAB'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('신뢰성공학') FROM competencies WHERE code = 'ME.RELIAB'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Reliability Engineering') FROM competencies WHERE code = 'ME.RELIAB'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('수명예측') FROM competencies WHERE code = 'ME.RELIAB'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('FMEA') FROM competencies WHERE code = 'ME.RELIAB'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('SW.SOLIDWORKS', 'software', 'L3', (SELECT id FROM majors WHERE code = 'ME'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', 'SolidWorks' FROM competencies WHERE code = 'SW.SOLIDWORKS'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'SolidWorks' FROM competencies WHERE code = 'SW.SOLIDWORKS'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('SolidWorks') FROM competencies WHERE code = 'SW.SOLIDWORKS'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('SolidWorks') FROM competencies WHERE code = 'SW.SOLIDWORKS'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('솔리드웍스') FROM competencies WHERE code = 'SW.SOLIDWORKS'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('SW') FROM competencies WHERE code = 'SW.SOLIDWORKS'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('SW.CATIA', 'software', 'L3', (SELECT id FROM majors WHERE code = 'ME'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', 'CATIA' FROM competencies WHERE code = 'SW.CATIA'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'CATIA' FROM competencies WHERE code = 'SW.CATIA'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('CATIA') FROM competencies WHERE code = 'SW.CATIA'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('CATIA') FROM competencies WHERE code = 'SW.CATIA'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('카티아') FROM competencies WHERE code = 'SW.CATIA'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('SW.NX', 'software', 'L3', (SELECT id FROM majors WHERE code = 'ME'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', 'Siemens NX' FROM competencies WHERE code = 'SW.NX'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'NX' FROM competencies WHERE code = 'SW.NX'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Siemens NX') FROM competencies WHERE code = 'SW.NX'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('NX') FROM competencies WHERE code = 'SW.NX'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('UG') FROM competencies WHERE code = 'SW.NX'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('유지그래픽스') FROM competencies WHERE code = 'SW.NX'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('SW.CREO', 'software', 'L3', (SELECT id FROM majors WHERE code = 'ME'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', 'Creo' FROM competencies WHERE code = 'SW.CREO'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Creo' FROM competencies WHERE code = 'SW.CREO'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Creo') FROM competencies WHERE code = 'SW.CREO'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Creo') FROM competencies WHERE code = 'SW.CREO'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Pro/E') FROM competencies WHERE code = 'SW.CREO'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('SW.AUTOCAD', 'software', 'L3', (SELECT id FROM majors WHERE code = 'ME'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', 'AutoCAD' FROM competencies WHERE code = 'SW.AUTOCAD'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'AutoCAD' FROM competencies WHERE code = 'SW.AUTOCAD'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('AutoCAD') FROM competencies WHERE code = 'SW.AUTOCAD'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('AutoCAD') FROM competencies WHERE code = 'SW.AUTOCAD'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('오토캐드') FROM competencies WHERE code = 'SW.AUTOCAD'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('2D 도면') FROM competencies WHERE code = 'SW.AUTOCAD'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('SW.ANSYS_MECH', 'software', 'L3', (SELECT id FROM majors WHERE code = 'ME'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', 'ANSYS Mechanical' FROM competencies WHERE code = 'SW.ANSYS_MECH'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'ANSYS Mechanical' FROM competencies WHERE code = 'SW.ANSYS_MECH'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('ANSYS Mechanical') FROM competencies WHERE code = 'SW.ANSYS_MECH'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('ANSYS Mechanical') FROM competencies WHERE code = 'SW.ANSYS_MECH'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('앤시스') FROM competencies WHERE code = 'SW.ANSYS_MECH'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('구조해석') FROM competencies WHERE code = 'SW.ANSYS_MECH'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('SW.ABAQUS', 'software', 'L3', (SELECT id FROM majors WHERE code = 'ME'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', 'ABAQUS' FROM competencies WHERE code = 'SW.ABAQUS'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'ABAQUS' FROM competencies WHERE code = 'SW.ABAQUS'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('ABAQUS') FROM competencies WHERE code = 'SW.ABAQUS'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('ABAQUS') FROM competencies WHERE code = 'SW.ABAQUS'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('아바쿠스') FROM competencies WHERE code = 'SW.ABAQUS'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('비선형해석') FROM competencies WHERE code = 'SW.ABAQUS'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('SW.FLUENT', 'software', 'L3', (SELECT id FROM majors WHERE code = 'ME'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', 'ANSYS Fluent' FROM competencies WHERE code = 'SW.FLUENT'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Fluent' FROM competencies WHERE code = 'SW.FLUENT'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('ANSYS Fluent') FROM competencies WHERE code = 'SW.FLUENT'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Fluent') FROM competencies WHERE code = 'SW.FLUENT'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('CFX') FROM competencies WHERE code = 'SW.FLUENT'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('StarCCM+') FROM competencies WHERE code = 'SW.FLUENT'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('유동해석') FROM competencies WHERE code = 'SW.FLUENT'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('SW.MATLAB', 'software', 'L3', (SELECT id FROM majors WHERE code = 'ME'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', 'MATLAB' FROM competencies WHERE code = 'SW.MATLAB'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'MATLAB' FROM competencies WHERE code = 'SW.MATLAB'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('MATLAB') FROM competencies WHERE code = 'SW.MATLAB'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('MATLAB') FROM competencies WHERE code = 'SW.MATLAB'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('매트랩') FROM competencies WHERE code = 'SW.MATLAB'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('SW.SIMULINK', 'software', 'L3', (SELECT id FROM majors WHERE code = 'ME'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', 'Simulink' FROM competencies WHERE code = 'SW.SIMULINK'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Simulink' FROM competencies WHERE code = 'SW.SIMULINK'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Simulink') FROM competencies WHERE code = 'SW.SIMULINK'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Simulink') FROM competencies WHERE code = 'SW.SIMULINK'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('모델기반설계') FROM competencies WHERE code = 'SW.SIMULINK'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('MBD') FROM competencies WHERE code = 'SW.SIMULINK'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('SW.PYTHON', 'software', 'L3', (SELECT id FROM majors WHERE code = 'ME'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', 'Python' FROM competencies WHERE code = 'SW.PYTHON'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Python' FROM competencies WHERE code = 'SW.PYTHON'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Python') FROM competencies WHERE code = 'SW.PYTHON'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Python') FROM competencies WHERE code = 'SW.PYTHON'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('파이썬') FROM competencies WHERE code = 'SW.PYTHON'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('SW.CAM', 'software', 'L3', (SELECT id FROM majors WHERE code = 'ME'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', 'CAM·NC 프로그래밍' FROM competencies WHERE code = 'SW.CAM'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'CAM' FROM competencies WHERE code = 'SW.CAM'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('CAM·NC 프로그래밍') FROM competencies WHERE code = 'SW.CAM'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('CAM') FROM competencies WHERE code = 'SW.CAM'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('MasterCAM') FROM competencies WHERE code = 'SW.CAM'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('G코드') FROM competencies WHERE code = 'SW.CAM'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('SW.PLC', 'software', 'L3', (SELECT id FROM majors WHERE code = 'ME'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', 'PLC 프로그래밍' FROM competencies WHERE code = 'SW.PLC'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'PLC' FROM competencies WHERE code = 'SW.PLC'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('PLC 프로그래밍') FROM competencies WHERE code = 'SW.PLC'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('PLC') FROM competencies WHERE code = 'SW.PLC'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('래더') FROM competencies WHERE code = 'SW.PLC'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('지멘스') FROM competencies WHERE code = 'SW.PLC'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('미쓰비시') FROM competencies WHERE code = 'SW.PLC'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('SW.MINITAB', 'software', 'L3', (SELECT id FROM majors WHERE code = 'ME'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', 'Minitab·통계도구' FROM competencies WHERE code = 'SW.MINITAB'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Minitab' FROM competencies WHERE code = 'SW.MINITAB'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('Minitab·통계도구') FROM competencies WHERE code = 'SW.MINITAB'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Minitab') FROM competencies WHERE code = 'SW.MINITAB'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('JMP') FROM competencies WHERE code = 'SW.MINITAB'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('6시그마 도구') FROM competencies WHERE code = 'SW.MINITAB'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('SW.PDM', 'software', 'L3', (SELECT id FROM majors WHERE code = 'ME'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', 'PDM·형상관리' FROM competencies WHERE code = 'SW.PDM'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'PDM/PLM' FROM competencies WHERE code = 'SW.PDM'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('PDM·형상관리') FROM competencies WHERE code = 'SW.PDM'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('PDM/PLM') FROM competencies WHERE code = 'SW.PDM'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Teamcenter') FROM competencies WHERE code = 'SW.PDM'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Windchill') FROM competencies WHERE code = 'SW.PDM'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('SW.3DPRINT', 'tool', 'L3', (SELECT id FROM majors WHERE code = 'ME'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '3D 프린팅·시작품' FROM competencies WHERE code = 'SW.3DPRINT'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Additive Manufacturing' FROM competencies WHERE code = 'SW.3DPRINT'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('3D 프린팅·시작품') FROM competencies WHERE code = 'SW.3DPRINT'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Additive Manufacturing') FROM competencies WHERE code = 'SW.3DPRINT'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('적층제조') FROM competencies WHERE code = 'SW.3DPRINT'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('쾌속조형') FROM competencies WHERE code = 'SW.3DPRINT'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('SW.MEASURE', 'tool', 'L3', (SELECT id FROM majors WHERE code = 'ME'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '계측·시험 장비' FROM competencies WHERE code = 'SW.MEASURE'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Measurement & Test' FROM competencies WHERE code = 'SW.MEASURE'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('계측·시험 장비') FROM competencies WHERE code = 'SW.MEASURE'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Measurement & Test') FROM competencies WHERE code = 'SW.MEASURE'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('3차원측정기') FROM competencies WHERE code = 'SW.MEASURE'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('만능시험기') FROM competencies WHERE code = 'SW.MEASURE'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('데이터로거') FROM competencies WHERE code = 'SW.MEASURE'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('DM.AUTO_PT', 'domain', 'L4', (SELECT id FROM majors WHERE code = 'ME'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '자동차 파워트레인·전동화' FROM competencies WHERE code = 'DM.AUTO_PT'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Powertrain' FROM competencies WHERE code = 'DM.AUTO_PT'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('자동차 파워트레인·전동화') FROM competencies WHERE code = 'DM.AUTO_PT'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Powertrain') FROM competencies WHERE code = 'DM.AUTO_PT'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('구동계') FROM competencies WHERE code = 'DM.AUTO_PT'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('감속기') FROM competencies WHERE code = 'DM.AUTO_PT'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('e-Axle') FROM competencies WHERE code = 'DM.AUTO_PT'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('DM.BATTPACK', 'domain', 'L4', (SELECT id FROM majors WHERE code = 'ME'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '배터리 팩·열관리' FROM competencies WHERE code = 'DM.BATTPACK'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Battery Pack' FROM competencies WHERE code = 'DM.BATTPACK'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('배터리 팩·열관리') FROM competencies WHERE code = 'DM.BATTPACK'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Battery Pack') FROM competencies WHERE code = 'DM.BATTPACK'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('BTMS') FROM competencies WHERE code = 'DM.BATTPACK'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('팩 구조') FROM competencies WHERE code = 'DM.BATTPACK'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('DM.AEROSTR', 'domain', 'L4', (SELECT id FROM majors WHERE code = 'ME'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '항공 구조·기체' FROM competencies WHERE code = 'DM.AEROSTR'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Aerostructures' FROM competencies WHERE code = 'DM.AEROSTR'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('항공 구조·기체') FROM competencies WHERE code = 'DM.AEROSTR'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Aerostructures') FROM competencies WHERE code = 'DM.AEROSTR'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('복합재 구조') FROM competencies WHERE code = 'DM.AEROSTR'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('피로해석') FROM competencies WHERE code = 'DM.AEROSTR'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('DM.SEMI_EQ', 'domain', 'L4', (SELECT id FROM majors WHERE code = 'ME'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '반도체·디스플레이 장비' FROM competencies WHERE code = 'DM.SEMI_EQ'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Semiconductor Equipment' FROM competencies WHERE code = 'DM.SEMI_EQ'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('반도체·디스플레이 장비') FROM competencies WHERE code = 'DM.SEMI_EQ'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Semiconductor Equipment') FROM competencies WHERE code = 'DM.SEMI_EQ'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('진공챔버') FROM competencies WHERE code = 'DM.SEMI_EQ'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('이송장치') FROM competencies WHERE code = 'DM.SEMI_EQ'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('DM.PLANT', 'domain', 'L4', (SELECT id FROM majors WHERE code = 'ME'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '플랜트·설비·HVAC' FROM competencies WHERE code = 'DM.PLANT'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Plant & HVAC' FROM competencies WHERE code = 'DM.PLANT'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('플랜트·설비·HVAC') FROM competencies WHERE code = 'DM.PLANT'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Plant & HVAC') FROM competencies WHERE code = 'DM.PLANT'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('배관') FROM competencies WHERE code = 'DM.PLANT'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('공조') FROM competencies WHERE code = 'DM.PLANT'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('열교환기') FROM competencies WHERE code = 'DM.PLANT'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('DM.MOLD', 'domain', 'L4', (SELECT id FROM majors WHERE code = 'ME'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '금형·사출' FROM competencies WHERE code = 'DM.MOLD'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Mold & Injection' FROM competencies WHERE code = 'DM.MOLD'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('금형·사출') FROM competencies WHERE code = 'DM.MOLD'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Mold & Injection') FROM competencies WHERE code = 'DM.MOLD'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('프레스금형') FROM competencies WHERE code = 'DM.MOLD'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('사출성형') FROM competencies WHERE code = 'DM.MOLD'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('CM.DOC', 'soft', 'L5', NULL)
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '기술문서 작성' FROM competencies WHERE code = 'CM.DOC'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Technical Writing' FROM competencies WHERE code = 'CM.DOC'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('기술문서 작성') FROM competencies WHERE code = 'CM.DOC'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Technical Writing') FROM competencies WHERE code = 'CM.DOC'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('보고서') FROM competencies WHERE code = 'CM.DOC'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('사양서') FROM competencies WHERE code = 'CM.DOC'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('CM.STD', 'soft', 'L5', NULL)
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '규격·안전 준수' FROM competencies WHERE code = 'CM.STD'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Standards & Safety' FROM competencies WHERE code = 'CM.STD'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('규격·안전 준수') FROM competencies WHERE code = 'CM.STD'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Standards & Safety') FROM competencies WHERE code = 'CM.STD'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('ISO') FROM competencies WHERE code = 'CM.STD'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('KS') FROM competencies WHERE code = 'CM.STD'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('산업안전') FROM competencies WHERE code = 'CM.STD'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('CM.ENG', 'soft', 'L5', NULL)
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '영문 기술 커뮤니케이션' FROM competencies WHERE code = 'CM.ENG'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Technical English' FROM competencies WHERE code = 'CM.ENG'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('영문 기술 커뮤니케이션') FROM competencies WHERE code = 'CM.ENG'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Technical English') FROM competencies WHERE code = 'CM.ENG'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('영어') FROM competencies WHERE code = 'CM.ENG'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('TOEIC') FROM competencies WHERE code = 'CM.ENG'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('해외대응') FROM competencies WHERE code = 'CM.ENG'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('CM.COLLAB', 'soft', 'L5', NULL)
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '협업·형상관리' FROM competencies WHERE code = 'CM.COLLAB'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Collaboration' FROM competencies WHERE code = 'CM.COLLAB'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('협업·형상관리') FROM competencies WHERE code = 'CM.COLLAB'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Collaboration') FROM competencies WHERE code = 'CM.COLLAB'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Git') FROM competencies WHERE code = 'CM.COLLAB'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Jira') FROM competencies WHERE code = 'CM.COLLAB'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('협업도구') FROM competencies WHERE code = 'CM.COLLAB'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO job_clusters (major_id, code, onet_code, sort_no)
  SELECT id, 'ME.MECH_DESIGN', '17-2141.00', 1 FROM majors WHERE code = 'ME'
  ON CONFLICT (major_id, code) DO UPDATE SET onet_code = EXCLUDED.onet_code, sort_no = EXCLUDED.sort_no;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'job_clusters', id, 'ko', 'name', '기계설계' FROM job_clusters WHERE code = 'ME.MECH_DESIGN'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'job_clusters', id, 'en', 'name', 'Mechanical Design Engineer' FROM job_clusters WHERE code = 'ME.MECH_DESIGN'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO job_industry_map (job_id, industry_id)
  SELECT j.id, i.id FROM job_clusters j, industries i WHERE j.code = 'ME.MECH_DESIGN' AND i.code = 'MACH'
  ON CONFLICT DO NOTHING;
INSERT INTO job_industry_map (job_id, industry_id)
  SELECT j.id, i.id FROM job_clusters j, industries i WHERE j.code = 'ME.MECH_DESIGN' AND i.code = 'AUTO'
  ON CONFLICT DO NOTHING;
INSERT INTO job_industry_map (job_id, industry_id)
  SELECT j.id, i.id FROM job_clusters j, industries i WHERE j.code = 'ME.MECH_DESIGN' AND i.code = 'SEMI'
  ON CONFLICT DO NOTHING;
INSERT INTO job_industry_map (job_id, industry_id)
  SELECT j.id, i.id FROM job_clusters j, industries i WHERE j.code = 'ME.MECH_DESIGN' AND i.code = 'ROBOT'
  ON CONFLICT DO NOTHING;
INSERT INTO job_cluster_tracks (job_id, track_code)
  SELECT id, 'UNIV_LOW' FROM job_clusters WHERE code = 'ME.MECH_DESIGN' ON CONFLICT DO NOTHING;
INSERT INTO job_cluster_tracks (job_id, track_code)
  SELECT id, 'UNIV_HIGH' FROM job_clusters WHERE code = 'ME.MECH_DESIGN' ON CONFLICT DO NOTHING;
INSERT INTO job_cluster_tracks (job_id, track_code)
  SELECT id, 'GRAD' FROM job_clusters WHERE code = 'ME.MECH_DESIGN' ON CONFLICT DO NOTHING;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'DESIGN', 0.34 FROM job_clusters WHERE code = 'ME.MECH_DESIGN'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'ANALYZE', 0.2 FROM job_clusters WHERE code = 'ME.MECH_DESIGN'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'BUILD', 0.16 FROM job_clusters WHERE code = 'ME.MECH_DESIGN'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'OPTIMIZE', 0.12 FROM job_clusters WHERE code = 'ME.MECH_DESIGN'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'FIELD', 0.1 FROM job_clusters WHERE code = 'ME.MECH_DESIGN'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'ORCHESTRATE', 0.08 FROM job_clusters WHERE code = 'ME.MECH_DESIGN'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'ME.MECH_DESIGN' AND c.code = 'SW.SOLIDWORKS'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'ME.MECH_DESIGN' AND c.code = 'ME.DESIGN'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'ME.MECH_DESIGN' AND c.code = 'ME.GDT'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'ME.MECH_DESIGN' AND c.code = 'ME.ELEM'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 3 FROM job_clusters j, competencies c WHERE j.code = 'ME.MECH_DESIGN' AND c.code = 'ME.SOLID'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'ME.MECH_DESIGN' AND c.code = 'ME.MATL'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'ME.MECH_DESIGN' AND c.code = 'SW.CATIA'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'ME.MECH_DESIGN' AND c.code = 'ME.MFG'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 2, 2 FROM job_clusters j, competencies c WHERE j.code = 'ME.MECH_DESIGN' AND c.code = 'SW.PDM'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 2, 1 FROM job_clusters j, competencies c WHERE j.code = 'ME.MECH_DESIGN' AND c.code = 'SW.ANSYS_MECH'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'ME.MECH_DESIGN' AND c.code = 'CM.DOC'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 2, 1 FROM job_clusters j, competencies c WHERE j.code = 'ME.MECH_DESIGN' AND c.code = 'CM.STD'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_clusters (major_id, code, onet_code, sort_no)
  SELECT id, 'ME.CAE', '17-2141.00', 2 FROM majors WHERE code = 'ME'
  ON CONFLICT (major_id, code) DO UPDATE SET onet_code = EXCLUDED.onet_code, sort_no = EXCLUDED.sort_no;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'job_clusters', id, 'ko', 'name', '구조·유동 해석 (CAE)' FROM job_clusters WHERE code = 'ME.CAE'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'job_clusters', id, 'en', 'name', 'CAE / Simulation Engineer' FROM job_clusters WHERE code = 'ME.CAE'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO job_industry_map (job_id, industry_id)
  SELECT j.id, i.id FROM job_clusters j, industries i WHERE j.code = 'ME.CAE' AND i.code = 'AUTO'
  ON CONFLICT DO NOTHING;
INSERT INTO job_industry_map (job_id, industry_id)
  SELECT j.id, i.id FROM job_clusters j, industries i WHERE j.code = 'ME.CAE' AND i.code = 'AERO'
  ON CONFLICT DO NOTHING;
INSERT INTO job_industry_map (job_id, industry_id)
  SELECT j.id, i.id FROM job_clusters j, industries i WHERE j.code = 'ME.CAE' AND i.code = 'BATT'
  ON CONFLICT DO NOTHING;
INSERT INTO job_industry_map (job_id, industry_id)
  SELECT j.id, i.id FROM job_clusters j, industries i WHERE j.code = 'ME.CAE' AND i.code = 'MACH'
  ON CONFLICT DO NOTHING;
INSERT INTO job_cluster_tracks (job_id, track_code)
  SELECT id, 'UNIV_HIGH' FROM job_clusters WHERE code = 'ME.CAE' ON CONFLICT DO NOTHING;
INSERT INTO job_cluster_tracks (job_id, track_code)
  SELECT id, 'GRAD' FROM job_clusters WHERE code = 'ME.CAE' ON CONFLICT DO NOTHING;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'ANALYZE', 0.4 FROM job_clusters WHERE code = 'ME.CAE'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'RESEARCH', 0.2 FROM job_clusters WHERE code = 'ME.CAE'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'DESIGN', 0.14 FROM job_clusters WHERE code = 'ME.CAE'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'CODE', 0.12 FROM job_clusters WHERE code = 'ME.CAE'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'OPTIMIZE', 0.1 FROM job_clusters WHERE code = 'ME.CAE'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'BUILD', 0.04 FROM job_clusters WHERE code = 'ME.CAE'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'ME.CAE' AND c.code = 'ME.FEM'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'ME.CAE' AND c.code = 'SW.ANSYS_MECH'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'ME.CAE' AND c.code = 'ME.SOLID'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'ME.CAE' AND c.code = 'ME.MATH'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'ME.CAE' AND c.code = 'SW.ABAQUS'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'ME.CAE' AND c.code = 'ME.FLUID'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'ME.CAE' AND c.code = 'SW.FLUENT'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'ME.CAE' AND c.code = 'ME.CFDT'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'ME.CAE' AND c.code = 'SW.PYTHON'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'ME.CAE' AND c.code = 'SW.MATLAB'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 2, 1 FROM job_clusters j, competencies c WHERE j.code = 'ME.CAE' AND c.code = 'ME.VIB'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'ME.CAE' AND c.code = 'CM.DOC'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_clusters (major_id, code, onet_code, sort_no)
  SELECT id, 'ME.MFG_ENG', '17-2112.00', 3 FROM majors WHERE code = 'ME'
  ON CONFLICT (major_id, code) DO UPDATE SET onet_code = EXCLUDED.onet_code, sort_no = EXCLUDED.sort_no;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'job_clusters', id, 'ko', 'name', '생산기술·제조엔지니어링' FROM job_clusters WHERE code = 'ME.MFG_ENG'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'job_clusters', id, 'en', 'name', 'Manufacturing Engineer' FROM job_clusters WHERE code = 'ME.MFG_ENG'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO job_industry_map (job_id, industry_id)
  SELECT j.id, i.id FROM job_clusters j, industries i WHERE j.code = 'ME.MFG_ENG' AND i.code = 'AUTO'
  ON CONFLICT DO NOTHING;
INSERT INTO job_industry_map (job_id, industry_id)
  SELECT j.id, i.id FROM job_clusters j, industries i WHERE j.code = 'ME.MFG_ENG' AND i.code = 'SEMI'
  ON CONFLICT DO NOTHING;
INSERT INTO job_industry_map (job_id, industry_id)
  SELECT j.id, i.id FROM job_clusters j, industries i WHERE j.code = 'ME.MFG_ENG' AND i.code = 'BATT'
  ON CONFLICT DO NOTHING;
INSERT INTO job_industry_map (job_id, industry_id)
  SELECT j.id, i.id FROM job_clusters j, industries i WHERE j.code = 'ME.MFG_ENG' AND i.code = 'MACH'
  ON CONFLICT DO NOTHING;
INSERT INTO job_cluster_tracks (job_id, track_code)
  SELECT id, 'HS' FROM job_clusters WHERE code = 'ME.MFG_ENG' ON CONFLICT DO NOTHING;
INSERT INTO job_cluster_tracks (job_id, track_code)
  SELECT id, 'UNIV_LOW' FROM job_clusters WHERE code = 'ME.MFG_ENG' ON CONFLICT DO NOTHING;
INSERT INTO job_cluster_tracks (job_id, track_code)
  SELECT id, 'UNIV_HIGH' FROM job_clusters WHERE code = 'ME.MFG_ENG' ON CONFLICT DO NOTHING;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'FIELD', 0.3 FROM job_clusters WHERE code = 'ME.MFG_ENG'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'OPTIMIZE', 0.26 FROM job_clusters WHERE code = 'ME.MFG_ENG'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'BUILD', 0.16 FROM job_clusters WHERE code = 'ME.MFG_ENG'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'ORCHESTRATE', 0.14 FROM job_clusters WHERE code = 'ME.MFG_ENG'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'ANALYZE', 0.1 FROM job_clusters WHERE code = 'ME.MFG_ENG'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'DESIGN', 0.04 FROM job_clusters WHERE code = 'ME.MFG_ENG'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'ME.MFG_ENG' AND c.code = 'ME.MFG'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 3 FROM job_clusters j, competencies c WHERE j.code = 'ME.MFG_ENG' AND c.code = 'SW.PLC'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'ME.MFG_ENG' AND c.code = 'ME.GDT'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'ME.MFG_ENG' AND c.code = 'SW.MINITAB'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'ME.MFG_ENG' AND c.code = 'ME.STAT'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'ME.MFG_ENG' AND c.code = 'SW.AUTOCAD'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'ME.MFG_ENG' AND c.code = 'ME.HYD'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 2, 2 FROM job_clusters j, competencies c WHERE j.code = 'ME.MFG_ENG' AND c.code = 'SW.CAM'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 2, 2 FROM job_clusters j, competencies c WHERE j.code = 'ME.MFG_ENG' AND c.code = 'ME.MATL'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'ME.MFG_ENG' AND c.code = 'CM.STD'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'ME.MFG_ENG' AND c.code = 'CM.COLLAB'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'ME.MFG_ENG' AND c.code = 'SW.MEASURE'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_clusters (major_id, code, onet_code, sort_no)
  SELECT id, 'ME.QUALITY', '17-2112.00', 4 FROM majors WHERE code = 'ME'
  ON CONFLICT (major_id, code) DO UPDATE SET onet_code = EXCLUDED.onet_code, sort_no = EXCLUDED.sort_no;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'job_clusters', id, 'ko', 'name', '품질·신뢰성' FROM job_clusters WHERE code = 'ME.QUALITY'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'job_clusters', id, 'en', 'name', 'Quality & Reliability Engineer' FROM job_clusters WHERE code = 'ME.QUALITY'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO job_industry_map (job_id, industry_id)
  SELECT j.id, i.id FROM job_clusters j, industries i WHERE j.code = 'ME.QUALITY' AND i.code = 'AUTO'
  ON CONFLICT DO NOTHING;
INSERT INTO job_industry_map (job_id, industry_id)
  SELECT j.id, i.id FROM job_clusters j, industries i WHERE j.code = 'ME.QUALITY' AND i.code = 'SEMI'
  ON CONFLICT DO NOTHING;
INSERT INTO job_industry_map (job_id, industry_id)
  SELECT j.id, i.id FROM job_clusters j, industries i WHERE j.code = 'ME.QUALITY' AND i.code = 'MED'
  ON CONFLICT DO NOTHING;
INSERT INTO job_industry_map (job_id, industry_id)
  SELECT j.id, i.id FROM job_clusters j, industries i WHERE j.code = 'ME.QUALITY' AND i.code = 'MACH'
  ON CONFLICT DO NOTHING;
INSERT INTO job_cluster_tracks (job_id, track_code)
  SELECT id, 'HS' FROM job_clusters WHERE code = 'ME.QUALITY' ON CONFLICT DO NOTHING;
INSERT INTO job_cluster_tracks (job_id, track_code)
  SELECT id, 'UNIV_LOW' FROM job_clusters WHERE code = 'ME.QUALITY' ON CONFLICT DO NOTHING;
INSERT INTO job_cluster_tracks (job_id, track_code)
  SELECT id, 'UNIV_HIGH' FROM job_clusters WHERE code = 'ME.QUALITY' ON CONFLICT DO NOTHING;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'OPTIMIZE', 0.28 FROM job_clusters WHERE code = 'ME.QUALITY'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'ANALYZE', 0.24 FROM job_clusters WHERE code = 'ME.QUALITY'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'FIELD', 0.2 FROM job_clusters WHERE code = 'ME.QUALITY'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'ORCHESTRATE', 0.14 FROM job_clusters WHERE code = 'ME.QUALITY'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'BUILD', 0.1 FROM job_clusters WHERE code = 'ME.QUALITY'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'DESIGN', 0.04 FROM job_clusters WHERE code = 'ME.QUALITY'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'ME.QUALITY' AND c.code = 'ME.RELIAB'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'ME.QUALITY' AND c.code = 'ME.STAT'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'ME.QUALITY' AND c.code = 'SW.MINITAB'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'ME.QUALITY' AND c.code = 'SW.MEASURE'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 3 FROM job_clusters j, competencies c WHERE j.code = 'ME.QUALITY' AND c.code = 'ME.GDT'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'ME.QUALITY' AND c.code = 'CM.STD'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'ME.QUALITY' AND c.code = 'ME.MATL'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'ME.QUALITY' AND c.code = 'CM.DOC'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 2, 1 FROM job_clusters j, competencies c WHERE j.code = 'ME.QUALITY' AND c.code = 'SW.PYTHON'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'ME.QUALITY' AND c.code = 'ME.MFG'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_clusters (major_id, code, onet_code, sort_no)
  SELECT id, 'ME.AUTO_RD', '17-2141.00', 5 FROM majors WHERE code = 'ME'
  ON CONFLICT (major_id, code) DO UPDATE SET onet_code = EXCLUDED.onet_code, sort_no = EXCLUDED.sort_no;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'job_clusters', id, 'ko', 'name', '자동차·전동화 R&D' FROM job_clusters WHERE code = 'ME.AUTO_RD'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'job_clusters', id, 'en', 'name', 'Automotive R&D Engineer' FROM job_clusters WHERE code = 'ME.AUTO_RD'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO job_industry_map (job_id, industry_id)
  SELECT j.id, i.id FROM job_clusters j, industries i WHERE j.code = 'ME.AUTO_RD' AND i.code = 'AUTO'
  ON CONFLICT DO NOTHING;
INSERT INTO job_industry_map (job_id, industry_id)
  SELECT j.id, i.id FROM job_clusters j, industries i WHERE j.code = 'ME.AUTO_RD' AND i.code = 'BATT'
  ON CONFLICT DO NOTHING;
INSERT INTO job_cluster_tracks (job_id, track_code)
  SELECT id, 'UNIV_HIGH' FROM job_clusters WHERE code = 'ME.AUTO_RD' ON CONFLICT DO NOTHING;
INSERT INTO job_cluster_tracks (job_id, track_code)
  SELECT id, 'GRAD' FROM job_clusters WHERE code = 'ME.AUTO_RD' ON CONFLICT DO NOTHING;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'ANALYZE', 0.26 FROM job_clusters WHERE code = 'ME.AUTO_RD'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'DESIGN', 0.24 FROM job_clusters WHERE code = 'ME.AUTO_RD'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'BUILD', 0.18 FROM job_clusters WHERE code = 'ME.AUTO_RD'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'RESEARCH', 0.14 FROM job_clusters WHERE code = 'ME.AUTO_RD'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'OPTIMIZE', 0.12 FROM job_clusters WHERE code = 'ME.AUTO_RD'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'CODE', 0.06 FROM job_clusters WHERE code = 'ME.AUTO_RD'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'ME.AUTO_RD' AND c.code = 'DM.AUTO_PT'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'ME.AUTO_RD' AND c.code = 'ME.DYN'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 3 FROM job_clusters j, competencies c WHERE j.code = 'ME.AUTO_RD' AND c.code = 'ME.VIB'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'ME.AUTO_RD' AND c.code = 'SW.CATIA'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'ME.AUTO_RD' AND c.code = 'SW.SIMULINK'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'ME.AUTO_RD' AND c.code = 'ME.CTRL'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'ME.AUTO_RD' AND c.code = 'DM.BATTPACK'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'ME.AUTO_RD' AND c.code = 'ME.HEAT'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'ME.AUTO_RD' AND c.code = 'SW.MATLAB'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 2, 1 FROM job_clusters j, competencies c WHERE j.code = 'ME.AUTO_RD' AND c.code = 'ME.COMB'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'ME.AUTO_RD' AND c.code = 'CM.ENG'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_clusters (major_id, code, onet_code, sort_no)
  SELECT id, 'ME.AEROSPACE', '17-2011.00', 6 FROM majors WHERE code = 'ME'
  ON CONFLICT (major_id, code) DO UPDATE SET onet_code = EXCLUDED.onet_code, sort_no = EXCLUDED.sort_no;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'job_clusters', id, 'ko', 'name', '항공우주·방산 R&D' FROM job_clusters WHERE code = 'ME.AEROSPACE'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'job_clusters', id, 'en', 'name', 'Aerospace / Defense R&D' FROM job_clusters WHERE code = 'ME.AEROSPACE'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO job_industry_map (job_id, industry_id)
  SELECT j.id, i.id FROM job_clusters j, industries i WHERE j.code = 'ME.AEROSPACE' AND i.code = 'AERO'
  ON CONFLICT DO NOTHING;
INSERT INTO job_industry_map (job_id, industry_id)
  SELECT j.id, i.id FROM job_clusters j, industries i WHERE j.code = 'ME.AEROSPACE' AND i.code = 'DEF'
  ON CONFLICT DO NOTHING;
INSERT INTO job_cluster_tracks (job_id, track_code)
  SELECT id, 'UNIV_HIGH' FROM job_clusters WHERE code = 'ME.AEROSPACE' ON CONFLICT DO NOTHING;
INSERT INTO job_cluster_tracks (job_id, track_code)
  SELECT id, 'GRAD' FROM job_clusters WHERE code = 'ME.AEROSPACE' ON CONFLICT DO NOTHING;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'RESEARCH', 0.28 FROM job_clusters WHERE code = 'ME.AEROSPACE'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'ANALYZE', 0.28 FROM job_clusters WHERE code = 'ME.AEROSPACE'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'DESIGN', 0.2 FROM job_clusters WHERE code = 'ME.AEROSPACE'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'BUILD', 0.12 FROM job_clusters WHERE code = 'ME.AEROSPACE'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'OPTIMIZE', 0.08 FROM job_clusters WHERE code = 'ME.AEROSPACE'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'ORCHESTRATE', 0.04 FROM job_clusters WHERE code = 'ME.AEROSPACE'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'ME.AEROSPACE' AND c.code = 'DM.AEROSTR'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'ME.AEROSPACE' AND c.code = 'ME.FEM'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'ME.AEROSPACE' AND c.code = 'ME.SOLID'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'ME.AEROSPACE' AND c.code = 'ME.FLUID'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 3 FROM job_clusters j, competencies c WHERE j.code = 'ME.AEROSPACE' AND c.code = 'ME.MATL'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'ME.AEROSPACE' AND c.code = 'SW.ABAQUS'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'ME.AEROSPACE' AND c.code = 'SW.CATIA'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'ME.AEROSPACE' AND c.code = 'ME.VIB'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 2 FROM job_clusters j, competencies c WHERE j.code = 'ME.AEROSPACE' AND c.code = 'ME.MATH'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'ME.AEROSPACE' AND c.code = 'CM.STD'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'ME.AEROSPACE' AND c.code = 'CM.ENG'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'ME.AEROSPACE' AND c.code = 'SW.MATLAB'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_clusters (major_id, code, onet_code, sort_no)
  SELECT id, 'ME.ROBOT_AUTO', '17-2199.08', 7 FROM majors WHERE code = 'ME'
  ON CONFLICT (major_id, code) DO UPDATE SET onet_code = EXCLUDED.onet_code, sort_no = EXCLUDED.sort_no;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'job_clusters', id, 'ko', 'name', '로봇·자동화 엔지니어' FROM job_clusters WHERE code = 'ME.ROBOT_AUTO'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'job_clusters', id, 'en', 'name', 'Robotics & Automation Engineer' FROM job_clusters WHERE code = 'ME.ROBOT_AUTO'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO job_industry_map (job_id, industry_id)
  SELECT j.id, i.id FROM job_clusters j, industries i WHERE j.code = 'ME.ROBOT_AUTO' AND i.code = 'ROBOT'
  ON CONFLICT DO NOTHING;
INSERT INTO job_industry_map (job_id, industry_id)
  SELECT j.id, i.id FROM job_clusters j, industries i WHERE j.code = 'ME.ROBOT_AUTO' AND i.code = 'SEMI'
  ON CONFLICT DO NOTHING;
INSERT INTO job_industry_map (job_id, industry_id)
  SELECT j.id, i.id FROM job_clusters j, industries i WHERE j.code = 'ME.ROBOT_AUTO' AND i.code = 'AUTO'
  ON CONFLICT DO NOTHING;
INSERT INTO job_industry_map (job_id, industry_id)
  SELECT j.id, i.id FROM job_clusters j, industries i WHERE j.code = 'ME.ROBOT_AUTO' AND i.code = 'MACH'
  ON CONFLICT DO NOTHING;
INSERT INTO job_cluster_tracks (job_id, track_code)
  SELECT id, 'UNIV_LOW' FROM job_clusters WHERE code = 'ME.ROBOT_AUTO' ON CONFLICT DO NOTHING;
INSERT INTO job_cluster_tracks (job_id, track_code)
  SELECT id, 'UNIV_HIGH' FROM job_clusters WHERE code = 'ME.ROBOT_AUTO' ON CONFLICT DO NOTHING;
INSERT INTO job_cluster_tracks (job_id, track_code)
  SELECT id, 'GRAD' FROM job_clusters WHERE code = 'ME.ROBOT_AUTO' ON CONFLICT DO NOTHING;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'BUILD', 0.26 FROM job_clusters WHERE code = 'ME.ROBOT_AUTO'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'CODE', 0.22 FROM job_clusters WHERE code = 'ME.ROBOT_AUTO'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'DESIGN', 0.2 FROM job_clusters WHERE code = 'ME.ROBOT_AUTO'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'ANALYZE', 0.16 FROM job_clusters WHERE code = 'ME.ROBOT_AUTO'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'FIELD', 0.12 FROM job_clusters WHERE code = 'ME.ROBOT_AUTO'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'OPTIMIZE', 0.04 FROM job_clusters WHERE code = 'ME.ROBOT_AUTO'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'ME.ROBOT_AUTO' AND c.code = 'ME.ROBOT'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'ME.ROBOT_AUTO' AND c.code = 'ME.MECHA'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'ME.ROBOT_AUTO' AND c.code = 'ME.CTRL'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 3 FROM job_clusters j, competencies c WHERE j.code = 'ME.ROBOT_AUTO' AND c.code = 'SW.PYTHON'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'ME.ROBOT_AUTO' AND c.code = 'SW.MATLAB'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'ME.ROBOT_AUTO' AND c.code = 'SW.SIMULINK'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'ME.ROBOT_AUTO' AND c.code = 'ME.DYN'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'ME.ROBOT_AUTO' AND c.code = 'SW.SOLIDWORKS'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'ME.ROBOT_AUTO' AND c.code = 'SW.PLC'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 2, 1 FROM job_clusters j, competencies c WHERE j.code = 'ME.ROBOT_AUTO' AND c.code = 'SW.3DPRINT'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'ME.ROBOT_AUTO' AND c.code = 'CM.COLLAB'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_clusters (major_id, code, onet_code, sort_no)
  SELECT id, 'ME.SEMI_EQ', '17-2199.00', 8 FROM majors WHERE code = 'ME'
  ON CONFLICT (major_id, code) DO UPDATE SET onet_code = EXCLUDED.onet_code, sort_no = EXCLUDED.sort_no;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'job_clusters', id, 'ko', 'name', '반도체·디스플레이 장비' FROM job_clusters WHERE code = 'ME.SEMI_EQ'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'job_clusters', id, 'en', 'name', 'Semiconductor Equipment Engineer' FROM job_clusters WHERE code = 'ME.SEMI_EQ'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO job_industry_map (job_id, industry_id)
  SELECT j.id, i.id FROM job_clusters j, industries i WHERE j.code = 'ME.SEMI_EQ' AND i.code = 'SEMI'
  ON CONFLICT DO NOTHING;
INSERT INTO job_cluster_tracks (job_id, track_code)
  SELECT id, 'HS' FROM job_clusters WHERE code = 'ME.SEMI_EQ' ON CONFLICT DO NOTHING;
INSERT INTO job_cluster_tracks (job_id, track_code)
  SELECT id, 'UNIV_LOW' FROM job_clusters WHERE code = 'ME.SEMI_EQ' ON CONFLICT DO NOTHING;
INSERT INTO job_cluster_tracks (job_id, track_code)
  SELECT id, 'UNIV_HIGH' FROM job_clusters WHERE code = 'ME.SEMI_EQ' ON CONFLICT DO NOTHING;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'FIELD', 0.28 FROM job_clusters WHERE code = 'ME.SEMI_EQ'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'DESIGN', 0.22 FROM job_clusters WHERE code = 'ME.SEMI_EQ'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'ANALYZE', 0.18 FROM job_clusters WHERE code = 'ME.SEMI_EQ'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'BUILD', 0.16 FROM job_clusters WHERE code = 'ME.SEMI_EQ'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'OPTIMIZE', 0.12 FROM job_clusters WHERE code = 'ME.SEMI_EQ'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'ORCHESTRATE', 0.04 FROM job_clusters WHERE code = 'ME.SEMI_EQ'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'ME.SEMI_EQ' AND c.code = 'DM.SEMI_EQ'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 3 FROM job_clusters j, competencies c WHERE j.code = 'ME.SEMI_EQ' AND c.code = 'ME.DESIGN'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 3 FROM job_clusters j, competencies c WHERE j.code = 'ME.SEMI_EQ' AND c.code = 'ME.HYD'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'ME.SEMI_EQ' AND c.code = 'SW.SOLIDWORKS'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'ME.SEMI_EQ' AND c.code = 'ME.MECHA'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'ME.SEMI_EQ' AND c.code = 'ME.HEAT'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'ME.SEMI_EQ' AND c.code = 'SW.PLC'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'ME.SEMI_EQ' AND c.code = 'SW.MEASURE'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'ME.SEMI_EQ' AND c.code = 'CM.STD'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'ME.SEMI_EQ' AND c.code = 'ME.GDT'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 2, 1 FROM job_clusters j, competencies c WHERE j.code = 'ME.SEMI_EQ' AND c.code = 'CM.ENG'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;

-- ======== EE 전기·전자공학 ========
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('EE.MATH', 'theory', 'L1', (SELECT id FROM majors WHERE code = 'EE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '공학수학·변환' FROM competencies WHERE code = 'EE.MATH'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Engineering Mathematics' FROM competencies WHERE code = 'EE.MATH'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('공학수학·변환') FROM competencies WHERE code = 'EE.MATH'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Engineering Mathematics') FROM competencies WHERE code = 'EE.MATH'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('푸리에') FROM competencies WHERE code = 'EE.MATH'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('라플라스') FROM competencies WHERE code = 'EE.MATH'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('복소해석') FROM competencies WHERE code = 'EE.MATH'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('EE.PHYS', 'theory', 'L1', (SELECT id FROM majors WHERE code = 'EE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '물리전자' FROM competencies WHERE code = 'EE.PHYS'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Physical Electronics' FROM competencies WHERE code = 'EE.PHYS'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('물리전자') FROM competencies WHERE code = 'EE.PHYS'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Physical Electronics') FROM competencies WHERE code = 'EE.PHYS'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('고체물리') FROM competencies WHERE code = 'EE.PHYS'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('양자') FROM competencies WHERE code = 'EE.PHYS'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('EE.PROB', 'theory', 'L1', (SELECT id FROM majors WHERE code = 'EE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '확률과 랜덤변수' FROM competencies WHERE code = 'EE.PROB'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Probability & Random Variables' FROM competencies WHERE code = 'EE.PROB'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('확률과 랜덤변수') FROM competencies WHERE code = 'EE.PROB'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Probability & Random Variables') FROM competencies WHERE code = 'EE.PROB'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('확률변수') FROM competencies WHERE code = 'EE.PROB'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('잡음이론') FROM competencies WHERE code = 'EE.PROB'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('EE.CIRCUIT', 'theory', 'L2', (SELECT id FROM majors WHERE code = 'EE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '회로이론' FROM competencies WHERE code = 'EE.CIRCUIT'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Circuit Theory' FROM competencies WHERE code = 'EE.CIRCUIT'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('회로이론') FROM competencies WHERE code = 'EE.CIRCUIT'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Circuit Theory') FROM competencies WHERE code = 'EE.CIRCUIT'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('회로해석') FROM competencies WHERE code = 'EE.CIRCUIT'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('RLC') FROM competencies WHERE code = 'EE.CIRCUIT'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('EE.ANALOG', 'theory', 'L2', (SELECT id FROM majors WHERE code = 'EE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '전자회로·아날로그' FROM competencies WHERE code = 'EE.ANALOG'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Analog Electronics' FROM competencies WHERE code = 'EE.ANALOG'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('전자회로·아날로그') FROM competencies WHERE code = 'EE.ANALOG'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Analog Electronics') FROM competencies WHERE code = 'EE.ANALOG'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('OP-AMP') FROM competencies WHERE code = 'EE.ANALOG'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('증폭기') FROM competencies WHERE code = 'EE.ANALOG'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('EE.DIGITAL', 'theory', 'L2', (SELECT id FROM majors WHERE code = 'EE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '디지털논리회로' FROM competencies WHERE code = 'EE.DIGITAL'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Digital Logic' FROM competencies WHERE code = 'EE.DIGITAL'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('디지털논리회로') FROM competencies WHERE code = 'EE.DIGITAL'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Digital Logic') FROM competencies WHERE code = 'EE.DIGITAL'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('논리회로') FROM competencies WHERE code = 'EE.DIGITAL'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('FSM') FROM competencies WHERE code = 'EE.DIGITAL'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('EE.EM', 'theory', 'L2', (SELECT id FROM majors WHERE code = 'EE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '전자기학' FROM competencies WHERE code = 'EE.EM'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Electromagnetics' FROM competencies WHERE code = 'EE.EM'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('전자기학') FROM competencies WHERE code = 'EE.EM'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Electromagnetics') FROM competencies WHERE code = 'EE.EM'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Maxwell') FROM competencies WHERE code = 'EE.EM'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('전자파') FROM competencies WHERE code = 'EE.EM'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('EE.SIGSYS', 'theory', 'L2', (SELECT id FROM majors WHERE code = 'EE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '신호 및 시스템' FROM competencies WHERE code = 'EE.SIGSYS'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Signals & Systems' FROM competencies WHERE code = 'EE.SIGSYS'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('신호 및 시스템') FROM competencies WHERE code = 'EE.SIGSYS'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Signals & Systems') FROM competencies WHERE code = 'EE.SIGSYS'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('시스템해석') FROM competencies WHERE code = 'EE.SIGSYS'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('EE.DSP', 'theory', 'L2', (SELECT id FROM majors WHERE code = 'EE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '디지털신호처리' FROM competencies WHERE code = 'EE.DSP'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Digital Signal Processing' FROM competencies WHERE code = 'EE.DSP'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('디지털신호처리') FROM competencies WHERE code = 'EE.DSP'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Digital Signal Processing') FROM competencies WHERE code = 'EE.DSP'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('DSP') FROM competencies WHERE code = 'EE.DSP'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('FFT') FROM competencies WHERE code = 'EE.DSP'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('필터설계') FROM competencies WHERE code = 'EE.DSP'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('EE.SEMI', 'theory', 'L2', (SELECT id FROM majors WHERE code = 'EE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '반도체 소자' FROM competencies WHERE code = 'EE.SEMI'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Semiconductor Devices' FROM competencies WHERE code = 'EE.SEMI'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('반도체 소자') FROM competencies WHERE code = 'EE.SEMI'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Semiconductor Devices') FROM competencies WHERE code = 'EE.SEMI'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('MOSFET') FROM competencies WHERE code = 'EE.SEMI'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('소자물리') FROM competencies WHERE code = 'EE.SEMI'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('EE.PROCESS', 'theory', 'L2', (SELECT id FROM majors WHERE code = 'EE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '반도체 공정' FROM competencies WHERE code = 'EE.PROCESS'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Semiconductor Process' FROM competencies WHERE code = 'EE.PROCESS'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('반도체 공정') FROM competencies WHERE code = 'EE.PROCESS'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Semiconductor Process') FROM competencies WHERE code = 'EE.PROCESS'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('포토') FROM competencies WHERE code = 'EE.PROCESS'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('식각') FROM competencies WHERE code = 'EE.PROCESS'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('증착') FROM competencies WHERE code = 'EE.PROCESS'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('8대공정') FROM competencies WHERE code = 'EE.PROCESS'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('EE.VLSI', 'theory', 'L2', (SELECT id FROM majors WHERE code = 'EE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', 'VLSI·집적회로 설계' FROM competencies WHERE code = 'EE.VLSI'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'VLSI Design' FROM competencies WHERE code = 'EE.VLSI'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('VLSI·집적회로 설계') FROM competencies WHERE code = 'EE.VLSI'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('VLSI Design') FROM competencies WHERE code = 'EE.VLSI'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('ASIC') FROM competencies WHERE code = 'EE.VLSI'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('SoC') FROM competencies WHERE code = 'EE.VLSI'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('물리설계') FROM competencies WHERE code = 'EE.VLSI'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('EE.POWERELEC', 'theory', 'L2', (SELECT id FROM majors WHERE code = 'EE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '전력전자' FROM competencies WHERE code = 'EE.POWERELEC'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Power Electronics' FROM competencies WHERE code = 'EE.POWERELEC'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('전력전자') FROM competencies WHERE code = 'EE.POWERELEC'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Power Electronics') FROM competencies WHERE code = 'EE.POWERELEC'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('컨버터') FROM competencies WHERE code = 'EE.POWERELEC'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('인버터') FROM competencies WHERE code = 'EE.POWERELEC'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('PWM') FROM competencies WHERE code = 'EE.POWERELEC'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('EE.POWERSYS', 'theory', 'L2', (SELECT id FROM majors WHERE code = 'EE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '전력시스템' FROM competencies WHERE code = 'EE.POWERSYS'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Power Systems' FROM competencies WHERE code = 'EE.POWERSYS'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('전력시스템') FROM competencies WHERE code = 'EE.POWERSYS'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Power Systems') FROM competencies WHERE code = 'EE.POWERSYS'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('송배전') FROM competencies WHERE code = 'EE.POWERSYS'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('계통해석') FROM competencies WHERE code = 'EE.POWERSYS'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('EE.MOTOR', 'theory', 'L2', (SELECT id FROM majors WHERE code = 'EE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '전기기기·모터제어' FROM competencies WHERE code = 'EE.MOTOR'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Electric Machines' FROM competencies WHERE code = 'EE.MOTOR'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('전기기기·모터제어') FROM competencies WHERE code = 'EE.MOTOR'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Electric Machines') FROM competencies WHERE code = 'EE.MOTOR'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('BLDC') FROM competencies WHERE code = 'EE.MOTOR'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('인버터제어') FROM competencies WHERE code = 'EE.MOTOR'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('EE.CTRL', 'theory', 'L2', (SELECT id FROM majors WHERE code = 'EE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '자동제어' FROM competencies WHERE code = 'EE.CTRL'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Control Systems' FROM competencies WHERE code = 'EE.CTRL'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('자동제어') FROM competencies WHERE code = 'EE.CTRL'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Control Systems') FROM competencies WHERE code = 'EE.CTRL'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('제어공학') FROM competencies WHERE code = 'EE.CTRL'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('상태공간') FROM competencies WHERE code = 'EE.CTRL'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('EE.COMM', 'theory', 'L2', (SELECT id FROM majors WHERE code = 'EE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '통신이론' FROM competencies WHERE code = 'EE.COMM'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Communication Theory' FROM competencies WHERE code = 'EE.COMM'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('통신이론') FROM competencies WHERE code = 'EE.COMM'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Communication Theory') FROM competencies WHERE code = 'EE.COMM'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('변복조') FROM competencies WHERE code = 'EE.COMM'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('채널코딩') FROM competencies WHERE code = 'EE.COMM'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('EE.RF', 'theory', 'L2', (SELECT id FROM majors WHERE code = 'EE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', 'RF·안테나' FROM competencies WHERE code = 'EE.RF'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'RF & Antenna' FROM competencies WHERE code = 'EE.RF'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('RF·안테나') FROM competencies WHERE code = 'EE.RF'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('RF & Antenna') FROM competencies WHERE code = 'EE.RF'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('고주파') FROM competencies WHERE code = 'EE.RF'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('임피던스 정합') FROM competencies WHERE code = 'EE.RF'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('EE.MCU', 'theory', 'L2', (SELECT id FROM majors WHERE code = 'EE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '마이크로프로세서' FROM competencies WHERE code = 'EE.MCU'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Microprocessors' FROM competencies WHERE code = 'EE.MCU'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('마이크로프로세서') FROM competencies WHERE code = 'EE.MCU'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Microprocessors') FROM competencies WHERE code = 'EE.MCU'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('MCU') FROM competencies WHERE code = 'EE.MCU'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('ARM') FROM competencies WHERE code = 'EE.MCU'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('인터럽트') FROM competencies WHERE code = 'EE.MCU'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('EE.EMBED', 'theory', 'L2', (SELECT id FROM majors WHERE code = 'EE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '임베디드 시스템' FROM competencies WHERE code = 'EE.EMBED'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Embedded Systems' FROM competencies WHERE code = 'EE.EMBED'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('임베디드 시스템') FROM competencies WHERE code = 'EE.EMBED'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Embedded Systems') FROM competencies WHERE code = 'EE.EMBED'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('펌웨어') FROM competencies WHERE code = 'EE.EMBED'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('RTOS') FROM competencies WHERE code = 'EE.EMBED'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('EE.INSTR', 'theory', 'L2', (SELECT id FROM majors WHERE code = 'EE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '계측·센서' FROM competencies WHERE code = 'EE.INSTR'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Instrumentation' FROM competencies WHERE code = 'EE.INSTR'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('계측·센서') FROM competencies WHERE code = 'EE.INSTR'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Instrumentation') FROM competencies WHERE code = 'EE.INSTR'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('센서회로') FROM competencies WHERE code = 'EE.INSTR'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('신호조절') FROM competencies WHERE code = 'EE.INSTR'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('EE.OPTO', 'theory', 'L2', (SELECT id FROM majors WHERE code = 'EE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '광전자·디스플레이' FROM competencies WHERE code = 'EE.OPTO'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Optoelectronics' FROM competencies WHERE code = 'EE.OPTO'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('광전자·디스플레이') FROM competencies WHERE code = 'EE.OPTO'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Optoelectronics') FROM competencies WHERE code = 'EE.OPTO'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('OLED') FROM competencies WHERE code = 'EE.OPTO'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('LED') FROM competencies WHERE code = 'EE.OPTO'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('광소자') FROM competencies WHERE code = 'EE.OPTO'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('EE.EMC', 'theory', 'L2', (SELECT id FROM majors WHERE code = 'EE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', 'EMC·신호무결성' FROM competencies WHERE code = 'EE.EMC'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'EMC & Signal Integrity' FROM competencies WHERE code = 'EE.EMC'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('EMC·신호무결성') FROM competencies WHERE code = 'EE.EMC'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('EMC & Signal Integrity') FROM competencies WHERE code = 'EE.EMC'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('EMI') FROM competencies WHERE code = 'EE.EMC'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('SI/PI') FROM competencies WHERE code = 'EE.EMC'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('SW.SPICE', 'software', 'L3', (SELECT id FROM majors WHERE code = 'EE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', 'SPICE 시뮬레이션' FROM competencies WHERE code = 'SW.SPICE'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'SPICE' FROM competencies WHERE code = 'SW.SPICE'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('SPICE 시뮬레이션') FROM competencies WHERE code = 'SW.SPICE'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('SPICE') FROM competencies WHERE code = 'SW.SPICE'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('LTspice') FROM competencies WHERE code = 'SW.SPICE'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('PSpice') FROM competencies WHERE code = 'SW.SPICE'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('HSPICE') FROM competencies WHERE code = 'SW.SPICE'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('SW.CADENCE', 'software', 'L3', (SELECT id FROM majors WHERE code = 'EE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', 'Cadence Virtuoso' FROM competencies WHERE code = 'SW.CADENCE'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Cadence Virtuoso' FROM competencies WHERE code = 'SW.CADENCE'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Cadence Virtuoso') FROM competencies WHERE code = 'SW.CADENCE'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Cadence Virtuoso') FROM competencies WHERE code = 'SW.CADENCE'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('케이던스') FROM competencies WHERE code = 'SW.CADENCE'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('레이아웃') FROM competencies WHERE code = 'SW.CADENCE'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('SW.SYNOPSYS', 'software', 'L3', (SELECT id FROM majors WHERE code = 'EE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', 'Synopsys 합성·검증' FROM competencies WHERE code = 'SW.SYNOPSYS'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Synopsys EDA' FROM competencies WHERE code = 'SW.SYNOPSYS'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('Synopsys 합성·검증') FROM competencies WHERE code = 'SW.SYNOPSYS'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Synopsys EDA') FROM competencies WHERE code = 'SW.SYNOPSYS'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Design Compiler') FROM competencies WHERE code = 'SW.SYNOPSYS'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('VCS') FROM competencies WHERE code = 'SW.SYNOPSYS'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('PrimeTime') FROM competencies WHERE code = 'SW.SYNOPSYS'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('SW.VERILOG', 'software', 'L3', (SELECT id FROM majors WHERE code = 'EE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', 'Verilog·SystemVerilog' FROM competencies WHERE code = 'SW.VERILOG'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Verilog' FROM competencies WHERE code = 'SW.VERILOG'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Verilog·SystemVerilog') FROM competencies WHERE code = 'SW.VERILOG'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Verilog') FROM competencies WHERE code = 'SW.VERILOG'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('RTL') FROM competencies WHERE code = 'SW.VERILOG'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('SV') FROM competencies WHERE code = 'SW.VERILOG'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('UVM') FROM competencies WHERE code = 'SW.VERILOG'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('SW.VHDL', 'software', 'L3', (SELECT id FROM majors WHERE code = 'EE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', 'VHDL' FROM competencies WHERE code = 'SW.VHDL'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'VHDL' FROM competencies WHERE code = 'SW.VHDL'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('VHDL') FROM competencies WHERE code = 'SW.VHDL'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('VHDL') FROM competencies WHERE code = 'SW.VHDL'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('SW.FPGA', 'software', 'L3', (SELECT id FROM majors WHERE code = 'EE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', 'FPGA 툴체인' FROM competencies WHERE code = 'SW.FPGA'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'FPGA Toolchain' FROM competencies WHERE code = 'SW.FPGA'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('FPGA 툴체인') FROM competencies WHERE code = 'SW.FPGA'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('FPGA Toolchain') FROM competencies WHERE code = 'SW.FPGA'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Vivado') FROM competencies WHERE code = 'SW.FPGA'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Quartus') FROM competencies WHERE code = 'SW.FPGA'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Xilinx') FROM competencies WHERE code = 'SW.FPGA'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('SW.PCB', 'software', 'L3', (SELECT id FROM majors WHERE code = 'EE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', 'PCB 설계' FROM competencies WHERE code = 'SW.PCB'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'PCB Design' FROM competencies WHERE code = 'SW.PCB'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('PCB 설계') FROM competencies WHERE code = 'SW.PCB'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('PCB Design') FROM competencies WHERE code = 'SW.PCB'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Altium') FROM competencies WHERE code = 'SW.PCB'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('OrCAD') FROM competencies WHERE code = 'SW.PCB'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('KiCad') FROM competencies WHERE code = 'SW.PCB'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('아트웍') FROM competencies WHERE code = 'SW.PCB'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('SW.HFSS', 'software', 'L3', (SELECT id FROM majors WHERE code = 'EE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '전자계 해석 (HFSS·ADS)' FROM competencies WHERE code = 'SW.HFSS'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'EM Simulation' FROM competencies WHERE code = 'SW.HFSS'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('전자계 해석 (HFSS·ADS)') FROM competencies WHERE code = 'SW.HFSS'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('EM Simulation') FROM competencies WHERE code = 'SW.HFSS'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('ADS') FROM competencies WHERE code = 'SW.HFSS'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('CST') FROM competencies WHERE code = 'SW.HFSS'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('전자파해석') FROM competencies WHERE code = 'SW.HFSS'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('SW.TCAD', 'software', 'L3', (SELECT id FROM majors WHERE code = 'EE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', 'TCAD' FROM competencies WHERE code = 'SW.TCAD'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'TCAD' FROM competencies WHERE code = 'SW.TCAD'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('TCAD') FROM competencies WHERE code = 'SW.TCAD'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('TCAD') FROM competencies WHERE code = 'SW.TCAD'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Sentaurus') FROM competencies WHERE code = 'SW.TCAD'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('소자 시뮬레이션') FROM competencies WHERE code = 'SW.TCAD'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('SW.MATLAB', 'software', 'L3', (SELECT id FROM majors WHERE code = 'EE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', 'MATLAB' FROM competencies WHERE code = 'SW.MATLAB'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'MATLAB' FROM competencies WHERE code = 'SW.MATLAB'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('MATLAB') FROM competencies WHERE code = 'SW.MATLAB'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('MATLAB') FROM competencies WHERE code = 'SW.MATLAB'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('매트랩') FROM competencies WHERE code = 'SW.MATLAB'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('SW.SIMULINK', 'software', 'L3', (SELECT id FROM majors WHERE code = 'EE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', 'Simulink' FROM competencies WHERE code = 'SW.SIMULINK'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Simulink' FROM competencies WHERE code = 'SW.SIMULINK'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Simulink') FROM competencies WHERE code = 'SW.SIMULINK'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Simulink') FROM competencies WHERE code = 'SW.SIMULINK'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('MBD') FROM competencies WHERE code = 'SW.SIMULINK'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('PLECS') FROM competencies WHERE code = 'SW.SIMULINK'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('SW.C_EMB', 'software', 'L3', (SELECT id FROM majors WHERE code = 'EE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '임베디드 C' FROM competencies WHERE code = 'SW.C_EMB'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Embedded C' FROM competencies WHERE code = 'SW.C_EMB'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('임베디드 C') FROM competencies WHERE code = 'SW.C_EMB'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Embedded C') FROM competencies WHERE code = 'SW.C_EMB'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('C언어') FROM competencies WHERE code = 'SW.C_EMB'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('C++') FROM competencies WHERE code = 'SW.C_EMB'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('SW.PYTHON', 'software', 'L3', (SELECT id FROM majors WHERE code = 'EE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', 'Python' FROM competencies WHERE code = 'SW.PYTHON'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Python' FROM competencies WHERE code = 'SW.PYTHON'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Python') FROM competencies WHERE code = 'SW.PYTHON'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Python') FROM competencies WHERE code = 'SW.PYTHON'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('파이썬') FROM competencies WHERE code = 'SW.PYTHON'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('자동화 스크립트') FROM competencies WHERE code = 'SW.PYTHON'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('SW.RTOS', 'software', 'L3', (SELECT id FROM majors WHERE code = 'EE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', 'RTOS' FROM competencies WHERE code = 'SW.RTOS'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'RTOS' FROM competencies WHERE code = 'SW.RTOS'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('RTOS') FROM competencies WHERE code = 'SW.RTOS'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('RTOS') FROM competencies WHERE code = 'SW.RTOS'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('FreeRTOS') FROM competencies WHERE code = 'SW.RTOS'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Zephyr') FROM competencies WHERE code = 'SW.RTOS'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('SW.LABVIEW', 'software', 'L3', (SELECT id FROM majors WHERE code = 'EE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', 'LabVIEW·자동계측' FROM competencies WHERE code = 'SW.LABVIEW'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'LabVIEW' FROM competencies WHERE code = 'SW.LABVIEW'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('LabVIEW·자동계측') FROM competencies WHERE code = 'SW.LABVIEW'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('LabVIEW') FROM competencies WHERE code = 'SW.LABVIEW'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('자동시험') FROM competencies WHERE code = 'SW.LABVIEW'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('SW.SCOPE', 'tool', 'L3', (SELECT id FROM majors WHERE code = 'EE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '오실로스코프·계측장비' FROM competencies WHERE code = 'SW.SCOPE'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Lab Instruments' FROM competencies WHERE code = 'SW.SCOPE'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('오실로스코프·계측장비') FROM competencies WHERE code = 'SW.SCOPE'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Lab Instruments') FROM competencies WHERE code = 'SW.SCOPE'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('스펙트럼분석기') FROM competencies WHERE code = 'SW.SCOPE'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('네트워크분석기') FROM competencies WHERE code = 'SW.SCOPE'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('JTAG') FROM competencies WHERE code = 'SW.SCOPE'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('SW.GIT', 'software', 'L3', (SELECT id FROM majors WHERE code = 'EE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '형상관리 (Git)' FROM competencies WHERE code = 'SW.GIT'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Git' FROM competencies WHERE code = 'SW.GIT'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('형상관리 (Git)') FROM competencies WHERE code = 'SW.GIT'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Git') FROM competencies WHERE code = 'SW.GIT'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('깃') FROM competencies WHERE code = 'SW.GIT'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('버전관리') FROM competencies WHERE code = 'SW.GIT'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('DM.FOUNDRY', 'domain', 'L4', (SELECT id FROM majors WHERE code = 'EE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '파운드리·수율' FROM competencies WHERE code = 'DM.FOUNDRY'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Foundry & Yield' FROM competencies WHERE code = 'DM.FOUNDRY'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('파운드리·수율') FROM competencies WHERE code = 'DM.FOUNDRY'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Foundry & Yield') FROM competencies WHERE code = 'DM.FOUNDRY'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('수율분석') FROM competencies WHERE code = 'DM.FOUNDRY'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('불량분석') FROM competencies WHERE code = 'DM.FOUNDRY'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('FA') FROM competencies WHERE code = 'DM.FOUNDRY'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('DM.MEMORY', 'domain', 'L4', (SELECT id FROM majors WHERE code = 'EE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '메모리 (DRAM·NAND)' FROM competencies WHERE code = 'DM.MEMORY'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Memory Devices' FROM competencies WHERE code = 'DM.MEMORY'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('메모리 (DRAM·NAND)') FROM competencies WHERE code = 'DM.MEMORY'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Memory Devices') FROM competencies WHERE code = 'DM.MEMORY'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('DRAM') FROM competencies WHERE code = 'DM.MEMORY'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('낸드') FROM competencies WHERE code = 'DM.MEMORY'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('DM.AUTO_E', 'domain', 'L4', (SELECT id FROM majors WHERE code = 'EE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '자동차 전장·ADAS' FROM competencies WHERE code = 'DM.AUTO_E'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Automotive Electronics' FROM competencies WHERE code = 'DM.AUTO_E'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('자동차 전장·ADAS') FROM competencies WHERE code = 'DM.AUTO_E'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Automotive Electronics') FROM competencies WHERE code = 'DM.AUTO_E'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('ECU') FROM competencies WHERE code = 'DM.AUTO_E'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('CAN') FROM competencies WHERE code = 'DM.AUTO_E'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('AUTOSAR') FROM competencies WHERE code = 'DM.AUTO_E'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('DM.BMS', 'domain', 'L4', (SELECT id FROM majors WHERE code = 'EE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '배터리 BMS' FROM competencies WHERE code = 'DM.BMS'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Battery Management' FROM competencies WHERE code = 'DM.BMS'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('배터리 BMS') FROM competencies WHERE code = 'DM.BMS'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Battery Management') FROM competencies WHERE code = 'DM.BMS'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('셀밸런싱') FROM competencies WHERE code = 'DM.BMS'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('SOC 추정') FROM competencies WHERE code = 'DM.BMS'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('DM.GRID', 'domain', 'L4', (SELECT id FROM majors WHERE code = 'EE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '전력망·신재생 연계' FROM competencies WHERE code = 'DM.GRID'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Grid & Renewables' FROM competencies WHERE code = 'DM.GRID'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('전력망·신재생 연계') FROM competencies WHERE code = 'DM.GRID'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Grid & Renewables') FROM competencies WHERE code = 'DM.GRID'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('ESS') FROM competencies WHERE code = 'DM.GRID'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('태양광 인버터') FROM competencies WHERE code = 'DM.GRID'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('DM.MODEM', 'domain', 'L4', (SELECT id FROM majors WHERE code = 'EE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '무선 모뎀·5G' FROM competencies WHERE code = 'DM.MODEM'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Wireless Modem' FROM competencies WHERE code = 'DM.MODEM'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('무선 모뎀·5G') FROM competencies WHERE code = 'DM.MODEM'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Wireless Modem') FROM competencies WHERE code = 'DM.MODEM'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('5G') FROM competencies WHERE code = 'DM.MODEM'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('LTE') FROM competencies WHERE code = 'DM.MODEM'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('베이스밴드') FROM competencies WHERE code = 'DM.MODEM'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('CM.STD_EE', 'soft', 'L5', NULL)
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '규격·인증' FROM competencies WHERE code = 'CM.STD_EE'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Standards & Certification' FROM competencies WHERE code = 'CM.STD_EE'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('규격·인증') FROM competencies WHERE code = 'CM.STD_EE'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Standards & Certification') FROM competencies WHERE code = 'CM.STD_EE'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('IEC') FROM competencies WHERE code = 'CM.STD_EE'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('AEC-Q100') FROM competencies WHERE code = 'CM.STD_EE'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('KC인증') FROM competencies WHERE code = 'CM.STD_EE'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('기능안전') FROM competencies WHERE code = 'CM.STD_EE'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('CM.DOC', 'soft', 'L5', NULL)
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '기술문서 작성' FROM competencies WHERE code = 'CM.DOC'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Technical Writing' FROM competencies WHERE code = 'CM.DOC'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('기술문서 작성') FROM competencies WHERE code = 'CM.DOC'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Technical Writing') FROM competencies WHERE code = 'CM.DOC'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('사양서') FROM competencies WHERE code = 'CM.DOC'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('시험성적서') FROM competencies WHERE code = 'CM.DOC'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('CM.ENG', 'soft', 'L5', NULL)
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '영문 기술 커뮤니케이션' FROM competencies WHERE code = 'CM.ENG'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Technical English' FROM competencies WHERE code = 'CM.ENG'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('영문 기술 커뮤니케이션') FROM competencies WHERE code = 'CM.ENG'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Technical English') FROM competencies WHERE code = 'CM.ENG'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('영어') FROM competencies WHERE code = 'CM.ENG'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('해외 협업') FROM competencies WHERE code = 'CM.ENG'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('CM.COLLAB', 'soft', 'L5', NULL)
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '협업·이슈관리' FROM competencies WHERE code = 'CM.COLLAB'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Collaboration' FROM competencies WHERE code = 'CM.COLLAB'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('협업·이슈관리') FROM competencies WHERE code = 'CM.COLLAB'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Collaboration') FROM competencies WHERE code = 'CM.COLLAB'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Jira') FROM competencies WHERE code = 'CM.COLLAB'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('코드리뷰') FROM competencies WHERE code = 'CM.COLLAB'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO job_clusters (major_id, code, onet_code, sort_no)
  SELECT id, 'EE.SEMI_DEV', '17-2072.00', 1 FROM majors WHERE code = 'EE'
  ON CONFLICT (major_id, code) DO UPDATE SET onet_code = EXCLUDED.onet_code, sort_no = EXCLUDED.sort_no;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'job_clusters', id, 'ko', 'name', '반도체 소자·공정' FROM job_clusters WHERE code = 'EE.SEMI_DEV'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'job_clusters', id, 'en', 'name', 'Semiconductor Device & Process Engineer' FROM job_clusters WHERE code = 'EE.SEMI_DEV'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO job_industry_map (job_id, industry_id)
  SELECT j.id, i.id FROM job_clusters j, industries i WHERE j.code = 'EE.SEMI_DEV' AND i.code = 'SEMI'
  ON CONFLICT DO NOTHING;
INSERT INTO job_cluster_tracks (job_id, track_code)
  SELECT id, 'UNIV_HIGH' FROM job_clusters WHERE code = 'EE.SEMI_DEV' ON CONFLICT DO NOTHING;
INSERT INTO job_cluster_tracks (job_id, track_code)
  SELECT id, 'GRAD' FROM job_clusters WHERE code = 'EE.SEMI_DEV' ON CONFLICT DO NOTHING;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'RESEARCH', 0.28 FROM job_clusters WHERE code = 'EE.SEMI_DEV'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'ANALYZE', 0.26 FROM job_clusters WHERE code = 'EE.SEMI_DEV'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'FIELD', 0.18 FROM job_clusters WHERE code = 'EE.SEMI_DEV'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'BUILD', 0.14 FROM job_clusters WHERE code = 'EE.SEMI_DEV'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'OPTIMIZE', 0.1 FROM job_clusters WHERE code = 'EE.SEMI_DEV'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'DESIGN', 0.04 FROM job_clusters WHERE code = 'EE.SEMI_DEV'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'EE.SEMI_DEV' AND c.code = 'EE.SEMI'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'EE.SEMI_DEV' AND c.code = 'EE.PROCESS'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'EE.SEMI_DEV' AND c.code = 'EE.PHYS'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 3 FROM job_clusters j, competencies c WHERE j.code = 'EE.SEMI_DEV' AND c.code = 'DM.FOUNDRY'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'EE.SEMI_DEV' AND c.code = 'SW.TCAD'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'EE.SEMI_DEV' AND c.code = 'EE.INSTR'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'EE.SEMI_DEV' AND c.code = 'SW.PYTHON'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'EE.SEMI_DEV' AND c.code = 'DM.MEMORY'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'EE.SEMI_DEV' AND c.code = 'EE.PROB'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'EE.SEMI_DEV' AND c.code = 'CM.DOC'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'EE.SEMI_DEV' AND c.code = 'CM.ENG'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_clusters (major_id, code, onet_code, sort_no)
  SELECT id, 'EE.ANALOG_RF', '17-2072.00', 2 FROM majors WHERE code = 'EE'
  ON CONFLICT (major_id, code) DO UPDATE SET onet_code = EXCLUDED.onet_code, sort_no = EXCLUDED.sort_no;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'job_clusters', id, 'ko', 'name', '아날로그·RF 회로 설계' FROM job_clusters WHERE code = 'EE.ANALOG_RF'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'job_clusters', id, 'en', 'name', 'Analog / RF Design Engineer' FROM job_clusters WHERE code = 'EE.ANALOG_RF'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO job_industry_map (job_id, industry_id)
  SELECT j.id, i.id FROM job_clusters j, industries i WHERE j.code = 'EE.ANALOG_RF' AND i.code = 'SEMI'
  ON CONFLICT DO NOTHING;
INSERT INTO job_industry_map (job_id, industry_id)
  SELECT j.id, i.id FROM job_clusters j, industries i WHERE j.code = 'EE.ANALOG_RF' AND i.code = 'TELCO'
  ON CONFLICT DO NOTHING;
INSERT INTO job_industry_map (job_id, industry_id)
  SELECT j.id, i.id FROM job_clusters j, industries i WHERE j.code = 'EE.ANALOG_RF' AND i.code = 'MED'
  ON CONFLICT DO NOTHING;
INSERT INTO job_cluster_tracks (job_id, track_code)
  SELECT id, 'UNIV_HIGH' FROM job_clusters WHERE code = 'EE.ANALOG_RF' ON CONFLICT DO NOTHING;
INSERT INTO job_cluster_tracks (job_id, track_code)
  SELECT id, 'GRAD' FROM job_clusters WHERE code = 'EE.ANALOG_RF' ON CONFLICT DO NOTHING;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'ANALYZE', 0.32 FROM job_clusters WHERE code = 'EE.ANALOG_RF'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'DESIGN', 0.28 FROM job_clusters WHERE code = 'EE.ANALOG_RF'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'RESEARCH', 0.18 FROM job_clusters WHERE code = 'EE.ANALOG_RF'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'BUILD', 0.14 FROM job_clusters WHERE code = 'EE.ANALOG_RF'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'CODE', 0.04 FROM job_clusters WHERE code = 'EE.ANALOG_RF'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'OPTIMIZE', 0.04 FROM job_clusters WHERE code = 'EE.ANALOG_RF'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 5, 3 FROM job_clusters j, competencies c WHERE j.code = 'EE.ANALOG_RF' AND c.code = 'EE.ANALOG'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'EE.ANALOG_RF' AND c.code = 'EE.CIRCUIT'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'EE.ANALOG_RF' AND c.code = 'SW.SPICE'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'EE.ANALOG_RF' AND c.code = 'SW.CADENCE'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'EE.ANALOG_RF' AND c.code = 'EE.SEMI'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'EE.ANALOG_RF' AND c.code = 'EE.EM'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'EE.ANALOG_RF' AND c.code = 'EE.RF'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'EE.ANALOG_RF' AND c.code = 'SW.HFSS'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'EE.ANALOG_RF' AND c.code = 'SW.SCOPE'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'EE.ANALOG_RF' AND c.code = 'EE.EMC'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'EE.ANALOG_RF' AND c.code = 'CM.ENG'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_clusters (major_id, code, onet_code, sort_no)
  SELECT id, 'EE.DIGITAL_SOC', '17-2061.00', 3 FROM majors WHERE code = 'EE'
  ON CONFLICT (major_id, code) DO UPDATE SET onet_code = EXCLUDED.onet_code, sort_no = EXCLUDED.sort_no;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'job_clusters', id, 'ko', 'name', '디지털 IC·SoC 설계' FROM job_clusters WHERE code = 'EE.DIGITAL_SOC'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'job_clusters', id, 'en', 'name', 'Digital IC / SoC Design Engineer' FROM job_clusters WHERE code = 'EE.DIGITAL_SOC'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO job_industry_map (job_id, industry_id)
  SELECT j.id, i.id FROM job_clusters j, industries i WHERE j.code = 'EE.DIGITAL_SOC' AND i.code = 'SEMI'
  ON CONFLICT DO NOTHING;
INSERT INTO job_industry_map (job_id, industry_id)
  SELECT j.id, i.id FROM job_clusters j, industries i WHERE j.code = 'EE.DIGITAL_SOC' AND i.code = 'AI'
  ON CONFLICT DO NOTHING;
INSERT INTO job_industry_map (job_id, industry_id)
  SELECT j.id, i.id FROM job_clusters j, industries i WHERE j.code = 'EE.DIGITAL_SOC' AND i.code = 'TELCO'
  ON CONFLICT DO NOTHING;
INSERT INTO job_cluster_tracks (job_id, track_code)
  SELECT id, 'UNIV_HIGH' FROM job_clusters WHERE code = 'EE.DIGITAL_SOC' ON CONFLICT DO NOTHING;
INSERT INTO job_cluster_tracks (job_id, track_code)
  SELECT id, 'GRAD' FROM job_clusters WHERE code = 'EE.DIGITAL_SOC' ON CONFLICT DO NOTHING;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'CODE', 0.28 FROM job_clusters WHERE code = 'EE.DIGITAL_SOC'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'DESIGN', 0.26 FROM job_clusters WHERE code = 'EE.DIGITAL_SOC'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'ANALYZE', 0.22 FROM job_clusters WHERE code = 'EE.DIGITAL_SOC'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'RESEARCH', 0.12 FROM job_clusters WHERE code = 'EE.DIGITAL_SOC'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'OPTIMIZE', 0.08 FROM job_clusters WHERE code = 'EE.DIGITAL_SOC'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'BUILD', 0.04 FROM job_clusters WHERE code = 'EE.DIGITAL_SOC'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 5, 3 FROM job_clusters j, competencies c WHERE j.code = 'EE.DIGITAL_SOC' AND c.code = 'SW.VERILOG'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'EE.DIGITAL_SOC' AND c.code = 'EE.DIGITAL'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'EE.DIGITAL_SOC' AND c.code = 'EE.VLSI'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'EE.DIGITAL_SOC' AND c.code = 'SW.SYNOPSYS'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'EE.DIGITAL_SOC' AND c.code = 'SW.FPGA'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'EE.DIGITAL_SOC' AND c.code = 'EE.MCU'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'EE.DIGITAL_SOC' AND c.code = 'SW.PYTHON'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'EE.DIGITAL_SOC' AND c.code = 'SW.GIT'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'EE.DIGITAL_SOC' AND c.code = 'EE.SIGSYS'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 2, 1 FROM job_clusters j, competencies c WHERE j.code = 'EE.DIGITAL_SOC' AND c.code = 'EE.EMC'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'EE.DIGITAL_SOC' AND c.code = 'CM.ENG'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_clusters (major_id, code, onet_code, sort_no)
  SELECT id, 'EE.EMBEDDED', '17-2061.00', 4 FROM majors WHERE code = 'EE'
  ON CONFLICT (major_id, code) DO UPDATE SET onet_code = EXCLUDED.onet_code, sort_no = EXCLUDED.sort_no;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'job_clusters', id, 'ko', 'name', '임베디드 SW·펌웨어' FROM job_clusters WHERE code = 'EE.EMBEDDED'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'job_clusters', id, 'en', 'name', 'Embedded Software Engineer' FROM job_clusters WHERE code = 'EE.EMBEDDED'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO job_industry_map (job_id, industry_id)
  SELECT j.id, i.id FROM job_clusters j, industries i WHERE j.code = 'EE.EMBEDDED' AND i.code = 'AUTO'
  ON CONFLICT DO NOTHING;
INSERT INTO job_industry_map (job_id, industry_id)
  SELECT j.id, i.id FROM job_clusters j, industries i WHERE j.code = 'EE.EMBEDDED' AND i.code = 'ROBOT'
  ON CONFLICT DO NOTHING;
INSERT INTO job_industry_map (job_id, industry_id)
  SELECT j.id, i.id FROM job_clusters j, industries i WHERE j.code = 'EE.EMBEDDED' AND i.code = 'MED'
  ON CONFLICT DO NOTHING;
INSERT INTO job_industry_map (job_id, industry_id)
  SELECT j.id, i.id FROM job_clusters j, industries i WHERE j.code = 'EE.EMBEDDED' AND i.code = 'MACH'
  ON CONFLICT DO NOTHING;
INSERT INTO job_cluster_tracks (job_id, track_code)
  SELECT id, 'HS' FROM job_clusters WHERE code = 'EE.EMBEDDED' ON CONFLICT DO NOTHING;
INSERT INTO job_cluster_tracks (job_id, track_code)
  SELECT id, 'UNIV_LOW' FROM job_clusters WHERE code = 'EE.EMBEDDED' ON CONFLICT DO NOTHING;
INSERT INTO job_cluster_tracks (job_id, track_code)
  SELECT id, 'UNIV_HIGH' FROM job_clusters WHERE code = 'EE.EMBEDDED' ON CONFLICT DO NOTHING;
INSERT INTO job_cluster_tracks (job_id, track_code)
  SELECT id, 'GRAD' FROM job_clusters WHERE code = 'EE.EMBEDDED' ON CONFLICT DO NOTHING;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'CODE', 0.36 FROM job_clusters WHERE code = 'EE.EMBEDDED'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'BUILD', 0.22 FROM job_clusters WHERE code = 'EE.EMBEDDED'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'DESIGN', 0.16 FROM job_clusters WHERE code = 'EE.EMBEDDED'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'ANALYZE', 0.14 FROM job_clusters WHERE code = 'EE.EMBEDDED'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'OPTIMIZE', 0.08 FROM job_clusters WHERE code = 'EE.EMBEDDED'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'FIELD', 0.04 FROM job_clusters WHERE code = 'EE.EMBEDDED'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 5, 3 FROM job_clusters j, competencies c WHERE j.code = 'EE.EMBEDDED' AND c.code = 'SW.C_EMB'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'EE.EMBEDDED' AND c.code = 'EE.EMBED'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'EE.EMBEDDED' AND c.code = 'EE.MCU'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 3 FROM job_clusters j, competencies c WHERE j.code = 'EE.EMBEDDED' AND c.code = 'SW.RTOS'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'EE.EMBEDDED' AND c.code = 'EE.DIGITAL'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'EE.EMBEDDED' AND c.code = 'SW.GIT'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'EE.EMBEDDED' AND c.code = 'SW.SCOPE'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'EE.EMBEDDED' AND c.code = 'EE.INSTR'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'EE.EMBEDDED' AND c.code = 'SW.PYTHON'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 2, 1 FROM job_clusters j, competencies c WHERE j.code = 'EE.EMBEDDED' AND c.code = 'DM.AUTO_E'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'EE.EMBEDDED' AND c.code = 'CM.COLLAB'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_clusters (major_id, code, onet_code, sort_no)
  SELECT id, 'EE.POWER', '17-2071.00', 5 FROM majors WHERE code = 'EE'
  ON CONFLICT (major_id, code) DO UPDATE SET onet_code = EXCLUDED.onet_code, sort_no = EXCLUDED.sort_no;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'job_clusters', id, 'ko', 'name', '전력전자·전력시스템' FROM job_clusters WHERE code = 'EE.POWER'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'job_clusters', id, 'en', 'name', 'Power Electronics / Power Systems Engineer' FROM job_clusters WHERE code = 'EE.POWER'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO job_industry_map (job_id, industry_id)
  SELECT j.id, i.id FROM job_clusters j, industries i WHERE j.code = 'EE.POWER' AND i.code = 'POWER'
  ON CONFLICT DO NOTHING;
INSERT INTO job_industry_map (job_id, industry_id)
  SELECT j.id, i.id FROM job_clusters j, industries i WHERE j.code = 'EE.POWER' AND i.code = 'BATT'
  ON CONFLICT DO NOTHING;
INSERT INTO job_industry_map (job_id, industry_id)
  SELECT j.id, i.id FROM job_clusters j, industries i WHERE j.code = 'EE.POWER' AND i.code = 'AUTO'
  ON CONFLICT DO NOTHING;
INSERT INTO job_cluster_tracks (job_id, track_code)
  SELECT id, 'HS' FROM job_clusters WHERE code = 'EE.POWER' ON CONFLICT DO NOTHING;
INSERT INTO job_cluster_tracks (job_id, track_code)
  SELECT id, 'UNIV_LOW' FROM job_clusters WHERE code = 'EE.POWER' ON CONFLICT DO NOTHING;
INSERT INTO job_cluster_tracks (job_id, track_code)
  SELECT id, 'UNIV_HIGH' FROM job_clusters WHERE code = 'EE.POWER' ON CONFLICT DO NOTHING;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'ANALYZE', 0.28 FROM job_clusters WHERE code = 'EE.POWER'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'DESIGN', 0.22 FROM job_clusters WHERE code = 'EE.POWER'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'BUILD', 0.18 FROM job_clusters WHERE code = 'EE.POWER'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'FIELD', 0.18 FROM job_clusters WHERE code = 'EE.POWER'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'OPTIMIZE', 0.1 FROM job_clusters WHERE code = 'EE.POWER'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'RESEARCH', 0.04 FROM job_clusters WHERE code = 'EE.POWER'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'EE.POWER' AND c.code = 'EE.POWERELEC'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'EE.POWER' AND c.code = 'EE.MOTOR'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'EE.POWER' AND c.code = 'EE.CIRCUIT'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 3 FROM job_clusters j, competencies c WHERE j.code = 'EE.POWER' AND c.code = 'EE.CTRL'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'EE.POWER' AND c.code = 'SW.SIMULINK'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'EE.POWER' AND c.code = 'EE.POWERSYS'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'EE.POWER' AND c.code = 'DM.GRID'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'EE.POWER' AND c.code = 'SW.PCB'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'EE.POWER' AND c.code = 'SW.SCOPE'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'EE.POWER' AND c.code = 'CM.STD_EE'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 2, 1 FROM job_clusters j, competencies c WHERE j.code = 'EE.POWER' AND c.code = 'DM.BMS'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_clusters (major_id, code, onet_code, sort_no)
  SELECT id, 'EE.AUTO_ELEC', '17-2072.00', 6 FROM majors WHERE code = 'EE'
  ON CONFLICT (major_id, code) DO UPDATE SET onet_code = EXCLUDED.onet_code, sort_no = EXCLUDED.sort_no;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'job_clusters', id, 'ko', 'name', '자동차 전장·ADAS' FROM job_clusters WHERE code = 'EE.AUTO_ELEC'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'job_clusters', id, 'en', 'name', 'Automotive Electronics Engineer' FROM job_clusters WHERE code = 'EE.AUTO_ELEC'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO job_industry_map (job_id, industry_id)
  SELECT j.id, i.id FROM job_clusters j, industries i WHERE j.code = 'EE.AUTO_ELEC' AND i.code = 'AUTO'
  ON CONFLICT DO NOTHING;
INSERT INTO job_cluster_tracks (job_id, track_code)
  SELECT id, 'UNIV_LOW' FROM job_clusters WHERE code = 'EE.AUTO_ELEC' ON CONFLICT DO NOTHING;
INSERT INTO job_cluster_tracks (job_id, track_code)
  SELECT id, 'UNIV_HIGH' FROM job_clusters WHERE code = 'EE.AUTO_ELEC' ON CONFLICT DO NOTHING;
INSERT INTO job_cluster_tracks (job_id, track_code)
  SELECT id, 'GRAD' FROM job_clusters WHERE code = 'EE.AUTO_ELEC' ON CONFLICT DO NOTHING;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'DESIGN', 0.24 FROM job_clusters WHERE code = 'EE.AUTO_ELEC'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'CODE', 0.22 FROM job_clusters WHERE code = 'EE.AUTO_ELEC'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'ANALYZE', 0.2 FROM job_clusters WHERE code = 'EE.AUTO_ELEC'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'BUILD', 0.18 FROM job_clusters WHERE code = 'EE.AUTO_ELEC'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'OPTIMIZE', 0.1 FROM job_clusters WHERE code = 'EE.AUTO_ELEC'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'FIELD', 0.06 FROM job_clusters WHERE code = 'EE.AUTO_ELEC'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'EE.AUTO_ELEC' AND c.code = 'DM.AUTO_E'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'EE.AUTO_ELEC' AND c.code = 'EE.EMBED'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'EE.AUTO_ELEC' AND c.code = 'SW.C_EMB'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'EE.AUTO_ELEC' AND c.code = 'CM.STD_EE'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'EE.AUTO_ELEC' AND c.code = 'SW.PCB'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'EE.AUTO_ELEC' AND c.code = 'EE.EMC'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'EE.AUTO_ELEC' AND c.code = 'EE.INSTR'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'EE.AUTO_ELEC' AND c.code = 'SW.SIMULINK'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'EE.AUTO_ELEC' AND c.code = 'EE.CTRL'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'EE.AUTO_ELEC' AND c.code = 'SW.GIT'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'EE.AUTO_ELEC' AND c.code = 'CM.ENG'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_clusters (major_id, code, onet_code, sort_no)
  SELECT id, 'EE.COMM_SYS', '17-2072.00', 7 FROM majors WHERE code = 'EE'
  ON CONFLICT (major_id, code) DO UPDATE SET onet_code = EXCLUDED.onet_code, sort_no = EXCLUDED.sort_no;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'job_clusters', id, 'ko', 'name', '통신·네트워크 시스템' FROM job_clusters WHERE code = 'EE.COMM_SYS'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'job_clusters', id, 'en', 'name', 'Communication Systems Engineer' FROM job_clusters WHERE code = 'EE.COMM_SYS'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO job_industry_map (job_id, industry_id)
  SELECT j.id, i.id FROM job_clusters j, industries i WHERE j.code = 'EE.COMM_SYS' AND i.code = 'TELCO'
  ON CONFLICT DO NOTHING;
INSERT INTO job_industry_map (job_id, industry_id)
  SELECT j.id, i.id FROM job_clusters j, industries i WHERE j.code = 'EE.COMM_SYS' AND i.code = 'DEF'
  ON CONFLICT DO NOTHING;
INSERT INTO job_industry_map (job_id, industry_id)
  SELECT j.id, i.id FROM job_clusters j, industries i WHERE j.code = 'EE.COMM_SYS' AND i.code = 'AERO'
  ON CONFLICT DO NOTHING;
INSERT INTO job_cluster_tracks (job_id, track_code)
  SELECT id, 'UNIV_HIGH' FROM job_clusters WHERE code = 'EE.COMM_SYS' ON CONFLICT DO NOTHING;
INSERT INTO job_cluster_tracks (job_id, track_code)
  SELECT id, 'GRAD' FROM job_clusters WHERE code = 'EE.COMM_SYS' ON CONFLICT DO NOTHING;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'ANALYZE', 0.3 FROM job_clusters WHERE code = 'EE.COMM_SYS'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'CODE', 0.22 FROM job_clusters WHERE code = 'EE.COMM_SYS'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'RESEARCH', 0.2 FROM job_clusters WHERE code = 'EE.COMM_SYS'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'DESIGN', 0.14 FROM job_clusters WHERE code = 'EE.COMM_SYS'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'BUILD', 0.1 FROM job_clusters WHERE code = 'EE.COMM_SYS'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'FIELD', 0.04 FROM job_clusters WHERE code = 'EE.COMM_SYS'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'EE.COMM_SYS' AND c.code = 'EE.COMM'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'EE.COMM_SYS' AND c.code = 'EE.DSP'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'EE.COMM_SYS' AND c.code = 'EE.SIGSYS'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'EE.COMM_SYS' AND c.code = 'EE.PROB'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'EE.COMM_SYS' AND c.code = 'SW.MATLAB'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'EE.COMM_SYS' AND c.code = 'DM.MODEM'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'EE.COMM_SYS' AND c.code = 'EE.RF'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'EE.COMM_SYS' AND c.code = 'SW.PYTHON'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 2, 1 FROM job_clusters j, competencies c WHERE j.code = 'EE.COMM_SYS' AND c.code = 'SW.FPGA'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'EE.COMM_SYS' AND c.code = 'CM.ENG'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_clusters (major_id, code, onet_code, sort_no)
  SELECT id, 'EE.HW_TEST', '17-3023.00', 8 FROM majors WHERE code = 'EE'
  ON CONFLICT (major_id, code) DO UPDATE SET onet_code = EXCLUDED.onet_code, sort_no = EXCLUDED.sort_no;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'job_clusters', id, 'ko', 'name', '하드웨어 시험·신뢰성' FROM job_clusters WHERE code = 'EE.HW_TEST'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'job_clusters', id, 'en', 'name', 'Hardware Test & Reliability Engineer' FROM job_clusters WHERE code = 'EE.HW_TEST'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO job_industry_map (job_id, industry_id)
  SELECT j.id, i.id FROM job_clusters j, industries i WHERE j.code = 'EE.HW_TEST' AND i.code = 'SEMI'
  ON CONFLICT DO NOTHING;
INSERT INTO job_industry_map (job_id, industry_id)
  SELECT j.id, i.id FROM job_clusters j, industries i WHERE j.code = 'EE.HW_TEST' AND i.code = 'AUTO'
  ON CONFLICT DO NOTHING;
INSERT INTO job_industry_map (job_id, industry_id)
  SELECT j.id, i.id FROM job_clusters j, industries i WHERE j.code = 'EE.HW_TEST' AND i.code = 'MED'
  ON CONFLICT DO NOTHING;
INSERT INTO job_industry_map (job_id, industry_id)
  SELECT j.id, i.id FROM job_clusters j, industries i WHERE j.code = 'EE.HW_TEST' AND i.code = 'TELCO'
  ON CONFLICT DO NOTHING;
INSERT INTO job_cluster_tracks (job_id, track_code)
  SELECT id, 'HS' FROM job_clusters WHERE code = 'EE.HW_TEST' ON CONFLICT DO NOTHING;
INSERT INTO job_cluster_tracks (job_id, track_code)
  SELECT id, 'UNIV_LOW' FROM job_clusters WHERE code = 'EE.HW_TEST' ON CONFLICT DO NOTHING;
INSERT INTO job_cluster_tracks (job_id, track_code)
  SELECT id, 'UNIV_HIGH' FROM job_clusters WHERE code = 'EE.HW_TEST' ON CONFLICT DO NOTHING;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'BUILD', 0.28 FROM job_clusters WHERE code = 'EE.HW_TEST'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'OPTIMIZE', 0.22 FROM job_clusters WHERE code = 'EE.HW_TEST'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'ANALYZE', 0.2 FROM job_clusters WHERE code = 'EE.HW_TEST'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'FIELD', 0.18 FROM job_clusters WHERE code = 'EE.HW_TEST'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'ORCHESTRATE', 0.08 FROM job_clusters WHERE code = 'EE.HW_TEST'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'CODE', 0.04 FROM job_clusters WHERE code = 'EE.HW_TEST'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'EE.HW_TEST' AND c.code = 'SW.SCOPE'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'EE.HW_TEST' AND c.code = 'EE.INSTR'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'EE.HW_TEST' AND c.code = 'CM.STD_EE'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 3 FROM job_clusters j, competencies c WHERE j.code = 'EE.HW_TEST' AND c.code = 'EE.EMC'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'EE.HW_TEST' AND c.code = 'SW.LABVIEW'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'EE.HW_TEST' AND c.code = 'EE.CIRCUIT'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'EE.HW_TEST' AND c.code = 'SW.PYTHON'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'EE.HW_TEST' AND c.code = 'CM.DOC'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'EE.HW_TEST' AND c.code = 'EE.PROB'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 2, 1 FROM job_clusters j, competencies c WHERE j.code = 'EE.HW_TEST' AND c.code = 'SW.PCB'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;

-- ======== CE 컴퓨터공학 ========
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('CE.MATH', 'theory', 'L1', (SELECT id FROM majors WHERE code = 'CE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '이산수학·선형대수' FROM competencies WHERE code = 'CE.MATH'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Discrete Math & Linear Algebra' FROM competencies WHERE code = 'CE.MATH'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('이산수학·선형대수') FROM competencies WHERE code = 'CE.MATH'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Discrete Math & Linear Algebra') FROM competencies WHERE code = 'CE.MATH'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('이산구조') FROM competencies WHERE code = 'CE.MATH'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('행렬') FROM competencies WHERE code = 'CE.MATH'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('CE.PROB', 'theory', 'L1', (SELECT id FROM majors WHERE code = 'CE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '확률·통계' FROM competencies WHERE code = 'CE.PROB'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Probability & Statistics' FROM competencies WHERE code = 'CE.PROB'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('확률·통계') FROM competencies WHERE code = 'CE.PROB'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Probability & Statistics') FROM competencies WHERE code = 'CE.PROB'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('통계학') FROM competencies WHERE code = 'CE.PROB'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('CE.DS', 'theory', 'L2', (SELECT id FROM majors WHERE code = 'CE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '자료구조' FROM competencies WHERE code = 'CE.DS'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Data Structures' FROM competencies WHERE code = 'CE.DS'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('자료구조') FROM competencies WHERE code = 'CE.DS'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Data Structures') FROM competencies WHERE code = 'CE.DS'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('트리') FROM competencies WHERE code = 'CE.DS'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('그래프') FROM competencies WHERE code = 'CE.DS'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('해시') FROM competencies WHERE code = 'CE.DS'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('CE.ALGO', 'theory', 'L2', (SELECT id FROM majors WHERE code = 'CE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '알고리즘' FROM competencies WHERE code = 'CE.ALGO'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Algorithms' FROM competencies WHERE code = 'CE.ALGO'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('알고리즘') FROM competencies WHERE code = 'CE.ALGO'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Algorithms') FROM competencies WHERE code = 'CE.ALGO'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('복잡도') FROM competencies WHERE code = 'CE.ALGO'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('동적계획법') FROM competencies WHERE code = 'CE.ALGO'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('코딩테스트') FROM competencies WHERE code = 'CE.ALGO'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('CE.OS', 'theory', 'L2', (SELECT id FROM majors WHERE code = 'CE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '운영체제' FROM competencies WHERE code = 'CE.OS'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Operating Systems' FROM competencies WHERE code = 'CE.OS'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('운영체제') FROM competencies WHERE code = 'CE.OS'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Operating Systems') FROM competencies WHERE code = 'CE.OS'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('프로세스') FROM competencies WHERE code = 'CE.OS'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('스케줄링') FROM competencies WHERE code = 'CE.OS'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('동시성') FROM competencies WHERE code = 'CE.OS'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('CE.ARCH', 'theory', 'L2', (SELECT id FROM majors WHERE code = 'CE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '컴퓨터구조' FROM competencies WHERE code = 'CE.ARCH'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Computer Architecture' FROM competencies WHERE code = 'CE.ARCH'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('컴퓨터구조') FROM competencies WHERE code = 'CE.ARCH'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Computer Architecture') FROM competencies WHERE code = 'CE.ARCH'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('파이프라인') FROM competencies WHERE code = 'CE.ARCH'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('캐시') FROM competencies WHERE code = 'CE.ARCH'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('CE.NET', 'theory', 'L2', (SELECT id FROM majors WHERE code = 'CE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '컴퓨터 네트워크' FROM competencies WHERE code = 'CE.NET'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Computer Networks' FROM competencies WHERE code = 'CE.NET'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('컴퓨터 네트워크') FROM competencies WHERE code = 'CE.NET'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Computer Networks') FROM competencies WHERE code = 'CE.NET'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('TCP/IP') FROM competencies WHERE code = 'CE.NET'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('HTTP') FROM competencies WHERE code = 'CE.NET'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('소켓') FROM competencies WHERE code = 'CE.NET'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('CE.DB', 'theory', 'L2', (SELECT id FROM majors WHERE code = 'CE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '데이터베이스' FROM competencies WHERE code = 'CE.DB'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Databases' FROM competencies WHERE code = 'CE.DB'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('데이터베이스') FROM competencies WHERE code = 'CE.DB'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Databases') FROM competencies WHERE code = 'CE.DB'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('정규화') FROM competencies WHERE code = 'CE.DB'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('트랜잭션') FROM competencies WHERE code = 'CE.DB'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('인덱스') FROM competencies WHERE code = 'CE.DB'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('CE.SE', 'theory', 'L2', (SELECT id FROM majors WHERE code = 'CE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '소프트웨어공학' FROM competencies WHERE code = 'CE.SE'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Software Engineering' FROM competencies WHERE code = 'CE.SE'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('소프트웨어공학') FROM competencies WHERE code = 'CE.SE'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Software Engineering') FROM competencies WHERE code = 'CE.SE'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('설계패턴') FROM competencies WHERE code = 'CE.SE'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('테스트') FROM competencies WHERE code = 'CE.SE'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('요구공학') FROM competencies WHERE code = 'CE.SE'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('CE.COMP', 'theory', 'L2', (SELECT id FROM majors WHERE code = 'CE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '컴파일러·언어이론' FROM competencies WHERE code = 'CE.COMP'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Compilers' FROM competencies WHERE code = 'CE.COMP'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('컴파일러·언어이론') FROM competencies WHERE code = 'CE.COMP'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Compilers') FROM competencies WHERE code = 'CE.COMP'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('파서') FROM competencies WHERE code = 'CE.COMP'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('형식언어') FROM competencies WHERE code = 'CE.COMP'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('CE.DIST', 'theory', 'L2', (SELECT id FROM majors WHERE code = 'CE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '분산·병렬 시스템' FROM competencies WHERE code = 'CE.DIST'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Distributed Systems' FROM competencies WHERE code = 'CE.DIST'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('분산·병렬 시스템') FROM competencies WHERE code = 'CE.DIST'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Distributed Systems') FROM competencies WHERE code = 'CE.DIST'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('합의') FROM competencies WHERE code = 'CE.DIST'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('샤딩') FROM competencies WHERE code = 'CE.DIST'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('병렬처리') FROM competencies WHERE code = 'CE.DIST'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('CE.SEC', 'theory', 'L2', (SELECT id FROM majors WHERE code = 'CE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '정보보안' FROM competencies WHERE code = 'CE.SEC'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Information Security' FROM competencies WHERE code = 'CE.SEC'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('정보보안') FROM competencies WHERE code = 'CE.SEC'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Information Security') FROM competencies WHERE code = 'CE.SEC'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('암호학') FROM competencies WHERE code = 'CE.SEC'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('취약점') FROM competencies WHERE code = 'CE.SEC'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('인증') FROM competencies WHERE code = 'CE.SEC'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('CE.AI', 'theory', 'L2', (SELECT id FROM majors WHERE code = 'CE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '인공지능' FROM competencies WHERE code = 'CE.AI'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Artificial Intelligence' FROM competencies WHERE code = 'CE.AI'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('인공지능') FROM competencies WHERE code = 'CE.AI'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Artificial Intelligence') FROM competencies WHERE code = 'CE.AI'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('탐색') FROM competencies WHERE code = 'CE.AI'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('추론') FROM competencies WHERE code = 'CE.AI'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('CE.ML', 'theory', 'L2', (SELECT id FROM majors WHERE code = 'CE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '기계학습' FROM competencies WHERE code = 'CE.ML'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Machine Learning' FROM competencies WHERE code = 'CE.ML'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('기계학습') FROM competencies WHERE code = 'CE.ML'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Machine Learning') FROM competencies WHERE code = 'CE.ML'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('회귀') FROM competencies WHERE code = 'CE.ML'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('분류') FROM competencies WHERE code = 'CE.ML'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('모델평가') FROM competencies WHERE code = 'CE.ML'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('CE.DL', 'theory', 'L2', (SELECT id FROM majors WHERE code = 'CE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '딥러닝' FROM competencies WHERE code = 'CE.DL'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Deep Learning' FROM competencies WHERE code = 'CE.DL'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('딥러닝') FROM competencies WHERE code = 'CE.DL'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Deep Learning') FROM competencies WHERE code = 'CE.DL'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('CNN') FROM competencies WHERE code = 'CE.DL'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Transformer') FROM competencies WHERE code = 'CE.DL'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('LLM') FROM competencies WHERE code = 'CE.DL'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('CE.CG', 'theory', 'L2', (SELECT id FROM majors WHERE code = 'CE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '컴퓨터그래픽스' FROM competencies WHERE code = 'CE.CG'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Computer Graphics' FROM competencies WHERE code = 'CE.CG'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('컴퓨터그래픽스') FROM competencies WHERE code = 'CE.CG'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Computer Graphics') FROM competencies WHERE code = 'CE.CG'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('렌더링') FROM competencies WHERE code = 'CE.CG'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('셰이더') FROM competencies WHERE code = 'CE.CG'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('CE.HCI', 'theory', 'L2', (SELECT id FROM majors WHERE code = 'CE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', 'HCI·UX' FROM competencies WHERE code = 'CE.HCI'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Human-Computer Interaction' FROM competencies WHERE code = 'CE.HCI'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('HCI·UX') FROM competencies WHERE code = 'CE.HCI'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Human-Computer Interaction') FROM competencies WHERE code = 'CE.HCI'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('사용성') FROM competencies WHERE code = 'CE.HCI'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('인터랙션') FROM competencies WHERE code = 'CE.HCI'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('CE.EMBEDSW', 'theory', 'L2', (SELECT id FROM majors WHERE code = 'CE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '시스템·임베디드 SW' FROM competencies WHERE code = 'CE.EMBEDSW'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Systems Programming' FROM competencies WHERE code = 'CE.EMBEDSW'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('시스템·임베디드 SW') FROM competencies WHERE code = 'CE.EMBEDSW'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Systems Programming') FROM competencies WHERE code = 'CE.EMBEDSW'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('커널') FROM competencies WHERE code = 'CE.EMBEDSW'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('드라이버') FROM competencies WHERE code = 'CE.EMBEDSW'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('펌웨어') FROM competencies WHERE code = 'CE.EMBEDSW'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('SW.PYTHON', 'software', 'L3', (SELECT id FROM majors WHERE code = 'CE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', 'Python' FROM competencies WHERE code = 'SW.PYTHON'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Python' FROM competencies WHERE code = 'SW.PYTHON'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Python') FROM competencies WHERE code = 'SW.PYTHON'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Python') FROM competencies WHERE code = 'SW.PYTHON'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('파이썬') FROM competencies WHERE code = 'SW.PYTHON'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('SW.JAVA', 'software', 'L3', (SELECT id FROM majors WHERE code = 'CE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', 'Java' FROM competencies WHERE code = 'SW.JAVA'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Java' FROM competencies WHERE code = 'SW.JAVA'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Java') FROM competencies WHERE code = 'SW.JAVA'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Java') FROM competencies WHERE code = 'SW.JAVA'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('자바') FROM competencies WHERE code = 'SW.JAVA'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Kotlin') FROM competencies WHERE code = 'SW.JAVA'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('SW.CPP', 'software', 'L3', (SELECT id FROM majors WHERE code = 'CE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', 'C·C++' FROM competencies WHERE code = 'SW.CPP'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'C/C++' FROM competencies WHERE code = 'SW.CPP'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('C·C++') FROM competencies WHERE code = 'SW.CPP'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('C/C++') FROM competencies WHERE code = 'SW.CPP'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('씨') FROM competencies WHERE code = 'SW.CPP'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('씨쁠쁠') FROM competencies WHERE code = 'SW.CPP'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('SW.JS', 'software', 'L3', (SELECT id FROM majors WHERE code = 'CE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', 'JavaScript·TypeScript' FROM competencies WHERE code = 'SW.JS'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'JavaScript/TypeScript' FROM competencies WHERE code = 'SW.JS'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('JavaScript·TypeScript') FROM competencies WHERE code = 'SW.JS'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('JavaScript/TypeScript') FROM competencies WHERE code = 'SW.JS'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('JS') FROM competencies WHERE code = 'SW.JS'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('TS') FROM competencies WHERE code = 'SW.JS'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('SW.GO', 'software', 'L3', (SELECT id FROM majors WHERE code = 'CE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', 'Go·Rust' FROM competencies WHERE code = 'SW.GO'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Go/Rust' FROM competencies WHERE code = 'SW.GO'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Go·Rust') FROM competencies WHERE code = 'SW.GO'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Go/Rust') FROM competencies WHERE code = 'SW.GO'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('고랭') FROM competencies WHERE code = 'SW.GO'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('러스트') FROM competencies WHERE code = 'SW.GO'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('SW.SQL', 'software', 'L3', (SELECT id FROM majors WHERE code = 'CE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', 'SQL' FROM competencies WHERE code = 'SW.SQL'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'SQL' FROM competencies WHERE code = 'SW.SQL'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('SQL') FROM competencies WHERE code = 'SW.SQL'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('SQL') FROM competencies WHERE code = 'SW.SQL'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('쿼리') FROM competencies WHERE code = 'SW.SQL'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('PostgreSQL') FROM competencies WHERE code = 'SW.SQL'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('MySQL') FROM competencies WHERE code = 'SW.SQL'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('SW.SPRING', 'software', 'L3', (SELECT id FROM majors WHERE code = 'CE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', 'Spring' FROM competencies WHERE code = 'SW.SPRING'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Spring' FROM competencies WHERE code = 'SW.SPRING'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Spring') FROM competencies WHERE code = 'SW.SPRING'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Spring') FROM competencies WHERE code = 'SW.SPRING'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('스프링') FROM competencies WHERE code = 'SW.SPRING'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Spring Boot') FROM competencies WHERE code = 'SW.SPRING'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('SW.NODE', 'software', 'L3', (SELECT id FROM majors WHERE code = 'CE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', 'Node.js' FROM competencies WHERE code = 'SW.NODE'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Node.js' FROM competencies WHERE code = 'SW.NODE'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Node.js') FROM competencies WHERE code = 'SW.NODE'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Node.js') FROM competencies WHERE code = 'SW.NODE'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Express') FROM competencies WHERE code = 'SW.NODE'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('NestJS') FROM competencies WHERE code = 'SW.NODE'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('SW.DJANGO', 'software', 'L3', (SELECT id FROM majors WHERE code = 'CE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', 'Django·FastAPI' FROM competencies WHERE code = 'SW.DJANGO'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Django/FastAPI' FROM competencies WHERE code = 'SW.DJANGO'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Django·FastAPI') FROM competencies WHERE code = 'SW.DJANGO'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Django/FastAPI') FROM competencies WHERE code = 'SW.DJANGO'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('파이썬 웹') FROM competencies WHERE code = 'SW.DJANGO'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('SW.REACT', 'software', 'L3', (SELECT id FROM majors WHERE code = 'CE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', 'React·Next.js' FROM competencies WHERE code = 'SW.REACT'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'React' FROM competencies WHERE code = 'SW.REACT'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('React·Next.js') FROM competencies WHERE code = 'SW.REACT'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('React') FROM competencies WHERE code = 'SW.REACT'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('리액트') FROM competencies WHERE code = 'SW.REACT'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Vue') FROM competencies WHERE code = 'SW.REACT'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('프론트엔드 프레임워크') FROM competencies WHERE code = 'SW.REACT'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('SW.PYTORCH', 'software', 'L3', (SELECT id FROM majors WHERE code = 'CE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', 'PyTorch' FROM competencies WHERE code = 'SW.PYTORCH'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'PyTorch' FROM competencies WHERE code = 'SW.PYTORCH'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('PyTorch') FROM competencies WHERE code = 'SW.PYTORCH'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('PyTorch') FROM competencies WHERE code = 'SW.PYTORCH'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('TensorFlow') FROM competencies WHERE code = 'SW.PYTORCH'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('딥러닝 프레임워크') FROM competencies WHERE code = 'SW.PYTORCH'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('SW.PANDAS', 'software', 'L3', (SELECT id FROM majors WHERE code = 'CE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', 'Pandas·NumPy' FROM competencies WHERE code = 'SW.PANDAS'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Pandas/NumPy' FROM competencies WHERE code = 'SW.PANDAS'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Pandas·NumPy') FROM competencies WHERE code = 'SW.PANDAS'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Pandas/NumPy') FROM competencies WHERE code = 'SW.PANDAS'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('데이터 분석 라이브러리') FROM competencies WHERE code = 'SW.PANDAS'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('SW.SPARK', 'software', 'L3', (SELECT id FROM majors WHERE code = 'CE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', 'Spark·Kafka' FROM competencies WHERE code = 'SW.SPARK'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Spark/Kafka' FROM competencies WHERE code = 'SW.SPARK'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Spark·Kafka') FROM competencies WHERE code = 'SW.SPARK'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Spark/Kafka') FROM competencies WHERE code = 'SW.SPARK'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('대용량 처리') FROM competencies WHERE code = 'SW.SPARK'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('스트리밍') FROM competencies WHERE code = 'SW.SPARK'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('SW.AIRFLOW', 'software', 'L3', (SELECT id FROM majors WHERE code = 'CE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', 'Airflow·dbt' FROM competencies WHERE code = 'SW.AIRFLOW'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Airflow/dbt' FROM competencies WHERE code = 'SW.AIRFLOW'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Airflow·dbt') FROM competencies WHERE code = 'SW.AIRFLOW'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Airflow/dbt') FROM competencies WHERE code = 'SW.AIRFLOW'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('워크플로') FROM competencies WHERE code = 'SW.AIRFLOW'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('ELT') FROM competencies WHERE code = 'SW.AIRFLOW'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('SW.DOCKER', 'software', 'L3', (SELECT id FROM majors WHERE code = 'CE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', 'Docker' FROM competencies WHERE code = 'SW.DOCKER'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Docker' FROM competencies WHERE code = 'SW.DOCKER'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Docker') FROM competencies WHERE code = 'SW.DOCKER'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Docker') FROM competencies WHERE code = 'SW.DOCKER'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('컨테이너') FROM competencies WHERE code = 'SW.DOCKER'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('SW.K8S', 'software', 'L3', (SELECT id FROM majors WHERE code = 'CE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', 'Kubernetes' FROM competencies WHERE code = 'SW.K8S'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Kubernetes' FROM competencies WHERE code = 'SW.K8S'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Kubernetes') FROM competencies WHERE code = 'SW.K8S'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Kubernetes') FROM competencies WHERE code = 'SW.K8S'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('쿠버네티스') FROM competencies WHERE code = 'SW.K8S'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('K8s') FROM competencies WHERE code = 'SW.K8S'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('SW.CLOUD', 'software', 'L3', (SELECT id FROM majors WHERE code = 'CE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', 'AWS·GCP·Azure' FROM competencies WHERE code = 'SW.CLOUD'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Cloud Platforms' FROM competencies WHERE code = 'SW.CLOUD'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('AWS·GCP·Azure') FROM competencies WHERE code = 'SW.CLOUD'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Cloud Platforms') FROM competencies WHERE code = 'SW.CLOUD'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('클라우드') FROM competencies WHERE code = 'SW.CLOUD'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('EC2') FROM competencies WHERE code = 'SW.CLOUD'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('S3') FROM competencies WHERE code = 'SW.CLOUD'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('SW.CICD', 'software', 'L3', (SELECT id FROM majors WHERE code = 'CE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', 'CI/CD' FROM competencies WHERE code = 'SW.CICD'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'CI/CD' FROM competencies WHERE code = 'SW.CICD'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('CI/CD') FROM competencies WHERE code = 'SW.CICD'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('CI/CD') FROM competencies WHERE code = 'SW.CICD'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('GitHub Actions') FROM competencies WHERE code = 'SW.CICD'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Jenkins') FROM competencies WHERE code = 'SW.CICD'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('배포 자동화') FROM competencies WHERE code = 'SW.CICD'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('SW.LINUX', 'software', 'L3', (SELECT id FROM majors WHERE code = 'CE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', 'Linux·셸' FROM competencies WHERE code = 'SW.LINUX'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Linux' FROM competencies WHERE code = 'SW.LINUX'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('Linux·셸') FROM competencies WHERE code = 'SW.LINUX'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Linux') FROM competencies WHERE code = 'SW.LINUX'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('리눅스') FROM competencies WHERE code = 'SW.LINUX'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('bash') FROM competencies WHERE code = 'SW.LINUX'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('서버운영') FROM competencies WHERE code = 'SW.LINUX'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('SW.GIT', 'software', 'L3', (SELECT id FROM majors WHERE code = 'CE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', 'Git' FROM competencies WHERE code = 'SW.GIT'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Git' FROM competencies WHERE code = 'SW.GIT'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Git') FROM competencies WHERE code = 'SW.GIT'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Git') FROM competencies WHERE code = 'SW.GIT'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('깃') FROM competencies WHERE code = 'SW.GIT'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('형상관리') FROM competencies WHERE code = 'SW.GIT'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('코드리뷰') FROM competencies WHERE code = 'SW.GIT'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('SW.TEST', 'software', 'L3', (SELECT id FROM majors WHERE code = 'CE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '테스트 자동화' FROM competencies WHERE code = 'SW.TEST'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Test Automation' FROM competencies WHERE code = 'SW.TEST'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('테스트 자동화') FROM competencies WHERE code = 'SW.TEST'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Test Automation') FROM competencies WHERE code = 'SW.TEST'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('단위테스트') FROM competencies WHERE code = 'SW.TEST'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('JUnit') FROM competencies WHERE code = 'SW.TEST'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('pytest') FROM competencies WHERE code = 'SW.TEST'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('E2E') FROM competencies WHERE code = 'SW.TEST'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('SW.MONITOR', 'software', 'L3', (SELECT id FROM majors WHERE code = 'CE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '모니터링·관측' FROM competencies WHERE code = 'SW.MONITOR'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Observability' FROM competencies WHERE code = 'SW.MONITOR'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('모니터링·관측') FROM competencies WHERE code = 'SW.MONITOR'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Observability') FROM competencies WHERE code = 'SW.MONITOR'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Prometheus') FROM competencies WHERE code = 'SW.MONITOR'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Grafana') FROM competencies WHERE code = 'SW.MONITOR'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('로그') FROM competencies WHERE code = 'SW.MONITOR'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('DM.BACKEND', 'domain', 'L4', (SELECT id FROM majors WHERE code = 'CE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '백엔드 아키텍처' FROM competencies WHERE code = 'DM.BACKEND'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Backend Architecture' FROM competencies WHERE code = 'DM.BACKEND'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('백엔드 아키텍처') FROM competencies WHERE code = 'DM.BACKEND'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Backend Architecture') FROM competencies WHERE code = 'DM.BACKEND'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('API 설계') FROM competencies WHERE code = 'DM.BACKEND'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('MSA') FROM competencies WHERE code = 'DM.BACKEND'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('캐시 전략') FROM competencies WHERE code = 'DM.BACKEND'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('DM.DATAENG', 'domain', 'L4', (SELECT id FROM majors WHERE code = 'CE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '데이터 파이프라인' FROM competencies WHERE code = 'DM.DATAENG'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Data Engineering' FROM competencies WHERE code = 'DM.DATAENG'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('데이터 파이프라인') FROM competencies WHERE code = 'DM.DATAENG'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Data Engineering') FROM competencies WHERE code = 'DM.DATAENG'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('ETL') FROM competencies WHERE code = 'DM.DATAENG'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('데이터 웨어하우스') FROM competencies WHERE code = 'DM.DATAENG'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('DM.MLOPS', 'domain', 'L4', (SELECT id FROM majors WHERE code = 'CE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', 'MLOps·모델 서빙' FROM competencies WHERE code = 'DM.MLOPS'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'MLOps' FROM competencies WHERE code = 'DM.MLOPS'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('MLOps·모델 서빙') FROM competencies WHERE code = 'DM.MLOPS'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('MLOps') FROM competencies WHERE code = 'DM.MLOPS'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('모델 배포') FROM competencies WHERE code = 'DM.MLOPS'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('피처스토어') FROM competencies WHERE code = 'DM.MLOPS'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('DM.SECOPS', 'domain', 'L4', (SELECT id FROM majors WHERE code = 'CE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '보안 운영·모의해킹' FROM competencies WHERE code = 'DM.SECOPS'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Security Operations' FROM competencies WHERE code = 'DM.SECOPS'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('보안 운영·모의해킹') FROM competencies WHERE code = 'DM.SECOPS'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Security Operations') FROM competencies WHERE code = 'DM.SECOPS'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('침해대응') FROM competencies WHERE code = 'DM.SECOPS'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('펜테스트') FROM competencies WHERE code = 'DM.SECOPS'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('SOC') FROM competencies WHERE code = 'DM.SECOPS'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('DM.MOBILE', 'domain', 'L4', (SELECT id FROM majors WHERE code = 'CE'))
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '모바일 앱' FROM competencies WHERE code = 'DM.MOBILE'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Mobile Development' FROM competencies WHERE code = 'DM.MOBILE'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('모바일 앱') FROM competencies WHERE code = 'DM.MOBILE'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Mobile Development') FROM competencies WHERE code = 'DM.MOBILE'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Android') FROM competencies WHERE code = 'DM.MOBILE'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('iOS') FROM competencies WHERE code = 'DM.MOBILE'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Flutter') FROM competencies WHERE code = 'DM.MOBILE'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('CM.DOC', 'soft', 'L5', NULL)
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '기술문서 작성' FROM competencies WHERE code = 'CM.DOC'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Technical Writing' FROM competencies WHERE code = 'CM.DOC'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('기술문서 작성') FROM competencies WHERE code = 'CM.DOC'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Technical Writing') FROM competencies WHERE code = 'CM.DOC'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('설계문서') FROM competencies WHERE code = 'CM.DOC'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('README') FROM competencies WHERE code = 'CM.DOC'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('CM.AGILE', 'soft', 'L5', NULL)
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '애자일 협업' FROM competencies WHERE code = 'CM.AGILE'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Agile Collaboration' FROM competencies WHERE code = 'CM.AGILE'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('애자일 협업') FROM competencies WHERE code = 'CM.AGILE'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Agile Collaboration') FROM competencies WHERE code = 'CM.AGILE'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('스크럼') FROM competencies WHERE code = 'CM.AGILE'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Jira') FROM competencies WHERE code = 'CM.AGILE'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('스프린트') FROM competencies WHERE code = 'CM.AGILE'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('CM.ENG', 'soft', 'L5', NULL)
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '영문 기술 커뮤니케이션' FROM competencies WHERE code = 'CM.ENG'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Technical English' FROM competencies WHERE code = 'CM.ENG'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('영문 기술 커뮤니케이션') FROM competencies WHERE code = 'CM.ENG'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Technical English') FROM competencies WHERE code = 'CM.ENG'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('영어') FROM competencies WHERE code = 'CM.ENG'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('원문 문서 독해') FROM competencies WHERE code = 'CM.ENG'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competencies (code, comp_type, layer, major_id) VALUES ('CM.PRODUCT', 'soft', 'L5', NULL)
  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'ko', 'name', '제품·도메인 이해' FROM competencies WHERE code = 'CM.PRODUCT'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'competencies', id, 'en', 'name', 'Product Sense' FROM competencies WHERE code = 'CM.PRODUCT'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('제품·도메인 이해') FROM competencies WHERE code = 'CM.PRODUCT'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'en', lower('Product Sense') FROM competencies WHERE code = 'CM.PRODUCT'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('요구사항 분석') FROM competencies WHERE code = 'CM.PRODUCT'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO competency_aliases (competency_id, lang, alias)
  SELECT id, 'ko', lower('기획 협업') FROM competencies WHERE code = 'CM.PRODUCT'
  ON CONFLICT (lang, alias) DO NOTHING;
INSERT INTO job_clusters (major_id, code, onet_code, sort_no)
  SELECT id, 'CE.BACKEND', '15-1252.00', 1 FROM majors WHERE code = 'CE'
  ON CONFLICT (major_id, code) DO UPDATE SET onet_code = EXCLUDED.onet_code, sort_no = EXCLUDED.sort_no;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'job_clusters', id, 'ko', 'name', '백엔드 개발' FROM job_clusters WHERE code = 'CE.BACKEND'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'job_clusters', id, 'en', 'name', 'Backend Engineer' FROM job_clusters WHERE code = 'CE.BACKEND'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO job_industry_map (job_id, industry_id)
  SELECT j.id, i.id FROM job_clusters j, industries i WHERE j.code = 'CE.BACKEND' AND i.code = 'SW'
  ON CONFLICT DO NOTHING;
INSERT INTO job_industry_map (job_id, industry_id)
  SELECT j.id, i.id FROM job_clusters j, industries i WHERE j.code = 'CE.BACKEND' AND i.code = 'AI'
  ON CONFLICT DO NOTHING;
INSERT INTO job_industry_map (job_id, industry_id)
  SELECT j.id, i.id FROM job_clusters j, industries i WHERE j.code = 'CE.BACKEND' AND i.code = 'TELCO'
  ON CONFLICT DO NOTHING;
INSERT INTO job_cluster_tracks (job_id, track_code)
  SELECT id, 'HS' FROM job_clusters WHERE code = 'CE.BACKEND' ON CONFLICT DO NOTHING;
INSERT INTO job_cluster_tracks (job_id, track_code)
  SELECT id, 'UNIV_LOW' FROM job_clusters WHERE code = 'CE.BACKEND' ON CONFLICT DO NOTHING;
INSERT INTO job_cluster_tracks (job_id, track_code)
  SELECT id, 'UNIV_HIGH' FROM job_clusters WHERE code = 'CE.BACKEND' ON CONFLICT DO NOTHING;
INSERT INTO job_cluster_tracks (job_id, track_code)
  SELECT id, 'GRAD' FROM job_clusters WHERE code = 'CE.BACKEND' ON CONFLICT DO NOTHING;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'CODE', 0.38 FROM job_clusters WHERE code = 'CE.BACKEND'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'DESIGN', 0.22 FROM job_clusters WHERE code = 'CE.BACKEND'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'ANALYZE', 0.16 FROM job_clusters WHERE code = 'CE.BACKEND'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'OPTIMIZE', 0.14 FROM job_clusters WHERE code = 'CE.BACKEND'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'ORCHESTRATE', 0.06 FROM job_clusters WHERE code = 'CE.BACKEND'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'BUILD', 0.04 FROM job_clusters WHERE code = 'CE.BACKEND'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'CE.BACKEND' AND c.code = 'SW.JAVA'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'CE.BACKEND' AND c.code = 'DM.BACKEND'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'CE.BACKEND' AND c.code = 'CE.DB'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'CE.BACKEND' AND c.code = 'SW.SQL'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 3 FROM job_clusters j, competencies c WHERE j.code = 'CE.BACKEND' AND c.code = 'CE.NET'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'CE.BACKEND' AND c.code = 'SW.SPRING'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'CE.BACKEND' AND c.code = 'CE.OS'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'CE.BACKEND' AND c.code = 'SW.GIT'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'CE.BACKEND' AND c.code = 'SW.DOCKER'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'CE.BACKEND' AND c.code = 'SW.TEST'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'CE.BACKEND' AND c.code = 'CE.ALGO'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'CE.BACKEND' AND c.code = 'CM.AGILE'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_clusters (major_id, code, onet_code, sort_no)
  SELECT id, 'CE.FRONTEND', '15-1254.00', 2 FROM majors WHERE code = 'CE'
  ON CONFLICT (major_id, code) DO UPDATE SET onet_code = EXCLUDED.onet_code, sort_no = EXCLUDED.sort_no;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'job_clusters', id, 'ko', 'name', '프론트엔드·웹 개발' FROM job_clusters WHERE code = 'CE.FRONTEND'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'job_clusters', id, 'en', 'name', 'Frontend Engineer' FROM job_clusters WHERE code = 'CE.FRONTEND'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO job_industry_map (job_id, industry_id)
  SELECT j.id, i.id FROM job_clusters j, industries i WHERE j.code = 'CE.FRONTEND' AND i.code = 'SW'
  ON CONFLICT DO NOTHING;
INSERT INTO job_industry_map (job_id, industry_id)
  SELECT j.id, i.id FROM job_clusters j, industries i WHERE j.code = 'CE.FRONTEND' AND i.code = 'AI'
  ON CONFLICT DO NOTHING;
INSERT INTO job_cluster_tracks (job_id, track_code)
  SELECT id, 'HS' FROM job_clusters WHERE code = 'CE.FRONTEND' ON CONFLICT DO NOTHING;
INSERT INTO job_cluster_tracks (job_id, track_code)
  SELECT id, 'UNIV_LOW' FROM job_clusters WHERE code = 'CE.FRONTEND' ON CONFLICT DO NOTHING;
INSERT INTO job_cluster_tracks (job_id, track_code)
  SELECT id, 'UNIV_HIGH' FROM job_clusters WHERE code = 'CE.FRONTEND' ON CONFLICT DO NOTHING;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'CODE', 0.36 FROM job_clusters WHERE code = 'CE.FRONTEND'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'DESIGN', 0.26 FROM job_clusters WHERE code = 'CE.FRONTEND'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'OPTIMIZE', 0.14 FROM job_clusters WHERE code = 'CE.FRONTEND'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'ANALYZE', 0.1 FROM job_clusters WHERE code = 'CE.FRONTEND'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'ORCHESTRATE', 0.08 FROM job_clusters WHERE code = 'CE.FRONTEND'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'BUILD', 0.06 FROM job_clusters WHERE code = 'CE.FRONTEND'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 5, 3 FROM job_clusters j, competencies c WHERE j.code = 'CE.FRONTEND' AND c.code = 'SW.JS'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'CE.FRONTEND' AND c.code = 'SW.REACT'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 3 FROM job_clusters j, competencies c WHERE j.code = 'CE.FRONTEND' AND c.code = 'CE.HCI'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'CE.FRONTEND' AND c.code = 'CE.NET'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'CE.FRONTEND' AND c.code = 'SW.GIT'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'CE.FRONTEND' AND c.code = 'SW.TEST'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'CE.FRONTEND' AND c.code = 'CE.SE'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 2, 1 FROM job_clusters j, competencies c WHERE j.code = 'CE.FRONTEND' AND c.code = 'SW.CICD'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'CE.FRONTEND' AND c.code = 'CM.PRODUCT'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'CE.FRONTEND' AND c.code = 'CM.AGILE'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_clusters (major_id, code, onet_code, sort_no)
  SELECT id, 'CE.DATAENG', '15-2051.01', 3 FROM majors WHERE code = 'CE'
  ON CONFLICT (major_id, code) DO UPDATE SET onet_code = EXCLUDED.onet_code, sort_no = EXCLUDED.sort_no;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'job_clusters', id, 'ko', 'name', '데이터 엔지니어' FROM job_clusters WHERE code = 'CE.DATAENG'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'job_clusters', id, 'en', 'name', 'Data Engineer' FROM job_clusters WHERE code = 'CE.DATAENG'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO job_industry_map (job_id, industry_id)
  SELECT j.id, i.id FROM job_clusters j, industries i WHERE j.code = 'CE.DATAENG' AND i.code = 'AI'
  ON CONFLICT DO NOTHING;
INSERT INTO job_industry_map (job_id, industry_id)
  SELECT j.id, i.id FROM job_clusters j, industries i WHERE j.code = 'CE.DATAENG' AND i.code = 'SW'
  ON CONFLICT DO NOTHING;
INSERT INTO job_industry_map (job_id, industry_id)
  SELECT j.id, i.id FROM job_clusters j, industries i WHERE j.code = 'CE.DATAENG' AND i.code = 'SEMI'
  ON CONFLICT DO NOTHING;
INSERT INTO job_cluster_tracks (job_id, track_code)
  SELECT id, 'UNIV_HIGH' FROM job_clusters WHERE code = 'CE.DATAENG' ON CONFLICT DO NOTHING;
INSERT INTO job_cluster_tracks (job_id, track_code)
  SELECT id, 'GRAD' FROM job_clusters WHERE code = 'CE.DATAENG' ON CONFLICT DO NOTHING;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'CODE', 0.3 FROM job_clusters WHERE code = 'CE.DATAENG'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'ANALYZE', 0.26 FROM job_clusters WHERE code = 'CE.DATAENG'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'DESIGN', 0.18 FROM job_clusters WHERE code = 'CE.DATAENG'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'OPTIMIZE', 0.18 FROM job_clusters WHERE code = 'CE.DATAENG'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'ORCHESTRATE', 0.08 FROM job_clusters WHERE code = 'CE.DATAENG'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 5, 3 FROM job_clusters j, competencies c WHERE j.code = 'CE.DATAENG' AND c.code = 'SW.SQL'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'CE.DATAENG' AND c.code = 'DM.DATAENG'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'CE.DATAENG' AND c.code = 'SW.PYTHON'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'CE.DATAENG' AND c.code = 'SW.SPARK'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 3 FROM job_clusters j, competencies c WHERE j.code = 'CE.DATAENG' AND c.code = 'SW.AIRFLOW'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'CE.DATAENG' AND c.code = 'CE.DB'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'CE.DATAENG' AND c.code = 'SW.CLOUD'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'CE.DATAENG' AND c.code = 'CE.DIST'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'CE.DATAENG' AND c.code = 'SW.DOCKER'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'CE.DATAENG' AND c.code = 'CE.PROB'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'CE.DATAENG' AND c.code = 'SW.GIT'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_clusters (major_id, code, onet_code, sort_no)
  SELECT id, 'CE.ML', '15-2051.00', 4 FROM majors WHERE code = 'CE'
  ON CONFLICT (major_id, code) DO UPDATE SET onet_code = EXCLUDED.onet_code, sort_no = EXCLUDED.sort_no;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'job_clusters', id, 'ko', 'name', 'AI·ML 엔지니어' FROM job_clusters WHERE code = 'CE.ML'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'job_clusters', id, 'en', 'name', 'Machine Learning Engineer' FROM job_clusters WHERE code = 'CE.ML'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO job_industry_map (job_id, industry_id)
  SELECT j.id, i.id FROM job_clusters j, industries i WHERE j.code = 'CE.ML' AND i.code = 'AI'
  ON CONFLICT DO NOTHING;
INSERT INTO job_industry_map (job_id, industry_id)
  SELECT j.id, i.id FROM job_clusters j, industries i WHERE j.code = 'CE.ML' AND i.code = 'SW'
  ON CONFLICT DO NOTHING;
INSERT INTO job_industry_map (job_id, industry_id)
  SELECT j.id, i.id FROM job_clusters j, industries i WHERE j.code = 'CE.ML' AND i.code = 'AUTO'
  ON CONFLICT DO NOTHING;
INSERT INTO job_industry_map (job_id, industry_id)
  SELECT j.id, i.id FROM job_clusters j, industries i WHERE j.code = 'CE.ML' AND i.code = 'MED'
  ON CONFLICT DO NOTHING;
INSERT INTO job_cluster_tracks (job_id, track_code)
  SELECT id, 'UNIV_HIGH' FROM job_clusters WHERE code = 'CE.ML' ON CONFLICT DO NOTHING;
INSERT INTO job_cluster_tracks (job_id, track_code)
  SELECT id, 'GRAD' FROM job_clusters WHERE code = 'CE.ML' ON CONFLICT DO NOTHING;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'RESEARCH', 0.3 FROM job_clusters WHERE code = 'CE.ML'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'CODE', 0.28 FROM job_clusters WHERE code = 'CE.ML'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'ANALYZE', 0.24 FROM job_clusters WHERE code = 'CE.ML'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'OPTIMIZE', 0.1 FROM job_clusters WHERE code = 'CE.ML'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'DESIGN', 0.08 FROM job_clusters WHERE code = 'CE.ML'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'CE.ML' AND c.code = 'CE.ML'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'CE.ML' AND c.code = 'CE.DL'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'CE.ML' AND c.code = 'SW.PYTORCH'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 5, 3 FROM job_clusters j, competencies c WHERE j.code = 'CE.ML' AND c.code = 'SW.PYTHON'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'CE.ML' AND c.code = 'CE.MATH'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'CE.ML' AND c.code = 'CE.PROB'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'CE.ML' AND c.code = 'SW.PANDAS'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'CE.ML' AND c.code = 'DM.MLOPS'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'CE.ML' AND c.code = 'SW.CLOUD'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'CE.ML' AND c.code = 'CM.ENG'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'CE.ML' AND c.code = 'SW.GIT'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_clusters (major_id, code, onet_code, sort_no)
  SELECT id, 'CE.SYSSW', '15-1252.00', 5 FROM majors WHERE code = 'CE'
  ON CONFLICT (major_id, code) DO UPDATE SET onet_code = EXCLUDED.onet_code, sort_no = EXCLUDED.sort_no;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'job_clusters', id, 'ko', 'name', '시스템·임베디드 SW' FROM job_clusters WHERE code = 'CE.SYSSW'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'job_clusters', id, 'en', 'name', 'Systems / Embedded Software Engineer' FROM job_clusters WHERE code = 'CE.SYSSW'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO job_industry_map (job_id, industry_id)
  SELECT j.id, i.id FROM job_clusters j, industries i WHERE j.code = 'CE.SYSSW' AND i.code = 'SEMI'
  ON CONFLICT DO NOTHING;
INSERT INTO job_industry_map (job_id, industry_id)
  SELECT j.id, i.id FROM job_clusters j, industries i WHERE j.code = 'CE.SYSSW' AND i.code = 'AUTO'
  ON CONFLICT DO NOTHING;
INSERT INTO job_industry_map (job_id, industry_id)
  SELECT j.id, i.id FROM job_clusters j, industries i WHERE j.code = 'CE.SYSSW' AND i.code = 'ROBOT'
  ON CONFLICT DO NOTHING;
INSERT INTO job_industry_map (job_id, industry_id)
  SELECT j.id, i.id FROM job_clusters j, industries i WHERE j.code = 'CE.SYSSW' AND i.code = 'TELCO'
  ON CONFLICT DO NOTHING;
INSERT INTO job_cluster_tracks (job_id, track_code)
  SELECT id, 'UNIV_LOW' FROM job_clusters WHERE code = 'CE.SYSSW' ON CONFLICT DO NOTHING;
INSERT INTO job_cluster_tracks (job_id, track_code)
  SELECT id, 'UNIV_HIGH' FROM job_clusters WHERE code = 'CE.SYSSW' ON CONFLICT DO NOTHING;
INSERT INTO job_cluster_tracks (job_id, track_code)
  SELECT id, 'GRAD' FROM job_clusters WHERE code = 'CE.SYSSW' ON CONFLICT DO NOTHING;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'CODE', 0.34 FROM job_clusters WHERE code = 'CE.SYSSW'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'ANALYZE', 0.24 FROM job_clusters WHERE code = 'CE.SYSSW'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'BUILD', 0.18 FROM job_clusters WHERE code = 'CE.SYSSW'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'OPTIMIZE', 0.16 FROM job_clusters WHERE code = 'CE.SYSSW'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'DESIGN', 0.08 FROM job_clusters WHERE code = 'CE.SYSSW'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 5, 3 FROM job_clusters j, competencies c WHERE j.code = 'CE.SYSSW' AND c.code = 'SW.CPP'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'CE.SYSSW' AND c.code = 'CE.OS'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'CE.SYSSW' AND c.code = 'CE.EMBEDSW'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'CE.SYSSW' AND c.code = 'CE.ARCH'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'CE.SYSSW' AND c.code = 'SW.LINUX'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'CE.SYSSW' AND c.code = 'CE.NET'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'CE.SYSSW' AND c.code = 'SW.GIT'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'CE.SYSSW' AND c.code = 'CE.ALGO'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'CE.SYSSW' AND c.code = 'SW.TEST'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'CE.SYSSW' AND c.code = 'CM.DOC'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_clusters (major_id, code, onet_code, sort_no)
  SELECT id, 'CE.DEVOPS', '15-1244.00', 6 FROM majors WHERE code = 'CE'
  ON CONFLICT (major_id, code) DO UPDATE SET onet_code = EXCLUDED.onet_code, sort_no = EXCLUDED.sort_no;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'job_clusters', id, 'ko', 'name', '클라우드·인프라 (DevOps·SRE)' FROM job_clusters WHERE code = 'CE.DEVOPS'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'job_clusters', id, 'en', 'name', 'DevOps / SRE' FROM job_clusters WHERE code = 'CE.DEVOPS'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO job_industry_map (job_id, industry_id)
  SELECT j.id, i.id FROM job_clusters j, industries i WHERE j.code = 'CE.DEVOPS' AND i.code = 'SW'
  ON CONFLICT DO NOTHING;
INSERT INTO job_industry_map (job_id, industry_id)
  SELECT j.id, i.id FROM job_clusters j, industries i WHERE j.code = 'CE.DEVOPS' AND i.code = 'AI'
  ON CONFLICT DO NOTHING;
INSERT INTO job_industry_map (job_id, industry_id)
  SELECT j.id, i.id FROM job_clusters j, industries i WHERE j.code = 'CE.DEVOPS' AND i.code = 'TELCO'
  ON CONFLICT DO NOTHING;
INSERT INTO job_cluster_tracks (job_id, track_code)
  SELECT id, 'HS' FROM job_clusters WHERE code = 'CE.DEVOPS' ON CONFLICT DO NOTHING;
INSERT INTO job_cluster_tracks (job_id, track_code)
  SELECT id, 'UNIV_LOW' FROM job_clusters WHERE code = 'CE.DEVOPS' ON CONFLICT DO NOTHING;
INSERT INTO job_cluster_tracks (job_id, track_code)
  SELECT id, 'UNIV_HIGH' FROM job_clusters WHERE code = 'CE.DEVOPS' ON CONFLICT DO NOTHING;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'OPTIMIZE', 0.28 FROM job_clusters WHERE code = 'CE.DEVOPS'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'FIELD', 0.22 FROM job_clusters WHERE code = 'CE.DEVOPS'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'CODE', 0.22 FROM job_clusters WHERE code = 'CE.DEVOPS'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'ANALYZE', 0.16 FROM job_clusters WHERE code = 'CE.DEVOPS'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'ORCHESTRATE', 0.12 FROM job_clusters WHERE code = 'CE.DEVOPS'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 5, 3 FROM job_clusters j, competencies c WHERE j.code = 'CE.DEVOPS' AND c.code = 'SW.LINUX'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'CE.DEVOPS' AND c.code = 'SW.K8S'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'CE.DEVOPS' AND c.code = 'SW.DOCKER'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'CE.DEVOPS' AND c.code = 'SW.CLOUD'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'CE.DEVOPS' AND c.code = 'SW.CICD'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'CE.DEVOPS' AND c.code = 'CE.NET'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 3 FROM job_clusters j, competencies c WHERE j.code = 'CE.DEVOPS' AND c.code = 'SW.MONITOR'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'CE.DEVOPS' AND c.code = 'SW.PYTHON'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'CE.DEVOPS' AND c.code = 'CE.SEC'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'CE.DEVOPS' AND c.code = 'SW.GIT'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_clusters (major_id, code, onet_code, sort_no)
  SELECT id, 'CE.SECURITY', '15-1212.00', 7 FROM majors WHERE code = 'CE'
  ON CONFLICT (major_id, code) DO UPDATE SET onet_code = EXCLUDED.onet_code, sort_no = EXCLUDED.sort_no;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'job_clusters', id, 'ko', 'name', '보안 엔지니어' FROM job_clusters WHERE code = 'CE.SECURITY'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'job_clusters', id, 'en', 'name', 'Security Engineer' FROM job_clusters WHERE code = 'CE.SECURITY'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO job_industry_map (job_id, industry_id)
  SELECT j.id, i.id FROM job_clusters j, industries i WHERE j.code = 'CE.SECURITY' AND i.code = 'SW'
  ON CONFLICT DO NOTHING;
INSERT INTO job_industry_map (job_id, industry_id)
  SELECT j.id, i.id FROM job_clusters j, industries i WHERE j.code = 'CE.SECURITY' AND i.code = 'POWER'
  ON CONFLICT DO NOTHING;
INSERT INTO job_industry_map (job_id, industry_id)
  SELECT j.id, i.id FROM job_clusters j, industries i WHERE j.code = 'CE.SECURITY' AND i.code = 'DEF'
  ON CONFLICT DO NOTHING;
INSERT INTO job_industry_map (job_id, industry_id)
  SELECT j.id, i.id FROM job_clusters j, industries i WHERE j.code = 'CE.SECURITY' AND i.code = 'TELCO'
  ON CONFLICT DO NOTHING;
INSERT INTO job_cluster_tracks (job_id, track_code)
  SELECT id, 'UNIV_HIGH' FROM job_clusters WHERE code = 'CE.SECURITY' ON CONFLICT DO NOTHING;
INSERT INTO job_cluster_tracks (job_id, track_code)
  SELECT id, 'GRAD' FROM job_clusters WHERE code = 'CE.SECURITY' ON CONFLICT DO NOTHING;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'ANALYZE', 0.3 FROM job_clusters WHERE code = 'CE.SECURITY'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'RESEARCH', 0.22 FROM job_clusters WHERE code = 'CE.SECURITY'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'CODE', 0.2 FROM job_clusters WHERE code = 'CE.SECURITY'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'FIELD', 0.16 FROM job_clusters WHERE code = 'CE.SECURITY'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'OPTIMIZE', 0.12 FROM job_clusters WHERE code = 'CE.SECURITY'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 5, 3 FROM job_clusters j, competencies c WHERE j.code = 'CE.SECURITY' AND c.code = 'CE.SEC'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'CE.SECURITY' AND c.code = 'DM.SECOPS'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'CE.SECURITY' AND c.code = 'CE.NET'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'CE.SECURITY' AND c.code = 'SW.LINUX'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 3 FROM job_clusters j, competencies c WHERE j.code = 'CE.SECURITY' AND c.code = 'CE.OS'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'CE.SECURITY' AND c.code = 'SW.PYTHON'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'CE.SECURITY' AND c.code = 'CE.ARCH'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'CE.SECURITY' AND c.code = 'SW.CPP'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'CE.SECURITY' AND c.code = 'CM.DOC'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'CE.SECURITY' AND c.code = 'CM.ENG'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_clusters (major_id, code, onet_code, sort_no)
  SELECT id, 'CE.QA', '15-1253.00', 8 FROM majors WHERE code = 'CE'
  ON CONFLICT (major_id, code) DO UPDATE SET onet_code = EXCLUDED.onet_code, sort_no = EXCLUDED.sort_no;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'job_clusters', id, 'ko', 'name', 'SW 품질·테스트 엔지니어' FROM job_clusters WHERE code = 'CE.QA'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO translations (table_name, row_id, lang, field, value)
  SELECT 'job_clusters', id, 'en', 'name', 'QA / Test Engineer' FROM job_clusters WHERE code = 'CE.QA'
  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO job_industry_map (job_id, industry_id)
  SELECT j.id, i.id FROM job_clusters j, industries i WHERE j.code = 'CE.QA' AND i.code = 'SW'
  ON CONFLICT DO NOTHING;
INSERT INTO job_industry_map (job_id, industry_id)
  SELECT j.id, i.id FROM job_clusters j, industries i WHERE j.code = 'CE.QA' AND i.code = 'AUTO'
  ON CONFLICT DO NOTHING;
INSERT INTO job_industry_map (job_id, industry_id)
  SELECT j.id, i.id FROM job_clusters j, industries i WHERE j.code = 'CE.QA' AND i.code = 'MED'
  ON CONFLICT DO NOTHING;
INSERT INTO job_industry_map (job_id, industry_id)
  SELECT j.id, i.id FROM job_clusters j, industries i WHERE j.code = 'CE.QA' AND i.code = 'SEMI'
  ON CONFLICT DO NOTHING;
INSERT INTO job_cluster_tracks (job_id, track_code)
  SELECT id, 'HS' FROM job_clusters WHERE code = 'CE.QA' ON CONFLICT DO NOTHING;
INSERT INTO job_cluster_tracks (job_id, track_code)
  SELECT id, 'UNIV_LOW' FROM job_clusters WHERE code = 'CE.QA' ON CONFLICT DO NOTHING;
INSERT INTO job_cluster_tracks (job_id, track_code)
  SELECT id, 'UNIV_HIGH' FROM job_clusters WHERE code = 'CE.QA' ON CONFLICT DO NOTHING;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'OPTIMIZE', 0.26 FROM job_clusters WHERE code = 'CE.QA'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'ANALYZE', 0.24 FROM job_clusters WHERE code = 'CE.QA'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'CODE', 0.22 FROM job_clusters WHERE code = 'CE.QA'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'ORCHESTRATE', 0.16 FROM job_clusters WHERE code = 'CE.QA'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_axis_weights (job_id, axis_code, weight)
  SELECT id, 'BUILD', 0.12 FROM job_clusters WHERE code = 'CE.QA'
  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 5, 3 FROM job_clusters j, competencies c WHERE j.code = 'CE.QA' AND c.code = 'SW.TEST'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'CE.QA' AND c.code = 'CE.SE'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 3 FROM job_clusters j, competencies c WHERE j.code = 'CE.QA' AND c.code = 'SW.PYTHON'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'CE.QA' AND c.code = 'SW.CICD'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'CE.QA' AND c.code = 'CE.DB'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'CE.QA' AND c.code = 'SW.GIT'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 4, 3 FROM job_clusters j, competencies c WHERE j.code = 'CE.QA' AND c.code = 'CM.DOC'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'CE.QA' AND c.code = 'CE.NET'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'CE.QA' AND c.code = 'CM.AGILE'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;
INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)
  SELECT j.id, c.id, 3, 2 FROM job_clusters j, competencies c WHERE j.code = 'CE.QA' AND c.code = 'SW.LINUX'
  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;

COMMIT;
