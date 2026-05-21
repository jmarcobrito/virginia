async def index_document(file_path: str, document_id: str) -> bool:
    print(f"RAG indexing desativado temporariamente: {document_id}")
    return True

async def semantic_search(query: str, top_k: int = 5) -> list:
    return []
