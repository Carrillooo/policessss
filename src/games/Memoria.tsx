/**
 * MEMORIA · secuencia operativa
 * Una secuencia de símbolos se enciende en la retícula (entrada escalonada),
 * se desvanece con blur y el aspirante debe reproducir el orden.
 */
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Car, Fingerprint, Key, Radio, Shield, Siren, Star, Target } from 'lucide-react'
import { DURATION, EASE, EXIT_TRANSITION, SPRING_TRANSITION } from '@/lib/animations'
import { cn, pad } from '@/lib/utils'
import type { GameProps } from './types'
import { feedbackStyle, handleGridKeys, pickDistinct, shuffle, toneOf } from './utils'

const COLS = 4
const CELLS = 16
const LENGTHS = [3, 4, 4, 5, 6, 7] as const
const SYMBOLS = [Shield, Star, Siren, Radio, Car, Key, Fingerprint, Target]
const STEP_MS = 420

type Phase = 'show' | 'input' | 'review'

interface Round {
  cells: number[]
  symbols: number[]
}

const makeRound = (len: number): Round => ({
  cells: pickDistinct(CELLS, len),
  symbols: shuffle(SYMBOLS.map((_, i) => i)).slice(0, len),
})

export default function Memoria({ onComplete, onProgress }: GameProps) {
  const [roundIdx, setRoundIdx] = useState(0)
  const [round, setRound] = useState<Round>(() => makeRound(LENGTHS[0]))
  const [phase, setPhase] = useState<Phase>('show')
  const [picks, setPicks] = useState<number[]>([])
  const [results, setResults] = useState<{ correct: number; len: number }[]>([])
  const score = results.length ? (results.reduce((s, r) => s + r.correct, 0) / results.reduce((s, r) => s + r.len, 0)) * 100 : 0
  const gridRef = useRef<HTMLDivElement>(null)
  /** selecciones confirmadas de forma síncrona (evita dobles clics en el mismo frame) */
  const picksRef = useRef<number[]>([])

  const len = round.cells.length

  useEffect(() => {
    onProgress?.({ round: roundIdx + 1, rounds: LENGTHS.length, score })
  }, [roundIdx, score, onProgress])

  // Fase de exposición → ocultar
  useEffect(() => {
    if (phase !== 'show') return
    const exposure = 700 + len * STEP_MS + 900
    const id = setTimeout(() => {
      setPhase('input')
      requestAnimationFrame(() => gridRef.current?.querySelector<HTMLElement>('[data-idx="0"]')?.focus({ preventScroll: true }))
    }, exposure)
    return () => clearTimeout(id)
  }, [phase, len])

  // Revisión → siguiente ronda o final
  useEffect(() => {
    if (phase !== 'review') return
    const id = setTimeout(() => {
      const next = roundIdx + 1
      if (next >= LENGTHS.length) {
        const all = results
        const totalLen = all.reduce((s, r) => s + r.len, 0)
        const totalOk = all.reduce((s, r) => s + r.correct, 0)
        const perfect = all.filter((r) => r.correct === r.len).length
        onComplete((totalOk / totalLen) * 100, {
          'Rondas perfectas': `${perfect}/${LENGTHS.length}`,
          'Posiciones correctas': `${totalOk}/${totalLen}`,
          'Secuencia máx. superada': Math.max(0, ...all.filter((r) => r.correct === r.len).map((r) => r.len)),
          Precisión: `${Math.round((totalOk / totalLen) * 100)}%`,
        })
        return
      }
      setRoundIdx(next)
      setRound(makeRound(LENGTHS[next]))
      picksRef.current = []
      setPicks([])
      setPhase('show')
    }, 1300)
    return () => clearTimeout(id)
  }, [phase, roundIdx, results, onComplete])

  const pick = (cell: number) => {
    const prev = picksRef.current
    if (phase !== 'input' || prev.includes(cell) || prev.length >= len) return
    const next = [...prev, cell]
    picksRef.current = next
    setPicks(next)
    if (next.length === len) {
      const correct = next.filter((c, i) => round.cells[i] === c).length
      setResults((r) => [...r, { correct, len }])
      setPhase('review')
    }
  }

  const lastResult = phase === 'review' ? results[results.length - 1] : null

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center">
      <div className="mb-4 flex h-8 items-center gap-3" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={phase}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0, transition: { duration: DURATION.card, ease: EASE.out } }}
            exit={{ opacity: 0, y: -4, transition: EXIT_TRANSITION }}
            className="font-mono text-xs font-semibold tracking-[0.2em]"
            style={lastResult ? { color: feedbackStyle(toneOf(lastResult.correct / lastResult.len)).color } : undefined}
          >
            {phase === 'show' && `MEMORIZA LA SECUENCIA · ${len} ELEMENTOS`}
            {phase === 'input' && `REPRODUCE EL ORDEN · ${picks.length}/${len}`}
            {phase === 'review' && lastResult && `${lastResult.correct}/${lastResult.len} EN POSICIÓN CORRECTA`}
          </motion.p>
        </AnimatePresence>
      </div>

      <div
        ref={gridRef}
        role="grid"
        aria-label="Retícula de memoria"
        onKeyDown={(e) => handleGridKeys(e, COLS)}
        className="grid w-full max-w-[420px] grid-cols-4 gap-2 sm:gap-3"
      >
        {Array.from({ length: CELLS }).map((_, cell) => {
          const seqIdx = round.cells.indexOf(cell)
          const Sym = seqIdx >= 0 ? SYMBOLS[round.symbols[seqIdx]] : null
          const pickIdx = picks.indexOf(cell)
          const picked = pickIdx >= 0
          const reviewTone = phase === 'review' && picked ? (round.cells[pickIdx] === cell ? 'success' : 'error') : null
          const missed = phase === 'review' && seqIdx >= 0 && round.cells[seqIdx] !== picks[seqIdx]
          return (
            <button
              key={cell}
              type="button"
              data-idx={cell}
              role="gridcell"
              tabIndex={phase === 'input' && cell === 0 ? 0 : -1}
              disabled={phase !== 'input'}
              aria-label={`Celda ${cell + 1}${picked ? `, seleccionada ${pickIdx + 1}` : ''}`}
              onClick={() => pick(cell)}
              className={cn(
                'relative aspect-square overflow-hidden rounded-xl border border-line bg-white/[0.02] transition-[border-color,background-color] duration-150',
                phase === 'input' && !picked && 'cursor-pointer hover:border-sky-400/40 hover:bg-sky-400/[0.05]',
                'disabled:cursor-default',
              )}
              style={reviewTone ? feedbackStyle(reviewTone) : picked ? { borderColor: 'rgb(56 189 248 / 0.6)', background: 'rgb(56 189 248 / 0.1)' } : undefined}
            >
              {/* coordenada técnica */}
              <span className="absolute left-1.5 top-1 font-mono text-[9px] text-dim">
                {String.fromCharCode(65 + (cell % COLS))}
                {Math.floor(cell / COLS) + 1}
              </span>

              {/* Exposición: entrada escalonada, salida con blur */}
              <AnimatePresence>
                {phase === 'show' && Sym && (
                  <motion.span
                    key={`s-${cell}`}
                    className="absolute inset-0 grid place-items-center text-sky-300"
                    style={{ background: 'radial-gradient(circle, rgb(56 189 248 / 0.18), transparent 70%)' }}
                    initial={{ opacity: 0, scale: 0.6, filter: 'blur(8px)' }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                      filter: 'blur(0px)',
                      transition: { ...SPRING_TRANSITION, delay: 0.35 + (seqIdx * STEP_MS) / 1000 },
                    }}
                    exit={{ opacity: 0, scale: 1.08, filter: 'blur(10px)', transition: { duration: DURATION.modal, ease: EASE.in } }}
                  >
                    <Sym className="size-1/2 max-w-9" />
                    <span className="absolute bottom-1 right-1.5 font-mono text-[10px] font-semibold text-sky-300/80">{seqIdx + 1}</span>
                  </motion.span>
                )}
              </AnimatePresence>

              {/* Selección del aspirante */}
              <AnimatePresence>
                {picked && (
                  <motion.span
                    key={`p-${cell}`}
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1, transition: SPRING_TRANSITION }}
                    exit={{ opacity: 0, transition: EXIT_TRANSITION }}
                    className="absolute inset-0 grid place-items-center font-display text-2xl font-bold tabular"
                  >
                    {pad(pickIdx + 1)}
                  </motion.span>
                )}
              </AnimatePresence>

              {/* Posición correcta no acertada */}
              {missed && !picked && Sym && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: { duration: DURATION.card } }}
                  className="absolute inset-0 grid place-items-center rounded-xl border border-dashed"
                  style={{ borderColor: feedbackStyle('warning').borderColor, color: feedbackStyle('warning').color }}
                >
                  <span className="font-mono text-xs font-semibold">{seqIdx + 1}</span>
                </motion.span>
              )}
            </button>
          )
        })}
      </div>

      <p className="mt-4 text-center text-xs text-dim">
        {phase === 'input' ? 'Pulsa las celdas en el orden en que aparecieron. Flechas + Enter con teclado.' : 'Observa el orden numerado de aparición.'}
      </p>
    </div>
  )
}
