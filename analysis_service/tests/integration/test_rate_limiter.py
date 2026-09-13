import datetime

from app.db import db_client
from app.services.rate_limiter import check_rate_limit


def test_allows_up_to_the_limit_then_blocks():
    key = "rl:test:allow-then-block"

    for _ in range(10):
        assert check_rate_limit(key, limit=10, window_sec=60) is True

    # 11th call within the same window must be refused.
    assert check_rate_limit(key, limit=10, window_sec=60) is False
    # Staying over quota does not "un-stick" on its own within the window.
    assert check_rate_limit(key, limit=10, window_sec=60) is False


def test_window_resets_after_expiry_without_waiting_for_ttl_sweep():
    key = "rl:test:window-reset"

    for _ in range(10):
        assert check_rate_limit(key, limit=10, window_sec=60) is True
    assert check_rate_limit(key, limit=10, window_sec=60) is False

    # Simulate the window having elapsed by moving expiresAt into the past,
    # without relying on Mongo's TTL background sweep (which runs on its own
    # ~60s cycle and must not be a precondition for correct rate-limit
    # behavior — this is exactly defect D18).
    db = db_client.get_db()
    past = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(seconds=1)
    res = db.rate_limits.update_one({"_id": key}, {"$set": {"expiresAt": past}})
    assert res.modified_count == 1

    # The very next call must treat this as a fresh window: allowed, and
    # counting from 1 again (so 9 more calls are allowed before blocking).
    assert check_rate_limit(key, limit=10, window_sec=60) is True
    doc = db.rate_limits.find_one({"_id": key})
    assert doc["count"] == 1

    for _ in range(9):
        assert check_rate_limit(key, limit=10, window_sec=60) is True
    assert check_rate_limit(key, limit=10, window_sec=60) is False


def test_independent_keys_do_not_share_quota():
    assert check_rate_limit("rl:test:key-a", limit=1, window_sec=60) is True
    assert check_rate_limit("rl:test:key-a", limit=1, window_sec=60) is False
    # A different key starts its own fresh window.
    assert check_rate_limit("rl:test:key-b", limit=1, window_sec=60) is True
