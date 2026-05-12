import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface CardProps {
  title?: string
  children: ReactNode
  className?: string
}

export function Card({ title, children, className }: CardProps) {
  return (
    <div className={cn('border border-black/[0.08] rounded-xl bg-white p-5', className)}>
      {title && (
        <h3 className="text-sm font-medium text-gray-500 mb-4">{title}</h3>
      )}
      {children}
    </div>
  )
}
