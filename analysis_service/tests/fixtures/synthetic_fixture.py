"""
Synthetic fixture bundle used across unit and integration tests.

EXPECTED transcribes the independently-computed values from
implementation/FIXTURE_EXPECTATIONS.md (which mirrors
CogniTest_REMEDIATION_PROMPTS.md Section 1.6). Domain-layer tests (R2) and
ingestion tests (R3) assert against EXPECTED rather than hardcoding numbers
in each test module, so the numbers live in exactly one place.
"""

MANIFEST = {
    "schemaVersion": "1.0",
    "instituteId": "60c72b2f9b1e8a001c8e4a5d",
    "testKey": "demo-test",
    "title": "Phase 1 Test",
    "date": "2026-09-12T00:00:00+00:00",
    "examType": "Demo",
    "expectedQuestionCount": 4,
    "expectedStudentCount": 4,
    "markingByType": {
        "multiple_choice": {"correctMarks": 4, "incorrectPenalty": 1},
        "numerical": {"correctMarks": 4, "incorrectPenalty": 1}
    },
    "comparisonPolicy": "default",
    "recommendationsPerQuestion": 3
}

QUESTIONS = [
    {
        "questionNo": 1,
        "subject": "Physics",
        "unit": "Mechanics",
        "chapter": ["Kinematics"],
        "topic": ["1D Motion"],
        "questionType": "multiple_choice",
        "difficulty": "easy",
        "questionIntent": "Basic recall",
        "questionText": "What is speed?",
        "options": ["A", "B", "C", "D"],
        "solutionText": "Distance over time"
    },
    {
        "questionNo": 2,
        "subject": "Mathematics",
        "unit": "Algebra",
        "chapter": ["Equations"],
        "topic": ["Linear"],
        "questionType": "numerical",
        "difficulty": "medium",
        "questionIntent": "Solve for x",
        "questionText": "Solve x = 0",
        "solutionText": "x is 0"
    },
    {
        "questionNo": 3,
        "subject": "Chemistry",
        "unit": "Physical",
        "chapter": ["Thermodynamics"],
        "topic": ["Heat"],
        "questionType": "multiple_choice",
        "difficulty": "hard",
        "questionIntent": "Application",
        "questionText": "Define enthalpy",
        "options": ["A", "B", "C", "D"],
        "solutionText": "H = U + PV"
    },
    {
        "questionNo": 4,
        "subject": "Mathematics",
        "unit": "Calculus",
        "chapter": ["Derivatives"],
        "topic": ["Power rule"],
        "questionType": "numerical",
        "difficulty": "hard",
        "questionIntent": "Find slope",
        "questionText": "Derivative of 2x",
        "solutionText": "2"
    }
]

ANSWER_KEY = [
    {"questionNo": 1, "correctOption": "B"},
    {"questionNo": 2, "numericalAnswer": 0},
    {"questionNo": 3, "correctOption": "A"},
    {"questionNo": 4, "numericalAnswer": -2},
]

# The answer key after the R6 answer-key-correction rehearsal (Q1: B -> D).
ANSWER_KEY_CORRECTED = [
    {"questionNo": 1, "correctOption": "D"},
    {"questionNo": 2, "numericalAnswer": 0},
    {"questionNo": 3, "correctOption": "A"},
    {"questionNo": 4, "numericalAnswer": -2},
]

# Roster (students.json). A and C deliberately share a display name to prove
# identity is resolved by enrollmentNo, never by name.
STUDENTS = [
    {"enrollmentNo": "A", "name": "Rahul Sharma", "batch": "Alpha"},
    {"enrollmentNo": "B", "name": "Priya Nair", "batch": "Alpha"},
    {"enrollmentNo": "C", "name": "Rahul Sharma", "batch": "Alpha"},
    {"enrollmentNo": "D", "name": "Arjun Mehta", "batch": "Beta"},
]

