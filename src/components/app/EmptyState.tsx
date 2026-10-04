import { motion } from 'motion/react'
import { DEFAULT_TRANSITION } from '@/lib/animations'
import { cn } from '@/lib/utils'

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={DEFAULT_TRANSITION} className={cn('flex flex-col items-center px-6 py-14 text-center', className)}>
      <div className="relative mb-4 grid size-14 place-items-center rounded-2xl border border-line-strong bg-white/[0.02]">
        <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_50%_0%,rgb(59_130_246/0.18),transparent_70%)]" />
        <Icon className="relative size-6 text-muted" />
      </div>
      <p className="font-mono text-xs font-semibold tracking-[0.2em] text-fg">{title}</p>
      {description && <p className="mt-1.5 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  )
}
