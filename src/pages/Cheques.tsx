import { useState, useEffect, useCallback } from 'react'
import { Plus } from 'lucide-react'
import { api } from '@/lib/api'
import type { Cheque } from '@/types'
import { useApp } from '@/context/AppContext'
import { Modal } from '@/components/ui/Modal'
import { formatDate, cn } from '@/lib/utils'

const STATUS_CONFIG: Record<Cheque['status'], { label: string; bg: string; text: string; dot: string }> = {
  pendente:   { label: 'Emitido',    bg: 'bg-blue-50',    text: 'text-blue-600',    dot: 'bg-blue-500' },
  compensado: { label: 'Compensado', bg: 'bg-emerald-50', text: 'text-emerald-600', dot: 'bg-emerald-500' },
  devolvido:  { label: 'Devolvido',  bg: 'bg-red-50',     text: 'text-red-600',     dot: 'bg-red-500' },
}

const fmt = (v: number | null) =>
  v == null ? '—' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

const EMPTY_FORM = {
  valor: '',
  beneficiario: '',
  banco: '',
  numero: '',
  data_emissao: '',
  data_compensacao: '',
  status: 'pendente',
}

export default function Cheques() {
  const { showToast } = useApp()
  const [cheques, setCheques] = useState<Cheque[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('Todos')
  const [filterPeriodo, setFilterPeriodo] = useState('todos')
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (filterStatus !== 'Todos') params.status = filterStatus
      if (filterPeriodo !== 'todos') params.periodo = filterPeriodo
      const data = await api.getCheques(params)
      setCheques(data.cheques)
    } finally {
      setLoading(false)
    }
  }, [filterStatus, filterPeriodo])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    if (!form.valor || !form.beneficiario) return
    setSaving(true)
    try {
      await api.createCheque({
        valor: parseFloat(form.valor),
        beneficiario: form.beneficiario,
        banco: form.banco || null,
        numero: form.numero || null,
        data_emissao: form.data_emissao || null,
        data_compensacao: form.data_compensacao || null,
        status: form.status as Cheque['status'],
      })
      setModalOpen(false)
      setForm(EMPTY_FORM)
      showToast('Cheque cadastrado com sucesso')
      load()
    } finally {
      setSaving(false)
    }
  }

  const set = (field: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  return (
    <div className="p-7">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Cheques</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {cheques.length} cheque{cheques.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2 bg-[#0F6E8C] text-white text-sm font-medium rounded-lg hover:bg-[#0d5f7a] transition-colors"
        >
          <Plus size={14} />
          Novo cheque
        </button>
      </div>

      <div className="flex gap-3 mb-4">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="text-sm border border-black/[0.08] rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#0F6E8C]/40"
        >
          <option value="Todos">Todos os status</option>
          <option value="pendente">Emitido</option>
          <option value="compensado">Compensado</option>
          <option value="devolvido">Devolvido</option>
        </select>
        <select
          value={filterPeriodo}
          onChange={(e) => setFilterPeriodo(e.target.value)}
          className="text-sm border border-black/[0.08] rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#0F6E8C]/40"
        >
          <option value="todos">Todos os períodos</option>
          <option value="7d">Últimos 7 dias</option>
          <option value="30d">Últimos 30 dias</option>
          <option value="90d">Últimos 90 dias</option>
        </select>
      </div>

      <div className="border border-black/[0.08] rounded-xl overflow-hidden bg-white">
        <table className="w-full">
          <thead>
            <tr className="border-b border-black/[0.06]">
              {['Beneficiário', 'Banco', 'Número', 'Valor', 'Emissão', 'Compensação', 'Status'].map((h) => (
                <th
                  key={h}
                  className="text-left text-[10px] uppercase tracking-[0.08em] text-gray-400 font-medium px-4 py-3"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center text-sm text-gray-400 py-12">
                  Carregando...
                </td>
              </tr>
            ) : cheques.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-sm text-gray-400 py-12">
                  Nenhum cheque encontrado
                </td>
              </tr>
            ) : (
              cheques.map((c) => {
                const sc = STATUS_CONFIG[c.status]
                return (
                  <tr key={c.id} className="border-b border-black/[0.04] last:border-0 hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{c.beneficiario}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{c.banco || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 font-mono">{c.numero || '—'}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{fmt(c.valor)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 font-mono">{formatDate(c.data_emissao)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 font-mono">{formatDate(c.data_compensacao)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full',
                          sc.bg,
                          sc.text
                        )}
                      >
                        <span className={cn('w-1.5 h-1.5 rounded-full', sc.dot)} />
                        {sc.label}
                      </span>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Novo Cheque">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Beneficiário *</label>
            <input
              type="text"
              value={form.beneficiario}
              onChange={set('beneficiario')}
              placeholder="Nome do beneficiário"
              className="w-full border border-black/[0.08] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0F6E8C]/40"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Valor *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.valor}
              onChange={set('valor')}
              placeholder="0,00"
              className="w-full border border-black/[0.08] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0F6E8C]/40"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Status</label>
            <select
              value={form.status}
              onChange={set('status')}
              className="w-full border border-black/[0.08] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#0F6E8C]/40"
            >
              <option value="pendente">Emitido</option>
              <option value="compensado">Compensado</option>
              <option value="devolvido">Devolvido</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Banco</label>
            <input
              type="text"
              value={form.banco}
              onChange={set('banco')}
              placeholder="Ex: Bradesco"
              className="w-full border border-black/[0.08] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0F6E8C]/40"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Número do Cheque</label>
            <input
              type="text"
              value={form.numero}
              onChange={set('numero')}
              placeholder="000000"
              className="w-full border border-black/[0.08] rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[#0F6E8C]/40"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Data de Emissão</label>
            <input
              type="date"
              value={form.data_emissao}
              onChange={set('data_emissao')}
              className="w-full border border-black/[0.08] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0F6E8C]/40"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Data de Compensação</label>
            <input
              type="date"
              value={form.data_compensacao}
              onChange={set('data_compensacao')}
              className="w-full border border-black/[0.08] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0F6E8C]/40"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-black/[0.06]">
          <button
            onClick={() => setModalOpen(false)}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !form.valor || !form.beneficiario}
            className="px-4 py-2 bg-[#0F6E8C] text-white text-sm font-medium rounded-lg hover:bg-[#0d5f7a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Salvando...' : 'Salvar cheque'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
