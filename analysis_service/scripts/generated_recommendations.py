#!/usr/bin/env python3
"""
generated_recommendations.py

Shared loader that turns the AI-generated practice-question files in
data/pinnacle/generated/ into the `recommendations.json` entries the
analysis-service bundle expects (app/schemas/inputs.py: RecommendationSchema
/ PracticeQuestionSchema).

Used by generate_pinnacle27_bundle.py and generate_pinnacle28_bundle.py.
"""
import json
import re
from typing import Any, Dict, List, Tuple

# ── 1. Reading the raw files ────────────────────────────────────────────────

def strip_email_wrapper(text: str) -> str:
    """The files were saved from a Gmail preview: header lines before the
    JSON array and a 'Displaying <name>.json.' trailer after it. The JSON
    array is everything from the first '[' to the last ']' inclusive."""
    start = text.find("[")
    end = text.rfind("]")
    if start == -1 or end == -1 or end < start:
        raise ValueError("No JSON array found in generated file")
    return text[start : end + 1]


def _question_no(source_question_number: str) -> int:
    """'51' -> 51, 'Q51' -> 51, 'Physics Q1' -> 1, 'Chemistry Q26' -> 26."""
    digits = re.sub(r"\D", "", str(source_question_number))
    if not digits:
        raise ValueError(f"Cannot parse question number from {source_question_number!r}")
    return int(digits)


def load_generated_file(path: str) -> List[Tuple[int, Dict[str, Any]]]:
    """Returns [(originalQuestionNo, rawGeneratedQuestion), ...] in file order.

    Handles both shapes that exist:
      grouped: [{"sourceQuestionNumber": "51", "generatedQuestions": [{...},{...},{...}]}, ...]
      flat:    [{"sourceQuestionNumber": "26", ...question fields...}, ...]
    """
    with open(path, "r", encoding="utf-8") as fh:
        data = json.loads(strip_email_wrapper(fh.read()))
    if not isinstance(data, list) or not data:
        raise ValueError(f"{path}: expected a non-empty JSON array")

    out: List[Tuple[int, Dict[str, Any]]] = []
    if "generatedQuestions" in data[0]:
        for group in data:
            no = _question_no(group["sourceQuestionNumber"])
            for raw in group["generatedQuestions"]:
                out.append((no, raw))
    else:
        for raw in data:
            out.append((_question_no(raw["sourceQuestionNumber"]), raw))
    return out


# ── 2. Text cleanup ─────────────────────────────────────────────────────────

