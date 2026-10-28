"""Redis health & statistics endpoint.

Server-wide stats (INFO, DBSIZE, clients) are reported separately from the
demo-specific metrics (liveboard:* keys, cache hits/misses, stream events).

Redis keys (all built from ctx.REDIS_PREFIX):
    liveboard:stats:cache_hits   -> INCR counter
    liveboard:stats:cache_misses -> INCR counter
    liveboard:activity           -> stream (length + recent event buckets)
    liveboard:*                  -> scanned for the demo key count
"""

import time


def redis_key(ctx, name):
    prefix = (getattr(ctx, "REDIS_PREFIX", "") or "").strip()
    if prefix and not prefix.endswith(":"):
        prefix += ":"
    return f"{prefix}{name}"


def to_int(raw, default=0):
    try:
        return int(raw)
    except (TypeError, ValueError):
        return default


def main(args, ctx=None):
    if not ctx or not hasattr(ctx, "REDIS"):
        return {"ok": False, "error": "Redis non configurato"}

    rd = ctx.REDIS
    now_ms = int(time.time() * 1000)

    # --- server-wide statistics ---------------------------------------------
    try:
        info_memory = rd.info("memory")
        info_server = rd.info("server")
        info_clients = rd.info("clients")
        dbsize = to_int(rd.dbsize())
        used_memory_bytes = to_int(info_memory.get("used_memory"))
        server = {
            "redisVersion": str(info_server.get("redis_version", "?")),
            "dbsize": dbsize,
            "connectedClients": to_int(info_clients.get("connected_clients")),
            "usedMemoryBytes": used_memory_bytes,
            "usedMemoryHuman": str(info_memory.get("used_memory_human", "?")),
            "peakMemoryHuman": str(info_memory.get("used_memory_peak_human", "?")),
            "uptimeSeconds": to_int(info_server.get("uptime_in_seconds")),
        }
    except Exception:
        server = None

    # --- demo-specific metrics ---------------------------------------------
    demo_pattern = redis_key(ctx, "liveboard:*")
    demo_keys = sum(1 for _ in rd.scan_iter(match=demo_pattern, count=200))
    hits = to_int(rd.get(redis_key(ctx, "liveboard:stats:cache_hits")))
    misses = to_int(rd.get(redis_key(ctx, "liveboard:stats:cache_misses")))
    total_reads = hits + misses
    hit_rate = round(hits * 100.0 / total_reads, 1) if total_reads else None

    stream_key = redis_key(ctx, "liveboard:activity")
    stream_length = to_int(rd.xlen(stream_key))

    # recent activity chart: 10 buckets x 10s ending now
    bucket_ms = 10000
    buckets = 10
    start_ms = (now_ms // bucket_ms) * bucket_ms - (buckets - 1) * bucket_ms
    counts = [0] * buckets
    try:
        entries = rd.xrevrange(stream_key, count=150)
        for _entry_id, fields in entries:
            ts = to_int(fields.get("ts"))
            offset = (ts - start_ms) // bucket_ms
            if 0 <= offset < buckets:
                counts[offset] += 1
    except Exception:
        pass

    return {
        "ok": True,
        "ping": True,
        "ts": now_ms,
        "server": server,
        "demo": {
            "keys": demo_keys,
            "cacheHits": hits,
            "cacheMisses": misses,
            "hitRate": hit_rate,
            "streamEvents": stream_length,
        },
        "activity": {
            "bucketMs": bucket_ms,
            "startMs": start_ms,
            "counts": counts,
        },
    }