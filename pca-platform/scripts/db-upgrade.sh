#!/usr/bin/env bash
# 이미 선 DB 에 **더해진 것만** 올린다.
#
# 표를 다시 만들지 않는다. 여기 적힌 파일은 전부 `IF NOT EXISTS` 와
# `ON CONFLICT` 로 짜여 있어 여러 번 돌려도 같은 자리에 선다.
#
#   DATABASE_URL=... bash scripts/db-upgrade.sh
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL 을 정하십시오}"

run() { echo; echo "── $*"; "$@"; }

run npm run -s db:phase2
run npm run -s db:phase2_1
run npm run -s db:phase2_2
run npm run -s db:phase2_3
run npm run -s db:phase2_4

# 문항이 바뀌었으면 다시 적재한다. 같은 문항이면 아무것도 안 바뀐다
run npm run -s v2:build
run npm run -s value:build
run npm run -s metri:items

echo
echo "올렸습니다. 막힌 것은 `npm run launch:check` 가 셉니다."
