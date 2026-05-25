import { useState, useEffect, useCallback } from 'react'
import { Plus, RefreshCw, UserCheck, UserX, KeyRound, Loader2, X, Check } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { useApp } from '@/context/AppContext'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

interface UserRecord {
  id: string
  email: string
  name: string
  role: 'admin' | 'usuario'
  created_at: string | null
  last_sign_in_at: string | null
  disabled: boolean
}

function formatDt(iso: string | null) {
  if (!iso) return '—'
  try { return format(parseISO(iso), 'dd/MM/yyyy', { locale: ptBR }) } catch { return '—' }
}

export default function Usuarios() {
  const { showToast } = useApp()
  const [users, setUsers] = useState<UserRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewModal, setShowNewModal] = useState(false)
  const [resetTarget, setResetTarget] = useState<UserRecord | null>(null)
  const [resetPassword, setResetPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // New user form
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPass, setNewPass] = useState('')
  const [newRole, setNewRole] = useState<'admin' | 'usuario'>('usuario')

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/admin/users`)
      const data = await res.json()
      setUsers(data.users ?? [])
    } catch {
      showToast('Erro ao carregar usuários')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch(`${API_BASE}/api/admin/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, email: newEmail, password: newPass, role: newRole }),
      })
      if (!res.ok) {
        const err = await res.json()
        showToast('Erro: ' + (err.detail || 'falha ao criar'))
      } else {
        showToast('Usuário criado com sucesso')
        setShowNewModal(false)
        setNewName(''); setNewEmail(''); setNewPass(''); setNewRole('usuario')
        fetchUsers()
      }
    } catch {
      showToast('Erro de conexão')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleToggle(u: UserRecord) {
    try {
      await fetch(`${API_BASE}/api/admin/users/${u.id}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disabled: !u.disabled }),
      })
      showToast(u.disabled ? 'Usuário ativado' : 'Usuário desativado')
      fetchUsers()
    } catch {
      showToast('Erro ao alterar status')
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!resetTarget) return
    setSubmitting(true)
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${resetTarget.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: resetPassword }),
      })
      if (!res.ok) showToast('Erro ao redefinir senha')
      else {
        showToast('Senha redefinida com sucesso')
        setResetTarget(null)
        setResetPassword('')
      }
    } catch {
      showToast('Erro de conexão')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-7">
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Usuários</h1>
          <p className="text-sm text-gray-400 mt-0.5">Gerenciamento de acesso ao sistema</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchUsers}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-black/[0.04] transition-colors"
          >
            <RefreshCw size={15} />
          </button>
          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0F6E8C] text-white text-sm font-medium hover:bg-[#0d5f79] transition-colors"
          >
            <Plus size={14} />
            Novo usuário
          </button>
        </div>
      </div>

      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={20} className="animate-spin text-gray-300" />
          </div>
        ) : users.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">Nenhum usuário encontrado</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/[0.06]">
                  {['Nome', 'Email', 'Papel', 'Status', 'Criado em', 'Último acesso', 'Ações'].map(h => (
                    <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400 pb-3 pr-4 last:pr-0">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04]">
                {users.map((u) => (
                  <tr key={u.id} className="group">
                    <td className="py-3 pr-4 font-medium text-gray-800">
                      {u.name || '—'}
                    </td>
                    <td className="py-3 pr-4 text-gray-500">{u.email}</td>
                    <td className="py-3 pr-4">
                      <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        u.role === 'admin'
                          ? 'bg-[#0F6E8C]/[0.08] text-[#0F6E8C]'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {u.role === 'admin' ? 'Admin' : 'Usuário'}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        u.disabled
                          ? 'bg-red-50 text-red-500'
                          : 'bg-emerald-50 text-emerald-600'
                      }`}>
                        {u.disabled ? 'Inativo' : 'Ativo'}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-gray-400 text-xs">{formatDt(u.created_at)}</td>
                    <td className="py-3 pr-4 text-gray-400 text-xs">{formatDt(u.last_sign_in_at)}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleToggle(u)}
                          title={u.disabled ? 'Ativar' : 'Desativar'}
                          className="p-1.5 rounded-lg text-gray-400 hover:bg-black/[0.04] hover:text-gray-600 transition-colors"
                        >
                          {u.disabled ? <UserCheck size={14} /> : <UserX size={14} />}
                        </button>
                        <button
                          onClick={() => { setResetTarget(u); setResetPassword('') }}
                          title="Redefinir senha"
                          className="p-1.5 rounded-lg text-gray-400 hover:bg-black/[0.04] hover:text-gray-600 transition-colors"
                        >
                          <KeyRound size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal — Novo usuário */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4">
            <div className="flex items-center justify-between px-5 py-4 border-b border-black/[0.06]">
              <p className="text-sm font-semibold text-gray-800">Novo usuário</p>
              <button onClick={() => setShowNewModal(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Nome completo</label>
                <input
                  required value={newName} onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-black/[0.1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F6E8C]/20"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Email</label>
                <input
                  type="email" required value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-black/[0.1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F6E8C]/20"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Senha temporária</label>
                <input
                  type="password" required minLength={6} value={newPass} onChange={(e) => setNewPass(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-black/[0.1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F6E8C]/20"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Papel</label>
                <select
                  value={newRole} onChange={(e) => setNewRole(e.target.value as 'admin' | 'usuario')}
                  className="w-full px-3 py-2 text-sm border border-black/[0.1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F6E8C]/20 bg-white"
                >
                  <option value="usuario">Usuário</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowNewModal(false)}
                  className="flex-1 py-2 rounded-lg border border-black/[0.08] text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 py-2 rounded-lg bg-[#0F6E8C] text-white text-sm font-medium hover:bg-[#0d5f79] disabled:opacity-60 flex items-center justify-center gap-2">
                  {submitting ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  Criar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal — Redefinir senha */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4">
            <div className="flex items-center justify-between px-5 py-4 border-b border-black/[0.06]">
              <p className="text-sm font-semibold text-gray-800">Redefinir senha</p>
              <button onClick={() => setResetTarget(null)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleResetPassword} className="p-5 space-y-4">
              <p className="text-xs text-gray-500">
                Definir nova senha para <span className="font-medium text-gray-700">{resetTarget.email}</span>
              </p>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Nova senha temporária</label>
                <input
                  type="password" required minLength={6}
                  value={resetPassword} onChange={(e) => setResetPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-black/[0.1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F6E8C]/20"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setResetTarget(null)}
                  className="flex-1 py-2 rounded-lg border border-black/[0.08] text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 py-2 rounded-lg bg-[#0F6E8C] text-white text-sm font-medium hover:bg-[#0d5f79] disabled:opacity-60 flex items-center justify-center gap-2">
                  {submitting ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
