#!/usr/bin/env bash
# **세워진 DB 가 팔 수 있는 상태인가.** 읽기만 한다.
#
#   npm run db:verify
#
# 사람이 화면을 눌러 보기 전에 여기서 걸러낸다. 가격표가 비어 보이는
# 원인은 거의 늘 셋 가운데 하나였다: 표가 없다 · 상품이 없다 · 동의문이
# 없다. 셋째는 화면에 안 보이는데 가입을 통째로 되돌린다.
#
# ## 이 스크립트가 **볼 수 없는 것**
#
# 조회로 알 수 없는 것은 묻지 않는다. 묻는 척하면 초록이 거짓이 된다.
#
#   자동 백업 주기와 보관 기간   관리형 플랫폼 쪽 설정이다
#   디스크 크기와 남은 용량      같다
#   동시 접속 상한               요금제가 정한다
#   어느 지역에 서 있는가        같다
#
# 그 넷은 `docs/metri/45_railway_ops.md` 의 표가 어디서 보는지 적어 둔다.
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL 이 없습니다}"

q() { psql "$DATABASE_URL" -tAc "$1"; }

tables=$(q "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'")
echo "PostgreSQL      $(q "SHOW server_version")"
echo "표              ${tables}개"

bad=0

# **핵심 표 일곱.** 돈과 사람과 응답과 결과지가 여기 든다. 하나라도
# 없으면 그 자리에서 장사가 안 되고, `count(*)` 로는 안 드러난다 —
# 표가 없는 것과 비어 있는 것이 화면에서는 똑같이 보인다.
core=$(q "SELECT count(*) FROM information_schema.tables
           WHERE table_schema='public'
             AND table_name IN ('users','orders','entitlements','attempts',
                                'v2_responses','report_snapshots','evidence_profiles')")
echo "핵심 표         ${core} / 7"
if [ "${core:-0}" -lt 7 ]; then
  echo "실패 핵심 표가 모자랍니다. npm run db:init 으로 세웁니다." >&2
  bad=$((bad + 1))
fi

# **ME_V3 표 다섯.** 파일럿이 여기서 돈다. 빠지면 `/v3/start` 가 500 이고
# 화면은 멀쩡해 보인다
v3=$(q "SELECT count(*) FROM information_schema.tables
         WHERE table_schema='public'
           AND table_name IN ('v3_attempts','v3_responses','v3_snapshots',
                              'v3_pilot_participants','v3_pilot_feedback')")
echo "ME_V3 표        ${v3} / 5"
# **내 CareerMatri 표 다섯.** 검사가 끝난 뒤의 자리다. 빠지면 `/me` 가
# 500 이고, 검사를 끝낸 사람이 다시 들어올 이유가 사라진다
plat=$(q "SELECT count(*) FROM information_schema.tables
          WHERE table_schema='public'
            AND table_name IN ('career_profiles','v3_experiences','v3_actions',
                               'v3_job_postings','v3_track_interest')")
echo "내 CareerMatri  ${plat} / 5"
# **없는 스크립트를 안내하지 않는다.** 전에는 여기가
# `npm run db:v3:arch && npm run db:v3:platform` 을 적었는데, 그 둘은
# 저장소의 `package.json` 에만 있고 **운영 이미지의 것에는 없다**
# (`deploy/ops/package.json` 에 적힌 것은 여덟뿐이다). 컨테이너에서
# 그대로 치면 `npm error Missing script` 가 난다. 올리는 길은 한 줄이다
if [ "${plat:-0}" -lt 5 ]; then
  echo "실패 내 CareerMatri 표가 모자랍니다. npm run db:upgrade 로 올립니다." >&2
  bad=$((bad + 1))
fi
if [ "${v3:-0}" -lt 5 ]; then
  echo "실패 ME_V3 표가 모자랍니다. npm run db:upgrade 로 올립니다." >&2
  bad=$((bad + 1))
fi

# **`career_profiles` 는 세는 것으로 끝내지 않는다.** `/me` 가 그 표의
# 어느 칸을 읽는지까지 맞아야 열린다. 표가 선 날 칸이 빠져 있으면
# `5 / 5` 가 찍히고 화면은 그대로 500 이다.
#
# 세는 칸은 `src/lib/me-v3/platform.ts` 의 질의가 실제로 부르는 것들이다:
# `currentState()` 가 넷(axis_levels · zones · gaps · recomputed_at),
# `profileOf()` 가 여섯, `syncProfile()` 과 `saveRegion()` 과
# `saveTargets()` 의 INSERT 가 나머지다.
if [ "${plat:-0}" -ge 5 ]; then
  for C in user_id core_code market_code base_attempt_id axis_levels zones gaps \
           recomputed_at target_industry target_role target_org target_org_context \
           home_region move_range; do
    n=$(q "SELECT count(*) FROM information_schema.columns
            WHERE table_schema='public' AND table_name='career_profiles'
              AND column_name='${C}'")
    if [ "${n:-0}" -lt 1 ]; then
      echo "실패 career_profiles.${C} 가 없습니다. npm run db:upgrade 로 올립니다." >&2
      bad=$((bad + 1))
    fi
  done
  # **아무 제약이나 있는 것으로는 모자란다.** 쓰는 자리 셋이 전부
  # `ON CONFLICT (user_id, core_code)` 이고, 그 짝에 걸린 유일 제약이
  # 없으면 PostgreSQL 이 42P10 으로 거절한다. 기본키만 있어도 `count>0`
  # 은 통과하므로 **그 두 칸을 짝으로** 센다
  uq=$(q "SELECT count(*) FROM pg_constraint c
           WHERE c.conrelid='career_profiles'::regclass
             AND c.contype IN ('p','u')
             AND (SELECT array_agg(a.attname::text ORDER BY a.attname)
                    FROM unnest(c.conkey) k
                    JOIN pg_attribute a
                      ON a.attrelid = c.conrelid AND a.attnum = k)
                 = ARRAY['core_code','user_id']")
  if [ "${uq:-0}" -lt 1 ]; then
    echo "실패 career_profiles 에 (user_id, core_code) 유일 제약이 없습니다." >&2
    echo "     경험 반영과 목표 저장이 ON CONFLICT 에서 멈춥니다." >&2
    bad=$((bad + 1))
  fi
fi

# **로그인 방법.** 소셜 로그인이 붙은 뒤로는 이 표가 없으면 구글·애플로
# 들어온 사람이 로그인 콜백에서 500 을 받는다. 표만 세지 않고 `sub` 에
# 걸린 유일 제약까지 본다: 그것이 없으면 같은 사람이 로그인할 때마다
# **계정이 하나씩 늘어난다.**
auth=$(q "SELECT count(*) FROM information_schema.tables
           WHERE table_schema='public' AND table_name='auth_accounts'")
pwcol=$(q "SELECT count(*) FROM information_schema.columns
            WHERE table_schema='public' AND table_name='users'
              AND column_name='pw_login'")
echo "로그인 방법     표 ${auth} / 1 · users.pw_login ${pwcol} / 1"
if [ "${auth:-0}" -lt 1 ] || [ "${pwcol:-0}" -lt 1 ]; then
  echo "실패 소셜 로그인 표가 모자랍니다. npm run db:upgrade 로 올립니다." >&2
  bad=$((bad + 1))
elif [ "$(q "SELECT count(*) FROM pg_constraint c
              WHERE c.conrelid='auth_accounts'::regclass
                AND c.contype IN ('p','u')
                AND (SELECT array_agg(a.attname::text ORDER BY a.attname)
                       FROM unnest(c.conkey) k
                       JOIN pg_attribute a
                         ON a.attrelid = c.conrelid AND a.attnum = k)
                    = ARRAY['provider','provider_account_id']")" -lt 1 ]; then
  echo "실패 auth_accounts 에 (provider, provider_account_id) 유일 제약이 없습니다." >&2
  echo "     같은 사람이 로그인할 때마다 계정이 하나씩 늘어납니다." >&2
  bad=$((bad + 1))
fi

# **외래키가 살아 있는가.** 표만 돌아오고 외래키가 빠지면 지운 사람의
# 주문이 남고, 파기(익명화)가 반쪽이 된다. 복구본에서 실제로 일어난다.
fks=$(q "SELECT count(*) FROM pg_constraint
          WHERE contype='f' AND connamespace='public'::regnamespace")
echo "외래키          ${fks}개"
if [ "${fks:-0}" -lt 50 ]; then
  echo "실패 외래키가 ${fks}개뿐입니다. 스키마가 반쪽으로 올라갔습니다." >&2
  bad=$((bad + 1))
fi

# **같은 결제가 두 번 적히지 않는가.** 이 둘이 없으면 웹훅이 두 번 와도
# 이용권이 두 장 나가고, 그것을 세는 사람이 없다.
for C in orders_order_no_key entitlements_order_uniq; do
  found=$(q "SELECT count(*) FROM (
               SELECT conname AS n FROM pg_constraint
               UNION ALL SELECT indexname FROM pg_indexes WHERE schemaname='public'
             ) x WHERE n = '${C}'")
  if [ "${found:-0}" -lt 1 ]; then
    echo "실패 ${C} 가 없습니다. 같은 결제가 두 번 적힐 수 있습니다." >&2
    bad=$((bad + 1))
  fi
done

echo
# **지금 파는 판본이 켜져 있는가.**
#
# 공개 가격표는 `products.assessment_version` 이 지금 판본인 것만
# 내놓는다(`src/lib/catalog.ts`). 그래서 지금 판본의 상품이 전부
# `active = false` 면 가격표가 비고, 그것이 **맞는 상태일 수도 있다** —
# 판매를 아직 열지 않은 것과 잘못된 옛 검사로 보내는 것은 다른 일이다.
#
# **여기서 켜지 않는다.** 파는 것을 여는 일은 사업 결정이고 스크립트가
# 할 일이 아니다. 그 상태가 어느 쪽인지 적어만 둔다.
cur=$(q "SELECT count(*) FROM products WHERE assessment_version = 'ME_V3_2' AND active")
echo "지금 판본 상품  ME_V3_2 · 켜진 것 ${cur}개"
if [ "${cur:-0}" -lt 1 ]; then
  echo "     판매를 아직 열지 않았습니다. 가격표가 '아직 판매를 열지"
  echo "     않았습니다' 로 섭니다 — 옛 검사로 보내지 않습니다."
fi

echo
echo "상품 (ME_V2 · 옛 판본. 보존하고 공개 가격표에는 내놓지 않는다)"
psql "$DATABASE_URL" -c \
  "SELECT code, market, tier, amount, currency, price_status, active
     FROM products
    WHERE assessment_version = 'ME_V2'
    ORDER BY market DESC,
             CASE tier WHEN 'BASIC' THEN 1 WHEN 'STANDARD' THEN 2 ELSE 3 END"

# **승인된 값 여섯 줄이어야 한다.** 숫자는 여기서 지어내지 않는다:
# db/schema_phase2_3.sql 이 못 박은 값과 같은지만 센다.
want="ME_V2_BASIC_KR:0:KRW ME_V2_STANDARD_KR:14900:KRW ME_V2_PRO_KR:21900:KRW \
ME_V2_BASIC_GL:0:USD ME_V2_STANDARD_GL:1499:USD ME_V2_PRO_GL:2499:USD"
for w in $want; do
  code=${w%%:*}; rest=${w#*:}; amt=${rest%%:*}; cur=${rest#*:}
  # **boolean 을 글자로 이을 때는 true 다.** psql 이 칸으로 찍을 때만 t 로
  # 줄여 보여 준다. 그 차이로 멀쩡한 줄 여섯이 전부 실패로 떨어졌다
  got=$(q "SELECT amount || ':' || currency || ':' || price_status || ':' || active::text
             FROM products WHERE code = '${code}'")
  if [ "$got" != "${amt}:${cur}:approved:true" ]; then
    echo "실패 ${code} 가 ${amt} ${cur} approved 가 아닙니다 (${got:-없음})" >&2
    bad=$((bad + 1))
  fi
done

docs=$(q "SELECT count(*) FROM consent_documents WHERE retired_at IS NULL AND required")
echo
echo "필수 동의문      ${docs}개"
# ko·en 두 벌 × 약관·개인정보 = 4. 하나라도 빠지면 그 언어로 가입이 되돌려진다
if [ "${docs:-0}" -lt 4 ]; then
  echo "실패 필수 동의문이 모자랍니다. 그 언어로는 가입이 되돌려집니다." >&2
  bad=$((bad + 1))
fi

echo "사람            $(q "SELECT count(*) FROM users")명 (시연 $(q "SELECT count(*) FROM users WHERE is_demo")명)"

if [ "$bad" -gt 0 ]; then
  echo; echo "${bad}가지가 걸렸습니다." >&2
  exit 1
fi
echo
echo "팔 수 있는 상태입니다."
echo
echo "이 스크립트가 못 보는 넷(자동 백업 주기 · 디스크 용량 · 동시 접속"
echo "상한 · 지역)은 관리형 플랫폼 쪽에서 봅니다 —"
echo "docs/metri/45_railway_ops.md" 
