# Super JinX host guard (every 20s)
# 1) Locked inbound: every route is forced and reverted within 20s if anyone edits it
# 2) Other inbounds: get the same full route set automatically and are kept in sync,
#    as long as they still look like ours. Rename a host in the panel and the guard leaves it alone.
# Every config carries exactly the same name; the apps pick the fastest one with their ping test.
import json, os, time, urllib.error, urllib.request, urllib.parse

API = "http://127.0.0.1:8000"
LOCKED_TAG = json.load(open("/opt/locked_inbound.json"))["tag"]
LOCKED_REMARK = "جینکس | 𝙎𝙪𝙥𝙚𝙧 𝗝𝗶𝗻𝗫"
DOMAIN = os.environ.get("PANEL_DOMAIN") or os.environ.get("RAILWAY_PUBLIC_DOMAIN", "")
CF_HOST = os.environ.get("CF_TUNNEL_HOSTNAME", "") if os.environ.get("CF_TUNNEL_TOKEN") else ""
def _list(name, default=""):
    return [x.strip() for x in os.environ.get(name, default).replace(" ", ",").split(",") if x.strip()]

CF_IPS = _list("CF_CLEAN_IP")                        # one or more Cloudflare clean IPs (best one per operator)
# Cloudflare HTTPS ports: different operators throttle different ports, so every clean IP is offered on each
CF_PORTS = [int(p) for p in _list("CF_PORTS", "443,2053,8443") if p.isdigit() and int(p) in (443, 2053, 2083, 2087, 2096, 8443)] or [443]
RELAY_IPS = _list("IRAN_RELAY_IP")                   # optional Iranian relay server(s), see iran-relay.sh
RELAY_PORT = int(os.environ.get("IRAN_RELAY_PORT", "443") or 443)
FRAG = os.environ.get("JINX_FRAGMENT", "10-20,10-20,tlshello").strip()   # "" disables the fragment route
PATHS = {LOCKED_TAG: "/panel-ws?ed=2048", "VLESS WS": "/vless?ed=2048", "VMESS WS": "/vmess?ed=2048",
         "TROJAN WS": "/trojan?ed=2048", "VLESS HTTPUPGRADE": "/vhu?ed=2048", "VLESS XHTTP": "/vxh"}
OLD_AUTO = {"𝗝𝗶𝗻𝗫 | VLESS", "𝗝𝗶𝗻𝗫 | VMess", "𝗝𝗶𝗻𝗫 | Trojan"}      # names of older versions -> renamed

HAS_RAILWAY_DOMAIN = bool(DOMAIN)
if not DOMAIN and CF_HOST:
    DOMAIN = CF_HOST  # tunnel-only setup: everything goes through the tunnel hostname

def base(path, address=None, sni=None, port=443, frag="", alpn="http/1.1"):
    sni = sni or DOMAIN
    return {"remark": LOCKED_REMARK, "path": path, "address": address or sni, "port": port, "sni": sni, "host": sni,
            "security": "tls", "alpn": alpn, "fingerprint": "chrome",
            "allowinsecure": False, "is_disabled": False, "mux_enable": False,
            "fragment_setting": frag or None}   # explicit, so no config ever inherits a fragment by accident

def wanted(tag):
    """All routes for one inbound, best first (MCI / Irancell / TCI / Rightel each have a winner)."""
    path = PATHS.get(tag)
    if not path:
        return []
    alpn = "h2,http/1.1" if tag == "VLESS XHTTP" else "http/1.1"
    out = []
    if HAS_RAILWAY_DOMAIN:
        for ip in RELAY_IPS:                                           # 🇮🇷 Iran relay = lowest ping
            out.append(base(path, address=ip, port=RELAY_PORT, alpn=alpn))
    if CF_HOST:
        for ip in CF_IPS:                                              # ☁️ Cloudflare clean IPs x ports
            for p in CF_PORTS:
                out.append(base(path, address=ip, sni=CF_HOST, port=p, alpn=alpn))
        out.append(base(path, address=CF_HOST, sni=CF_HOST, alpn=alpn))  # ☁️ Cloudflare by hostname
    if HAS_RAILWAY_DOMAIN:
        out.append(base(path, alpn=alpn))                              # ⚡ straight to Railway (Amsterdam)
        if FRAG:
            out.append(base(path, frag=FRAG, alpn=alpn))               # 🧩 for SNI-filtered operators
    return out

