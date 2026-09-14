#!/usr/bin/env bash
# Artifact 미리보기 한 벌 만들기 — 내보내기 · 경로 보정 · 한 장 묶기.
# 순서가 있고, 묶은 폴더를 다시 묶으면 index 한 장만 남는다. 그래서 한 줄로 묶어 둔다.
set -euo pipefail
site="$1"; outdir="$2"
here="$(cd "$(dirname "$0")" && pwd)"
rm -rf "$outdir"
bash "$here/static-export.sh" "$site" "$outdir"
node "$here/static-fix.mjs" "$outdir"
node "$here/artifact-bundle.mjs" "$outdir"
