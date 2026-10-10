-- 측정체계를 고친 것이 **운영에 쌓인 응답**에 닿는가. 읽기만 한다.
--
-- 이 파일을 두는 까닭은 세션 컨테이너에서 운영 DB 에 닿을 수 없어서다.
-- `select count(*) from v3_responses` 한 줄로는 답이 안 나온다: 전체 수가
-- 0 이 아니어도 전부 시연 계정이면 고친 것이 아무에게도 닿지 않고, 반대로
-- 전체 수가 적어도 **굳은 결과가 걸려 있으면** 그것은 손님의 결과지다.
-- 그래서 다섯을 따로 센다: 전체 · 시연 · 실제 · 완료된 응시 · 굳은 결과.
--
-- 운영 컨테이너에서(Railway -> 서비스 -> ... -> Shell):
--   psql "$DATABASE_URL" -f /app/db/checks/v3_measurement_impact.sql
--
-- **쓰는 문장이 한 줄도 없다.** INSERT 도 UPDATE 도 DELETE 도 DDL 도
-- 없으므로 이 파일을 운영에서 돌리는 것이 운영을 바꾸지 않는다.

\pset border 2
\echo ''
\echo '== ME_V3 응답 전체 =='

select
  (select count(*) from v3_responses)                        as "응답 전체",
  (select count(*) from v3_attempts)                         as "응시 전체",
  (select count(*) from v3_attempts
     where submitted_at is not null)                         as "제출된 응시",
  (select count(*) from v3_snapshots)                        as "굳은 결과";

\echo ''
\echo '== 2026-10-10 에 문면을 다시 쓴 문항 (CJ_GIVEN_REV) =='
\echo '   보기와 자리 번호와 축은 그대로다. 수가 0 이 아니면 아래 넷을 본다'

select
  count(*)                                                   as "응답 전체",
  count(*) filter (where u.is_demo)                          as "시연 계정",
  count(*) filter (where not u.is_demo)                      as "실제 사용자",
  count(distinct a.id) filter (where a.submitted_at is not null)
                                                             as "완료된 응시",
  count(distinct s.attempt_id)                               as "굳은 결과가 걸린 응시"
from v3_responses r
join v3_attempts a on a.id = r.attempt_id
join users u       on u.id = a.user_id
left join v3_snapshots s on s.attempt_id = a.id
where r.item_id = 'CJ_GIVEN_REV';

\echo ''
\echo '== 그 문항의 응답이 어느 자리에 몰려 있나 =='
\echo '   자리 번호(0~3)의 뜻은 그대로다: 없다 / 받아 썼다 / 내가 했다 / 내가 정했다'

select
  r.value_int                                                as "자리 번호",
  count(*)                                                   as "응답 수",
  count(*) filter (where not u.is_demo)                      as "실제 사용자"
from v3_responses r
join v3_attempts a on a.id = r.attempt_id
join users u       on u.id = a.user_id
where r.item_id = 'CJ_GIVEN_REV'
group by r.value_int
order by r.value_int;

\echo ''
\echo '== 굳은 결과가 적고 있는 판본 =='
\echo '   판본이 섞여 있으면 Wave 0 분석에서 앞사람과 뒷사람을 한 표에 두지 않는다'

select
  coalesce(module_versions ->> 'item_bank_version', '(적히지 않음)')
                                                             as "문항 은행",
  coalesce(module_versions ->> 'scoring_version',   '(적히지 않음)')
                                                             as "판단 규칙",
  coalesce(result_model_version,                    '(적히지 않음)')
                                                             as "결과 모델",
  count(*)                                                   as "굳은 결과"
from v3_snapshots
group by 1, 2, 3
order by 4 desc;

\echo ''
\echo '== 판매 중인 ME_V3 상품 =='
\echo '   전부 active=false 면 지금 이 검사를 새로 살 수 있는 사람이 없다'

select code, tier, active, price_status
from products
where code like '%V3%'
order by code;
