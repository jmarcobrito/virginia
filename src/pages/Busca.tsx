import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Table } from '@/components/ui/Table'
import { DocumentRow } from '@/components/documents/DocumentRow'
import { DocumentModal } from '@/components/documents/DocumentModal'
import { useDocuments } from '@/hooks/useDocuments'
import type { Documento } from '@/types'

const TABLE_HEADERS = ['Nome', 'Tipo', 'Status', 'Recebimento', 'Origem']

export default function Busca() {
  const { all } = useDocuments()
  const [query, setQuery] = useState('')
  const [selectedDoc, setSelectedDoc] = useState<Documento | null>(null)

  const results = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    return all.filter((d) => {
      const haystack = [
        d.nome,
        d.tipo,
        d.resumo,
        ...d.partes,
        ...d.tags,
      ].join(' ').toLowerCase()
      return haystack.includes(q)
    })
  }, [query, all])

  const hasQuery = query.trim().length > 0

  return (
    <div className="p-8">
      <div className="mb-7">
        <h1 className="text-xl font-semibold text-gray-900">Busca</h1>
        <p className="text-sm text-gray-400 mt-0.5">Pesquise em todos os documentos</p>
      </div>

      <Card className="mb-5">
        <div className="flex items-center gap-3">
          <Search size={18} className="text-gray-300 flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Busque por nome, tipo, partes, tags, resumo..."
            className="flex-1 text-base text-gray-800 placeholder:text-gray-300 focus:outline-none bg-transparent"
            autoFocus
          />
          {hasQuery && (
            <button
              onClick={() => setQuery('')}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Limpar
            </button>
          )}
        </div>
      </Card>

      {!hasQuery && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <Search size={20} className="text-gray-400" />
          </div>
          <p className="text-gray-500 font-medium">Digite para buscar documentos</p>
          <p className="text-sm text-gray-400 mt-1">
            Filtra por nome, tipo, partes envolvidas, tags e resumo
          </p>
        </div>
      )}

      {hasQuery && results.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-gray-500 font-medium">Nenhum resultado para "{query}"</p>
          <p className="text-sm text-gray-400 mt-1">Tente outros termos de busca.</p>
        </div>
      )}

      {hasQuery && results.length > 0 && (
        <Card>
          <p className="text-xs text-gray-400 mb-4">
            {results.length} resultado{results.length !== 1 ? 's' : ''} para &ldquo;{query}&rdquo;
          </p>
          <Table headers={TABLE_HEADERS}>
            {results.map((doc) => (
              <DocumentRow key={doc.id} document={doc} onClick={setSelectedDoc} />
            ))}
          </Table>
        </Card>
      )}

      <DocumentModal
        document={selectedDoc}
        isOpen={selectedDoc !== null}
        onClose={() => setSelectedDoc(null)}
      />
    </div>
  )
}
