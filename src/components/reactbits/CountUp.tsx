/**
 * React Bits · CountUp (adaptado)
 * Anima de forma continua entre valores sin re-renderizar React:
 * escribe directamente en el nodo. Si el valor cambia por realtime,
 * interpola desde el valor actual en lugar de saltar.
 */
import { useEffect, useRef } from 'react'
import { animate, useInView, useReducedMotion } from 'motion/react'
import { DURATION, EASE } from '@/lib/animations'
import { cn } from '@/lib/utils'

interface CountUpProps {
  value: number
  from?: number
  decimals?: number
  duration?: number
  delay?: number
  prefix?: string
  suffix?: string
  className?: string
  /** separador de miles */
  separator?: string
  /** Se ejecuta cada vez que termina de animar un cambio */
  onSettled?: () => void
}

export function CountUp({
  value,
  from = 0,
  decimals = 0,
  duration = DURATION.counter,
  delay = 0,
  prefix = '',
  suffix = '',
  className,
  separator = '.',
  onSettled,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const current = useRef(from)
  const inView = useInView(ref, { once: true, margin: '-10% 0px' })
  const reduce = useReducedMotion()

  useEffect(() => {
    const node = ref.current
    if (!node || !inView) return
    const format = (v: number) => {
      const fixed = v.toFixed(decimals)
      const [int, dec] = fixed.split('.')
      const withSep = int.replace(/\B(?=(\d{3})+(?!\d))/g, separator)
      return `${prefix}${withSep}${dec ? ',' + dec : ''}${suffix}`
    }
    if (reduce) {
      current.current = value
      node.textContent = format(value)
      return
    }
    const controls = animate(current.current, value, {
      duration,
      delay,
      ease: EASE.out,
      onUpdate: (v) => {
        current.current = v
        node.textContent = format(v)
      },
      onComplete: onSettled,
    })
    return () => controls.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, inView, reduce, decimals, prefix, suffix])

  return (
    <span ref={ref} className={cn('tabular', className)}>
      {prefix}
      {from.toFixed(decimals).replace('.', ',')}
      {suffix}
    </span>
  )
}
