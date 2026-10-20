#!/usr/bin/env bash
# R36 보호 검사 — 측정·채점·DB 사슬이 그대로인가를 명령과 종료코드로 남긴다.
#   bash scripts/shared-core/test/protect.sh <저장소 뿌리> <로그 디렉터리>
# npm 이 없어 `npm run` 대신 Node 22 strip-types + 이 디렉터리의 loader 로
# package.json 이 가리키는 같은 스크립트를 그대로 돌린다(내용은 고치지 않는다).
# v3:freeze 는 db.ts 를 들여오므로 DATABASE_URL(샌드박스)과 SC_SHIMS=1 이 필요하다.
set -u
ROOT="$(cd "${1:?저장소 뿌리}" && pwd)"; OUT="${2:?로그 디렉터리}"
mkdir -p "$OUT"; OUT="$(cd "$OUT" && pwd)"
HERE="$(cd "$(dirname "$0")" && pwd)"
REG="$ROOT/scripts/shared-core/test/register.mjs"
[ -f "$REG" ] || { echo "loader 가 그 뿌리에 없습니다: $REG"; exit 2; }
N="node --no-warnings --experimental-strip-types --import $REG"
SUM="$OUT/summary.tsv"; : > "$SUM"
run() { # 이름 · 환경 · 스크립트
  local name="$1" envs="$2" script="$3"
  ( cd "$ROOT" && env $envs timeout 900 $N "$script" ) > "$OUT/$name.log" 2>&1
  local rc=$?
  local last; last="$(grep -E '통과|걸림|동결|OK|어긋난|확인 [0-9]' "$OUT/$name.log" | tail -1 | tr '\t' ' ')"
  printf '%s\t%s\t%s\t%s\n' "$name" "$rc" "env ${envs:-(없음)} node … $script" "$last" >> "$SUM"
  echo "$name EXIT=$rc  $last"
}
DB="${SANDBOX_URL:-postgresql://postgres@/sc_test?host=/tmp/sc-pg-sandbox/sock&port=55436}"
run v2-frozen          ""                       scripts/v2-frozen.ts
run v3-freeze-measure  ""                       scripts/v3-measurement-freeze.ts
run v3-freeze          "SC_SHIMS=1 DATABASE_URL=$DB" scripts/v3-freeze-check.ts
run v3-result-freeze   ""                       scripts/v3-result-freeze.ts
run v3-workspace       ""                       scripts/v3-workspace-freeze.ts
run db-chain           ""                       scripts/db-chain-check.ts
run campus-check       ""                       scripts/campus-check.ts
for c in ME_CORE_V3 BIZ_CORE_V1 EE_CORE_V1 CS_CORE_V1; do
  run "v3-scoring-$c"  "CORE=$c"                scripts/v3-scoring-check.ts
done
echo "요약: $SUM"
