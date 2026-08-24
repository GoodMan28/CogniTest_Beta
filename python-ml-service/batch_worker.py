import os
import json
import time
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

from pdf_utils import pdf_page_to_base64_image, get_pdf_page_count
from ocr_engine import extract_questions_from_image, extract_solutions_from_image
from merger import merge_and_enrich

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/cognitest")
SAMPLE_MATERIAL_DIR = "C:/Users/Abhineet Anand/Desktop/CogniTest/Sample_material"

# MongoDB client
client = MongoClient(MONGO_URI)
db = client.get_database()

def map_subject(folder_name: str) -> str:
    folder_name = folder_name.lower()
    if 'phys' in folder_name: return 'Physics'
    if 'chem' in folder_name: return 'Chemistry'
    if 'botany' in folder_name or 'zoo' in folder_name or 'bio' in folder_name: return 'Biology'
    return 'Physics' # fallback

def process_pdf_pair(q_pdf_path: str, sol_pdf_path: str, subject: str, institute_id: str):
    """
    Processes a pair of Question and Solution PDFs.
    """
    print(f"Processing Questions: {q_pdf_path}")
    print(f"Processing Solutions: {sol_pdf_path}")
    
    q_pages = get_pdf_page_count(q_pdf_path)
    sol_pages = get_pdf_page_count(sol_pdf_path)
    
    all_questions = []
    
    # State tracking
    current_chapter = "Unknown Chapter"
    
    # DEMO LIMITS to stay under Groq 240K free tier limit
    MAX_PAGES = 2
    
    # Step 1: Extract Questions
    for page_idx in range(min(MAX_PAGES, q_pages)):
        print(f"  Extracting questions from page {page_idx + 1}/{q_pages}...")
        img_b64 = pdf_page_to_base64_image(q_pdf_path, page_idx)
        if not img_b64: continue
        
        # Here we would normally have a Pass 1 lightweight scanner to update `current_chapter`.
        # Since we are using Vision directly, we just pass the image.
        extracted = extract_questions_from_image(img_b64, subject, current_chapter)
        if extracted:
            all_questions.extend(extracted)
            
    # Step 2: Extract Solutions
    all_solutions = {}
    for page_idx in range(min(MAX_PAGES, sol_pages)):
        print(f"  Extracting solutions from page {page_idx + 1}/{sol_pages}...")
        img_b64 = pdf_page_to_base64_image(sol_pdf_path, page_idx)
        if not img_b64: continue
        
        extracted_sols = extract_solutions_from_image(img_b64)
        all_solutions.update(extracted_sols)
        
    # Step 3: Merge and Enrich
    print("  Merging questions with solutions and generating embeddings...")
    final_docs = merge_and_enrich(all_questions, all_solutions, institute_id)
    
    # Step 4: Insert to MongoDB
    if final_docs:
        collection_name = f"{subject.lower()}_questions"
        db[collection_name].insert_many(final_docs)
        print(f"  Successfully inserted {len(final_docs)} questions into {collection_name}")
    else:
        print("  No valid questions extracted from this pair.")

def main():
    # Hardcoded dummy institute ID for ingestion
    institute_id = "64a1b2c3d4e5f6g7h8i9j0k1"
    
    processed_pairs = 0
    MAX_PAIRS_FOR_DEMO = 1
    
    for subject_folder in os.listdir(SAMPLE_MATERIAL_DIR):
        if processed_pairs >= MAX_PAIRS_FOR_DEMO:
            break
            
        subject_path = os.path.join(SAMPLE_MATERIAL_DIR, subject_folder)
        if not os.path.isdir(subject_path): continue
        
        subject = map_subject(subject_folder)
        print(f"Scanning subject folder: {subject_folder} -> {subject}")
        
        # Find pairs
        pdfs = [f for f in os.listdir(subject_path) if f.endswith('.pdf')]
        
        # Group by base name (without " Solutions.pdf" or ".pdf")
        for pdf in pdfs:
            if processed_pairs >= MAX_PAIRS_FOR_DEMO:
                break
                
            if " Solutions.pdf" in pdf: continue
            
            base_name = pdf.replace(".pdf", "")
            sol_name = base_name + " Solutions.pdf"
            
            q_pdf_path = os.path.join(subject_path, pdf)
            sol_pdf_path = os.path.join(subject_path, sol_name)
            
            if os.path.exists(sol_pdf_path):
                process_pdf_pair(q_pdf_path, sol_pdf_path, subject, institute_id)
                processed_pairs += 1
            else:
                print(f"Warning: No solution PDF found for {pdf}")

if __name__ == "__main__":
    main()
