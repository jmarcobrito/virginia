import type {
  Cheque,
  ContractAddendum,
  Documento,
  OrigemDocumento,
  Payment,
  StatusDocumento,
  TipoDocumento,
} from '@/types'
import { supabase } from '@/lib/supabase'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const TYPE_MAP: Record<string, TipoDocumento> = {
  Contrato: 'contrato',
  'Nota Fiscal': 'nota_fiscal',
  Procuracao: 'procuracao',
  Procuração: 'procuracao',
  Escritura: 'escritura',
  Boleto: 'boleto',
  Orcamento: 'orcamento',
  Orçamento: 'orcamento',
  Audio: 'outro',
  Áudio: 'outro',
  Alvara: 'outro',
  Alvará: 'outro',
  Seguro: 'outro',
  Certidao: 'outro',
  Certidão: 'outro',
  Outro: 'outro',
}

const VALID_STATUS = new Set<StatusDocumento>([
  'recebido',
  'em_revisao',
  'pendente_assinatura',
  'assinado',
  'arquivado',
])

function mapStatus(status: unknown): StatusDocumento {
  return VALID_STATUS.has(status as StatusDocumento) ? (status as StatusDocumento) : 'recebido'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDocument(d: any): Documento {
  return {
    id: d.id,
    nome: d.name,
    tipo: (TYPE_MAP[d.type] ?? 'outro') as TipoDocumento,
    status: mapStatus(d.status),
    origem: (d.origin ?? 'manual') as OrigemDocumento,
    dataRecebimento: (d.created_at ?? '').slice(0, 10),
    dataVencimento: d.expires_at ?? null,
    valor: d.value ?? null,
    partes: d.parties ?? [],
    tags: d.tags ?? [],
    resumo: d.summary ?? '',
    formato: d.format ?? null,
    tamanhoBytes: d.size_bytes ?? null,
    urlArquivo: d.file_url ?? null,
    caminhoArquivo: d.file_path ?? null,
    whatsappMessageId: d.whatsapp_message_id ?? null,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapCheque(c: any): Cheque {
  return {
    ...c,
    status: c.status === 'emitido' ? 'pendente' : c.status,
  } as Cheque
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPayment(p: any): Payment {
  return {
    ...p,
    status: p.status === 'vencido' ? 'atrasado' : p.status,
  } as Payment
}

async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession()
  const headers = new Headers(options.headers)
  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`)
  }
  return fetch(url, { ...options, headers })
}

async function apiJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await authFetch(url, options)
  const text = await response.text()
  let data: any = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = { detail: text }
    }
  }

  if (!response.ok) {
    const detail = data?.detail ?? data?.message ?? `Erro HTTP ${response.status}`
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail))
  }

  return data as T
}

export const api = {
  getDocuments: (params?: Record<string, string>): Promise<{ documents: Documento[]; total: number; page: number; pages: number }> => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return apiJson<{ documents: unknown[]; total: number; page: number; pages: number }>(`${API_BASE}/api/documents/${qs}`)
      .then((data) => ({ ...data, documents: (data.documents ?? []).map(mapDocument) }))
  },

  getAllDocuments: async (): Promise<Documento[]> => {
    const first = await apiJson<{ documents: unknown[]; pages: number }>(`${API_BASE}/api/documents/?limit=100`)
    const docs: Documento[] = (first.documents ?? []).map(mapDocument)
    const totalPages: number = first.pages ?? 1
    for (let page = 2; page <= totalPages; page++) {
      const next = await apiJson<{ documents: unknown[] }>(`${API_BASE}/api/documents/?limit=100&page=${page}`)
      docs.push(...(next.documents ?? []).map(mapDocument))
    }
    return docs
  },

  getStats: (): Promise<{ total: number; pending: number; this_week: number; expiring_soon: number }> =>
    apiJson(`${API_BASE}/api/documents/stats`),

  updateStatus: (id: string, status: string): Promise<{ success: boolean }> =>
    apiJson(`${API_BASE}/api/documents/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    }),

  uploadDocument: (file: File): Promise<{ success: boolean; document: Documento | null }> => {
    const form = new FormData()
    form.append('file', file)
    return apiJson<{ success: boolean; document?: unknown }>(`${API_BASE}/api/upload/`, {
      method: 'POST',
      body: form,
    }).then((data) => ({ ...data, document: data.document ? mapDocument(data.document) : null }))
  },

  search: (q: string): Promise<{ results: Documento[]; mode: string }> =>
    apiJson<{ results: unknown[]; mode: string }>(`${API_BASE}/api/search/?q=${encodeURIComponent(q)}`)
      .then((data) => ({ ...data, results: (data.results ?? []).map(mapDocument) })),

  getActivity: (): Promise<{ activities: unknown[] }> =>
    apiJson(`${API_BASE}/api/activity/`),

  getSetting: (key: string): Promise<{ value: boolean }> =>
    apiJson(`${API_BASE}/api/settings/${key}`),

  updateSetting: (key: string, value: unknown): Promise<{ success: boolean }> =>
    apiJson(`${API_BASE}/api/settings/${key}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value }),
    }),

  whatsapp: {
    status: (): Promise<{ status: string; instance: string | null; phone: string | null }> =>
      apiJson(`${API_BASE}/api/whatsapp/status`),

    disconnect: (): Promise<{ success: boolean }> =>
      apiJson(`${API_BASE}/api/whatsapp/disconnect`, { method: 'DELETE' }),
  },

  getWhatsappQRCode: (): Promise<{ qr: string | null }> =>
    apiJson(`${API_BASE}/api/whatsapp/qrcode`),

  getAuthorizedSources: (): Promise<{ numbers: string[]; groups: string[] }> =>
    apiJson(`${API_BASE}/api/settings/authorized-sources`),

  updateAuthorizedSources: (data: { numbers: string[]; groups: string[] }): Promise<{ success: boolean }> =>
    apiJson(`${API_BASE}/api/settings/authorized-sources`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  getCheques: (params?: Record<string, string>): Promise<{ cheques: Cheque[]; total: number }> => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return apiJson<{ cheques: unknown[]; total: number }>(`${API_BASE}/api/cheques/${qs}`)
      .then((data) => ({ ...data, cheques: (data.cheques ?? []).map(mapCheque) }))
  },

  createCheque: (data: Partial<Cheque>): Promise<{ success: boolean; cheque: Cheque }> =>
    apiJson(`${API_BASE}/api/cheques/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  getPayments: (params?: Record<string, string>): Promise<{ payments: Payment[]; total: number }> => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return apiJson<{ payments: unknown[]; total: number }>(`${API_BASE}/api/payments/${qs}`)
      .then((data) => ({ ...data, payments: (data.payments ?? []).map(mapPayment) }))
  },

  createPayment: (data: Partial<Payment>): Promise<{ success: boolean; payment: Payment }> =>
    apiJson(`${API_BASE}/api/payments/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  getContracts: (): Promise<{ contracts: Documento[]; total: number }> =>
    apiJson<{ contracts: unknown[]; total: number }>(`${API_BASE}/api/contracts/`)
      .then((data) => ({ ...data, contracts: (data.contracts ?? []).map(mapDocument) })),

  getContractAddendums: (contractId: string): Promise<{ addendums: ContractAddendum[] }> =>
    apiJson(`${API_BASE}/api/contracts/${contractId}/addendums/`),

  createContractAddendum: (
    contractId: string,
    data: Partial<ContractAddendum>
  ): Promise<{ success: boolean; addendum: ContractAddendum }> =>
    apiJson(`${API_BASE}/api/contracts/${contractId}/addendums/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  admin: {
    getUsers: (): Promise<{ users: unknown[] }> =>
      apiJson(`${API_BASE}/api/admin/users`),

    createUser: (data: { email: string; password: string; name?: string; role?: string }): Promise<{ success: boolean; user: { id: string; email: string } }> =>
      apiJson(`${API_BASE}/api/admin/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),

    toggleUser: (userId: string, disabled: boolean): Promise<{ success: boolean }> =>
      apiJson(`${API_BASE}/api/admin/users/${userId}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disabled }),
      }),

    resetPassword: (userId: string, password: string): Promise<{ success: boolean }> =>
      apiJson(`${API_BASE}/api/admin/users/${userId}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      }),
  },
}
