#!/usr/bin/env bash
#
# 복구 시험.
#
# **백업은 복구해 보기 전까지 완료가 아니다**(규격 §8·§13). 파일이 있다는
# 것은 받았다는 뜻이지 되돌아올 수 있다는 뜻이 아니다. 그래서 이 스크립트가
# 끝까지 한 바퀴를 돈다.
#
#   받는다 → 빈 DB 를 만든다 → 붓는다 → 돈과 사람이 든 표를 센다
#   → 제약이 살아 있는지 본다 → 결과지가 실제로 열리는지 본다 → 치운다
#
# **운영 DB 에 붓지 않는다.** 새로 만든 DB 에만 붓고, 끝나면 지운다.
#
#   DATABASE_URL=... bash scripts/backup-restore.sh
#   KEEP=1 ... bash scripts/backup-restore.sh      # 붓고 나서 안 지운다
#
# 통과하면 마지막 줄에 오늘 날짜가 나온다. 그 날짜를
# `DB_BACKUP_VERIFIED_AT` 에 적어야 `npm run launch:check` 가 그 줄을
# 통과시킨다.
set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL 이 없다." >&2
  exit 1
fi

WORK="${BACKUP_RESTORE_DIR:-${TMPDIR:-/tmp}/cm-restore-test}"
mkdir -p "$WORK"
DUMP="$WORK/probe.dump"
TEST_DB="cm_restore_test_$$"

# 붓는 쪽은 같은 서버의 다른 DB 다. 이름만 바꿔서 붙는다.
ADMIN_URL="$(python3 - "$DATABASE_URL" <<'PY'
import sys, urllib.parse as u
p = u.urlparse(sys.argv[1])
print(u.urlunparse(p._replace(path="/postgres")))
PY
)"
TEST_URL="$(python3 - "$DATABASE_URL" "$TEST_DB" <<'PY'
import sys, urllib.parse as u
p = u.urlparse(sys.argv[1])
print(u.urlunparse(p._replace(path="/" + sys.argv[2])))
PY
)"

cleanup() {
  if [ "${KEEP:-0}" = "1" ]; then
    echo "  (KEEP=1 이라 $TEST_DB 를 남겨 둔다)"
    return
  fi
  psql "$ADMIN_URL" -q -c "DROP DATABASE IF EXISTS $TEST_DB" >/dev/null 2>&1 || true
  rm -f "$DUMP"
}
trap cleanup EXIT

fail() { echo "  실패  $1" >&2; exit 1; }

echo "1. 받는다"
pg_dump --dbname="$DATABASE_URL" --format=custom --no-owner --no-privileges \
  --file="$DUMP"
SIZE="$(du -h "$DUMP" | cut -f1)"
echo "   $DUMP  $SIZE"

echo "2. 받은 파일을 읽어 본다"
TABLES="$(pg_restore --list "$DUMP" | grep -c 'TABLE DATA' || true)"
[ "$TABLES" -gt 0 ] || fail "덤프에 표가 없다"
echo "   표 $TABLES 개"

echo "3. 빈 DB 를 만든다"
psql "$ADMIN_URL" -q -c "DROP DATABASE IF EXISTS $TEST_DB"
psql "$ADMIN_URL" -q -c "CREATE DATABASE $TEST_DB"

echo "4. 붓는다"
# 소유자·권한 줄은 건너뛰므로 경고가 뜰 수 있다. 오류만 본다.
pg_restore --dbname="$TEST_URL" --no-owner --no-privileges "$DUMP" 2>&1 \
  | grep -v 'warning:' || true

echo "5. 돈과 사람이 든 표를 센다"
psql "$TEST_URL" -q -t -A -F'	' -c "
  SELECT 'users', count(*) FROM users
  UNION ALL SELECT 'orders', count(*) FROM orders
  UNION ALL SELECT 'payments', count(*) FROM payments
  UNION ALL SELECT 'entitlements', count(*) FROM entitlements
  UNION ALL SELECT 'attempts', count(*) FROM attempts
  UNION ALL SELECT 'report_snapshots', count(*) FROM report_snapshots
  UNION ALL SELECT 'products', count(*) FROM products" \
  | while IFS=$'\t' read -r t n; do printf "   %-18s %s\n" "$t" "$n"; done

