/**
 * React Bits · Magnet
 * El elemento se desplaza ligeramente hacia el cursor.
 */
import { motion, useMotionValue, useReducedMotion, useSpring } from 'motion/react'

export function Magnet({ children, strength = 0.22, className }: { children: React.ReactNode; strength?: number; className?: string }) {
  const reduce = useReducedMotion()
  const x = useSpring(useMotionValue(0), { stiffness: 300, damping: 22 })
  const y = useSpring(useMotionValue(0), { stiffness: 300, damping: 22 })
  if (reduce) return <div className={className}>{children}</div>
  return (
    <motion.div
      className={className}
      style={{ x, y }}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect()
        x.set((e.clientX - (r.left + r.width / 2)) * strength)
        y.set((e.clientY - (r.top + r.height / 2)) * strength)
      }}
      onPointerLeave={() => {
        x.set(0)
        y.set(0)
      }}
    >
      {children}
    </motion.div>
  )
}
