#!/usr/bin/env bash
# 정적 미리보기 내보내기 (서버 없이 열리는 파일 한 벌).
#
#   bash scripts/static-export.sh kr out-kr
#
# 문의 쪽은 서버를 쓰지 않고 메일 앱을 여는 방식이라 바꿔치울 것이 없다.
# 활자도 public/fonts 의 파일 하나를 그대로 쓴다. 정적 내보내기에는
# next.config.ts 의 리디렉션(/pricing · /terms 등)이 없다: 미리보기용이다.
set -euo pipefail
site="${1:-kr}"; outdir="${2:-out-$site}"
cd "$(dirname "$0")/.."
rm -rf .next-static "$outdir"
STATIC=1 SITE="$site" node ../node_modules/next/dist/bin/next build
mv .next-static "$outdir"
echo "내보냄: $outdir"
