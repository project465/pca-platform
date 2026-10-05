#!/usr/bin/env bash
# **이미 선 DB 에 더해진 것만 올린다.** 컨테이너 안에서 돈다.
#
#   npm run db:upgrade
#
# 여기 적힌 파일은 전부 `IF NOT EXISTS` 와 `ON CONFLICT` 로 짜여 있어
# 여러 번 돌려도 같은 자리에 선다. 표를 다시 만들지 않는다.
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

pour() {
  local label=$1; shift
  echo; echo "── ${label}"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 --single-transaction "$@"
}

pour "PHASE2"   -f db/schema_phase2.sql
pour "PHASE2.1" -f db/schema_phase2_1.sql
pour "PHASE2.2" -f db/schema_phase2_2.sql
pour "PHASE2.3" -f db/schema_phase2_3.sql
pour "PHASE2.4" -f db/schema_phase2_4.sql

echo; echo "── 검사 문항"
node ops/seed-instrument.cjs

echo
bash ops/db-verify.sh
