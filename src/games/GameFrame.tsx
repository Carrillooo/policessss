/**
 * Marco común de todas las pruebas psicotécnicas:
 * intro → cuenta atrás 3·2·1 → juego con HUD → resultados.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Check, ClipboardCheck, Play, RotateCcw, Save, Timer, Trophy } from 'lucide-react'
import { CountUp, GridBackground } from '@/components/reactbits'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Kbd } from '@/components/ui/kbd'
import { Progress } from '@/components/ui/progress'
import { Dialog } from '@/components/ui/dialog'
import { LiveIndicator } from '@/components/feedback/LiveIndicator'
import { toast } from '@/components/feedback/toast-store'
import { useApp } from '@/store/app-store'
import {
  DURATION,
  EASE,
  EXIT_TRANSITION,
  FEEDBACK_COLOR,
  MODAL_TRANSITION,
  STAGGER,
  enterVariants,
  pageVariants,
  staggerContainer,
} from '@/lib/animations'
import { cn, pad } from '@/lib/utils'
import { recordScore } from './best-scores'
import type { GameDef, GameDetail, GameProgress } from './types'
import { scoreTone } from './utils'

type Phase = 'intro' | 'countdown' | 'playing' | 'results'

interface Result {
  score: number
  detail: GameDetail
  elapsed: number
  best: number
  isNew: boolean
}

const VERDICT = {
  success: 'RENDIMIENTO ÓPTIMO',
  warning: 'RENDIMIENTO ACEPTABLE',
  error: 'RENDIMIENTO INSUFICIENTE',
} as const

interface GameFrameProps {
  game: GameDef
  /** 'candidate': la juega el postulante desde su portal (sin repetir ni guardar manual) */
  mode?: 'panel' | 'candidate'
  onStarted?: () => void
  onProgress?: (p: GameProgress) => void
  onFinished?: (score: number, detail: GameDetail) => void
}

