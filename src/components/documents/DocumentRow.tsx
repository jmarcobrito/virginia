import { MessageCircle } from 'lucide-react'
import { StatusBadge, TipoBadge } from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'
import type { Documento } from '@/types'

interface DocumentRowProps {
  document: Documento
  onClick: (doc: Documento) => void
}

export function DocumentRow({ document: doc, onClick }: DocumentRowProps) {
  return (
    <tr
      onClick={() => onClick(doc)}
      className="cursor-pointer hover:bg-gray-50/60 transition-colors duration-150 group"
    >
      <td className="py-3 pr-4 border-b border-black/[0.04]">
        <span className="text-gray-800 font-medium group-hover:text-[#0F6E8C] transition-colors line-clamp-1 max-w-xs block">
          {doc.nome}
        </span>
      </td>
      <td className="py-3 pr-4 border-b border-black/[0.04]">
        <TipoBadge tipo={doc.tipo} />
      </td>
      <td className="py-3 pr-4 border-b border-black/[0.04]">
        <StatusBadge status={doc.status} />
      </td>
      <td className="py-3 pr-4 border-b border-black/[0.04] text-gray-500 text-xs whitespace-nowrap">
        {formatDate(doc.dataRecebimento)}
      </td>
      <td className="py-3 border-b border-black/[0.04]">
        {doc.origem === 'whatsapp' ? (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
            <MessageCircle size={10} />
            WhatsApp
          </span>
        ) : (
          <span className="inline-flex items-center text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
            Manual
          </span>
        )}
      </td>
    </tr>
  )
}
