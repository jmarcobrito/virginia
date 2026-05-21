import { useState, useEffect, useRef } from 'react'
import { Search } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Table } from '@/components/ui/Table'
import { DocumentRow } from '@/components/documents/DocumentRow'
import { DocumentModal } from '@/components/documents/DocumentModal'
import { api } from '@/lib/api'
import type { Documento } from '@/types'

const TABLE_HEADERS = ['Nome', 'Tipo', 'Status', 'Recebimento', 'Origem']

export default function Busca() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Documento[]>([])
  const [mode, setMode] = useState<'semantic' | 'text' | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState<Documento | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!query.trim() || query.trim().length < 2) {
      setResults([])
      setMode(null)
      return
    }

    setIsSearching(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await api.search(query.trim())
        setResults(data.results)
        setMode(data.mode as 'semantic' | 'text')
      } catch {
        setResults([])
        setMode(null)
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

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
              onClick={() => { setQuery(''); setResults([]); setMode(null) }}
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
            Busca semântica por linguagem natural ou filtro por nome, tipo e partes
          </p>
        </div>
      )}

      {hasQuery && isSearching && (
        <div className="flex items-center justify-center py-16">
          <p className="text-sm text-gray-400">Buscando...</p>
        </div>
      )}

      {hasQuery && !isSearching && results.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-gray-500 font-medium">Nenhum resultado para "{query}"</p>
          <p className="text-sm text-gray-400 mt-1">Tente outros termos de busca.</p>
        </div>
      )}

      {hasQuery && !isSearching && results.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-gray-400">
              {results.length} resultado{results.length !== 1 ? 's' : ''} para &ldquo;{query}&rdquo;
            </p>
            {mode && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">
                {mode === 'semantic' ? 'busca semântica' : 'busca textual'}
              </span>
            )}
          </div>
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
