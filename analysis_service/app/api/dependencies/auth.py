from fastapi import Request, HTTPException, Cookie, Depends
from bson import ObjectId
from app.db import db_client
from app.config import settings
from app.services.auth import decode_jwt

def verify_origin(request: Request):
    origin = request.headers.get("origin")
    if not origin:
        raise HTTPException(status_code=403, detail="Missing Origin header")

    if origin not in settings.allowed_origins:
        raise HTTPException(status_code=403, detail="Origin not allowed")
    return origin

def get_client_ip(request: Request) -> str:
    """
    Resolve the caller's IP for rate limiting.

    By default (settings.trusted_proxy_count == 0) this trusts only the
    directly-connected socket peer (`request.client.host`) and ignores
    `X-Forwarded-For` entirely, because that header is fully attacker
    controlled unless a reverse proxy is known to overwrite (not append to)
    it for untrusted clients.

    When this service is deployed behind `settings.trusted_proxy_count`
    verified reverse-proxy hops that each append the real client IP to
    `X-Forwarded-For`, the entry that many hops from the right end of that
    header is the real client IP; anything closer to the left may have been
    forged by the client itself. If the header is missing or has fewer
    entries than expected, fall back to the socket peer rather than raising,
    so a misconfigured header never disables rate limiting outright.
    """
    if settings.trusted_proxy_count > 0:
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            hops = [hop.strip() for hop in forwarded_for.split(",") if hop.strip()]
            index_from_right = settings.trusted_proxy_count
            if len(hops) >= index_from_right:
                return hops[-index_from_right]

    return request.client.host if request.client else "unknown"

def get_current_student(demo_token: str = Cookie(None)):
    if not demo_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
        
    try:
        payload = decode_jwt(demo_token)
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))
        
    student_id = payload.get("sub")
    if not student_id:
        raise HTTPException(status_code=401, detail="Invalid token subject")

    db = db_client.get_db()
    # Institute membership is enforced here (defect D23), not left to each
    # caller to remember — a token whose subject belongs to a different
    # institute must fail authentication the same way a deleted student
    # does, not silently succeed.
    student = db.students.find_one(
        {"_id": ObjectId(student_id), "instituteId": ObjectId(settings.institute_id)},
        {"_id": 1, "instituteId": 1, "enrollmentNo": 1, "name": 1, "batch": 1},
    )

    if not student:
        raise HTTPException(status_code=401, detail="Student not found")

    return student
