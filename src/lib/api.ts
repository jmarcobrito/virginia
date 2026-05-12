import type { Documento, TipoDocumento, StatusDocumento, OrigemDocumento } from '@/types'

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

export const api = {
  getDocuments: (params?: Record<string, string>): Promise<{ documents: Documento[]; total: number; page: number; pages: number }> => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return fetch(`${API_BASE}/api/documents/${qs}`)
      .then((r) => r.json())
      .then((data) => ({ ...data, documents: (data.documents ?? []).map(mapDocument) }))
  },

  getAllDocuments: async (): Promise<Documento[]> => {
    // Busca todas as páginas necessárias para ter o conjunto completo
    const first = await fetch(`${API_BASE}/api/documents/?limit=100`).then((r) => r.json())
    const docs: Documento[] = (first.documents ?? []).map(mapDocument)
    const totalPages: number = first.pages ?? 1
    for (let page = 2; page <= totalPages; page++) {
      const next = await fetch(`${API_BASE}/api/documents/?limit=100&page=${page}`).then((r) => r.json())
      docs.push(...(next.documents ?? []).map(mapDocument))
    }
    return docs
  },

  getStats: (): Promise<{ total: number; pending: number; this_week: number; expiring_soon: number }> =>
    fetch(`${API_BASE}/api/documents/stats`).then((r) => r.json()),

  updateStatus: (id: string, status: string): Promise<{ success: boolean }> =>
    fetch(`${API_BASE}/api/documents/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    }).then((r) => r.json()),

  uploadDocument: (file: File): Promise<{ success: boolean; document: Documento }> => {
    const form = new FormData()
    form.append('file', file)
    return fetch(`${API_BASE}/api/upload/`, {
      method: 'POST',
      body: form,
    })
      .then((r) => r.json())
      .then((data) => ({ ...data, document: data.document ? mapDocument(data.document) : null }))
  },

  search: (q: string): Promise<{ results: Documento[]; mode: string }> =>
    fetch(`${API_BASE}/api/search/?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((data) => ({ ...data, results: (data.results ?? []).map(mapDocument) })),

  getActivity: (): Promise<{ activities: unknown[] }> =>
    fetch(`${API_BASE}/api/activity/`).then((r) => r.json()),

  getSetting: (key: string): Promise<{ value: boolean }> =>
    fetch(`${API_BASE}/api/settings/${key}`).then((r) => r.json()),

  updateSetting: (key: string, value: unknown): Promise<{ success: boolean }> =>
    fetch(`${API_BASE}/api/settings/${key}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value }),
    }).then((r) => r.json()),
}