export function GameFrame({ game, mode = 'panel', onStarted, onProgress, onFinished }: GameFrameProps) {
  const [phase, setPhase] = useState<Phase>('intro')
  const [run, setRun] = useState(0)
  const [hud, setHudState] = useState<GameProgress>({ round: 0, rounds: 1, score: 0 })
  const progressRef = useRef(onProgress)
  progressRef.current = onProgress
  const setHud = useCallback((p: GameProgress) => {
    setHudState(p)
    progressRef.current?.(p)
  }, [])
  const finishedRef = useRef(onFinished)
  finishedRef.current = onFinished
  const startedRef = useRef(onStarted)
  startedRef.current = onStarted
  const [result, setResult] = useState<Result | null>(null)
  const startedAt = useRef(0)

  const start = useCallback(() => {
    setResult(null)
    setHud({ round: 0, rounds: 1, score: 0 })
    setRun((r) => r + 1)
    setPhase('countdown')
  }, [])

  const onCountdownDone = useCallback(() => {
    startedAt.current = performance.now()
    setPhase('playing')
    startedRef.current?.()
  }, [])

  const handleComplete = useCallback(
    (score: number, detail: GameDetail) => {
      const s = Math.max(0, Math.min(100, Math.round(score)))
      const { best, isNew } = recordScore(game.id, s)
      setResult({ score: s, detail, elapsed: (performance.now() - startedAt.current) / 1000, best, isNew })
      setPhase('results')
      finishedRef.current?.(s, detail)
    },
    [game.id],
  )

  const Comp = game.component
  // Elemento memoizado: el HUD se actualiza sin re-renderizar la prueba.
  const board = useMemo(
    () => <Comp key={run} onComplete={handleComplete} onProgress={setHud} />,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [run, Comp],
  )

  return (
    <section
      aria-label={`Prueba ${game.name}`}
      className="panel relative overflow-hidden"
      style={{ ['--accent' as string]: game.accent }}
    >
      {/* Línea de acento superior */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, rgb(${game.accent} / 0.8), transparent)` }}
      />
      <FrameHeader game={game} phase={phase} hud={hud} running={phase === 'playing'} />

      <div className="relative min-h-[460px] p-4 sm:p-6">
        <AnimatePresence mode="wait" initial={false}>
          {phase === 'intro' && (
            <motion.div key="intro" variants={pageVariants} initial="hidden" animate="show" exit="exit">
              <Intro game={game} onStart={start} />
            </motion.div>
          )}
          {phase === 'countdown' && (
            <motion.div key="countdown" variants={enterVariants} initial="hidden" animate="show" exit="exit">
              <Countdown accent={game.accent} onDone={onCountdownDone} />
            </motion.div>
          )}
          {phase === 'playing' && (
            <motion.div key={`play-${run}`} variants={pageVariants} initial="hidden" animate="show" exit="exit">
              {board}
            </motion.div>
          )}
          {phase === 'results' && result && (
            <motion.div key="results" variants={pageVariants} initial="hidden" animate="show" exit="exit">
              <Results game={game} result={result} onRetry={start} candidate={mode === 'candidate'} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Cabecera + HUD                                                      */
/* ------------------------------------------------------------------ */
function FrameHeader({ game, phase, hud, running }: { game: GameDef; phase: Phase; hud: GameProgress; running: boolean }) {
  const Icon = game.icon
  const showHud = phase === 'playing'
  return (
    <div className="flex flex-col gap-3 border-b border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className="grid size-9 shrink-0 place-items-center rounded-lg ring-1"
          style={{ color: `rgb(${game.accent})`, background: `rgb(${game.accent} / 0.1)`, boxShadow: `inset 0 0 0 1px rgb(${game.accent} / 0.25)` }}
        >
          <Icon className="size-[18px]" />
        </span>
        <div className="min-w-0">
          <p className="label-caps">PRUEBA PSICOTÉCNICA</p>
          <p className="truncate font-display text-lg font-semibold tracking-wide">{game.name}</p>
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {showHud ? (
          <motion.div
            key="hud"
            variants={enterVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            className="grid grid-cols-3 items-end gap-4 sm:flex sm:gap-6"
            aria-live="polite"
          >
            <div className="min-w-0 sm:w-40">
              <div className="mb-1.5 flex items-baseline justify-between gap-2">
                <span className="label-caps">Ronda</span>
                <span className="font-mono text-xs tabular text-fg">
                  {pad(Math.min(hud.round, hud.rounds))}/{pad(hud.rounds)}
                </span>
              </div>
              <Progress value={Math.min(hud.round, hud.rounds)} max={hud.rounds} segments={hud.rounds <= 12 ? hud.rounds : undefined} label="Progreso de la prueba" />
            </div>
            <div className="text-right sm:text-left">
              <span className="label-caps block">Puntuación</span>
              <span className="font-display text-xl font-bold leading-none">
                <CountUp value={Math.round(hud.score)} duration={DURATION.modal * 2} />
              </span>
            </div>
            <div className="text-right sm:text-left">
              <span className="label-caps flex items-center justify-end gap-1 sm:justify-start">
                <Timer className="size-3" /> Tiempo
              </span>
              <ElapsedClock running={running} className="font-mono text-sm text-fg" />
            </div>
          </motion.div>
        ) : (
          <motion.div key="meta" variants={enterVariants} initial="hidden" animate="show" exit="exit" className="flex items-center gap-2">
            {phase === 'results' ? (
              <Badge tone="ok">
                <Check className="size-3" /> Completada
              </Badge>
            ) : phase === 'countdown' ? (
              <LiveIndicator label="PREPARADO" tone="warn" />
            ) : (
              <Badge>{game.durationLabel}</Badge>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Cronómetro que escribe directamente en el nodo (sin re-renders) */
function ElapsedClock({ running, className }: { running: boolean; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (!running) return
    const t0 = performance.now()
    let raf = 0
    let last = -1
    const loop = (t: number) => {
      const ds = Math.floor((t - t0) / 100)
      if (ds !== last && ref.current) {
        last = ds
        const s = Math.floor(ds / 10)
        ref.current.textContent = `${pad(Math.floor(s / 60))}:${pad(s % 60)}.${ds % 10}`
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [running])
  return (
    <span ref={ref} className={cn('tabular', className)}>
      00:00.0
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* Intro                                                               */
/* ------------------------------------------------------------------ */
function Intro({ game, onStart }: { game: GameDef; onStart: () => void }) {
  const Icon = game.icon
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_minmax(260px,380px)] lg:gap-10">
      <motion.div variants={staggerContainer(STAGGER.default)} initial="hidden" animate="show" className="flex min-w-0 flex-col">
        <motion.p variants={enterVariants} className="label-caps" style={{ color: `rgb(${game.accent})` }}>
          {game.tagline}
        </motion.p>
        <motion.p variants={enterVariants} className="mt-2 max-w-2xl text-[15px] leading-relaxed text-fg/90">
          {game.description}
        </motion.p>

        <motion.ol variants={staggerContainer(STAGGER.fast)} className="mt-6 space-y-2.5">
          {game.instructions.map((step, i) => (
            <motion.li key={i} variants={enterVariants} className="flex gap-3 text-sm text-muted">
              <span
                className="grid size-6 shrink-0 place-items-center rounded-md font-mono text-[11px] tabular"
                style={{ color: `rgb(${game.accent})`, background: `rgb(${game.accent} / 0.1)` }}
              >
                {pad(i + 1)}
              </span>
              <span className="pt-0.5">{step}</span>
            </motion.li>
          ))}
        </motion.ol>

        <motion.div variants={enterVariants} className="mt-6 flex flex-wrap gap-x-5 gap-y-2">
          {game.controls.map(([key, action]) => (
            <span key={key} className="flex items-center gap-2 text-xs text-muted">
              <Kbd className="h-6 px-1.5 text-[10.5px]">{key}</Kbd>
              {action}
            </span>
          ))}
        </motion.div>

        <motion.div variants={enterVariants} className="mt-8 flex flex-wrap items-center gap-3">
          <Button variant="primary" size="lg" onClick={onStart} autoFocus>
            <Play className="fill-current" /> INICIAR PRUEBA
          </Button>
          <span className="font-mono text-[11px] tracking-[0.14em] text-dim">DURACIÓN ESTIMADA · {game.durationLabel}</span>
        </motion.div>
      </motion.div>

      {/* Emblema visual de la prueba */}
      <div className="relative hidden min-h-[300px] overflow-hidden rounded-xl border border-line bg-bg/40 sm:block">
        <GridBackground cell={28} scan />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: `radial-gradient(circle at 50% 50%, rgb(${game.accent} / 0.18), transparent 60%)` }}
        />
        <div className="absolute inset-0 grid place-items-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, filter: 'blur(8px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            transition={{ ...MODAL_TRANSITION, delay: 0.1 }}
            className="relative grid size-28 place-items-center rounded-3xl"
            style={{
              color: `rgb(${game.accent})`,
              background: `rgb(${game.accent} / 0.08)`,
              boxShadow: `inset 0 0 0 1px rgb(${game.accent} / 0.3), 0 0 60px -10px rgb(${game.accent} / 0.5)`,
            }}
          >
            <Icon className="size-12" strokeWidth={1.5} />
          </motion.div>
        </div>
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between border-t border-line bg-bg/60 px-4 py-2.5 font-mono text-[10px] tracking-[0.16em] text-dim">
          <span>MÓD · {game.id.toUpperCase()}</span>
          <span>LSPD · PSY-EVAL</span>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Cuenta atrás 3 · 2 · 1                                              */
/* ------------------------------------------------------------------ */
const COUNT_STEP_MS = 700

function Countdown({ accent, onDone }: { accent: string; onDone: () => void }) {
  const [n, setN] = useState(3)
  const doneRef = useRef(onDone)
  useEffect(() => {
    doneRef.current = onDone
  }, [onDone])

  useEffect(() => {
    const id = setTimeout(() => {
      if (n > 1) setN(n - 1)
      else doneRef.current()
    }, COUNT_STEP_MS)
    return () => clearTimeout(id)
  }, [n])

  return (
    <div className="relative grid min-h-[420px] place-items-center" role="timer" aria-live="assertive" aria-label={`Comienza en ${n}`}>
      <div
        aria-hidden
        className="absolute size-56 rounded-full"
        style={{ background: `radial-gradient(circle, rgb(${accent} / 0.16), transparent 65%)` }}
      />
      <svg aria-hidden viewBox="0 0 120 120" className="absolute size-52 -rotate-90">
        <circle cx="60" cy="60" r="54" fill="none" stroke="rgb(148 163 184 / 0.12)" strokeWidth="2" />
        <motion.circle
          key={n}
          cx="60"
          cy="60"
          r="54"
          fill="none"
          stroke={`rgb(${accent})`}
          strokeWidth="2.5"
          strokeLinecap="round"
          initial={{ pathLength: 1 }}
          animate={{ pathLength: 0 }}
          transition={{ duration: COUNT_STEP_MS / 1000, ease: 'linear' }}
        />
      </svg>
      <AnimatePresence mode="popLayout">
        <motion.span
          key={n}
          initial={{ opacity: 0, scale: 1.6, filter: 'blur(14px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)', transition: { duration: DURATION.modal, ease: EASE.out } }}
          exit={{ opacity: 0, scale: 0.7, filter: 'blur(8px)', transition: EXIT_TRANSITION }}
          className="relative font-display text-8xl font-bold tabular"
          style={{ color: `rgb(${accent})`, textShadow: `0 0 40px rgb(${accent} / 0.55)` }}
        >
          {n}
        </motion.span>
      </AnimatePresence>
      <p className="label-caps absolute bottom-6">PREPÁRATE</p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Resultados                                                          */
/* ------------------------------------------------------------------ */
function ScoreRing({ score, tone }: { score: number; tone: keyof typeof FEEDBACK_COLOR }) {
  const reduce = useReducedMotion()
  const color = FEEDBACK_COLOR[tone]
  return (
    <div className="relative grid size-44 place-items-center sm:size-48">
      <div aria-hidden className="absolute inset-4 rounded-full" style={{ background: `radial-gradient(circle, rgb(${color} / 0.16), transparent 70%)` }} />
      <svg aria-hidden viewBox="0 0 120 120" className="absolute inset-0 -rotate-90">
        <circle cx="60" cy="60" r="52" fill="none" stroke="rgb(148 163 184 / 0.1)" strokeWidth="6" />
        {/* marcas cada 10% */}
        {Array.from({ length: 10 }).map((_, i) => (
          <line
            key={i}
            x1="60"
            y1="2"
            x2="60"
            y2="6"
            stroke="rgb(148 163 184 / 0.25)"
            strokeWidth="1"
            transform={`rotate(${i * 36} 60 60)`}
          />
        ))}
        <motion.circle
          cx="60"
          cy="60"
          r="52"
          fill="none"
          stroke={`rgb(${color})`}
          strokeWidth="6"
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px rgb(${color} / 0.6))` }}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: Math.max(0.001, score / 100) }}
          transition={{ duration: reduce ? 0 : DURATION.counter * 1.2, ease: EASE.out, delay: 0.15 }}
        />
      </svg>
      <div className="relative text-center">
        <div className="font-display text-6xl font-bold leading-none" style={{ color: `rgb(${color})` }}>
          <CountUp value={score} duration={DURATION.counter * 1.2} delay={0.15} />
        </div>
        <span className="label-caps">/ 100</span>
      </div>
    </div>
  )
}

