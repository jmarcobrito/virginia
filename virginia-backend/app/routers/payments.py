from fastapi import APIRouter
from typing import Optional
from datetime import datetime, timezone
from app.database import supabase
from app.models.payment import PaymentCreate, PaymentStatus

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
def create_payment(body: PaymentCreate):
    data = {
        "valor": body.valor,
        "beneficiario": body.beneficiario,
        "vencimento": body.vencimento,
        "codigo_barras": body.codigo_barras,
        "status": body.status.value,
        "origin": body.origin,
        "document_id": body.document_id,
        "paid_at": datetime.now(timezone.utc).isoformat() if body.status == PaymentStatus.pago else None,
    }
    result = supabase.table("payments").insert(data).execute()
    return {"success": True, "payment": result.data[0] if result.data else data}
