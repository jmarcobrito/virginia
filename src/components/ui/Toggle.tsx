import { cn } from '@/lib/utils'

interface ToggleProps {
  enabled: boolean
  onChange: (val: boolean) => void
  label: string
  description?: string
}

export function Toggle({ enabled, onChange, label, description }: ToggleProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-gray-800">{label}</p>
        {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
      </div>
      <button
        role="switch"
        aria-checked={enabled}
        onClick={() => onChange(!enabled)}
        className={cn(
          'relative w-10 h-5.5 rounded-full transition-colors duration-200 flex-shrink-0',
          enabled ? 'bg-[#0F6E8C]' : 'bg-gray-200'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full shadow-sm transition-transform duration-200',
            enabled ? 'translate-x-[18px]' : 'translate-x-0.5'
          )}
        />
      </button>
    </div>
  )
}
