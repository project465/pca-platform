#!/usr/bin/env bash
# 정적 미리보기 내보내기. 서버가 없으므로 문의 폼의 server action 을 잠시
# 정적 대체본으로 바꿔치웠다가 되돌린다 — webpack alias 로는 Next 가 app 트리
# 전체에서 "use server" 를 먼저 수집해 버려 소용이 없었다.
set -euo pipefail
site="$1"; outdir="$2"
cp src/lib/actions.ts src/lib/actions.ts.bak
trap 'mv -f src/lib/actions.ts.bak src/lib/actions.ts; [ -f src/app/globals.css.bak ] && mv -f src/app/globals.css.bak src/app/globals.css' EXIT
cp src/lib/actions-static.ts src/lib/actions.ts
# 폰트: 동적 서브셋 92개 대신 통 파일 하나를 쓴다. Artifact 는 한 번에 올릴 수
# 있는 파일 수에 제한이 있고, 정적 미리보기에서는 첫 로딩 몇백 KB 차이보다
# 파일 수가 문제가 된다. 실제 배포본은 서브셋 그대로다.
cp src/app/globals.css src/app/globals.css.bak
sed -i 's#pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css#pretendard/dist/web/variable/pretendardvariable.css#' src/app/globals.css
rm -rf .next-static "$outdir"
STATIC=1 SITE="$site" npx next build
mv .next-static "$outdir"
