from app.database import supabase

BUCKET = "virginia-documents"


async def upload_file(local_path: str, storage_path: str) -> str:
    """Faz upload de arquivo para o Supabase Storage e retorna a URL."""
    with open(local_path, "rb") as f:
        data = f.read()

    supabase.storage.from_(BUCKET).upload(storage_path, data)

    public_url = supabase.storage.from_(BUCKET).get_public_url(storage_path)
    return public_url
