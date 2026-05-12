import { CheckCircle } from 'lucide-react'
import { useApp } from '@/context/AppContext'

export function Toast() {
  const { toastMessage } = useApp()

  if (!toastMessage) return null

  return (
    <div className="fixed bottom-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 bg-gray-900 text-white text-sm rounded-lg shadow-lg animate-fade-in">
      <CheckCircle size={15} className="text-emerald-400 flex-shrink-0" />
      {toastMessage}
    </div>
  )
}
