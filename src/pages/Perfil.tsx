import { useState } from 'react'
import { User, Lock, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { useAuth } from '@/contexts/AuthContext'
import { useApp } from '@/context/AppContext'
import { supabase } from '@/lib/supabase'

export default function Perfil() {
  const { user } = useAuth()
  const { showToast } = useApp()

  const [name, setName] = useState(user?.user_metadata?.full_name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [savingInfo, setSavingInfo] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário'
  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  async function handleSaveInfo(e: React.FormEvent) {
    e.preventDefault()
    setSavingInfo(true)
    const updates: Parameters<typeof supabase.auth.updateUser>[0] = {
      data: { full_name: name },
    }
    if (email !== user?.email) updates.email = email
    const { error } = await supabase.auth.updateUser(updates)
    setSavingInfo(false)
    if (error) showToast('Erro: ' + error.message)
    else showToast('Informações atualizadas')
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      showToast('As senhas não coincidem')
      return
    }
    if (newPassword.length < 6) {
      showToast('A senha deve ter no mínimo 6 caracteres')
      return
    }
    setSavingPassword(true)
    // Re-authenticate to validate current password
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: user?.email ?? '',
      password: currentPassword,
    })
    if (authError) {
      setSavingPassword(false)
      showToast('Senha atual incorreta')
      return
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setSavingPassword(false)
    if (error) showToast('Erro: ' + error.message)
    else {
      showToast('Senha alterada com sucesso')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    }
  }

  return (
    <div className="p-7">
      <div className="mb-7">
        <h1 className="text-xl font-semibold text-gray-900">Meu Perfil</h1>
        <p className="text-sm text-gray-400 mt-0.5">Suas informações pessoais e senha</p>
      </div>

      <div className="max-w-2xl space-y-5">
        {/* Avatar */}
        <Card>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#0F6E8C]/15 flex items-center justify-center flex-shrink-0">
              <span className="text-lg font-semibold text-[#0F6E8C]">{initials}</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">{displayName}</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
              {user?.app_metadata?.role === 'admin' && (
                <span className="mt-1 inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#0F6E8C]/[0.08] text-[#0F6E8C]">
                  Administrador
                </span>
              )}
            </div>
          </div>
        </Card>

        {/* Informações pessoais */}
        <Card>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
              <User size={15} className="text-gray-500" />
            </div>
            <h2 className="text-sm font-semibold text-gray-800">Informações pessoais</h2>
          </div>

          <form onSubmit={handleSaveInfo} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Nome completo</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-black/[0.1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F6E8C]/20 focus:border-[#0F6E8C]/40"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-black/[0.1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F6E8C]/20 focus:border-[#0F6E8C]/40"
              />
              {email !== user?.email && (
                <p className="text-[10px] text-amber-600 mt-1">
                  Você receberá um email de confirmação no novo endereço.
                </p>
              )}
            </div>
            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={savingInfo}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0F6E8C] text-white text-sm font-medium hover:bg-[#0d5f79] transition-colors disabled:opacity-60"
              >
                {savingInfo && <Loader2 size={13} className="animate-spin" />}
                Salvar informações
              </button>
            </div>
          </form>
        </Card>

        {/* Alterar senha */}
        <Card>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
              <Lock size={15} className="text-amber-500" />
            </div>
            <h2 className="text-sm font-semibold text-gray-800">Alterar senha</h2>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Senha atual</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2.5 text-sm border border-black/[0.1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F6E8C]/20 focus:border-[#0F6E8C]/40"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Nova senha</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2.5 text-sm border border-black/[0.1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F6E8C]/20 focus:border-[#0F6E8C]/40"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Confirmar nova senha</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F6E8C]/20 ${
                  confirmPassword && confirmPassword !== newPassword
                    ? 'border-red-300 focus:border-red-400'
                    : 'border-black/[0.1] focus:border-[#0F6E8C]/40'
                }`}
              />
              {confirmPassword && confirmPassword !== newPassword && (
                <p className="text-[10px] text-red-500 mt-1">As senhas não coincidem</p>
              )}
            </div>
            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={savingPassword || (!!confirmPassword && confirmPassword !== newPassword)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0F6E8C] text-white text-sm font-medium hover:bg-[#0d5f79] transition-colors disabled:opacity-60"
              >
                {savingPassword && <Loader2 size={13} className="animate-spin" />}
                Alterar senha
              </button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}
