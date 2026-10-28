"""Live counters endpoint backed by Redis atomic INCR operations.

Redis keys (all built from ctx.REDIS_PREFIX):
    liveboard:counter:<id>  -> string counter (INCR / SET 0)

Counter ids:
    page_views, api_requests, active_sessions
"""

import time

COUNTER_IDS = ("page_views", "api_requests", "active_sessions")


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
            import json
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


def get_all(rd, ctx):
    counters = {}
    for cid in COUNTER_IDS:
        raw = rd.get(redis_key(ctx, f"liveboard:counter:{cid}"))
        try:
            counters[cid] = int(raw) if raw is not None else 0
        except (TypeError, ValueError):
            counters[cid] = 0
    return counters


def parse_amount(data):
    raw = data.get("amount")
    if raw in (None, ""):
        return 1
    try:
        amount = int(raw)
    except (TypeError, ValueError):
        raise ValueError("amount must be an integer between 1 and 1000")
    if 1 <= amount <= 1000:
        return amount
    raise ValueError("amount must be an integer between 1 and 1000")


def main(args, ctx=None):
    if not ctx or not hasattr(ctx, "REDIS"):
        return {"ok": False, "error": "Redis non configurato"}

    rd = ctx.REDIS
    data = request_data(args)
    method = request_method(args)
    op = str(data.get("op") or "").strip().lower()

    # --- write operations -------------------------------------------------
    if method in ("POST", "PUT") and op in ("increment", "reset"):
        counter = str(data.get("counter") or "").strip().lower()

        if op == "increment":
            if counter not in COUNTER_IDS:
                return {"ok": False, "error": f"Invalid counter '{counter}'"}
            try:
                amount = parse_amount(data)
            except ValueError as exc:
                return {"ok": False, "error": str(exc)}
            key = redis_key(ctx, f"liveboard:counter:{counter}")
            value = rd.incr(key, amount) if amount != 1 else rd.incr(key)
            log_activity(
                rd, ctx, "counter",
                f"{counter.replace('_', ' ').title()} +{amount}",
                f"INCR liveboard:counter:{counter} -> {value}",
            )
            return {
                "ok": True,
                "op": "increment",
                "counter": counter,
                "amount": amount,
                "value": int(value),
                "counters": get_all(rd, ctx),
            }

        # reset
        if counter == "all":
            for cid in COUNTER_IDS:
                rd.set(redis_key(ctx, f"liveboard:counter:{cid}"), 0)
            log_activity(rd, ctx, "counter", "All counters reset", "SET 0 x3")
            return {
                "ok": True,
                "op": "reset",
                "counter": "all",
                "value": 0,
                "counters": get_all(rd, ctx),
            }
        if counter not in COUNTER_IDS:
            return {"ok": False, "error": f"Invalid counter '{counter}'"}
        key = redis_key(ctx, f"liveboard:counter:{counter}")
        rd.set(key, 0)
        log_activity(
            rd, ctx, "counter",
            f"{counter.replace('_', ' ').title()} reset to 0",
            f"SET liveboard:counter:{counter} 0",
        )
        return {
            "ok": True,
            "op": "reset",
            "counter": counter,
            "value": 0,
            "counters": get_all(rd, ctx),
        }

    # --- read -------------------------------------------------------------
    return {"ok": True, "op": "list", "counters": get_all(rd, ctx)}