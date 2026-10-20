#!/usr/bin/env bash
# KUS R1 검수 묶음(KUS-R1-REVIEW.zip)을 만든다. 저장소에 이미 있는 산출물만 모은다.
#   bash scripts/kus/pack-review.sh <나갈 zip 경로>
set -euo pipefail
cd "$(dirname "$0")/../.."
OUTZIP="$(realpath -m "${1:?zip 경로를 주십시오}")"
T="$(mktemp -d)"; R="$T/KUS-R1-REVIEW"
mkdir -p "$R"/{docs,screens,pdf,logs,data}
cp docs/kus/R1_REPORT.md docs/kus/CHANGE_REQUESTS.md docs/kus/DEPARTMENTS.md "$R/docs/"
[ -f docs/kus/r1/ci/CI_RESULT.md ] && cp docs/kus/r1/ci/CI_RESULT.md "$R/docs/"
cp docs/kus/r1/shots/*.jpg "$R/screens/"
cp docs/kus/r1/qa/pdf/*.pdf docs/kus/r1/qa/pdf/*.html docs/kus/r1/shots/*.download.pdf "$R/pdf/"
cp docs/kus/r1/qa/verify.log docs/kus/r1/shots/shots.log "$R/logs/"
[ -d docs/kus/r1/ci ] && cp docs/kus/r1/ci/*.log "$R/logs/" 2>/dev/null || true
cp docs/kus/r1/qa/rich-poor-contra.json docs/kus/data/kus-departments.secondary.json scripts/fixtures/campus-kus.json "$R/data/"
{
  echo "# KUS-R1-REVIEW"; echo
  echo "- 가지: claude/ecstatic-cori-sv6lh5 · 커밋 $(git rev-parse --short HEAD) · 기준 4f02d79b"
  echo "- 그림(screens/*.harness.jpg)은 **harness render** 다. Next 런타임 그림이 아니다"
  echo "- 시작: docs/R1_REPORT.md"; echo
  echo "## 바뀐 파일"; echo '```'; git diff --stat 4f02d79b HEAD -- . ':!docs/kus/r1' | tail -60; echo '```'
} > "$R/INDEX.md"
rm -f "$OUTZIP"; (cd "$T" && zip -qr "$OUTZIP" KUS-R1-REVIEW)
rm -rf "$T"; ls -la "$OUTZIP"
