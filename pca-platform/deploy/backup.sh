#!/usr/bin/env bash
#
# 하루치 백업.
#
# **백업은 복구해 보기 전까지 완료가 아니다**(규격 §13). 이 스크립트는
# 받는 일만 하고, 복구 절차와 시험은 `docs/metri/44_production_infra.md`
# 에 적혀 있다. 복구를 한 번 해 본 날짜를 `DB_BACKUP_VERIFIED_AT` 에
# 적어야 `npm run launch:check` 가 그 줄을 통과시킨다.
#
# 쓰는 법 (운영 호스트의 cron):
#
#   0 17 * * *  /app/deploy/backup.sh >> /var/log/cm-backup.log 2>&1
#
# 17:00 UTC 는 한국 새벽 두 시다. **사람이 자는 시간에 받는다**: 받는
# 동안 테이블에 잠금이 걸리지는 않지만, 되돌릴 일이 생기면 그 시각이
# 복구 지점이 되고 그 지점이 영업시간 가운데면 잃는 것이 많다.
#
# 환경변수:
#   DATABASE_URL        받을 DB
#   BACKUP_DIR          받아 둘 자리 (기본 /var/backups/careermatri)
#   BACKUP_KEEP_DAYS    며칠 치를 남기는가 (기본 35)
#   BACKUP_GPG_RECIPIENT  채우면 받은 파일을 그 열쇠로 잠근다
set -euo pipefail

DIR="${BACKUP_DIR:-/var/backups/careermatri}"
KEEP="${BACKUP_KEEP_DAYS:-35}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="$DIR/cm-$STAMP.dump"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL 이 없다. 받지 않는다." >&2
  exit 1
fi

mkdir -p "$DIR"

# `-Fc` 는 압축된 사용자 정의 형식이다. **평문 SQL 로 받지 않는다**:
# 평문은 복구할 때 통째로 한 번에만 되고, 표 하나만 되돌릴 수 없다.
pg_dump --dbname="$DATABASE_URL" --format=custom --no-owner --no-privileges \
  --file="$OUT.part"
mv "$OUT.part" "$OUT"

# **받은 파일을 읽어 본다.** 열 수 없는 파일은 백업이 아니다. 목록을 뽑는
# 것만으로도 머리말이 깨진 덤프를 그 자리에서 잡는다.
pg_restore --list "$OUT" > /dev/null

# 개인정보가 들어 있는 파일이라 잠글 수 있으면 잠근다. 열쇠가 설정되지
# 않았으면 그대로 두고, 그 사실은 launch:check 가 아니라 운영 문서가 적는다.
if [ -n "${BACKUP_GPG_RECIPIENT:-}" ]; then
  gpg --batch --yes --encrypt --recipient "$BACKUP_GPG_RECIPIENT" "$OUT"
  rm -f "$OUT"
  OUT="$OUT.gpg"
fi

SIZE="$(du -h "$OUT" | cut -f1)"
echo "$(date -u +%FT%TZ)  받음 $OUT  $SIZE"

# 보존기간이 지난 것을 지운다. **마지막 하나는 남긴다**: 보존기간을 잘못
# 적어 둔 날 전부 지워지면 그날이 복구 불가능한 날이 된다.
COUNT="$(find "$DIR" -name 'cm-*.dump*' -type f | wc -l)"
if [ "$COUNT" -gt 1 ]; then
  find "$DIR" -name 'cm-*.dump*' -type f -mtime "+$KEEP" -print -delete
fi
