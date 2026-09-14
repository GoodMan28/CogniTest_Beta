#!/usr/bin/env python3
"""
generate_pinnacle27_bundle.py

Transforms raw Pinnacle-27 source data into the 6-file prepared-data bundle
format required by the analysis service pipeline.

Source files (from data/pinnacle/):
  - pinnacle_27_batch_responses.json   — 15 students × 75 responses
  - answer_key_27.json                 — official answer key
  - parsed_PINNACLE-27.json            — 75 questions with full taxonomy
  - final_question_27_difficulty.json  — difficulty per question
  - taxonomy_map_27.json               — unit/chapter/topic per question

Output (to analysis_service/private_data/pinnacle-27/):
  - manifest.json
  - questions.json
  - answer_key.json
  - students.json
  - responses.json
  - recommendations.json

Usage:
  # From repo root
  python analysis_service/scripts/generate_pinnacle27_bundle.py

Key transformations:
  - MCQ responses: "1"→"A", "2"→"B", "3"→"C", "4"→"D"
  - Numerical responses: kept as int
  - "unanswered" → null
  - Empty solutionText filled with placeholder
  - 3 real AI-generated practice questions per original question (data/pinnacle/generated/)
"""

import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from generated_recommendations import build_recommendations as build_generated_recommendations  # noqa: E402

# ─────────────────────────── CONFIG ────────────────────────────────────────

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

SOURCE_DIR = os.path.join(REPO_ROOT, "data", "pinnacle")
OUTPUT_DIR = os.path.join(REPO_ROOT, "analysis_service", "private_data", "pinnacle-28")
GENERATED_DIR = os.path.join(REPO_ROOT, "data", "pinnacle", "generated")
GENERATED_FILES = [
    os.path.join(GENERATED_DIR, "physics_q1-25_generated.json"),
    os.path.join(GENERATED_DIR, "pinnacle28_chemistry_q26-50_generated.json"),
    os.path.join(GENERATED_DIR, "pinnacle28_maths_q51-75_generated.json"),
]

INSTITUTE_ID   = "6aa70c122d7b8807b8d82e35"   # Newton Tutorial Private Limited (from DB)
TEST_KEY       = "pinnacle-28"
TITLE          = "PINNACLE-28 Periodic Test"
DATE           = "2026-09-14T04:00:00+00:00"
EXAM_TYPE      = "JEE"
BATCH_NAME     = "Pinnacle-28"
SCHEMA_VERSION = "1.0"

# Standard JEE marking scheme
MARKING = {
    "multiple_choice": {"correctMarks": 4, "incorrectPenalty": 1},
    "numerical":       {"correctMarks": 4, "incorrectPenalty": 0},
}

RECS_PER_QUESTION = 3

PLACEHOLDER_SOLUTION = "Solution not yet available. Check with your instructor."

# ─────────────────────── HELPER: MCQ digit → letter ────────────────────────

def digit_to_letter(val):
    """'1'→'A', '2'→'B', '3'→'C', '4'→'D'. Returns None for unknown."""
    mapping = {"1": "A", "2": "B", "3": "C", "4": "D"}
    return mapping.get(str(val).strip())


# ───────────────────────── LOAD SOURCE DATA ────────────────────────────────

def load_json(filename):
    path = os.path.join(SOURCE_DIR, filename)
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def load_all():
    responses_raw    = load_json("pinnacle_28_batch_responses.json")
    answer_key_raw   = load_json("answer_key_28.json")
    questions_raw    = load_json("parsed_PINNACLE-28.json")
    difficulty_raw   = load_json("final_question_28_difficulty.json")
    taxonomy_raw     = load_json("taxonomy_map_28.json")
    return responses_raw, answer_key_raw, questions_raw, difficulty_raw, taxonomy_raw


# ─────────────────────── BUILD ANSWER KEY ──────────────────────────────────

