/**
 * React Bits · BlurText (adaptado)
 * Revela palabras o letras con blur + desplazamiento escalonado.
 */
import { motion, useReducedMotion } from 'motion/react'
import { EASE } from '@/lib/animations'
import { cn } from '@/lib/utils'

interface BlurTextProps {
  text: string
  by?: 'words' | 'letters'
  delay?: number
  stagger?: number
  className?: string
  direction?: 'top' | 'bottom'
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span' | 'div'
}

export function BlurText({
  text,
  by = 'words',
  delay = 0,
  stagger,
  className,
  direction = 'bottom',
  as = 'span',
}: BlurTextProps) {
  const reduce = useReducedMotion()
  const parts = by === 'words' ? text.split(' ') : Array.from(text)
  const step = stagger ?? (by === 'words' ? 0.07 : 0.03)
  const Tag = motion[as]
  const offset = direction === 'bottom' ? 10 : -10

  if (reduce) {
    const Plain = as
    return <Plain className={className}>{text}</Plain>
  }

  return (
    <Tag className={cn('inline-block', className)} aria-label={text}>
      {parts.map((p, i) => (
        <motion.span
          key={i}
          aria-hidden
          className="inline-block whitespace-pre will-change-[transform,filter,opacity]"
          initial={{ opacity: 0, y: offset, filter: 'blur(10px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.5, ease: EASE.out, delay: delay + i * step }}
        >
          {p}
          {by === 'words' && i < parts.length - 1 ? ' ' : ''}
        </motion.span>
      ))}
    </Tag>
  )
}
