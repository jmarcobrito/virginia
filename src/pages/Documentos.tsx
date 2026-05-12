import { useState, useEffect, useRef } from 'react'
import { isAfter, parseISO, subDays } from 'date-fns'
import { Eye, Download, MoreHorizontal, ChevronUp, ChevronDown, MessageCircle, Upload } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { FilterBar } from '@/components/ui/FilterBar'
import { Pagination, PAGE_SIZE } from '@/components/ui/Pagination'
import { StatusBadge, TipoBadge } from '@/components/ui/Badge'
import { DocumentModal } from '@/components/documents/DocumentModal'
import { useDocuments } from '@/hooks/useDocuments'
import { useApp } from '@/context/AppContext'
import { formatDate, getDaysUntil, cn } from '@/lib/utils'
import type { Documento, DocumentFilters, StatusDocumento } from '@/types'

type SortKey = 'nome' | 'dataRecebimento' | 'dataVencimento' | 'tipo' | 'status'

const SORTABLE_HEADERS: { label: string; key: SortKey | null }[] = [
  { label: 'Nome', key: 'nome' },
  { label: 'Tipo', key: 'tipo' },
  { label: 'Status', key: 'status' },
  { label: 'Origem', key: null },
  { label: 'Recebimento', key: 'dataRecebimento' },
  { label: 'Vencimento', key: 'dataVencimento' },
  { label: 'Ações', key: null },
]

const DEFAULT_FILTERS: DocumentFilters = {
  tipo: 'todos',
  status: 'todos',
  periodo: 'todos',
  origem: 'todos',
  search: '',
}

function VencimentoCell({ dataVencimento }: { dataVencimento: string | null }) {
  if (!dataVencimento) return <span className="text-gray-300 font-mono text-xs">—</span>
  const days = getDaysUntil(dataVencimento)
  const dateStr = formatDate(dataVencimento)
  if (days === null) return <span className="text-gray-500 font-mono text-xs">{dateStr}</span>
  if (days <= 7) return <span className="text-red-600 font-mono text-xs font-medium">{dateStr}</span>
  if (days <= 30) return <span className="text-amber-600 font-mono text-xs font-medium">{dateStr}</span>
  return <span className="text-gray-500 font-mono text-xs">{dateStr}</span>
}

function ActionsMenu({ doc, onView }: { doc: Documento; onView: (d: Documento) => void }) {
  const [open, setOpen] = useState(false)
  const { updateDocumentStatus, showToast } = useApp()
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div className="flex items-center gap-1 relative" ref={menuRef}>
      <button
        onClick={(e) => { e.stopPropagation(); onView(doc) }}
        className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
        title="Ver detalhes"
      >
        <Eye size={13} />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); showToast('Funcionalidade em desenvolvimento') }}
        className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
        title="Download"
      >
        <Download size={13} />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v) }}
        className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
        title="Mais opções"
      >
        <MoreHorizontal size={13} />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-20 w-44 bg-white border border-black/[0.08] rounded-lg shadow-lg overflow-hidden">
          <button
            onClick={(e) => { e.stopPropagation(); setOpen(false); onView(doc) }}
            className="w-full text-left text-xs text-gray-700 px-3 py-2.5 hover:bg-gray-50 transition-colors"
          >
            Ver detalhes
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setOpen(false)
              onView(doc)
            }}
            className="w-full text-left text-xs text-gray-700 px-3 py-2.5 hover:bg-gray-50 transition-colors"
          >
            Alterar status
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setOpen(false)
              updateDocumentStatus(doc.id, 'arquivado' as StatusDocumento)
              showToast('Documento arquivado')
            }}
            className="w-full text-left text-xs text-red-600 px-3 py-2.5 hover:bg-red-50 transition-colors"
          >
            Arquivar
          </button>
        </div>
      )}
    </div>
  )
}

