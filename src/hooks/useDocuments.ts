import { differenceInDays, isAfter, parseISO, subDays } from 'date-fns'
import { useApp } from '@/context/AppContext'
import type { Documento } from '@/types'

function sortByVencimento(docs: Documento[]): Documento[] {
  return [...docs].sort((a, b) => {
    if (!a.dataVencimento && !b.dataVencimento) return 0
    if (!a.dataVencimento) return 1
    if (!b.dataVencimento) return -1
    return parseISO(a.dataVencimento).getTime() - parseISO(b.dataVencimento).getTime()
  })
}

export function useDocuments() {
  const { documents } = useApp()
  const now = new Date()
  const weekAgo = subDays(now, 7)

  const pending = sortByVencimento(
    documents.filter(
      (d) => d.status === 'pendente_assinatura' || d.status === 'em_revisao'
    )
  )

  const expiringSoon = documents.filter((d) => {
    if (!d.dataVencimento) return false
    const days = differenceInDays(parseISO(d.dataVencimento), now)
    return days >= 0 && days <= 30
  })

  const expiringUrgent = documents.filter((d) => {
    if (!d.dataVencimento) return false
    const days = differenceInDays(parseISO(d.dataVencimento), now)
    return days >= 0 && days <= 7
  })

  const receivedThisWeek = documents.filter((d) =>
    isAfter(parseISO(d.dataRecebimento), weekAgo)
  )

  return {
    all: documents,
    pending,
    expiringSoon,
    expiringUrgent,
    receivedThisWeek,
    totalCount: documents.length,
    pendingCount: pending.length,
    expiringSoonCount: expiringSoon.length,
    receivedThisWeekCount: receivedThisWeek.length,
  }
}
