from app.database import supabase
from app.config import settings


async def upload_file(local_path: str, storage_path: str, media_type: str | None = None) -> str:
    """Faz upload de arquivo para o Supabase Storage e retorna a URL."""
    with open(local_path, "rb") as f:
        data = f.read()

    file_options = {"upsert": "false"}
    if media_type:
        file_options["content-type"] = media_type

    bucket = supabase.storage.from_(settings.storage_bucket)
    bucket.upload(storage_path, data, file_options=file_options)

    public_url = bucket.get_public_url(storage_path)
    return public_url
