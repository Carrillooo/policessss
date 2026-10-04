import { cn } from '@/lib/utils'

export type Tone = 'neutral' | 'brand' | 'ok' | 'warn' | 'danger' | 'cyan' | 'gold'

const tones: Record<Tone, string> = {
  neutral: 'border-line-strong bg-white/[0.03] text-muted',
  brand: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
  ok: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  warn: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  danger: 'border-red-500/30 bg-red-500/10 text-red-300',
  cyan: 'border-sky-400/30 bg-sky-400/10 text-sky-300',
  gold: 'border-amber-300/30 bg-amber-300/10 text-amber-200',
}

export function Badge({ tone = 'neutral', className, children }: { tone?: Tone; className?: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1.5 rounded-md border px-2 font-mono text-[10.5px] font-medium uppercase tracking-[0.12em]',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
