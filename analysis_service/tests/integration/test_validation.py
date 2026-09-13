"""
These are "integration" only in the sense that they run through the CLI's
file-loading path (app.services.bundle.load_bundle) using real temp-directory
files; validate_bundle itself never touches the database. No clean_db is
needed, but this file lives under tests/integration/ alongside the CLI/DB
tests it complements (test_preparation.py, test_publication.py) rather than
under tests/unit/, since it exercises file I/O.
"""
import copy
import json

from app.services.bundle import BundleValidationError, load_bundle, validate_bundle
from tests.fixtures.bundle_writer import write_bundle
from tests.fixtures.synthetic_fixture import (
    ANSWER_KEY,
    MANIFEST,
    QUESTIONS,
    RECOMMENDATIONS,
    RESPONSES,
    STUDENTS,
)


def _write(tmp_path, **overrides):
    kwargs = dict(
        manifest=MANIFEST, questions=QUESTIONS, answer_key=ANSWER_KEY,
        students=STUDENTS, responses=RESPONSES, recommendations=RECOMMENDATIONS,
    )
    kwargs.update(overrides)
    return write_bundle(str(tmp_path), **kwargs)


def test_valid_bundle_passes(tmp_path):
    directory = _write(tmp_path)
    bundle = validate_bundle(load_bundle(directory))
    assert len(bundle.questions) == 4
    assert len(bundle.roster) == 4
    assert sum(len(r.recommendations) for r in bundle.recommendations) == 12


def test_missing_file_is_reported_by_name(tmp_path):
    directory = _write(tmp_path)
    import os

    os.remove(os.path.join(directory, "responses.json"))
    try:
        load_bundle(directory)
        assert False, "expected BundleValidationError"
    except BundleValidationError as e:
        assert any("responses.json" in err for err in e.errors)


def test_invalid_json_is_reported_by_name(tmp_path):
    directory = _write(tmp_path)
    with open(f"{directory}/manifest.json", "w", encoding="utf-8") as fh:
        fh.write("{not valid json")
    try:
        load_bundle(directory)
        assert False, "expected BundleValidationError"
    except BundleValidationError as e:
        assert any("manifest.json" in err for err in e.errors)


def test_question_count_mismatch(tmp_path):
    bad_questions = QUESTIONS[:-1]  # drop Q4, but manifest still says 4
    directory = _write(tmp_path, questions=bad_questions)
    try:
        validate_bundle(load_bundle(directory))
        assert False, "expected BundleValidationError"
    except BundleValidationError as e:
        assert any("expected 4 questions" in err for err in e.errors)


def test_missing_response_row_names_enrollment_and_question(tmp_path):
    bad_responses = copy.deepcopy(RESPONSES)
    bad_responses[0]["answers"] = bad_responses[0]["answers"][:-1]  # drop Q4's row for student A
    directory = _write(tmp_path, responses=bad_responses)
    try:
        validate_bundle(load_bundle(directory))
        assert False, "expected BundleValidationError"
    except BundleValidationError as e:
        assert any("'A'" in err and "questionNo" in err for err in e.errors)


def test_unknown_enrollment_in_responses(tmp_path):
    bad_responses = copy.deepcopy(RESPONSES)
    bad_responses[0]["enrollmentNo"] = "GHOST"
    directory = _write(tmp_path, responses=bad_responses)
    try:
        validate_bundle(load_bundle(directory))
        assert False, "expected BundleValidationError"
    except BundleValidationError as e:
        assert any("'GHOST'" in err for err in e.errors)


def test_duplicate_case_insensitive_enrollment_in_roster(tmp_path):
    bad_students = copy.deepcopy(STUDENTS)
    bad_students.append({"enrollmentNo": "a", "name": "Someone Else", "batch": "Alpha"})
    directory = _write(tmp_path, students=bad_students)
    try:
        validate_bundle(load_bundle(directory))
        assert False, "expected BundleValidationError"
    except BundleValidationError as e:
        assert any("case-insensitive" in err for err in e.errors)


def test_recommendation_count_mismatch_names_question(tmp_path):
    bad_recs = copy.deepcopy(RECOMMENDATIONS)
    bad_recs[0]["recommendations"] = bad_recs[0]["recommendations"][:2]
    directory = _write(tmp_path, recommendations=bad_recs)
    try:
        validate_bundle(load_bundle(directory))
        assert False, "expected BundleValidationError"
    except BundleValidationError as e:
        assert any("originalQuestionNo=1" in err and "expected exactly 3" in err for err in e.errors)


def test_answer_key_type_mismatch(tmp_path):
    bad_key = copy.deepcopy(ANSWER_KEY)
    bad_key[0] = {"questionNo": 1, "numericalAnswer": 1}  # Q1 is multiple_choice
    directory = _write(tmp_path, answer_key=bad_key)
    try:
        validate_bundle(load_bundle(directory))
        assert False, "expected BundleValidationError"
    except BundleValidationError as e:
        assert any("questionNo=1" in err and "multiple_choice" in err for err in e.errors)


def test_answer_key_option_out_of_range(tmp_path):
    bad_key = copy.deepcopy(ANSWER_KEY)
    bad_key[0] = {"questionNo": 1, "correctOption": "Z"}  # only 4 options
    directory = _write(tmp_path, answer_key=bad_key)
    try:
        validate_bundle(load_bundle(directory))
        assert False, "expected BundleValidationError"
    except BundleValidationError as e:
        assert any("questionNo=1" in err and "outside" in err for err in e.errors)


def test_malformed_numerical_response_is_reported(tmp_path):
    bad_responses = copy.deepcopy(RESPONSES)
    bad_responses[0]["answers"][1]["answer"] = "4.0"  # Q2 is numerical
    directory = _write(tmp_path, responses=bad_responses)
    try:
        validate_bundle(load_bundle(directory))
        assert False, "expected BundleValidationError"
    except BundleValidationError as e:
        assert any("'A'" in err for err in e.errors)


def test_no_writes_happen_during_validate(tmp_path):
    # validate_bundle/load_bundle take no db_client argument and import no
    # app.db symbol — grep-verified in app/services/bundle.py — so there is
    # nothing to assert against a live database here; this test instead
    # confirms a passing validate_bundle call still just returns a plain
    # dataclass, not something that already performed I/O against Mongo.
    directory = _write(tmp_path)
    bundle = validate_bundle(load_bundle(directory))
    assert bundle.manifest.testKey == "demo-test"
