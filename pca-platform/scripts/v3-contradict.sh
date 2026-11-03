#!/usr/bin/env bash
# 결과 화면 · PDF 모순 점검을 **한 번에** 돈다(2026-11-03 대표 지시 R1~R9).
#
#   npm run v3:contradict
#
# 하는 일:
#   1. 로컬 DB 에만 쓴다. 주소가 운영처럼 보이면 멈춘다
#   2. 서버가 떠 있지 않으면 지금 빌드를 띄우고(stage-serve), 끝나면 끈다
#   3. 4개 기관(PCU · KUS · JJU · SJEPA) × 답안 A · B · C 를 제품과 같은 길로 응시하고
#      모든 응시의 책(PDF HTML)을 R1~R9 로, 기관마다 대표 학과 하나를 **실제 웹 결과와 내려받은 PDF** 로 본다
#   4. 표는 var/contradict/결과모순점검.md · 걸린 문장은 같은 파일 아래쪽 · PDF 와 뽑은 글자는 var/contradict/pdf/
#
# 바꿀 수 있는 것: UNIS=JJU · SETS=B · PER_UNI=3(기관마다 책으로 볼 갈래 수) · WEB_PER_UNI=1 · PORT=3300 · OUT=...
#
# **운영에 배포하지 않는다. 운영 DB 에 쓰지 않는다.** 점검 학생 계정의 열쇠는 이 과정 안에서만 쓰고 적지 않는다.
set -euo pipefail
cd "$(dirname "$0")/.."

set -a; . ./.env.local 2>/dev/null || true; set +a
: "${DATABASE_URL:?DATABASE_URL 을 .env.local 에 적으십시오(로컬 DB)}"
case "$DATABASE_URL" in
  *prod*|*production*|*railway*|*rlwy*) echo "운영처럼 보이는 DB 주소입니다. 로컬 DB 에서만 돌리십시오." >&2; exit 1;;
esac

PORT="${PORT:-3300}"
export UI_BASE="${UI_BASE:-http://127.0.0.1:$PORT}"
export OUT="${OUT:-var/contradict}"
export PER_UNI="${PER_UNI:-3}" WEB=1 WEB_PER_UNI="${WEB_PER_UNI:-1}"
# 종이를 그리는 크로뮴. 서버(PDF)와 점검(책 글자) 둘 다 같은 것을 쓴다
if [ -z "${CHROMIUM_PATH:-}" ] && [ -x /opt/pw-browsers/chromium ]; then export CHROMIUM_PATH=/opt/pw-browsers/chromium; fi

started=""
if ! curl -s --noproxy '*' --max-time 2 -o /dev/null "$UI_BASE/api/health"; then
  [ -f .next/standalone/server.js ] || { echo "빌드가 없습니다: NODE_OPTIONS=--max-old-space-size=4096 npx next build" >&2; exit 1; }
  echo "서버를 띄웁니다 $UI_BASE"
  bash scripts/stage-serve.sh "$PORT" > "${TMPDIR:-/tmp}/v3-contradict-serve.log" 2>&1 &
  started=$!
  for _ in $(seq 1 60); do
    curl -s --noproxy '*' --max-time 2 -o /dev/null "$UI_BASE/api/health" && break
    sleep 1
  done
  trap '[ -n "$started" ] && kill "$started" 2>/dev/null || true' EXIT
fi

npx tsx scripts/v3-common-check.ts
echo
echo "표: $OUT/결과모순점검.md"
