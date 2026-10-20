#!/usr/bin/env bash
# SC-1 부분 타입 검사 (R36). **프로젝트 전체 typecheck 가 아니다.**
# npm 레지스트리가 막혀 프로젝트의 typescript(5.9.2)를 깔 수 없어, 컨테이너에
# 있는 별도 tsc 로 shared-core 와 그 테스트만 본다. 없으면 NOT VERIFIED 로 끝낸다.
set -u
TSC="${TSC:-/opt/node-tools/node_modules/.bin/tsc}"
TYPES="${TYPES:-/opt/node-tools/node_modules/@types}"
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
if [ ! -x "$TSC" ] || [ ! -d "$TYPES/node" ]; then
  echo "NOT VERIFIED: tsc 또는 @types/node 가 없습니다 ($TSC)"; exit 2
fi
CFG="$(mktemp -d)/tsconfig.json"
# R37: DB 없이 도는 벤치마크와 Evidence 검사도 넣는다 — 그 둘이 들여오는
# me-v3 scoring · result 모듈까지 따라 검사된다. DB 를 쓰는 검사는 `pg` 타입이
# 없어 넣지 않는다(NOT VERIFIED).
FILES=$( (ls "$ROOT"/src/lib/shared-core/tenant/*.ts; ls "$ROOT"/scripts/shared-core/tenant-*.test.ts \
  "$ROOT"/scripts/shared-core/evidence-aggregation.test.ts "$ROOT"/scripts/shared-core/bench/*.ts) \
  | sed 's|^|"|;s|$|"|' | paste -sd, )
cat > "$CFG" <<JSON
{ "compilerOptions": { "target":"ES2022","lib":["ES2022"],"module":"ESNext","moduleResolution":"Bundler",
  "strict":true,"noEmit":true,"skipLibCheck":true,"isolatedModules":true,"esModuleInterop":true,
  "resolveJsonModule":true,"noUnusedLocals":true,"noUnusedParameters":true,
  "types":["node"],"typeRoots":["$TYPES"],"paths":{"@/*":["$ROOT/src/*"]} },
  "files": [ $FILES ] }
JSON
echo "tsc $("$TSC" --version) · files $(echo "$FILES" | tr ',' '\n' | wc -l)"
"$TSC" -p "$CFG"; rc=$?
echo "TSC_EXIT=$rc"; exit $rc
