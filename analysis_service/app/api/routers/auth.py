from fastapi import APIRouter, Depends, HTTPException, Response, Request
from pydantic import BaseModel
from bson import ObjectId
from app.config import settings
from app.schemas.auth import StudentMeDTO
from app.services.auth import activate_student, verify_password, create_jwt
from app.api.dependencies.auth import verify_origin, get_current_student, get_client_ip
from app.services.rate_limiter import check_rate_limit

router = APIRouter(prefix="/api/v2/demo/auth", tags=["auth"])

class ActivateRequest(BaseModel):
    enrollmentNo: str
    code: str
    password: str

class LoginRequest(BaseModel):
    enrollmentNo: str
    password: str

def check_login_rate_limit(request: Request):
    ip = get_client_ip(request)
    key = f"rl:auth:{ip}"
    if not check_rate_limit(key, limit=10, window_sec=60):
        raise HTTPException(status_code=429, detail="Too many attempts")

@router.post("/activate", dependencies=[Depends(verify_origin), Depends(check_login_rate_limit)])
def activate(req: ActivateRequest):
    try:
        activate_student(ObjectId(settings.institute_id), req.enrollmentNo, req.code, req.password)
        return {"status": "ok"}
    except ValueError as e:
        # Avoid leaking too much info, but keep actionable errors
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/login", dependencies=[Depends(verify_origin), Depends(check_login_rate_limit)])
def login(req: LoginRequest, response: Response):
    from app.db import db_client
    db = db_client.get_db()
    
    student = db.students.find_one({
        "instituteId": ObjectId(settings.institute_id),
        "enrollmentNo": req.enrollmentNo
    })
    
    if not student or not verify_password(student, req.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
        
    token = create_jwt(student)
    
    response.set_cookie(
        key="demo_token",
        value=token,
        httponly=True,
        samesite="lax",
        secure=settings.cookie_secure,
        max_age=86400,
        path="/api/v2/demo"
    )

    return {"status": "ok"}

@router.post("/logout", dependencies=[Depends(verify_origin)])
def logout(response: Response):
    response.delete_cookie(
        key="demo_token",
        path="/api/v2/demo",
        httponly=True,
        samesite="lax",
        secure=settings.cookie_secure
    )
    return {"status": "ok"}

@router.get("/me", response_model=StudentMeDTO)
def me(student: dict = Depends(get_current_student), response: Response = None):
    if response:
        response.headers["Cache-Control"] = "private, no-store"

    return StudentMeDTO(
        id=str(student["_id"]),
        instituteId=str(student["instituteId"]),
        enrollmentNo=student["enrollmentNo"],
        name=student.get("name", ""),
        batch=student.get("batch", ""),
    )