function Results({ game, result, onRetry, candidate }: { game: GameDef; result: Result; onRetry: () => void; candidate?: boolean }) {
  const tone = scoreTone(result.score)
  const [saveOpen, setSaveOpen] = useState(false)
  const [savedTo, setSavedTo] = useState<string | null>(null)
  const entries = Object.entries(result.detail)

  return (
    <div className="grid gap-8 lg:grid-cols-[auto_1fr] lg:items-center lg:gap-12">
      <div className="flex flex-col items-center gap-4">
        <ScoreRing score={result.score} tone={tone} />
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...MODAL_TRANSITION, delay: 0.5 }}
          className="font-mono text-xs font-semibold tracking-[0.2em]"
          style={{ color: `rgb(${FEEDBACK_COLOR[tone]})` }}
        >
          {VERDICT[tone]}
        </motion.p>
        <div className="flex items-center gap-2">
          {result.isNew ? (
            <Badge tone="gold">
              <Trophy className="size-3" /> Nuevo máximo
            </Badge>
          ) : (
            <Badge>
              <Trophy className="size-3" /> Máximo · {result.best}
            </Badge>
          )}
        </div>
      </div>

      <div className="min-w-0">
        <p className="label-caps mb-3">Desglose</p>
        <motion.dl
          variants={staggerContainer(STAGGER.fast, 0.2)}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 gap-2 sm:grid-cols-3"
        >
          {entries.map(([k, v]) => (
            <motion.div key={k} variants={enterVariants} className="rounded-lg border border-line bg-white/[0.02] px-3 py-2.5">
              <dt className="label-caps truncate !text-[9.5px]">{k}</dt>
              <dd className="mt-1 font-display text-xl font-semibold leading-tight">
                {typeof v === 'number' ? <CountUp value={v} decimals={Number.isInteger(v) ? 0 : 1} /> : v}
              </dd>
            </motion.div>
          ))}
          <motion.div variants={enterVariants} className="rounded-lg border border-line bg-white/[0.02] px-3 py-2.5">
            <dt className="label-caps !text-[9.5px]">Tiempo total</dt>
            <dd className="mt-1 font-display text-xl font-semibold leading-tight tabular">
              {pad(Math.floor(result.elapsed / 60))}:{pad(Math.floor(result.elapsed % 60))}
            </dd>
          </motion.div>
        </motion.dl>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...MODAL_TRANSITION, delay: 0.45 }}
          className="mt-6 flex flex-wrap items-center gap-3"
        >
          {candidate ? (
            <span className="flex items-center gap-2 font-mono text-[11px] tracking-[0.14em] text-emerald-300">
              <ClipboardCheck className="size-4" /> RESULTADO ENVIADO AL ENTREVISTADOR
            </span>
          ) : (
            <>
              <Button variant="outline" onClick={onRetry}>
                <RotateCcw /> REPETIR
              </Button>
              <Button variant={savedTo ? 'success' : 'primary'} onClick={() => setSaveOpen(true)}>
                {savedTo ? <ClipboardCheck /> : <Save />}
                {savedTo ? 'GUARDADO' : 'GUARDAR EN ENTREVISTA'}
              </Button>
              {savedTo && <span className="font-mono text-[11px] tracking-[0.12em] text-muted">→ {savedTo}</span>}
            </>
          )}
        </motion.div>
      </div>

      <SaveDialog
        open={saveOpen}
        onOpenChange={setSaveOpen}
        gameId={game.id}
        gameName={game.name}
        score={result.score}
        onSaved={(label) => setSavedTo(label)}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Guardar en entrevista                                               */
