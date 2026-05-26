import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from 'react'
import { api } from '@/lib/api'
import type { Documento, StatusDocumento } from '@/types'

interface AppContextValue {
  documents: Documento[]
  loading: boolean
  updateDocumentStatus: (id: string, status: StatusDocumento) => Promise<boolean>
  addDocument: (doc: Documento) => void
  refreshDocuments: () => void
  whatsappAlertsEnabled: boolean
  setWhatsappAlertsEnabled: (val: boolean) => void
  alertVencendo30: boolean
  setAlertVencendo30: (val: boolean) => void
  alertVencendo7: boolean
  setAlertVencendo7: (val: boolean) => void
  alertNovosDocumentos: boolean
  setAlertNovosDocumentos: (val: boolean) => void
  toastMessage: string | null
  showToast: (message: string) => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [documents, setDocuments] = useState<Documento[]>([])
  const [loading, setLoading] = useState(true)
  const [whatsappAlertsEnabled, setWhatsappAlertsEnabledState] = useState(false)
  const [alertVencendo30, setAlertVencendo30State] = useState(true)
  const [alertVencendo7, setAlertVencendo7State] = useState(true)
  const [alertNovosDocumentos, setAlertNovosDocumentosState] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    Promise.allSettled([
      api.getSetting('whatsapp_alerts_enabled'),
      api.getSetting('alert_30d_enabled'),
      api.getSetting('alert_7d_enabled'),
      api.getSetting('alert_new_docs_enabled'),
    ]).then(([wa, a30, a7, an]) => {
      if (wa.status === 'fulfilled' && wa.value?.value !== undefined) setWhatsappAlertsEnabledState(wa.value.value)
      if (a30.status === 'fulfilled' && a30.value?.value !== undefined) setAlertVencendo30State(a30.value.value)
      if (a7.status === 'fulfilled' && a7.value?.value !== undefined) setAlertVencendo7State(a7.value.value)
      if (an.status === 'fulfilled' && an.value?.value !== undefined) setAlertNovosDocumentosState(an.value.value)
    })
  }, [])

  const showToast = useCallback((message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToastMessage(message)
    toastTimer.current = setTimeout(() => setToastMessage(null), 3000)
  }, [])

  const setWhatsappAlertsEnabled = useCallback((val: boolean) => {
    const previous = whatsappAlertsEnabled
    setWhatsappAlertsEnabledState(val)
    api.updateSetting('whatsapp_alerts_enabled', val).catch(() => {
      setWhatsappAlertsEnabledState(previous)
      showToast('Nao foi possivel salvar a configuracao')
    })
  }, [showToast, whatsappAlertsEnabled])

  const setAlertVencendo30 = useCallback((val: boolean) => {
    const previous = alertVencendo30
    setAlertVencendo30State(val)
    api.updateSetting('alert_30d_enabled', val).catch(() => {
      setAlertVencendo30State(previous)
      showToast('Nao foi possivel salvar a configuracao')
    })
  }, [alertVencendo30, showToast])

  const setAlertVencendo7 = useCallback((val: boolean) => {
    const previous = alertVencendo7
    setAlertVencendo7State(val)
    api.updateSetting('alert_7d_enabled', val).catch(() => {
      setAlertVencendo7State(previous)
      showToast('Nao foi possivel salvar a configuracao')
    })
  }, [alertVencendo7, showToast])

  const setAlertNovosDocumentos = useCallback((val: boolean) => {
    const previous = alertNovosDocumentos
    setAlertNovosDocumentosState(val)
    api.updateSetting('alert_new_docs_enabled', val).catch(() => {
      setAlertNovosDocumentosState(previous)
      showToast('Nao foi possivel salvar a configuracao')
    })
  }, [alertNovosDocumentos, showToast])

  const fetchDocuments = useCallback(async () => {
    setLoading(true)
    try {
      const docs = await api.getAllDocuments()
      setDocuments(docs)
    } catch (err) {
      console.error('Erro ao carregar documentos da API:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  const updateDocumentStatus = useCallback(async (id: string, status: StatusDocumento) => {
    const previous = documents
    setDocuments((prev) => prev.map((d) => (d.id === id ? { ...d, status } : d)))
    try {
      await api.updateStatus(id, status)
      return true
    } catch (err) {
      console.error('Erro ao atualizar status:', err)
      setDocuments(previous)
      showToast('Nao foi possivel alterar o status')
      return false
    }
  }, [documents, showToast])

  const addDocument = useCallback((doc: Documento) => {
    setDocuments((prev) => [doc, ...prev])
  }, [])

  return (
    <AppContext.Provider
      value={{
        documents,
        loading,
        updateDocumentStatus,
        addDocument,
        refreshDocuments: fetchDocuments,
        whatsappAlertsEnabled,
        setWhatsappAlertsEnabled,
        alertVencendo30,
        setAlertVencendo30,
        alertVencendo7,
        setAlertVencendo7,
        alertNovosDocumentos,
        setAlertNovosDocumentos,
        toastMessage,
        showToast,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}
