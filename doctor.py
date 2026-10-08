# 🩺 JinX Doctor: support bot that watches every part of the panel and repairs it automatically
#   nginx down          -> restarts nginx
#   Xray inbound down   -> ports checked every 15s + a REAL WebSocket handshake to each config path every 60s;
#                          if any config stops answering, Xray core is restarted through the panel API
#   panel frozen (3x)   -> kills the frozen panel, the container restarts cleanly (restartPolicy ALWAYS)
#   sub page broken     -> subscription template checked every 15s; missing / edited / Jinja error -> restored from golden copy
#   daily backup        -> consistent copy of the panel database (users, admins) + agency data, last 7 kept
#   tunnel down         -> handled by the auto-restart loop in start.sh, reported here
# Optional Telegram alerts: set DOCTOR_TG_TOKEN + DOCTOR_TG_CHAT
import os, signal, socket, subprocess, time, json, urllib.request, urllib.parse

API = "http://127.0.0.1:8000"
TG_TOKEN, TG_CHAT = os.environ.get("DOCTOR_TG_TOKEN"), os.environ.get("DOCTOR_TG_CHAT")
PORTS = {"nginx": 8080, "panel": 8000}
WS_PATHS, HTTP_ONLY = {}, set()
# watch exactly the inbounds that lock.py wrote (WS / HTTPUpgrade get a real handshake test, XHTTP a port test)
try:
    for ib in json.load(open("/var/lib/marzban/xray_config.json"))["inbounds"]:
        ss = ib.get("streamSettings", {}); net = ss.get("network")
        path = (ss.get("wsSettings") or ss.get("httpupgradeSettings") or ss.get("xhttpSettings") or ss.get("splithttpSettings") or {}).get("path")
        if ib.get("port") and path:
            PORTS[ib["tag"]] = ib["port"]; WS_PATHS[ib["tag"]] = path
            if net in ("xhttp", "splithttp"):
                HTTP_ONLY.add(ib["tag"])
except Exception as e:
    print(f"[doctor] could not read xray config: {e}", flush=True)
    PORTS.update({"jinx-inbound": 2004, "vless": 2001, "vmess": 2002, "trojan": 2003})
    WS_PATHS.update({"jinx-inbound": "/panel-ws", "vless": "/vless", "vmess": "/vmess", "trojan": "/trojan"})

def log(msg):
    print(f"[doctor] {msg}", flush=True)
    if TG_TOKEN and TG_CHAT:
        try:
            urllib.request.urlopen(f"https://api.telegram.org/bot{TG_TOKEN}/sendMessage",
                urllib.parse.urlencode({"chat_id": TG_CHAT, "text": "⚡ Super JinX\n" + msg}).encode(), timeout=8)
        except Exception:
            pass

def up(port):
    try:
        with socket.create_connection(("127.0.0.1", port), timeout=3):
            return True
    except OSError:
        return False

def http_ok(url):
    try:
        return urllib.request.urlopen(url, timeout=8).status == 200
    except Exception:
        return False

def ws_ok(path):
    """Real end-to-end test: WebSocket handshake through nginx -> Xray. 101 = config path is alive."""
    try:
        s = socket.create_connection(("127.0.0.1", 8080), timeout=5)
        s.sendall((f"GET {path} HTTP/1.1\r\nHost: localhost\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n"
                   "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\nSec-WebSocket-Version: 13\r\n\r\n").encode())
        line = s.recv(64).decode(errors="ignore"); s.close()
        return " 101 " in line
    except OSError:
        return False


SUB_T, SUB_G = "/opt/jinx/templates/subscription/index.html", "/opt/jinx/sub.golden.html"

def sub_ok():
    try:
        t = open(SUB_T, encoding="utf-8").read()
        if 'id="jinx-data"' not in t or "</html>" not in t:
            return False
        try:
            import jinja2
            jinja2.Environment().parse(t)
        except ImportError:
            pass
        return True
    except Exception:
        return False

def sub_heal():
    try:
        g = open(SUB_G, encoding="utf-8").read()
        os.makedirs(os.path.dirname(SUB_T), exist_ok=True)
        tmp = SUB_T + ".tmp"
        open(tmp, "w", encoding="utf-8").write(g)
        os.replace(tmp, SUB_T)
        log("subscription page was broken -> restored")
    except Exception as e:
        log(f"subscription page restore failed: {e}")

