from datetime import date
from pathlib import Path
from typing import Optional
import os
import tempfile
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.auth import require_user_or_webhook
from app.config import settings
from app.database import supabase
from app.services import audio_service, claude_vision, rag_service, storage_service

router = APIRouter()

FORMAT_BY_SUFFIX = {
    ".pdf": "PDF",
    ".jpg": "JPG",
    ".jpeg": "JPG",
    ".png": "PNG",
    ".webp": "IMG",
    ".mp3": "AUD",
    ".mp4": "AUD",
    ".ogg": "AUD",
    ".wav": "AUD",
    ".m4a": "AUD",
}

MIME_BY_SUFFIX = {
    ".pdf": "application/pdf",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".mp3": "audio/mpeg",
    ".mp4": "audio/mp4",
    ".ogg": "audio/ogg",
    ".wav": "audio/wav",
    ".m4a": "audio/mp4",
}


def _safe_filename(filename: str | None) -> str:
    name = Path(filename or "arquivo.bin").name
    return name or "arquivo.bin"


def _days_to_expire(expires_at: str | None) -> int | None:
    if not expires_at:
        return None
    try:
        expires = date.fromisoformat(expires_at)
    except ValueError:
        return None
    return (expires - date.today()).days


def _as_list(value) -> list:
    if isinstance(value, list):
        return value
    if isinstance(value, str) and value.strip():
        return [value.strip()]
    return []


@router.post("/", dependencies=[Depends(require_user_or_webhook)])
async def upload_document(
    file: UploadFile = File(...),
    origin: str = Form("manual"),
    whatsapp_message_id: Optional[str] = Form(None),
):
    filename = _safe_filename(file.filename)
    suffix = Path(filename).suffix.lower()
    file_format = FORMAT_BY_SUFFIX.get(suffix)
    media_type = MIME_BY_SUFFIX.get(suffix) or file.content_type

    if not file_format:
        raise HTTPException(
            status_code=415,
            detail="Tipo de arquivo nao suportado",
        )

    if whatsapp_message_id:
        existing = (
            supabase.table("documents")
            .select("*")
            .eq("whatsapp_message_id", whatsapp_message_id)
            .limit(1)
            .execute()
            .data
        )
        if existing:
            return {"success": True, "document": existing[0], "duplicate": True}

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Arquivo vazio")
    if len(content) > settings.max_upload_bytes:
        raise HTTPException(status_code=413, detail="Arquivo excede o tamanho maximo")

    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(content)
            tmp_path = tmp.name

        text_for_rag = None
        if file_format == "AUD":
            text_for_rag = await audio_service.transcribe_audio(tmp_path)

        try:
            metadata = await claude_vision.extract_metadata(
                tmp_path,
                file_format,
                media_type=media_type,
                text_content=text_for_rag,
            )
        except Exception as e:
            raise HTTPException(
                status_code=502,
                detail=f"Falha ao extrair metadados: {e}",
            )

        document_id = str(uuid.uuid4())
        file_path = f"{document_id}/{filename}"
        try:
            file_url = await storage_service.upload_file(tmp_path, file_path, media_type)
        except Exception as e:
            raise HTTPException(
                status_code=502,
                detail=f"Falha no upload para o storage: {e}",
            )

        expires_at = metadata.get("expires_at")
        if isinstance(expires_at, str) and expires_at.strip().lower() in ("", "null", "none"):
            expires_at = None

        doc_data = {
            "id": document_id,
            "name": metadata.get("name") or filename,
            "type": metadata.get("type") or "Outro",
            "status": "recebido",
            "origin": origin,
            "format": file_format,
            "size_bytes": len(content),
            "file_url": file_url,
            "file_path": file_path,
            "value": metadata.get("value"),
            "parties": _as_list(metadata.get("parties")),
            "tags": _as_list(metadata.get("tags")),
            "summary": metadata.get("summary") or "",
            "raw_text": text_for_rag,
            "expires_at": expires_at,
            "days_to_expire": _days_to_expire(expires_at),
            "whatsapp_message_id": whatsapp_message_id,
        }

        supabase.table("documents").insert(doc_data).execute()

        rag_indexed = False
        try:
            await rag_service.index_document(tmp_path, document_id)
            rag_indexed = True
        except Exception:
            rag_indexed = False

        supabase.table("documents").update({"rag_indexed": rag_indexed}).eq(
            "id", document_id
        ).execute()

        supabase.table("activity_log").insert(
            {
                "type": "upload",
                "text": f"Documento '{doc_data['name']}' recebido via {origin}",
                "document_id": document_id,
                "metadata": {"format": file_format, "origin": origin},
            }
        ).execute()

        doc_data["rag_indexed"] = rag_indexed
        return {"success": True, "document": doc_data}

    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)
