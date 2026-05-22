import { useState, useEffect, useRef, useCallback } from 'react'
import { MessageCircle, Info, User, Bell, Tag, Pencil, Trash2, Check, X, Plus, RefreshCw, Loader2, CheckCircle2, WifiOff, QrCode, PhoneOff, Shield } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Toggle } from '@/components/ui/Toggle'
import { useApp } from '@/context/AppContext'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { api } from '@/lib/api'

const DEFAULT_CATEGORIES = ['Contrato', 'Nota Fiscal', 'Procuração', 'Escritura', 'Boleto', 'Orçamento', 'Outro']

function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, '')
  if (d.length === 13) {
    return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`
  }
  return raw
}

type WaStatus = 'connected' | 'connecting' | 'disconnected' | 'unreachable' | 'loading'

interface WaState {
  status: WaStatus
  instance: string | null
  phone: string | null
}

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

function WaBadge({ status }: { status: WaStatus }) {
  if (status === 'connected')
    return (
      <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
        Conectado
      </span>
    )
  if (status === 'connecting')
    return (
      <span className="text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium flex items-center gap-1">
        <Loader2 size={10} className="animate-spin" />
        Conectando
      </span>
    )
  if (status === 'loading')
    return (
      <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-400 border border-gray-200 font-medium flex items-center gap-1">
        <Loader2 size={10} className="animate-spin" />
        Verificando
      </span>
    )
  if (status === 'unreachable')
    return (
      <span className="text-xs px-2.5 py-1 rounded-full bg-red-50 text-red-600 border border-red-200 font-medium">
        API offline
      </span>
    )
  return (
    <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 border border-gray-200 font-medium">
      Não conectado
    </span>
  )
}

// QR Code Modal
function QrModal({
  onClose,
  onConnected,
}: {
  onClose: () => void
  onConnected: (phone: string | null) => void
}) {
  const [stage, setStage] = useState<'loading' | 'qr' | 'connected' | 'error'>('loading')
  const [qrImage, setQrImage] = useState<string | null>(null)
  const [connectedPhone, setConnectedPhone] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const qrRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current)
    if (qrRefreshRef.current) clearInterval(qrRefreshRef.current)
  }

  const startPolling = useCallback(() => {
    stopPolling()

    // Poll connection status every 3s
    pollRef.current = setInterval(async () => {
      try {
        const res = await api.whatsapp.status()
        if (res.status === 'connected') {
          stopPolling()
          setConnectedPhone(res.phone ?? null)
          setStage('connected')
          setTimeout(() => {
            onConnected(res.phone ?? null)
          }, 2000)
        }
      } catch {
        // silently continue polling
      }
    }, 3000)

    // Refresh QR image every 25s (Evolution API QR expires ~30s)
    qrRefreshRef.current = setInterval(async () => {
      try {
        const res = await api.getWhatsappQRCode()
        if (res.qr) setQrImage(res.qr)
      } catch {
        // ignore
      }
    }, 25000)
  }, [onConnected])

  useEffect(() => {
    let cancelled = false

    api.getWhatsappQRCode()
      .then((res) => {
        if (cancelled) return
        if (res.qr) setQrImage(res.qr)
        setStage('qr')
        startPolling()
      })
      .catch(() => {
        if (cancelled) return
        setErrorMsg('Não foi possível conectar à Evolution API. Verifique se está rodando.')
        setStage('error')
      })

    return () => {
      cancelled = true
      stopPolling()
    }
  }, [startPolling])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
              <QrCode size={14} className="text-emerald-600" />
            </div>
            <p className="text-sm font-semibold text-gray-800">Conectar WhatsApp</p>
          </div>
          <button
            onClick={() => { stopPolling(); onClose() }}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col items-center gap-4">
          {stage === 'loading' && (
            <>
              <div className="w-48 h-48 bg-gray-50 rounded-xl flex items-center justify-center">
                <Loader2 size={32} className="text-gray-300 animate-spin" />
              </div>
              <p className="text-sm text-gray-500">Gerando QR Code...</p>
            </>
          )}

          {stage === 'qr' && (
            <>
              {qrImage ? (
                <img
                  src={qrImage}
                  alt="QR Code WhatsApp"
                  className="w-48 h-48 rounded-xl border border-gray-200"
                />
              ) : (
                <div className="w-48 h-48 bg-gray-50 rounded-xl flex items-center justify-center">
                  <Loader2 size={32} className="text-gray-300 animate-spin" />
                </div>
              )}
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700">Escaneie com o WhatsApp</p>
                <p className="text-xs text-gray-400 mt-1">
                  Abra o WhatsApp → Aparelhos conectados → Conectar aparelho
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Loader2 size={11} className="animate-spin" />
                Aguardando leitura do QR Code...
              </div>
            </>
          )}

          {stage === 'connected' && (
            <>
              <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 size={32} className="text-emerald-500" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-800">Conectado!</p>
                {connectedPhone && (
                  <p className="text-xs text-gray-500 mt-1 font-mono">+{connectedPhone}</p>
                )}
              </div>
            </>
          )}

          {stage === 'error' && (
            <>
              <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
                <WifiOff size={28} className="text-red-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-700">Erro de conexão</p>
                <p className="text-xs text-gray-400 mt-1">{errorMsg}</p>
              </div>
              <button
                onClick={() => { stopPolling(); onClose() }}
                className="text-sm font-medium px-4 py-2 rounded-lg border border-black/[0.08] text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Fechar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
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

  const [categories, setCategories] = useLocalStorage<string[]>('virginia_categories', DEFAULT_CATEGORIES)
  const [newCategoryInput, setNewCategoryInput] = useState('')
  const [showNewInput, setShowNewInput] = useState(false)
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [editingValue, setEditingValue] = useState('')

  // WhatsApp state
  const [waState, setWaState] = useState<WaState>({ status: 'loading', instance: null, phone: null })
  const [showQrModal, setShowQrModal] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const statusPollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // System status
  const [n8nStatus, setN8nStatus] = useState<'connected' | 'pending'>('pending')

  // Fontes autorizadas
  const [authNumbers, setAuthNumbers] = useState<string[]>([])
  const [authGroups,  setAuthGroups]  = useState<string[]>([])
  const [newNumber,   setNewNumber]   = useState('')
  const [newGroup,    setNewGroup]    = useState('')
  const [showGroupTip, setShowGroupTip] = useState(false)

  const fetchWaStatus = useCallback(async () => {
    try {
      const res = await api.whatsapp.status()
      setWaState({ status: res.status as WaStatus, instance: res.instance, phone: res.phone })
    } catch {
      setWaState((prev) => ({ ...prev, status: 'unreachable' }))
    }
  }, [])

  useEffect(() => {
    fetchWaStatus()
    statusPollRef.current = setInterval(fetchWaStatus, 15000)
    return () => {
      if (statusPollRef.current) clearInterval(statusPollRef.current)
    }
  }, [fetchWaStatus])

  useEffect(() => {
    api.getAuthorizedSources()
      .then((res) => {
        setAuthNumbers(res.numbers)
        setAuthGroups(res.groups)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/system/status`)
      .then((r) => r.json())
      .then((data) => setN8nStatus(data.n8n === 'connected' ? 'connected' : 'pending'))
      .catch(() => {})
  }, [])

  function addNumber() {
    const n = newNumber.replace(/\D/g, '')
    if (!n) return
    const updated = [...authNumbers, n]
    setAuthNumbers(updated)
    setNewNumber('')
    api.updateAuthorizedSources({ numbers: updated, groups: authGroups })
  }

  function removeNumber(idx: number) {
    const updated = authNumbers.filter((_, i) => i !== idx)
    setAuthNumbers(updated)
    api.updateAuthorizedSources({ numbers: updated, groups: authGroups })
  }

  function addGroup() {
    const g = newGroup.trim()
    if (!g) return
    const updated = [...authGroups, g]
    setAuthGroups(updated)
    setNewGroup('')
    api.updateAuthorizedSources({ numbers: authNumbers, groups: updated })
  }

  function removeGroup(idx: number) {
    const updated = authGroups.filter((_, i) => i !== idx)
    setAuthGroups(updated)
    api.updateAuthorizedSources({ numbers: authNumbers, groups: updated })
  }

  async function handleDisconnect() {
    setIsDisconnecting(true)
    try {
      await api.whatsapp.disconnect()
      setWaState({ status: 'disconnected', instance: null, phone: null })
      showToast('WhatsApp desconectado')
    } catch {
      showToast('Erro ao desconectar')
    } finally {
      setIsDisconnecting(false)
    }
  }

  function handleQrConnected(phone: string | null) {
    setShowQrModal(false)
    setWaState({ status: 'connected', instance: null, phone })
    showToast('WhatsApp conectado com sucesso')
    fetchWaStatus()
  }

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

  const isConnected = waState.status === 'connected'
  const phoneDisplay = waState.phone
    ? `+${waState.phone}`
    : waState.instance
      ? waState.instance
      : 'Nenhum número conectado'

  return (
    <div className="p-7">
      {showQrModal && (
        <QrModal
          onClose={() => setShowQrModal(false)}
          onConnected={handleQrConnected}
        />
      )}

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
                <p className="text-xs text-gray-400 mt-0.5 font-mono">{phoneDisplay}</p>
              </div>
              <WaBadge status={waState.status} />
            </div>

            <div className="flex items-center gap-2 pt-3 border-t border-black/[0.06]">
              {isConnected ? (
                <>
                  <button
                    onClick={() => setShowQrModal(true)}
                    className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border border-black/[0.08] text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <RefreshCw size={13} />
                    Trocar número
                  </button>
                  <button
                    onClick={handleDisconnect}
                    disabled={isDisconnecting}
                    className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    {isDisconnecting ? <Loader2 size={13} className="animate-spin" /> : <PhoneOff size={13} />}
                    Desconectar
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowQrModal(true)}
                  className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                >
                  <QrCode size={13} />
                  Conectar WhatsApp
                </button>
              )}

              <button
                onClick={async () => {
                  await fetchWaStatus()
                  showToast(waState.status === 'connected' ? 'Conexão ativa' : 'WhatsApp não conectado')
                }}
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
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-800">Notificações via WhatsApp</p>
                <p className="text-xs text-gray-400 mt-0.5">Alertas automáticos para documentos próximos ao vencimento</p>
              </div>
              <Toggle checked={whatsappAlertsEnabled} onChange={setWhatsappAlertsEnabled} />
            </div>
            {whatsappAlertsEnabled && (
              <div className="pt-3 border-t border-black/[0.06] space-y-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400">
                  Notificar quando
                </p>
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-medium text-gray-800">Documentos vencendo em 30 dias</p>
                  <Toggle checked={alertVencendo30} onChange={setAlertVencendo30} />
                </div>
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-medium text-gray-800">Documentos vencendo em 7 dias</p>
                  <Toggle checked={alertVencendo7} onChange={setAlertVencendo7} />
                </div>
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-medium text-gray-800">Novos documentos recebidos</p>
                  <Toggle checked={alertNovosDocumentos} onChange={setAlertNovosDocumentos} />
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Fontes Autorizadas */}
        <Card>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-lg bg-[#0F6E8C]/[0.08] flex items-center justify-center">
              <Shield size={15} className="text-[#0F6E8C]" />
            </div>
            <h2 className="text-sm font-semibold text-gray-800">Fontes Autorizadas</h2>
          </div>

          {/* Números */}
          <div className="space-y-3 mb-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400">
              Números autorizados
            </p>
            <div className="flex flex-wrap gap-2 min-h-[28px]">
              {authNumbers.map((num, i) => (
                <span key={i} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-700">
                  {formatPhone(num)}
                  <button onClick={() => removeNumber(i)} className="ml-0.5 text-gray-400 hover:text-red-500 transition-colors">
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={newNumber}
                onChange={(e) => setNewNumber(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addNumber()}
                placeholder="+55 (27) 99999-9999"
                className="flex-1 text-sm border border-black/[0.1] rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#0F6E8C]/20"
              />
              <button
                onClick={addNumber}
                className="text-sm font-medium px-3 py-1.5 rounded-lg bg-[#0F6E8C] text-white hover:bg-[#0d5f79] transition-colors"
              >
                Adicionar
              </button>
            </div>
          </div>

          {/* Grupos */}
          <div className="space-y-3 pt-4 border-t border-black/[0.06]">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400">
                Grupos autorizados
              </p>
              <div className="relative">
                <button
                  onClick={() => setShowGroupTip((v) => !v)}
                  className="text-xs text-[#0F6E8C] hover:underline"
                >
                  Como encontrar o ID do grupo?
                </button>
                {showGroupTip && (
                  <div className="absolute right-0 top-6 z-10 w-64 bg-gray-900 text-white text-xs rounded-lg p-3 shadow-lg">
                    O ID aparece nos logs do N8n quando uma mensagem do grupo é recebida.
                    Procure o campo{' '}
                    <span className="font-mono bg-gray-700 px-1 rounded">data.key.remoteJid</span>
                    {' '}— ele termina com{' '}
                    <span className="font-mono bg-gray-700 px-1 rounded">@g.us</span>.
                    <button
                      onClick={() => setShowGroupTip(false)}
                      className="absolute top-1.5 right-1.5 text-gray-400 hover:text-white"
                    >
                      <X size={11} />
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 min-h-[28px]">
              {authGroups.map((grp, i) => (
                <span key={i} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 font-mono">
                  {grp}
                  <button onClick={() => removeGroup(i)} className="ml-0.5 text-gray-400 hover:text-red-500 transition-colors">
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={newGroup}
                onChange={(e) => setNewGroup(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addGroup()}
                placeholder="Cole o ID do grupo do WhatsApp"
                className="flex-1 text-sm border border-black/[0.1] rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#0F6E8C]/20 font-mono"
              />
              <button
                onClick={addGroup}
                className="text-sm font-medium px-3 py-1.5 rounded-lg bg-[#0F6E8C] text-white hover:bg-[#0d5f79] transition-colors"
              >
                Adicionar
              </button>
            </div>
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
              { label: 'Status N8n', value: null, badge: n8nStatus },
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
