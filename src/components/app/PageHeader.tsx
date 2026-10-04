import { motion } from 'motion/react'
import { BlurText } from '@/components/reactbits'
import { DEFAULT_TRANSITION } from '@/lib/animations'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  eyebrow?: React.ReactNode
  title: string
  description?: React.ReactNode
  actions?: React.ReactNode
  className?: string
  children?: React.ReactNode
}

export function PageHeader({ eyebrow, title, description, actions, className, children }: PageHeaderProps) {
  return (
    <div className={cn('relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between', className)}>
      <div className="min-w-0">
        {eyebrow && (
          <motion.div initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={DEFAULT_TRANSITION} className="label-caps mb-2 flex items-center gap-2">
            <span className="h-px w-5 bg-blue-400/60" />
            {eyebrow}
          </motion.div>
        )}
        <BlurText as="h1" text={title} className="font-display text-3xl font-bold tracking-wide sm:text-[2.1rem]" />
        {description && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ ...DEFAULT_TRANSITION, delay: 0.15 }} className="mt-1.5 max-w-2xl text-sm text-muted">
            {description}
          </motion.p>
        )}
        {children}
      </div>
      {actions && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DEFAULT_TRANSITION, delay: 0.1 }} className="flex flex-wrap items-center gap-2">
          {actions}
        </motion.div>
      )}
    </div>
  )
}

/** Contenedor estándar de página */
export function Page({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8', className)}>{children}</div>
}
