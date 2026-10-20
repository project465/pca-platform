#!/usr/bin/env bash
# 기존 측정·채점 회귀 검사를 한 자리에서 돌리고 결과를 TSV 로 남긴다.
#
#   bash scripts/sejong/ci-regression.sh <앱 폴더> <결과.tsv>
#
# 세종 가지(HEAD)와 기준 커밋(0bff307c)에서 **같은 목록을 같은 환경으로** 돌린다.
# 두 표를 견주면, 걸린 줄이 세종 작업 때문인지(기준에서는 통과) 원래부터
# 걸리던 것인지(기준에서도 걸림) 갈린다. 걸린 줄 하나로 결론을 내지 않는다.
#
# 어느 검사도 고치지 않는다. 서버를 띄워야 하는 검사(브라우저로 누르는 것)는
# 목록에 넣지 않았다: 그쪽은 이 환경에서 무엇을 재는지가 달라진다.
set -uo pipefail
APP="$1"; OUT="$2"
cd "$APP"
: > "$OUT"
CHECKS=(
  "typecheck"
  "v2:frozen"
  "v3:freeze:measure"
  "v3:domains"
  "v3:items"
  "v3:persona"
  "v3:scoring"
  "v3:measure"
  "v3:result"
  "v3:freeze"
  "v3:result:freeze"
  "golden:check"
  "v2:check"
  "evidence:check"
  "db:chain"
  "campus:check"
)
mkdir -p "$(dirname "$OUT")/logs"
tag="$(basename "$OUT" .tsv)"
for c in "${CHECKS[@]}"; do
  if ! node -e "process.exit(require('./package.json').scripts['$c']?0:1)"; then
    printf '%s\t%s\t%s\n' "$c" "NA" "0" >> "$OUT"; continue
  fi
  s=$(date +%s)
  log="$(dirname "$OUT")/logs/${tag}__${c//[:\/]/_}.log"
  timeout 900 npm run -s "$c" > "$log" 2>&1
  rc=$?
  printf '%s\t%s\t%s\n' "$c" "$rc" "$(( $(date +%s) - s ))" >> "$OUT"
  echo "[$tag] $c → $rc"
done
exit 0
