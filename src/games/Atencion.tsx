/**
 * ATENCIÓN · vigilancia selectiva
 * Un flujo de símbolos atraviesa el escáner. Sólo la placa ★ es objetivo.
 * El movimiento se calcula en un único bucle rAF que escribe `transform`
 * directamente en cada nodo (cero re-renders por frame).
 * Con reduced motion los símbolos aparecen fijos y se desvanecen (opacidad).
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Asterisk, Diamond, Hexagon, Octagon, Shield, Sparkle, Star } from 'lucide-react'
import { DURATION, EASE, EXIT_TRANSITION, type FeedbackTone } from '@/lib/animations'
import { Kbd } from '@/components/ui/kbd'
import { cn } from '@/lib/utils'
import type { GameProps } from './types'
import { randInt, rgb, shuffle } from './utils'

const TOTAL = 44
const TARGETS = 11
const LANES = 3
const SLOTS = 5
const SIZE = 56
const DISTRACTORS = [Asterisk, Sparkle, Hexagon, Shield, Octagon, Diamond]

type Status = 'live' | 'hit' | 'false'
interface Item {
  id: number
  kind: number // -1 = objetivo
  lane: number
  slot: number
  spawnAt: number
  dur: number
  status: Status
}

interface Flash {
  key: number
  tone: FeedbackTone
  label: string
}

/** Secuencia: objetivos repartidos sin dos seguidos */
function makeSchedule(): number[] {
  for (;;) {
    const s = shuffle([...Array(TARGETS).fill(-1), ...Array.from({ length: TOTAL - TARGETS }, () => randInt(0, DISTRACTORS.length - 1))])
    if (s[0] !== -1 && s.every((k, i) => !(k === -1 && s[i - 1] === -1))) return s
  }
}

