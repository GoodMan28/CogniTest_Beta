import datetime

import pymongo

from app.db import db_client


def check_rate_limit(key: str, limit: int, window_sec: int) -> bool:
    """
    Returns True if allowed, False if rate limited.

    Uses a single atomic MongoDB update-with-pipeline so the sliding window
    is enforced by this code on every call, not just by the collection's TTL
    index (`app/repositories/indexes.py` creates a TTL index on `expiresAt`
    purely for eventual cleanup of stale documents — Mongo's TTL sweep runs
    on its own ~60s cycle and must never be relied on to make a currently
    over-quota key start working again; remediation D18).

    Window semantics: a document with no `expiresAt` (freshly upserted) or
    an `expiresAt` in the past is treated as a new window: count resets to 1
    and `expiresAt` is set to `now + window_sec`. Otherwise the existing
    window's count is incremented. Both branches happen inside one atomic
    `find_one_and_update`, so concurrent callers cannot race each other into
    inconsistent counts.
    """
    db = db_client.get_db()
    now = datetime.datetime.now(datetime.timezone.utc)
    window_end = now + datetime.timedelta(seconds=window_sec)

    window_expired = {"$lt": ["$expiresAt", now]}

    res = db.rate_limits.find_one_and_update(
        {"_id": key},
        [
            {
                "$set": {
                    "count": {
                        "$cond": [window_expired, 1, {"$add": ["$count", 1]}]
                    },
                    "expiresAt": {
                        "$cond": [window_expired, window_end, "$expiresAt"]
                    },
                }
            }
        ],
        upsert=True,
        return_document=pymongo.ReturnDocument.AFTER,
    )

    return res["count"] <= limit
