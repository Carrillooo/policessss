/**
 * RECONSTRUCCIÓN · escena del incidente
 * Varios elementos se despliegan sobre un plano táctico durante unos
 * segundos. Al ocultarse, el aspirante debe recolocarlos (arrastrar o
 * seleccionar + pulsar celda). Puntúa la precisión espacial.
 */
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Banknote, Bike, Briefcase, Car, CheckCheck, Key, Package, Siren, Smartphone, TrafficCone, Truck, User, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DURATION, EASE, EXIT_TRANSITION, SPRING_TRANSITION, STAGGER, enterVariants, staggerContainer, type FeedbackTone } from '@/lib/animations'
import { cn } from '@/lib/utils'
import type { GameProps } from './types'
import { feedbackStyle, handleGridKeys, pickDistinct, rgb, shuffle } from './utils'

const COLS = 6
const ROWS = 4
const CELLS = COLS * ROWS
const ROUNDS = [3, 4, 6] as const
const ACCENT = '45 212 191'

const POOL = [
  { icon: Car, label: 'Turismo' },
  { icon: Truck, label: 'Camión' },
  { icon: Bike, label: 'Bicicleta' },
  { icon: Siren, label: 'Patrulla' },
  { icon: User, label: 'Sospechoso' },
  { icon: Users, label: 'Testigos' },
  { icon: Package, label: 'Paquete' },
  { icon: Briefcase, label: 'Maletín' },
  { icon: Smartphone, label: 'Teléfono' },
  { icon: Key, label: 'Llaves' },
  { icon: TrafficCone, label: 'Cono' },
  { icon: Banknote, label: 'Dinero' },
]

interface Target {
  item: number // índice en POOL
  cell: number
}

type Phase = 'show' | 'place' | 'review'

const coord = (cell: number) => `${String.fromCharCode(65 + (cell % COLS))}${Math.floor(cell / COLS) + 1}`
const dist = (a: number, b: number) => Math.max(Math.abs((a % COLS) - (b % COLS)), Math.abs(Math.floor(a / COLS) - Math.floor(b / COLS)))
const valueOf = (d: number | null) => (d === 0 ? 1 : d === 1 ? 0.5 : 0)
const toneOfDist = (d: number | null): FeedbackTone => (d === 0 ? 'success' : d === 1 ? 'warning' : 'error')

function makeTargets(n: number): Target[] {
  const items = shuffle(POOL.map((_, i) => i)).slice(0, n)
  const cells = pickDistinct(CELLS, n)
  return items.map((item, i) => ({ item, cell: cells[i] }))
}

