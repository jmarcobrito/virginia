import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  FolderOpen,
  Clock,
  Bell,
  Search,
  Settings,
  FileText,
  CreditCard,
  Receipt,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDocuments } from '@/hooks/useDocuments'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Visão Geral', end: true },
  { to: '/documentos', icon: FolderOpen, label: 'Documentos', end: false },
  { to: '/contratos', icon: FileText, label: 'Contratos', end: false },
  { to: '/cheques', icon: CreditCard, label: 'Cheques', end: false },
  { to: '/pagamentos', icon: Receipt, label: 'Pagamentos', end: false },
  { to: '/pendentes', icon: Clock, label: 'Pendentes', end: false, badge: 'pending' as const },
  { to: '/alertas', icon: Bell, label: 'Alertas', end: false, badge: 'alerts' as const },
  { to: '/busca', icon: Search, label: 'Busca', end: false },
  { to: '/configuracoes', icon: Settings, label: 'Configurações', end: false },
]

export function Sidebar() {
  const { pendingCount, expiringSoonCount } = useDocuments()

  const getBadgeCount = (badge?: 'pending' | 'alerts') => {
    if (badge === 'pending') return pendingCount
    if (badge === 'alerts') return expiringSoonCount
    return 0
  }

  return (
    <aside className="w-[220px] h-full flex-shrink-0 bg-[#F8F8F6] border-r border-black/[0.06] flex flex-col">
      <div className="px-5 pt-6 pb-5 border-b border-black/[0.06]">
        <div className="flex items-baseline gap-2">
          <span className="text-[20px] font-semibold text-[#0F6E8C] tracking-tight">Virgínia</span>
        </div>
        <p className="text-[11px] text-gray-400 mt-0.5 font-medium tracking-wide uppercase">
          Grupo Monarca
        </p>
      </div>

      <nav className="flex-1 px-2.5 py-4 space-y-0.5">
        {navItems.map(({ to, icon: Icon, label, end, badge }) => {
          const count = getBadgeCount(badge)
          return (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors duration-150 group',
                  isActive
                    ? 'bg-[#0F6E8C]/[0.08] text-[#0F6E8C] font-medium'
                    : 'text-gray-500 hover:bg-black/[0.04] hover:text-gray-700'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={15}
                    className={cn(
                      'flex-shrink-0',
                      isActive ? 'text-[#0F6E8C]' : 'text-gray-400 group-hover:text-gray-500'
                    )}
                  />
                  <span className="flex-1">{label}</span>
                  {badge && count > 0 && (
                    <span
                      className={cn(
                        'text-[10px] font-semibold px-1.5 py-0.5 rounded-full min-w-[18px] text-center',
                        isActive
                          ? 'bg-[#0F6E8C] text-white'
                          : 'bg-gray-200 text-gray-600'
                      )}
                    >
                      {count}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      <div className="px-4 py-4 border-t border-black/[0.06] flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-[#0F6E8C]/15 flex items-center justify-center flex-shrink-0">
          <span className="text-[11px] font-semibold text-[#0F6E8C]">MC</span>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-700 truncate">Mariana Costa</p>
          <p className="text-[10px] text-gray-400">Assistente</p>
        </div>
      </div>
    </aside>
  )
}
