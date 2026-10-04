/**
 * Barra de progreso animada (spring) con brillo opcional en el frente.
 */
import { motion } from 'motion/react'
import { SPRING_TRANSITION } from '@/lib/animations'
import { cn } from '@/lib/utils'

const tones = {
  brand: 'from-blue-600 to-sky-400',
  ok: 'from-emerald-600 to-emerald-400',
  warn: 'from-amber-600 to-amber-400',
  danger: 'from-red-600 to-red-400',
} as const

interface ProgressProps {
  value: number
  max?: number
  tone?: keyof typeof tones
  className?: string
  segments?: number
  label?: string
}

export function Progress({ value, max = 100, tone = 'brand', className, segments, label }: ProgressProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
      className={cn('relative h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]', className)}
    >
      <motion.div
        className={cn('relative h-full rounded-full bg-gradient-to-r', tones[tone])}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={SPRING_TRANSITION}
      >
        <span className="absolute right-0 top-1/2 h-3 w-6 -translate-y-1/2 rounded-full bg-white/40 blur-md" />
      </motion.div>
      {segments && segments > 1 && (
        <div className="pointer-events-none absolute inset-0 flex">
          {Array.from({ length: segments - 1 }).map((_, i) => (
            <span key={i} className="h-full flex-1 border-r-2 border-bg" />
          ))}
          <span className="flex-1" />
        </div>
      )}
    </div>
  )
}
