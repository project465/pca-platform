#!/usr/bin/env bash
# KUS R2 검수 묶음(KUS-R2-REVIEW.zip). 저장소에 이미 있는 산출물만 모은다.
# 화면은 **실제 Next 캡처**(docs/kus/r2/shots-next, CI 가 커밋)만 넣는다. 하네스 그림은 넣지 않는다.
#   bash scripts/kus/pack-review-r2.sh <나갈 zip 경로>
set -euo pipefail
cd "$(dirname "$0")/../.."
OUTZIP="$(realpath -m "${1:?zip 경로를 주십시오}")"
T="$(mktemp -d)"; R="$T/KUS-R2-REVIEW"
mkdir -p "$R"/{docs,screens-next,pdf/next,pdf/server,logs,data,change-requests}
cp docs/kus/R2_REPORT.md docs/kus/CORE_COMPAT.md docs/kus/CHANGE_REQUESTS.md docs/kus/DEPARTMENTS.md "$R/docs/"
cp docs/kus/cr/*.md docs/kus/cr/*.patch docs/kus/cr/*.json docs/kus/cr/*.log "$R/change-requests/"
if [ -d docs/kus/r2/shots-next ]; then
  cp docs/kus/r2/shots-next/*.jpg "$R/screens-next/" 2>/dev/null || true
  cp docs/kus/r2/shots-next/RUN.txt docs/kus/r2/shots-next/INDEX.txt "$R/screens-next/" 2>/dev/null || true
  cp docs/kus/r2/shots-next/pdf/*.pdf "$R/pdf/next/" 2>/dev/null || true
fi
cp docs/kus/r2/qa/pdf/*.pdf docs/kus/r2/qa/pdf/*.html "$R/pdf/server/"
cp docs/kus/r2/qa/verify.log "$R/logs/kus-server-e2e.log"
for d in docs/kus/r2/ci-run*; do [ -d "$d" ] && mkdir -p "$R/logs/$(basename "$d")" && cp "$d"/* "$R/logs/$(basename "$d")/"; done
cp docs/kus/r2/qa/rich-poor-contra.json docs/kus/data/kus-core-compat.json docs/kus/data/kus-core-compat.result.json \
  docs/kus/data/kus-curricula.search-excerpt.json scripts/fixtures/campus-kus.json "$R/data/"
{
  echo "# KUS-R2-REVIEW"; echo
  echo "- 가지: claude/ecstatic-cori-sv6lh5 · 커밋 $(git rev-parse --short HEAD) · 기준 4f02d79b · 마지막 [kus-verify] 커밋 $(git log --grep="\[kus-verify\]" -1 --format=%h)"
  echo "- 화면: screens-next/*.next.jpg — GitHub 러너의 \`next build\` 서버를 실제 Chromium 으로 찍었다($(cat docs/kus/r2/shots-next/RUN.txt 2>/dev/null || echo '캡처 없음'))"
  echo "- PDF: pdf/next (실제 Next 경로로 내려받음) · pdf/server (같은 코드를 서버 쪽 E2E 에서 뽑음)"
  echo "- 시작: docs/R2_REPORT.md"; echo
  echo "## R1 이후 바뀐 파일"; echo '```'; git diff --stat a4891662 HEAD -- . ':!docs/kus/r2/shots-next' ':!docs/kus/r2/qa' 2>/dev/null | tail -60 || true; echo '```'
} > "$R/INDEX.md"
rm -f "$OUTZIP"; (cd "$T" && zip -qr "$OUTZIP" KUS-R2-REVIEW)
rm -rf "$T"; ls -la "$OUTZIP"
