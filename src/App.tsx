import { BrowserRouter, Routes, Route } from 'react-router-dom'
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

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<VisaoGeral />} />
            <Route path="documentos" element={<Documentos />} />
            <Route path="contratos" element={<Contratos />} />
            <Route path="cheques" element={<Cheques />} />
            <Route path="pagamentos" element={<Pagamentos />} />
            <Route path="pendentes" element={<Pendentes />} />
            <Route path="alertas" element={<Alertas />} />
            <Route path="busca" element={<Busca />} />
            <Route path="configuracoes" element={<Configuracoes />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  )
}
