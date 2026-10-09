#!/usr/bin/env bash
# **이미 선 DB 에 더해진 것만 올린다.** 컨테이너 안에서 돈다.
#
#   npm run db:upgrade
#
# 여기 적힌 파일은 전부 `IF NOT EXISTS` 와 `ON CONFLICT` 로 짜여 있어
# 여러 번 돌려도 같은 자리에 선다. 표를 다시 만들지 않는다.
#
# **올릴 파일 목록을 이 파일에 적지 않는다.** 전에는 적어 두었고, 저장소
# 쪽 목록(`scripts/db-upgrade.sh`)이 늘었을 때 이쪽이 안 늘었다. ME_V3 네
# 줄 가운데 둘만 여기 있어서 `career_profiles` 가 운영에 선 적이 없고
# `/me` 가 `relation "career_profiles" does not exist` 로 죽었다. 목록은
# `deploy/db-chain.json` 하나이고 `npm run db:chain` 이 그것을 지킨다.
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL 이 없습니다. Railway 서비스 변수를 확인하십시오}"

# 이 파일은 /app/ops 에 깔린다. 어디서 부르든 /app 에서 돈다
cd "$(dirname "$0")/.."

# **빈 DB 에 쓰지 않는다.** 여기 있는 파일은 전부 ALTER 라, 표가 없는
# DB 에 부으면 첫 줄에서 멈춘다. 그 실패를 "업그레이드가 깨졌다" 로
# 읽으면 사람이 엉뚱한 데를 고친다.
have=$(psql "$DATABASE_URL" -tAc \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'")
if [ "${have:-0}" -eq 0 ]; then
  echo "이 DB 는 비어 있습니다. 올릴 것이 없습니다." >&2
  echo "처음 세우는 자리라면: npm run db:init" >&2
  exit 1
fi

CHAIN=deploy/db-chain.json
[ -f "$CHAIN" ] || { echo "목록이 없습니다: $CHAIN" >&2; exit 1; }

# **한 파일이 통째로 들어가거나 통째로 안 들어간다**(`--single-transaction`).
# 차례가 곧 조건이라 목록 순서를 그대로 따른다
while read -r f; do
  [ -n "$f" ] || continue
  echo; echo "── ${f}"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 --single-transaction -f "$f"
done < <(node -e 'for (const f of require("./deploy/db-chain.json").upgrade) console.log(f)')

echo; echo "── 검사 문항"
node ops/seed-instrument.cjs

echo
bash ops/db-verify.sh
