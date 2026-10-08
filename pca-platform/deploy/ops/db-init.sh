#!/usr/bin/env bash
# **빈 DB 를 컨테이너 안에서 처음 한 번 세운다.**
#
# `scripts/db-init.sh` 와 같은 일을 하지만, 여기는 **운영 이미지 안**이다.
# 개발 의존성이 없어서 `npm run` 으로 엮인 소스 쪽 스크립트를 쓸 수 없다.
# 그래서 psql 과, 빌드 때 한 덩이로 묶어 둔 `ops/*.cjs` 만 쓴다.
#
#   npm run db:init
#
# **앱이 뜰 때 저절로 돌지 않는다.** 사람이 이 명령을 쳐야만 돈다
# (`deploy/entrypoint.sh` 는 이 파일을 모른다). 띄울 때마다 저절로
# 마이그레이션이 도는 구조는, 배포 한 번이 DB 를 바꾸는 구조다.
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL 이 없습니다. Railway 서비스 변수를 확인하십시오}"

# 이 파일은 /app/ops 에 깔린다. 어디서 부르든 /app 에서 돈다
cd "$(dirname "$0")/.."

have=$(psql "$DATABASE_URL" -tAc \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'")
if [ "${have:-0}" -gt 0 ]; then
  echo "이 DB 에는 이미 표가 ${have}개 있습니다. 처음 세우는 자리가 아닙니다." >&2
  echo "이미 선 DB 를 올리려면: npm run db:upgrade" >&2
  exit 1
fi

# **파일 하나가 통째로 들어가거나 통째로 안 들어간다.** 가운데서 끊기면
# 표 절반만 선 DB 가 남고, 그 상태는 db:init 도 db:upgrade 도 맞지 않는
# 자리가 된다. CONCURRENTLY 를 쓰는 곳이 없어 한 트랜잭션으로 묶을 수 있다.
pour() {
  local label=$1; shift
  echo; echo "── ${label}"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 --single-transaction "$@"
}

pour "표"            -f db/schema.sql
pour "검사·스킬트리"  -f db/schema_metri.sql -f db/seed/metri/skill_tree.sql
pour "플랫폼"        -f db/schema_platform.sql
pour "PHASE2"        -f db/schema_phase2.sql
pour "PHASE2.1"      -f db/schema_phase2_1.sql
pour "PHASE2.2"      -f db/schema_phase2_2.sql
pour "PHASE2.3"      -f db/schema_phase2_3.sql
pour "PHASE2.4"      -f db/schema_phase2_4.sql
# **ME_V3 를 빼먹으면 응시 화면이 통째로 500 이다.** V3 는 제 표를 따로
# 쓰고(`v3_attempts` · `v3_responses` · `v3_snapshots`), 그 표가 없으면
# `/v3/start` 가 첫 줄에서 멈춘다. 화면은 멀쩡해 보이고 검사만 안 된다
pour "ME_V3"         -f db/schema_v3_runtime.sql
pour "ME_V3 파일럿"   -f db/schema_v3_pilot.sql

# 대학판 문항. 안에서 한 트랜잭션으로 올린다
echo; echo "── 검사 문항"
node ops/seed-instrument.cjs

# **정적 사이트 생성물은 여기서 만들지 않는다.** `v2:build` 와
# `value:build` 는 DB 가 아니라 `sites/pca-platform/data/*.js` 를 쓰는
# 빌드 산출물이고, 이미 이미지 안에 들어 있다.

echo
echo "표와 문항이 섰습니다. **시드와 시연 자료는 넣지 않았습니다.**"
bash ops/db-verify.sh
echo
echo "운영자 계정을 하나 만드십시오:"
echo "  npm run make:admin -- <아이디> <이메일> <이름>"
