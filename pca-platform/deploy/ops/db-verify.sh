#!/usr/bin/env bash
# **세워진 DB 가 팔 수 있는 상태인가.** 읽기만 한다.
#
#   npm run db:verify
#
# 사람이 화면을 눌러 보기 전에 여기서 걸러낸다. 가격표가 비어 보이는
# 원인은 거의 늘 셋 가운데 하나였다: 표가 없다 · 상품이 없다 · 동의문이
# 없다. 셋째는 화면에 안 보이는데 가입을 통째로 되돌린다.
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL 이 없습니다}"

q() { psql "$DATABASE_URL" -tAc "$1"; }

tables=$(q "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'")
echo "표              ${tables}개"

echo
echo "상품 (ME_V2)"
psql "$DATABASE_URL" -c \
  "SELECT code, market, tier, amount, currency, price_status, active
     FROM products
    WHERE assessment_version = 'ME_V2'
    ORDER BY market DESC,
             CASE tier WHEN 'BASIC' THEN 1 WHEN 'STANDARD' THEN 2 ELSE 3 END"

bad=0

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
