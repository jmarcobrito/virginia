import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { differenceInDays, parseISO } from 'date-fns'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { StatusDocumento, TipoDocumento } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number | null): string {
  if (value === null) return '-'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatDate(iso: string | null): string {
  if (!iso) return '-'
  try {
    return format(parseISO(iso), 'dd/MM/yyyy', { locale: ptBR })
  } catch {
    return '-'
  }
}

export function getUrgency(dataVencimento: string | null): 'red' | 'yellow' | 'none' {
  if (!dataVencimento) return 'none'
  const days = differenceInDays(parseISO(dataVencimento), new Date())
  if (days < 0) return 'red'
  if (days <= 7) return 'red'
  if (days <= 30) return 'yellow'
  return 'none'
}

export function getDaysUntil(dataVencimento: string | null): number | null {
  if (!dataVencimento) return null
  return differenceInDays(parseISO(dataVencimento), new Date())
}

export function getStatusConfig(status: StatusDocumento): {
  label: string
  bg: string
  text: string
  dot: string
} {
  const map: Record<StatusDocumento, { label: string; bg: string; text: string; dot: string }> = {
    recebido: { label: 'Recebido', bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },
    em_revisao: { label: 'Em Revisao', bg: 'bg-blue-50', text: 'text-blue-600', dot: 'bg-blue-500' },
    pendente_assinatura: { label: 'Pendente Assinatura', bg: 'bg-amber-50', text: 'text-amber-600', dot: 'bg-amber-500' },
    assinado: { label: 'Assinado', bg: 'bg-emerald-50', text: 'text-emerald-600', dot: 'bg-emerald-500' },
    arquivado: { label: 'Arquivado', bg: 'bg-gray-200', text: 'text-gray-500', dot: 'bg-gray-400' },
  }
  return map[status]
}

export function getTipoConfig(tipo: TipoDocumento): { label: string; abbr: string } {
  const map: Record<TipoDocumento, { label: string; abbr: string }> = {
    contrato: { label: 'Contrato', abbr: 'CT' },
    nota_fiscal: { label: 'Nota Fiscal', abbr: 'NF' },
    procuracao: { label: 'Procuracao', abbr: 'PR' },
    escritura: { label: 'Escritura', abbr: 'ES' },
    boleto: { label: 'Boleto', abbr: 'BL' },
    orcamento: { label: 'Orcamento', abbr: 'OC' },
    outro: { label: 'Outro', abbr: 'OU' },
  }
  return map[tipo]
}