def build_answer_key(answer_key_raw, mcq_qnos):
    """
    Convert {"1": "A", "21": "45", ...} → list of AnswerKeySchema dicts.
    MCQ questions get correctOption; numerical get numericalAnswer (int).
    """
    result = []
    for qno_str, ans in answer_key_raw.items():
        qno = int(qno_str)
        if qno in mcq_qnos:
            # MCQ answer — already a letter like "A","B","C","D"
            result.append({"questionNo": qno, "correctOption": str(ans).strip().upper()})
        else:
            # Numerical answer — coerce to int
            result.append({"questionNo": qno, "numericalAnswer": int(ans)})
    result.sort(key=lambda x: x["questionNo"])
    return result


# ─────────────────────── BUILD QUESTIONS ───────────────────────────────────

def build_questions(questions_raw, difficulty_raw, answer_key_raw, mcq_qnos):
    """
    Build questions.json from parsed_PINNACLE-27.json.
    - Fill empty solutionText with placeholder
    - Strip fields not in the bundle QuestionSchema
    - Add correctOption / numericalAnswer only for questions.json (not in the
      schema, but the parsed file has them — we keep them for the answer_key
      file; here we build questions WITHOUT correctOption at the top level
      since the schema separates questions from answers)
    """
    diff_map = {}
    for label, level in difficulty_raw.items():
        # "Question 1" → 1
        qno = int(label.replace("Question", "").strip())
        diff_map[qno] = level.lower()

    result = []
    for q in questions_raw:
        qno = q["questionNo"]

        # solutionText must be non-empty for the schema
        sol = q.get("solutionText", "").strip() or PLACEHOLDER_SOLUTION

        entry = {
            "questionNo":    qno,
            "subject":       q["subject"],
            "unit":          q["unit"],
            "chapter":       q["chapter"],
            "topic":         q["topic"],
            "questionType":  q["questionType"],
            "difficulty":    diff_map.get(qno, q.get("difficulty", "medium")),
            "questionIntent": q.get("questionIntent", f"Assesses Q{qno} content."),
            "questionText":  q["questionText"],
            "solutionText":  sol,
        }

        # MCQ: include options (required for MCQ by schema)
        if q["questionType"] == "multiple_choice":
            entry["options"] = q.get("options") or q.get("optionsMarkdown") or []

        # Optional media fields (pass through if present)
        for field in ("imageUrl", "diagramSvg", "smilesNotation", "optionsMedia"):
            if q.get(field):
                entry[field] = q[field]

        result.append(entry)

    result.sort(key=lambda x: x["questionNo"])
    return result


# ─────────────────────── BUILD STUDENTS ────────────────────────────────────

def build_students(responses_raw):
    """
    Extract roster from response data.
    Format: [{enrollmentNo, name, batch}]
    """
    result = []
    for name, data in responses_raw.items():
        result.append({
            "enrollmentNo": data["enrollmentNo"],
            "name":         name,
            "batch":        data.get("batch", BATCH_NAME),
        })
    result.sort(key=lambda x: x["enrollmentNo"])
    return result


# ─────────────────────── BUILD RESPONSES ───────────────────────────────────

def build_responses(responses_raw, answer_key_raw, all_qnos, mcq_qnos):
    """
    Convert raw response format to bundle StudentResponseSchema.

    Raw MCQ answer "1","2","3","4" → letter "A","B","C","D"
    Raw numerical answer → int
    "unanswered" → null
    All 75 question numbers must be present per student.
    """
    result = []

    for name, data in responses_raw.items():
        answers = []
        for qno in sorted(all_qnos):
            raw_ans = data.get(str(qno), "unanswered")

            if raw_ans == "unanswered":
                answers.append({"questionNo": qno, "answer": None})
            elif qno in mcq_qnos:
                # Convert digit to letter
                letter = digit_to_letter(raw_ans)
                if letter is None:
                    # Already a letter (shouldn't happen, but be safe)
                    val = str(raw_ans).strip().upper() if raw_ans else None
                    answers.append({"questionNo": qno, "answer": val})
                else:
                    answers.append({"questionNo": qno, "answer": letter})
            else:
                # Numerical — parse as int; if it doesn't parse, treat as null
                try:
                    answers.append({"questionNo": qno, "answer": int(raw_ans)})
                except (ValueError, TypeError):
                    answers.append({"questionNo": qno, "answer": None})

        result.append({
            "enrollmentNo": data["enrollmentNo"],
            "answers": answers,
        })

    result.sort(key=lambda x: x["enrollmentNo"])
    return result



