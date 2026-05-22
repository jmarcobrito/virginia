from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import documents, search, upload, activity, settings, whatsapp, cheques, payments, contracts

app = FastAPI(title="Virginia API", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "https://virginia-swart.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(documents.router, prefix="/api/documents", tags=["documents"])
app.include_router(search.router, prefix="/api/search", tags=["search"])
app.include_router(upload.router, prefix="/api/upload", tags=["upload"])
app.include_router(activity.router, prefix="/api/activity", tags=["activity"])
app.include_router(settings.router, prefix="/api/settings", tags=["settings"])
app.include_router(whatsapp.router,   prefix="/api/whatsapp",   tags=["whatsapp"])
app.include_router(cheques.router,    prefix="/api/cheques",    tags=["cheques"])
app.include_router(payments.router,   prefix="/api/payments",   tags=["payments"])
app.include_router(contracts.router,  prefix="/api/contracts",  tags=["contracts"])


@app.get("/api/health")
def health():
    return {"status": "ok", "version": "3.0.0"}


@app.get("/api/system/status")
def system_status():
    from app.config import settings
    n8n_configured = "n8n_url" in settings.model_fields_set
    return {
        "n8n": "connected" if n8n_configured else "pending",
    }
