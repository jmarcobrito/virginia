from fastapi import APIRouter, Depends
from app.auth import require_user, require_user_or_webhook
from app.database import supabase

router = APIRouter()


@router.get("/authorized-sources", dependencies=[Depends(require_user_or_webhook)])
def get_authorized_sources():
    numbers_row = supabase.table("settings").select("value").eq("key", "authorized_numbers").execute()
    groups_row  = supabase.table("settings").select("value").eq("key", "authorized_groups").execute()

    raw_numbers = numbers_row.data[0]["value"] if numbers_row.data else ""
    raw_groups  = groups_row.data[0]["value"]  if groups_row.data  else ""

    numbers = [n.strip() for n in raw_numbers.split(",") if n.strip()] if raw_numbers else []
    groups  = [g.strip() for g in raw_groups.split(",")  if g.strip()] if raw_groups  else []
    return {"numbers": numbers, "groups": groups}


@router.post("/authorized-sources", dependencies=[Depends(require_user)])
def update_authorized_sources(body: dict):
    numbers_val = ",".join(body.get("numbers", []))
    groups_val  = ",".join(body.get("groups",  []))

    for key, val in [("authorized_numbers", numbers_val), ("authorized_groups", groups_val)]:
        existing = supabase.table("settings").select("key").eq("key", key).execute()
        if existing.data:
            supabase.table("settings").update({"value": val}).eq("key", key).execute()
        else:
            supabase.table("settings").insert({"key": key, "value": val}).execute()
    return {"success": True}


@router.get("/{key}", dependencies=[Depends(require_user_or_webhook)])
def get_setting(key: str):
    result = supabase.table("settings").select("value").eq("key", key).execute()
    if not result.data:
        return {"value": False}
    return result.data[0]


@router.patch("/{key}", dependencies=[Depends(require_user)])
def update_setting(key: str, body: dict):
    supabase.table("settings").update({"value": body.get("value")}).eq("key", key).execute()
    return {"success": True}
