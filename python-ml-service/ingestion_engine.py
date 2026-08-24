import os
import json
import fitz  # PyMuPDF
from openai import OpenAI
from typing import List, Dict

# Assuming OPENAI_API_KEY is in environment
client = OpenAI() if os.getenv('OPENAI_API_KEY') else None

def extract_text_from_pdf(pdf_path: str) -> str:
    """Extracts text from a PDF file using PyMuPDF"""
    try:
        doc = fitz.open(pdf_path)
        text = ""
        for page in doc:
            text += page.get_text() + "\n\n"
        return text
    except Exception as e:
        print(f"Error extracting PDF text: {e}")
        return ""

def generate_embeddings(text: str) -> List[float]:
    """Generates a 1536-dimensional vector using OpenAI text-embedding-3-small"""
    if not client:
        # Mock embedding for local development without API key
        return [0.1] * 1536
        
    try:
        response = client.embeddings.create(
            input=text,
            model="text-embedding-3-small"
        )
        return response.data[0].embedding
    except Exception as e:
        print(f"Embedding generation failed: {e}")
        return [0.1] * 1536

def process_pdf_to_questions(pdf_path: str, institute_id: str) -> List[Dict]:
    """
    End-to-End ingestion:
    1. Extract raw text from PDF
    2. Pass text to GPT-4o-mini to chunk into structured JSON questions (handling LaTeX)
    3. Generate Pinecone embeddings for each question's intent
    """
    raw_text = extract_text_from_pdf(pdf_path)
    if not raw_text:
        raise ValueError("Could not extract text from PDF")

    if not client:
        # Mock parsing if no API key is provided
        # We will return 1 mock question based on the text length
        mock_question = {
            "instituteId": institute_id,
            "subject": "Physics",
            "unit": "Mechanics",
            "chapter": "Kinematics",
            "topic": ["Projectile Motion"],
            "questionText": "A ball is thrown at an angle of $\theta=45^\circ$. Calculate the max height.",
            "options": {
                "A": "$20m$",
                "B": "$40m$",
                "C": "$60m$",
                "D": "$80m$"
            },
            "correctOption": "A",
            "solutionText": "Using $H = \frac{v^2 \sin^2\theta}{2g}$",
            "questionIntent": "Calculate maximum height of projectile using standard kinematic equations",
            "difficulty": "Medium",
            "embedding": [0.1] * 1536
        }
        return [mock_question]
        
    # Real LLM extraction
    try:
        system_prompt = '''You are a competitive exam parser (NEET/JEE). 
Given raw text from a PDF, extract all multiple-choice questions into a JSON array.
Use LaTeX strings for math ($...$).
Each object must exactly match this JSON schema:
{
  "subject": "Physics" | "Chemistry" | "Biology",
  "unit": string,
  "chapter": string,
  "topic": string[],
  "questionText": string,
  "options": { "A": string, "B": string, "C": string, "D": string },
  "correctOption": "A"|"B"|"C"|"D",
  "solutionText": string,
  "questionIntent": string (1-sentence summary of academic concept tested),
  "difficulty": "Easy"|"Medium"|"Hard"
}
Extract up to 5 questions to keep response time low. Return ONLY the JSON array.
'''
        
        # We truncate raw_text to avoid massive token usage for huge PDFs
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": raw_text[:8000]} 
            ],
            response_format={ "type": "json_object" }
        )
        
        result_str = response.choices[0].message.content
        parsed = json.loads(result_str)
        
        # Handle cases where LLM returns {"questions": [...]} or just [...]
        questions_list = parsed.get("questions", []) if isinstance(parsed, dict) else parsed
        
        # Enrich with embeddings and instituteId
        for q in questions_list:
            q["instituteId"] = institute_id
            q["embedding"] = generate_embeddings(q.get("questionIntent", ""))
            
        return questions_list

    except Exception as e:
        print(f"LLM Parsing failed: {e}")
        raise e
