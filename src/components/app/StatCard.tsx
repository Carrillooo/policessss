/**
 * KPI card: SpotlightCard + CountUp + icono. `emphasis` distingue
 * jerarquía: sólo las métricas clave reciben borde animado.
 */
import { motion } from 'motion/react'
import { CountUp, SpotlightCard } from '@/components/reactbits'
import { cardVariants } from '@/lib/animations'
import { cn } from '@/lib/utils'

const toneMap = {
  brand: { icon: 'text-blue-300 bg-blue-500/10 ring-blue-400/20', spot: '59 130 246' },
  ok: { icon: 'text-emerald-300 bg-emerald-500/10 ring-emerald-400/20', spot: '34 197 94' },
  danger: { icon: 'text-red-300 bg-red-500/10 ring-red-400/20', spot: '239 68 68' },
  warn: { icon: 'text-amber-300 bg-amber-500/10 ring-amber-400/20', spot: '245 158 11' },
  cyan: { icon: 'text-sky-300 bg-sky-500/10 ring-sky-400/20', spot: '56 189 248' },
} as const

interface StatCardProps {
  label: string
  value: number
  decimals?: number
  suffix?: string
  prefix?: string
  icon: React.ComponentType<{ className?: string }>
  tone?: keyof typeof toneMap
  footer?: React.ReactNode
  emphasis?: boolean
  className?: string
  children?: React.ReactNode
}

export function StatCard({ label, value, decimals, suffix, prefix, icon: Icon, tone = 'brand', footer, emphasis, className, children }: StatCardProps) {
  const t = toneMap[tone]
  return (
    <motion.div variants={cardVariants} className={cn('h-full', className)} whileHover={{ y: -2 }}>
      <SpotlightCard spotlightColor={t.spot} className={cn('h-full p-5', emphasis && 'gradient-border')}>
        <div className="flex items-start justify-between gap-3">
          <span className="label-caps">{label}</span>
          <span className={cn('grid size-8 place-items-center rounded-lg ring-1', t.icon)}>
            <Icon className="size-4" />
          </span>
        </div>
        <div className="mt-3 font-display text-4xl font-bold leading-none tracking-wide">
          <CountUp value={value} decimals={decimals} suffix={suffix} prefix={prefix} />
        </div>
        {children}
        {footer && <div className="mt-3 text-xs text-muted">{footer}</div>}
      </SpotlightCard>
    </motion.div>
  )
}
