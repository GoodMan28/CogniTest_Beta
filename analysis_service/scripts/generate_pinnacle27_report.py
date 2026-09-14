#!/usr/bin/env python3
"""
generate_pinnacle27_report.py

Queries MongoDB for the prepared Pinnacle-27 evaluation reports and generates
a comprehensive batch analysis report artifact.

Usage (from repo root):
  python analysis_service/scripts/generate_pinnacle27_report.py
"""
import json
import os
import sys
import statistics
from collections import defaultdict

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from bson import ObjectId
from pymongo import MongoClient

# ── Config ──────────────────────────────────────────────────────────────────
MONGO_URI    = "mongodb+srv://anandabhineet66_db_user:1gURGSM6NFd4aLvM@cluster0.vs7flpi.mongodb.net/cognitest?retryWrites=true&w=majority"
INSTITUTE_ID = ObjectId("6aa70c122d7b8807b8d82e35")
TEST_KEY     = "pinnacle-27"
OUT_FILE     = os.path.join(os.path.dirname(__file__), "..", "..", "analysis_service", "private_data", "pinnacle27_analysis_report.md")

SUBJECT_RANGES = {
    "Physics":     list(range(1, 26)),
    "Chemistry":   list(range(26, 51)),
    "Mathematics": list(range(51, 76)),
}
MCQ_QNOS  = set(range(1,21))  | set(range(26,46)) | set(range(51,71))
NUM_QNOS  = set(range(21,26)) | set(range(46,51)) | set(range(71,76))

CORRECT_MCQ = 4;  WRONG_MCQ = -1
CORRECT_NUM = 4;  WRONG_NUM = 0

DIFFICULTY_FILE = os.path.join(os.path.dirname(__file__), "..", "..", "data", "pinnacle", "final_question_27_difficulty.json")
TAXONOMY_FILE   = os.path.join(os.path.dirname(__file__), "..", "..", "data", "pinnacle", "taxonomy_map_27.json")

# ── Load helpers ─────────────────────────────────────────────────────────────
def load_difficulty():
    with open(DIFFICULTY_FILE) as f:
        raw = json.load(f)
    return {int(k.replace("Question","").strip()): v.lower() for k, v in raw.items()}

def load_taxonomy():
    with open(TAXONOMY_FILE) as f:
        raw = json.load(f)
    return {int(k): v for k, v in raw.items()}

# ── MongoDB helpers ───────────────────────────────────────────────────────────
def get_data(db):
    test = db.tests.find_one({"instituteId": INSTITUTE_ID, "analysisDemo.testKey": TEST_KEY})
    # fallback: find by sourceKey
    if not test:
        test = db.tests.find_one({"instituteId": INSTITUTE_ID, "analysisDemo.sourceKey": TEST_KEY})
    if not test:
        # try matching by title substring
        test = db.tests.find_one({"instituteId": INSTITUTE_ID, "analysisDemo.managed": True,
                                   "title": {"$regex": "Pinnacle-27", "$options": "i"}})
    if not test:
        # last resort: any PUBLISHED managed test for this institute
        test = db.tests.find_one({"instituteId": INSTITUTE_ID, "analysisDemo.managed": True,
                                   "analysisDemo.status": "PUBLISHED"})
    if not test:
        raise RuntimeError("Could not find the pinnacle-27 test in the database.")

    test_id   = test["_id"]
    build_id  = test["analysisDemo"]["buildId"]

    reports = list(db.evaluationreports.find({
        "testId": test_id,
        "analysisDemo.managed": True,
        "analysisDemo.buildId": build_id,
    }))

    students = {str(s["_id"]): s for s in db.students.find({"instituteId": INSTITUTE_ID})}
    return test, reports, students

