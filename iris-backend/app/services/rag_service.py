import os
from raganything import RAGAnything
from app.config import settings

os.makedirs(settings.rag_working_dir, exist_ok=True)

rag = RAGAnything(
    working_dir=settings.rag_working_dir,
    llm_model_func=None,  # configurar com Claude API
)


async def index_document(file_path: str, document_id: str) -> bool:
    """Indexa documento no RAG-Anything para busca semântica futura."""
    try:
        await rag.insert_file(
            file_path=file_path,
            metadata={"document_id": document_id},
        )
        return True
    except Exception as e:
        print(f"Erro ao indexar documento {document_id}: {e}")
        return False


async def semantic_search(query: str, top_k: int = 5) -> list:
    """Busca semântica em linguagem natural."""
    try:
        results = await rag.query(query, mode="hybrid", top_k=top_k)
        return results
    except Exception as e:
        print(f"Erro na busca: {e}")
        return []
