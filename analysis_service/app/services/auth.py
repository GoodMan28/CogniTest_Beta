import secrets
import hashlib
import datetime
import bcrypt
import jwt
from typing import Optional, Dict, Any, Tuple
from bson import ObjectId
from app.db import db_client
from app.config import settings

def _hash_claim(code: str) -> str:
    return hashlib.sha256(code.encode()).hexdigest()

def generate_claims(institute_id: ObjectId, test_key: str) -> list[Dict[str, str]]:
    db = db_client.get_db()
    
    # Find all students associated with the test through reports
    test = db.tests.find_one({"instituteId": institute_id, "analysisDemo.sourceKey": test_key})
    if not test:
        raise ValueError("Test not found")
        
    reports = db.evaluationreports.find({"testId": test["_id"], "analysisDemo.managed": True})
    student_ids = [r["studentId"] for r in reports]
    
    if not student_ids:
        return []
        
    students = db.students.find({"_id": {"$in": student_ids}})
    
    now = datetime.datetime.now(datetime.timezone.utc)
    expiry = now + datetime.timedelta(days=7) # 7 days to claim
    
    delivery_info = []
    
    for student in students:
        if student.get("password"):
            continue # already claimed/active legacy user
            
        code = secrets.token_urlsafe(32)
        digest = _hash_claim(code)

        # Field names match backend/src/models/Student.ts's analysisDemo
        # sub-document exactly (claimDigest/claimExpiresAt/claimedAt), not
        # the previous analysisDemo.activation.{digest,expiresAt,claimed}
        # shape, which the Mongoose schema never declared (defect D10).
        db.students.update_one(
            {"_id": student["_id"]},
            {"$set": {
                "analysisDemo.claimDigest": digest,
                "analysisDemo.claimExpiresAt": expiry,
            }}
        )
        
        delivery_info.append({
            "enrollmentNo": student["enrollmentNo"],
            "name": student.get("name"),
            "claimCode": code
        })
        
    return delivery_info

def activate_student(institute_id: ObjectId, enrollment_no: str, code: str, password: str) -> bool:
    db = db_client.get_db()
    
    student = db.students.find_one({
        "instituteId": institute_id,
        "enrollmentNo": enrollment_no
    })
    
    if not student:
        raise ValueError("Student not found")
        
    if student.get("password"):
        raise ValueError("Already activated")
        
    analysis_demo = student.get("analysisDemo") or {}
    claim_digest = analysis_demo.get("claimDigest")
    if not claim_digest:
        raise ValueError("No activation claim generated")

    # "Claimed" is represented by the presence of claimedAt (a Date), not a
    # separate boolean flag — matches backend/src/models/Student.ts.
    if analysis_demo.get("claimedAt"):
        raise ValueError("Claim already used")

    now = datetime.datetime.now(datetime.timezone.utc)
    # Ensure timezone awareness matches
    expires_at = analysis_demo.get("claimExpiresAt")
    if expires_at and expires_at.replace(tzinfo=datetime.timezone.utc) < now:
        raise ValueError("Claim expired")

    digest = _hash_claim(code)
    if claim_digest != digest:
        raise ValueError("Invalid claim code")

    # Check password bounds per Phase 5 prompt
    if not (8 <= len(password) <= 72):
        raise ValueError("Password must be between 8 and 72 bytes")

    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt(12))

    res = db.students.update_one(
        {
            "_id": student["_id"],
            "password": {"$exists": False},
            "analysisDemo.claimDigest": digest,
            "analysisDemo.claimedAt": {"$exists": False},
        },
        {"$set": {
            "password": hashed.decode(),
            "analysisDemo.claimedAt": now,
        }}
    )
    
    if res.modified_count == 0:
        raise ValueError("Concurrent activation conflict")
        
    return True

def verify_password(student: dict, password: str) -> bool:
    stored_hash = student.get("password")
    if not stored_hash:
        return False
        
    try:
        # stored_hash from bcryptjs could be $2a$ which is fully compatible with python bcrypt
        return bcrypt.checkpw(password.encode(), stored_hash.encode())
    except Exception:
        return False

def create_jwt(student: dict) -> str:
    now = datetime.datetime.now(datetime.timezone.utc)
    payload = {
        "iss": settings.jwt_issuer,
        "aud": settings.jwt_audience,
        "sub": str(student["_id"]),
        "role": "student",
        "iat": int(now.timestamp()),
        "exp": int((now + datetime.timedelta(hours=24)).timestamp())
    }
    
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")

def decode_jwt(token: str) -> dict:
    try:
        return jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=["HS256"],
            issuer=settings.jwt_issuer,
            audience=settings.jwt_audience
        )
    except Exception as e:
        raise ValueError(f"Invalid token: {str(e)}")
