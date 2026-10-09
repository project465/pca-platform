#!/usr/bin/env bash
# **빈 운영 DB 를 처음 한 번** 세운다.
#
# `dev-setup.sh` 와 나눠 둔 까닭이 있다. 저쪽은 눌러 볼 자료(시드 계정 ·
# 시연 기관 · 가짜 응시 48건)까지 넣는다. 그게 운영에 들어가면 **첫
# 손님이 48명 뒤에 숨고**, 지우려면 운영 DB 를 손으로 뒤져야 한다.
# 여기서는 표와 문항과 승인된 가격까지만 넣는다.
#
#   DATABASE_URL=... bash scripts/db-init.sh
#
# **두 번 돌리지 않는다.** `db/schema.sql` 은 `CREATE TABLE` 이라 이미
# 표가 선 DB 에서는 첫 줄에서 멈춘다(자료를 지우지는 않는다). 이미 선
# DB 는 `db-upgrade.sh` 다.
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL 을 정하십시오}"

have=$(psql "$DATABASE_URL" -tAc \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'")
if [ "${have:-0}" -gt 0 ]; then
  echo "이 DB 에는 이미 표가 ${have}개 있습니다. 처음 세우는 자리가 아닙니다." >&2
  echo "이미 선 DB 를 올리려면: bash scripts/db-upgrade.sh" >&2
  exit 1
fi

run() { echo; echo "── $*"; "$@"; }

# **올릴 파일 목록을 이 파일에 적지 않는다.** 전에는 여기와
# `deploy/ops/db-init.sh` 두 곳에 적어 두었고, 한쪽만 늘어난 날이 있었다.
# 목록은 `deploy/db-chain.json` 하나이고 `npm run db:chain` 이 지킨다.
while read -r f; do
  [ -n "$f" ] || continue
  echo; echo "── ${f}"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 --single-transaction -f "$f"
done < <(node -e 'const c = require("./deploy/db-chain.json");
  for (const f of [...c.base, ...c.upgrade]) console.log(f)')

# 검사 문항. 생성물을 먼저 만들고 적재한다
run npm run -s v2:build
run npm run -s value:build
run npm run -s metri:items

echo
echo "표와 문항이 섰습니다. **시드와 시연 자료는 넣지 않았습니다.**"
bash deploy/ops/db-verify.sh
echo
echo "운영자 계정은 아래로 하나만 만드십시오:"
echo "  DATABASE_URL=... npx tsx scripts/make-admin.ts <아이디> <이메일> <이름>"
