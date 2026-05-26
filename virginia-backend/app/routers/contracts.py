from fastapi import APIRouter
from app.database import supabase
from app.models.document import DocumentStatusUpdate

router = APIRouter()


@router.get("/")
def list_contracts():
    result = (
        supabase.table("documents")
        .select("*")
        .eq("type", "Contrato")
        .execute()
    )
    contracts = result.data or []

    # Ordena: expires_at ASC, nulos por último
    contracts.sort(key=lambda c: (c.get("expires_at") is None, c.get("expires_at") or ""))

    return {"contracts": contracts, "total": len(contracts)}


@router.patch("/{contract_id}/status")
def update_contract_status(contract_id: str, body: DocumentStatusUpdate):
    supabase.table("documents").update({"status": body.status.value}).eq(
        "id", contract_id
    ).execute()
    return {"success": True}


@router.get("/{contract_id}/addendums/")
def list_addendums(contract_id: str):
    result = (
        supabase.table("contract_addendums")
        .select("*")
        .eq("contract_id", contract_id)
        .order("created_at", desc=False)
        .execute()
    )
    return {"addendums": result.data or []}


@router.post("/{contract_id}/addendums/")
def create_addendum(contract_id: str, body: dict):
    data = {
        "contract_id": contract_id,
        "descricao": body.get("descricao"),
        "valor_alteracao": body.get("valor_alteracao") or None,
        "data_vigencia": body.get("data_vigencia") or None,
        "document_id": body.get("document_id") or None,
    }
    result = supabase.table("contract_addendums").insert(data).execute()
    return {"success": True, "addendum": result.data[0] if result.data else data}
