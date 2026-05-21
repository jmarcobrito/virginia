from typing import Optional
from fastapi import APIRouter, Form, UploadFile, File
from app.services import claude_vision, rag_service, audio_service, storage_service
from app.database import supabase
import tempfile
import os
import uuid
from datetime import date

router = APIRouter()


@router.post("/")
async def upload_document(
    file: UploadFile = File(...),
    origin: str = Form("manual"),
    whatsapp_message_id: Optional[str] = Form(None),
):
    """
    Fluxo completo de upload:
    1. Salva arquivo temporariamente
    2. Detecta formato
    3. Se áudio: transcreve com Whisper antes
    4. Extrai metadados com Claude Vision
    5. Faz upload para Supabase Storage
    6. Salva metadados no banco
    7. Indexa no RAG-Anything
    8. Registra na activity_log
    """

    # 1. Salvar temporariamente
    suffix = os.path.splitext(file.filename)[1].lower()
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        # 2. Detectar formato
        format_map = {
            ".pdf": "PDF",
            ".jpg": "IMG",
            ".jpeg": "IMG",
            ".png": "IMG",
            ".mp3": "AUD",
            ".mp4": "AUD",
            ".ogg": "AUD",
            ".wav": "AUD",
            ".m4a": "AUD",
        }
        file_format = format_map.get(suffix, "PDF")

        # 3. Se áudio: transcrever primeiro
        text_for_rag = None
        if file_format == "AUD":
            text_for_rag = await audio_service.transcribe_audio(tmp_path)

        # 4. Extrair metadados com Claude Vision
        metadata = await claude_vision.extract_metadata(tmp_path, file_format)

        # 5. Upload para Supabase Storage
        document_id = str(uuid.uuid4())
        file_path = f"{document_id}/{file.filename}"
        file_url = await storage_service.upload_file(tmp_path, file_path)

        # 6. Calcular dias para vencer
        days_to_expire = None
        if metadata.get("expires_at"):
            expires = date.fromisoformat(metadata["expires_at"])
            days_to_expire = (expires - date.today()).days

        # 7. Salvar no banco
        doc_data = {
            "id": document_id,
            "name": metadata.get("name", file.filename),
            "type": metadata.get("type", "Outro"),
            "status": "recebido",
            "origin": origin,
            "format": file_format,
            "size_bytes": len(content),
            "file_url": file_url,
            "file_path": file_path,
            "value": metadata.get("value"),
            "parties": metadata.get("parties", []),
            "tags": metadata.get("tags", []),
            "summary": metadata.get("summary", ""),
            "raw_text": text_for_rag,
            "expires_at": metadata.get("expires_at"),
            "days_to_expire": days_to_expire,
            "whatsapp_message_id": whatsapp_message_id,
        }

        supabase.table("documents").insert(doc_data).execute()

        # 8. Indexar no RAG
        await rag_service.index_document(tmp_path, document_id)
        supabase.table("documents").update({"rag_indexed": True}).eq(
            "id", document_id
        ).execute()

        # 9. Registrar atividade
        supabase.table("activity_log").insert(
            {
                "type": "upload",
                "text": f"Documento '{doc_data['name']}' recebido via {origin}",
                "document_id": document_id,
                "metadata": {"format": file_format, "origin": origin},
            }
        ).execute()

        return {"success": True, "document": doc_data}

    finally:
        os.unlink(tmp_path)
