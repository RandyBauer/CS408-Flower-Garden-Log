#!/usr/bin/env bash
# Installs dependencies, builds Flower Garden Log, and starts it on port 3000.
# Run from a fresh clone: ./start.sh
# Safe to run again.
set -euo pipefail

REQUIRED_NODE_MAJOR=22
PORT="${PORT:-3000}"

cd "$(dirname "$0")"

fail() {
  echo "Error: $1" >&2
  exit 1
}

# 1. Check required tools
command -v node >/dev/null 2>&1 \
  || fail "Node.js is not installed. Install Node.js ${REQUIRED_NODE_MAJOR} or later from https://nodejs.org"
command -v npm >/dev/null 2>&1 \
  || fail "npm is not installed. It comes with Node.js: https://nodejs.org"

node_major="$(node -p 'process.versions.node.split(".")[0]')"
[ "$node_major" -ge "$REQUIRED_NODE_MAJOR" ] \
  || fail "Node.js ${REQUIRED_NODE_MAJOR} or later is required. Found $(node -v)."

# Stop now rather than after the build if another process holds the port
node -e '
  const server = require("net").createServer();
  server.once("error", () => process.exit(1));
  server.listen(Number(process.argv[1]), () => server.close());
' "$PORT" \
  || fail "Port ${PORT} is already in use. Stop the other process or run: PORT=3001 ./start.sh"

# 2. Install dependencies
echo "==> Installing dependencies"
npm ci --no-audit --no-fund

# 3. Create .env with a random session secret on first run
if [ ! -f .env ]; then
  secret="$(node -p 'require("crypto").randomBytes(32).toString("hex")')"
  echo "SESSION_SECRET=${secret}" > .env
  echo "==> Created .env"
fi

# 4. Build and start
echo "==> Building"
npm run build

echo
echo "==> Flower Garden Log is starting at http://localhost:${PORT}"
echo "    Press Ctrl+C to stop."
echo
PORT="$PORT" exec npm start
