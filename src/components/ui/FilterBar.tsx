import type { DocumentFilters, TipoDocumento, StatusDocumento } from '@/types'

interface FilterBarProps {
  filters: DocumentFilters
  onChange: (f: DocumentFilters) => void
  showSearch?: boolean
}

const DEFAULT_FILTERS: DocumentFilters = {
  tipo: 'todos',
  status: 'todos',
  periodo: 'todos',
  origem: 'todos',
  search: '',
}

const tipoOptions: { value: TipoDocumento | 'todos'; label: string }[] = [
  { value: 'todos', label: 'Todos os tipos' },
  { value: 'contrato', label: 'Contrato' },
  { value: 'nota_fiscal', label: 'Nota Fiscal' },
  { value: 'procuracao', label: 'Procuração' },
  { value: 'escritura', label: 'Escritura' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'orcamento', label: 'Orçamento' },
  { value: 'outro', label: 'Outro' },
]

const statusOptions: { value: StatusDocumento | 'todos'; label: string }[] = [
  { value: 'todos', label: 'Todos os status' },
  { value: 'recebido', label: 'Recebido' },
  { value: 'em_revisao', label: 'Em Revisão' },
  { value: 'pendente_assinatura', label: 'Pendente Assinatura' },
  { value: 'assinado', label: 'Assinado' },
  { value: 'arquivado', label: 'Arquivado' },
]

const periodoOptions = [
  { value: 'todos', label: 'Qualquer período' },
  { value: '7d', label: 'Últimos 7 dias' },
  { value: '30d', label: 'Últimos 30 dias' },
  { value: '90d', label: 'Últimos 90 dias' },
]

const origemOptions = [
  { value: 'todos', label: 'Todas as origens' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'manual', label: 'Manual' },
]

const selectClass =
  'text-sm border border-black/[0.08] rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0F6E8C]/20 focus:border-[#0F6E8C]/50 transition-colors'

function isFiltersActive(filters: DocumentFilters): boolean {
  return (
    filters.tipo !== 'todos' ||
    filters.status !== 'todos' ||
    filters.periodo !== 'todos' ||
    filters.origem !== 'todos' ||
    filters.search.trim() !== ''
  )
}

export function FilterBar({ filters, onChange, showSearch = false }: FilterBarProps) {
  const active = isFiltersActive(filters)

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={filters.tipo}
        onChange={(e) => onChange({ ...filters, tipo: e.target.value as TipoDocumento | 'todos' })}
        className={selectClass}
      >
        {tipoOptions.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      <select
        value={filters.status}
        onChange={(e) => onChange({ ...filters, status: e.target.value as StatusDocumento | 'todos' })}
        className={selectClass}
      >
        {statusOptions.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      <select
        value={filters.periodo}
        onChange={(e) => onChange({ ...filters, periodo: e.target.value as DocumentFilters['periodo'] })}
        className={selectClass}
      >
        {periodoOptions.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      <select
        value={filters.origem}
        onChange={(e) => onChange({ ...filters, origem: e.target.value as DocumentFilters['origem'] })}
        className={selectClass}
      >
        {origemOptions.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      {showSearch && (
        <input
          type="text"
          placeholder="Buscar..."
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          className={`${selectClass} flex-1 min-w-[180px]`}
        />
      )}

      {active && (
        <button
          onClick={() => onChange(DEFAULT_FILTERS)}
          className="text-sm text-[#0F6E8C] font-medium px-3 py-2 rounded-lg hover:bg-[#0F6E8C]/[0.06] transition-colors"
        >
          Limpar filtros
        </button>
      )}
    </div>
  )
}
