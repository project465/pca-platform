#!/usr/bin/env bash
#
# 단체 PCA 가 실제로 도는지 처음부터 끝까지 확인한다.
#
# 빈 데이터베이스에서 시작해 스키마를 넣고, 시드를 채우고, 빌드해 띄운 다음
# 브라우저로 두 흐름을 돌린다. 사람이 눌러 보는 것과 같은 경로다.
#
#   신청 → 승인 → 전용 링크 → 학생 등록
#   담당자의 링크 관리 (만들기·회수·권한)
#
# 쓰는 법:
#   DATABASE_URL=postgres://... npm run verify
#
# DATABASE_URL 을 주지 않으면 로컬 기본값을 쓴다. 이 스크립트는 대상
# 데이터베이스를 통째로 지우고 다시 만든다 — 운영 데이터베이스를 주지 말 것.

set -euo pipefail
cd "$(dirname "$0")/.."

export DATABASE_URL="${DATABASE_URL:-postgres://postgres@127.0.0.1:5432/pca}"
export AUTH_SECRET="${AUTH_SECRET:-verify-only-secret-not-for-production}"
export AUTH_URL="${AUTH_URL:-http://localhost:3000}"
export INTAKE_SECRET="${INTAKE_SECRET:-verify-intake-secret}"
export MAIL_TRANSPORT="${MAIL_TRANSPORT:-log}"
export BASE_URL="$AUTH_URL"

say() { printf '\n\033[1m── %s\033[0m\n' "$1"; }

SERVER_PID=""
cleanup() {
  [ -n "$SERVER_PID" ] || return 0
  # npm 만 죽이면 그 밑의 next 가 살아남아 포트를 쥔 채로 남는다.
  # 그러면 다음 실행이 '이미 무언가 떠 있습니다' 로 멈춘다.
  # setsid 로 묶어 두었으니 무리째 보낸다.
  kill -TERM "-$SERVER_PID" 2>/dev/null || kill -TERM "$SERVER_PID" 2>/dev/null || true
  wait "$SERVER_PID" 2>/dev/null || true
}
trap cleanup EXIT

say "1/5 스키마"
# 적힌 대로 통째로 비우고 시작한다. 남아 있는 표가 있으면 schema.sql 이
# 중간에서 멈추고, 그 뒤 검사들은 반쯤 찬 데이터베이스를 보게 된다.
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q \
  -c "DROP SCHEMA public CASCADE" -c "CREATE SCHEMA public"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -f db/schema.sql

say "2/5 문항 적재와 시드"
# 문항이 있어야 회차를 열고 응시할 수 있다. 예시 문항을 넣는다 —
# 실제 문항이 정해지면 그 파일로 바꾼다.
npx --yes tsx scripts/load-instrument.ts docs/instrument-example.json
npm run --silent db:seed

say "3/5 빌드"
npm run --silent build > /tmp/pca-verify-build.log 2>&1 \
  || { echo "빌드 실패:"; tail -30 /tmp/pca-verify-build.log; exit 1; }
echo "빌드 완료"

say "4/5 서버 띄우기"

# 이미 무언가 듣고 있으면 멈춘다.
# 그대로 두면 우리가 띄운 서버는 포트를 못 잡아 죽고, 검사들은 남의 서버를
# — 다른 데이터베이스를 보는 서버를 — 두드리면서 통과하거나 엉뚱하게 실패한다.
# 조용히 잘못된 것을 확인하느니 여기서 멈추는 편이 낫다.
if curl -sf -o /dev/null "$BASE_URL/login"; then
  echo "$BASE_URL 에 이미 무언가 떠 있습니다."
  echo "그 서버는 다른 데이터베이스를 보고 있을 수 있어 확인 결과를 믿을 수 없습니다."
  echo "먼저 그것을 끄고 다시 실행하세요."
  exit 1
fi

setsid npm run --silent start > /tmp/pca-verify-server.log 2>&1 &
SERVER_PID=$!
for _ in $(seq 1 60); do
  if curl -sf -o /dev/null "$BASE_URL/login"; then break; fi
  # 서버가 죽었으면 더 기다릴 것 없다
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    echo "서버가 떠 있지 않습니다:"; tail -30 /tmp/pca-verify-server.log; exit 1
  fi
  sleep 1
done
curl -sf -o /dev/null "$BASE_URL/login" \
  || { echo "서버가 응답하지 않습니다:"; tail -30 /tmp/pca-verify-server.log; exit 1; }
echo "$BASE_URL 응답함"

say "5/5 브라우저로 흐름 확인"
echo "· 신청 → 승인 → 전용 링크 → 학생 등록"
node scripts/e2e-join.mjs

# 동의가 화면에서만 막히고 끝났는지, 기록으로도 남았는지 본다.
# 방금 3명이 전용 링크로 등록했으므로 그 판의 동의가 3건 이상 있어야 한다.
PRIVACY_VERSION="$(sed -n 's/^export const PRIVACY_VERSION = "\(.*\)";$/\1/p' src/content/privacy.ts)"
CONSENTS="$(psql "$DATABASE_URL" -t -A -c \
  "SELECT count(*) FROM consents WHERE kind = 'privacy' AND version = '${PRIVACY_VERSION}'")"
if [ "${CONSENTS:-0}" -ge 3 ]; then
  echo "  통과  동의 기록 ${CONSENTS}건 (판 ${PRIVACY_VERSION})"
else
  echo "  실패  동의 기록이 ${CONSENTS:-0}건 — 등록은 됐는데 남지 않았다"
  exit 1
fi

# 담당자가 남의 기관 링크를 건드릴 수 없는지도 본다.
# 방금 승인으로 만들어진 다른 기관의 링크 id 를 넘겨준다.
FOREIGN_LINK_ID="$(psql "$DATABASE_URL" -t -A -c \
  "SELECT ol.id FROM org_links ol JOIN organizations o ON o.id = ol.org_id
    WHERE o.code LIKE 'QA-%' ORDER BY ol.id DESC LIMIT 1" 2>/dev/null || true)"
export FOREIGN_LINK_ID
if [ -z "$FOREIGN_LINK_ID" ]; then
  echo "· 담당자 링크 관리 (남의 링크 시험은 건너뜀 — 대상 링크를 못 찾음)"
else
  echo "· 담당자 링크 관리 (남의 링크 id ${FOREIGN_LINK_ID} 로 권한도 시험)"
fi
node scripts/e2e-org-links.mjs

echo "· 전용 링크 조건 — 학번 형태와 이메일 도메인"
node scripts/e2e-join-rules.mjs

echo "· 응시 — 시작, 즉시 저장, 이어보기, 제출"
node scripts/e2e-exam.mjs

echo "· 결과지 — 채점 전, 공개 전, 공개됨"
node scripts/e2e-report.mjs

echo "· 단체 리포트 — 분포, 충족률, 과목"
node scripts/e2e-group-report.mjs

printf '\n\033[1m전체 확인 통과\033[0m\n'
