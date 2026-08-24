#!/bin/sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PORT=${1:-4175}

# Pick the first available port so a stale local server cannot make the app
# appear to be offline. Set CAMPUSLOOP_STRICT_PORT=yes when a fixed port is
# required (for example, while testing an OAuth redirect URL).
is_port_available() {
  python3 - "$1" <<'PY'
import socket
import sys

port = int(sys.argv[1])
sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
try:
    sock.bind(("127.0.0.1", port))
except OSError:
    sys.exit(1)
finally:
    sock.close()
PY
}

cd "$ROOT_DIR"
if ! command -v python3 >/dev/null 2>&1; then
  printf '%s\n' '找不到 Python 3。请先安装 Python 3，或使用项目的 Node 静态服务器。' >&2
  exit 1
fi

if ! is_port_available "$PORT"; then
  if [ "${CAMPUSLOOP_STRICT_PORT:-}" = "yes" ]; then
    printf '端口 %s 已被占用。请先关闭旧服务，或设置另一个端口。\n' "$PORT" >&2
    exit 2
  fi
  requested_port=$PORT
  while ! is_port_available "$PORT"; do
    PORT=$((PORT + 1))
  done
  printf '端口 %s 已占用，已自动切换到 %s。\n' "$requested_port" "$PORT" >&2
fi

printf 'CampusLoop 本地地址：http://127.0.0.1:%s/index.html\n' "$PORT"
exec python3 -m http.server "$PORT" --bind 127.0.0.1
