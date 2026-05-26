from pydantic import BaseModel
from typing import Optional, List
from datetime import date
from enum import Enum


class DocumentStatus(str, Enum):
    pendente = "pendente"
    processado = "processado"
    arquivado = "arquivado"


class DocumentCreate(BaseModel):
    name: str
    type: str
    status: DocumentStatus = DocumentStatus.pendente
    origin: str = "manual"
    format: Optional[str] = None
    size_bytes: Optional[int] = None
    file_url: Optional[str] = None
    file_path: Optional[str] = None
    value: Optional[float] = None
    parties: List[str] = []
    tags: List[str] = []
    summary: Optional[str] = None
    raw_text: Optional[str] = None
    expires_at: Optional[date] = None
    days_to_expire: Optional[int] = None


class DocumentStatusUpdate(BaseModel):
    status: DocumentStatus


class DocumentUpdate(BaseModel):
    status: Optional[DocumentStatus] = None
    origin: Optional[str] = None
    whatsapp_message_id: Optional[str] = None
