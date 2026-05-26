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

    q_lower = q.lower()
    all_docs = supabase.table("documents").select("*").limit(500).execute().data or []
    docs = [
        doc
        for doc in all_docs
        if q_lower
        in " ".join(
            [
                doc.get("name") or "",
                doc.get("type") or "",
                doc.get("summary") or "",
                " ".join(doc.get("parties") or []),
                " ".join(doc.get("tags") or []),
                doc.get("raw_text") or "",
            ]
        ).lower()
    ]
    return {"results": docs, "mode": "text"}
