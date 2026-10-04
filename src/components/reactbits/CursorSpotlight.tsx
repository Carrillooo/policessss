/**
 * React Bits · Spotlight cursor
 * Halo amplio que sigue ligeramente al cursor (con retardo spring).
 */
import { useEffect } from 'react'
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring } from 'motion/react'

export function CursorSpotlight({ color = '59 130 246', size = 520 }: { color?: string; size?: number }) {
  const reduce = useReducedMotion()
  const x = useMotionValue(typeof window !== 'undefined' ? window.innerWidth / 2 : 0)
  const y = useMotionValue(typeof window !== 'undefined' ? window.innerHeight / 3 : 0)
  const sx = useSpring(x, { stiffness: 60, damping: 20 })
  const sy = useSpring(y, { stiffness: 60, damping: 20 })
  const bg = useMotionTemplate`radial-gradient(${size}px circle at ${sx}px ${sy}px, rgb(${color} / 0.10), transparent 70%)`

  useEffect(() => {
    if (reduce) return
    const on = (e: PointerEvent) => {
      x.set(e.clientX)
      y.set(e.clientY)
    }
    window.addEventListener('pointermove', on, { passive: true })
    return () => window.removeEventListener('pointermove', on)
  }, [reduce, x, y])

  if (reduce) return null
  return <motion.div aria-hidden className="pointer-events-none fixed inset-0 z-0" style={{ background: bg }} />
}
