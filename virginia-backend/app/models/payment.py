from pydantic import BaseModel
from typing import Optional
from enum import Enum


class PaymentStatus(str, Enum):
    pendente = "pendente"
    pago = "pago"
    atrasado = "atrasado"


class PaymentCreate(BaseModel):
    valor: Optional[float] = None
    beneficiario: Optional[str] = None
    vencimento: Optional[str] = None
    codigo_barras: Optional[str] = None
    status: PaymentStatus = PaymentStatus.pendente
    origin: str = "manual"
    document_id: Optional[str] = None
