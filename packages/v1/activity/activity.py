"""Live activity feed endpoint backed by Redis Streams.

Redis keys (all built from ctx.REDIS_PREFIX):
    liveboard:activity -> stream (XADD / XREVRANGE, trimmed to 200 entries)
"""

import json


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


def main(args, ctx=None):
    if not ctx or not hasattr(ctx, "REDIS"):
        return {"ok": False, "error": "Redis non configurato"}

    rd = ctx.REDIS
    stream_key = redis_key(ctx, "liveboard:activity")

    try:
        count = int(request_data(args).get("count") or 40)
    except (TypeError, ValueError):
        count = 40
    if not 1 <= count <= 200:
        count = 40

    entries = rd.xrevrange(stream_key, count=count)
    events = []
    # xrevrange returns newest-first; reverse into chronological order
    for entry_id, fields in reversed(entries):
        try:
            ts = int(fields.get("ts") or 0)
        except (TypeError, ValueError):
            ts = 0
        events.append({
            "id": entry_id,
            "type": fields.get("type", "system"),
            "message": fields.get("message", ""),
            "detail": fields.get("detail", ""),
            "ts": ts,
        })

    return {
        "ok": True,
        "events": events,
        "count": len(events),
        "streamLength": rd.xlen(stream_key),
    }