#!/usr/bin/env bash
# R32 Human Review 패키지를 var/r32 의 결과물에서 모아 ZIP 으로 묶는다.
set -euo pipefail
R=docs/metri/review/r32
rm -rf "$R"; mkdir -p "$R/checks" "$R/compare"
cp -r var/r32/shots "$R/shots"
cp -r var/r32/e2e "$R/e2e"
cp -r var/r32/scenarios "$R/scenarios"
for f in var/r32/checks/*.log; do cp "$f" "$R/checks/$(basename "$f" | tr ':' '-')"; done
cp var/r32/compare/*.txt "$R/compare/" 2>/dev/null || true
# 사람 C(근거 많음) 의 종이 원본과 쪽 렌더 · 두 종이의 쪽마다 찬 비율
cp -r var/r32/pdf-c "$R/pdf-c"
{ echo "# PDF 쪽마다 세로로 찬 비율 (scripts/lab/r32_pdffill.py · 96dpi 렌더)"; echo;
  echo "## e2e/pdf (E2E 학생 · 실제 클릭 응답)"; python3 -I scripts/lab/r32_pdffill.py "$R/e2e/pdf";
  echo; echo "## pdf-c (사람 C · 근거를 많이 고른 응답)"; python3 -I scripts/lab/r32_pdffill.py "$R/pdf-c";
} > "$R/checks/pdf-fill.txt"
cat .next/BUILD_ID > "$R/BUILD_ID.txt"; echo >> "$R/BUILD_ID.txt"
python3 scripts/lab/r31_abcd.py "$R/scenarios"
LABEL=R32 python3 scripts/lab/r31_contact.py "$R"
python3 scripts/lab/r31_secrets.py "$R" docs/metri/R32_PRODUCT_QUALITY_CORRECTION.md
LABEL=R32 REPORT=R32_PRODUCT_QUALITY_CORRECTION.md python3 scripts/lab/r31_index.py "$R"
cp docs/metri/R32_PRODUCT_QUALITY_CORRECTION.md "$R/"
( cd docs/metri/review && rm -f R32_HUMAN_REVIEW_PACKAGE.zip && zip -qr R32_HUMAN_REVIEW_PACKAGE.zip r32 )
rm "$R/R32_PRODUCT_QUALITY_CORRECTION.md"
ls -la docs/metri/review/R32_HUMAN_REVIEW_PACKAGE.zip
