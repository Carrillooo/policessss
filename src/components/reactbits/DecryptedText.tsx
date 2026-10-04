/**
 * React Bits · DecryptedText (adaptado)
 * Descifra el texto carácter a carácter. Ideal para estados de sistema
 * ("IDENTITY VERIFIED", "SECURE PERSONNEL ACCESS").
 */
import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { cn } from '@/lib/utils'

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&$@'

interface DecryptedTextProps {
  text: string
  /** ms por carácter revelado */
  speed?: number
  delay?: number
  className?: string
  encryptedClassName?: string
  onDone?: () => void
}

export function DecryptedText({ text, speed = 28, delay = 0, className, encryptedClassName, onDone }: DecryptedTextProps) {
  const reduce = useReducedMotion()
  const [revealed, setRevealed] = useState(reduce ? text.length : 0)
  const [tick, setTick] = useState(0)
  const doneRef = useRef(onDone)
  doneRef.current = onDone

  useEffect(() => {
    if (reduce) {
      setRevealed(text.length)
      doneRef.current?.()
      return
    }
    setRevealed(0)
    let raf = 0
    let start = 0
    const loop = (t: number) => {
      if (!start) start = t + delay
      const elapsed = t - start
      if (elapsed >= 0) {
        const n = Math.min(text.length, Math.floor(elapsed / speed))
        setRevealed(n)
        setTick((x) => x + 1)
        if (n >= text.length) {
          doneRef.current?.()
          return
        }
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [text, speed, delay, reduce])

  return (
    <span className={cn('font-mono', className)} aria-label={text}>
      <span aria-hidden>
        {Array.from(text).map((c, i) => {
          if (i < revealed || c === ' ') return <span key={i}>{c}</span>
          const r = CHARS[(i * 7 + tick * 3) % CHARS.length]
          return (
            <span key={i} className={cn('text-brand/70', encryptedClassName)}>
              {r}
            </span>
          )
        })}
      </span>
    </span>
  )
}
