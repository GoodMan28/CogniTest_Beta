from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.db import db_client

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        db_client.connect()
    except Exception as e:
        print(f"Failed to connect to database: {e}")
        # Allow startup even if DB is not ready, handled in readiness check
    yield
    db_client.disconnect()

from app.api.routers.auth import router as auth_router
from app.api.routers.reports import router as reports_router

app = FastAPI(lifespan=lifespan)
app.include_router(auth_router)
app.include_router(reports_router)
@app.get("/health")
def health_check():
    db_ready = False
    if db_client.client is not None:
        try:
            db_client.client.admin.command('ping')
            db_ready = True
        except Exception:
            pass
            
    return {
        "status": "ok",
        "database_ready": db_ready
    }
