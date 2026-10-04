/**
 * React Bits · AnimatedList (adaptado)
 * Lista cuyos elementos entran escalonados y que anima inserciones
 * posteriores (realtime) con layout animation.
 */
import { AnimatePresence, motion } from 'motion/react'
import { realtimeEnterVariants, DEFAULT_TRANSITION, EXIT_TRANSITION } from '@/lib/animations'
import { cn } from '@/lib/utils'

interface AnimatedListProps<T> {
  items: T[]
  getKey: (item: T) => string
  renderItem: (item: T, index: number) => React.ReactNode
  className?: string
  itemClassName?: string
}

export function AnimatedList<T>({ items, getKey, renderItem, className, itemClassName }: AnimatedListProps<T>) {
  return (
    <motion.ul className={cn('relative', className)} initial={false}>
      <AnimatePresence initial={true} mode="popLayout">
        {items.map((item, i) => (
          <motion.li
            key={getKey(item)}
            layout
            variants={realtimeEnterVariants}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, scale: 0.98, transition: EXIT_TRANSITION }}
            transition={{ ...DEFAULT_TRANSITION, delay: Math.min(i, 8) * 0.03 }}
            className={itemClassName}
          >
            {renderItem(item, i)}
          </motion.li>
        ))}
      </AnimatePresence>
    </motion.ul>
  )
}
