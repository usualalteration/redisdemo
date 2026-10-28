"""Cache explorer endpoint backed by Redis key-value operations with TTL.

Redis keys (all built from ctx.REDIS_PREFIX):
    liveboard:cache:<name>       -> string value with EXPIRE (SET ... EX)
    liveboard:stats:cache_hits   -> INCR counter of cache hits
    liveboard:stats:cache_misses -> INCR counter of cache misses
    liveboard:activity           -> stream of dashboard events
"""

import json
import re
import time

TTL_OPTIONS = (30, 60, 300)
NAME_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_.-]{0,39}$")
MAX_VALUE_LEN = 500


def redis_key(ctx, name):
    prefix = (getattr(ctx, "REDIS_PREFIX", "") or "").strip()
    if prefix and not prefix.endswith(":"):
        prefix += ":"
    return f"{prefix}{name}"


def request_data(args):
    data = dict(args) if isinstance(args, dict) else {}
    body = data.get("body")
    if isinstance(body, str):
        try:
            body = json.loads(body)
        except Exception:
            body = {}
    merged = dict(body) if isinstance(body, dict) else {}
    ignored = {"body", "__ow_method", "__ow_headers", "__ow_path"}
    merged.update({k: v for k, v in data.items() if k not in ignored})
    return merged


def request_method(args):
    return (args.get("__ow_method") or args.get("method") or "GET").upper()


def request_route_name(args, data):
    """Resolve the cache key name from body/query fields first, then from a
    REST-style suffix such as /api/my/v1/cache/my-key (also bare 'my-key')."""
    name = normalize_name(data.get("name"))
    if name:
        return name

    raw_path = str(args.get("__ow_path") or args.get("path") or "").strip("/")
    if not raw_path:
        return None

    parts = [part for part in raw_path.split("/") if part]
    if not parts:
        return None

    if "cache" in parts:
        index = parts.index("cache")
        if index + 1 < len(parts):
            return normalize_name(parts[index + 1])
        return None

    if len(parts) == 1:
        return normalize_name(parts[0])
    return None


def log_activity(rd, ctx, event_type, message, detail=""):
    fields = {
        "type": event_type,
        "message": message,
        "detail": detail,
        "ts": str(int(time.time() * 1000)),
    }
    try:
        rd.xadd(redis_key(ctx, "liveboard:activity"), fields, maxlen=200, approximate=True)
    except Exception:
        pass  # activity logging must never break the primary operation


def normalize_name(raw):
    name = str(raw or "").strip()
    if not NAME_RE.match(name):
        return None
    return name


def parse_ttl(raw):
    if raw in (None, ""):
        return 60
    try:
        ttl = int(raw)
    except (TypeError, ValueError):
        return None
    return ttl if ttl in TTL_OPTIONS else None


def hits_misses(rd, ctx):
    hits = rd.get(redis_key(ctx, "liveboard:stats:cache_hits"))
    misses = rd.get(redis_key(ctx, "liveboard:stats:cache_misses"))
    return (
        int(hits) if hits is not None else 0,
        int(misses) if misses is not None else 0,
    )


def list_entries(rd, ctx):
    base = redis_key(ctx, "liveboard:cache:")
    entries = []
    for key in rd.scan_iter(match=f"{base}*", count=100):
        name = key[len(base):] if key.startswith(base) else key
        value = rd.get(key)
        ttl = rd.ttl(key)
        entries.append({
            "name": name,
            "value": value if value is not None else "",
            "ttl": int(ttl) if ttl and ttl > 0 else 0,
        })
    entries.sort(key=lambda e: e["name"].lower())
    return entries


def main(args, ctx=None):
    if not ctx or not hasattr(ctx, "REDIS"):
        return {"ok": False, "error": "Redis non configurato"}

    rd = ctx.REDIS
    data = request_data(args)
    method = request_method(args)
    op = str(data.get("op") or "").strip().lower()

    # --- SET (create / update) ---------------------------------------------
    if method in ("POST", "PUT") and op == "set":
        name = normalize_name(data.get("name"))
        if not name:
            return {"ok": False, "error": "Invalid key name. Use letters, digits, dot, dash or underscore (max 40 chars)"}
        value = data.get("value")
        if value is None or not isinstance(value, str) or not (1 <= len(value) <= MAX_VALUE_LEN):
            return {"ok": False, "error": f"value must be a string between 1 and {MAX_VALUE_LEN} characters"}
        ttl = parse_ttl(data.get("ttl"))
        if ttl is None:
            return {"ok": False, "error": f"ttl must be one of {list(TTL_OPTIONS)} seconds"}

        key = redis_key(ctx, f"liveboard:cache:{name}")
        existed = bool(rd.exists(key))
        rd.set(key, value, ex=ttl)
        remaining = rd.ttl(key)
        log_activity(
            rd, ctx, "cache",
            f"Cache key '{name}' {'updated' if existed else 'created'} (TTL {ttl}s)",
            f"SET liveboard:cache:{name} EX {ttl}",
        )
        return {
            "ok": True,
            "op": "set",
            "entry": {"name": name, "value": value, "ttl": int(remaining) if remaining and remaining > 0 else ttl},
            "existed": existed,
            "entries": list_entries(rd, ctx),
        }

    # --- GET (demonstrate cache hit / miss) ---------------------------------
    if method in ("POST", "GET") and op == "get":
        name = request_route_name(args, data)
        if not name:
            return {"ok": False, "error": "Invalid key name"}
        key = redis_key(ctx, f"liveboard:cache:{name}")
        value = rd.get(key)
        hits, misses = hits_misses(rd, ctx)
        if value is None:
            rd.incr(redis_key(ctx, "liveboard:stats:cache_misses"))
            log_activity(
                rd, ctx, "cache",
                f"Cache MISS on '{name}'",
                f"GET liveboard:cache:{name} -> nil",
            )
            return {
                "ok": True,
                "op": "get",
                "hit": False,
                "name": name,
                "hits": hits,
                "misses": misses + 1,
            }
        rd.incr(redis_key(ctx, "liveboard:stats:cache_hits"))
        ttl = rd.ttl(key)
        log_activity(
            rd, ctx, "cache",
            f"Cache HIT on '{name}'",
            f"GET liveboard:cache:{name} -> \"{value}\"",
        )
        return {
            "ok": True,
            "op": "get",
            "hit": True,
            "name": name,
            "value": value,
            "ttl": int(ttl) if ttl and ttl > 0 else 0,
            "hits": hits + 1,
            "misses": misses,
        }

    # --- DELETE --------------------------------------------------------------
    if method == "DELETE" or (method in ("POST", "PUT") and op == "delete"):
        name = request_route_name(args, data)
        if not name:
            return {"ok": False, "error": "Invalid key name"}
        key = redis_key(ctx, f"liveboard:cache:{name}")
        existed = bool(rd.exists(key))
        rd.delete(key)
        log_activity(
            rd, ctx, "cache",
            f"Cache key '{name}' {'deleted' if existed else 'already gone'}",
            f"DEL liveboard:cache:{name}",
        )
        return {
            "ok": True,
            "op": "delete",
            "name": name,
            "deleted": existed,
            "entries": list_entries(rd, ctx),
        }

    # --- LIST -----------------------------------------------------------------
    hits, misses = hits_misses(rd, ctx)
    return {
        "ok": True,
        "op": "list",
        "entries": list_entries(rd, ctx),
        "hits": hits,
        "misses": misses,
    }