/**
 * React Bits · SpotlightCard (adaptado)
 * Un foco radial sigue al ratón dentro de la card. Usa variables CSS
 * actualizadas en pointermove → cero re-renders.
 */
import { useRef } from 'react'
import { cn } from '@/lib/utils'

interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** rgb sin "rgb()" — p.ej. "59 130 246" */
  spotlightColor?: string
  size?: number
  /** Borde que también se ilumina cerca del cursor */
  borderGlow?: boolean
}

export function SpotlightCard({
  spotlightColor = '59 130 246',
  size = 340,
  borderGlow = true,
  className,
  children,
  onPointerMove,
  ...props
}: SpotlightCardProps) {
  const ref = useRef<HTMLDivElement>(null)

  return (
    <div
      ref={ref}
      onPointerMove={(e) => {
        const el = ref.current
        if (el) {
          const r = el.getBoundingClientRect()
          el.style.setProperty('--mx', `${e.clientX - r.left}px`)
          el.style.setProperty('--my', `${e.clientY - r.top}px`)
        }
        onPointerMove?.(e)
      }}
      className={cn('panel group/spot relative overflow-hidden', className)}
      {...props}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover/spot:opacity-100"
        style={{
          background: `radial-gradient(${size}px circle at var(--mx, 50%) var(--my, 50%), rgb(${spotlightColor} / 0.13), transparent 60%)`,
        }}
      />
      {borderGlow && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover/spot:opacity-100"
          style={{
            padding: 1,
            background: `radial-gradient(${size * 0.7}px circle at var(--mx, 50%) var(--my, 50%), rgb(${spotlightColor} / 0.55), transparent 55%)`,
            WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
          }}
        />
      )}
      <div className="relative">{children}</div>
    </div>
  )
}
