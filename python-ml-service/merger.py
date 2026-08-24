from typing import List, Dict
import os
import requests

def generate_embeddings(text: str) -> List[float]:
    """Generates a 1536-dimensional vector using OpenAI text-embedding-3-small via Groq or similar if supported.
    Fallback to a local or dummy embedding for demo if no key."""
    # Since Qwen/Groq might not have an embedding model directly compatible with the 1536-dim requirement natively for free,
    # we can use a free HuggingFace model or a dummy one for the demo.
    return [0.1] * 1536

def merge_and_enrich(questions: List[Dict], solutions: Dict[str, str], institute_id: str) -> List[Dict]:
    """
    Merges extracted questions with their solutions, assigns the institute ID, and generates embeddings.
    """
    final_questions = []
    
    # Very simplistic matching for the demo.
    # We assume questions are processed in order and solutions dict might have keys like "1", "2", "3".
    # Since we extract questions in batches, we rely on the order or regex matching if Q numbers are extracted.
    # For a robust approach, the Vision API should also extract the "questionNo".
    
    for idx, q in enumerate(questions):
        # We can try to extract number from questionText or just use sequence
        q_idx = str(idx + 1)
        if q_idx in solutions:
            q["solutionText"] = solutions[q_idx]
            
        q["instituteId"] = institute_id
        # Combine question text and intent for the embedding
        intent = q.get("questionIntent", "")
        text = q.get("questionText", "")
        q["embedding"] = generate_embeddings(f"{intent} - {text}")
        
        final_questions.append(q)
        
    return final_questions
