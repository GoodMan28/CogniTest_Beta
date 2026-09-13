"""
Writes the synthetic fixture (or a caller-supplied variant of it) to disk
as a private_data/<test-key>/*.json bundle, for tests that exercise the
file-loading path (app.services.bundle.load_bundle) or the CLI directly,
rather than importing the fixture's Python lists in-process.
"""
import json
import os
from typing import Any, Dict, Optional


def write_bundle(
    directory: str,
    *,
    manifest: Dict[str, Any],
    questions: list,
    answer_key: list,
    students: list,
    responses: list,
    recommendations: list,
) -> str:
    os.makedirs(directory, exist_ok=True)
    files = {
        "manifest.json": manifest,
        "questions.json": questions,
        "answer_key.json": answer_key,
        "students.json": students,
        "responses.json": responses,
        "recommendations.json": recommendations,
    }
    for filename, content in files.items():
        with open(os.path.join(directory, filename), "w", encoding="utf-8") as fh:
            json.dump(content, fh, indent=2, default=str)
    return directory


def write_synthetic_fixture(directory: str, *, answer_key: Optional[list] = None) -> str:
    from tests.fixtures.synthetic_fixture import (
        MANIFEST,
        QUESTIONS,
        ANSWER_KEY,
        STUDENTS,
        RESPONSES,
        RECOMMENDATIONS,
    )

    return write_bundle(
        directory,
        manifest=MANIFEST,
        questions=QUESTIONS,
        answer_key=answer_key if answer_key is not None else ANSWER_KEY,
        students=STUDENTS,
        responses=RESPONSES,
        recommendations=RECOMMENDATIONS,
    )