/* ------------------------------------------------------------------ */
function SaveDialog({
  open,
  onOpenChange,
  gameId,
  gameName,
  score,
  onSaved,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  gameId: string
  gameName: string
  score: number
  onSaved: (label: string) => void
}) {
  const interviews = useApp((s) => s.interviews)
  const candidates = useApp((s) => s.candidates)
  const setGameScore = useApp((s) => s.setGameScore)
  const [selected, setSelected] = useState<string | null>(null)

  const options = useMemo(
    () =>
      interviews
        .filter((iv) => iv.status === 'live' || iv.status === 'waiting')
        .map((iv) => ({
          iv,
          name: candidates.find((c) => c.id === iv.candidateId)?.name ?? 'Candidato',
        })),
    [interviews, candidates],
  )

  useEffect(() => {
    if (open) setSelected(options[0]?.iv.id ?? null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const save = () => {
    const opt = options.find((o) => o.iv.id === selected)
    if (!opt) return
    setGameScore(opt.iv.id, gameId, score)
    toast.success('RESULTADO GUARDADO', `${gameName} · ${score}/100 → ${opt.name}`)
    onSaved(`${opt.name} · ${opt.iv.code}`)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Guardar en entrevista" description={`Asignar ${score}/100 en ${gameName} a una entrevista activa.`}>
      {options.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line-strong px-4 py-8 text-center">
          <p className="font-mono text-xs font-semibold tracking-[0.18em]">SIN ENTREVISTAS ACTIVAS</p>
          <p className="mt-1.5 text-sm text-muted">Sólo se pueden asignar resultados a entrevistas en curso o en sala de espera.</p>
        </div>
      ) : (
        <div role="radiogroup" aria-label="Entrevistas activas" className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
          {options.map(({ iv, name }) => {
            const active = selected === iv.id
            const prev = iv.games[gameId]
            return (
              <button
                key={iv.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setSelected(iv.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors duration-150',
                  active ? 'border-blue-400/50 bg-blue-500/10' : 'border-line hover:border-line-strong hover:bg-white/[0.03]',
                )}
              >
                <span className={cn('grid size-4 shrink-0 place-items-center rounded-full border', active ? 'border-blue-400' : 'border-line-strong')}>
                  {active && <span className="size-2 rounded-full bg-blue-400" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{name}</span>
                  <span className="font-mono text-[11px] tracking-[0.1em] text-muted">
                    {iv.code}
                    {prev != null && ` · ACTUAL ${prev}`}
                  </span>
                </span>
                {iv.status === 'live' ? <LiveIndicator /> : <LiveIndicator label="EN ESPERA" tone="warn" pulse={false} />}
              </button>
            )
          })}
        </div>
      )}
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button variant="primary" disabled={!selected || options.length === 0} onClick={save}>
          <Save /> GUARDAR
        </Button>
      </div>
    </Dialog>
  )
}
