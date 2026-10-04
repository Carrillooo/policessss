/**
 * Modal accesible (Radix) con motion: overlay blur + fade/scale/blur.
 */
import * as D from '@radix-ui/react-dialog'
import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import { modalVariants, overlayVariants } from '@/lib/animations'
import { cn } from '@/lib/utils'

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  description?: React.ReactNode
  children?: React.ReactNode
  className?: string
  hideClose?: boolean
}

export function Dialog({ open, onOpenChange, title, description, children, className, hideClose }: DialogProps) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <D.Portal forceMount>
            <D.Overlay asChild forceMount>
              <motion.div
                variants={overlayVariants}
                initial="hidden"
                animate="show"
                exit="exit"
                className="fixed inset-0 z-[60] bg-[#02040a]/70 backdrop-blur-sm"
              />
            </D.Overlay>
            <div className="pointer-events-none fixed inset-0 z-[61] flex items-center justify-center p-4">
              <D.Content asChild forceMount>
                <motion.div
                  variants={modalVariants}
                  initial="hidden"
                  animate="show"
                  exit="exit"
                  className={cn(
                    'panel pointer-events-auto relative w-full max-w-lg !bg-panel/95 p-6 shadow-2xl shadow-black/60',
                    className,
                  )}
                >
                  <div className="mb-4 pr-8">
                    <D.Title className="font-display text-xl font-semibold tracking-wide">{title}</D.Title>
                    {description ? (
                      <D.Description className="mt-1 text-sm text-muted">{description}</D.Description>
                    ) : (
                      <D.Description className="sr-only">{typeof title === 'string' ? title : 'Diálogo'}</D.Description>
                    )}
                  </div>
                  {children}
                  {!hideClose && (
                    <D.Close className="absolute right-4 top-4 rounded-md p-1.5 text-muted transition-colors hover:bg-white/5 hover:text-fg">
                      <X className="size-4" />
                      <span className="sr-only">Cerrar</span>
                    </D.Close>
                  )}
                </motion.div>
              </D.Content>
            </div>
          </D.Portal>
        )}
      </AnimatePresence>
    </D.Root>
  )
}
