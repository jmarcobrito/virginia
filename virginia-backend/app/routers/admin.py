from fastapi import APIRouter, HTTPException
from app.database import supabase

router = APIRouter()


@router.get("/users")
def list_users():
    try:
        response = supabase.auth.admin.list_users(params={"per_page": 1000, "page": 1})
        # supabase-py pode retornar lista direta ou objeto com .users
        if isinstance(response, list):
            user_list = response
        else:
            user_list = getattr(response, "users", None) or list(response)

        users = []
        for user in user_list:
            meta = (getattr(user, "user_metadata", None) or {})
            users.append({
                "id": user.id,
                "email": user.email,
                "name": meta.get("full_name", ""),
                "role": meta.get("role", "usuario"),
                "created_at": user.created_at.isoformat() if user.created_at else None,
                "last_sign_in_at": user.last_sign_in_at.isoformat() if user.last_sign_in_at else None,
                "disabled": user.banned_until is not None,
            })
        return {"users": users}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/users")
def create_user(body: dict):
    try:
        response = supabase.auth.admin.create_user({
            "email": body["email"],
            "password": body["password"],
            "email_confirm": True,
            "user_metadata": {
                "full_name": body.get("name", ""),
                "role": body.get("role", "usuario"),
            },
        })
        user = response.user
        return {"success": True, "user": {"id": user.id, "email": user.email}}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/users/{user_id}/toggle")
def toggle_user(user_id: str, body: dict):
    try:
        if body.get("disabled"):
            supabase.auth.admin.update_user_by_id(user_id, {"ban_duration": "876600h"})
        else:
            supabase.auth.admin.update_user_by_id(user_id, {"ban_duration": "none"})
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/users/{user_id}/reset-password")
def reset_password(user_id: str, body: dict):
    try:
        supabase.auth.admin.update_user_by_id(user_id, {"password": body["password"]})
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
