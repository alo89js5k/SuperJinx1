# Rebuilds the Xray config on every start from the repo files.
# The panel's Core Settings are read-only, so the repo is the single source of truth:
# no stale config from an old deploy, no corrupt JSON, and the locked inbound is always first.
# ⚡ Fast transports are added ONLY when this image's Xray AND Marzban both support them,
#    so a newer feature can never stop the core (all WS configs keep working no matter what).
import json, os, re, shutil, subprocess, time
DST = "/var/lib/marzban/xray_config.json"
base = json.load(open("/opt/xray_config.json"))
locked = json.load(open("/opt/locked_inbound.json"))
if os.path.exists(DST):
    try:
        json.load(open(DST))
    except Exception:
        shutil.copy(DST, DST + f".broken-{int(time.time())}")
        print("[lock] old config was corrupt, backed up and replaced", flush=True)

def xray_version():
    exe = os.environ.get("XRAY_EXECUTABLE_PATH") or shutil.which("xray") or "/usr/local/bin/xray"
    try:
        out = subprocess.run([exe, "version"], capture_output=True, text=True, timeout=10).stdout
        m = re.search(r"Xray (\d+)\.(\d+)\.(\d+)", out)
        return tuple(int(v) for v in m.groups()) if m else (0, 0, 0)
    except Exception:
        return (0, 0, 0)

def marzban_knows(word):
    for root, _, files in os.walk("/code/app"):
        for f in files:
            if f.endswith(".py"):
                try:
                    if word in open(os.path.join(root, f), encoding="utf-8", errors="ignore").read():
                        return True
                except Exception:
                    pass
    return False

def inbound(tag, port, net, settings):
    return {"tag": tag, "listen": "127.0.0.1", "port": port, "protocol": "vless",
            "settings": {"clients": [], "decryption": "none"},
            "streamSettings": dict({"network": net, "security": "none",
                                    "sockopt": {"tcpKeepAliveIdle": 30, "tcpKeepAliveInterval": 15}}, **settings),
            "sniffing": {"enabled": True, "destOverride": ["http", "tls", "quic"], "routeOnly": True}}

ver = xray_version()
extra = []
if os.environ.get("JINX_FAST", "1") != "0":
    # HTTPUpgrade: same path as WS through Railway/Cloudflare, but lighter (no WS framing) -> faster
    if ver >= (1, 8, 9) and marzban_knows("httpupgrade"):
        extra.append(inbound("VLESS HTTPUPGRADE", 2005, "httpupgrade", {"httpupgradeSettings": {"path": "/vhu"}}))
    # XHTTP (or the older SplitHTTP): plain HTTP requests, passes any CDN, very stable on strict operators
    if ver >= (24, 11, 0) and marzban_knows("xhttp"):
        extra.append(inbound("VLESS XHTTP", 2006, "xhttp", {"xhttpSettings": {"path": "/vxh", "mode": "auto"}}))
    elif ver >= (1, 8, 16) and marzban_knows("splithttp"):
        extra.append(inbound("VLESS XHTTP", 2006, "splithttp", {"splithttpSettings": {"path": "/vxh"}}))

base["inbounds"] = [locked] + [i for i in base["inbounds"]
                               if i["tag"] != locked["tag"] and i["port"] != locked["port"]] + extra
tags = [i["tag"] for i in base["inbounds"]]; ports = [i["port"] for i in base["inbounds"]]
assert len(set(tags)) == len(tags) and len(set(ports)) == len(ports), "duplicate inbound tag/port"
tmp = DST + ".tmp"
json.dump(base, open(tmp, "w"), indent=2, ensure_ascii=False)
os.replace(tmp, DST)  # atomic write
print(f"[lock] xray {'.'.join(map(str, ver))} | config ready: {len(tags)} inbounds "
      f"({', '.join(tags)}) | locked = {locked['tag']}", flush=True)
