#!/usr/bin/env bash
# 공개 전 배포본을 이 기계에서 띄운다. **예행과 캡처가 보는 서버다.**
#
# `next start` 를 쓰지 않는다. 이 저장소는 `output: standalone` 이라 그쪽으로
# 띄우면 Next 가 경고만 내고 **지난 빌드의 자산 이름을 적은 HTML** 을 내준다.
# 쪽은 200 으로 멀쩡히 뜨고 CSS 만 400 이고, 그 상태로 찍은 그림은 제품이
# 아니다. 한 번 그렇게 속았다.
#
# standalone 서버는 **제 자리에서 돌아야 한다**: `cwd` 가 저장소 뿌리면
# `.next/static` 을 못 찾아 CSS 가 404 다. 그래서 자산을 그 안에 넣고
# 거기서 띄운다.
#
#   bash scripts/stage-serve.sh [포트]
set -euo pipefail
cd "$(dirname "$0")/.."
PORT="${1:-3100}"

# **이미 누가 그 포트를 잡고 있으면 그 자리에서 멈춘다.**
#
# 아래에서 `var/.serving-build` 에 이 빌드를 적는데, 띄우기가 `EADDRINUSE`
# 로 실패해도 그 줄은 **이미 적혀 있다.** 그러면 `assertFreshServer()` 가
# 통과하고 대답하는 쪽은 지난 빌드다. 한 번 그렇게 속아 멀쩡한 화면을
# 500 으로 적었다. 표식을 적기 전에 먼저 두드린다.
if curl -s --noproxy '*' --max-time 2 -o /dev/null "http://127.0.0.1:$PORT/api/health"; then
  echo "이미 http://127.0.0.1:$PORT 에 서버가 떠 있습니다. 그 서버를 먼저 끄십시오."
  exit 1
fi

[ -f .next/standalone/server.js ] || { echo "먼저 npm run build 를 돌리십시오."; exit 1; }
rm -rf .next/standalone/.next/static .next/standalone/public
cp -r .next/static .next/standalone/.next/static
[ -d public ] && cp -r public .next/standalone/public

set -a; . ./.env.local 2>/dev/null || true; set +a
export APP_ENV="${APP_ENV:-staging}"
export PORT HOSTNAME=127.0.0.1
export PLATFORM_URL="${PLATFORM_URL:-http://127.0.0.1:$PORT}"
export PDF_BASE="${PDF_BASE:-http://127.0.0.1:$PORT}"

# **PDF 두는 자리를 cwd 에 매달지 않는다.**
#
# `PDF_DIR` 의 기본값이 `process.cwd()/var/reports` 인데, standalone 서버는
# `.next/standalone` 에서 돈다. 그래서 만들어 둔 PDF 는 저장소의
# `var/reports` 에 있고 내려 주는 쪽은 `.next/standalone/var/reports` 를
# 보면서, DB 에 적힌 절대 경로가 **두는 자리 밖**이라 404 로 거절된다.
# 쪽은 200 이고 단추만 안 되는 모양이라 눈으로는 운영 장애와 구별되지
# 않는다. 운영 컨테이너는 `/app` 한 자리에서 도므로 이 어긋남이 없다.
export REPORT_PDF_DIR="${REPORT_PDF_DIR:-$PWD/var/reports}"

# **어느 빌드를 내주고 있는지 적어 둔다.**
#
# `npm run build` 는 `.next/standalone` 을 통째로 지우고 다시 만든다. 그때
# 떠 있던 서버는 **지워진 디렉터리를 cwd 로 들고** 계속 돈다: 쪽은 뜨는데
# `sites/...` 를 상대 경로로 읽는 자리가 전부 ENOENT 로 500 이 된다.
# 한 번 그렇게 속았고, 그 500 이 격리 검사의 `남의 화면이 열리지 않는다`
# 로 보였다. `.next` 밖에 적어 두어야 지워지지 않는다.
mkdir -p var
cat .next/BUILD_ID > var/.serving-build 2>/dev/null || true

# **아직 열지 않은 Core 를 눌러 볼 때 무엇을 열어 두었는지도 적어 둔다.**
#
# 전에는 검사가 등록부의 `open_to_students` 를 잠시 `true` 로 써서 열었다.
# 그 창이 열려 있는 몇 초 동안 **학생에게도 열려 있고**, 되돌림이 다른
# 쓰기와 겹치면 열린 칸이 그대로 남는다(한 번 열여섯 Core 가 남았다).
# 지금은 `V3_PREVIEW_OPEN` 을 들고 띄운 서버만 그 Core 를 열고 **등록부
# 파일은 한 바이트도 바뀌지 않는다.** 눌러 보는 검사가 "이 서버가 그
# Core 를 열어 두었는가" 를 여기서 읽는다: 안 적어 두면 까닭을
# `검사가 열리지 않는다` 로 거꾸로 적게 된다.
#
# **운영에서는 이 값으로도 열리지 않는다**(`previewOpenCores()` 가 거절한다).
printf '%s' "${V3_PREVIEW_OPEN:-}" > var/.serving-preview

# **확인용 학교 fixture 도 같은 까닭으로 적어 둔다.**
#
# 밟아 보는 검사에는 `검사 가능` 인 자리가 하나 있어야 한다. 전에는
# `campus-universities.json` 자체를 쓰고 `.walkbak` 으로 되돌렸는데, 가운데서
# 터지면 확인용 학교가 등록부에 남아 다음 커밋에 손님 자료로 섞인다.
# 지금은 fixture 파일 하나이고 이 값을 들고 띄운 서버만 읽는다.
#
# **상대 경로를 그대로 넘기지 않는다.** 이 서버는 `.next/standalone` 에서
# 돌아서(`cd` 아래), `scripts/fixtures/...` 는 그 자리에 없다. 그러면 fixture 가
# 조용히 안 붙고 확인용 학교가 404 로 서며, 까닭을 `학교 진입이 깨졌다` 로
# 거꾸로 적게 된다. `REPORT_PDF_DIR` 과 같은 까닭이다.
if [ -n "${V3_CAMPUS_FIXTURE:-}" ]; then
  case "$V3_CAMPUS_FIXTURE" in
    /*) : ;;
    *) V3_CAMPUS_FIXTURE="$PWD/$V3_CAMPUS_FIXTURE" ;;
  esac
  export V3_CAMPUS_FIXTURE
  [ -f "$V3_CAMPUS_FIXTURE" ] || {
    echo "확인용 학교 fixture 가 없습니다: $V3_CAMPUS_FIXTURE"; exit 1; }
fi
printf '%s' "${V3_CAMPUS_FIXTURE:-}" > var/.serving-campus-fixture

cd .next/standalone
echo "띄웁니다 http://127.0.0.1:$PORT  (APP_ENV=$APP_ENV · 빌드 $(cat ../../var/.serving-build 2>/dev/null)$([ -n "${V3_PREVIEW_OPEN:-}" ] && echo " · 미리보기 $V3_PREVIEW_OPEN"))"
exec node server.js
