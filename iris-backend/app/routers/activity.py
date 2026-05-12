from fastapi import APIRouter
from app.database import supabase

router = APIRouter()


@router.get("/")
def get_activity(limit: int = 20):
    result = (
        supabase.table("activity_log")
        .select("*")
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return {"activities": result.data}
