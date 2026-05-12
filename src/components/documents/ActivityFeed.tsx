import { formatDistanceToNow, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Documento } from '@/types'

interface ActivityFeedProps {
  documents: Documento[]
}

export function ActivityFeed({ documents }: ActivityFeedProps) {
  const recent = [...documents]
    .sort((a, b) => parseISO(b.dataRecebimento).getTime() - parseISO(a.dataRecebimento).getTime())
    .slice(0, 8)

  return (
    <div className="space-y-0 max-h-[320px] overflow-y-auto pr-1">
      {recent.map((doc, idx) => (
        <div key={doc.id} className="flex gap-3 pb-4 relative">
          {idx < recent.length - 1 && (
            <div className="absolute left-[11px] top-7 bottom-0 w-px bg-gray-100" />
          )}
          <div className="flex-shrink-0 mt-1 z-10">
            <span
              className="block w-[6px] h-[6px] rounded-full mt-1.5"
              style={{
                backgroundColor: doc.origem === 'whatsapp' ? '#25D366' : '#0F6E8C',
              }}
            />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-xs text-gray-700 font-medium line-clamp-1 leading-tight">
              {doc.nome}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">
              Recebido via {doc.origem === 'whatsapp' ? 'WhatsApp' : 'manual'}
            </p>
            <p className="font-mono text-[10px] text-gray-300 mt-0.5">
              {formatDistanceToNow(parseISO(doc.dataRecebimento), {
                locale: ptBR,
                addSuffix: true,
              })}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
