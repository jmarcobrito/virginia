import type { Documento, TipoDocumento, StatusDocumento, OrigemDocumento, Cheque, Payment, ContractAddendum } from '@/types'
import { supabase } from '@/lib/supabase'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Mapeia tipo da API (proper case PT) para tipo do frontend (snake_case)
const TYPE_MAP: Record<string, TipoDocumento> = {
  Contrato: 'contrato',
  'Nota Fiscal': 'nota_fiscal',
  Procuração: 'procuracao',
  Escritura: 'escritura',
  Boleto: 'boleto',
  Orçamento: 'orcamento',
  Áudio: 'outro',
  Álvará: 'outro',
  Seguro: 'outro',
  Certidão: 'outro',
  Outro: 'outro',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDocument(d: any): Documento {
  return {
    id: d.id,
    nome: d.name,
    tipo: (TYPE_MAP[d.type] ?? 'outro') as TipoDocumento,
    status: d.status as StatusDocumento,
    origem: (d.origin ?? 'manual') as OrigemDocumento,
    dataRecebimento: (d.created_at ?? '').slice(0, 10),
    dataVencimento: d.expires_at ?? null,
    valor: d.value ?? null,
    partes: d.parties ?? [],
    tags: d.tags ?? [],
    resumo: d.summary ?? '',
  }
}

async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession()
  const base = (options.headers ?? {}) as Record<string, string>
  if (session?.access_token) {
    base['Authorization'] = `Bearer ${session.access_token}`
  }
  return fetch(url, { ...options, headers: base })
}

export const api = {
  getDocuments: (params?: Record<string, string>): Promise<{ documents: Documento[]; total: number; page: number; pages: number }> => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return authFetch(`${API_BASE}/api/documents/${qs}`)
      .then((r) => r.json())
      .then((data) => ({ ...data, documents: (data.documents ?? []).map(mapDocument) }))
  },

  getAllDocuments: async (): Promise<Documento[]> => {
    const first = await authFetch(`${API_BASE}/api/documents/?limit=100`).then((r) => r.json())
    const docs: Documento[] = (first.documents ?? []).map(mapDocument)
    const totalPages: number = first.pages ?? 1
    for (let page = 2; page <= totalPages; page++) {
      const next = await authFetch(`${API_BASE}/api/documents/?limit=100&page=${page}`).then((r) => r.json())
      docs.push(...(next.documents ?? []).map(mapDocument))
    }
    return docs
  },

  getStats: (): Promise<{ total: number; pending: number; this_week: number; expiring_soon: number }> =>
    authFetch(`${API_BASE}/api/documents/stats`).then((r) => r.json()),

  updateStatus: (id: string, status: string): Promise<{ success: boolean }> =>
    authFetch(`${API_BASE}/api/documents/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    }).then((r) => r.json()),

  uploadDocument: (file: File): Promise<{ success: boolean; document: Documento }> => {
    const form = new FormData()
    form.append('file', file)
    return authFetch(`${API_BASE}/api/upload/`, {
      method: 'POST',
      body: form,
    })
      .then((r) => r.json())
      .then((data) => ({ ...data, document: data.document ? mapDocument(data.document) : null }))
  },

  search: (q: string): Promise<{ results: Documento[]; mode: string }> =>
    authFetch(`${API_BASE}/api/search/?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((data) => ({ ...data, results: (data.results ?? []).map(mapDocument) })),

  getActivity: (): Promise<{ activities: unknown[] }> =>
    authFetch(`${API_BASE}/api/activity/`).then((r) => r.json()),

  getSetting: (key: string): Promise<{ value: boolean }> =>
    authFetch(`${API_BASE}/api/settings/${key}`).then((r) => r.json()),

  updateSetting: (key: string, value: unknown): Promise<{ success: boolean }> =>
    authFetch(`${API_BASE}/api/settings/${key}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value }),
    }).then((r) => r.json()),

  whatsapp: {
    status: (): Promise<{ status: string; instance: string | null; phone: string | null }> =>
      authFetch(`${API_BASE}/api/whatsapp/status`).then((r) => r.json()),

    disconnect: (): Promise<{ success: boolean }> =>
      authFetch(`${API_BASE}/api/whatsapp/disconnect`, { method: 'DELETE' }).then((r) => r.json()),
  },

  getWhatsappQRCode: (): Promise<{ qr: string | null }> =>
    authFetch(`${API_BASE}/api/whatsapp/qrcode`).then((r) => r.json()),

  getAuthorizedSources: (): Promise<{ numbers: string[]; groups: string[] }> =>
    authFetch(`${API_BASE}/api/settings/authorized-sources`).then((r) => r.json()),

  updateAuthorizedSources: (data: { numbers: string[]; groups: string[] }): Promise<{ success: boolean }> =>
    authFetch(`${API_BASE}/api/settings/authorized-sources`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then((r) => r.json()),

  getCheques: (params?: Record<string, string>): Promise<{ cheques: Cheque[]; total: number }> => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return authFetch(`${API_BASE}/api/cheques/${qs}`).then((r) => r.json())
  },

  createCheque: (data: Partial<Cheque>): Promise<{ success: boolean; cheque: Cheque }> =>
    authFetch(`${API_BASE}/api/cheques/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then((r) => r.json()),

  getPayments: (params?: Record<string, string>): Promise<{ payments: Payment[]; total: number }> => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return authFetch(`${API_BASE}/api/payments/${qs}`).then((r) => r.json())
  },

  createPayment: (data: Partial<Payment>): Promise<{ success: boolean; payment: Payment }> =>
    authFetch(`${API_BASE}/api/payments/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then((r) => r.json()),

  getContracts: (): Promise<{ contracts: Documento[]; total: number }> =>
    authFetch(`${API_BASE}/api/contracts/`)
      .then((r) => r.json())
      .then((data) => ({ ...data, contracts: (data.contracts ?? []).map(mapDocument) })),

  getContractAddendums: (contractId: string): Promise<{ addendums: ContractAddendum[] }> =>
    authFetch(`${API_BASE}/api/contracts/${contractId}/addendums/`).then((r) => r.json()),

  createContractAddendum: (
    contractId: string,
    data: Partial<ContractAddendum>
  ): Promise<{ success: boolean; addendum: ContractAddendum }> =>
    authFetch(`${API_BASE}/api/contracts/${contractId}/addendums/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then((r) => r.json()),

  admin: {
    getUsers: (): Promise<{ users: unknown[] }> =>
      authFetch(`${API_BASE}/api/admin/users`).then((r) => r.json()),

    createUser: (data: { email: string; password: string; name?: string; role?: string }): Promise<{ success: boolean; user: { id: string; email: string } }> =>
      authFetch(`${API_BASE}/api/admin/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((r) => r.json()),

    toggleUser: (userId: string, disabled: boolean): Promise<{ success: boolean }> =>
      authFetch(`${API_BASE}/api/admin/users/${userId}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disabled }),
      }).then((r) => r.json()),

    resetPassword: (userId: string, password: string): Promise<{ success: boolean }> =>
      authFetch(`${API_BASE}/api/admin/users/${userId}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      }).then((r) => r.json()),
  },
}