export default function Atencion({ onComplete, onProgress }: GameProps) {
  const reduce = !!useReducedMotion()
  const trackRef = useRef<HTMLDivElement>(null)
  const width = useRef(800)
  const nodes = useRef(new Map<number, HTMLDivElement>())
  const itemsRef = useRef<Item[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [stats, setStats] = useState({ hits: 0, misses: 0, fa: 0, spawned: 0 })
  const statsRef = useRef(stats)
  const rts = useRef<number[]>([])
  const [flash, setFlash] = useState<Flash | null>(null)
  const finished = useRef(false)

  const commit = () => setItems([...itemsRef.current])
  const bump = (patch: Partial<typeof stats>) => {
    statsRef.current = { ...statsRef.current, ...patch }
    setStats(statsRef.current)
  }
  const fire = (tone: FeedbackTone, label: string) => setFlash({ key: performance.now(), tone, label })

  const lifetime = (it: Item) => (reduce ? it.dur * 0.5 : it.dur)
  const xAt = useCallback(
    (it: Item, now: number) => {
      if (reduce) return ((it.slot + 0.5) * width.current) / SLOTS - SIZE / 2
      const p = (now - it.spawnAt) / it.dur
      return width.current - p * (width.current + SIZE)
    },
    [reduce],
  )

  // Medición del ancho del escáner
  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => (width.current = e.contentRect.width))
    ro.observe(el)
    width.current = el.clientWidth
    return () => ro.disconnect()
  }, [])

  // HUD
  useEffect(() => {
    const resolved = stats.hits + stats.misses
    const base = resolved ? (stats.hits / resolved) * 100 : 100
    onProgress?.({ round: stats.spawned, rounds: TOTAL, score: Math.max(0, base - stats.fa * 6) })
  }, [stats, onProgress])

  // Bucle principal
  useEffect(() => {
    const schedule = makeSchedule()
    let spawned = 0
    let nextAt = performance.now() + 500
    let lastLane = -1
    let pausedAt = 0
    let raf = 0

    const onVis = () => {
      if (document.hidden) pausedAt = performance.now()
      else if (pausedAt) {
        const d = performance.now() - pausedAt
        nextAt += d
        itemsRef.current.forEach((it) => (it.spawnAt += d))
        pausedAt = 0
      }
    }
    document.addEventListener('visibilitychange', onVis)

    const loop = (now: number) => {
      if (pausedAt) {
        raf = requestAnimationFrame(loop)
        return
      }
      let changed = false
      // Aparición
      if (spawned < TOTAL && now >= nextAt) {
        const progress = spawned / TOTAL
        const lanes = Array.from({ length: LANES }, (_, i) => i).filter((l) => l !== lastLane)
        const lane = lanes[randInt(0, lanes.length - 1)]
        const used = new Set(itemsRef.current.filter((i) => i.lane === lane).map((i) => i.slot))
        const free = Array.from({ length: SLOTS }, (_, i) => i).filter((s) => !used.has(s))
        itemsRef.current.push({
          id: spawned,
          kind: schedule[spawned],
          lane,
          slot: free.length ? free[randInt(0, free.length - 1)] : randInt(0, SLOTS - 1),
          spawnAt: now,
          dur: 4300 - progress * 1300,
          status: 'live',
        })
        lastLane = lane
        spawned++
        nextAt = now + (760 - progress * 280) + randInt(-90, 90)
        statsRef.current = { ...statsRef.current, spawned }
        setStats(statsRef.current)
        changed = true
      }
      // Movimiento + salida
      const keep: Item[] = []
      for (const it of itemsRef.current) {
        if (now - it.spawnAt >= lifetime(it)) {
          if (it.kind === -1 && it.status === 'live') {
            statsRef.current = { ...statsRef.current, misses: statsRef.current.misses + 1 }
            setStats(statsRef.current)
            setFlash({ key: now, tone: 'warning', label: 'OMISIÓN' })
          }
          changed = true
          continue
        }
        keep.push(it)
        if (!reduce) {
          const node = nodes.current.get(it.id)
          if (node) node.style.transform = `translate3d(${xAt(it, now)}px,0,0)`
        }
      }
      itemsRef.current = keep
      if (changed) setItems([...keep])

      if (spawned >= TOTAL && keep.length === 0) {
        if (!finished.current) {
          finished.current = true
          setTimeout(() => {
            const s = statsRef.current
            const avg = rts.current.length ? rts.current.reduce((a, b) => a + b, 0) / rts.current.length : 0
            onComplete(Math.max(0, (s.hits / TARGETS) * 100 - s.fa * 6), {
              Aciertos: `${s.hits}/${TARGETS}`,
              Omisiones: s.misses,
              'Falsas alarmas': s.fa,
              'Detección media (ms)': Math.round(avg),
              Estímulos: TOTAL,
            })
          }, 500)
        }
        return
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('visibilitychange', onVis)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const resolve = (it: Item, now: number) => {
    if (it.status !== 'live') return
    if (it.kind === -1) {
      it.status = 'hit'
      rts.current.push(now - it.spawnAt)
      bump({ hits: statsRef.current.hits + 1 })
      fire('success', 'ACIERTO')
    } else {
      it.status = 'false'
      bump({ fa: statsRef.current.fa + 1 })
      fire('error', 'FALSA ALARMA')
    }
    commit()
  }

  // Espacio: "hay un objetivo en pantalla"
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat) return
      if ((e.target as HTMLElement).closest('input,textarea,[role="dialog"]')) return
      e.preventDefault()
      const now = performance.now()
      const visible = itemsRef.current.filter((it) => {
        if (it.kind !== -1 || it.status !== 'live') return false
        const x = xAt(it, now)
        return x >= -SIZE * 0.25 && x <= width.current - SIZE * 0.75
      })
      if (visible.length) resolve(visible.sort((a, b) => a.spawnAt - b.spawnAt)[0], now)
      else {
        bump({ fa: statsRef.current.fa + 1 })
        fire('error', 'FALSA ALARMA')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [xAt])

  const now = performance.now()

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="label-caps">Objetivo</span>
          <span className="grid size-9 place-items-center rounded-lg border border-amber-300/40 bg-amber-300/10 text-amber-200">
            <Star className="size-5 fill-current" />
          </span>
          <span className="hidden text-xs text-muted sm:inline">
            Pulsa la placa o <Kbd>Espacio</Kbd> cuando esté en pantalla
          </span>
        </div>
        <div className="flex gap-2 font-mono text-[11px] tracking-[0.12em]" aria-live="polite">
          <Counter label="ACIERTOS" value={stats.hits} tone="success" />
          <Counter label="OMISIONES" value={stats.misses} tone="warning" />
          <Counter label="F. ALARMAS" value={stats.fa} tone="error" />
        </div>
      </div>

      <div
        ref={trackRef}
        className="relative overflow-hidden rounded-2xl border border-line-strong bg-[#070c18]"
        style={{ height: LANES * (SIZE + 20) + 20 }}
        aria-label="Escáner de vigilancia"
      >
        <div aria-hidden className="grid-bg absolute inset-0 opacity-70" />
        {/* carriles */}
        {Array.from({ length: LANES - 1 }).map((_, i) => (
          <div key={i} aria-hidden className="absolute inset-x-0 border-t border-dashed border-line" style={{ top: 10 + (i + 1) * (SIZE + 20) }} />
        ))}
        {/* bordes de entrada/salida */}
        <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-[#070c18] to-transparent" />
        <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-[#070c18] to-transparent" />

        {items.map((it) => {
          const Icon = it.kind === -1 ? Star : DISTRACTORS[it.kind]
          return (
            <div
              key={it.id}
              ref={(el) => {
                if (el) nodes.current.set(it.id, el)
                else nodes.current.delete(it.id)
              }}
              className="absolute left-0 will-change-transform"
              style={{ top: 20 + it.lane * (SIZE + 20), width: SIZE, height: SIZE, transform: `translate3d(${xAt(it, now)}px,0,0)` }}
            >
              <motion.button
                type="button"
                tabIndex={-1}
                aria-hidden
                initial={reduce ? { opacity: 0 } : false}
                animate={{ opacity: 1, transition: { duration: DURATION.micro } }}
                onPointerDown={(e) => {
                  e.preventDefault()
                  resolve(it, performance.now())
                }}
                className={cn(
                  'grid size-full touch-manipulation place-items-center rounded-xl border bg-[#0e1730] text-sky-200/90',
                  it.status === 'live' && 'border-line-strong hover:border-sky-400/50',
                )}
                style={
                  it.status === 'hit'
                    ? { borderColor: rgb('success', 0.8), color: rgb('success'), background: rgb('success', 0.15) }
                    : it.status === 'false'
                      ? { borderColor: rgb('error', 0.8), color: rgb('error'), background: rgb('error', 0.15) }
                      : undefined
                }
              >
                <motion.span
                  animate={it.status === 'hit' ? { scale: 1.35, opacity: 0 } : { scale: 1, opacity: 1 }}
                  transition={{ duration: DURATION.modal, ease: EASE.out }}
                >
                  <Icon className="size-7" strokeWidth={1.75} />
                </motion.span>
              </motion.button>
            </div>
          )
        })}

        {/* destello de feedback (sólo opacidad) */}
        <AnimatePresence>
          {flash && (
            <motion.div
              key={flash.key}
              aria-hidden
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              transition={{ duration: DURATION.flash, ease: EASE.out }}
              className="pointer-events-none absolute inset-0 z-20 rounded-2xl"
              style={{ boxShadow: `inset 0 0 0 2px ${rgb(flash.tone, 0.85)}, inset 0 0 50px -10px ${rgb(flash.tone, 0.6)}` }}
            />
          )}
        </AnimatePresence>
        <div className="pointer-events-none absolute right-3 top-2 z-20 h-5" aria-live="assertive">
          <AnimatePresence mode="popLayout">
            {flash && (
              <motion.span
                key={flash.key}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0, transition: { duration: DURATION.micro } }}
                exit={{ opacity: 0, transition: EXIT_TRANSITION }}
                className="font-mono text-[10.5px] font-semibold tracking-[0.2em]"
                style={{ color: rgb(flash.tone) }}
              >
                {flash.label}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-dim sm:hidden">Toca sólo la placa ★. Evita los distractores.</p>
    </div>
  )
}

function Counter({ label, value, tone }: { label: string; value: number; tone: FeedbackTone }) {
  return (
    <span className="flex items-center gap-1.5 rounded-md border border-line bg-white/[0.02] px-2 py-1">
      <span className="size-1.5 rounded-full" style={{ background: rgb(tone) }} />
      <span className="text-muted">{label}</span>
      <span className="tabular text-fg">{value}</span>
    </span>
  )
}
