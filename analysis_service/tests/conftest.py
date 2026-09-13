"""
Shared pytest configuration for the whole analysis_service test suite.

SAFETY: this module is imported by pytest before any test module under
`tests/` (unit or integration) gets a chance to import `app.*`. It forces
safe configuration defaults and then refuses to run at all unless the
configured MongoDB database is a disposable test database (name ends in
`_test`). Integration tests wipe entire collections
(see tests/integration/conftest.py) — running them against a real database
would silently destroy real student/test/report data. This guard exists
because that happened during development (remediation Phase R0, defect D19).
"""
import os

# Force safe defaults *before* importing anything under `app.*` below.
# `os.environ.setdefault` only takes effect when the variable is not already
# set in the process environment, so CI (or an operator who deliberately
# exports these, e.g. to point at a shared Mongo instance) is respected.
# Real environment variables take priority over analysis_service/.env in
# pydantic-settings (verified during R0), so this is sufficient protection
# even when .env itself contains non-test values.
os.environ.setdefault("MONGODB_URI", "mongodb://localhost:27017/cognitest_test")
os.environ.setdefault("JWT_SECRET", "pytest-only-secret-do-not-use-in-production!!")
os.environ.setdefault("INSTITUTE_ID", "60c72b2f9b1e8a001c8e4a5d")
os.environ.setdefault("ALLOWED_ORIGINS", '["http://localhost:3000"]')

import pytest  # noqa: E402  (must follow the os.environ defaults above)
from pymongo import uri_parser  # noqa: E402

from app.config import settings  # noqa: E402


def _resolved_database_name(uri: str) -> str | None:
    try:
        return uri_parser.parse_uri(uri).get("database")
    except Exception:
        return None


_db_name = _resolved_database_name(settings.mongodb_uri)
if not _db_name or not _db_name.endswith("_test"):
    pytest.exit(
        "Refusing to run the test suite: MONGODB_URI resolves to database "
        f"{_db_name!r}, which does not end in '_test'. Integration tests "
        "wipe every collection in this database. Either unset MONGODB_URI "
        "so the conftest.py default (cognitest_test) applies, or set it "
        "explicitly to a database whose name ends in '_test'.",
        returncode=1,
    )
