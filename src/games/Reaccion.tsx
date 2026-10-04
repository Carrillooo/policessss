/**
 * REACCIÓN · tiempo de respuesta
 * El panel espera un intervalo aleatorio y cambia de forma INSTANTÁNEA
 * (sin transición: el cambio brusco es el estímulo). Se mide en ms.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Crosshair, Hand, Zap } from 'lucide-react'
import { markVariants } from '@/lib/animations'
import { cn } from '@/lib/utils'
import type { GameProps } from './types'
import { feedbackStyle, randInt, rgb } from './utils'
import type { FeedbackTone } from '@/lib/animations'

const ATTEMPTS = 5
const EARLY_PENALTY = 12
const BEST_MS = 200
const WORST_MS = 560

type Phase = 'ready' | 'waiting' | 'go' | 'early' | 'result'
type Attempt = { ms: number } | { early: true }

const msTone = (ms: number): FeedbackTone => (ms < 260 ? 'success' : ms < 380 ? 'warning' : 'error')
const msLabel = (ms: number) => (ms < 220 ? 'EXCEPCIONAL' : ms < 260 ? 'EXCELENTE' : ms < 320 ? 'BUENO' : ms < 380 ? 'ACEPTABLE' : 'LENTO')
const msScore = (ms: number) => Math.max(0, Math.min(100, ((WORST_MS - ms) / (WORST_MS - BEST_MS)) * 100))

function computeScore(attempts: Attempt[]) {
  const valid = attempts.filter((a): a is { ms: number } => 'ms' in a)
  const early = attempts.length - valid.length
  if (!valid.length) return { score: 0, avg: 0, early, valid }
  const avg = valid.reduce((s, a) => s + a.ms, 0) / valid.length
  return { score: Math.max(0, msScore(avg) - early * EARLY_PENALTY), avg, early, valid }
}

export default function Reaccion({ onComplete, onProgress }: GameProps) {
  const [phase, setPhase] = useState<Phase>('ready')
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const goAt = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const phaseRef = useRef(phase)
  useEffect(() => {
    phaseRef.current = phase
  }, [phase])
  const done = attempts.length >= ATTEMPTS

  useEffect(() => {
    const { score } = computeScore(attempts)
    onProgress?.({ round: Math.min(ATTEMPTS, attempts.length + (done ? 0 : 1)), rounds: ATTEMPTS, score })
  }, [attempts, done, onProgress])

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), [])

  // Fin de la prueba
  useEffect(() => {
    if (!done) return
    const id = setTimeout(() => {
      const { score, avg, early, valid } = computeScore(attempts)
      const best = valid.length ? Math.min(...valid.map((v) => v.ms)) : 0
      onComplete(score, {
        'Media (ms)': Math.round(avg),
        'Mejor (ms)': Math.round(best),
        'Peor (ms)': valid.length ? Math.round(Math.max(...valid.map((v) => v.ms))) : 0,
        'Válidos': `${valid.length}/${ATTEMPTS}`,
        Anticipaciones: early,
      })
    }, 1100)
    return () => clearTimeout(id)
  }, [done, attempts, onComplete])

  const arm = useCallback(() => {
    phaseRef.current = 'waiting'
    setPhase('waiting')
    goAt.current = 0
    timer.current = setTimeout(() => {
      phaseRef.current = 'go'
      setPhase('go')
      // Se marca el instante en el frame en que se pinta el estímulo
      requestAnimationFrame((t) => (goAt.current = t))
    }, randInt(1300, 3800))
  }, [])

  const trigger = useCallback(
    (eventTime: number) => {
      const p = phaseRef.current
      if (done) return
      if (p === 'ready' || p === 'result' || p === 'early') return arm()
      if (p === 'waiting') {
        if (timer.current) clearTimeout(timer.current)
        phaseRef.current = 'early'
        setAttempts((a) => [...a, { early: true }])
        setPhase('early')
        return
      }
      if (p === 'go') {
        const ms = Math.max(1, eventTime - (goAt.current || eventTime))
        phaseRef.current = 'result'
        setAttempts((a) => [...a, { ms }])
        setPhase('result')
      }
    },
    [arm, done],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || (e.code !== 'Space' && e.key !== 'Enter')) return
      const el = e.target as HTMLElement
      if (el.closest('input,textarea,[role="dialog"]')) return
      e.preventDefault()
      trigger(e.timeStamp)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [trigger])

  const last = attempts[attempts.length - 1]
  const lastMs = last && 'ms' in last ? last.ms : null

  // Paleta del panel por fase — se aplica sin transición deliberadamente.
  const panel: Record<Phase, string> = {
    ready: 'bg-[#0b1324] border-line-strong',
    waiting: 'bg-[#1a0d12] border-red-500/30',
    go: 'bg-emerald-500 border-emerald-300',
    early: 'bg-[#1f1209] border-amber-500/50',
    result: 'bg-[#0b1324] border-line-strong',
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div
        role="button"
        tabIndex={0}
        aria-label="Panel de reacción. Pulsa o presiona Espacio."
        onPointerDown={(e) => {
          if (e.button !== 0) return
          trigger(e.timeStamp)
        }}
        className={cn(
          'relative grid h-[300px] cursor-pointer select-none place-items-center overflow-hidden rounded-2xl border-2 sm:h-[340px]',
          'touch-manipulation',
          panel[phase],
        )}
        style={phase === 'go' ? { boxShadow: `0 0 80px -10px ${rgb('success', 0.8)}` } : undefined}
      >
        {phase !== 'go' && <div aria-hidden className="grid-bg absolute inset-0 opacity-60" />}

        <div className="relative px-6 text-center" aria-live="assertive">
          {phase === 'ready' && (
            <>
              <Crosshair className="mx-auto mb-3 size-9 text-muted" strokeWidth={1.5} />
              <p className="font-display text-2xl font-bold tracking-wide sm:text-3xl">PULSA PARA ARMAR</p>
              <p className="mt-2 text-sm text-muted">Intento {attempts.length + 1} de {ATTEMPTS}. Espera a que el panel cambie a verde.</p>
            </>
          )}
          {phase === 'waiting' && (
            <>
              <Hand className="mx-auto mb-3 size-9 text-red-300/80" strokeWidth={1.5} />
              <p className="font-display text-2xl font-bold tracking-[0.12em] text-red-200 sm:text-3xl">ESPERA LA SEÑAL…</p>
              <p className="mt-2 font-mono text-[11px] tracking-[0.2em] text-red-300/60">NO PULSES TODAVÍA</p>
            </>
          )}
          {phase === 'go' && (
            <>
              <Zap className="mx-auto mb-2 size-12 fill-current text-emerald-950" />
              <p className="font-display text-5xl font-bold tracking-wide text-emerald-950 sm:text-6xl">¡AHORA!</p>
            </>
          )}
          {phase === 'early' && (
            <>
              <p className="font-display text-3xl font-bold tracking-wide sm:text-4xl" style={{ color: rgb('warning') }}>
                DEMASIADO PRONTO
              </p>
              <p className="mt-2 text-sm text-amber-200/70">Anticipación registrada · −{EARLY_PENALTY} pts.</p>
              {!done && <p className="mt-4 font-mono text-[11px] tracking-[0.2em] text-muted">PULSA PARA EL SIGUIENTE INTENTO</p>}
            </>
          )}
          {phase === 'result' && lastMs != null && (
            <>
              <p className="font-display text-6xl font-bold leading-none tabular sm:text-7xl" style={{ color: rgb(msTone(lastMs)) }}>
                {Math.round(lastMs)}
                <span className="ml-1 text-2xl text-muted">ms</span>
              </p>
              <p className="mt-2 font-mono text-xs font-semibold tracking-[0.22em]" style={{ color: rgb(msTone(lastMs)) }}>
                {msLabel(lastMs)}
              </p>
              {!done && <p className="mt-4 font-mono text-[11px] tracking-[0.2em] text-muted">PULSA PARA EL SIGUIENTE INTENTO</p>}
            </>
          )}
        </div>
      </div>

      {/* Registro de intentos */}
      <ol className="mt-4 grid grid-cols-5 gap-2" aria-label="Intentos">
        {Array.from({ length: ATTEMPTS }).map((_, i) => {
          const a = attempts[i]
          const tone: FeedbackTone | null = !a ? null : 'ms' in a ? msTone(a.ms) : 'warning'
          return (
            <li
              key={i}
              className="relative flex h-16 flex-col items-center justify-center rounded-lg border border-line bg-white/[0.02]"
              style={tone ? feedbackStyle(tone) : undefined}
            >
              <span className="label-caps !text-[9px]">#{i + 1}</span>
              <AnimatePresence>
                {a && (
                  <motion.span variants={markVariants} initial="hidden" animate="show" className="font-mono text-sm font-semibold tabular sm:text-base">
                    {'ms' in a ? Math.round(a.ms) : 'PRONTO'}
                  </motion.span>
                )}
              </AnimatePresence>
              {!a && <span className="font-mono text-sm text-dim">—</span>}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
