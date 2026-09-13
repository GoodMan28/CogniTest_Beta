"""
Staging rehearsal: exercises the real CLI-level pipeline (validate ->
prepare -> verify -> publish, the same functions app/cli.py calls, not a
shortcut around them) against a representative or generated bundle, and
records timing/size/latency metrics.

SAFETY: refuses to run at all unless the configured database is a `_test`
database, OR the operator explicitly passes --i-know-this-is-staging
together with --database-name matching the actual configured database
exactly (a deliberate, named override for a real staging environment that
is not simply "_test"-suffixed — never pass this against production).

Usage:
    python rehearsal.py --dir <bundle_dir>
    python rehearsal.py --generate <num_students> <num_questions> [--dir <output_dir>]

    Add --i-know-this-is-staging --database-name <exact db name> to run
    against a non-"_test" database (e.g. a real staging environment).
"""
import argparse
import datetime
import json
import os
import sys
import time
from typing import Any, Dict, List

from bson import ObjectId
from pymongo import uri_parser

from app.config import settings
from app.db import db_client
from app.repositories.tests import publish_test
from app.services.bundle import BundleValidationError, load_bundle, validate_bundle
from app.services.preparation import run_preparation_algorithm
from app.services.reports import get_report_detail
from app.services.verification import run_verification
from app.services.validation import check_bson_size


def _target_database_name() -> str:
    try:
        return uri_parser.parse_uri(settings.mongodb_uri).get("database") or ""
    except Exception:
        return ""


def _enforce_safety(force_staging: bool, expected_db_name: str | None) -> None:
    db_name = _target_database_name()
    if db_name.endswith("_test"):
        return
    if force_staging and expected_db_name and db_name == expected_db_name:
        print(f"WARNING: running rehearsal against non-'_test' database {db_name!r} "
              "with an explicit --i-know-this-is-staging override.")
        return
    print(
        f"Refusing to run: MONGODB_URI resolves to database {db_name!r}, which "
        "does not end in '_test'. This script writes and deletes real "
        "documents. Either point MONGODB_URI at a '_test' database, or pass "
        "--i-know-this-is-staging --database-name "
        f"{db_name!r} to explicitly confirm this is a real staging "
        "environment you intend to write to."
    )
    sys.exit(1)


def generate_bundle(directory: str, num_students: int, num_questions: int) -> None:
    """Writes a synthetic bundle (manifest + 6 files) that passes
    validate_bundle: alternating subjects/question types, a roster in one
    batch, alternating correct/incorrect responses, and exactly 3 valid
    practice questions per original question."""
    os.makedirs(directory, exist_ok=True)

    subjects = ["Physics", "Chemistry", "Mathematics"]
    manifest = {
        "schemaVersion": "1.0",
        "instituteId": settings.institute_id,
        "testKey": "REHEARSAL",
        "title": "Staging Rehearsal",
        "date": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "examType": "Rehearsal",
        "expectedQuestionCount": num_questions,
        "expectedStudentCount": num_students,
        "markingByType": {
            "multiple_choice": {"correctMarks": 4, "incorrectPenalty": 1},
            "numerical": {"correctMarks": 4, "incorrectPenalty": 1},
        },
        "comparisonPolicy": "default",
        "recommendationsPerQuestion": 3,
    }

    questions: List[Dict[str, Any]] = []
    answer_key: List[Dict[str, Any]] = []
    recommendations: List[Dict[str, Any]] = []

    for i in range(1, num_questions + 1):
        subject = subjects[i % len(subjects)]
        is_mcq = i % 2 == 0
        q: Dict[str, Any] = {
            "questionNo": i,
            "subject": subject,
            "unit": f"Unit {i % 5}",
            "chapter": [f"Chapter {i % 7}"],
            "topic": [f"Topic {i % 11}"],
            "questionType": "multiple_choice" if is_mcq else "numerical",
            "difficulty": ["easy", "medium", "hard"][i % 3],
            "questionIntent": "Application",
            "questionText": f"Rehearsal question {i}?",
            "solutionText": f"Solution for question {i}.",
        }
        if is_mcq:
            q["options"] = ["A", "B", "C", "D"]
            answer_key.append({"questionNo": i, "correctOption": "A"})
        else:
            answer_key.append({"questionNo": i, "numericalAnswer": i % 10})
        questions.append(q)

        practice_items = []
        for p in range(1, 4):
            pq: Dict[str, Any] = {
                "sourceKey": f"q{i}-practice-{p}",
                "subject": subject,
                "unit": q["unit"],
                "chapter": q["chapter"],
                "topic": q["topic"],
                "questionType": q["questionType"],
                "difficulty": q["difficulty"],
                "questionIntent": "Practice",
                "questionText": f"Practice {p} for question {i}",
                "solutionText": f"Practice solution {p} for question {i}.",
            }
            if is_mcq:
                pq["options"] = ["A", "B", "C", "D"]
                pq["correctOption"] = "A"
            else:
                pq["numericalAnswer"] = i % 10
            practice_items.append(pq)
        recommendations.append({"originalQuestionNo": i, "recommendations": practice_items})

    roster = [
        {"enrollmentNo": f"REH-{s:05d}", "name": f"Rehearsal Student {s}", "batch": "Rehearsal"}
        for s in range(num_students)
    ]

    responses = []
    for s in range(num_students):
        answers = []
        for i in range(1, num_questions + 1):
            # Alternate correct/incorrect by student parity, for both types.
            if questions[i - 1]["questionType"] == "multiple_choice":
                answers.append({"questionNo": i, "answer": "A" if s % 2 == 0 else "B"})
            else:
                key = i % 10
                answers.append({"questionNo": i, "answer": key if s % 2 == 0 else key + 1})
        responses.append({"enrollmentNo": f"REH-{s:05d}", "answers": answers})

    files = {
        "manifest.json": manifest,
        "questions.json": questions,
        "answer_key.json": answer_key,
        "students.json": roster,
        "responses.json": responses,
        "recommendations.json": recommendations,
    }
    for filename, content in files.items():
        with open(os.path.join(directory, filename), "w", encoding="utf-8") as fh:
            json.dump(content, fh, default=str)


