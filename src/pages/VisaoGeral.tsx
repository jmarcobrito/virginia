import { useState } from 'react'
import { FolderOpen, PenLine, Download, AlertTriangle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Card } from '@/components/ui/Card'
import { Table } from '@/components/ui/Table'
import { DocumentRow } from '@/components/documents/DocumentRow'
import { DocumentModal } from '@/components/documents/DocumentModal'
import { ActivityFeed } from '@/components/documents/ActivityFeed'
import { useDocuments } from '@/hooks/useDocuments'
import { getTipoConfig } from '@/lib/utils'
import type { Documento, TipoDocumento } from '@/types'

const TABLE_HEADERS = ['Nome', 'Tipo', 'Status', 'Recebimento', 'Origem']

const TIPO_KEYS: TipoDocumento[] = [
  'contrato', 'nota_fiscal', 'procuracao', 'escritura', 'boleto', 'orcamento', 'outro',
]

const STAT_TRENDS = [
  '↑ 2 este mês',
  '↓ 1 esta semana',
  '↑ 3 esta semana',
  '→ igual à semana passada',
]

export default function VisaoGeral() {
  const [selectedDoc, setSelectedDoc] = useState<Documento | null>(null)
  const { all, totalCount, pendingCount, expiringSoonCount, receivedThisWeekCount } = useDocuments()

  const recent = [...all]
    .sort((a, b) => new Date(b.dataRecebimento).getTime() - new Date(a.dataRecebimento).getTime())
    .slice(0, 10)

  const chartData = TIPO_KEYS.map((tipo) => ({
    name: getTipoConfig(tipo).label,
    total: all.filter((d) => d.tipo === tipo).length,
  })).filter((d) => d.total > 0)

  const today = format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })
  const todayFormatted = today.charAt(0).toUpperCase() + today.slice(1)

  const stats = [
    {
      label: 'Total de Documentos',
      value: totalCount,
      trend: STAT_TRENDS[0],
      trendColor: 'text-emerald-600',
      icon: <FolderOpen size={16} className="text-[#0F6E8C]" />,
      iconBg: 'bg-[#0F6E8C]/[0.08]',
    },
    {
      label: 'Aguardando Assinatura',
      value: pendingCount,
      trend: STAT_TRENDS[1],
      trendColor: 'text-red-500',
      icon: <PenLine size={16} className="text-amber-500" />,
      iconBg: 'bg-amber-50',
    },
    {
      label: 'Recebidos esta Semana',
      value: receivedThisWeekCount,
      trend: STAT_TRENDS[2],
      trendColor: 'text-emerald-600',
      icon: <Download size={16} className="text-emerald-500" />,
      iconBg: 'bg-emerald-50',
    },
    {
      label: 'Vencendo em 30 dias',
      value: expiringSoonCount,
      trend: STAT_TRENDS[3],
      trendColor: 'text-gray-400',
      icon: <AlertTriangle size={16} className="text-red-500" />,
      iconBg: 'bg-red-50',
    },
  ]

  return (
    <div className="p-7">
      <div className="mb-7">
        <h1 className="text-xl font-semibold text-gray-900">Visão Geral</h1>
        <p className="text-sm text-gray-400 mt-0.5">{todayFormatted}</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-7">
        {stats.map((stat) => (
          <Card key={stat.label} className="hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-[0.08em]">
                  {stat.label}
                </p>
                <p className="font-mono text-[32px] font-light text-gray-900 mt-1.5 leading-none">
                  {stat.value}
                </p>
                <p className={`text-[11px] mt-1.5 ${stat.trendColor}`}>{stat.trend}</p>
              </div>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ml-3 ${stat.iconBg}`}>
                {stat.icon}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-5 mb-5">
        <Card title="Documentos Recentes" className="col-span-2">
          <Table headers={TABLE_HEADERS}>
            {recent.map((doc) => (
              <DocumentRow key={doc.id} document={doc} onClick={setSelectedDoc} />
            ))}
          </Table>
        </Card>

        <Card title="Atividade Recente">
          <ActivityFeed documents={all} />
        </Card>
      </div>

      <Card title="Documentos por Tipo">
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData} barSize={32}>
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: '#9CA3AF' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#9CA3AF' }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                border: '1px solid rgba(0,0,0,0.08)',
                borderRadius: 8,
                boxShadow: 'none',
              }}
              cursor={{ fill: 'rgba(15,110,140,0.04)' }}
            />
            <Bar dataKey="total" fill="#0F6E8C" radius={[4, 4, 0, 0]} name="Documentos" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <DocumentModal
        document={selectedDoc}
        isOpen={selectedDoc !== null}
        onClose={() => setSelectedDoc(null)}
      />
    </div>
  )
}
