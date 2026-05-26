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
    ".jpg": "IMG",
    ".jpeg": "IMG",
    ".png": "IMG",
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

FORMAT_BY_MIME = {
    "application/pdf": "PDF",
    "image/jpeg": "IMG",
    "image/png": "IMG",
    "image/webp": "IMG",
    "audio/mpeg": "AUD",
    "audio/mp3": "AUD",
    "audio/mp4": "AUD",
    "audio/ogg": "AUD",
    "audio/wav": "AUD",
    "audio/x-m4a": "AUD",
    "video/mp4": "AUD",
}

EXTENSION_BY_MIME = {
    "application/pdf": ".pdf",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "audio/mpeg": ".mp3",
    "audio/mp3": ".mp3",
    "audio/mp4": ".m4a",
    "audio/ogg": ".ogg",
    "audio/wav": ".wav",
    "audio/x-m4a": ".m4a",
    "video/mp4": ".mp4",
}


def _safe_filename(filename: str | None) -> str:
    name = Path(filename or "arquivo.bin").name
    return name or "arquivo.bin"


def _clean_content_type(content_type: str | None) -> str | None:
    if not content_type:
        return None
    return content_type.split(";", 1)[0].strip().lower() or None


def _sniff_media_type(content: bytes) -> tuple[str | None, str | None]:
    if content.startswith(b"%PDF"):
        return "application/pdf", ".pdf"
    if content.startswith(b"\xff\xd8\xff"):
        return "image/jpeg", ".jpg"
    if content.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png", ".png"
    if content[:4] == b"RIFF" and content[8:12] == b"WEBP":
        return "image/webp", ".webp"
    if content.startswith(b"OggS"):
        return "audio/ogg", ".ogg"
    if content.startswith(b"ID3") or content[:2] in (b"\xff\xfb", b"\xff\xf3", b"\xff\xf2"):
        return "audio/mpeg", ".mp3"
    if content[:4] == b"RIFF" and content[8:12] == b"WAVE":
        return "audio/wav", ".wav"
    return None, None


def _infer_upload_type(
    filename: str,
    content_type: str | None,
    content: bytes,
) -> tuple[str | None, str | None, str | None]:
    suffix = Path(filename).suffix.lower()
    declared_media_type = _clean_content_type(content_type)
    sniffed_media_type, sniffed_suffix = _sniff_media_type(content)

    media_type = MIME_BY_SUFFIX.get(suffix) or declared_media_type or sniffed_media_type
    file_format = FORMAT_BY_SUFFIX.get(suffix) or FORMAT_BY_MIME.get(media_type or "")
    inferred_suffix = EXTENSION_BY_MIME.get(media_type or "")

    if not file_format and sniffed_media_type:
        media_type = sniffed_media_type
        file_format = FORMAT_BY_MIME.get(sniffed_media_type)
        inferred_suffix = sniffed_suffix

    if suffix in ("", ".bin") and sniffed_media_type:
        media_type = sniffed_media_type if media_type == "application/octet-stream" else media_type
        file_format = file_format or FORMAT_BY_MIME.get(sniffed_media_type)
        inferred_suffix = inferred_suffix or sniffed_suffix

    return file_format, media_type, inferred_suffix


def _filename_with_extension(filename: str, extension: str | None) -> str:
    suffix = Path(filename).suffix.lower()
    if not extension or suffix in FORMAT_BY_SUFFIX:
        return filename

    stem = Path(filename).stem or "arquivo"
    return f"{stem}{extension}"


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

    file_format, media_type, inferred_suffix = _infer_upload_type(
        filename,
        file.content_type,
        content,
    )
    if not file_format:
        raise HTTPException(
            status_code=415,
            detail="Tipo de arquivo nao suportado",
        )

    filename = _filename_with_extension(filename, inferred_suffix)
    suffix = Path(filename).suffix.lower() or inferred_suffix or ".bin"
    media_type = media_type or MIME_BY_SUFFIX.get(suffix) or file.content_type

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

        try:
            supabase.table("documents").insert(doc_data).execute()
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Falha ao salvar documento: {e}")

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
