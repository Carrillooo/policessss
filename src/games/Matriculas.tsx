/**
 * MATRÍCULAS · retención visual
 * Una placa de San Andreas cruza el campo visual durante un instante.
 * El aspirante debe identificarla entre placas casi idénticas o teclearla.
 */
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CornerDownLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/kbd'
import {
  DURATION,
  EASE,
  EXIT_TRANSITION,
  MODAL_TRANSITION,
  STAGGER,
  cardVariants,
  staggerContainer,
  type FeedbackTone,
} from '@/lib/animations'
import { cn } from '@/lib/utils'
import type { GameProps } from './types'
import { feedbackStyle, randInt, rgb, shuffle, toneOf } from './utils'

type Mode = 'pick' | 'type'
const ROUNDS: { mode: Mode; ms: number }[] = [
  { mode: 'pick', ms: 2400 },
  { mode: 'pick', ms: 2000 },
  { mode: 'type', ms: 2600 },
  { mode: 'pick', ms: 1600 },
  { mode: 'pick', ms: 1400 },
  { mode: 'type', ms: 2200 },
  { mode: 'pick', ms: 1100 },
  { mode: 'type', ms: 1800 },
]

const LETTERS = 'ABCDEFGHJKLMNPRSTUVWXYZ'
const DIGIT_SIM: Record<string, string> = { '0': '869', '1': '74', '2': '7', '3': '85', '4': '1', '5': '63', '6': '508', '7': '12', '8': '306', '9': '06' }
const LETTER_SIM: Record<string, string> = { B: 'RPE', C: 'G', D: 'B', E: 'FB', F: 'EP', G: 'C', H: 'N', K: 'X', M: 'NW', N: 'MH', P: 'RB', R: 'PB', U: 'V', V: 'UY', W: 'MV', X: 'KY', Y: 'VX', Z: 'S', S: 'Z' }

const isDigitPos = (i: number) => i < 2 || i > 4

function makePlate() {
  let s = ''
  for (let i = 0; i < 8; i++) s += isDigitPos(i) ? String(randInt(0, 9)) : LETTERS[randInt(0, LETTERS.length - 1)]
  return s
}

function mutate(plate: string): string {
  const c = plate.split('')
  if (Math.random() < 0.3) {
    // Transposición de dos caracteres contiguos del mismo tipo
    const pairs = [0, 2, 3, 5, 6].filter((i) => c[i] !== c[i + 1])
    if (pairs.length) {
      const i = pairs[randInt(0, pairs.length - 1)]
      ;[c[i], c[i + 1]] = [c[i + 1], c[i]]
      return c.join('')
    }
  }
  const i = randInt(0, 7)
  const sim = (isDigitPos(i) ? DIGIT_SIM : LETTER_SIM)[c[i]]
  const pool = sim ?? (isDigitPos(i) ? '0123456789' : LETTERS).replace(c[i], '')
  c[i] = pool[randInt(0, pool.length - 1)]
  return c.join('')
}

function makeOptions(plate: string) {
  const set = new Set<string>([plate])
  while (set.size < 4) set.add(mutate(plate))
  return shuffle([...set])
}

const typedValue = (typed: string, plate: string) => {
  const ok = plate.split('').filter((ch, i) => typed[i] === ch).length
  const r = ok / plate.length
  return { ok, value: r === 1 ? 1 : r >= 0.75 ? 0.6 : r >= 0.5 ? 0.3 : 0 }
}

/* ------------------------------------------------------------------ */
/* Placa de San Andreas                                                */
/* ------------------------------------------------------------------ */
export function Plate({ text, size = 'lg', className, chars }: { text: string; size?: 'lg' | 'sm'; className?: string; chars?: (FeedbackTone | null)[] }) {
  const lg = size === 'lg'
  return (
    <div
      className={cn(
        'relative flex aspect-[2/1] flex-col items-center justify-between rounded-lg border-2 border-slate-300 bg-gradient-to-b from-white to-slate-200 shadow-[0_10px_30px_-12px_rgb(0_0_0/0.8),inset_0_0_0_3px_rgb(255_255_255/0.7)]',
        lg ? 'w-full max-w-[380px] px-4 py-2.5' : 'w-full px-2 py-1',
        className,
      )}
    >
      <span className="absolute inset-[5px] rounded-[5px] border border-slate-400/50" aria-hidden />
      <span
        className={cn('relative italic text-red-600', lg ? 'text-lg sm:text-xl' : 'text-[11px] sm:text-xs')}
        style={{ fontFamily: "'Brush Script MT', 'Segoe Script', cursive" }}
      >
        San Andreas
      </span>
      <span
        className={cn('relative font-mono font-bold text-[#13306b]', lg ? 'text-[2.4rem] tracking-[0.12em] sm:text-5xl' : 'text-base tracking-[0.08em] sm:text-xl')}
        style={{ textShadow: '0 1px 0 rgb(255 255 255 / 0.8)' }}
      >
        {text.split('').map((ch, i) => (
          <span key={i} style={chars?.[i] ? { color: rgb(chars[i]!) } : undefined}>
            {ch}
          </span>
        ))}
      </span>
      <span className={cn('relative font-mono font-semibold tracking-[0.2em] text-slate-500', lg ? 'text-[9px]' : 'text-[6px] sm:text-[7px]')}>
        LSPD · REG. VEHICULAR
      </span>
    </div>
  )
}

