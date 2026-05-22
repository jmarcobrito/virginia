import { useState } from 'react'
import { Bell, AlertTriangle, Clock } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Toggle } from '@/components/ui/Toggle'
import { TipoBadge } from '@/components/ui/Badge'
import { DocumentModal } from '@/components/documents/DocumentModal'
import { useDocuments } from '@/hooks/useDocuments'
import { useApp } from '@/context/AppContext'
import { getDaysUntil, formatDate } from '@/lib/utils'
import type { Documento } from '@/types'

function AlertCard({
  doc,
  onView,
}: {
  doc: Documento
  onView: (d: Documento) => void
}) {
  const days = getDaysUntil(doc.dataVencimento)
  const isUrgent = days !== null && days <= 7

  return (
    <div
      className={`flex items-start gap-4 p-4 rounded-xl border ${
        isUrgent
          ? 'border-red-100 bg-[#FFF5F5] border-l-[3px] border-l-[#E06060]'
          : 'border-amber-100 bg-[#FFFBF0] border-l-[3px] border-l-[#E6A84A]'
      }`}
    >
      <div
        className={`flex flex-col items-center justify-center flex-shrink-0 w-12 ${
          isUrgent ? 'text-red-600' : 'text-amber-600'
        }`}
      >
        <span className="font-mono text-2xl font-medium leading-none">
          {days === null ? '—' : days < 0 ? '0' : String(days)}
        </span>
        <span className="text-[9px] uppercase tracking-wide mt-0.5 font-medium opacity-70">dias</span>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 line-clamp-1">{doc.nome}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <TipoBadge tipo={doc.tipo} />
          <span className={`text-xs font-medium font-mono ${isUrgent ? 'text-red-600' : 'text-amber-600'}`}>
            {formatDate(doc.dataVencimento)}
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-0.5 truncate">{doc.partes[0]}</p>
      </div>

      <button
        onClick={() => onView(doc)}
        className="text-xs text-[#0F6E8C] font-medium px-2.5 py-1.5 rounded-lg border border-[#0F6E8C]/20 hover:bg-[#0F6E8C]/[0.04] transition-colors flex-shrink-0"
      >
        Ver documento
      </button>
    </div>
  )
}

export default function Alertas() {
  const { expiringSoon, expiringUrgent } = useDocuments()
  const {
    whatsappAlertsEnabled,
    setWhatsappAlertsEnabled,
    alertVencendo30,
    setAlertVencendo30,
    alertVencendo7,
    setAlertVencendo7,
    alertNovosDocumentos,
    setAlertNovosDocumentos,
  } = useApp()
  const [selectedDoc, setSelectedDoc] = useState<Documento | null>(null)

  const urgentDocs = expiringUrgent
  const soonDocs = expiringSoon.filter((d) => !urgentDocs.some((u) => u.id === d.id))
  const totalAlertas = expiringSoon.length

  return (
    <div className="p-7">
      <div className="mb-7">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-gray-900">Alertas</h1>
          {totalAlertas > 0 && (
            <span className="font-mono text-xs bg-[#0F6E8C]/[0.08] text-[#0F6E8C] px-2 py-0.5 rounded-full font-medium">
              {totalAlertas} ativo{totalAlertas !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-400 mt-0.5">
          {expiringSoon.length} documento{expiringSoon.length !== 1 ? 's' : ''} com vencimento próximo
        </p>
      </div>

      <div className="space-y-5">
        <Card>
          <div className="flex items-start gap-4">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
              <Bell size={16} className="text-emerald-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-800">Alertas via WhatsApp</p>
                  <p className="text-xs text-gray-400 mt-0.5">Receba notificações sobre vencimentos no WhatsApp da empresa</p>
                </div>
                <Toggle checked={whatsappAlertsEnabled} onChange={setWhatsappAlertsEnabled} />
              </div>
              <div className="flex items-center gap-2 mt-3">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full border ${
                    whatsappAlertsEnabled
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-gray-100 text-gray-500 border-gray-200'
                  }`}
                >
                  {whatsappAlertsEnabled ? 'Alertas via WhatsApp ativos' : 'Alertas via WhatsApp desativados'}
                </span>
              </div>

              {whatsappAlertsEnabled && (
                <div className="mt-4 pt-4 border-t border-black/[0.06] space-y-3">
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
          </div>
        </Card>

        {urgentDocs.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={14} className="text-red-500" />
              <h2 className="text-sm font-semibold text-red-600">
                Crítico — menos de 7 dias ({urgentDocs.length})
              </h2>
            </div>
            <div className="space-y-2.5">
              {urgentDocs.map((doc) => (
                <AlertCard key={doc.id} doc={doc} onView={setSelectedDoc} />
              ))}
            </div>
          </div>
        )}

        {soonDocs.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Clock size={14} className="text-amber-500" />
              <h2 className="text-sm font-semibold text-amber-600">
                Atenção — até 30 dias ({soonDocs.length})
              </h2>
            </div>
            <div className="space-y-2.5">
              {soonDocs.map((doc) => (
                <AlertCard key={doc.id} doc={doc} onView={setSelectedDoc} />
              ))}
            </div>
          </div>
        )}

        {expiringSoon.length === 0 && (
          <Card>
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
                <Bell size={18} className="text-emerald-500" />
              </div>
              <p className="text-sm font-medium text-gray-700">Nenhum alerta no momento</p>
              <p className="text-xs text-gray-400 mt-1">Todos os documentos estão com vencimento seguro.</p>
            </div>
          </Card>
        )}
      </div>

      <DocumentModal
        document={selectedDoc}
        isOpen={selectedDoc !== null}
        onClose={() => setSelectedDoc(null)}
      />
    </div>
  )
}