# ─────────────────────── BUILD MANIFEST ────────────────────────────────────

def build_manifest(num_students, num_questions):
    return {
        "schemaVersion":          SCHEMA_VERSION,
        "instituteId":            INSTITUTE_ID,
        "testKey":                TEST_KEY,
        "title":                  TITLE,
        "date":                   DATE,
        "examType":               EXAM_TYPE,
        "expectedQuestionCount":  num_questions,
        "expectedStudentCount":   num_students,
        "markingByType":          MARKING,
        "comparisonPolicy":       "batch",
        "recommendationsPerQuestion": RECS_PER_QUESTION,
    }


# ─────────────────────── WRITE BUNDLE ──────────────────────────────────────

def write_bundle(manifest, questions, answer_key, students, responses, recommendations):
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    files = {
        "manifest.json":        manifest,
        "questions.json":       questions,
        "answer_key.json":      answer_key,
        "students.json":        students,
        "responses.json":       responses,
        "recommendations.json": recommendations,
    }

    for filename, data in files.items():
        path = os.path.join(OUTPUT_DIR, filename)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        size_kb = os.path.getsize(path) / 1024
        print(f"  [OK] {filename:<28} {size_kb:6.1f} KB")


# ─────────────────────────── MAIN ──────────────────────────────────────────

def main():
    print("=" * 60)
    print("  Pinnacle-27 Bundle Generator")
    print("=" * 60)
    print(f"  Source: {SOURCE_DIR}")
    print(f"  Output: {OUTPUT_DIR}")
    print(f"  Institute: Newton Tutorial Private Limited ({INSTITUTE_ID})")
    print()

    print("Loading source data...")
    responses_raw, answer_key_raw, questions_raw, difficulty_raw, taxonomy_raw = load_all()

    # Determine question sets
    all_qnos = {q["questionNo"] for q in questions_raw}

    # MCQ: answer key value is a letter A-D
    mcq_qnos = {int(qno) for qno, ans in answer_key_raw.items()
                if str(ans).strip().upper() in ("A", "B", "C", "D")}
    numerical_qnos = all_qnos - mcq_qnos

    print(f"  Questions: {len(all_qnos)} total "
          f"({len(mcq_qnos)} MCQ, {len(numerical_qnos)} numerical)")
    print(f"  Students:  {len(responses_raw)}")
    print()

    print("Building bundle files...")
    manifest        = build_manifest(len(responses_raw), len(questions_raw))
    questions       = build_questions(questions_raw, difficulty_raw, answer_key_raw, mcq_qnos)
    answer_key      = build_answer_key(answer_key_raw, mcq_qnos)
    students        = build_students(responses_raw)
    responses       = build_responses(responses_raw, answer_key_raw, all_qnos, mcq_qnos)
    recommendations = build_generated_recommendations(
        TEST_KEY, GENERATED_FILES, questions, per_question=RECS_PER_QUESTION
    )

    print()
    print("Writing bundle...")
    write_bundle(manifest, questions, answer_key, students, responses, recommendations)

    print()
    print("=" * 60)
    print("  Bundle generated successfully!")
    print()
    print("  Next steps:")
    print("  1. Update analysis_service/.env:")
    print(f"       INSTITUTE_ID={INSTITUTE_ID}")
    print("  2. Validate:")
    print("       cd analysis_service")
    print("       python -m app.cli validate --dir private_data/pinnacle-27")
    print("  3. Prepare:")
    print("       python -m app.cli prepare --dir private_data/pinnacle-27")
    print("  4. Verify:")
    print("       python -m app.cli verify --test-key pinnacle-27 --dir private_data/pinnacle-27")
    print("  5. Publish:")
    print("       python -m app.cli publish --test-key pinnacle-27")
    print("  6. Issue claims:")
    print("       python -m app.cli issue-claims --test-key pinnacle-27 --out private_data/pinnacle-27-claims.json")
    print("=" * 60)


if __name__ == "__main__":
    main()
