#!/bin/bash
set -e
echo "=== ⚡ Super JinX | Marzban on Railway ==="

# No hard-coded env login: the admin lives in the database, so a password changed in the panel really works.
# (first install = admin / admin, see ensure_admin.py)
unset SUDO_USERNAME SUDO_PASSWORD
# internal wiring is forced too, so a wrong Railway variable can never break the panel
export UVICORN_HOST=127.0.0.1
export UVICORN_PORT=8000
export XRAY_JSON=/var/lib/marzban/xray_config.json
export SQLALCHEMY_DATABASE_URL=sqlite:////var/lib/marzban/db.sqlite3
export JWT_ACCESS_TOKEN_EXPIRE_MINUTES="${JWT_ACCESS_TOKEN_EXPIRE_MINUTES:-43200}"
# ⚡ our own subscription page (sub.html)
export CUSTOM_TEMPLATES_DIRECTORY=/opt/jinx/templates/
export SUBSCRIPTION_PAGE_TEMPLATE=subscription/index.html
# what apps see when they fetch the subscription: title, support link, auto-update every 6h
export SUB_PROFILE_TITLE="Super JinX"
export SUB_SUPPORT_URL="https://t.me/Super_Jinx"
export SUB_UPDATE_INTERVAL="${SUB_UPDATE_INTERVAL:-6}"

mkdir -p /var/lib/marzban /run/jinx
python /opt/lock.py

PUBLIC_DOMAIN="${PANEL_DOMAIN:-${RAILWAY_PUBLIC_DOMAIN:-$CF_TUNNEL_HOSTNAME}}"
if [ -z "$XRAY_SUBSCRIPTION_URL_PREFIX" ] && [ -n "$PUBLIC_DOMAIN" ]; then
  export XRAY_SUBSCRIPTION_URL_PREFIX="https://$PUBLIC_DOMAIN"
fi
echo "[start] domain: ${PUBLIC_DOMAIN:-NOT SET} | sub prefix: ${XRAY_SUBSCRIPTION_URL_PREFIX:-NOT SET}"
[ -d /var/lib/marzban ] && touch /var/lib/marzban/.write-test && rm -f /var/lib/marzban/.write-test \
  || echo "[start] WARNING: /var/lib/marzban not writable"
mountpoint -q /var/lib/marzban 2>/dev/null || echo "[start] WARNING: no Volume on /var/lib/marzban, data will reset on redeploy"

# panel always on 8080; if Railway injected another PORT, listen there too (healthcheck never misses)
if [ -n "$PORT" ] && [ "$PORT" != "8080" ]; then
  echo "listen ${PORT} reuseport;" > /etc/nginx/jinx-port.inc
  echo "[start] Railway PORT=$PORT -> nginx listens on 8080 and $PORT"
else
  : > /etc/nginx/jinx-port.inc
fi
nginx -t
nginx

# Cloudflare Tunnel (optional): CF_TUNNEL_TOKEN + CF_TUNNEL_HOSTNAME
if [ -n "$CF_TUNNEL_TOKEN" ]; then
  echo "[tunnel] starting Cloudflare tunnel -> ${CF_TUNNEL_HOSTNAME:-?}"
  ( while true; do
      cloudflared tunnel --no-autoupdate --protocol auto --edge-ip-version 4 --retries 10 \
        run --token "$CF_TUNNEL_TOKEN" 2>&1 | sed -u 's/^/[tunnel] /' || true
      echo "[tunnel] disconnected, reconnecting in 5s"; sleep 5
    done ) &
else
  echo "[tunnel] CF_TUNNEL_TOKEN not set, direct Railway mode"
fi

cd /code
alembic upgrade head
if ! python /opt/ensure_admin.py; then
  # emergency safety net: panel still opens with admin / admin
  echo "[admin] WARNING: admin manager failed -> emergency login admin / admin enabled"
  export SUDO_USERNAME=admin SUDO_PASSWORD=admin
  echo '{"username": "admin", "password": "admin"}' > /run/jinx/system.json
fi

python main.py &
MAIN=$!
echo "$MAIN" > /run/jinx/marzban.pid
trap 'kill -TERM $MAIN 2>/dev/null; wait $MAIN; exit 0' TERM INT

python /opt/enforce_hosts.py &
python /opt/doctor.py &
( while true; do python /opt/jinx_api.py; echo "[account] restarting in 2s"; sleep 2; done ) &

set +e
wait "$MAIN"
CODE=$?
echo "[start] panel exited with code $CODE -> container restart"
exit 1
