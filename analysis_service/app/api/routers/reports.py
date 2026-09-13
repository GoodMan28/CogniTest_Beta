from fastapi import APIRouter, Depends, HTTPException, Query, Response
from bson import ObjectId
from typing import List, Optional
from app.config import settings
from app.api.dependencies.auth import get_current_student
from app.services.reports import get_student_reports, get_report_detail, get_practice_questions, update_reflection
from app.api.schemas.reports import (
    ReportSummaryDTO, ReportDetailDTO, PracticeQuestionDTO, ReflectionItemDTO, ReflectionUpdateDTO,
)

router = APIRouter(prefix="/api/v2/demo/reports", tags=["reports"])

def _ensure_private_cache(response: Response):
    response.headers["Cache-Control"] = "private, no-store"

@router.get("", response_model=List[ReportSummaryDTO])
def list_reports(
    student: dict = Depends(get_current_student),
    skip: int = Query(0, ge=0),
    limit: int = Query(10, le=100),
    response: Response = None
):
    _ensure_private_cache(response)
    try:
        return get_student_reports(student["_id"], ObjectId(settings.institute_id), skip, limit)
    except Exception:
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/{report_id}", response_model=ReportDetailDTO)
def get_report(
    report_id: str,
    student: dict = Depends(get_current_student),
    response: Response = None
):
    _ensure_private_cache(response)
    if not ObjectId.is_valid(report_id):
        raise HTTPException(status_code=400, detail="Invalid report ID")

    try:
        return get_report_detail(student["_id"], ObjectId(settings.institute_id), ObjectId(report_id))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/{report_id}/questions/{question_no}/practice", response_model=List[PracticeQuestionDTO])
def get_practice(
    report_id: str,
    question_no: int,
    student: dict = Depends(get_current_student),
    response: Response = None
):
    _ensure_private_cache(response)
    if not ObjectId.is_valid(report_id):
        raise HTTPException(status_code=400, detail="Invalid report ID")

    try:
        return get_practice_questions(student["_id"], ObjectId(settings.institute_id), ObjectId(report_id), question_no)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Internal server error")

@router.put("/{report_id}/questions/{question_no}/reflection", response_model=Optional[ReflectionItemDTO])
def put_reflection(
    report_id: str,
    question_no: int,
    body: ReflectionUpdateDTO,
    student: dict = Depends(get_current_student),
    response: Response = None,
):
    _ensure_private_cache(response)
    if not ObjectId.is_valid(report_id):
        raise HTTPException(status_code=400, detail="Invalid report ID")

    try:
        saved = update_reflection(
            student_id=student["_id"],
            institute_id=ObjectId(settings.institute_id),
            report_id=ObjectId(report_id),
            question_no=question_no,
            text=body.text,
            build_id=body.buildId,
            content_hash=body.questionContentHash
        )
        return saved  # None (cleared) serializes as `null`, still a 200
    except ValueError as e:
        msg = str(e)
        if "Stale" in msg:
            raise HTTPException(status_code=409, detail=msg)
        else:
            raise HTTPException(status_code=404, detail=msg)
    except Exception:
        raise HTTPException(status_code=500, detail="Internal server error")
