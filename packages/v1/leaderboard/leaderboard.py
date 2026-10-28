"""Real-time leaderboard endpoint backed by Redis Sorted Sets.

Redis keys (all built from ctx.REDIS_PREFIX):
    liveboard:leaderboard        -> sorted set (member: player id, score: points)
    liveboard:players            -> hash (field: player id -> JSON metadata)
    liveboard:seed:leaderboard   -> seed marker so players are only seeded once
"""

import json
import random
import time

# id, name, avatar (emoji), seed score
SEED_PLAYERS = [
    ("novabyte", "NovaByte", "🚀", 1240),
    ("pixelia", "Pixelia", "🎨", 980),
    ("bytebandit", "ByteBandit", "🦊", 860),
    ("cachequeen", "CacheQueen", "👑", 710),
    ("turbobunny", "TurboBunny", "⚡", 590),
    ("lambdallama", "LambdaLlama", "🦙", 410),
]


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


def ensure_seeded(rd, ctx):
    """Seed six fictional players exactly once, using a durable marker."""
    marker = redis_key(ctx, "liveboard:seed:leaderboard")
    if rd.exists(marker):
        return False
    lb_key = redis_key(ctx, "liveboard:leaderboard")
    meta_key = redis_key(ctx, "liveboard:players")
    for pid, name, avatar, score in SEED_PLAYERS:
        rd.zadd(lb_key, {pid: score})
        rd.hset(meta_key, pid, json.dumps({"name": name, "avatar": avatar}))
    rd.set(marker, "1")
    log_activity(
        rd, ctx, "system",
        "Leaderboard seeded with 6 players",
        "ZADD x6 + seed marker",
    )
    return True


def ranked_players(rd, ctx):
    lb_key = redis_key(ctx, "liveboard:leaderboard")
    meta_key = redis_key(ctx, "liveboard:players")
    entries = rd.zrevrange(lb_key, 0, -1, withscores=True)
    meta = rd.hgetall(meta_key)
    players = []
    for rank, (pid, score) in enumerate(entries, start=1):
        try:
            info = json.loads(meta.get(pid, "{}"))
        except (TypeError, ValueError):
            info = {}
        players.append({
            "id": pid,
            "name": info.get("name", pid),
            "avatar": info.get("avatar", "❓"),
            "score": int(score),
            "rank": rank,
        })
    return players


def main(args, ctx=None):
    if not ctx or not hasattr(ctx, "REDIS"):
        return {"ok": False, "error": "Redis non configurato"}

    rd = ctx.REDIS
    data = request_data(args)
    method = request_method(args)
    op = str(data.get("op") or "").strip().lower()

    ensure_seeded(rd, ctx)

    # --- award points ------------------------------------------------------
    if method in ("POST", "PUT") and op == "award":
        player = str(data.get("player") or "").strip().lower()
        lb_key = redis_key(ctx, "liveboard:leaderboard")
        if not player or not rd.zscore(lb_key, player):
            return {"ok": False, "error": f"Unknown player '{player}'"}

        raw_points = data.get("points")
        if raw_points in (None, ""):
            points = random.randint(10, 100)
        else:
            try:
                points = int(raw_points)
            except (TypeError, ValueError):
                return {"ok": False, "error": "points must be an integer between 1 and 500"}
            if not 1 <= points <= 500:
                return {"ok": False, "error": "points must be an integer between 1 and 500"}

        new_score = int(rd.zincrby(lb_key, points, player))
        meta_key = redis_key(ctx, "liveboard:players")
        try:
            info = json.loads(rd.hget(meta_key, player) or "{}")
        except (TypeError, ValueError):
            info = {}
        name = info.get("name", player)
        log_activity(
            rd, ctx, "score",
            f"{name} awarded +{points} pts",
            f"ZINCRBY liveboard:leaderboard {points} {player} -> {new_score}",
        )
        return {
            "ok": True,
            "op": "award",
            "player": player,
            "name": name,
            "awarded": points,
            "score": new_score,
            "players": ranked_players(rd, ctx),
        }

    # --- reset the whole board --------------------------------------------
    if method in ("POST", "PUT") and op == "reset":
        for pid, name, avatar, score in SEED_PLAYERS:
            rd.zadd(redis_key(ctx, "liveboard:leaderboard"), {pid: score})
        log_activity(rd, ctx, "score", "Leaderboard reset to seed scores", "ZADD x6")
        return {"ok": True, "op": "reset", "players": ranked_players(rd, ctx)}

    # --- read ---------------------------------------------------------------
    players = ranked_players(rd, ctx)
    return {"ok": True, "op": "list", "players": players, "total": len(players)}