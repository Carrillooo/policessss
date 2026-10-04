/**
 * Loader de sistema (no spinner genérico): radar con barrido + texto
 * descifrándose. Para "SINCRONIZANDO", "CARGANDO ENTREVISTA", etc.
 */
import { motion } from 'motion/react'
import { DecryptedText } from '@/components/reactbits'
import { cn } from '@/lib/utils'

export function RadarLoader({ size = 64, className }: { size?: number; className?: string }) {
  return (
    <div className={cn('relative', className)} style={{ width: size, height: size }} aria-hidden>
      <div className="absolute inset-0 rounded-full border border-sky-400/25" />
      <div className="absolute inset-[22%] rounded-full border border-sky-400/15" />
      <div className="absolute inset-y-1/2 inset-x-0 h-px bg-sky-400/10" />
      <div className="absolute inset-x-1/2 inset-y-0 w-px bg-sky-400/10" />
      <div
        className="animate-spin-slow absolute inset-0 rounded-full"
        style={{
          animationDuration: '1.6s',
          background: 'conic-gradient(from 0deg, transparent 0deg, transparent 270deg, rgb(56 189 248 / 0.55) 360deg)',
          maskImage: 'radial-gradient(circle, #000 68%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(circle, #000 68%, transparent 70%)',
        }}
      />
      <span className="absolute left-1/2 top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-300 shadow-[0_0_10px_rgb(125_211_252)]" />
    </div>
  )
}

export function SystemLoader({ label = 'SINCRONIZANDO', sublabel, className }: { label?: string; sublabel?: string; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn('flex flex-col items-center justify-center gap-4 py-16 text-center', className)}
      role="status"
      aria-live="polite"
    >
      <RadarLoader />
      <div>
        <DecryptedText text={label} className="text-xs font-semibold tracking-[0.3em] text-sky-200" />
        {sublabel && <p className="mt-1 text-xs text-muted">{sublabel}</p>}
      </div>
    </motion.div>
  )
}

/** Tres barras que oscilan: loader inline compacto */
export function BarsLoader({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-end gap-0.5', className)} aria-hidden>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-[3px] rounded-full bg-current"
          animate={{ height: [4, 12, 4] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.12, ease: 'easeInOut' }}
        />
      ))}
    </span>
  )
}
