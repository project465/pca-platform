#!/usr/bin/env bash
# 이미 선 DB 에 **더해진 것만** 올린다.
#
# 표를 다시 만들지 않는다. 여기 적힌 파일은 전부 `IF NOT EXISTS` 와
# `ON CONFLICT` 로 짜여 있어 여러 번 돌려도 같은 자리에 선다.
#
#   DATABASE_URL=... bash scripts/db-upgrade.sh
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL 을 정하십시오}"

# **빈 DB 에 쓰지 않는다.** 여기 있는 파일은 전부 ALTER 라, 표가 없는
# DB 에 부으면 첫 줄에서 멈춘다. 그 실패를 "업그레이드가 깨졌다" 로
# 읽으면 사람이 엉뚱한 데를 고친다.
have=$(psql "$DATABASE_URL" -tAc \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'")
if [ "${have:-0}" -eq 0 ]; then
  echo "이 DB 는 비어 있습니다. 올릴 것이 없습니다." >&2
  echo "처음 세우는 자리라면: bash scripts/db-init.sh" >&2
  exit 1
fi

run() { echo; echo "── $*"; "$@"; }

# **올릴 파일 목록을 이 파일에 적지 않는다.** 전에는 여기와
# `deploy/ops/db-upgrade.sh` 두 곳에 적어 두었고, 이쪽에 ME_V3 네 줄을
# 더한 날 저쪽은 둘만 받았다. 운영에서 `npm run db:upgrade` 는 저쪽을
# 뜻하므로(운영 이미지의 `package.json` 은 `deploy/ops/package.json` 이다)
# `career_profiles` 가 선 적이 없고 `/me` 가 42P01 로 죽었다. 목록은
# `deploy/db-chain.json` 하나이고 `npm run db:chain` 이 그것을 지킨다.
while read -r f; do
  [ -n "$f" ] || continue
  echo; echo "── ${f}"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 --single-transaction -f "$f"
done < <(node -e 'for (const f of require("./deploy/db-chain.json").upgrade) console.log(f)')

# 문항이 바뀌었으면 다시 적재한다. 같은 문항이면 아무것도 안 바뀐다
run npm run -s v2:build
run npm run -s value:build
run npm run -s metri:items

echo
bash deploy/ops/db-verify.sh
echo
echo "올렸습니다. 막힌 것은 `npm run launch:check` 가 셉니다."