export default function Reconstruccion({ onComplete, onProgress }: GameProps) {
  const [roundIdx, setRoundIdx] = useState(0)
  const [targets, setTargets] = useState<Target[]>(() => makeTargets(ROUNDS[0]))
  const [phase, setPhase] = useState<Phase>('show')
  /** posición colocada por índice de objetivo */
  const [placed, setPlaced] = useState<(number | null)[]>(() => Array(ROUNDS[0]).fill(null))
  const [selected, setSelected] = useState<number | null>(null)
  const [hoverCell, setHoverCell] = useState<number | null>(null)
  const [roundScores, setRoundScores] = useState<{ exact: number; near: number; miss: number; value: number }[]>([])
  // ponderado por nº de elementos de cada ronda
  const score = roundScores.length
    ? (roundScores.reduce((s, x, i) => s + x.value * ROUNDS[i], 0) / roundScores.reduce((s, _x, i) => s + ROUNDS[i], 0)) * 100
    : 0
  const mapRef = useRef<HTMLDivElement>(null)
  /** instante del último fin de arrastre: evita que el click posterior seleccione */
  const dragEndAt = useRef(0)
  const confirmedRound = useRef(-1)
  const justDragged = () => performance.now() - dragEndAt.current < 300

  const n = targets.length

  useEffect(() => {
    onProgress?.({ round: roundIdx + 1, rounds: ROUNDS.length, score })
  }, [roundIdx, score, onProgress])

  useEffect(() => {
    if (phase !== 'show') return
    const id = setTimeout(() => setPhase('place'), 2600 + n * 650)
    return () => clearTimeout(id)
  }, [phase, n])

  const place = (t: number, cell: number) => {
    setPlaced((prev) => {
      const next = [...prev]
      const occupant = next.indexOf(cell)
      if (occupant >= 0 && occupant !== t) next[occupant] = prev[t] // intercambio
      next[t] = cell
      return next
    })
    setSelected(null)
  }

  const onCell = (cell: number) => {
    if (phase !== 'place' || justDragged()) return
    if (selected != null) return place(selected, cell)
    const occupant = placed.indexOf(cell)
    if (occupant >= 0) setSelected(occupant)
  }

  const select = (t: number) => {
    if (phase !== 'place' || justDragged()) return
    setSelected((s) => (s === t ? null : t))
    requestAnimationFrame(() => {
      const target = placed[t] ?? 0
      mapRef.current?.querySelector<HTMLElement>(`[data-idx="${target}"]`)?.focus({ preventScroll: true })
    })
  }

  const cellAt = (x: number, y: number) => {
    // elementsFromPoint: el propio token arrastrado queda encima
    const el = document.elementsFromPoint(x, y).find((n): n is HTMLElement => n instanceof HTMLElement && n.dataset.cell != null)
    return el ? Number(el.dataset.cell) : null
  }

  const confirm = () => {
    if (phase !== 'place' || confirmedRound.current === roundIdx) return
    confirmedRound.current = roundIdx
    const ds = targets.map((t, i) => (placed[i] == null ? null : dist(placed[i]!, t.cell)))
    const exact = ds.filter((d) => d === 0).length
    const near = ds.filter((d) => d === 1).length
    const value = ds.reduce<number>((s, d) => s + valueOf(d), 0) / n
    setRoundScores((r) => [...r, { exact, near, miss: n - exact - near, value }])
    setSelected(null)
    setPhase('review')
  }

  useEffect(() => {
    if (phase !== 'review') return
    const id = setTimeout(() => {
      const next = roundIdx + 1
      if (next >= ROUNDS.length) {
        const r = roundScores
        const total = ROUNDS.reduce<number>((s, x) => s + x, 0)
        const exact = r.reduce((s, x) => s + x.exact, 0)
        const near = r.reduce((s, x) => s + x.near, 0)
        onComplete(score, {
          'Posición exacta': `${exact}/${total}`,
          'Celda adyacente': near,
          Desviados: total - exact - near,
          Precisión: `${Math.round(((exact + near * 0.5) / total) * 100)}%`,
        })
        return
      }
      setRoundIdx(next)
      setTargets(makeTargets(ROUNDS[next]))
      setPlaced(Array(ROUNDS[next]).fill(null))
      setPhase('show')
    }, 2400)
    return () => clearTimeout(id)
  }, [phase, roundIdx, score, roundScores, onComplete])

  const allPlaced = placed.every((p) => p != null)
  const statusText =
    phase === 'show'
      ? `MEMORIZA LA ESCENA · ${n} ELEMENTOS`
      : phase === 'place'
        ? selected != null
          ? `COLOCA: ${POOL[targets[selected].item].label.toUpperCase()}`
          : `RECONSTRUYE LA ESCENA · ${placed.filter((p) => p != null).length}/${n}`
        : `RONDA ${roundIdx + 1} · ${roundScores[roundIdx]?.exact ?? 0}/${n} EXACTOS`

  return (
    <div className="mx-auto max-w-2xl">
      <p className="mb-3 h-5 text-center font-mono text-xs font-semibold tracking-[0.2em]" aria-live="polite" style={{ color: `rgb(${ACCENT})` }}>
        {statusText}
      </p>

      {/* Plano táctico */}
      <div className="relative overflow-hidden rounded-2xl border border-line-strong bg-[#06111a] p-2 sm:p-3">
        <div aria-hidden className="grid-bg absolute inset-0 opacity-60" style={{ backgroundSize: '22px 22px' }} />
        {/* calles decorativas */}
        <div aria-hidden className="absolute inset-x-0 top-1/2 h-5 -translate-y-1/2 bg-white/[0.035]">
          <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-amber-200/15" />
        </div>
        <div aria-hidden className="absolute inset-y-0 left-[33.3%] w-5 -translate-x-1/2 bg-white/[0.035]">
          <div className="absolute inset-y-0 left-1/2 border-l border-dashed border-amber-200/15" />
        </div>

        <div
          ref={mapRef}
          role="grid"
          aria-label="Plano de la escena"
          onKeyDown={(e) => handleGridKeys(e, COLS)}
          className="relative grid grid-cols-6 gap-1 sm:gap-1.5"
        >
          {Array.from({ length: CELLS }).map((_, cell) => {
            const shownIdx = targets.findIndex((t) => t.cell === cell)
            const placedIdx = placed.indexOf(cell)
            const isHover = hoverCell === cell && phase === 'place'
            const ghostIdx = phase === 'review' ? targets.findIndex((t, i) => t.cell === cell && placed[i] !== cell) : -1
            return (
              <button
                key={cell}
                type="button"
                role="gridcell"
                data-idx={cell}
                data-cell={cell}
                tabIndex={phase === 'place' && cell === 0 ? 0 : -1}
                disabled={phase !== 'place'}
                onClick={() => onCell(cell)}
                aria-label={`${coord(cell)}${placedIdx >= 0 ? `, ${POOL[targets[placedIdx].item].label}` : ''}`}
                className={cn(
                  'relative aspect-square rounded-lg border border-white/[0.05] bg-white/[0.015] transition-[border-color,background-color] duration-150 disabled:cursor-default',
                  phase === 'place' && 'hover:border-teal-300/40 hover:bg-teal-300/[0.05]',
                  phase === 'place' && selected != null && placedIdx < 0 && 'border-teal-300/15',
                  isHover && 'border-teal-300/60 bg-teal-300/10',
                )}
              >
                <span className="absolute left-1 top-0.5 font-mono text-[8px] text-dim sm:text-[9px]">{coord(cell)}</span>

                {/* Exposición */}
                <AnimatePresence>
                  {phase === 'show' && shownIdx >= 0 && (
                    <motion.span
                      key={`show-${roundIdx}-${cell}`}
                      className="absolute inset-1 grid place-items-center rounded-md"
                      style={{ color: `rgb(${ACCENT})`, background: `rgb(${ACCENT} / 0.12)`, boxShadow: `inset 0 0 0 1px rgb(${ACCENT} / 0.35)` }}
                      initial={{ opacity: 0, scale: 0.5, filter: 'blur(8px)' }}
                      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)', transition: { ...SPRING_TRANSITION, delay: 0.2 + shownIdx * STAGGER.slow } }}
                      exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)', transition: { duration: DURATION.modal, ease: EASE.in } }}
                    >
                      <Glyph item={targets[shownIdx].item} />
                    </motion.span>
                  )}
                </AnimatePresence>

                {/* Posición real (revisión) */}
                {ghostIdx >= 0 && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, transition: { duration: DURATION.card, delay: 0.2 } }}
                    className="absolute inset-1 grid place-items-center rounded-md border border-dashed text-fg/50"
                    style={{ borderColor: rgb('success', 0.55) }}
                  >
                    <Glyph item={targets[ghostIdx].item} />
                  </motion.span>
                )}

                {/* Colocado */}
                {phase !== 'show' && placedIdx >= 0 && (
                  <Token
                    key={`tok-${roundIdx}-${placedIdx}`}
                    item={targets[placedIdx].item}
                    layoutId={`tok-${roundIdx}-${placedIdx}`}
                    selected={selected === placedIdx}
                    draggable={phase === 'place'}
                    tone={phase === 'review' ? toneOfDist(dist(cell, targets[placedIdx].cell)) : null}
                    className="absolute inset-1"
                    inMap
                    onDragEnded={() => (dragEndAt.current = performance.now())}
                    onDragMove={(x, y) => setHoverCell(cellAt(x, y))}
                    onDrop={(x, y) => {
                      setHoverCell(null)
                      const c = cellAt(x, y)
                      if (c != null) place(placedIdx, c)
                    }}
                  />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Bandeja de elementos */}
      <div className="mt-4 flex min-h-[72px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <AnimatePresence mode="wait">
          {phase === 'place' && (
            <motion.div
              key={`tray-${roundIdx}`}
              variants={staggerContainer(STAGGER.fast)}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, transition: EXIT_TRANSITION }}
              className="flex flex-wrap gap-2"
              aria-label="Elementos por colocar"
            >
              {targets.map((t, i) =>
                placed[i] == null ? (
                  <motion.div key={i} variants={enterVariants} className="flex flex-col items-center gap-1">
                    <Token
                      item={t.item}
                      layoutId={`tok-${roundIdx}-${i}`}
                      selected={selected === i}
                      draggable
                      className="size-12 sm:size-14"
                      onSelect={() => select(i)}
                      onDragEnded={() => (dragEndAt.current = performance.now())}
                      onDragMove={(x, y) => setHoverCell(cellAt(x, y))}
                      onDrop={(x, y) => {
                        setHoverCell(null)
                        const c = cellAt(x, y)
                        if (c != null) place(i, c)
                      }}
                    />
                    <span className="font-mono text-[9px] tracking-[0.12em] text-muted">{POOL[t.item].label.toUpperCase()}</span>
                  </motion.div>
                ) : null,
              )}
              {allPlaced && <span className="self-center text-xs text-muted">Todos los elementos colocados.</span>}
            </motion.div>
          )}
          {phase === 'show' && (
            <motion.p key="hint" variants={enterVariants} initial="hidden" animate="show" exit="exit" className="text-xs text-dim">
              Observa la posición de cada elemento sobre el plano.
            </motion.p>
          )}
          {phase === 'review' && (
            <motion.div key="legend" variants={enterVariants} initial="hidden" animate="show" exit="exit" className="flex flex-wrap gap-3 font-mono text-[10.5px] tracking-[0.12em] text-muted">
              <Legend tone="success" label="EXACTO" />
              <Legend tone="warning" label="ADYACENTE" />
              <Legend tone="error" label="DESVIADO" />
              <span className="flex items-center gap-1.5">
                <span className="size-3 rounded border border-dashed" style={{ borderColor: rgb('success', 0.55) }} /> POSICIÓN REAL
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {phase === 'place' && (
          <Button variant="primary" disabled={!allPlaced} onClick={confirm} className="shrink-0">
            <CheckCheck /> CONFIRMAR ESCENA
          </Button>
        )}
      </div>
      <p className="mt-2 text-xs text-dim">Arrastra cada elemento o selecciónalo y pulsa una celda. Teclado: Tab para elegir, flechas + Enter para colocar.</p>
    </div>
  )
}

