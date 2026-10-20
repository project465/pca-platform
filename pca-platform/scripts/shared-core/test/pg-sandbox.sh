#!/usr/bin/env bash
# 검사용 **일회용** PostgreSQL. 운영·Staging DB 에 붙지 않는다.
#
#   bash scripts/shared-core/test/pg-sandbox.sh up     # 띄우고 스키마 차례를 붓는다
#   bash scripts/shared-core/test/pg-sandbox.sh down   # 멈추고 지운다
#
# 데이터 디렉터리는 OS 임시 폴더에 두고 `down` 이 통째로 지운다. 스키마는
# `deploy/db-chain.json` 의 base + upgrade 를 그대로 붓는다(그 파일을 읽기만
# 한다). 소켓만 열고 TCP 는 열지 않는다(listen_addresses='').
#
# up 이 마지막 줄에 `DATABASE_URL=...` 을 찍는다.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
STATE="${SC_PG_STATE:-${TMPDIR:-/tmp}/sc-pg-sandbox}"
PORT="${SC_PG_PORT:-55436}"
BIN="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)"
DB=sc_test

as_pg() {
  if [ "$(id -u)" = "0" ]; then runuser -u postgres -- "$@"; else "$@"; fi
}

case "${1:-}" in
  up)
    [ -x "$BIN/initdb" ] || { echo "PostgreSQL 서버 바이너리가 없습니다" >&2; exit 2; }
    if [ -d "$STATE" ]; then echo "이미 있습니다: $STATE (먼저 down)" >&2; exit 1; fi
    mkdir -p "$STATE/data" "$STATE/sock"
    [ "$(id -u)" = "0" ] && chown -R postgres:postgres "$STATE"
    as_pg "$BIN/initdb" -D "$STATE/data" -A trust -U postgres -E UTF8 --locale=C.UTF-8 >"$STATE/initdb.log"
    as_pg "$BIN/pg_ctl" -D "$STATE/data" -l "$STATE/server.log" -w \
      -o "-p $PORT -k $STATE/sock -c listen_addresses=''" start >/dev/null
    URL="postgresql://postgres@/postgres?host=$STATE/sock&port=$PORT"
    psql -X -q "$URL" -c "CREATE DATABASE $DB" >/dev/null
    URL="postgresql://postgres@/$DB?host=$STATE/sock&port=$PORT"
    cd "$ROOT"
    while read -r f; do
      [ -n "$f" ] || continue
      psql -X -q "$URL" -v ON_ERROR_STOP=1 --single-transaction -f "$f" >>"$STATE/chain.log" 2>&1 \
        || { echo "스키마 차례에서 멈췄습니다: $f (로그 $STATE/chain.log)" >&2; exit 1; }
      echo "  부음 $f" >>"$STATE/applied.txt"
    done < <(node -e 'const c=require("./deploy/db-chain.json");for(const f of [...c.base,...c.upgrade])console.log(f)')
    echo "DATABASE_URL=$URL"
    ;;
  down)
    if [ -d "$STATE/data" ]; then
      as_pg "$BIN/pg_ctl" -D "$STATE/data" -m fast stop >/dev/null 2>&1 || true
    fi
    rm -rf "$STATE"
    echo "지웠습니다: $STATE"
    ;;
  *) echo "쓰임: $0 up|down" >&2; exit 2 ;;
esac
