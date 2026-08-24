from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import JSONResponse
import tempfile
import os
import uvicorn
from dotenv import load_dotenv

from omr_engine import extract_answers_from_omr
from ingestion_engine import process_pdf_to_questions

load_dotenv()

app = FastAPI(title="CogniTest ML Service")

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.post("/process-omr")
async def process_omr(file: UploadFile = File(...), totalQuestions: int = Form(180)):
    """
    Accepts an OMR image, processes it via OpenCV, 
    and returns { questionNo: correctOption } dictionary
    """
    try:
        # Create temp file to store image for OpenCV
        with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name
            
        choices = extract_answers_from_omr(tmp_path, total_questions=totalQuestions)
        
        # Cleanup
        os.unlink(tmp_path)
        
        return JSONResponse(content={"success": True, "choices": choices})
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})

@app.post("/ingest-pdf")
async def ingest_pdf(file: UploadFile = File(...), instituteId: str = Form(...)):
    """
    Accepts a PDF module, extracts questions via LLM, embeds them,
    and returns a structured JSON payload for MongoDB/Pinecone insertion.
    """
    try:
        if not file.filename.endswith('.pdf'):
            return JSONResponse(status_code=400, content={"success": False, "error": "Must be a PDF file"})
            
        # Create temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name
            
        questions = process_pdf_to_questions(tmp_path, instituteId)
        
        # Cleanup
        os.unlink(tmp_path)
        
        return JSONResponse(content={"success": True, "questions": questions})
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
