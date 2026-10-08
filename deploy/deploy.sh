#!/usr/bin/env bash
# Copies the current code to the EC2 server and restarts Flower Garden Log.
# Run from the laptop:
#   ./deploy/deploy.sh -h <public-ip> -i <key.pem> [-u <ssh-user>]
set -euo pipefail

APP_DIR=/opt/gardenlog
SERVICE=gardenlog
SSH_USER=ubuntu
HOST=""
KEY=""

fail() {
  echo "Error: $1" >&2
  exit 1
}

usage() {
  echo "Usage: $0 -h <public-ip> -i <key.pem> [-u <ssh-user>]" >&2
  exit 1
}

while getopts "h:i:u:" opt; do
  case "$opt" in
    h) HOST="$OPTARG" ;;
    i) KEY="$OPTARG" ;;
    u) SSH_USER="$OPTARG" ;;
    *) usage ;;
  esac
done
[ -n "$HOST" ] && [ -n "$KEY" ] || usage
[ -f "$KEY" ] || fail "key file not found: $KEY"
KEY="$(cd "$(dirname "$KEY")" && pwd)/$(basename "$KEY")"

cd "$(dirname "$0")/.."

REMOTE="$SSH_USER@$HOST"
SSH=(ssh -i "$KEY" -o StrictHostKeyChecking=accept-new)

# Never copied: dependencies, build output, git data, secrets, editor settings,
# and (below) the server's database and photos
EXCLUDE_ARGS=()
for pattern in node_modules .next .git .env '.env.*' '*.pem' .nimbalyst .claude; do
  EXCLUDE_ARGS+=("--exclude=$pattern")
done

echo "==> 1/5 Running unit tests"
npm run test --if-present

echo "==> 2/5 Copying code to $REMOTE:$APP_DIR"
status=0
"${SSH[@]}" "$REMOTE" "test -d $APP_DIR" || status=$?
case "$status" in
  0) ;;
  255) fail "could not connect to $REMOTE with key $KEY" ;;
  *) fail "$APP_DIR does not exist on the server. Run deploy/setup-ec2.sh there first." ;;
esac

if command -v rsync >/dev/null 2>&1; then
  rsync -az --delete \
    "${EXCLUDE_ARGS[@]}" --exclude=/data --exclude=/uploads \
    -e "ssh -i '$KEY' -o StrictHostKeyChecking=accept-new" \
    ./ "$REMOTE:$APP_DIR/"
else
  # Git Bash on Windows has no rsync. Stream a tar archive instead, after removing
  # the old code but keeping the same files rsync --delete would keep.
  tar -czf - "${EXCLUDE_ARGS[@]}" --exclude=./data --exclude=./uploads . \
    | "${SSH[@]}" "$REMOTE" "cd $APP_DIR \
        && find . -mindepth 1 -maxdepth 1 ! -name node_modules ! -name .next \
             ! -name .env ! -name data ! -name uploads -exec rm -rf {} + \
        && tar -xzf -"
fi

echo "==> 3/5 Installing dependencies and building on the server"
"${SSH[@]}" "$REMOTE" "cd $APP_DIR \
  && npm ci --no-audit --no-fund \
  && npm run migrate --if-present \
  && npm run build"

echo "==> 4/5 Restarting $SERVICE"
"${SSH[@]}" "$REMOTE" "sudo systemctl restart $SERVICE"

echo "==> 5/5 Checking http://$HOST/api/health"
code=000
for _ in $(seq 1 15); do
  code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "http://$HOST/api/health" || true)"
  [ "$code" = 200 ] && break
  sleep 2
done
if [ "$code" != 200 ]; then
  echo "Error: http://$HOST/api/health returned $code. Recent server logs:" >&2
  "${SSH[@]}" "$REMOTE" "sudo journalctl -u $SERVICE -n 30 --no-pager" >&2 || true
  exit 1
fi

echo
echo "Deployed: http://$HOST/"
