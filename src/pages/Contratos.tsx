import { useState, useEffect, useCallback } from 'react'
import { X, Plus, ChevronRight } from 'lucide-react'
import { api } from '@/lib/api'
import type { Documento, ContractAddendum } from '@/types'
import { useApp } from '@/context/AppContext'
import { Modal } from '@/components/ui/Modal'
import { formatDate, getDaysUntil, getStatusConfig, cn } from '@/lib/utils'

const fmt = (v: number | null) =>
  v == null ? '—' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

function RenewalBadge({ days }: { days: number | null }) {
  if (days == null) return null
  if (days <= 30)
    return (
      <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-600">
        Renovar em {days}d
      </span>
    )
  if (days <= 60)
    return (
      <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">
        Renovar em {days}d
      </span>
    )
  return (
    <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
      Renovar em {days}d
    </span>
  )
}

const EMPTY_ADDENDUM = { descricao: '', valor_alteracao: '', data_vigencia: '' }

export default function Contratos() {
  const { showToast } = useApp()
  const [contracts, setContracts] = useState<Documento[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Documento | null>(null)
  const [addendums, setAddendums] = useState<ContractAddendum[]>([])
  const [loadingAddendums, setLoadingAddendums] = useState(false)
  const [addModal, setAddModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(EMPTY_ADDENDUM)

  const loadContracts = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.getContracts()
      setContracts(data.contracts)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadContracts() }, [loadContracts])

  const loadAddendums = useCallback(async (contractId: string) => {
    setLoadingAddendums(true)
    try {
      const data = await api.getContractAddendums(contractId)
      setAddendums(data.addendums)
    } finally {
      setLoadingAddendums(false)
    }
  }, [])

  const handleSelectContract = (contract: Documento) => {
    setSelected(contract)
    loadAddendums(contract.id)
  }

  const handleSaveAddendum = async () => {
    if (!form.descricao || !selected) return
    setSaving(true)
    try {
      await api.createContractAddendum(selected.id, {
        descricao: form.descricao,
        valor_alteracao: form.valor_alteracao ? parseFloat(form.valor_alteracao) : null,
        data_vigencia: form.data_vigencia || null,
      })
      setAddModal(false)
      setForm(EMPTY_ADDENDUM)
      showToast('Aditivo adicionado com sucesso')
      loadAddendums(selected.id)
    } finally {
      setSaving(false)
    }
  }

  const set = (field: keyof typeof EMPTY_ADDENDUM) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }))

  const renewalAlert = selected ? getDaysUntil(selected.dataVencimento) : null

  return (
    <div className="p-7 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Contratos</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {contracts.length} contrato{contracts.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Lista */}
        <div className={cn('border border-black/[0.08] rounded-xl overflow-hidden bg-white flex-shrink-0', selected ? 'w-[58%]' : 'w-full')}>
          <table className="w-full">
            <thead>
              <tr className="border-b border-black/[0.06]">
                {['Nome', 'Partes', 'Valor', 'Vencimento', 'Status', 'Renovação', ''].map((h) => (
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
              ) : contracts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-sm text-gray-400 py-12">
                    Nenhum contrato encontrado
                  </td>
                </tr>
              ) : (
                contracts.map((c) => {
                  const days = getDaysUntil(c.dataVencimento)
                  const isSelected = selected?.id === c.id
                  const rowBg =
                    days != null && days <= 30
                      ? 'bg-red-50/40'
                      : days != null && days <= 60
                      ? 'bg-amber-50/30'
                      : ''
                  const sc = getStatusConfig(c.status)
                  return (
                    <tr
                      key={c.id}
                      onClick={() => handleSelectContract(c)}
                      className={cn(
                        'border-b border-black/[0.04] last:border-0 cursor-pointer transition-colors',
                        isSelected ? 'bg-[#0F6E8C]/[0.06]' : cn(rowBg, 'hover:bg-gray-50/60')
                      )}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 max-w-[180px] truncate">
                        {c.nome}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 max-w-[120px] truncate">
                        {c.partes.length > 0 ? c.partes.join(', ') : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{fmt(c.valor)}</td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-500">
                        {formatDate(c.dataVencimento)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', sc.bg, sc.text)}>
                          {sc.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <RenewalBadge days={days} />
                      </td>
                      <td className="px-4 py-3">
                        <ChevronRight size={14} className="text-gray-300" />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Painel lateral */}
        {selected && (
          <div className="flex-1 border border-black/[0.08] rounded-xl bg-white overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-black/[0.06]">
              <h2 className="text-sm font-semibold text-gray-900 truncate pr-2">{selected.nome}</h2>
              <button
                onClick={() => setSelected(null)}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600 flex-shrink-0"
              >
                <X size={15} />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Alerta de renovação */}
              {renewalAlert != null && renewalAlert <= 60 && (
                <div
                  className={cn(
                    'flex items-center gap-2.5 px-4 py-3 rounded-lg text-sm font-medium',
                    renewalAlert <= 30 ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                  )}
                >
                  <span className={cn('w-2 h-2 rounded-full flex-shrink-0', renewalAlert <= 30 ? 'bg-red-500' : 'bg-amber-500')} />
                  {renewalAlert <= 0
                    ? 'Contrato vencido'
                    : renewalAlert <= 30
                    ? `Renovar em ${renewalAlert} dia${renewalAlert !== 1 ? 's' : ''}`
                    : `Renovar em ${renewalAlert} dias`}
                </div>
              )}

              {/* Detalhes */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                {[
                  { label: 'Status', value: getStatusConfig(selected.status).label },
                  { label: 'Origem', value: selected.origem === 'whatsapp' ? 'WhatsApp' : 'Manual' },
                  { label: 'Recebimento', value: formatDate(selected.dataRecebimento) },
                  { label: 'Vencimento', value: formatDate(selected.dataVencimento) },
                  { label: 'Valor Total', value: fmt(selected.valor) },
                  { label: 'Partes', value: selected.partes.length > 0 ? selected.partes.join(', ') : '—' },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-[10px] uppercase tracking-[0.08em] text-gray-400 font-medium mb-0.5">{label}</p>
                    <p className="text-sm text-gray-700">{value}</p>
                  </div>
                ))}
              </div>

              {selected.resumo && (
                <div>
                  <p className="text-[10px] uppercase tracking-[0.08em] text-gray-400 font-medium mb-1">Resumo</p>
                  <p className="text-sm text-gray-600 leading-relaxed">{selected.resumo}</p>
                </div>
              )}

              {/* Aditivos */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] uppercase tracking-[0.08em] text-gray-400 font-medium">
                    Aditivos ({addendums.length})
                  </p>
                  <button
                    onClick={() => setAddModal(true)}
                    className="flex items-center gap-1 text-xs font-medium text-[#0F6E8C] hover:text-[#0d5f7a] transition-colors"
                  >
                    <Plus size={12} />
                    Adicionar
                  </button>
                </div>

                {loadingAddendums ? (
                  <p className="text-xs text-gray-400 py-2">Carregando...</p>
                ) : addendums.length === 0 ? (
                  <p className="text-xs text-gray-400 py-2">Nenhum aditivo registrado</p>
                ) : (
                  <div className="space-y-2">
                    {addendums.map((a) => (
                      <div key={a.id} className="border border-black/[0.06] rounded-lg p-3 bg-gray-50/50">
                        <p className="text-sm text-gray-800">{a.descricao}</p>
                        <div className="flex gap-3 mt-1.5">
                          {a.valor_alteracao != null && (
                            <span className="text-xs text-gray-500">
                              Valor: <span className="font-medium text-gray-700">{fmt(a.valor_alteracao)}</span>
                            </span>
                          )}
                          {a.data_vigencia && (
                            <span className="text-xs text-gray-500">
                              Vigência: <span className="font-medium text-gray-700 font-mono">{formatDate(a.data_vigencia)}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal Aditivo */}
      <Modal isOpen={addModal} onClose={() => setAddModal(false)} title="Novo Aditivo">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Descrição *</label>
            <textarea
              value={form.descricao}
              onChange={set('descricao')}
              rows={3}
              placeholder="Descreva as alterações do aditivo..."
              className="w-full border border-black/[0.08] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0F6E8C]/40 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Valor da Alteração</label>
              <input
                type="number"
                step="0.01"
                value={form.valor_alteracao}
                onChange={set('valor_alteracao')}
                placeholder="0,00"
                className="w-full border border-black/[0.08] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0F6E8C]/40"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Data de Vigência</label>
              <input
                type="date"
                value={form.data_vigencia}
                onChange={set('data_vigencia')}
                className="w-full border border-black/[0.08] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0F6E8C]/40"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-black/[0.06]">
          <button
            onClick={() => setAddModal(false)}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSaveAddendum}
            disabled={saving || !form.descricao}
            className="px-4 py-2 bg-[#0F6E8C] text-white text-sm font-medium rounded-lg hover:bg-[#0d5f7a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Salvando...' : 'Salvar aditivo'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
