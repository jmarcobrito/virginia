import os
import anthropic
from raganything import RAGAnything
from app.config import settings

os.makedirs(settings.rag_working_dir, exist_ok=True)

_anthropic = anthropic.Anthropic(api_key=settings.anthropic_api_key)


def _claude_llm(prompt: str, system_prompt: str | None = None, **kwargs) -> str:
    messages = [{"role": "user", "content": prompt}]
    response = _anthropic.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2048,
        system=system_prompt or "You are a helpful assistant.",
        messages=messages,
    )
    return response.content[0].text


rag = RAGAnything(
    working_dir=settings.rag_working_dir,
    llm_model_func=_claude_llm,
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
