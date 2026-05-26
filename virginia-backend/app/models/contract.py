from pydantic import BaseModel
from enum import Enum


class ContractStatus(str, Enum):
    ativo = "ativo"
    vencido = "vencido"
    renovado = "renovado"


class ContractStatusUpdate(BaseModel):
    status: ContractStatus
