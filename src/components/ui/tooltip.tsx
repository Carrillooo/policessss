import * as T from '@radix-ui/react-tooltip'
import { motion } from 'motion/react'
import { FAST_TRANSITION } from '@/lib/animations'

export const TooltipProvider = T.Provider

export function Tooltip({
  content,
  children,
  side = 'right',
  disabled,
}: {
  content: React.ReactNode
  children: React.ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  disabled?: boolean
}) {
  if (disabled) return <>{children}</>
  const off = { right: { x: -4 }, left: { x: 4 }, top: { y: 4 }, bottom: { y: -4 } }[side]
  return (
    <T.Root delayDuration={120}>
      <T.Trigger asChild>{children}</T.Trigger>
      <T.Portal>
        <T.Content side={side} sideOffset={10} className="z-[80]">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, ...off }}
            animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
            transition={FAST_TRANSITION}
            className="rounded-md border border-line-strong bg-panel-2/95 px-2.5 py-1.5 text-xs font-medium text-fg shadow-xl shadow-black/40 backdrop-blur"
          >
            {content}
          </motion.div>
        </T.Content>
      </T.Portal>
    </T.Root>
  )
}
