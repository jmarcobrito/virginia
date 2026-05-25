import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { AppProvider } from '@/context/AppContext'
import { Layout } from '@/components/layout/Layout'
import VisaoGeral from '@/pages/VisaoGeral'
import Documentos from '@/pages/Documentos'
import Pendentes from '@/pages/Pendentes'
import Alertas from '@/pages/Alertas'
import Busca from '@/pages/Busca'
import Configuracoes from '@/pages/Configuracoes'
import Contratos from '@/pages/Contratos'
import Cheques from '@/pages/Cheques'
import Pagamentos from '@/pages/Pagamentos'
import Perfil from '@/pages/Perfil'
import Login from '@/pages/Login'
import Usuarios from '@/pages/admin/Usuarios'
import type { ReactNode } from 'react'

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F8F6]">
      <Loader2 size={22} className="animate-spin text-[#0F6E8C]" />
    </div>
  )
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth()
  if (isLoading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AdminGuard({ children }: { children: ReactNode }) {
  const { isAdmin } = useAuth()
  if (!isAdmin) return <Navigate to="/" replace />
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<VisaoGeral />} />
        <Route path="documentos" element={<Documentos />} />
        <Route path="contratos" element={<Contratos />} />
        <Route path="cheques" element={<Cheques />} />
        <Route path="pagamentos" element={<Pagamentos />} />
        <Route path="pendentes" element={<Pendentes />} />
        <Route path="alertas" element={<Alertas />} />
        <Route path="busca" element={<Busca />} />
        <Route path="configuracoes" element={<Configuracoes />} />
        <Route path="perfil" element={<Perfil />} />
        <Route
          path="admin/usuarios"
          element={
            <AdminGuard>
              <Usuarios />
            </AdminGuard>
          }
        />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AppProvider>
    </AuthProvider>
  )
}
