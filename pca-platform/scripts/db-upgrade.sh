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

run npm run -s db:phase2
run npm run -s db:phase2_1
run npm run -s db:phase2_2
run npm run -s db:phase2_3
run npm run -s db:phase2_4
run npm run -s db:pilot

# ME_V3. **넉 달 동안 이 네 줄이 빠져 있었다.** 스키마 파일은 저장소에
# 있었고 어느 목록에도 없어서 운영과 staging 에 V3 표가 한 번도 선 적이
# 없다. 그 상태로 `/v3/start` 를 누르면 500 이다. 차례가 곧 조건이다:
# arch 의 `regions` 와 `career_profiles` 가 platform 보다 먼저 서야 한다
run npm run -s db:v3           # db/schema_v3_runtime.sql
run npm run -s db:v3:arch      # 시장 · 지역 · 지금 값 · event
run npm run -s db:v3:platform  # 경험 · 할 일 · 공고 계약 · Track
run npm run -s db:v3:pilot     # 파일럿
run npm run -s db:v3:regions   # 권역 다섯과 산업 여덟 (**기업 자료는 없다**)

# 문항이 바뀌었으면 다시 적재한다. 같은 문항이면 아무것도 안 바뀐다
run npm run -s v2:build
run npm run -s value:build
run npm run -s metri:items

echo
bash deploy/ops/db-verify.sh
echo
echo "올렸습니다. 막힌 것은 `npm run launch:check` 가 셉니다."
