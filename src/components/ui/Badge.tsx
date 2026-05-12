import { cn, getStatusConfig, getTipoConfig } from '@/lib/utils'
import type { StatusDocumento, TipoDocumento } from '@/types'

interface StatusBadgeProps {
  status: StatusDocumento
}

interface TipoBadgeProps {
  tipo: TipoDocumento
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = getStatusConfig(status)
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium',
        config.bg,
        config.text
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', config.dot)} />
      {config.label}
    </span>
  )
}

export function TipoBadge({ tipo }: TipoBadgeProps) {
  const config = getTipoConfig(tipo)
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200/80">
      <span className="font-mono text-[10px] font-semibold mr-1 opacity-60">{config.abbr}</span>
      {config.label}
    </span>
  )
}