export default function Documentos() {
  const { all } = useDocuments()
  const [filters, setFilters] = useState<DocumentFilters>(DEFAULT_FILTERS)
  const [page, setPage] = useState(1)
  const [selectedDoc, setSelectedDoc] = useState<Documento | null>(null)
  const [sortBy, setSortBy] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  useEffect(() => {
    setPage(1)
  }, [filters])

  function handleSort(key: SortKey | null) {
    if (!key) return
    if (sortBy === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(key)
      setSortDir('asc')
    }
    setPage(1)
  }

  const filtered = all.filter((doc) => {
    if (filters.tipo !== 'todos' && doc.tipo !== filters.tipo) return false
    if (filters.status !== 'todos' && doc.status !== filters.status) return false
    if (filters.origem !== 'todos' && doc.origem !== filters.origem) return false
    if (filters.periodo !== 'todos') {
      const days = filters.periodo === '7d' ? 7 : filters.periodo === '30d' ? 30 : 90
      if (!isAfter(parseISO(doc.dataRecebimento), subDays(new Date(), days))) return false
    }
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase()
      const haystack = [doc.nome, doc.tipo, doc.resumo, ...doc.partes, ...doc.tags]
        .join(' ')
        .toLowerCase()
      if (!haystack.includes(q)) return false
    }
    return true
  })

  const sorted = sortBy
    ? [...filtered].sort((a, b) => {
        const av = a[sortBy] ?? ''
        const bv = b[sortBy] ?? ''
        const cmp = String(av).localeCompare(String(bv), 'pt-BR')
        return sortDir === 'asc' ? cmp : -cmp
      })
    : filtered

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="p-7">
      <div className="mb-7">
        <h1 className="text-xl font-semibold text-gray-900">Documentos</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {filtered.length} documento{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
        </p>
      </div>

      <Card>
        <div className="mb-5">
          <FilterBar filters={filters} onChange={setFilters} showSearch />
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                {SORTABLE_HEADERS.map(({ label, key }) => (
                  <th
                    key={label}
                    onClick={() => handleSort(key)}
                    className={cn(
                      'text-left text-[10px] font-semibold text-gray-400 uppercase tracking-[0.08em] pb-3 pr-4 border-b border-black/[0.06]',
                      key ? 'cursor-pointer hover:text-gray-600 transition-colors select-none' : ''
                    )}
                  >
                    <span className="inline-flex items-center gap-1">
                      {label}
                      {key && sortBy === key && (
                        sortDir === 'asc'
                          ? <ChevronUp size={10} />
                          : <ChevronDown size={10} />
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={SORTABLE_HEADERS.length} className="py-12 text-center">
                    <p className="text-sm text-gray-500 font-medium">Nenhum documento encontrado</p>
                    <p className="text-xs text-gray-400 mt-1">Tente ajustar os filtros selecionados</p>
                  </td>
                </tr>
              ) : (
                paginated.map((doc) => (
                  <tr
                    key={doc.id}
                    onClick={() => setSelectedDoc(doc)}
                    className="cursor-pointer hover:bg-[#F8F8F6] transition-colors duration-100 group"
                  >
                    <td className="py-3 pr-4 border-b border-black/[0.04]">
                      <span className="text-gray-800 font-medium group-hover:text-[#0F6E8C] transition-colors line-clamp-1 max-w-[220px] block">
                        {doc.nome}
                      </span>
                    </td>
                    <td className="py-3 pr-4 border-b border-black/[0.04]">
                      <TipoBadge tipo={doc.tipo} />
                    </td>
                    <td className="py-3 pr-4 border-b border-black/[0.04]">
                      <StatusBadge status={doc.status} />
                    </td>
                    <td className="py-3 pr-4 border-b border-black/[0.04]">
                      {doc.origem === 'whatsapp' ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                          <MessageCircle size={10} />
                          WhatsApp
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                          <Upload size={10} />
                          Manual
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-4 border-b border-black/[0.04] text-gray-500 font-mono text-xs whitespace-nowrap">
                      {formatDate(doc.dataRecebimento)}
                    </td>
                    <td className="py-3 pr-4 border-b border-black/[0.04] whitespace-nowrap">
                      <VencimentoCell dataVencimento={doc.dataVencimento} />
                    </td>
                    <td className="py-3 border-b border-black/[0.04]" onClick={(e) => e.stopPropagation()}>
                      <ActionsMenu doc={doc} onView={setSelectedDoc} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4">
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </Card>

      <DocumentModal
        document={selectedDoc}
        isOpen={selectedDoc !== null}
        onClose={() => setSelectedDoc(null)}
      />
    </div>
  )
}
