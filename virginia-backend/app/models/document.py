from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date
from enum import Enum


class DocumentStatus(str, Enum):
    recebido = "recebido"
    em_revisao = "em_revisao"
    pendente_assinatura = "pendente_assinatura"
    assinado = "assinado"
    arquivado = "arquivado"


class DocumentCreate(BaseModel):
    name: str
    type: str
    status: DocumentStatus = DocumentStatus.recebido
    origin: str = "manual"
    format: Optional[str] = None
    size_bytes: Optional[int] = None
    file_url: Optional[str] = None
    file_path: Optional[str] = None
    value: Optional[float] = None
    parties: List[str] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)
    summary: Optional[str] = None
    raw_text: Optional[str] = None
    expires_at: Optional[date] = None
    days_to_expire: Optional[int] = None
    whatsapp_message_id: Optional[str] = None
    rag_indexed: bool = False


class DocumentStatusUpdate(BaseModel):
    status: DocumentStatus


class DocumentUpdate(BaseModel):
    status: Optional[DocumentStatus] = None
    origin: Optional[str] = None
    whatsapp_message_id: Optional[str] = None
