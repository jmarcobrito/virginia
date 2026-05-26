from fastapi import APIRouter
from app.database import supabase
from app.models.document import DocumentStatusUpdate, DocumentUpdate
from typing import Optional
from datetime import datetime, timedelta

router = APIRouter()


@router.get("/")
def list_documents(
    type: Optional[str] = None,
    status: Optional[str] = None,
    origin: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1,
    limit: int = 10,
):
    page = max(page, 1)
    limit = min(max(limit, 1), 100)
    query = supabase.table("documents").select("*").order("created_at", desc=True)

    if type and type not in ("Todos", "todos"):
        query = query.eq("type", type)
    if status and status not in ("Todos", "todos"):
        query = query.eq("status", status)
    if origin and origin not in ("Todos", "todos"):
        query = query.eq("origin", origin)

    result = query.execute()
    docs = result.data

    if search:
        search_lower = search.lower()
        docs = [
            d
            for d in docs
            if search_lower in (d.get("name") or "").lower()
            or search_lower in (d.get("summary") or "").lower()
            or any(search_lower in p.lower() for p in (d.get("parties") or []))
        ]

    total = len(docs)
    start = (page - 1) * limit
    paginated = docs[start : start + limit]

    return {
        "documents": paginated,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit,
    }


@router.get("/stats")
def get_stats():
    all_docs = (
        supabase.table("documents")
        .select("status, days_to_expire, created_at")
        .execute()
        .data
    )

    week_ago = (datetime.now() - timedelta(days=7)).isoformat()

    return {
        "total": len(all_docs),
        "pending": len(
            [
                d
                for d in all_docs
                if d["status"] in ("em_revisao", "pendente_assinatura")
            ]
        ),
        "this_week": len([d for d in all_docs if d["created_at"] >= week_ago]),
        "expiring_soon": len(
            [
                d
                for d in all_docs
                if d.get("days_to_expire") and 0 < d["days_to_expire"] <= 30
            ]
        ),
    }


@router.patch("/{document_id}/status")
def update_status(document_id: str, body: DocumentStatusUpdate):
    new_status = body.status.value
    supabase.table("documents").update({"status": new_status}).eq(
        "id", document_id
    ).execute()
    supabase.table("activity_log").insert(
        {
            "type": "status_change",
            "text": f"Status alterado para '{new_status}'",
            "document_id": document_id,
        }
    ).execute()
    return {"success": True}


@router.patch("/{document_id}")
def update_document(document_id: str, body: DocumentUpdate):
    update_data = body.model_dump(exclude_none=True)
    if "status" in update_data:
        update_data["status"] = body.status.value
    supabase.table("documents").update(update_data).eq("id", document_id).execute()
    return {"success": True}