# Exact substring patches for sentences that only make sense next to the
# source question ("As before, ...", "From the original identity ...") or
# that contain broken LaTeX. Keyed by test key; each tuple is
# (originalQuestionNo, difficulty, field, old, new).
# Strings are Python raw strings: a single backslash here is a single
# backslash in the loaded JSON value. Each `old` must occur exactly once in
# the field value, otherwise apply_patches() raises (so a silently-missed
# patch cannot happen).
TEXT_PATCHES: Dict[str, List[Tuple[int, str, str, str, str]]] = {
    "pinnacle-27": [
        (56, "easy", "solutionText",
         r"\left(1+\frac{f(n)}{}\right)^n\to e^{\lim n\cdot f(n)}",
         r"\left(1+f(n)\right)^n\to e^{\lim n\cdot f(n)}"),
        (56, "hard", "solutionText", "As before, the limiting exponent is", "The limiting exponent is"),
        (57, "hard", "solutionText", r"By the general computation, $\lim", r"We have $\lim"),
        (61, "medium", "solutionText", "As above, using", "Using"),
        (64, "hard", "solutionText",
         r"since $\ln\sin x\to-\infty$ faster than $\frac1x\to\infty$ grows moderately... more precisely $\frac{1}{x}\ln\sin x\to-\infty$, so this term $\to0$.",
         r"since $\ln\sin x\to-\infty$ while $\frac{1}{x}\to+\infty$, so $\frac{1}{x}\ln\sin x\to-\infty$ and this term $\to0$."),
        (66, "medium", "solutionText", r"As before, $\ln", r"$\ln"),
        (71, "medium", "solutionText", "As in the general pattern, each factor", "Each factor"),
        (72, "medium", "solutionText", "As in the general argument, $a+b", "Using the sum and product of roots, $a+b"),
        (72, "hard", "solutionText", "As before, using the product-of-roots relation", "Using the product-of-roots relation"),
        (74, "medium", "solutionText", "As above, the limit equals", "By L'Hopital's rule, the limit equals"),
        (74, "hard", "solutionText", "As above, the limit equals", "By L'Hopital's rule, the limit equals"),
    ],
    "pinnacle-28": [
        (51, "medium", "solutionText", "As before, $x=a^3-3ab^2$", "Cubing $a+ib$ gives $x=a^3-3ab^2$"),
        (54, "hard", "solutionText", "As shown before, $z=i$.",
         r"Multiplying numerator and denominator by $(1+i)$ gives $z=\dfrac{(1+i)^2}{2}=i$."),
        (58, "hard", "solutionText",
         r"From the original identity, $|1-\cos\theta+i\sin\theta|=2|\sin(\theta/2)|$.",
         r"Since $(1-\cos\theta)^2+\sin^2\theta=2-2\cos\theta=4\sin^2(\theta/2)$, we have $|1-\cos\theta+i\sin\theta|=2|\sin(\theta/2)|$."),
        (60, "medium", "solutionText", "(as in the original identity)",
         r"(from rationalising with the conjugate: $\mathrm{Re}=\dfrac{1-\cos\theta}{2-2\cos\theta}=\dfrac12$)"),
        (66, "hard", "solutionText", r"From the original identity $\dfrac{1-i}{1+i}=-i$, which has argument",
         r"We have $\dfrac{1-i}{1+i}=-i$, which has argument"),
        (67, "hard", "solutionText", r"From the original identity, $\dfrac{1+i\sqrt3}{\sqrt3+i}$ has amplitude",
         r"Since $\arg(1+i\sqrt3)=\dfrac{\pi}{3}$ and $\arg(\sqrt3+i)=\dfrac{\pi}{6}$, $\dfrac{1+i\sqrt3}{\sqrt3+i}$ has amplitude"),
    ],
}


def clean_text(value: str) -> str:
    """Generic, always-safe cleanup applied to every text field."""
    if value is None:
        return value
    # The generated JSON wrote "\to" with a single backslash inside a JSON
    # string, so json.loads turned it into a TAB character followed by "o".
    # Restore the LaTeX arrow. (No legitimate text contains a literal TAB.)
    value = value.replace("\t" + "o", "\\to")
    if "\t" in value:
        raise ValueError(f"Unexpected TAB character in text: {value!r}")
    return value.strip()


def apply_patches(test_key: str, no: int, difficulty: str, rec: Dict[str, Any]) -> None:
    for (pno, pdiff, field, old, new) in TEXT_PATCHES.get(test_key, []):
        if pno != no or pdiff != difficulty:
            continue
        count = rec[field].count(old)
        if count != 1:
            raise ValueError(
                f"{test_key} Q{no} {difficulty} {field}: patch text found {count} times "
                f"(expected exactly once): {old!r}"
            )
        rec[field] = rec[field].replace(old, new)


# ── 3. Building bundle entries ──────────────────────────────────────────────

DIFFICULTY_ORDER = {"easy": 0, "medium": 1, "hard": 2}


def _squash_ws(s: str) -> str:
    return re.sub(r"\s+", "", s)


def _letter_for_correct_option(raw: Dict[str, Any], no: int) -> str:
    options = raw.get("options") or []
    correct = raw.get("correctOption")
    if correct is None:
        raise ValueError(f"Q{no}: multiple_choice generated question has no correctOption")
    # Exact match first, then whitespace-insensitive match.
    matches = [i for i, o in enumerate(options) if o == correct]
    if not matches:
        matches = [i for i, o in enumerate(options) if _squash_ws(o) == _squash_ws(correct)]
    if len(matches) != 1:
        raise ValueError(
            f"Q{no}: correctOption {correct!r} matched {len(matches)} of options {options!r}"
        )
    return chr(65 + matches[0])


