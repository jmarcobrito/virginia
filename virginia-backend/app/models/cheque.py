from pydantic import BaseModel
from typing import Optional
from enum import Enum


class ChequeStatus(str, Enum):
    pendente = "pendente"
    compensado = "compensado"
    devolvido = "devolvido"


class ChequeCreate(BaseModel):
    valor: Optional[float] = None
    beneficiario: Optional[str] = None
    banco: Optional[str] = None
    numero: Optional[str] = None
    data_emissao: Optional[str] = None
    data_compensacao: Optional[str] = None
    status: ChequeStatus = ChequeStatus.pendente
    document_id: Optional[str] = None
