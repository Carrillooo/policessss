/**
 * React Bits · Aurora (versión CSS)
 * Manchas de color difuminadas en lento movimiento. Pensado para cabeceras.
 */
import { cn } from '@/lib/utils'

export function Aurora({
  className,
  colors = ['59 130 246', '56 189 248', '30 58 138'],
  intensity = 0.35,
}: {
  className?: string
  colors?: [string, string, string] | string[]
  intensity?: number
}) {
  return (
    <div aria-hidden className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}>
      <style>{`
        @keyframes aurora-a{0%{transform:translate(-10%,-10%) scale(1)}50%{transform:translate(10%,5%) scale(1.15)}100%{transform:translate(-10%,-10%) scale(1)}}
        @keyframes aurora-b{0%{transform:translate(10%,0) scale(1.1)}50%{transform:translate(-8%,8%) scale(.95)}100%{transform:translate(10%,0) scale(1.1)}}
      `}</style>
      <div
        className="absolute -left-1/4 -top-1/2 h-[140%] w-[70%] rounded-full blur-3xl"
        style={{ background: `rgb(${colors[0]} / ${intensity})`, animation: 'aurora-a 18s ease-in-out infinite' }}
      />
      <div
        className="absolute -right-1/4 -top-1/3 h-[120%] w-[60%] rounded-full blur-3xl"
        style={{ background: `rgb(${colors[1]} / ${intensity * 0.7})`, animation: 'aurora-b 22s ease-in-out infinite' }}
      />
      <div
        className="absolute left-1/4 top-1/3 h-[90%] w-[50%] rounded-full blur-3xl"
        style={{ background: `rgb(${colors[2]} / ${intensity})`, animation: 'aurora-a 26s ease-in-out infinite reverse' }}
      />
    </div>
  )
}
