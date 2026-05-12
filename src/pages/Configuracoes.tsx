import { useState } from 'react'
import { MessageCircle, Info, User, Bell, Tag, Pencil, Trash2, Check, X, Plus } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Toggle } from '@/components/ui/Toggle'
import { useApp } from '@/context/AppContext'
import { useLocalStorage } from '@/hooks/useLocalStorage'

const DEFAULT_CATEGORIES = ['Contrato', 'Nota Fiscal', 'Procuração', 'Escritura', 'Boleto', 'Orçamento', 'Outro']

function SystemBadge({ variant }: { variant: 'connected' | 'pending' | 'disconnected' }) {
  if (variant === 'connected')
    return (
      <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
        Conectado
      </span>
    )
  if (variant === 'pending')
    return (
      <span className="text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium">
        Em configuração
      </span>
    )
  return (
    <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 border border-gray-200 font-medium">
      Não conectado
    </span>
  )
}

export default function Configuracoes() {
  const {
    whatsappAlertsEnabled,
    setWhatsappAlertsEnabled,
    alertVencendo30,
    setAlertVencendo30,
    alertVencendo7,
    setAlertVencendo7,
    alertNovosDocumentos,
    setAlertNovosDocumentos,
    showToast,
  } = useApp()

  const [categories, setCategories] = useLocalStorage<string[]>('iris_categories', DEFAULT_CATEGORIES)
  const [newCategoryInput, setNewCategoryInput] = useState('')
  const [showNewInput, setShowNewInput] = useState(false)
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [editingValue, setEditingValue] = useState('')

  function handleAddCategory() {
    const trimmed = newCategoryInput.trim()
    if (!trimmed) return
    setCategories([...categories, trimmed])
    setNewCategoryInput('')
    setShowNewInput(false)
    showToast('Categoria adicionada')
  }

  function handleRemoveCategory(idx: number) {
    setCategories(categories.filter((_, i) => i !== idx))
    showToast('Categoria removida')
  }

  function startEdit(idx: number) {
    setEditingIdx(idx)
    setEditingValue(categories[idx])
  }

  function confirmEdit() {
    if (editingIdx === null) return
    const trimmed = editingValue.trim()
    if (trimmed) {
      const updated = [...categories]
      updated[editingIdx] = trimmed
      setCategories(updated)
      showToast('Categoria atualizada')
    }
    setEditingIdx(null)
  }

  return (
    <div className="p-7">
      <div className="mb-7">
        <h1 className="text-xl font-semibold text-gray-900">Configurações</h1>
        <p className="text-sm text-gray-400 mt-0.5">Preferências e informações do sistema</p>
      </div>

      <div className="max-w-2xl space-y-5">

        {/* WhatsApp Integration */}
        <Card>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <MessageCircle size={15} className="text-emerald-600" />
            </div>
            <h2 className="text-sm font-semibold text-gray-800">Integração WhatsApp</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-700">Status da conexão</p>
                <p className="text-xs text-gray-400 mt-0.5 font-mono">+55 (27) 9xxxx-xxxx</p>
              </div>
              <SystemBadge variant="connected" />
            </div>
            <div className="flex items-center gap-2 pt-3 border-t border-black/[0.06]">
              <button className="text-sm font-medium px-3 py-1.5 rounded-lg border border-black/[0.08] text-gray-600 hover:bg-gray-50 transition-colors">
                Reconectar
              </button>
              <button
                onClick={() => showToast('Conexão testada com sucesso')}
                className="text-sm font-medium px-3 py-1.5 rounded-lg bg-[#0F6E8C]/[0.08] text-[#0F6E8C] hover:bg-[#0F6E8C]/[0.14] transition-colors"
              >
                Testar conexão
              </button>
            </div>
          </div>
        </Card>

        {/* Alerts */}
        <Card>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
              <Bell size={15} className="text-amber-500" />
            </div>
            <h2 className="text-sm font-semibold text-gray-800">Alertas</h2>
          </div>
          <div className="space-y-4">
            <Toggle
              enabled={whatsappAlertsEnabled}
              onChange={setWhatsappAlertsEnabled}
              label="Notificações via WhatsApp"
              description="Alertas automáticos para documentos próximos ao vencimento"
            />
            {whatsappAlertsEnabled && (
              <div className="pt-3 border-t border-black/[0.06] space-y-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400">
                  Notificar quando
                </p>
                <Toggle
                  enabled={alertVencendo30}
                  onChange={setAlertVencendo30}
                  label="Documentos vencendo em 30 dias"
                  description=""
                />
                <Toggle
                  enabled={alertVencendo7}
                  onChange={setAlertVencendo7}
                  label="Documentos vencendo em 7 dias"
                  description=""
                />
                <Toggle
                  enabled={alertNovosDocumentos}
                  onChange={setAlertNovosDocumentos}
                  label="Novos documentos recebidos"
                  description=""
                />
              </div>
            )}
          </div>
        </Card>

        {/* Categories */}
        <Card>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#0F6E8C]/[0.08] flex items-center justify-center">
                <Tag size={15} className="text-[#0F6E8C]" />
              </div>
              <h2 className="text-sm font-semibold text-gray-800">Categorias de documentos</h2>
            </div>
            <button
              onClick={() => setShowNewInput(true)}
              className="flex items-center gap-1 text-xs text-[#0F6E8C] font-medium px-2.5 py-1.5 rounded-lg hover:bg-[#0F6E8C]/[0.06] transition-colors"
            >
              <Plus size={12} />
              Nova categoria
            </button>
          </div>
          <div className="space-y-1">
            {categories.map((cat, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 group transition-colors"
              >
                {editingIdx === idx ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      autoFocus
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') confirmEdit()
                        if (e.key === 'Escape') setEditingIdx(null)
                      }}
                      className="flex-1 text-sm border border-[#0F6E8C]/30 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#0F6E8C]/20"
                    />
                    <button onClick={confirmEdit} className="p-1 text-emerald-600 hover:text-emerald-700">
                      <Check size={13} />
                    </button>
                    <button onClick={() => setEditingIdx(null)} className="p-1 text-gray-400 hover:text-gray-600">
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="text-sm text-gray-700">{cat}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => startEdit(idx)}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={() => handleRemoveCategory(idx)}
                        className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {showNewInput && (
              <div className="flex items-center gap-2 py-2 px-3">
                <input
                  autoFocus
                  value={newCategoryInput}
                  onChange={(e) => setNewCategoryInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddCategory()
                    if (e.key === 'Escape') { setShowNewInput(false); setNewCategoryInput('') }
                  }}
                  placeholder="Nome da categoria..."
                  className="flex-1 text-sm border border-[#0F6E8C]/30 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#0F6E8C]/20"
                />
                <button
                  onClick={handleAddCategory}
                  className="p-1 text-emerald-600 hover:text-emerald-700"
                >
                  <Check size={13} />
                </button>
                <button
                  onClick={() => { setShowNewInput(false); setNewCategoryInput('') }}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <X size={13} />
                </button>
              </div>
            )}
          </div>
        </Card>

        {/* Sistema */}
        <Card>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-lg bg-[#0F6E8C]/[0.08] flex items-center justify-center">
              <Info size={15} className="text-[#0F6E8C]" />
            </div>
            <h2 className="text-sm font-semibold text-gray-800">Sistema</h2>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Versão', value: 'v1.0.0', badge: null },
              { label: 'Status RAG', value: null, badge: 'pending' as const },
              { label: 'Status Supabase', value: null, badge: 'disconnected' as const },
              { label: 'Status N8n', value: null, badge: 'pending' as const },
            ].map(({ label, value, badge }) => (
              <div
                key={label}
                className="flex items-center justify-between py-2 border-b border-black/[0.04] last:border-0"
              >
                <span className="text-xs text-gray-500">{label}</span>
                {badge ? (
                  <SystemBadge variant={badge} />
                ) : (
                  <span className="text-xs font-medium text-gray-700 font-mono">{value}</span>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Account */}
        <Card>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
              <User size={15} className="text-gray-500" />
            </div>
            <h2 className="text-sm font-semibold text-gray-800">Conta</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#0F6E8C]/15 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-semibold text-[#0F6E8C]">MC</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Mariana Costa</p>
              <p className="text-xs text-gray-500">Assistente Administrativo</p>
              <p className="text-xs text-gray-400 mt-0.5">Grupo Monarca</p>
            </div>
          </div>
        </Card>

      </div>
    </div>
  )
}