RESPONSES = [
    {
        "enrollmentNo": "A",
        "answers": [
            {"questionNo": 1, "answer": "B"},
            {"questionNo": 2, "answer": "0"},
            {"questionNo": 3, "answer": None},
            {"questionNo": 4, "answer": "-2"}
        ]
    },
    {
        "enrollmentNo": "B",
        "answers": [
            {"questionNo": 1, "answer": "B"},
            {"questionNo": 2, "answer": None},
            {"questionNo": 3, "answer": "A"},
            {"questionNo": 4, "answer": "-2"}
        ]
    },
    {
        "enrollmentNo": "C",
        "answers": [
            {"questionNo": 1, "answer": "D"},
            {"questionNo": 2, "answer": "0"},
            {"questionNo": 3, "answer": "B"},
            {"questionNo": 4, "answer": None}
        ]
    },
    {
        "enrollmentNo": "D",
        "answers": [
            {"questionNo": 1, "answer": "B"},
            {"questionNo": 2, "answer": "0"},
            {"questionNo": 3, "answer": "A"},
            {"questionNo": 4, "answer": "-2"}
        ]
    }
]

# recommendations.json: exactly manifest.recommendationsPerQuestion (3)
# practice questions per original question, each with its own sourceKey,
# full metadata, a valid answer, and an authored solution.
RECOMMENDATIONS = [
    {
        "originalQuestionNo": 1,
        "recommendations": [
            {
                "sourceKey": "p1",
                "subject": "Physics",
                "unit": "Mechanics",
                "chapter": ["Kinematics"],
                "topic": ["1D Motion"],
                "questionType": "multiple_choice",
                "difficulty": "easy",
                "questionIntent": "Recall the definition of average speed",
                "questionText": "Average speed is defined as total distance divided by what?",
                "options": ["Total time", "Displacement", "Acceleration", "Velocity"],
                "correctOption": "A",
                "solutionText": "Average speed = total distance / total time taken."
            },
            {
                "sourceKey": "p2",
                "subject": "Physics",
                "unit": "Mechanics",
                "chapter": ["Kinematics"],
                "topic": ["1D Motion"],
                "questionType": "multiple_choice",
                "difficulty": "easy",
                "questionIntent": "Distinguish speed from velocity",
                "questionText": "Which quantity is a vector: speed or velocity?",
                "options": ["Speed", "Velocity", "Both", "Neither"],
                "correctOption": "B",
                "solutionText": "Velocity has both magnitude and direction; speed has magnitude only."
            },
            {
                "sourceKey": "p3",
                "subject": "Physics",
                "unit": "Mechanics",
                "chapter": ["Kinematics"],
                "topic": ["1D Motion"],
                "questionType": "multiple_choice",
                "difficulty": "medium",
                "questionIntent": "Apply the speed formula",
                "questionText": "A car travels 100 m in 20 s. What is its average speed?",
                "options": ["2 m/s", "5 m/s", "20 m/s", "100 m/s"],
                "correctOption": "B",
                "solutionText": "Speed = distance / time = 100 m / 20 s = 5 m/s."
            }
        ]
    },
    {
        "originalQuestionNo": 2,
        "recommendations": [
            {
                "sourceKey": "m1",
                "subject": "Mathematics",
                "unit": "Algebra",
                "chapter": ["Equations"],
                "topic": ["Linear"],
                "questionType": "numerical",
                "difficulty": "easy",
                "questionIntent": "Solve a one-step linear equation",
                "questionText": "Solve for x: x + 5 = 5",
                "numericalAnswer": 0,
                "solutionText": "Subtract 5 from both sides: x = 0."
            },
            {
                "sourceKey": "m2",
                "subject": "Mathematics",
                "unit": "Algebra",
                "chapter": ["Equations"],
                "topic": ["Linear"],
                "questionType": "numerical",
                "difficulty": "medium",
                "questionIntent": "Solve a linear equation with a coefficient",
                "questionText": "Solve for x: 3x = 0",
                "numericalAnswer": 0,
                "solutionText": "Divide both sides by 3: x = 0."
            },
            {
                "sourceKey": "m3",
                "subject": "Mathematics",
                "unit": "Algebra",
                "chapter": ["Equations"],
                "topic": ["Linear"],
                "questionType": "numerical",
                "difficulty": "medium",
                "questionIntent": "Recognize the additive identity as a root",
                "questionText": "Solve for x: 7x - 0 = 0",
                "numericalAnswer": 0,
                "solutionText": "x = 0 satisfies the equation."
            }
        ]
    },
    {
        "originalQuestionNo": 3,
        "recommendations": [
            {
                "sourceKey": "c1",
                "subject": "Chemistry",
                "unit": "Physical",
                "chapter": ["Thermodynamics"],
                "topic": ["Heat"],
                "questionType": "multiple_choice",
                "difficulty": "medium",
                "questionIntent": "Recall the definition of enthalpy",
                "questionText": "Enthalpy (H) is defined as U + PV, where U is what?",
                "options": ["Internal energy", "Entropy", "Free energy", "Heat capacity"],
                "correctOption": "A",
                "solutionText": "H = U + PV, where U is the internal energy of the system."
            },
            {
                "sourceKey": "c2",
                "subject": "Chemistry",
                "unit": "Physical",
                "chapter": ["Thermodynamics"],
                "topic": ["Heat"],
                "questionType": "multiple_choice",
                "difficulty": "hard",
                "questionIntent": "Identify when enthalpy change equals heat",
                "questionText": "At constant pressure, the heat absorbed by a system equals its change in what?",
                "options": ["Volume", "Enthalpy", "Temperature", "Entropy"],
                "correctOption": "B",
                "solutionText": "At constant pressure, q = delta-H."
            },
            {
                "sourceKey": "c3",
                "subject": "Chemistry",
                "unit": "Physical",
                "chapter": ["Thermodynamics"],
                "topic": ["Heat"],
                "questionType": "multiple_choice",
                "difficulty": "hard",
                "questionIntent": "Classify an exothermic enthalpy change",
                "questionText": "A negative delta-H for a reaction indicates it is:",
                "options": ["Endothermic", "Exothermic", "Non-spontaneous", "At equilibrium"],
                "correctOption": "B",
                "solutionText": "A negative delta-H means the system releases heat: exothermic."
            }
        ]
    },
    {
        "originalQuestionNo": 4,
        "recommendations": [
            {
                "sourceKey": "m4",
                "subject": "Mathematics",
                "unit": "Calculus",
                "chapter": ["Derivatives"],
                "topic": ["Power rule"],
                "questionType": "numerical",
                "difficulty": "easy",
                "questionIntent": "Apply the power rule to a linear term",
                "questionText": "Find d/dx of 5x",
                "numericalAnswer": 5,
                "solutionText": "The derivative of 5x with respect to x is 5."
            },
            {
                "sourceKey": "m5",
                "subject": "Mathematics",
                "unit": "Calculus",
                "chapter": ["Derivatives"],
                "topic": ["Power rule"],
                "questionType": "numerical",
                "difficulty": "medium",
                "questionIntent": "Apply the power rule to a negative coefficient",
                "questionText": "Find d/dx of -3x",
                "numericalAnswer": -3,
                "solutionText": "The derivative of -3x with respect to x is -3."
            },
            {
                "sourceKey": "m6",
                "subject": "Mathematics",
                "unit": "Calculus",
                "chapter": ["Derivatives"],
                "topic": ["Power rule"],
                "questionType": "numerical",
                "difficulty": "hard",
                "questionIntent": "Apply the power rule and evaluate at a point",
                "questionText": "Find d/dx of x^2 at x = 1, using 2x as the derivative",
                "numericalAnswer": 2,
                "solutionText": "d/dx(x^2) = 2x; at x = 1, this evaluates to 2."
            }
        ]
    }
]

