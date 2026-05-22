import { useState, useEffect, useCallback } from 'react'
import { Plus } from 'lucide-react'
import { api } from '@/lib/api'
import type { Payment } from '@/types'
import { useApp } from '@/context/AppContext'
import { Modal } from '@/components/ui/Modal'
import { formatDate, getUrgency, cn } from '@/lib/utils'

const STATUS_CONFIG: Record<Payment['status'], { label: string; bg: string; text: string; dot: string }> = {
  pendente: { label: 'Pendente', bg: 'bg-amber-50',   text: 'text-amber-600',   dot: 'bg-amber-500' },
  pago:     { label: 'Pago',     bg: 'bg-emerald-50', text: 'text-emerald-600', dot: 'bg-emerald-500' },
  vencido:  { label: 'Vencido',  bg: 'bg-red-50',     text: 'text-red-600',     dot: 'bg-red-500' },
}

const fmt = (v: number | null) =>
  v == null ? '—' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

const EMPTY_FORM = {
  valor: '',
  beneficiario: '',
  vencimento: '',
  codigo_barras: '',
  status: 'pendente',
  origin: 'manual',
}

export default function Pagamentos() {
  const { showToast } = useApp()
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('Todos')
  const [filterOrigin, setFilterOrigin] = useState('Todos')
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (filterStatus !== 'Todos') params.status = filterStatus
      if (filterOrigin !== 'Todos') params.origin = filterOrigin
      const data = await api.getPayments(params)
      setPayments(data.payments)
    } finally {
      setLoading(false)
    }
  }, [filterStatus, filterOrigin])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    if (!form.valor || !form.beneficiario) return
    setSaving(true)
    try {
      await api.createPayment({
        valor: parseFloat(form.valor),
        beneficiario: form.beneficiario,
        vencimento: form.vencimento || null,
        codigo_barras: form.codigo_barras || null,
        status: form.status as Payment['status'],
        origin: form.origin as Payment['origin'],
      })
      setModalOpen(false)
      setForm(EMPTY_FORM)
      showToast('Pagamento cadastrado com sucesso')
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
          <h1 className="text-xl font-semibold text-gray-900">Pagamentos</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {payments.length} pagamento{payments.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2 bg-[#0F6E8C] text-white text-sm font-medium rounded-lg hover:bg-[#0d5f7a] transition-colors"
        >
          <Plus size={14} />
          Novo pagamento
        </button>
      </div>

      <div className="flex gap-3 mb-4">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="text-sm border border-black/[0.08] rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#0F6E8C]/40"
        >
          <option value="Todos">Todos os status</option>
          <option value="pendente">Pendente</option>
          <option value="pago">Pago</option>
          <option value="vencido">Vencido</option>
        </select>
        <select
          value={filterOrigin}
          onChange={(e) => setFilterOrigin(e.target.value)}
          className="text-sm border border-black/[0.08] rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#0F6E8C]/40"
        >
          <option value="Todos">Todas as origens</option>
          <option value="manual">Manual</option>
          <option value="whatsapp">WhatsApp</option>
        </select>
      </div>

      <div className="border border-black/[0.08] rounded-xl overflow-hidden bg-white">
        <table className="w-full">
          <thead>
            <tr className="border-b border-black/[0.06]">
              {['Beneficiário', 'Valor', 'Vencimento', 'Status', 'Origem'].map((h) => (
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
                <td colSpan={5} className="text-center text-sm text-gray-400 py-12">
                  Carregando...
                </td>
              </tr>
            ) : payments.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center text-sm text-gray-400 py-12">
                  Nenhum pagamento encontrado
                </td>
              </tr>
            ) : (
              payments.map((p) => {
                const sc = STATUS_CONFIG[p.status]
                const urgency = getUrgency(p.vencimento)
                const rowBg = p.status === 'vencido' ? 'bg-red-50/60' : ''
                return (
                  <tr
                    key={p.id}
                    className={cn('border-b border-black/[0.04] last:border-0 transition-colors', rowBg, !rowBg && 'hover:bg-gray-50/60')}
                  >
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{p.beneficiario}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{fmt(p.valor)}</td>
                    <td
                      className={cn(
                        'px-4 py-3 text-sm font-mono',
                        urgency === 'red' ? 'text-red-600 font-medium' : urgency === 'yellow' ? 'text-amber-600' : 'text-gray-500'
                      )}
                    >
                      {formatDate(p.vencimento)}
                    </td>
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
                    <td className="px-4 py-3 text-sm text-gray-500 capitalize">
                      {p.origin === 'whatsapp' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          WhatsApp
                        </span>
                      ) : (
                        <span className="text-gray-400">Manual</span>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Novo Pagamento">
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
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Vencimento</label>
            <input
              type="date"
              value={form.vencimento}
              onChange={set('vencimento')}
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
              <option value="pendente">Pendente</option>
              <option value="pago">Pago</option>
              <option value="vencido">Vencido</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Origem</label>
            <select
              value={form.origin}
              onChange={set('origin')}
              className="w-full border border-black/[0.08] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#0F6E8C]/40"
            >
              <option value="manual">Manual</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
          </div>

          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Código de Barras</label>
            <input
              type="text"
              value={form.codigo_barras}
              onChange={set('codigo_barras')}
              placeholder="00000.00000 00000.000000 00000.000000 0 00000000000000"
              className="w-full border border-black/[0.08] rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[#0F6E8C]/40"
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
            {saving ? 'Salvando...' : 'Salvar pagamento'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
