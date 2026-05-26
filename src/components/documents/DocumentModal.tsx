import { useState, useEffect } from 'react'
import { AlertTriangle, MessageCircle, Download, Archive } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { StatusBadge, TipoBadge } from '@/components/ui/Badge'
import { formatCurrency, formatDate, getUrgency, getDaysUntil } from '@/lib/utils'
import { useApp } from '@/context/AppContext'
import type { Documento, StatusDocumento } from '@/types'

interface DocumentModalProps {
  document: Documento | null
  isOpen: boolean
  onClose: () => void
}

const statusOptions: { value: StatusDocumento; label: string }[] = [
  { value: 'recebido', label: 'Recebido' },
  { value: 'em_revisao', label: 'Em Revisão' },
  { value: 'pendente_assinatura', label: 'Pendente Assinatura' },
  { value: 'assinado', label: 'Assinado' },
  { value: 'arquivado', label: 'Arquivado' },
]

export function DocumentModal({ document: doc, isOpen, onClose }: DocumentModalProps) {
  const { updateDocumentStatus, showToast } = useApp()
  const [currentStatus, setCurrentStatus] = useState<StatusDocumento | null>(null)

  useEffect(() => {
    if (doc) setCurrentStatus(doc.status)
  }, [doc])

  if (!doc || currentStatus === null) return null

  const urgency = getUrgency(doc.dataVencimento)
  const daysUntil = getDaysUntil(doc.dataVencimento)

  async function handleStatusChange(newStatus: StatusDocumento) {
    if (!doc) return
    const previous = currentStatus
    setCurrentStatus(newStatus)
    const ok = await updateDocumentStatus(doc.id, newStatus)
    if (ok) showToast('Status alterado com sucesso')
    else setCurrentStatus(previous)
  }

  async function handleArquivar() {
    if (!doc) return
    const ok = await updateDocumentStatus(doc.id, 'arquivado')
    if (ok) {
      showToast('Documento arquivado')
      onClose()
    }
  }

  function handleDownload() {
    const fileUrl = doc?.urlArquivo
    if (!fileUrl) {
      showToast('Arquivo indisponivel para download')
      return
    }
    window.open(fileUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={doc.nome}>
      {urgency !== 'none' && doc.dataVencimento && (
        <div
          className={`flex items-center gap-2 px-4 py-3 rounded-lg mb-5 text-sm font-medium ${
            urgency === 'red'
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-amber-50 text-amber-700 border border-amber-200'
          }`}
        >
          <AlertTriangle size={15} />
          Vence em {daysUntil} dia{daysUntil !== 1 ? 's' : ''} — {formatDate(doc.dataVencimento)}
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-[0.08em] mb-1">Tipo</p>
            <TipoBadge tipo={doc.tipo} />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-[0.08em] mb-1">Status</p>
            <StatusBadge status={currentStatus} />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-[0.08em] mb-1">Resumo</p>
            <p className="text-sm text-gray-700 leading-relaxed">{doc.resumo}</p>
          </div>
          {doc.tags.length > 0 && (
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-[0.08em] mb-2">Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {doc.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-[0.08em] mb-1">Origem</p>
            {doc.origem === 'whatsapp' ? (
              <span className="inline-flex items-center gap-1.5 text-sm text-emerald-600">
                <MessageCircle size={13} />
                WhatsApp
              </span>
            ) : (
              <span className="text-sm text-gray-600">Manual</span>
            )}
          </div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-[0.08em] mb-1">Recebimento</p>
            <p className="text-sm text-gray-700 font-mono">{formatDate(doc.dataRecebimento)}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-[0.08em] mb-1">Vencimento</p>
            <p
              className={`text-sm font-medium font-mono ${
                urgency === 'red'
                  ? 'text-red-600'
                  : urgency === 'yellow'
                  ? 'text-amber-600'
                  : 'text-gray-700'
              }`}
            >
              {formatDate(doc.dataVencimento)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-[0.08em] mb-1">Valor</p>
            <p className="text-sm text-gray-700 font-medium font-mono">{formatCurrency(doc.valor)}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-[0.08em] mb-2">Partes Envolvidas</p>
            <ul className="space-y-1">
              {doc.partes.map((parte) => (
                <li key={parte} className="text-sm text-gray-700 flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-gray-300 flex-shrink-0" />
                  {parte}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-5 border-t border-black/[0.06] flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <span className="text-xs text-gray-500 whitespace-nowrap">Alterar status:</span>
          <select
            value={currentStatus}
            onChange={(e) => handleStatusChange(e.target.value as StatusDocumento)}
            className="text-sm border border-black/[0.08] rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0F6E8C]/20 focus:border-[#0F6E8C]/50 transition-colors flex-1"
          >
            {statusOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleArquivar}
          className="flex items-center gap-1.5 text-sm text-gray-600 font-medium px-3 py-1.5 rounded-lg border border-black/[0.08] hover:bg-gray-50 transition-colors"
        >
          <Archive size={13} />
          Arquivar
        </button>
        <button
          onClick={handleDownload}
          className="flex items-center gap-1.5 text-sm text-[#0F6E8C] font-medium px-3 py-1.5 rounded-lg border border-[#0F6E8C]/20 hover:bg-[#0F6E8C]/[0.04] transition-colors"
        >
          <Download size={13} />
          Download
        </button>
      </div>
    </Modal>
  )
}
