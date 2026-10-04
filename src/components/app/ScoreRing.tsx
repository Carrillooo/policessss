/**
 * Anillo de puntuación con trazo animado y CountUp en el centro.
 */
import { motion } from 'motion/react'
import { CountUp } from '@/components/reactbits'
import { DURATION, EASE } from '@/lib/animations'
import { cn } from '@/lib/utils'

const tones = {
  ok: ['#34d399', '#059669'],
  danger: ['#f87171', '#b91c1c'],
  warn: ['#fbbf24', '#d97706'],
  brand: ['#60a5fa', '#2563eb'],
} as const

export function ScoreRing({
  value,
  max = 100,
  size = 120,
  stroke = 8,
  tone = 'brand',
  label,
  suffix = '',
  delay = 0,
  className,
  children,
}: {
  value: number
  max?: number
  size?: number
  stroke?: number
  tone?: keyof typeof tones
  label?: string
  suffix?: string
  delay?: number
  className?: string
  children?: React.ReactNode
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(1, value / max))
  const id = `ring-${tone}-${size}`
  return (
    <div className={cn('relative inline-grid place-items-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={tones[tone][0]} />
            <stop offset="1" stopColor={tones[tone][1]} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(148 163 184 / 0.1)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - pct) }}
          transition={{ duration: DURATION.counter * 1.3, ease: EASE.out, delay }}
          style={{ filter: `drop-shadow(0 0 6px ${tones[tone][0]}66)` }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        {children ?? (
          <div>
            <div className="font-display text-2xl font-bold leading-none">
              <CountUp value={value} suffix={suffix} delay={delay} />
            </div>
            {label && <div className="label-caps mt-1 !text-[9px]">{label}</div>}
          </div>
        )}
      </div>
    </div>
  )
}