# ── Per-student computation ───────────────────────────────────────────────────
def extract_student_data(report, students):
    student_id  = str(report["studentId"])
    student     = students.get(student_id, {})
    name        = student.get("name", "Unknown")
    enrollment  = student.get("enrollmentNo", "?")
    snapshot    = report["analysisDemo"]["snapshot"]
    summary     = snapshot["summary"]

    score         = float(summary["score"])
    max_marks     = float(summary["maximumMarks"])
    correct       = int(summary["correct"])
    incorrect     = int(summary["incorrect"])
    skipped       = int(summary["skipped"])
    q_count       = int(summary["questionCount"])

    # Subject breakdown from snapshot
    subject_scores = {}
    for breakdown in snapshot.get("breakdowns", []):
        if breakdown["scope"] == "subject":
            for bucket in breakdown["buckets"]:
                subject_scores[bucket["key"]] = {
                    "score":       float(bucket["score"]),
                    "maximumMarks":float(bucket["maximumMarks"]),
                    "correct":     int(bucket.get("correct", 0)),
                    "incorrect":   int(bucket.get("incorrect", 0)),
                    "skipped":     int(bucket.get("skipped", 0)),
                }

    # Difficulty breakdown
    diff_scores = {}
    for breakdown in snapshot.get("breakdowns", []):
        if breakdown["scope"] == "difficulty":
            for bucket in breakdown["buckets"]:
                diff_scores[bucket["key"]] = {
                    "score":   float(bucket["score"]),
                    "correct": int(bucket.get("correct", 0)),
                    "incorrect": int(bucket.get("incorrect", 0)),
                    "skipped": int(bucket.get("skipped", 0)),
                }

    # Per-question detail from snapshot
    questions_detail = snapshot.get("questions", [])

    return {
        "name":          name,
        "enrollment":    enrollment,
        "score":         score,
        "maxMarks":      max_marks,
        "pct":           round(score / max_marks * 100, 1) if max_marks else 0,
        "correct":       correct,
        "incorrect":     incorrect,
        "skipped":       skipped,
        "qCount":        q_count,
        "subjectScores": subject_scores,
        "diffScores":    diff_scores,
        "questions":     questions_detail,
    }

