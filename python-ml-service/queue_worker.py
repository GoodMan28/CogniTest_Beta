import os
import time
import datetime
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

from pdf_utils import pdf_page_to_base64_image, get_pdf_page_count
from ocr_engine import extract_questions_from_image, extract_solutions_from_image
from merger import merge_and_enrich

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/cognitest")

client = MongoClient(MONGO_URI)
db = client.get_database()
jobs_col = db['ingestionjobs']

def get_next_job():
    # Find one pending job and mark it as processing atomically
    return jobs_col.find_one_and_update(
        {"status": "PENDING"},
        {"$set": {"status": "PROCESSING", "updatedAt": datetime.datetime.utcnow()}},
        return_document=True
    )

def process_job(job):
    print(f"\n--- Starting Job for {job['pdfName']} ---")
    q_pdf_path = job['qPdfPath']
    sol_pdf_path = job['solPdfPath']
    subject = job['subject']
    institute_id = "64a1b2c3d4e5f6a7b8c9d0e1" # Valid hex string for demo
    
    try:
        q_pages = get_pdf_page_count(q_pdf_path)
        sol_pages = get_pdf_page_count(sol_pdf_path)
        # DEMO LIMIT: Process max 2 pages per PDF to keep demo under 1 minute
        MAX_PAGES = 2
        q_pages_to_process = min(MAX_PAGES, q_pages)
        sol_pages_to_process = min(MAX_PAGES, sol_pages)
        total_pages = q_pages_to_process + sol_pages_to_process
        
        # Update total pages
        jobs_col.update_one(
            {"_id": job['_id']},
            {"$set": {"totalPages": total_pages}}
        )
        
        all_questions = []
        current_chapter = "Unknown Chapter"
        processed = 0
        
        # Process Questions
        import fitz
        doc_q = fitz.open(q_pdf_path)
        for page_idx in range(q_pages_to_process):
            # Fast heuristic: Skip pages that don't look like they contain questions
            # BUT if it's a scanned PDF, get_text() will be empty, so don't skip!
            text = doc_q[page_idx].get_text("text").lower()
            if len(text.strip()) > 50 and not ("(a)" in text or "1)" in text or "(1)" in text or "a)" in text or "a." in text):
                print(f"  Skipping Qs page {page_idx + 1}/{q_pages_to_process} (Theory page heuristic)")
                processed += 1
                jobs_col.update_one({"_id": job['_id']}, {"$set": {"processedPages": processed}})
                continue

            print(f"  Extracting Qs page {page_idx + 1}/{q_pages_to_process}...")
            img_b64 = pdf_page_to_base64_image(q_pdf_path, page_idx)
            if img_b64:
                # Basic backoff/retry loop for Rate Limits
                retry_count = 0
                while retry_count < 3:
                    try:
                        extracted = extract_questions_from_image(img_b64, subject, current_chapter)
                        if extracted: all_questions.extend(extracted)
                        break
                    except Exception as e:
                        if "429" in str(e):
                            print("  Rate limit hit! Sleeping for 20s...")
                            time.sleep(20)
                            retry_count += 1
                        else:
                            print(f"  Error extracting: {e}")
                            break
                            
            processed += 1
            jobs_col.update_one({"_id": job['_id']}, {"$set": {"processedPages": processed}})
            
        # Process Solutions
        all_solutions = {}
        doc_sol = fitz.open(sol_pdf_path)
        for page_idx in range(sol_pages_to_process):
            text = doc_sol[page_idx].get_text("text").lower()
            if len(text.strip()) > 50 and not ("sol" in text or "ans" in text or "1." in text or "1)" in text):
                print(f"  Skipping Sols page {page_idx + 1}/{sol_pages_to_process} (Theory page heuristic)")
                processed += 1
                jobs_col.update_one({"_id": job['_id']}, {"$set": {"processedPages": processed}})
                continue

            print(f"  Extracting Sols page {page_idx + 1}/{sol_pages_to_process}...")
            img_b64 = pdf_page_to_base64_image(sol_pdf_path, page_idx)
            if img_b64:
                retry_count = 0
                while retry_count < 3:
                    try:
                        extracted_sols = extract_solutions_from_image(img_b64)
                        all_solutions.update(extracted_sols)
                        break
                    except Exception as e:
                        if "429" in str(e):
                            print("  Rate limit hit! Sleeping for 20s...")
                            time.sleep(20)
                            retry_count += 1
                        else:
                            print(f"  Error extracting: {e}")
                            break
                            
            processed += 1
            jobs_col.update_one({"_id": job['_id']}, {"$set": {"processedPages": processed}})
            
        # Format data to match Mongoose schema
        final_docs = merge_and_enrich(all_questions, all_solutions, institute_id)
        if final_docs:
            for doc in final_docs:
                opts = doc.get("options")
                opts_dict = None
                if isinstance(opts, dict):
                    opts_dict = opts
                elif isinstance(opts, list) and len(opts) > 0 and isinstance(opts[0], dict):
                    opts_dict = opts[0]
                
                if opts_dict:
                    doc["options"] = [str(opts_dict.get("A", "")), str(opts_dict.get("B", "")), str(opts_dict.get("C", "")), str(opts_dict.get("D", ""))]
                elif isinstance(opts, list):
                    # Ensure all elements are strings
                    doc["options"] = [str(o) for o in opts]
                
                # Ensure solutionText is a string
                if "solutionText" not in doc or not doc["solutionText"]:
                    doc["solutionText"] = "Solution not extracted."

            payload = {
                "subject": subject,
                "questions": final_docs
            }
            try:
                import requests
                resp = requests.post("http://localhost:5000/api/v1/ingestion/push", json=payload)
                if resp.status_code in [200, 201]:
                    print(f"  Successfully pushed {len(final_docs)} questions to backend.")
                else:
                    print(f"  Failed to push to backend: {resp.text}")
            except Exception as e:
                print(f"  Error pushing to backend: {e}")
            
        # Mark Complete
        jobs_col.update_one(
            {"_id": job['_id']},
            {"$set": {"status": "COMPLETED", "updatedAt": datetime.datetime.utcnow()}}
        )
        print(f"--- Job {job['pdfName']} COMPLETED ---")
        
    except Exception as e:
        print(f"Job Failed: {e}")
        print(f"Job Failed: {e}", flush=True)
        jobs_col.update_one(
            {"_id": job['_id']},
            {"$set": {"status": "FAILED", "errorMessage": str(e), "updatedAt": datetime.datetime.utcnow()}}
        )

def main():
    print("Queue Worker Started. Waiting for jobs...", flush=True)
    while True:
        job = get_next_job()
        if job:
            process_job(job)
        else:
            # Poll every 5 seconds
            time.sleep(5)

if __name__ == "__main__":
    main()
