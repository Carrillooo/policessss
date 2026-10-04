/**
 * Escudo LSPD vectorial. Con `animate` el contorno se dibuja,
 * la estrella aterriza y un barrido de luz cruza el escudo.
 */
import { motion, useReducedMotion } from 'motion/react'
import { EASE } from '@/lib/animations'
import { cn } from '@/lib/utils'

export function LspdBadge({ size = 48, animate = false, className, delay = 0 }: { size?: number; animate?: boolean; className?: string; delay?: number }) {
  const reduce = useReducedMotion()
  const a = animate && !reduce
  const id = `b${size}${animate ? 'a' : ''}`
  return (
    <svg viewBox="0 0 64 72" width={size} height={size * 1.125} className={cn('overflow-visible', className)} aria-label="Escudo LSPD" role="img">
      <defs>
        <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1d4ed8" />
          <stop offset="1" stopColor="#0b1a45" />
        </linearGradient>
        <linearGradient id={`${id}-stroke`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#bfdbfe" />
          <stop offset="0.5" stopColor="#60a5fa" />
          <stop offset="1" stopColor="#1e40af" />
        </linearGradient>
        <linearGradient id={`${id}-sweep`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`${id}-clip`}>
          <path d="M32 3 58 12v21c0 17-11 28.5-26 35C17 61.5 6 50 6 33V12Z" />
        </clipPath>
      </defs>
      <motion.path
        d="M32 3 58 12v21c0 17-11 28.5-26 35C17 61.5 6 50 6 33V12Z"
        fill={`url(#${id}-fill)`}
        initial={a ? { fillOpacity: 0 } : false}
        animate={{ fillOpacity: 1 }}
        transition={{ duration: 0.6, delay: delay + 0.5 }}
      />
      <motion.path
        d="M32 3 58 12v21c0 17-11 28.5-26 35C17 61.5 6 50 6 33V12Z"
        fill="none"
        stroke={`url(#${id}-stroke)`}
        strokeWidth={2}
        strokeLinejoin="round"
        initial={a ? { pathLength: 0 } : false}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.9, ease: EASE.inOut, delay }}
      />
      <path d="M32 9 52 16v17c0 13.5-8.4 22.6-20 28-11.6-5.4-20-14.5-20-28V16Z" fill="none" stroke="#93c5fd" strokeOpacity={0.25} strokeWidth={0.8} />
      <motion.path
        d="m32 20 4.1 8.6 9.4 1.3-6.8 6.6 1.6 9.3L32 41.4l-8.3 4.4 1.6-9.3-6.8-6.6 9.4-1.3Z"
        fill="#fbbf24"
        stroke="#fde68a"
        strokeWidth={0.6}
        style={{ transformOrigin: '32px 33px' }}
        initial={a ? { scale: 0, rotate: -90, opacity: 0 } : false}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18, delay: delay + 0.7 }}
      />
      <text x="32" y="56" textAnchor="middle" fontFamily="Rajdhani, sans-serif" fontWeight={700} fontSize={7} letterSpacing={1.4} fill="#dbeafe">
        LSPD
      </text>
      {a && (
        <g clipPath={`url(#${id}-clip)`}>
          <motion.rect
            y="0"
            width="24"
            height="72"
            fill={`url(#${id}-sweep)`}
            initial={{ x: -30 }}
            animate={{ x: 80 }}
            transition={{ duration: 1.1, ease: EASE.inOut, delay: delay + 1.1 }}
          />
        </g>
      )}
    </svg>
  )
}
