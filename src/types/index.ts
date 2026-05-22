export type TipoDocumento =
  | 'contrato'
  | 'nota_fiscal'
  | 'procuracao'
  | 'escritura'
  | 'boleto'
  | 'orcamento'
  | 'outro'

export type StatusDocumento =
  | 'recebido'
  | 'em_revisao'
  | 'pendente_assinatura'
  | 'assinado'
  | 'arquivado'

export type OrigemDocumento = 'whatsapp' | 'manual'

export interface Documento {
  id: string
  nome: string
  tipo: TipoDocumento
  status: StatusDocumento
  origem: OrigemDocumento
  dataRecebimento: string
  dataVencimento: string | null
  valor: number | null
  partes: string[]
  tags: string[]
  resumo: string
}

export interface DocumentFilters {
  tipo: TipoDocumento | 'todos'
  status: StatusDocumento | 'todos'
  periodo: 'todos' | '7d' | '30d' | '90d'
  origem: 'todos' | 'whatsapp' | 'manual'
  search: string
}

export interface Cheque {
  id: string
  valor: number
  beneficiario: string
  banco: string | null
  numero: string | null
  data_emissao: string | null
  data_compensacao: string | null
  status: 'emitido' | 'compensado' | 'devolvido'
  document_id: string | null
  created_at: string
}

export interface Payment {
  id: string
  valor: number
  beneficiario: string
  vencimento: string | null
  codigo_barras: string | null
  status: 'pendente' | 'pago' | 'vencido'
  origin: 'manual' | 'whatsapp'
  document_id: string | null
  paid_at: string | null
  created_at: string
}

export interface ContractAddendum {
  id: string
  contract_id: string
  descricao: string
  valor_alteracao: number | null
  data_vigencia: string | null
  document_id: string | null
  created_at: string
}
