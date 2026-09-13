import pytest

from app.db import db_client
from app.repositories.indexes import apply_indexes


@pytest.fixture(autouse=True)
def clean_db():
    """
    Wipe every collection in the configured database and reapply demo
    indexes before each integration test.

    This fixture used to be copy-pasted into test_auth.py, test_preparation.py,
    test_publication.py, and test_reports.py (remediation R0, defect D19).
    It is deliberately placed here rather than in the top-level
    tests/conftest.py: it is scoped to tests/integration/ only, so that unit
    tests under tests/unit/ never require a running MongoDB instance.

    SAFETY: this deletes ALL documents in every collection of the database
    named by MONGODB_URI. tests/conftest.py refuses to run the suite at all
    unless that database's name ends in `_test` — do not weaken that guard
    to make this fixture "work" against a real database.
    """
    db = db_client.get_db()
    for coll in db.list_collection_names():
        db[coll].delete_many({})
    apply_indexes()
    yield
