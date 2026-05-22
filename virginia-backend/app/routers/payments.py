from fastapi import APIRouter
from typing import Optional
from datetime import datetime, timezone
from app.database import supabase

router = APIRouter()


@router.get("/")
def list_payments(
    status: Optional[str] = None,
    origin: Optional[str] = None,
):
    query = supabase.table("payments").select("*")

    if status and status != "Todos":
        query = query.eq("status", status)

    if origin and origin != "Todos":
        query = query.eq("origin", origin)

    result = query.execute()
    payments = result.data or []

    # Ordena: vencimento ASC, nulos por último
    payments.sort(key=lambda p: (p.get("vencimento") is None, p.get("vencimento") or ""))

    return {"payments": payments, "total": len(payments)}


@router.post("/")
def create_payment(body: dict):
    status = body.get("status", "pendente")
    data = {
        "valor": body.get("valor"),
        "beneficiario": body.get("beneficiario"),
        "vencimento": body.get("vencimento") or None,
        "codigo_barras": body.get("codigo_barras") or None,
        "status": status,
        "origin": body.get("origin", "manual"),
        "document_id": body.get("document_id") or None,
        "paid_at": datetime.now(timezone.utc).isoformat() if status == "pago" else None,
    }
    result = supabase.table("payments").insert(data).execute()
    return {"success": True, "payment": result.data[0] if result.data else data}
