/**
 * React Bits · AnimatedContent / FadeContent
 * Revela contenido al entrar en el viewport (una sola vez).
 */
import { motion } from 'motion/react'
import { DEFAULT_TRANSITION } from '@/lib/animations'

interface Props {
  children: React.ReactNode
  className?: string
  delay?: number
  distance?: number
  blur?: boolean
}

export function AnimatedContent({ children, className, delay = 0, distance = 16, blur = true }: Props) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: distance, filter: blur ? 'blur(6px)' : 'none' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ ...DEFAULT_TRANSITION, delay }}
    >
      {children}
    </motion.div>
  )
}
