import { useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CheckCircle2, Info, TriangleAlert, XCircle, X } from 'lucide-react'
import { toastVariants } from '@/lib/animations'
import { cn } from '@/lib/utils'
import { useToasts, type ToastItem } from './toast-store'

const toneStyle = {
  success: { icon: CheckCircle2, color: 'text-emerald-400', bar: 'bg-emerald-400', glow: 'rgb(34 197 94 / 0.25)' },
  info: { icon: Info, color: 'text-sky-400', bar: 'bg-sky-400', glow: 'rgb(56 189 248 / 0.25)' },
  warning: { icon: TriangleAlert, color: 'text-amber-400', bar: 'bg-amber-400', glow: 'rgb(245 158 11 / 0.25)' },
  error: { icon: XCircle, color: 'text-red-400', bar: 'bg-red-400', glow: 'rgb(239 68 68 / 0.25)' },
}

function ToastCard({ t }: { t: ToastItem }) {
  const dismiss = useToasts((s) => s.dismiss)
  const s = toneStyle[t.tone]
  const Icon = s.icon
  useEffect(() => {
    const id = setTimeout(() => dismiss(t.id), t.duration)
    return () => clearTimeout(id)
  }, [t.id, t.duration, dismiss])

  return (
    <motion.div
      layout
      variants={toastVariants}
      initial="hidden"
      animate="show"
      exit="exit"
      role="status"
      className="pointer-events-auto relative w-80 overflow-hidden rounded-xl border border-line-strong bg-panel/95 py-3 pl-4 pr-10 shadow-2xl shadow-black/50 backdrop-blur-xl"
      style={{ boxShadow: `0 20px 50px -20px ${s.glow}, 0 0 0 1px rgb(255 255 255 / 0.02)` }}
    >
      <div className="flex items-start gap-3">
        <motion.span initial={{ scale: 0.5, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 600, damping: 24 }}>
          <Icon className={cn('mt-0.5 size-4', s.color)} />
        </motion.span>
        <div className="min-w-0">
          <p className="font-mono text-[11.5px] font-semibold tracking-[0.14em] text-fg">{t.title}</p>
          {t.description && <p className="mt-0.5 text-xs text-muted">{t.description}</p>}
        </div>
      </div>
      <button onClick={() => dismiss(t.id)} className="absolute right-2.5 top-2.5 rounded p-1 text-dim hover:text-fg" aria-label="Cerrar notificación">
        <X className="size-3.5" />
      </button>
      <motion.span
        className={cn('absolute bottom-0 left-0 h-[2px]', s.bar)}
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: t.duration / 1000, ease: 'linear' }}
      />
    </motion.div>
  )
}

export function Toaster() {
  const toasts = useToasts((s) => s.toasts)
  return (
    <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-[90] flex flex-col items-end gap-2">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <ToastCard key={t.id} t={t} />
        ))}
      </AnimatePresence>
    </div>
  )
}
