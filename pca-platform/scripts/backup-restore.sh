#!/usr/bin/env bash
#
# 복구 시험.
#
# **백업은 복구해 보기 전까지 완료가 아니다**(규격 §8·§13). 파일이 있다는
# 것은 받았다는 뜻이지 되돌아올 수 있다는 뜻이 아니다. 그래서 이 스크립트가
# 끝까지 한 바퀴를 돈다.
#
#   받는다 → 빈 DB 를 만든다 → 붓는다 → 돈과 사람이 든 표를 센다
#   → 제약과 외래키가 살아 있는지 본다 → 결과지가 실제로 열리는지 본다
#   → 치운다
#
# ## 운영 원본은 **읽기만 한다**
#
# 이 스크립트가 운영 DB 에 쓰는 것은 **마지막 한 줄**뿐이다: 해 봤다는
# 기록(`site_settings` 두 칸). 손님 자료가 든 표는 한 줄도 건드리지
# 않는다. 그 한 줄도 싫으면 `READ_ONLY=1` 로 끈다 — 다만 그러면 기록이
# 남지 않아 `launch:check` 의 백업 줄이 그대로 막힌다.
#
# **붓는 자리를 따로 둔다.** 기본값은 같은 서버의 새 DB 인데, 운영
# 서버에 DB 를 만드는 것 자체가 운영 서버를 건드리는 일이다. 그래서
# 운영처럼 보이는 주소에서는 **거절하고**, 둘 중 하나를 요구한다.
#
#   RESTORE_URL=postgres://.../postgres   임시 PostgreSQL 의 관리 DB
#   SAME_SERVER=1                         운영 서버에 만들어도 된다고 명시
#
#   DATABASE_URL=... RESTORE_URL=... bash scripts/backup-restore.sh
#   PLAN=1 DATABASE_URL=... bash scripts/backup-restore.sh   # 돌리지 않고 순서만
#   KEEP=1 ... bash scripts/backup-restore.sh                # 붓고 나서 안 지운다
#
# 통과하면 `site_settings` 에 날짜가 적히고, `/admin/launch` 와
# `npm run ops:check` 가 그 기록을 읽는다. **환경변수로는 적히지
# 않는다**: 사람이 날짜 한 줄 넣어서 초록을 만들 수 있으면 그 화면은
# 거짓말을 한다.
set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL 이 없다." >&2
  exit 1
fi

WORK="${BACKUP_RESTORE_DIR:-${TMPDIR:-/tmp}/cm-restore-test}"
mkdir -p "$WORK"
DUMP="$WORK/probe.dump"
TEST_DB="cm_restore_test_$$"

# **붓는 자리를 고른다.** `RESTORE_URL` 이 있으면 그 서버에, 없으면 같은
# 서버에 만든다. 같은 서버가 운영처럼 보이면 거절한다 — 운영 서버에 DB 를
# 만드는 것도 운영 서버를 건드리는 일이고, 디스크가 꽉 차면 그날 장사가
# 멈춘다.
if [ -n "${RESTORE_URL:-}" ]; then
  ADMIN_URL="$RESTORE_URL"
  WHERE="별도 임시 서버"
else
  ADMIN_URL="$(python3 - "$DATABASE_URL" <<'PY'
import sys, urllib.parse as u
p = u.urlparse(sys.argv[1])
print(u.urlunparse(p._replace(path="/postgres")))
PY
)"
  WHERE="운영과 같은 서버"
  LOCAL="$(python3 - "$DATABASE_URL" <<'PY'
import sys, urllib.parse as u
h = (u.urlparse(sys.argv[1]).hostname or "socket")
print("yes" if h in ("localhost", "127.0.0.1", "socket", "::1") else "no")
PY
)"
  if [ "$LOCAL" = "no" ] && [ "${SAME_SERVER:-0}" != "1" ]; then
    echo "거절: 운영처럼 보이는 서버에 임시 DB 를 만들려고 한다." >&2
    echo "  RESTORE_URL 로 별도 임시 PostgreSQL 을 가리키거나," >&2
    echo "  운영 서버에 만들어도 된다면 SAME_SERVER=1 을 붙인다." >&2
    exit 1
  fi
fi
TEST_URL="$(python3 - "$ADMIN_URL" "$TEST_DB" <<'PY'
import sys, urllib.parse as u
p = u.urlparse(sys.argv[1])
print(u.urlunparse(p._replace(path="/" + sys.argv[2])))
PY
)"

# **돌리지 않고 순서만 보여 준다.** 운영에서 처음 돌리는 날, 무엇이
# 일어날지 먼저 읽을 수 있어야 한다.
if [ "${PLAN:-0}" = "1" ]; then
  cat <<PLANOUT
복구 시험 계획 — **아무것도 실행하지 않았다**

  받을 곳      운영 DB (읽기만)
  부을 곳      $WHERE · 임시 DB $TEST_DB
  작업 폴더    $WORK

  1  pg_dump --dbname=<운영> --format=custom --no-owner --no-privileges --file=$DUMP
  2  pg_restore --list $DUMP | grep -c 'TABLE DATA'
  3  psql <$WHERE/postgres> -c "CREATE DATABASE $TEST_DB"
  4  pg_restore --dbname=<$TEST_DB> --no-owner --no-privileges $DUMP
  5  표 열넷의 줄 수를 운영과 맞춘다
     users · orders · payments · entitlements · products
     attempts · v2_responses · report_snapshots · evidence_profiles
     v3_attempts · v3_responses · v3_snapshots · v3_experiences
     career_profiles
  6  제약 열 가지와 외래키 개수가 같은지 본다
  7  굳은 결과가 살아 있는지 본다
     report_snapshots.payload 의 result · v3_snapshots 의 result_model 과 판본
  8  site_settings 두 칸에 날짜와 대상을 적는다
  9  psql <$WHERE/postgres> -c "DROP DATABASE $TEST_DB"

