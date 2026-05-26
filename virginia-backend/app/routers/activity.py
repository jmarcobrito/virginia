from fastapi import APIRouter, Depends
from app.auth import require_user, require_user_or_webhook
from app.database import supabase

router = APIRouter()


@router.get("/", dependencies=[Depends(require_user)])
def get_activity(limit: int = 20):
    result = (
        supabase.table("activity_log")
        .select("*")
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return {"activities": result.data}


@router.post("/", dependencies=[Depends(require_user_or_webhook)])
def create_activity(body: dict):
    supabase.table("activity_log").insert(
        {
            "type": body.get("type", "info"),
            "text": body.get("text", ""),
            "document_id": body.get("document_id"),
            "metadata": body.get("metadata"),
        }
    ).execute()
    return {"success": True}