# 운영 DB 와 숫자가 같은가. **다르면 덤프가 반쪽이다**
for T in users orders payments entitlements attempts report_snapshots products; do
  A="$(psql "$DATABASE_URL" -q -t -A -c "SELECT count(*) FROM $T")"
  B="$(psql "$TEST_URL" -q -t -A -c "SELECT count(*) FROM $T")"
  [ "$A" = "$B" ] || fail "$T 의 줄 수가 다르다 (운영 $A · 복구 $B)"
done
echo "   일곱 표의 줄 수가 같다"

echo "6. 제약이 살아 있는지 본다"
# 표만 돌아오고 제약이 안 돌아오면, 복구한 DB 에서 같은 결제가 두 번
# 적히고 미승인 가격에 금액이 붙는다. 그런 DB 는 되돌아온 것이 아니다.
NEED="products_price_status_chk products_not_approved_zero_chk orders_status_chk
      outbox_kind_check job_failures_kind_chk refund_requests_one_open_idx
      entitlements_order_uniq orders_order_no_key"
for C in $NEED; do
  FOUND="$(psql "$TEST_URL" -q -t -A -c "
    SELECT count(*) FROM (
      SELECT conname AS n FROM pg_constraint
      UNION ALL SELECT indexname FROM pg_indexes WHERE schemaname='public'
    ) x WHERE n = '$C'")"
  # **하나가 아니라 하나 이상이다.** UNIQUE 제약은 같은 이름의 인덱스를
  # 함께 만들어서 두 표에 다 나온다. `= 1` 로 두면 그런 제약이 늘 걸린다.
  [ "$FOUND" -ge 1 ] || fail "제약 $C 가 복구본에 없다"
done
echo "   제약 여덟 가지가 살아 있다"

echo "7. 결과지가 실제로 열리는지 본다"
# 표가 다 있어도 payload 가 깨져 있으면 결과지가 안 그려진다.
SNAPS="$(psql "$TEST_URL" -q -t -A -c "SELECT count(*) FROM report_snapshots")"
if [ "$SNAPS" -gt 0 ]; then
  GOOD="$(psql "$TEST_URL" -q -t -A -c "
    SELECT count(*) FROM report_snapshots
     WHERE payload ? 'result' AND payload->'result' IS NOT NULL")"
  [ "$GOOD" = "$SNAPS" ] || fail "결과 객체가 깨진 스냅샷이 있다 ($GOOD / $SNAPS)"
  echo "   결과지 $SNAPS 장이 열린다"
else
  echo "   결과지가 아직 없다 (셀 것이 없다)"
fi

echo "8. 해 봤다는 것을 적는다"
# **사람이 손으로 적는 날짜를 믿지 않는다.** 환경변수에 날짜만 적어 두면
# 복구를 안 해 보고도 적을 수 있고, 그러면 런칭 화면이 거짓말을 한다.
# 이 스크립트가 끝까지 돈 자리에서만 이 줄이 생긴다.
TODAY="$(date -u +%Y-%m-%d)"
HOSTBIT="$(python3 - "$DATABASE_URL" <<'PY2'
import sys, urllib.parse as u
p = u.urlparse(sys.argv[1])
print((p.hostname or "socket") + (p.path or ""))
PY2
)"
psql "$DATABASE_URL" -q -c "
  INSERT INTO site_settings (key, value, updated_at)
  VALUES ('backup_restore_verified_at', '$TODAY', now()),
         ('backup_restore_target', '$HOSTBIT', now())
  ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value, updated_at = now()" >/dev/null
echo "   site_settings 에 $TODAY · $HOSTBIT"

echo
echo "복구 시험 OK ($TODAY). 런칭 화면이 이 기록을 읽는다."
