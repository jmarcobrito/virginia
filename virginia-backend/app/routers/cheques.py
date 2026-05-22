from fastapi import APIRouter
from typing import Optional
from datetime import datetime, timedelta
from app.database import supabase

router = APIRouter()


@router.get("/")
def list_cheques(
    status: Optional[str] = None,
    periodo: Optional[str] = None,
):
    query = supabase.table("cheques").select("*")

    if status and status != "Todos":
        query = query.eq("status", status)

    if periodo and periodo != "todos":
        days_map = {"7d": 7, "30d": 30, "90d": 90}
        days = days_map.get(periodo)
        if days:
            cutoff = (datetime.now() - timedelta(days=days)).date().isoformat()
            query = query.gte("data_emissao", cutoff)

    result = query.execute()
    cheques = result.data or []

    # Ordena: data_compensacao ASC, nulos por último
    cheques.sort(key=lambda c: (c.get("data_compensacao") is None, c.get("data_compensacao") or ""))

    return {"cheques": cheques, "total": len(cheques)}


@router.post("/")
def create_cheque(body: dict):
    data = {
        "valor": body.get("valor"),
        "beneficiario": body.get("beneficiario"),
        "banco": body.get("banco") or None,
        "numero": body.get("numero") or None,
        "data_emissao": body.get("data_emissao") or None,
        "data_compensacao": body.get("data_compensacao") or None,
        "status": body.get("status", "emitido"),
        "document_id": body.get("document_id") or None,
    }
    result = supabase.table("cheques").insert(data).execute()
    return {"success": True, "cheque": result.data[0] if result.data else data}
