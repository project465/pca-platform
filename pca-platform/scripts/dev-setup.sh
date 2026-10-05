#!/usr/bin/env bash
# 빈 DB 에서 눌러 볼 수 있는 상태까지.
#
# **차례가 곧 조건이다.** 스키마 셋이 서로를 참조하고, 문항 적재는 표가
# 선 뒤에만 되고, 승인된 가격은 상품이 들어온 뒤에 얹힌다. 한 번 손으로
# 맞춰 보고 그 차례를 여기 적어 둔다: 다음 사람이 다시 맞추지 않게.
#
#   createdb cm_dev
#   DATABASE_URL=postgres://localhost/cm_dev bash scripts/dev-setup.sh
#
# 이것은 **개발용**이다. 운영 DB 에 대고 돌리지 않는다: `db/schema.sql`
# 이 표를 다시 만든다.
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL 을 정하십시오}"

case "$DATABASE_URL" in
  *prod*|*production*)
    echo "운영처럼 보이는 주소입니다. 개발용 DB 에만 돌리십시오." >&2
    exit 1;;
esac

run() { echo; echo "── $*"; "$@"; }

echo "DB: ${DATABASE_URL%%\?*}"

# 1. 표. 셋이 이 차례로만 올라간다
run npm run -s db:reset
run npm run -s metri:seed
run npm run -s db:platform

# 2. 상용화 단계마다 더한 칸.
#    **`phase2` 가 먼저다**: ME_V2 상품과 `products.assessment_version` 이
#    거기서 생기고, 그 다음 판본들이 그 칸을 고친다
run npm run -s db:phase2
run npm run -s db:phase2_1
run npm run -s db:phase2_2
run npm run -s db:phase2_3
run npm run -s db:phase2_4

# 3. 검사 문항. 생성물을 먼저 만들고 적재한다
run npm run -s v2:build
run npm run -s value:build
run npm run -s metri:items

# 4. 눌러 볼 자료와 계정. **운영 DB 에 넣지 않는다**
run npm run -s db:seed
run npm run -s db:demo

echo
echo "끝났습니다. 띄우려면:"
echo "  DATABASE_URL=\"\$DATABASE_URL\" AUTH_SECRET=\$(openssl rand -base64 48) \\"
echo "    npx next dev -p 3100"
