import { useState } from 'react'
import { CheckCircle } from 'lucide-react'
import { DocumentModal } from '@/components/documents/DocumentModal'
import { TipoBadge } from '@/components/ui/Badge'
import { useDocuments } from '@/hooks/useDocuments'
import { useApp } from '@/context/AppContext'
import { getDaysUntil, formatDate } from '@/lib/utils'
import type { Documento } from '@/types'

function DaysChip({ days, variant }: { days: number; variant: 'red' | 'amber' }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs border ${
        variant === 'red'
          ? 'bg-red-50 border-red-200 text-red-700'
          : 'bg-amber-50 border-amber-200 text-amber-700'
      }`}
    >
      <span className="font-mono font-medium">{days < 0 ? 'Vencido' : days === 0 ? 'Hoje' : `${days}d`}</span>
    </span>
  )
}

function PendenteCard({
  doc,
  variant,
  onView,
  onResolve,
}: {
  doc: Documento
  variant: 'red' | 'amber' | 'neutral'
  onView: (d: Documento) => void
  onResolve: (d: Documento) => void
}) {
  const days = getDaysUntil(doc.dataVencimento)

  return (
    <div
      className={`p-4 rounded-xl border flex items-start gap-4 ${
        variant === 'red'
          ? 'border-l-[3px] border-l-[#E06060] border-r border-t border-b border-red-100 bg-[#FFF5F5]'
          : variant === 'amber'
          ? 'border-l-[3px] border-l-[#E6A84A] border-r border-t border-b border-amber-100 bg-[#FFFBF0]'
          : 'border border-black/[0.06] bg-white'
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 line-clamp-1">{doc.nome}</p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <TipoBadge tipo={doc.tipo} />
              <span className="text-[10px] text-gray-400 font-mono">{formatDate(doc.dataRecebimento)}</span>
              {days !== null && (
                <DaysChip days={days} variant={variant === 'red' ? 'red' : 'amber'} />
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1.5 line-clamp-1">{doc.resumo}</p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => onView(doc)}
          className="text-xs text-[#0F6E8C] font-medium px-2.5 py-1.5 rounded-lg border border-[#0F6E8C]/20 hover:bg-[#0F6E8C]/[0.04] transition-colors whitespace-nowrap"
        >
          Ver detalhes
        </button>
        <button
          onClick={() => onResolve(doc)}
          className="text-xs text-white font-medium px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 transition-colors whitespace-nowrap"
        >
          Marcar resolvido
        </button>
      </div>
    </div>
  )
}

export default function Pendentes() {
  const { pending } = useDocuments()
  const { updateDocumentStatus, showToast } = useApp()
  const [selectedDoc, setSelectedDoc] = useState<Documento | null>(null)

  const urgente = pending.filter((d) => {
    const days = getDaysUntil(d.dataVencimento)
    return days !== null && days <= 7
  })

  const atencao = pending.filter((d) => {
    const days = getDaysUntil(d.dataVencimento)
    return days !== null && days > 7 && days <= 30
  })

  const semPrazo = pending.filter((d) => getDaysUntil(d.dataVencimento) === null)

  function handleResolve(doc: Documento) {
    updateDocumentStatus(doc.id, 'assinado')
    showToast(`"${doc.nome.slice(0, 40)}..." marcado como resolvido`)
  }

  if (pending.length === 0) {
    return (
      <div className="p-7">
        <div className="mb-7">
          <h1 className="text-xl font-semibold text-gray-900">Pendentes</h1>
          <p className="text-sm text-gray-400 mt-0.5">Documentos aguardando ação</p>
        </div>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
            <CheckCircle size={22} className="text-emerald-500" />
          </div>
          <p className="text-gray-700 font-medium">Nenhum documento pendente</p>
          <p className="text-sm text-gray-400 mt-1">Todos os documentos estão em dia.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-7">
      <div className="mb-7">
        <h1 className="text-xl font-semibold text-gray-900">Pendentes</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {pending.length} documento{pending.length !== 1 ? 's' : ''} aguardando ação
        </p>
      </div>

      <div className="space-y-7">
        {urgente.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-[#E06060]" />
              <h2 className="text-sm font-semibold text-red-600">
                Urgente — vence em até 7 dias
                <span className="ml-2 font-mono text-[11px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded">
                  {urgente.length}
                </span>
              </h2>
            </div>
            <div className="space-y-2.5">
              {urgente.map((doc) => (
                <PendenteCard
                  key={doc.id}
                  doc={doc}
                  variant="red"
                  onView={setSelectedDoc}
                  onResolve={handleResolve}
                />
              ))}
            </div>
          </section>
        )}

        {atencao.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-[#E6A84A]" />
              <h2 className="text-sm font-semibold text-amber-600">
                Atenção — vence em 8 a 30 dias
                <span className="ml-2 font-mono text-[11px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded">
                  {atencao.length}
                </span>
              </h2>
            </div>
            <div className="space-y-2.5">
              {atencao.map((doc) => (
                <PendenteCard
                  key={doc.id}
                  doc={doc}
                  variant="amber"
                  onView={setSelectedDoc}
                  onResolve={handleResolve}
                />
              ))}
            </div>
          </section>
        )}

        {semPrazo.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-gray-300" />
              <h2 className="text-sm font-semibold text-gray-500">
                Sem prazo definido
                <span className="ml-2 font-mono text-[11px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                  {semPrazo.length}
                </span>
              </h2>
            </div>
            <div className="space-y-2.5">
              {semPrazo.map((doc) => (
                <PendenteCard
                  key={doc.id}
                  doc={doc}
                  variant="neutral"
                  onView={setSelectedDoc}
                  onResolve={handleResolve}
                />
              ))}
            </div>
          </section>
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
