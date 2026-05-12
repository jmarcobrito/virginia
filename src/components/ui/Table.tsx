import type { ReactNode } from 'react'

interface TableProps {
  headers: string[]
  children: ReactNode
  emptyMessage?: string
  isEmpty?: boolean
}

export function Table({ headers, children, emptyMessage, isEmpty }: TableProps) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            {headers.map((h) => (
              <th
                key={h}
                className="text-left text-[10px] font-semibold text-gray-400 uppercase tracking-[0.08em] pb-3 pr-4 border-b border-black/[0.06]"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isEmpty ? (
            <tr>
              <td colSpan={headers.length} className="py-12 text-center text-gray-400 text-sm">
                {emptyMessage ?? 'Nenhum resultado encontrado.'}
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  )
}
