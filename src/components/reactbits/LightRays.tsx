/**
 * React Bits · LightRays (reinterpretado en CSS)
 * Haces de luz cónicos desde arriba. Sin WebGL: sólo transform/opacity.
 */
import { cn } from '@/lib/utils'

export function LightRays({ className, color = '59 130 246' }: { className?: string; color?: string }) {
  return (
    <div aria-hidden className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}>
      <div
        className="absolute left-1/2 top-[-30%] h-[130%] w-[160%] -translate-x-1/2 opacity-70 blur-2xl"
        style={{
          background: `conic-gradient(from 180deg at 50% 0%, transparent 155deg, rgb(${color} / 0.16) 168deg, transparent 174deg, rgb(${color} / 0.22) 180deg, transparent 186deg, rgb(${color} / 0.12) 193deg, transparent 205deg)`,
          maskImage: 'linear-gradient(to bottom, #000, transparent 75%)',
          WebkitMaskImage: 'linear-gradient(to bottom, #000, transparent 75%)',
        }}
      />
      <div
        data-decorative="true"
        className="absolute left-1/2 top-[-20%] h-[110%] w-[120%] animate-[rays_9s_ease-in-out_infinite_alternate] blur-3xl"
        style={{
          background: `conic-gradient(from 180deg at 50% 0%, transparent 165deg, rgb(56 189 248 / 0.12) 176deg, transparent 184deg)`,
          maskImage: 'linear-gradient(to bottom, #000, transparent 70%)',
          WebkitMaskImage: 'linear-gradient(to bottom, #000, transparent 70%)',
        }}
      />
      <style>{`@keyframes rays{from{transform:translateX(-50%) rotate(-4deg)}to{transform:translateX(-50%) rotate(4deg)}}`}</style>
    </div>
  )
}