# Independently-computed expected values (implementation/FIXTURE_EXPECTATIONS.md).
# All decimal-shaped values are pre-formatted strings (two places,
# ROUND_HALF_UP) to match what app/domain/analytics.format_decimal produces.
EXPECTED = {
    "totals": {"A": 12, "B": 12, "C": 2, "D": 16},
    "maximumMarks": "16.00",

    "student_A": {
        "summary": {
            "questionCount": 4, "correct": 3, "incorrect": 0, "skipped": 1,
            "attempted": 3, "score": "12.00", "maximumMarks": "16.00",
            "accuracyPct": "100.00", "coveragePct": "75.00",
        },
        "subject_buckets": {
            "Physics": {"score": "4.00", "maximumMarks": "4.00", "accuracyPct": "100.00", "coveragePct": "100.00"},
            "Mathematics": {"score": "8.00", "maximumMarks": "8.00", "accuracyPct": "100.00", "coveragePct": "100.00"},
            "Chemistry": {"score": "0.00", "maximumMarks": "4.00", "accuracyPct": None, "coveragePct": "0.00"},
        },
        "difficulty_buckets": {
            "easy": {"score": "4.00", "maximumMarks": "4.00", "accuracyPct": "100.00", "coveragePct": "100.00"},
            "medium": {"score": "4.00", "maximumMarks": "4.00", "accuracyPct": "100.00", "coveragePct": "100.00"},
            "hard": {"score": "4.00", "maximumMarks": "8.00", "accuracyPct": "100.00", "coveragePct": "50.00"},
        },
        "questionType_buckets": {
            "multiple_choice": {"score": "4.00", "maximumMarks": "8.00", "accuracyPct": "100.00", "coveragePct": "50.00"},
            "numerical": {"score": "8.00", "maximumMarks": "8.00", "accuracyPct": "100.00", "coveragePct": "100.00"},
        },
    },

    "student_C": {
        "summary": {
            "correct": 1, "incorrect": 2, "skipped": 1,
            "score": "2.00", "accuracyPct": "33.33", "coveragePct": "75.00",
        },
        "revision_list": [
            {"rank": 1, "subject": "Chemistry", "topic": "Heat", "marksLost": "5.00", "reason": "inaccurate", "questionNos": [3]},
            {"rank": 2, "subject": "Physics", "topic": "1D Motion", "marksLost": "5.00", "reason": "inaccurate", "questionNos": [1]},
            {"rank": 3, "subject": "Mathematics", "topic": "Power rule", "marksLost": "4.00", "reason": "skipped", "questionNos": [4]},
        ],
    },

    "cohort_alpha": {
        "cohortSize": 3, "available": True, "unavailableReason": None,
        "topperCount": 2, "topperLabel": "Joint toppers' average",
        "categories": {
            "overall": {"classAverage": "8.67", "topperScore": "12.00"},
            "Physics": {"classAverage": "2.33", "topperScore": "4.00"},
            "Chemistry": {"classAverage": "1.00", "topperScore": "2.00"},
            "Mathematics": {"classAverage": "5.33", "topperScore": "6.00"},
            "easy": {"classAverage": "2.33", "topperScore": "4.00"},
            "medium": {"classAverage": "2.67", "topperScore": "2.00"},
            "hard": {"classAverage": "3.67", "topperScore": "6.00"},
            "multiple_choice": {"classAverage": "3.33", "topperScore": "6.00"},
            "numerical": {"classAverage": "5.33", "topperScore": "6.00"},
        },
    },

    "cohort_beta": {
        "cohortSize": 1, "available": False,
        "unavailableReason": "Comparison unavailable: only one evaluated student.",
        "topperCount": 1,
        "categories": {},
    },

    # After correcting Q1's key from "B" to "D" (ANSWER_KEY_CORRECTED) and
    # rebuilding the whole cohort.
    "after_key_correction": {
        "totals": {"A": 7, "B": 7, "C": 7, "D": 11},
        "alpha_overall": {"classAverage": "7.00", "topperScore": "7.00", "topperCount": 3,
                           "topperLabel": "Joint toppers' average"},
    },
}
