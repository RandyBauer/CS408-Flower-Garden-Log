#!/usr/bin/env bash
# One-time setup of a fresh Ubuntu 24.04 EC2 server for Flower Garden Log.
# Copy the deploy folder to the server, then run on the server:
#   sudo bash deploy/setup-ec2.sh
# Safe to run again.
set -euo pipefail

APP_DIR=/opt/gardenlog
APP_USER=ubuntu
NODE_MAJOR=22
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [ "$(id -u)" -ne 0 ]; then
  echo "Error: run with sudo: sudo bash deploy/setup-ec2.sh" >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
export NEEDRESTART_MODE=a
# Wait for the boot-time unattended-upgrades run instead of failing on the apt lock
APT=(apt-get -y -o DPkg::Lock::Timeout=300
  -o Dpkg::Options::=--force-confdef -o Dpkg::Options::=--force-confold)

echo "==> 1/8 Updating Ubuntu packages"
"${APT[@]}" update
"${APT[@]}" upgrade

echo "==> 2/8 Creating a 2 GB swap file so next build does not run out of memory"
if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
fi
swapon --show=NAME --noheadings | grep -qx /swapfile || swapon /swapfile
grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab

echo "==> 3/8 Installing Node.js ${NODE_MAJOR}, nginx, rsync, and sqlite3"
if ! command -v node >/dev/null 2>&1 \
  || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt "$NODE_MAJOR" ]; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  "${APT[@]}" install nodejs
fi
"${APT[@]}" install nginx rsync sqlite3

echo "==> 4/8 Creating ${APP_DIR}"
mkdir -p "$APP_DIR/data" "$APP_DIR/uploads"
chown "$APP_USER:$APP_USER" "$APP_DIR" "$APP_DIR/data" "$APP_DIR/uploads"

echo "==> 5/8 Writing ${APP_DIR}/.env"
if [ ! -f "$APP_DIR/.env" ]; then
  echo "SESSION_SECRET=$(openssl rand -hex 32)" > "$APP_DIR/.env"
  chown "$APP_USER:$APP_USER" "$APP_DIR/.env"
  chmod 600 "$APP_DIR/.env"
fi

echo "==> 6/8 Configuring nginx"
install -m 644 "$SCRIPT_DIR/nginx-gardenlog.conf" /etc/nginx/sites-available/gardenlog
ln -sf /etc/nginx/sites-available/gardenlog /etc/nginx/sites-enabled/gardenlog
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable nginx
systemctl restart nginx

echo "==> 7/8 Installing gardenlog.service"
install -m 644 "$SCRIPT_DIR/gardenlog.service" /etc/systemd/system/gardenlog.service
systemctl daemon-reload
systemctl enable gardenlog

echo "==> 8/8 Allowing ports 22 and 80 in the firewall"
ufw allow 22/tcp
ufw allow 80/tcp
ufw --force enable

echo
echo "Server setup complete. From the laptop, deploy the code with:"
echo "  ./deploy/deploy.sh -h <public-ip> -i <key.pem>"
