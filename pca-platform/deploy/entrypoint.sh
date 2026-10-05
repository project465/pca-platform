#!/bin/sh
# 컨테이너가 깨어날 때 한 번.
#
# **붙여 준 디스크의 주인을 고쳐 준다.** 관리형 플랫폼이 볼륨을 걸어
# 주면 그 자리는 root 것이고, 우리는 root 로 돌지 않는다. 그대로 두면
# 결과지 PDF 를 쓰는 순간 EACCES 가 나는데, 그 자리가 결제를 마친
# 손님이 내려받기를 누른 자리다.
#
# 고치고 나서 **권한을 내려놓고** 앱을 띄운다.
set -e

DIR="${REPORT_PDF_DIR:-/app/var/reports}"
mkdir -p "$DIR"

if [ "$(id -u)" = "0" ]; then
  chown -R metri:nodejs "$DIR" 2>/dev/null || true
  # 쓸 수 있는지 **실제로 써 본다.** 못 쓰면 지금 멈추는 쪽이
  # 결제 뒤에 멈추는 것보다 싸다
  su-exec metri sh -c "touch '$DIR/.w' && rm -f '$DIR/.w'" || {
    echo "[시작] 결과지 폴더에 쓸 수 없습니다: $DIR" >&2
    exit 1
  }
  exec su-exec metri "$@"
fi

touch "$DIR/.w" && rm -f "$DIR/.w" || {
  echo "[시작] 결과지 폴더에 쓸 수 없습니다: $DIR" >&2
  exit 1
}
exec "$@"
