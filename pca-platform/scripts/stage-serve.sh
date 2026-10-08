#!/usr/bin/env bash
# 공개 전 배포본을 이 기계에서 띄운다. **예행과 캡처가 보는 서버다.**
#
# `next start` 를 쓰지 않는다. 이 저장소는 `output: standalone` 이라 그쪽으로
# 띄우면 Next 가 경고만 내고 **지난 빌드의 자산 이름을 적은 HTML** 을 내준다.
# 쪽은 200 으로 멀쩡히 뜨고 CSS 만 400 이고, 그 상태로 찍은 그림은 제품이
# 아니다. 한 번 그렇게 속았다.
#
# standalone 서버는 **제 자리에서 돌아야 한다**: `cwd` 가 저장소 뿌리면
# `.next/static` 을 못 찾아 CSS 가 404 다. 그래서 자산을 그 안에 넣고
# 거기서 띄운다.
#
#   bash scripts/stage-serve.sh [포트]
set -euo pipefail
cd "$(dirname "$0")/.."
PORT="${1:-3100}"

[ -f .next/standalone/server.js ] || { echo "먼저 npm run build 를 돌리십시오."; exit 1; }
rm -rf .next/standalone/.next/static .next/standalone/public
cp -r .next/static .next/standalone/.next/static
[ -d public ] && cp -r public .next/standalone/public

set -a; . ./.env.local 2>/dev/null || true; set +a
export APP_ENV="${APP_ENV:-staging}"
export PORT HOSTNAME=127.0.0.1
export PLATFORM_URL="${PLATFORM_URL:-http://127.0.0.1:$PORT}"
export PDF_BASE="${PDF_BASE:-http://127.0.0.1:$PORT}"

cd .next/standalone
echo "띄웁니다 http://127.0.0.1:$PORT  (APP_ENV=$APP_ENV)"
exec node server.js
