import os
import json
from openai import OpenAI
from typing import List, Dict, Optional
from dotenv import load_dotenv

load_dotenv()

# Supports OpenAI, Groq, Together, etc. via standard OpenAI client
# Ensure environment variables OPENAI_BASE_URL and OPENAI_API_KEY are set
client = OpenAI(
    api_key=os.getenv("GROQ_API_KEY_NEW", "dummy"),
    base_url=os.getenv("VISION_BASE_URL", "https://api.groq.com/openai/v1") # Defaulting to Groq
)
VISION_MODEL = os.getenv("VISION_MODEL", "llama-3.2-11b-vision-preview") # Or "qwen-vl"

def extract_json_from_text(text: str) -> dict:
    try:
        import re
        import json
        # Try to find json block
        match = re.search(r'```(?:json)?\s*(.*?)\s*```', text, re.DOTALL | re.IGNORECASE)
        if match:
            try:
                return json.loads(match.group(1))
            except:
                pass
                
        # If no block or block failed to parse, try to find the first { and last }
        start_idx = text.find('{')
        end_idx = text.rfind('}')
        if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
            json_str = text[start_idx:end_idx+1]
            return json.loads(json_str)
            
        return json.loads(text)
    except Exception as e:
        print(f"DEBUG JSON PARSE ERROR: {e}", flush=True)
        return {}

def extract_questions_from_image(base64_image: str, subject: str, current_chapter: str) -> List[Dict]:
    """
    Mocked Vision API extraction for the demo to ensure fast processing and valid data.
    """
    import time
    time.sleep(2) # Simulate processing time
    
    return [
        {
            "subject": subject,
            "unit": "Mechanics",
            "chapter": current_chapter,
            "topic": ["Kinematics"],
            "questionText": "A particle moves such that its position vector $\\vec{r}(t) = \\cos(\\omega t) \\hat{i} + \\sin(\\omega t) \\hat{j}$. What is the trajectory of the particle?",
            "options": {
                "A": "Straight line",
                "B": "Circle",
                "C": "Parabola",
                "D": "Ellipse"
            },
            "correctOption": "B",
            "solutionText": "",
            "questionIntent": "Understanding parametric equations of motion",
            "difficulty": "Medium"
        },
        {
            "subject": subject,
            "unit": "Mechanics",
            "chapter": current_chapter,
            "topic": ["Dynamics"],
            "questionText": "What is the dimensional formula for force?",
            "options": {
                "A": "$[M L T^{-1}]$",
                "B": "$[M L^2 T^{-2}]$",
                "C": "$[M L T^{-2}]$",
                "D": "$[M^2 L T^{-2}]$"
            },
            "correctOption": "C",
            "solutionText": "",
            "questionIntent": "Basic dimensional analysis",
            "difficulty": "Easy"
        }
    ]

def extract_solutions_from_image(base64_image: str) -> Dict[str, str]:
    """
    Mocked Vision API solution extraction for the demo.
    """
    import time
    time.sleep(1) # Simulate processing time
    
    return {
        "1": "The trajectory is defined by x = cos(wt), y = sin(wt). Thus x^2 + y^2 = 1, which is a circle.",
        "2": "Force = mass * acceleration = [M] * [L T^-2] = [M L T^-2]."
    }
