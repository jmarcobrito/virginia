import { NavLink, useNavigate } from 'react-router-dom'
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
  Users,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDocuments } from '@/hooks/useDocuments'
import { useAuth } from '@/contexts/AuthContext'
import type { LucideIcon } from 'lucide-react'

interface NavItem {
  to: string
  icon: LucideIcon
  label: string
  end: boolean
  badge?: 'pending' | 'alerts'
}

const baseNavItems: NavItem[] = [
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

const adminNavItem: NavItem = { to: '/admin/usuarios', icon: Users, label: 'Administração', end: false }

export function Sidebar() {
  const { pendingCount, expiringSoonCount } = useDocuments()
  const { user, isAdmin, logout } = useAuth()
  const navigate = useNavigate()

  const navItems = isAdmin ? [...baseNavItems, adminNavItem] : baseNavItems

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário'
  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

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

      <nav className="flex-1 px-2.5 py-4 space-y-0.5 overflow-y-auto">
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

      <div className="border-t border-black/[0.06]">
        <button
          onClick={() => navigate('/perfil')}
          className="w-full px-4 py-3.5 flex items-center gap-2.5 hover:bg-black/[0.03] transition-colors text-left"
        >
          <div className="w-8 h-8 rounded-full bg-[#0F6E8C]/15 flex items-center justify-center flex-shrink-0">
            <span className="text-[11px] font-semibold text-[#0F6E8C]">{initials}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-gray-700 truncate">{displayName}</p>
            <p className="text-[10px] text-gray-400 truncate">{user?.email}</p>
          </div>
        </button>
        <button
          onClick={logout}
          className="w-full px-4 py-2.5 flex items-center gap-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50/50 transition-colors text-xs border-t border-black/[0.04]"
        >
          <LogOut size={13} />
          Sair
        </button>
      </div>
    </aside>
  )
}