# ── Markdown report builder ───────────────────────────────────────────────────
def build_report(test, reports, students, difficulty_map, taxonomy_map):
    student_data = [extract_student_data(r, students) for r in reports]
    student_data.sort(key=lambda x: -x["score"])   # rank by score desc

    scores = [s["score"] for s in student_data]
    max_possible = student_data[0]["maxMarks"] if student_data else 300

    batch_avg    = round(statistics.mean(scores), 2)
    batch_median = round(statistics.median(scores), 2)
    batch_stdev  = round(statistics.stdev(scores), 2) if len(scores) > 1 else 0
    topper_score = scores[0]
    lowest_score = scores[-1]

    lines = []
    def h(text): lines.append(f"\n{text}\n")
    def ln(text=""): lines.append(text)

    # ── Header ────────────────────────────────────────────────────────────────
    ln("# Pinnacle-27 Batch — End-to-End Analysis Report")
    ln()
    ln(f"> **Institute:** Newton Tutorial Private Limited  ")
    ln(f"> **Test:** {test.get('title', 'Pinnacle-27 Engineering Chapter Test')}  ")
    ln(f"> **Batch:** PINNACLE-27_Engg  ")
    ln(f"> **Total Students Evaluated:** {len(student_data)}  ")
    ln(f"> **Max Marks:** {int(max_possible)}  ")
    ln()

    # ── 1. Batch Summary Statistics ───────────────────────────────────────────
    h("## 1. Batch Summary Statistics")
    ln("| Metric | Value |")
    ln("|---|---|")
    ln(f"| Total Students | {len(student_data)} |")
    ln(f"| Maximum Marks  | {int(max_possible)} |")
    ln(f"| Topper Score   | **{topper_score}** |")
    ln(f"| Lowest Score   | {lowest_score} |")
    ln(f"| Class Average  | **{batch_avg}** |")
    ln(f"| Median Score   | {batch_median} |")
    ln(f"| Std Deviation  | {batch_stdev} |")
    ln(f"| Topper %       | {round(topper_score/max_possible*100,1)}% |")
    ln(f"| Class Avg %    | {round(batch_avg/max_possible*100,1)}% |")
    ln()

    # Score band distribution
    bands = {"0-30%": 0, "31-50%": 0, "51-70%": 0, "71-85%": 0, "86-100%": 0}
    for s in student_data:
        p = s["pct"]
        if p <= 30:   bands["0-30%"]   += 1
        elif p <= 50: bands["31-50%"]  += 1
        elif p <= 70: bands["51-70%"]  += 1
        elif p <= 85: bands["71-85%"]  += 1
        else:         bands["86-100%"] += 1

    ln("### Score Distribution")
    ln("| Band | Students |")
    ln("|---|---|")
    for band, count in bands.items():
        bar = "█" * count
        ln(f"| {band} | {count} {bar} |")
    ln()

    # ── 2. Individual Scorecards (Ranked) ────────────────────────────────────
    h("## 2. Student Scorecards (Ranked)")
    ln("| Rank | Name | Enrollment | Score | % | Correct | Wrong | Skipped |")
    ln("|---|---|---|---|---|---|---|---|")
    for rank, s in enumerate(student_data, 1):
        ln(f"| #{rank} | {s['name']} | {s['enrollment']} | **{s['score']}** / {int(s['maxMarks'])} "
           f"| {s['pct']}% | {s['correct']} | {s['incorrect']} | {s['skipped']} |")
    ln()

    # ── 3. Subject-Wise Analysis ─────────────────────────────────────────────
    h("## 3. Subject-Wise Analysis")

    for subject, qnos in SUBJECT_RANGES.items():
        subj_max = len(qnos) * 4  # rough max (all correct MCQ)

        h(f"### {subject} (Q{qnos[0]}–Q{qnos[-1]}, {len(qnos)} questions)")

        rows = []
        for s in student_data:
            ss = s["subjectScores"].get(subject, {})
            rows.append({
                "name":      s["name"],
                "score":     ss.get("score", 0),
                "correct":   ss.get("correct", 0),
                "incorrect": ss.get("incorrect", 0),
                "skipped":   ss.get("skipped", 0),
            })
        rows.sort(key=lambda x: -x["score"])

        subj_scores_list = [r["score"] for r in rows]
        subj_avg = round(statistics.mean(subj_scores_list), 2) if subj_scores_list else 0
        subj_top = subj_scores_list[0] if subj_scores_list else 0

        ln(f"**Class Average:** {subj_avg} | **Topper:** {subj_top}")
        ln()
        ln("| Name | Score | Correct | Wrong | Skipped |")
        ln("|---|---|---|---|---|")
        for r in rows:
            ln(f"| {r['name']} | {r['score']} | {r['correct']} | {r['incorrect']} | {r['skipped']} |")
        ln()

    # ── 4. Difficulty Analysis ────────────────────────────────────────────────
    h("## 4. Difficulty-Level Analysis")

    difficulty_agg = defaultdict(lambda: {"correct": 0, "incorrect": 0, "skipped": 0, "total_students": 0})
    for s in student_data:
        for diff_key, data in s["diffScores"].items():
            difficulty_agg[diff_key]["correct"]        += data["correct"]
            difficulty_agg[diff_key]["incorrect"]      += data["incorrect"]
            difficulty_agg[diff_key]["skipped"]        += data["skipped"]
            difficulty_agg[diff_key]["total_students"] += 1

    # Count questions per difficulty
    diff_qcount = defaultdict(int)
    for qno, level in difficulty_map.items():
        diff_qcount[level] += 1

    ln("| Difficulty | Questions | Batch Correct | Batch Wrong | Batch Skipped | Accuracy |")
    ln("|---|---|---|---|---|---|")
    for diff in ["easy", "medium", "hard"]:
        agg  = difficulty_agg.get(diff, {})
        c    = agg.get("correct", 0)
        w    = agg.get("incorrect", 0)
        sk   = agg.get("skipped", 0)
        tot  = c + w + sk
        acc  = round(c / tot * 100, 1) if tot else 0
        qc   = diff_qcount.get(diff, 0)
        ln(f"| {diff.capitalize()} | {qc} | {c} | {w} | {sk} | **{acc}%** |")
    ln()

    # ── 5. Topic-Wise Heatmap ─────────────────────────────────────────────────
    h("## 5. Topic-Wise Performance Heatmap")
    ln("*(Based on per-question status across the batch)*")
    ln()

    # Aggregate per-question status across all students
    q_agg = defaultdict(lambda: {"correct": 0, "incorrect": 0, "skipped": 0})
    for report_data in reports:
        snapshot  = report_data["analysisDemo"]["snapshot"]
        for q in snapshot.get("questions", []):
            qno    = q["questionNo"]
            status = q.get("status", "skipped")
            if status == "correct":
                q_agg[qno]["correct"]   += 1
            elif status == "incorrect":
                q_agg[qno]["incorrect"] += 1
            else:
                q_agg[qno]["skipped"]   += 1

    n_students = len(student_data)

    # Group by topic
    topic_agg = defaultdict(lambda: {"correct": 0, "incorrect": 0, "skipped": 0, "count": 0})
    for qno, tax in taxonomy_map.items():
        topic = tax["topic"][0] if tax.get("topic") else "Unknown"
        chapter = tax["chapter"][0] if tax.get("chapter") else "Unknown"
        key = f"{chapter} → {topic}"
        agg = q_agg.get(qno, {})
        topic_agg[key]["correct"]   += agg.get("correct", 0)
        topic_agg[key]["incorrect"] += agg.get("incorrect", 0)
        topic_agg[key]["skipped"]   += agg.get("skipped", 0)
        topic_agg[key]["count"]     += 1

    ln("| Topic | Questions | Accuracy | Avg Skipped |")
    ln("|---|---|---|---|")
    topic_rows = []
    for topic_key, agg in topic_agg.items():
        c   = agg["correct"]
        w   = agg["incorrect"]
        sk  = agg["skipped"]
        qc  = agg["count"]
        tot = c + w + sk
        acc = round(c / tot * 100, 1) if tot else 0
        avg_skip = round(sk / (n_students * qc) * 100, 1) if n_students * qc else 0
        topic_rows.append((topic_key, qc, acc, avg_skip))

    # Sort by accuracy ascending (weakest first)
    topic_rows.sort(key=lambda x: x[2])
    for (topic_key, qc, acc, avg_skip) in topic_rows:
        flag = " :warning:" if acc < 40 else (" :white_check_mark:" if acc >= 70 else "")
        ln(f"| {topic_key} | {qc} | **{acc}%**{flag} | {avg_skip}% skipped |")
    ln()

    # ── 6. Question-Level Analysis ────────────────────────────────────────────
    h("## 6. Question-Level Analysis")

    q_rows = []
    for qno in range(1, 76):
        agg  = q_agg.get(qno, {"correct": 0, "incorrect": 0, "skipped": 0})
        c    = agg["correct"]
        w    = agg["incorrect"]
        sk   = agg["skipped"]
        tot  = c + w + sk
        acc  = round(c / tot * 100, 1) if tot else 0
        tax  = taxonomy_map.get(qno, {})
        subj = "Ph" if qno <= 25 else ("Ch" if qno <= 50 else "Ma")
        diff = difficulty_map.get(qno, "?")[0].upper()  # E/M/H
        topic = (tax.get("topic") or ["?"])[0][:28]
        q_rows.append((qno, subj, diff, acc, c, w, sk, topic))

    h("### Most Missed Questions (Correct rate < 30%)")
    missed = sorted([r for r in q_rows if r[3] < 30], key=lambda x: x[3])
    if missed:
        ln("| Q# | Subj | Diff | Correct | Wrong | Skipped | Accuracy | Topic |")
        ln("|---|---|---|---|---|---|---|---|")
        for (qno, subj, diff, acc, c, w, sk, topic) in missed:
            ln(f"| Q{qno} | {subj} | {diff} | {c} | {w} | {sk} | **{acc}%** | {topic} |")
    else:
        ln("*No questions had correct rate below 30%.*")
    ln()

    h("### Most Skipped Questions (Skipped by > 50% of students)")
    heavily_skipped = sorted([r for r in q_rows if r[6]/n_students > 0.5], key=lambda x: -x[6])
    if heavily_skipped:
        ln("| Q# | Subj | Diff | Skipped | Skip % | Topic |")
        ln("|---|---|---|---|---|---|")
        for (qno, subj, diff, acc, c, w, sk, topic) in heavily_skipped:
            pct = round(sk / n_students * 100)
            ln(f"| Q{qno} | {subj} | {diff} | {sk}/{n_students} | **{pct}%** | {topic} |")
    else:
        ln("*No questions were skipped by more than 50% of students.*")
    ln()

    h("### Full Question Performance Table")
    ln("| Q# | Subj | Diff | Correct | Wrong | Skip | Accuracy |")
    ln("|---|---|---|---|---|---|---|")
    for (qno, subj, diff, acc, c, w, sk, topic) in q_rows:
        flag = " **" if acc >= 80 else ""
        endf = "**" if acc >= 80 else ""
        ln(f"| Q{qno} | {subj} | {diff} | {c} | {w} | {sk} | {flag}{acc}%{endf} |")
    ln()

    # ── 7. Individual Deep-Dive ───────────────────────────────────────────────
    h("## 7. Per-Student Deep-Dive")
    for rank, s in enumerate(student_data, 1):
        h(f"### #{rank} — {s['name']} ({s['enrollment']})")
        ln(f"**Score:** {s['score']} / {int(s['maxMarks'])} ({s['pct']}%)  ")
        ln(f"**Correct:** {s['correct']}  |  **Wrong:** {s['incorrect']}  |  **Skipped:** {s['skipped']}")
        ln()

        # Subject table
        ln("| Subject | Score | Correct | Wrong | Skipped |")
        ln("|---|---|---|---|---|")
        for subj in ["Physics", "Chemistry", "Mathematics"]:
            ss = s["subjectScores"].get(subj, {})
            ln(f"| {subj} | {ss.get('score',0)} | {ss.get('correct',0)} | {ss.get('incorrect',0)} | {ss.get('skipped',0)} |")
        ln()

        # Difficulty table
        ln("| Difficulty | Correct | Wrong | Skipped |")
        ln("|---|---|---|---|")
        for diff in ["easy", "medium", "hard"]:
            ds = s["diffScores"].get(diff, {})
            ln(f"| {diff.capitalize()} | {ds.get('correct',0)} | {ds.get('incorrect',0)} | {ds.get('skipped',0)} |")
        ln()

    return "\n".join(lines)


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    print("Connecting to MongoDB...")
    client = MongoClient(MONGO_URI)
    db     = client["cognitest"]

    print("Fetching report data for pinnacle-27...")
    test, reports, students = get_data(db)
    client.close()

    print(f"  Found {len(reports)} student reports.")

    print("Loading difficulty / taxonomy maps...")
    difficulty_map = load_difficulty()
    taxonomy_map   = load_taxonomy()

    print("Building analysis report...")
    md = build_report(test, reports, students, difficulty_map, taxonomy_map)

    os.makedirs(os.path.dirname(OUT_FILE), exist_ok=True)
    with open(OUT_FILE, "w", encoding="utf-8") as f:
        f.write(md)

    print(f"\nReport written to:\n  {OUT_FILE}")
    size_kb = os.path.getsize(OUT_FILE) / 1024
    print(f"  Size: {size_kb:.1f} KB")


if __name__ == "__main__":
    main()