CORE = ("remark", "address", "port", "sni", "host", "path", "security", "alpn", "fingerprint")

def same(cur, want):
    # core fields must match; extra fields only if this Marzban version has them (no endless re-writes)
    return all(cur.get(k) == v for k, v in want.items() if k in CORE or k in cur)

def is_default(h):
    return (not h) or "{SERVER_IP}" in str(h.get("address", ""))

def ours(tag, lst):
    """Still managed by us: every host has our name (or an old auto name) and our path."""
    p = (PATHS.get(tag) or "").split("?")[0]
    return bool(lst) and all(h.get("remark") in OLD_AUTO | {LOCKED_REMARK} and str(h.get("path") or "").split("?")[0] == p for h in lst)

def req(method, path, data=None, token=None, form=False):
    h = {}
    if token:
        h["Authorization"] = "Bearer " + token
    if data is not None:
        if form:
            data = urllib.parse.urlencode(data).encode()
            h["Content-Type"] = "application/x-www-form-urlencoded"
        else:
            data = json.dumps(data).encode()
            h["Content-Type"] = "application/json"
    r = urllib.request.Request(API + path, data=data, headers=h, method=method)
    return json.loads(urllib.request.urlopen(r, timeout=10).read() or b"null")

def sync(hosts, tag):
    want = wanted(tag)
    cur = hosts.get(tag) or []
    if not want or (len(cur) == len(want) and all(same(c, w) for c, w in zip(cur, want))):
        return False
    tmpl = cur[0] if cur else {}
    new = []
    for w in want:
        h = dict(tmpl); h.update(w); new.append(h)
    hosts[tag] = new
    return True

if not DOMAIN:
    print("[guard] WARNING: no domain yet. Generate a Railway domain (port 8080) and redeploy.", flush=True)
else:
    print(f"[guard] routes per inbound: {len(wanted('VLESS WS'))} "
          f"(relay {len(RELAY_IPS)}, cf ips {len(CF_IPS)} x ports {CF_PORTS if CF_HOST else []}, "
          f"cf domain {int(bool(CF_HOST))}, direct {int(HAS_RAILWAY_DOMAIN)}, fragment {int(HAS_RAILWAY_DOMAIN and bool(FRAG))})", flush=True)

while True:
    try:
        cred = json.load(open("/run/jinx/system.json"))
        tok = req("POST", "/api/admin/token", cred, form=True)["access_token"]
        hosts = req("GET", "/api/hosts", token=tok)
        changed = False
        if DOMAIN:
            for tag, lst in hosts.items():
                if tag == LOCKED_TAG or is_default(lst[0] if lst else None) and all(is_default(h) for h in lst) or ours(tag, lst):
                    if sync(hosts, tag):
                        changed = True
                        print(f"[guard] {'locked inbound restored' if tag == LOCKED_TAG else 'routes updated for ' + tag}", flush=True)
            if LOCKED_TAG not in hosts:
                print("[guard] locked inbound not loaded yet", flush=True)
        if changed:
            try:
                req("PUT", "/api/hosts", hosts, token=tok)
            except urllib.error.HTTPError as he:
                if FRAG and he.code in (400, 422):
                    # this Marzban version rejected the fragment value -> drop fragment, keep every other config working
                    print(f"[guard] panel rejected fragment setting ({he.code}), retrying without it", flush=True)
                    FRAG = ""
                    for tag in list(hosts):
                        lst = hosts[tag]
                        if tag == LOCKED_TAG or ours(tag, lst):
                            hosts[tag] = [h for h in lst if not h.get("fragment_setting")]
                        for h in hosts[tag]:
                            h["fragment_setting"] = None
                    req("PUT", "/api/hosts", hosts, token=tok)
                else:
                    raise
    except Exception as e:
        print("[guard] waiting for panel:", e, flush=True)
    time.sleep(20)
