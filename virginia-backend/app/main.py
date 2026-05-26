from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.auth import require_user
from app.config import settings
from app.routers import documents, search, upload, activity, settings, whatsapp, cheques, payments, contracts, admin

app = FastAPI(title="Virginia API", version="3.0.0")

cors_origins = [origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins or ["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

protected = [Depends(require_user)]

app.include_router(documents.router, prefix="/api/documents", tags=["documents"], dependencies=protected)
app.include_router(search.router, prefix="/api/search", tags=["search"], dependencies=protected)
app.include_router(upload.router, prefix="/api/upload", tags=["upload"])
app.include_router(activity.router, prefix="/api/activity", tags=["activity"])
app.include_router(settings.router, prefix="/api/settings", tags=["settings"])
app.include_router(whatsapp.router,   prefix="/api/whatsapp",   tags=["whatsapp"])
app.include_router(cheques.router,    prefix="/api/cheques",    tags=["cheques"], dependencies=protected)
app.include_router(payments.router,   prefix="/api/payments",   tags=["payments"], dependencies=protected)
app.include_router(contracts.router,  prefix="/api/contracts",  tags=["contracts"], dependencies=protected)
app.include_router(admin.router,      prefix="/api/admin",      tags=["admin"])


@app.get("/api/health")
def health():
    return {"status": "ok", "version": "3.0.0"}


@app.get("/api/system/status")
def system_status():
    n8n_configured = bool(settings.n8n_url)
    return {
        "n8n": "connected" if n8n_configured else "pending",
    }