운영 DB 에 쓰는 것은 8번 한 줄뿐이다(READ_ONLY=1 로 끌 수 있다).
손님 자료가 든 표는 한 줄도 건드리지 않는다. KEEP=1 이면 9번을 건너뛴다.
PLANOUT
  exit 0
fi

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

# 세는 표를 **한 목록으로 둔다.** 두 곳에 적어 두면 표를 더하는 날 한쪽만
# 늘고, 그것이 바로 마이그레이션 목록이 두 벌이었던 장애의 모양이다.
#
# **지금 파는 판본의 표가 빠져 있었다.** 아홉 표가 전부 ME_V1·V2 때의
# 것이어서, V3 응시와 결과와 지금 상태가 통째로 안 돌아와도 이 검사가
# `줄 수가 같다` 를 찍고 지나갔다. 돈을 낸 사람의 결과지는 지금
# `v3_snapshots` 에 있다.
COUNT_TABLES="users orders payments entitlements products
  attempts v2_responses report_snapshots evidence_profiles
  v3_attempts v3_responses v3_snapshots v3_experiences career_profiles"

echo "5. 돈과 사람이 든 표를 센다"
NT=0
for T in $COUNT_TABLES; do
  # 운영 DB 와 숫자가 같은가. **다르면 덤프가 반쪽이다**
  A="$(psql "$DATABASE_URL" -q -t -A -c "SELECT count(*) FROM $T")"
  B="$(psql "$TEST_URL" -q -t -A -c "SELECT count(*) FROM $T")"
  printf "   %-18s %s\n" "$T" "$B"
  [ "$A" = "$B" ] || fail "$T 의 줄 수가 다르다 (운영 $A · 복구 $B)"
  NT=$((NT + 1))
done
echo "   표 ${NT}개의 줄 수가 같다"

echo "6. 제약이 살아 있는지 본다"
# 표만 돌아오고 제약이 안 돌아오면, 복구한 DB 에서 같은 결제가 두 번
# 적히고 미승인 가격에 금액이 붙는다. 그런 DB 는 되돌아온 것이 아니다.
# **V3 의 둘을 같이 본다.** 앞의 여덟은 돈 쪽이고 뒤의 둘은 지금 판본이
# 기대는 제약이다. `career_profiles` 의 유일 제약이 없으면 표가 서 있어도
# 쓰는 자리 셋이 `ON CONFLICT (user_id, core_code)` 로 42P10 을 받는다.
# 표를 세는 것만으로는 통과하고 화면은 그대로 500 이다.
NEED="products_price_status_chk products_not_approved_zero_chk orders_status_chk
      outbox_kind_check job_failures_kind_chk refund_requests_one_open_idx
      entitlements_order_uniq orders_order_no_key
      career_profiles_user_id_core_code_key career_events_dedupe_uniq"
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
echo "   제약 열 가지가 살아 있다"

# **외래키는 이름이 아니라 개수로 센다.** 제약 여덟 가지는 이름을 적어
# 두면 되지만 외래키는 백여 개라 적어 둘 수 없고, 적어 두면 표를 더하는
# 날마다 이 줄이 걸린다. 운영과 같은 개수면 덤프가 통째로 왔다는 뜻이다.
FK_A="$(psql "$DATABASE_URL" -q -t -A -c "
  SELECT count(*) FROM pg_constraint
   WHERE contype='f' AND connamespace='public'::regnamespace")"
FK_B="$(psql "$TEST_URL" -q -t -A -c "
  SELECT count(*) FROM pg_constraint
   WHERE contype='f' AND connamespace='public'::regnamespace")"
[ "$FK_A" = "$FK_B" ] || fail "외래키 개수가 다르다 (운영 $FK_A · 복구 $FK_B)"
echo "   외래키 ${FK_B}개가 살아 있다"

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

# **지금 판본의 결과지는 다른 표에 있다.** `report_snapshots` 만 보면
# ME_V2 결과만 확인하고 끝난다. V3 는 굳은 결과 모델과 판본 열두 칸이
# `v3_snapshots` 한 줄에 함께 들어 있다.
V3S="$(psql "$TEST_URL" -q -t -A -c "SELECT count(*) FROM v3_snapshots")"
if [ "$V3S" -gt 0 ]; then
  V3GOOD="$(psql "$TEST_URL" -q -t -A -c "
    SELECT count(*) FROM v3_snapshots
     WHERE result_model IS NOT NULL
       AND module_versions ? 'scoring_version'
       AND module_versions ? 'item_bank_version'")"
  [ "$V3GOOD" = "$V3S" ] \
    || fail "굳은 결과나 판본이 빠진 V3 스냅샷이 있다 ($V3GOOD / $V3S)"
  echo "   지금 판본 결과지 $V3S 장이 판본과 함께 돌아왔다"
else
  echo "   지금 판본 결과지가 아직 없다 (셀 것이 없다)"
fi

echo "8. 해 봤다는 것을 적는다"
if [ "${READ_ONLY:-0}" = "1" ]; then
  echo "   (READ_ONLY=1 — 운영 DB 에 한 줄도 쓰지 않는다. 기록이 안 남으므로"
  echo "    launch:check 의 백업 줄은 그대로 막힌다)"
  echo
  echo "복구 시험 OK — 다만 기록을 남기지 않았다."
  exit 0
fi
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
