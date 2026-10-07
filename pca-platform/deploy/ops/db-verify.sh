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
echo "상품 (ME_V2)"
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
