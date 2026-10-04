/**
 * Marca de evaluación: ✓ correcta / • parcial / ✕ incorrecta.
 * Al cambiar de estado la marca "aterriza" con un spring corto.
 */
import { AnimatePresence, motion } from 'motion/react'
import { markVariants } from '@/lib/animations'
import { cn } from '@/lib/utils'
import type { Verdict } from '@/data/types'

const style: Record<Verdict, { ring: string; glow: string; label: string }> = {
  correct: { ring: 'border-emerald-400/50 bg-emerald-500/15 text-emerald-300', glow: 'shadow-[0_0_18px_-2px_rgb(34_197_94/0.6)]', label: 'Correcta' },
  partial: { ring: 'border-amber-400/50 bg-amber-500/15 text-amber-300', glow: 'shadow-[0_0_18px_-2px_rgb(245_158_11/0.55)]', label: 'Parcial' },
  incorrect: { ring: 'border-red-400/50 bg-red-500/15 text-red-300', glow: 'shadow-[0_0_18px_-2px_rgb(239_68_68/0.55)]', label: 'Incorrecta' },
}

function Glyph({ v }: { v: Verdict }) {
  if (v === 'correct')
    return (
      <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
        <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.28, delay: 0.06 }} />
      </svg>
    )
  if (v === 'partial') return <span className="size-2 rounded-full bg-current" />
  return (
    <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round">
      <motion.path d="M7 7l10 10M17 7L7 17" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.24, delay: 0.06 }} />
    </svg>
  )
}

export function EvaluationMark({ verdict, size = 'md', className }: { verdict?: Verdict | null; size?: 'sm' | 'md'; className?: string }) {
  const dim = size === 'sm' ? 'size-6' : 'size-7'
  return (
    <span className={cn('relative inline-grid place-items-center', dim, className)} aria-label={verdict ? style[verdict].label : 'Sin evaluar'}>
      <AnimatePresence mode="popLayout" initial={false}>
        {verdict ? (
          <motion.span
            key={verdict}
            variants={markVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            className={cn('absolute inset-0 grid place-items-center rounded-full border', style[verdict].ring, style[verdict].glow)}
          >
            <Glyph v={verdict} />
          </motion.span>
        ) : (
          <motion.span key="none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 rounded-full border border-dashed border-line-strong" />
        )}
      </AnimatePresence>
    </span>
  )
}
