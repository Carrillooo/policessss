/**
 * Drawer lateral derecho (Radix Dialog + spring). No saca al usuario
 * de la vista actual: pensado para consultar normativa en entrevista.
 */
import * as D from '@radix-ui/react-dialog'
import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import { drawerVariants, overlayVariants } from '@/lib/animations'
import { cn } from '@/lib/utils'

interface DrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  eyebrow?: React.ReactNode
  children?: React.ReactNode
  className?: string
}

export function Drawer({ open, onOpenChange, title, eyebrow, children, className }: DrawerProps) {
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
                className="fixed inset-0 z-[60] bg-[#02040a]/50 backdrop-blur-[2px]"
              />
            </D.Overlay>
            <D.Content asChild forceMount>
              <motion.aside
                variants={drawerVariants}
                initial="hidden"
                animate="show"
                exit="exit"
                className={cn(
                  'fixed inset-y-0 right-0 z-[61] flex w-full max-w-xl flex-col border-l border-line-strong bg-panel/95 shadow-[-30px_0_80px_-20px_rgb(0_0_0/0.7)] backdrop-blur-xl',
                  className,
                )}
              >
                <div className="pointer-events-none absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-blue-400/60 to-transparent" />
                <header className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
                  <div>
                    {eyebrow && <div className="label-caps mb-1">{eyebrow}</div>}
                    <D.Title className="font-display text-xl font-semibold tracking-wide">{title}</D.Title>
                    <D.Description className="sr-only">Panel lateral</D.Description>
                  </div>
                  <D.Close className="rounded-md p-1.5 text-muted transition-colors hover:bg-white/5 hover:text-fg">
                    <X className="size-4" />
                    <span className="sr-only">Cerrar</span>
                  </D.Close>
                </header>
                <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
              </motion.aside>
            </D.Content>
          </D.Portal>
        )}
      </AnimatePresence>
    </D.Root>
  )
}
