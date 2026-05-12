from fastapi import APIRouter
from app.services import rag_service
from app.database import supabase

router = APIRouter()


@router.get("/")
async def search(q: str):
    """
    Busca híbrida:
    1. RAG semântico para documentos indexados
    2. Fallback para busca textual no banco
    """
    if not q or len(q) < 2:
        return {"results": []}

    rag_results = await rag_service.semantic_search(q, top_k=5)

    if rag_results:
        return {"results": rag_results, "mode": "semantic"}

    docs = (
        supabase.table("documents")
        .select("*")
        .ilike("name", f"%{q}%")
        .execute()
        .data
    )
    return {"results": docs, "mode": "text"}
