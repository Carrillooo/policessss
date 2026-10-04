/**
 * Indicador "vivo": punto + halo pulsante + etiqueta.
 * Comunica sincronización en tiempo real de un vistazo.
 */
import { cn } from '@/lib/utils'

const tones = {
  live: { dot: 'bg-emerald-400', ring: 'bg-emerald-400', text: 'text-emerald-300', glow: 'shadow-[0_0_10px_rgb(52_211_153/0.9)]' },
  warn: { dot: 'bg-amber-400', ring: 'bg-amber-400', text: 'text-amber-300', glow: 'shadow-[0_0_10px_rgb(251_191_36/0.9)]' },
  danger: { dot: 'bg-red-500', ring: 'bg-red-500', text: 'text-red-300', glow: 'shadow-[0_0_10px_rgb(239_68_68/0.9)]' },
  brand: { dot: 'bg-sky-400', ring: 'bg-sky-400', text: 'text-sky-300', glow: 'shadow-[0_0_10px_rgb(56_189_248/0.9)]' },
  idle: { dot: 'bg-slate-500', ring: 'bg-slate-500', text: 'text-muted', glow: '' },
} as const

export function PulseDot({ tone = 'live', pulse = true, className }: { tone?: keyof typeof tones; pulse?: boolean; className?: string }) {
  const t = tones[tone]
  return (
    <span className={cn('relative inline-flex size-2', className)}>
      {pulse && <span className={cn('animate-ping-slow absolute inset-0 rounded-full', t.ring)} />}
      <span className={cn('relative inline-flex size-2 rounded-full', t.dot, t.glow)} />
    </span>
  )
}

export function LiveIndicator({
  label = 'LIVE',
  tone = 'live',
  pulse = true,
  className,
}: {
  label?: string
  tone?: keyof typeof tones
  pulse?: boolean
  className?: string
}) {
  return (
    <span className={cn('inline-flex items-center gap-2 font-mono text-[10.5px] font-semibold tracking-[0.18em]', tones[tone].text, className)}>
      <PulseDot tone={tone} pulse={pulse} />
      {label}
    </span>
  )
}