type Phase = 'show' | 'answer' | 'review'
interface Outcome {
  value: number
  ms: number
  mode: Mode
}

export default function Matriculas({ onComplete, onProgress }: GameProps) {
  const [idx, setIdx] = useState(0)
  const [plate, setPlate] = useState(makePlate)
  const [options, setOptions] = useState<string[]>(() => makeOptions(plate))
  const [phase, setPhase] = useState<Phase>('show')
  const [chosen, setChosen] = useState<string | null>(null)
  const [typed, setTyped] = useState('')
  const [outcomes, setOutcomes] = useState<Outcome[]>([])
  const answerAt = useRef(0)
  const answered = useRef(false)
  const round = ROUNDS[idx]
  const score = outcomes.length ? (outcomes.reduce((s, x) => s + x.value, 0) / outcomes.length) * 100 : 0

  useEffect(() => {
    onProgress?.({ round: idx + 1, rounds: ROUNDS.length, score })
  }, [idx, score, onProgress])

  // Exposición
  useEffect(() => {
    if (phase !== 'show') return
    const id = setTimeout(() => {
      answerAt.current = performance.now()
      answered.current = false
      setPhase('answer')
    }, round.ms + 350)
    return () => clearTimeout(id)
  }, [phase, round.ms])

  // Revisión → siguiente
  useEffect(() => {
    if (phase !== 'review') return
    const id = setTimeout(() => {
      const next = idx + 1
      if (next >= ROUNDS.length) {
        const o = outcomes
        const exact = o.filter((x) => x.value === 1).length
        const partial = o.filter((x) => x.value > 0 && x.value < 1).length
        onComplete((o.reduce((s, x) => s + x.value, 0) / o.length) * 100, {
          Exactas: `${exact}/${ROUNDS.length}`,
          Parciales: partial,
          Fallos: o.length - exact - partial,
          'Respuesta media (s)': Math.round((o.reduce((s, x) => s + x.ms, 0) / o.length / 1000) * 10) / 10,
          'Exposición mín. (ms)': Math.min(...ROUNDS.map((r) => r.ms)),
        })
        return
      }
      const p = makePlate()
      setIdx(next)
      setPlate(p)
      setOptions(makeOptions(p))
      setChosen(null)
      setTyped('')
      setPhase('show')
    }, 1500)
    return () => clearTimeout(id)
  }, [phase, idx, outcomes, onComplete])

  const record = (value: number) => {
    if (answered.current) return
    answered.current = true
    const ms = performance.now() - answerAt.current
    setOutcomes((o) => [...o, { value, ms, mode: round.mode }])
    setPhase('review')
  }

  const choose = (opt: string) => {
    if (phase !== 'answer' || round.mode !== 'pick' || answered.current) return
    setChosen(opt)
    record(opt === plate ? 1 : 0)
  }

  const submitTyped = () => {
    if (phase !== 'answer' || round.mode !== 'type') return
    record(typedValue(typed, plate).value)
  }

  // Atajos 1–4 en modo selección
  useEffect(() => {
    if (phase !== 'answer' || round.mode !== 'pick') return
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key)
      if (n >= 1 && n <= 4) {
        e.preventDefault()
        choose(options[n - 1])
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, round.mode, options])

  const last = outcomes[outcomes.length - 1]
  const reviewTone = phase === 'review' && last ? toneOf(last.value) : null

  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center">
      <p className="mb-5 h-5 font-mono text-xs font-semibold tracking-[0.2em]" aria-live="polite" style={reviewTone ? { color: rgb(reviewTone) } : undefined}>
        {phase === 'show' && 'VEHÍCULO EN TRÁNSITO · MEMORIZA LA PLACA'}
        {phase === 'answer' && (round.mode === 'pick' ? 'SELECCIONA LA PLACA OBSERVADA' : 'TECLEA LA PLACA OBSERVADA')}
        {phase === 'review' && reviewTone && (reviewTone === 'success' ? 'IDENTIFICACIÓN CORRECTA' : reviewTone === 'warning' ? 'IDENTIFICACIÓN PARCIAL' : 'IDENTIFICACIÓN FALLIDA')}
      </p>

      <div className="relative grid min-h-[300px] w-full place-items-center">
        <AnimatePresence mode="wait">
          {phase === 'show' && (
            <motion.div
              key={`show-${idx}`}
              className="flex w-full flex-col items-center"
              initial={{ opacity: 0, x: 80, filter: 'blur(10px)' }}
              animate={{ opacity: 1, x: 0, filter: 'blur(0px)', transition: { duration: DURATION.modal, ease: EASE.out } }}
              exit={{ opacity: 0, x: -80, filter: 'blur(10px)', transition: { duration: DURATION.card, ease: EASE.in } }}
            >
              <Plate text={plate} />
              {/* barra de exposición restante */}
              <div className="mt-6 h-1 w-full max-w-[380px] overflow-hidden rounded-full bg-white/[0.06]">
                <motion.div
                  className="h-full origin-left rounded-full"
                  style={{ background: 'rgb(96 165 250)' }}
                  initial={{ scaleX: 1 }}
                  animate={{ scaleX: 0 }}
                  transition={{ duration: round.ms / 1000, ease: 'linear', delay: DURATION.modal }}
                />
              </div>
              <p className="mt-2 font-mono text-[10.5px] tracking-[0.18em] text-dim">EXPOSICIÓN · {(round.ms / 1000).toFixed(1).replace('.', ',')} s</p>
            </motion.div>
          )}

          {phase !== 'show' && round.mode === 'pick' && (
            <motion.div
              key={`pick-${idx}`}
              variants={staggerContainer(STAGGER.default)}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, transition: EXIT_TRANSITION }}
              className="grid w-full grid-cols-1 gap-3 min-[420px]:grid-cols-2"
              role="radiogroup"
              aria-label="Placas candidatas"
            >
              {options.map((opt, i) => {
                const isRight = opt === plate
                const tone: FeedbackTone | null = phase === 'review' ? (isRight ? 'success' : opt === chosen ? 'error' : null) : null
                return (
                  <motion.button
                    key={opt}
                    type="button"
                    role="radio"
                    aria-checked={chosen === opt}
                    variants={cardVariants}
                    whileHover={phase === 'answer' ? { y: -2 } : undefined}
                    whileTap={phase === 'answer' ? { scale: 0.98 } : undefined}
                    disabled={phase !== 'answer'}
                    onClick={() => choose(opt)}
                    autoFocus={i === 0}
                    className={cn(
                      'relative flex items-center gap-3 rounded-xl border border-line bg-white/[0.02] p-3 text-left transition-[border-color,opacity] duration-150',
                      phase === 'answer' && 'hover:border-blue-400/40',
                      phase === 'review' && !tone && 'opacity-40',
                    )}
                    style={tone ? feedbackStyle(tone) : undefined}
                  >
                    <Kbd className="shrink-0">{i + 1}</Kbd>
                    <Plate text={opt} size="sm" />
                  </motion.button>
                )
              })}
            </motion.div>
          )}

          {phase !== 'show' && round.mode === 'type' && (
            <motion.div
              key={`type-${idx}`}
              initial={{ opacity: 0, y: 10, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)', transition: MODAL_TRANSITION }}
              exit={{ opacity: 0, transition: EXIT_TRANSITION }}
              className="flex w-full flex-col items-center"
            >
              {phase === 'answer' ? (
                <form
                  className="flex w-full max-w-[380px] flex-col items-center gap-4"
                  onSubmit={(e) => {
                    e.preventDefault()
                    submitTyped()
                  }}
                >
                  <label htmlFor="plate-input" className="label-caps">
                    Placa (8 caracteres)
                  </label>
                  <input
                    id="plate-input"
                    autoFocus
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    maxLength={8}
                    value={typed}
                    onChange={(e) => setTyped(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                    onPaste={(e) => e.preventDefault()}
                    className="h-16 w-full rounded-xl border border-line-strong bg-[#070c18] text-center font-mono text-3xl font-bold uppercase tracking-[0.3em] text-fg outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-dim focus:border-blue-400/60 focus:shadow-[0_0_0_3px_rgb(59_130_246/0.18)]"
                    placeholder="00AAA000"
                  />
                  <Button type="submit" variant="primary" disabled={typed.length === 0}>
                    VERIFICAR <CornerDownLeft />
                  </Button>
                </form>
              ) : (
                <div className="flex w-full flex-col items-center gap-4">
                  <span className="label-caps">Tu respuesta</span>
                  <Plate
                    text={typed.padEnd(8, '·')}
                    chars={plate.split('').map((ch, i) => (typed[i] === ch ? 'success' : 'error'))}
                  />
                  <span className="label-caps">Placa real · {plate}</span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