def run_rehearsal(directory: str) -> None:
    db = db_client.get_db()

    print(f"Loading and validating bundle from {directory}...")
    try:
        bundle = validate_bundle(load_bundle(directory))
    except BundleValidationError as exc:
        for err in exc.errors:
            print(f"  - {err}")
        print(f"Bundle INVALID: {len(exc.errors)} error(s). Rehearsal aborted.")
        sys.exit(1)

    test_key = bundle.manifest.testKey
    institute_id = ObjectId(bundle.manifest.instituteId)

    # Clean up any previous rehearsal run under the same test key.
    existing_test = db["tests"].find_one({"instituteId": institute_id, "analysisDemo.sourceKey": test_key})
    if existing_test:
        db["evaluationreports"].delete_many({"testId": existing_test["_id"]})
        db["tests"].delete_one({"_id": existing_test["_id"]})

    print("Running preparation...")
    start_prepare = time.time()
    run_preparation_algorithm(bundle)
    prepare_duration = time.time() - start_prepare

    print("Running verification...")
    start_verify = time.time()
    run_verification(str(institute_id), test_key, bundle)
    verify_duration = time.time() - start_verify

    print("Publishing...")
    publish_test(institute_id, test_key)

    test_doc = db["tests"].find_one({"instituteId": institute_id, "analysisDemo.sourceKey": test_key})
    reports = list(db["evaluationreports"].find({"testId": test_doc["_id"]}))

    report_sizes = [check_bson_size(r) for r in reports]
    max_report_size = max(report_sizes) if report_sizes else 0
    avg_report_size = sum(report_sizes) / len(report_sizes) if report_sizes else 0

    print(f"Measuring report-detail read latency over {min(50, len(reports))} calls...")
    read_times = []
    sample_report = reports[0]
    for _ in range(min(50, len(reports))):
        start = time.time()
        get_report_detail(sample_report["studentId"], institute_id, sample_report["_id"])
        read_times.append(time.time() - start)
    avg_read_time = sum(read_times) / len(read_times) if read_times else 0

    print("\n================ Rehearsal Metrics ================")
    print(f"Bundle directory: {directory}")
    print(f"Number of students (evaluated): {len(reports)}")
    print(f"Number of questions: {len(bundle.questions)}")
    print(f"Validation ran as part of load above (see any errors printed there).")
    print(f"Preparation duration: {prepare_duration:.3f} seconds")
    print(f"Verification duration: {verify_duration:.3f} seconds")
    print(f"Average report document size: {avg_report_size:.0f} bytes")
    print(f"Largest report document size: {max_report_size} bytes (limit {16 * 1024 * 1024})")
    print(f"Average report-detail endpoint latency: {avg_read_time * 1000:.2f} ms")
    print("====================================================\n")


def main() -> None:
    parser = argparse.ArgumentParser(description="Staging rehearsal for the demo analysis pipeline.")
    parser.add_argument("--dir", help="Prepared bundle directory to rehearse with.")
    parser.add_argument("--generate", nargs=2, type=int, metavar=("NUM_STUDENTS", "NUM_QUESTIONS"),
                         help="Generate a synthetic bundle instead of using an existing one.")
    parser.add_argument("--i-know-this-is-staging", action="store_true", dest="force_staging",
                         help="Required, together with --database-name, to run against a non-'_test' database.")
    parser.add_argument("--database-name", dest="expected_db_name", default=None,
                         help="Must exactly match the configured database name when --i-know-this-is-staging is used.")
    args = parser.parse_args()

    _enforce_safety(args.force_staging, args.expected_db_name)

    if args.generate:
        num_students, num_questions = args.generate
        directory = args.dir or os.path.join(os.getcwd(), "_rehearsal_generated_bundle")
        print(f"Generating a synthetic bundle: {num_students} students, {num_questions} questions -> {directory}")
        generate_bundle(directory, num_students, num_questions)
    elif args.dir:
        directory = args.dir
    else:
        print("Specify --dir <bundle_dir> or --generate NUM_STUDENTS NUM_QUESTIONS.")
        sys.exit(1)

    run_rehearsal(directory)


if __name__ == "__main__":
    main()
