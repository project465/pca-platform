#!/usr/bin/env bash
# **빈 DB 를 컨테이너 안에서 처음 한 번 세운다.**
#
# `scripts/db-init.sh` 와 같은 일을 하지만, 여기는 **운영 이미지 안**이다.
# 개발 의존성이 없어서 `npm run` 으로 엮인 소스 쪽 스크립트를 쓸 수 없다.
# 그래서 psql 과, 빌드 때 한 덩이로 묶어 둔 `ops/*.cjs` 만 쓴다.
#
#   npm run db:init
#
# **앱이 뜰 때 저절로 돌지 않는다.** 사람이 이 명령을 쳐야만 돈다
# (`deploy/entrypoint.sh` 는 이 파일을 모른다). 띄울 때마다 저절로
# 마이그레이션이 도는 구조는, 배포 한 번이 DB 를 바꾸는 구조다.
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL 이 없습니다. Railway 서비스 변수를 확인하십시오}"

# 이 파일은 /app/ops 에 깔린다. 어디서 부르든 /app 에서 돈다
cd "$(dirname "$0")/.."

have=$(psql "$DATABASE_URL" -tAc \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'")
if [ "${have:-0}" -gt 0 ]; then
  echo "이 DB 에는 이미 표가 ${have}개 있습니다. 처음 세우는 자리가 아닙니다." >&2
  echo "이미 선 DB 를 올리려면: npm run db:upgrade" >&2
  exit 1
fi

# **파일 하나가 통째로 들어가거나 통째로 안 들어간다.** 가운데서 끊기면
# 표 절반만 선 DB 가 남고, 그 상태는 db:init 도 db:upgrade 도 맞지 않는
# 자리가 된다. CONCURRENTLY 를 쓰는 곳이 없어 한 트랜잭션으로 묶을 수 있다.
pour() {
  local label=$1; shift
  echo; echo "── ${label}"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 --single-transaction "$@"
}

# **올릴 파일 목록을 이 파일에 적지 않는다.** 전에는 적어 두었고, 저장소
# 쪽 목록이 늘었을 때 이쪽이 안 늘었다. 그 차이로 `career_profiles` 가
# 운영에 선 적이 없다. 목록은 `deploy/db-chain.json` 하나다
CHAIN=deploy/db-chain.json
[ -f "$CHAIN" ] || { echo "목록이 없습니다: $CHAIN" >&2; exit 1; }

while read -r f; do
  [ -n "$f" ] || continue
  pour "$f" -f "$f"
done < <(node -e 'const c = require("./deploy/db-chain.json");
  for (const f of [...c.base, ...c.upgrade]) console.log(f)')

# 대학판 문항. 안에서 한 트랜잭션으로 올린다
echo; echo "── 검사 문항"
node ops/seed-instrument.cjs

# **정적 사이트 생성물은 여기서 만들지 않는다.** `v2:build` 와
# `value:build` 는 DB 가 아니라 `sites/pca-platform/data/*.js` 를 쓰는
# 빌드 산출물이고, 이미 이미지 안에 들어 있다.

echo
echo "표와 문항이 섰습니다. **시드와 시연 자료는 넣지 않았습니다.**"
bash ops/db-verify.sh
echo
echo "운영자 계정을 하나 만드십시오:"
echo "  npm run make:admin -- <아이디> <이메일> <이름>"
