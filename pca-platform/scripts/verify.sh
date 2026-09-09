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
  if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

say "1/5 스키마"
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
npm run --silent start > /tmp/pca-verify-server.log 2>&1 &
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

echo "· 응시 — 시작, 즉시 저장, 이어보기, 제출"
node scripts/e2e-exam.mjs

echo "· 결과지 — 채점 전, 공개 전, 공개됨"
node scripts/e2e-report.mjs

echo "· 단체 리포트 — 분포, 충족률, 과목"
node scripts/e2e-group-report.mjs

printf '\n\033[1m전체 확인 통과\033[0m\n'