def _normalize_numerical(value: Any, no: int) -> Any:
    if isinstance(value, bool) or value is None:
        raise ValueError(f"Q{no}: numerical generated question has no numericalAnswer")
    if isinstance(value, float) and value.is_integer():
        return int(value)
    if isinstance(value, (int, float)):
        return value
    raise ValueError(f"Q{no}: numericalAnswer must be a number, got {value!r}")


def build_practice_question(
    test_key: str, no: int, index: int, raw: Dict[str, Any], parent: Dict[str, Any]
) -> Dict[str, Any]:
    """
    raw:    one generated question (as loaded from the file)
    parent: the original paper question from questions.json (same questionNo)
    index:  1-based position among the parent's practice questions (after sorting)
    """
    if raw["questionType"] != parent["questionType"]:
        raise ValueError(
            f"Q{no}: generated questionType {raw['questionType']!r} != paper "
            f"questionType {parent['questionType']!r}"
        )
    if raw["difficulty"] not in DIFFICULTY_ORDER:
        raise ValueError(f"Q{no}: bad difficulty {raw['difficulty']!r}")

    rec: Dict[str, Any] = {
        "sourceKey": f"p{no}-{index}",
        # Taxonomy always inherited from the parent paper question, never
        # from the generated file (the generated tags disagree with the
        # paper for ~70 items and use 1 topic that is not in taxonomy.json).
        "subject": parent["subject"],
        "unit": parent["unit"],
        "chapter": list(parent["chapter"]),
        "topic": list(parent["topic"]),
        "questionType": raw["questionType"],
        "difficulty": raw["difficulty"],
        "questionIntent": clean_text(raw["questionIntent"]),
        "questionText": clean_text(raw["questionText"]),
        "solutionText": clean_text(raw["solutionText"]),
    }
    if raw["questionType"] == "multiple_choice":
        rec["correctOption"] = _letter_for_correct_option(raw, no)
        rec["options"] = [clean_text(o) for o in raw["options"]]
    else:
        rec["numericalAnswer"] = _normalize_numerical(raw.get("numericalAnswer"), no)

    # Optional media: only pass through when actually present (all null today).
    for field in ("imageUrl", "diagramSvg", "smilesNotation", "optionsMedia"):
        if raw.get(field):
            rec[field] = raw[field]

    apply_patches(test_key, no, raw["difficulty"], rec)
    return rec


def build_recommendations(
    test_key: str, generated_paths: List[str], questions: List[Dict[str, Any]], per_question: int = 3
) -> List[Dict[str, Any]]:
    """
    generated_paths: the generated files covering the whole paper
                     (physics + chemistry + maths for one test).
    questions:       the bundle's questions.json entries (already built).
    Returns the full recommendations.json list, sorted by originalQuestionNo,
    each with exactly `per_question` practice questions ordered easy->medium->hard.
    """
    parents = {q["questionNo"]: q for q in questions}
    by_no: Dict[int, List[Dict[str, Any]]] = {}
    for path in generated_paths:
        for no, raw in load_generated_file(path):
            by_no.setdefault(no, []).append(raw)

    missing = sorted(set(parents) - set(by_no))
    extra = sorted(set(by_no) - set(parents))
    if missing or extra:
        raise ValueError(f"{test_key}: generated questions missing for {missing}, unknown qnos {extra}")

    result = []
    for no in sorted(parents):
        raws = by_no[no]
        if len(raws) != per_question:
            raise ValueError(f"{test_key} Q{no}: expected {per_question} generated questions, got {len(raws)}")
        raws = sorted(raws, key=lambda r: DIFFICULTY_ORDER.get(r["difficulty"], 99))  # stable sort
        recs = [
            build_practice_question(test_key, no, i, raw, parents[no])
            for i, raw in enumerate(raws, start=1)
        ]
        result.append({"originalQuestionNo": no, "recommendations": recs})
    return result
