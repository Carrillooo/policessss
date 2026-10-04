/**
 * React Bits · GridMotion / Squares (versión ligera, CSS)
 * Retícula técnica con máscara radial y un haz de escaneo opcional.
 */
import { cn } from '@/lib/utils'

interface GridBackgroundProps {
  className?: string
  scan?: boolean
  /** intensidad de la máscara: 'center' | 'top' */
  fade?: 'center' | 'top'
  cell?: number
}

export function GridBackground({ className, scan = false, fade = 'center', cell = 44 }: GridBackgroundProps) {
  const mask =
    fade === 'center'
      ? 'radial-gradient(ellipse 70% 60% at 50% 45%, #000 30%, transparent 75%)'
      : 'linear-gradient(to bottom, #000 0%, transparent 85%)'
  return (
    <div aria-hidden className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}>
      <div
        className="grid-bg absolute inset-0"
        style={{ backgroundSize: `${cell}px ${cell}px`, maskImage: mask, WebkitMaskImage: mask }}
      />
      {scan && (
        <div data-decorative="true" className="absolute inset-0" style={{ maskImage: mask, WebkitMaskImage: mask }}>
          <div className="animate-scan absolute inset-x-0 h-1/2 bg-gradient-to-b from-transparent via-sky-400/[0.06] to-transparent" style={{ animationDuration: '6s' }} />
        </div>
      )}
    </div>
  )
}
