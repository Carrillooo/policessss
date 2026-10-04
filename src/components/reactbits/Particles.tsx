/**
 * React Bits · Particles (canvas 2D ligero)
 * - Densidad baja y limitada
 * - Se pausa cuando la pestaña no es visible
 * - No se monta con reduced motion
 * Carga perezosa: importar con React.lazy desde `LazyParticles`.
 */
import { useEffect, useRef } from 'react'

interface ParticlesProps {
  count?: number
  color?: string
  className?: string
  /** velocidad base en px/frame */
  speed?: number
  linkDistance?: number
}

export default function Particles({ count = 60, color = '147 197 253', className, speed = 0.18, linkDistance = 110 }: ParticlesProps) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let w = 0
    let h = 0
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const resize = () => {
      w = canvas.clientWidth
      h = canvas.clientHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const n = Math.min(count, Math.floor((w * h) / 9000))
    const pts = Array.from({ length: n }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * speed,
      vy: (Math.random() - 0.5) * speed,
      r: Math.random() * 1.3 + 0.4,
      a: Math.random() * 0.5 + 0.2,
    }))

    let raf = 0
    let running = true
    const ld2 = linkDistance * linkDistance
    const frame = () => {
      if (!running) return
      ctx.clearRect(0, 0, w, h)
      for (const p of pts) {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0 || p.x > w) p.vx *= -1
        if (p.y < 0 || p.y > h) p.vy *= -1
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgb(${color} / ${p.a})`
        ctx.fill()
      }
      ctx.lineWidth = 0.6
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x
          const dy = pts[i].y - pts[j].y
          const d2 = dx * dx + dy * dy
          if (d2 < ld2) {
            ctx.strokeStyle = `rgb(${color} / ${0.12 * (1 - d2 / ld2)})`
            ctx.beginPath()
            ctx.moveTo(pts[i].x, pts[i].y)
            ctx.lineTo(pts[j].x, pts[j].y)
            ctx.stroke()
          }
        }
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    const onVis = () => {
      running = !document.hidden
      if (running) raf = requestAnimationFrame(frame)
      else cancelAnimationFrame(raf)
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      running = false
      cancelAnimationFrame(raf)
      ro.disconnect()
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [count, color, speed, linkDistance])

  return <canvas ref={ref} aria-hidden className={className ?? 'pointer-events-none absolute inset-0 h-full w-full'} />
}
