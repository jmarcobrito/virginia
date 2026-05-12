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
