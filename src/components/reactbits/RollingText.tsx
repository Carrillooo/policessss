/**
 * React Bits · Counter (rolling digits)
 * Cada carácter que cambia se desliza verticalmente; los que no cambian
 * quedan quietos. Ideal para cronómetros ("23:42") y marcadores.
 */
import { AnimatePresence, motion } from 'motion/react'
import { FAST_TRANSITION } from '@/lib/animations'
import { cn } from '@/lib/utils'

export function RollingText({ value, className }: { value: string; className?: string }) {
  return (
    <span className={cn('tabular inline-flex overflow-hidden', className)} aria-label={value}>
      {Array.from(value).map((ch, i) => (
        <span key={i} aria-hidden className="relative inline-block">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={ch}
              className="inline-block"
              initial={{ y: '-70%', opacity: 0 }}
              animate={{ y: '0%', opacity: 1 }}
              exit={{ y: '70%', opacity: 0 }}
              transition={FAST_TRANSITION}
            >
              {ch}
            </motion.span>
          </AnimatePresence>
        </span>
      ))}
    </span>
  )
}
