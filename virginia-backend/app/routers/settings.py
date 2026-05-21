from fastapi import APIRouter
from app.database import supabase

router = APIRouter()


@router.get("/{key}")
def get_setting(key: str):
    result = supabase.table("settings").select("value").eq("key", key).single().execute()
    return result.data


@router.patch("/{key}")
def update_setting(key: str, body: dict):
    supabase.table("settings").update({"value": body.get("value")}).eq("key", key).execute()
    return {"success": True}
