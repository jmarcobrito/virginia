import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Loader2, Mail, Lock, ArrowLeft } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

export default function Login() {
  const { user, isLoading, login } = useAuth()
  const [mode, setMode] = useState<'login' | 'forgot'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [forgotEmail, setForgotEmail] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)

  if (isLoading) return null
  if (user) return <Navigate to="/" replace />

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const { error: err } = await login(email, password)
    setSubmitting(false)
    if (err) setError('Email ou senha incorretos.')
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const { error: err } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/perfil`,
    })
    setSubmitting(false)
    if (err) setError('Não foi possível enviar o email. Verifique o endereço.')
    else setForgotSent(true)
  }

  return (
    <div className="min-h-screen bg-[#F8F8F6] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-[#0F6E8C] tracking-tight">Virgínia</h1>
          <p className="text-sm text-gray-400 mt-1 font-medium uppercase tracking-widest">
            Grupo Monarca
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-black/[0.06] p-8">
          {mode === 'login' ? (
            <>
              <h2 className="text-base font-semibold text-gray-800 mb-6">Entrar na conta</h2>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Email</label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className="w-full pl-9 pr-3 py-2.5 text-sm border border-black/[0.1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F6E8C]/20 focus:border-[#0F6E8C]/40"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Senha</label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="password"
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2.5 text-sm border border-black/[0.1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F6E8C]/20 focus:border-[#0F6E8C]/40"
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 rounded-lg bg-[#0F6E8C] text-white text-sm font-medium hover:bg-[#0d5f79] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  Entrar
                </button>
              </form>

              <div className="mt-4 text-center">
                <button
                  onClick={() => { setMode('forgot'); setError('') }}
                  className="text-xs text-[#0F6E8C] hover:underline"
                >
                  Esqueci minha senha
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                onClick={() => { setMode('login'); setError(''); setForgotSent(false) }}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 mb-5 transition-colors"
              >
                <ArrowLeft size={13} />
                Voltar
              </button>

              <h2 className="text-base font-semibold text-gray-800 mb-2">Recuperar senha</h2>
              <p className="text-xs text-gray-400 mb-6">
                Informe seu email e enviaremos um link para redefinir sua senha.
              </p>

              {forgotSent ? (
                <div className="text-center py-4">
                  <p className="text-sm font-medium text-emerald-600">Email enviado!</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Verifique sua caixa de entrada.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleForgot} className="space-y-4">
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className="w-full pl-9 pr-3 py-2.5 text-sm border border-black/[0.1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F6E8C]/20 focus:border-[#0F6E8C]/40"
                    />
                  </div>

                  {error && (
                    <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2.5 rounded-lg bg-[#0F6E8C] text-white text-sm font-medium hover:bg-[#0d5f79] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {submitting && <Loader2 size={14} className="animate-spin" />}
                    Enviar email de recuperação
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