function Glyph({ item }: { item: number }) {
  const Icon = POOL[item].icon
  return <Icon className="size-[55%] max-h-7 max-w-7" />
}

function Legend({ tone, label }: { tone: FeedbackTone; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="size-2 rounded-full" style={{ background: rgb(tone) }} /> {label}
    </span>
  )
}

interface TokenProps {
  item: number
  layoutId: string
  selected: boolean
  draggable: boolean
  tone?: FeedbackTone | null
  className?: string
  /** En el plano el token no es focusable: la celda gestiona selección/teclado */
  inMap?: boolean
  onSelect?: () => void
  onDragEnded: () => void
  onDragMove: (x: number, y: number) => void
  onDrop: (x: number, y: number) => void
}

/** Elemento arrastrable (bandeja o plano). Pulsar = seleccionar. */
function Token({ item, layoutId, selected, draggable, tone, className, inMap, onSelect, onDragEnded, onDragMove, onDrop }: TokenProps) {
  const label = POOL[item].label
  const style: React.CSSProperties = tone
    ? feedbackStyle(tone)
    : {
        color: `rgb(${ACCENT})`,
        background: `rgb(${ACCENT} / ${selected ? 0.22 : 0.1})`,
        boxShadow: selected ? `0 0 0 2px rgb(${ACCENT}), 0 0 24px -4px rgb(${ACCENT} / 0.7)` : `inset 0 0 0 1px rgb(${ACCENT} / 0.35)`,
      }
  return (
    <motion.span
      layoutId={layoutId}
      role={inMap ? undefined : 'button'}
      tabIndex={inMap || !draggable ? -1 : 0}
      aria-hidden={inMap || undefined}
      aria-pressed={inMap ? undefined : selected}
      aria-label={inMap ? undefined : `${label}${selected ? ' (seleccionado)' : ''}`}
      drag={draggable}
      dragSnapToOrigin
      dragMomentum={false}
      dragElastic={0}
      whileDrag={{ scale: 1.12, zIndex: 50, cursor: 'grabbing' }}
      transition={SPRING_TRANSITION}
      onDrag={(_, info) => onDragMove(info.point.x - window.scrollX, info.point.y - window.scrollY)}
      onDragEnd={(_, info) => {
        onDragEnded()
        onDrop(info.point.x - window.scrollX, info.point.y - window.scrollY)
      }}
      onClick={
        inMap
          ? undefined
          : (e) => {
              e.stopPropagation()
              onSelect?.()
            }
      }
      onKeyDown={(e) => {
        if (inMap) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          e.stopPropagation()
          onSelect?.()
        }
      }}
      className={cn(
        'z-10 grid touch-none select-none place-items-center rounded-md',
        draggable && 'cursor-grab',
        className,
      )}
      style={style}
    >
      <Glyph item={item} />
    </motion.span>
  )
}