BK_DIR = "/var/lib/marzban/jinx_backups"

def daily_backup():
    """online sqlite backup (safe while the panel is running) + agency data, keeps the newest 7"""
    import sqlite3, shutil
    db = "/var/lib/marzban/db.sqlite3"
    if not os.path.exists(db):
        return
    os.makedirs(BK_DIR, exist_ok=True)
    stamp = time.strftime("%Y%m%d-%H%M%S")
    tmp = os.path.join(BK_DIR, f"db-{stamp}.sqlite3.tmp")
    src = sqlite3.connect(db, timeout=30); dst = sqlite3.connect(tmp)
    try:
        src.backup(dst)
    finally:
        dst.close(); src.close()
    os.replace(tmp, tmp[:-4])
    for f in ("/var/lib/marzban/jinx_resellers.json",):
        if os.path.exists(f):
            shutil.copyfile(f, os.path.join(BK_DIR, f"agency-{stamp}.json"))
    for prefix in ("db-", "agency-"):
        old = sorted(n for n in os.listdir(BK_DIR) if n.startswith(prefix) and not n.endswith(".tmp"))
        for n in old[:-7]:
            try:
                os.remove(os.path.join(BK_DIR, n))
            except OSError:
                pass
    print(f"[doctor] daily backup saved ({stamp})", flush=True)

def token():
    data = urllib.parse.urlencode(json.load(open("/run/jinx/system.json"))).encode()
    r = urllib.request.urlopen(urllib.request.Request(API + "/api/admin/token", data=data), timeout=8)
    return json.loads(r.read())["access_token"]

def restart_xray():
    req = urllib.request.Request(API + "/api/core/restart", method="POST",
                                 headers={"Authorization": "Bearer " + token()})
    urllib.request.urlopen(req, timeout=20)

time.sleep(60)  # let everything boot first
log(f"online, watching nginx / panel / tunnel / {len(WS_PATHS)} inbounds: {', '.join(WS_PATHS)}")
panel_fail = xray_fail = 0
tunnel_was_up = None
loop = 0
last_backup = 0
while True:
    # daily backup (first one 10 minutes after start)
    if time.time() - last_backup > 86400 and loop >= 40:
        try:
            daily_backup()
        except Exception as e:
            log(f"backup failed: {e}")
        last_backup = time.time()
    # nginx
    if not up(PORTS["nginx"]):
        log("nginx down -> restarting nginx")
        subprocess.call(["nginx", "-s", "stop"], stderr=subprocess.DEVNULL)
        time.sleep(1)
        subprocess.call(["nginx"])
    # subscription page
    if os.path.exists(SUB_G) and not sub_ok():
        sub_heal()
    # panel
    if http_ok(API + "/dashboard/"):
        panel_fail = 0
    else:
        panel_fail += 1
        log(f"panel not responding ({panel_fail}/3)")
        if panel_fail >= 3:
            log("panel frozen -> restarting container")
            try:
                os.kill(int(open("/run/jinx/marzban.pid").read().strip()), signal.SIGKILL)
            except Exception as e:
                log(f"could not stop panel: {e}")
            panel_fail = 0
    # xray inbounds: port check every 15s, real WebSocket handshake every 60s (keeps Xray logs clean)
    loop += 1
    deep = loop % 4 == 1
    down = [n for n in WS_PATHS if not up(PORTS[n]) or (deep and n not in HTTP_ONLY and not ws_ok(WS_PATHS[n]))]
    if down and panel_fail == 0:
        xray_fail += 1
        if xray_fail >= 2:
            log(f"xray inbounds down {down} -> restarting xray core")
            try:
                restart_xray()
            except Exception as e:
                log(f"xray restart failed: {e}")
            xray_fail = 0
    else:
        xray_fail = 0
    # tunnel
    if os.environ.get("CF_TUNNEL_TOKEN"):
        alive = subprocess.call(["pgrep", "-f", "cloudflared tunnel"], stdout=subprocess.DEVNULL) == 0
        if alive != tunnel_was_up:
            log("tunnel connected ✅" if alive else "tunnel down, auto-reconnecting ⏳")
            tunnel_was_up = alive
    time.sleep(15)
