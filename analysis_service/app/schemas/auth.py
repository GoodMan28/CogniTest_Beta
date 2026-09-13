from pydantic import BaseModel

class LoginRequest(BaseModel):
    enrollmentNo: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str


class StudentMeDTO(BaseModel):
    """
    Response shape for GET /api/v2/demo/auth/me. Deliberately an allowlist,
    never the raw student Mongo document (which may carry `password`,
    `analysisDemo.claimDigest`, etc.). Not yet wired into the router — that
    happens in remediation Phase R4, alongside the get_current_student
    institute check (defect D23) this DTO's shape depends on.
    """
    id: str
    instituteId: str
    enrollmentNo: str
    name: str
    batch: str
