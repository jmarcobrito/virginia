from fastapi import APIRouter
from typing import Optional
from datetime import datetime, timedelta
from app.database import supabase
from app.models.cheque import ChequeCreate

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
def create_cheque(body: ChequeCreate):
    data = {
        "valor": body.valor,
        "beneficiario": body.beneficiario,
        "banco": body.banco,
        "numero": body.numero,
        "data_emissao": body.data_emissao,
        "data_compensacao": body.data_compensacao,
        "status": body.status.value,
        "document_id": body.document_id,
    }
    result = supabase.table("cheques").insert(data).execute()
    return {"success": True, "cheque": result.data[0] if result.data else data}
