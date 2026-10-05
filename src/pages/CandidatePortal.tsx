/**
 * PORTAL DEL POSTULANTE
 * PROCESSING SECURE CONNECTION → IDENTITY VERIFIED → WAITING FOR INTERVIEWER
 * → (el entrevistador inicia) → INTERVIEW STARTED → preguntas.
 * Monitoriza integridad: cambio de pestaña, pérdida de foco, salida de
 * pantalla completa y pegado de texto → incidencias en tiempo real.
 */
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, Check, Lock, Maximize, Send, ShieldCheck } from 'lucide-react'
import { LspdBadge } from '@/components/brand/LspdBadge'
import { Aurora, BlurText, DecryptedText, GridBackground, LazyParticles } from '@/components/reactbits'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { LiveIndicator } from '@/components/feedback/LiveIndicator'
import { RadarLoader } from '@/components/feedback/SystemLoader'
import { toast } from '@/components/feedback/toast-store'
import { DEFAULT_TRANSITION, EASE, EXIT_TRANSITION, PAGE_TRANSITION, questionVariants } from '@/lib/animations'
import { questionById } from '@/data/questions'
import type { IncidentType } from '@/data/types'
import { useApp, useCandidate } from '@/store/app-store'
import { useProctoring } from '@/hooks/useProctoring'
import { SecurityGate } from '@/components/portal/SecurityGate'
import { GameFrame } from '@/games/GameFrame'
import { getGame, isGameId } from '@/games'
import { db } from '@/lib/db'

type Phase = 'connecting' | 'verified' | 'waiting' | 'started' | 'live' | 'finished' | 'invalid'

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-bg">
      <GridBackground scan fade="center" />
      <Aurora intensity={0.16} />
      <LazyParticles count={30} speed={0.12} />
      <header className="relative z-10 flex items-center justify-between px-5 py-4 sm:px-8">
        <div className="flex items-center gap-3">
          <LspdBadge size={26} />
          <span className="font-display text-sm font-bold tracking-[0.28em]">LSPD<span className="hidden sm:inline"> · CANDIDATE PORTAL</span></span>
        </div>
        <LiveIndicator label="SECURE SESSION" />
      </header>
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-5 pb-12">{children}</main>
    </div>
  )
}

function CodeEntry() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  return (
    <Shell>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={PAGE_TRANSITION} className="panel w-full max-w-md p-8 text-center">
        <LspdBadge size={64} animate className="mx-auto" />
        <BlurText as="h1" text="Acceso de postulante" className="mt-5 font-display text-2xl font-bold tracking-wide" />
        <p className="mt-2 text-sm text-muted">Introduce el código que te ha facilitado tu entrevistador.</p>
        <form
          className="mt-6 space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (code.trim()) navigate(`/portal/${code.trim().toUpperCase()}`)
          }}
        >
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="LSPD-XXXXXX" className="h-12 text-center font-mono text-lg tracking-[0.3em] uppercase" autoFocus aria-label="Código de entrevista" />
          <Button variant="primary" size="lg" className="w-full" type="submit">
            CONECTAR <ArrowRight />
          </Button>
        </form>
      </motion.div>
    </Shell>
  )
}

const STEP_TEXT: Partial<Record<Phase, string>> = {
  connecting: 'PROCESSING SECURE CONNECTION',
  verified: 'IDENTITY VERIFIED',
  waiting: 'WAITING FOR INTERVIEWER',
}

/** Monitor de integridad: emite incidencias deduplicadas */
function useIntegrity(active: boolean, report: (t: IncidentType) => void) {
  const last = useRef<Record<string, number>>({})
  useEffect(() => {
    if (!active) return
    const fire = (t: IncidentType) => {
      const now = Date.now()
      if (now - (last.current[t] ?? 0) < 2000) return
      last.current[t] = now
      report(t)
    }
    const onVis = () => document.hidden && fire('TAB_SWITCH')
    const onBlur = () => setTimeout(() => !document.hidden && fire('FOCUS_LOST'), 200)
    const onPaste = () => fire('COPY_PASTE')
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('blur', onBlur)
    document.addEventListener('paste', onPaste)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('blur', onBlur)
      document.removeEventListener('paste', onPaste)
    }
  }, [active, report])
}

function Session({ code }: { code: string }) {
  const join = useApp((s) => s.joinInterview)
  const reportIncident = useApp((s) => s.reportIncident)
  const submitAnswer = useApp((s) => s.submitAnswer)
  const iv = useApp((s) => s.interviews.find((i) => i.code.toUpperCase() === code.toUpperCase()))
  const candidate = useCandidate(iv?.candidateId)
  const [intro, setIntro] = useState<'connecting' | 'verified' | 'done'>('connecting')
  const [startedShown, setStartedShown] = useState(false)
  const [draft, setDraft] = useState('')
  const [isFs, setIsFs] = useState(false)
  const prevIndex = useRef(iv?.currentIndex ?? 0)
  const [dir, setDir] = useState(1)

  // Conexión y verificación simuladas (secuencia visual)
  const ivId = iv?.id
  const ivFinished = iv?.status === 'finished'
  useEffect(() => {
    if (!ivId) return
    const a = setTimeout(() => setIntro('verified'), 1500)
    const b = setTimeout(() => setIntro('done'), 2700)
    return () => {
      clearTimeout(a)
      clearTimeout(b)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ivId, join])

  // Al iniciar la entrevista: "INTERVIEW STARTED" breve
  const status = iv?.status
  useEffect(() => {
    if (status === 'live' && intro === 'done' && !startedShown) {
      const t = setTimeout(() => setStartedShown(true), 1600)
      return () => clearTimeout(t)
    }
  }, [status, intro, startedShown])

  useEffect(() => {
    const on = () => setIsFs(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', on)
    return () => document.removeEventListener('fullscreenchange', on)
  }, [])

  // Dirección del cambio de pregunta + recuperar borrador
  useEffect(() => {
    if (!iv) return
    setDir(iv.currentIndex >= prevIndex.current ? 1 : -1)
    prevIndex.current = iv.currentIndex
    setDraft(iv.answers[iv.questionIds[iv.currentIndex]]?.text ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iv?.currentIndex])

  // Si no aparece todavía, esperar unos segundos a la sincronización antes de darlo por inválido
  const [searching, setSearching] = useState(db.backend !== 'local')
  useEffect(() => {
    if (iv || !searching) return
    const t = setTimeout(() => setSearching(false), 8000)
    return () => clearTimeout(t)
  }, [iv, searching])

  const phase: Phase = !iv
    ? 'invalid'
    : iv.status === 'finished'
      ? 'finished'
      : intro !== 'done'
        ? intro
        : iv.status === 'live'
          ? startedShown
            ? 'live'
            : 'started'
          : 'waiting'

  useIntegrity(phase === 'live', (t) => iv && reportIncident(iv.id, t))

  // Control de integridad: pantalla compartida, un monitor, pantalla completa, sin móvil
  const pushSnapshot = useApp((s) => s.pushSnapshot)
  const [passedOnce, setPassedOnce] = useState(false)
  const proctor = useProctoring({
    active: passedOnce && !!iv && iv.status !== 'finished',
    onSnapshot: (snap) => iv && pushSnapshot(iv.id, { ...snap, at: Date.now() }),
    onViolation: (t) => iv && reportIncident(iv.id, t),
  })
  useEffect(() => {
    if (proctor.ok && !passedOnce && ivId && !ivFinished) {
      setPassedOnce(true)
      join(ivId)
    }
  }, [proctor.ok, passedOnce, ivId, ivFinished, join])
  useEffect(() => {
    if (ivFinished) proctor.stopSharing()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ivFinished])

  // Prueba psicotécnica lanzada por el entrevistador
  const updateGameRun = useApp((s) => s.updateGameRun)
  const [dismissedGame, setDismissedGame] = useState<number | null>(null)
  const activeGame = iv?.status === 'live' && iv.activeGame && iv.activeGame.launchedAt !== dismissedGame ? iv.activeGame : null
  const gameDef = activeGame && isGameId(activeGame.id) ? getGame(activeGame.id) : undefined
  const gameRun = activeGame ? iv?.gameRuns?.[activeGame.id] : undefined

  if (phase === 'invalid' && searching)
    return (
      <Shell>
        <div className="flex flex-col items-center gap-5 text-center">
          <RadarLoader size={64} />
          <DecryptedText text="BUSCANDO SESIÓN" className="text-sm font-semibold tracking-[0.3em] text-sky-200" />
        </div>
      </Shell>
    )

  if (phase === 'invalid')
    return (
      <Shell>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-md text-center">
          <DecryptedText text="CÓDIGO NO VÁLIDO" className="text-lg font-semibold tracking-[0.3em] text-red-300" />
          <p className="mt-2 text-sm text-muted">Comprueba el código con tu entrevistador.</p>
          {db.backend === 'local' && (
            <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/[0.06] p-3 text-xs text-amber-200">
              El sistema está en modo local (sin base de datos), así que este enlace sólo funciona en el navegador donde se creó la entrevista.
            </p>
          )}
          {db.backend !== 'local' && db.lastError && (
            <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/[0.06] p-3 text-xs text-red-200">Error del servidor: {db.lastError}</p>
          )}
          <Button className="mt-6" onClick={() => (window.location.href = '/portal')}>
            Volver
          </Button>
        </motion.div>
      </Shell>
    )

  const needsGate = intro === 'done' && phase !== 'finished' && !proctor.ok

  if (needsGate)
    return (
      <Shell>
        <SecurityGate state={proctor} locked={passedOnce} onShare={() => void proctor.requestShare()} onFullscreen={() => void proctor.requestFullscreen()} />
      </Shell>
    )

  if (phase === 'live' && iv && gameDef && activeGame)
    return (
      <Shell>
        <motion.div key={activeGame.launchedAt} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={PAGE_TRANSITION} className="w-full max-w-4xl">
          <div className="mb-4 flex items-center justify-between gap-3">
            <LiveIndicator label="PRUEBA PSICOTÉCNICA · PANTALLA MONITORIZADA" />
            {gameRun?.status === 'done' && (
              <Button size="sm" variant="primary" onClick={() => setDismissedGame(activeGame.launchedAt)}>
                Volver a la entrevista <ArrowRight />
              </Button>
            )}
          </div>
          <GameFrame
            game={gameDef}
            mode="candidate"
            onStarted={() => updateGameRun(iv.id, { gameId: gameDef.id, status: 'playing', round: 0, rounds: 1, score: 0, at: Date.now() })}
            onProgress={(p) => updateGameRun(iv.id, { gameId: gameDef.id, status: 'playing', round: p.round, rounds: p.rounds, score: Math.round(p.score), at: Date.now() })}
            onFinished={(score, detail) => updateGameRun(iv.id, { gameId: gameDef.id, status: 'done', round: 0, rounds: 0, score, detail, at: Date.now() })}
          />
        </motion.div>
      </Shell>
    )

  return (
    <Shell>
      <AnimatePresence mode="wait">
        {(phase === 'connecting' || phase === 'verified' || phase === 'waiting') && (
          <motion.div
            key="lobby"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.04, filter: 'blur(10px)', transition: { duration: 0.45, ease: EASE.in } }}
            className="flex flex-col items-center text-center"
          >
            <div className="relative mb-8">
              <div aria-hidden className="absolute inset-0 -z-10 scale-[2] rounded-full bg-blue-500/15 blur-3xl" />
              <LspdBadge size={88} animate />
            </div>
            <div className="mb-6 h-16">{phase === 'verified' ? <ShieldCheck className="mx-auto size-14 text-emerald-300" /> : <RadarLoader size={64} />}</div>
            <AnimatePresence mode="wait">
              <motion.div key={phase} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6, transition: EXIT_TRANSITION }} transition={DEFAULT_TRANSITION}>
                <DecryptedText
                  text={STEP_TEXT[phase]!}
                  className={phase === 'verified' ? 'text-base font-semibold tracking-[0.32em] text-emerald-300' : 'text-base font-semibold tracking-[0.32em] text-sky-200'}
                />
              </motion.div>
            </AnimatePresence>
            {/* Pasos */}
            <ol className="mt-8 flex items-center gap-3 font-mono text-[10px] tracking-[0.18em]">
              {(['connecting', 'verified', 'waiting'] as const).map((s, i) => {
                const idx = ['connecting', 'verified', 'waiting'].indexOf(phase)
                const done = i < idx
                const cur = i === idx
                return (
                  <li key={s} className="flex items-center gap-3">
                    <span className={done ? 'text-emerald-300' : cur ? 'text-sky-200' : 'text-dim'}>
                      {done ? <Check className="inline size-3" /> : `0${i + 1}`} {['CONEXIÓN', 'IDENTIDAD', 'SALA'][i]}
                    </span>
                    {i < 2 && <span className={`h-px w-8 ${done ? 'bg-emerald-400/60' : 'bg-line-strong'}`} />}
                  </li>
                )
              })}
            </ol>
            {phase === 'waiting' && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DEFAULT_TRANSITION, delay: 0.3 }} className="panel mt-10 w-full max-w-md p-5 text-left">
                <div className="flex items-center justify-between">
                  <span className="label-caps">Postulante</span>
                  <Badge tone="ok">Verificado</Badge>
                </div>
                <div className="mt-2 font-display text-xl font-bold tracking-wide">{candidate?.name}</div>
                <div className="font-mono text-[11px] text-dim">
                  Discord {candidate?.discord} · Sesión {iv?.code}
                </div>
                <ul className="mt-4 space-y-1.5 text-xs text-muted">
                  <li className="flex gap-2">
                    <Lock className="size-3.5 shrink-0 text-blue-300" /> La sesión está monitorizada. No cambies de pestaña ni salgas de pantalla completa.
                  </li>
                  <li className="flex gap-2">
                    <Lock className="size-3.5 shrink-0 text-blue-300" /> El entrevistador iniciará la entrevista en breve.
                  </li>
                </ul>
                {!isFs && (
                  <Button variant="outline" size="sm" className="mt-4 w-full" onClick={() => document.documentElement.requestFullscreen?.().catch(() => undefined)}>
                    <Maximize /> Activar pantalla completa
                  </Button>
                )}
              </motion.div>
            )}
          </motion.div>
        )}

        {phase === 'started' && (
          <motion.div key="started" initial={{ opacity: 0, scale: 0.9, filter: 'blur(12px)' }} animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }} exit={{ opacity: 0, y: -20, filter: 'blur(8px)', transition: EXIT_TRANSITION }} transition={{ duration: 0.5, ease: EASE.out }} className="text-center">
            <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.6, ease: EASE.out }} className="mx-auto mb-6 h-px w-64 bg-gradient-to-r from-transparent via-emerald-400 to-transparent" />
            <DecryptedText text="INTERVIEW STARTED" className="font-display text-3xl font-bold tracking-[0.35em] text-emerald-300 sm:text-4xl" speed={40} />
            <p className="mt-4 font-mono text-xs tracking-[0.2em] text-muted">BUENA SUERTE, {candidate?.name.split(' ')[0].toUpperCase()}</p>
          </motion.div>
        )}

        {phase === 'live' && iv && (
          <motion.div key="live" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={PAGE_TRANSITION} className="w-full max-w-3xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <LiveIndicator label="INTERVIEW IN PROGRESS" />
              <span className="tabular font-mono text-xs text-muted">
                {iv.currentIndex + 1} / {iv.questionIds.length}
              </span>
            </div>
            <Progress value={iv.currentIndex + 1} max={iv.questionIds.length} className="mb-5" label="Progreso" />
            <div className="panel overflow-hidden p-6 sm:p-8">
              <AnimatePresence mode="wait" custom={dir} initial={false}>
                <motion.div key={iv.currentIndex} custom={dir} variants={questionVariants} initial="hidden" animate="show" exit="exit">
                  <div className="label-caps mb-3">Pregunta {iv.currentIndex + 1}</div>
                  <h2 className="text-xl font-semibold leading-snug sm:text-2xl">{questionById(iv.questionIds[iv.currentIndex])?.text}</h2>
                </motion.div>
              </AnimatePresence>
              <form
                className="mt-6"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (!draft.trim()) return
                  submitAnswer(iv.id, iv.questionIds[iv.currentIndex], draft.trim())
                  toast.success('RESPUESTA GUARDADA', 'Enviada al entrevistador')
                }}
              >
                <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Escribe tu respuesta…" className="min-h-36 text-[15px]" aria-label="Tu respuesta" />
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-xs text-dim">{iv.answers[iv.questionIds[iv.currentIndex]] ? '✓ Respuesta enviada · puedes corregirla' : 'El entrevistador verá tu respuesta al instante'}</span>
                  <Button variant="primary" type="submit" disabled={!draft.trim()}>
                    <Send /> Enviar
                  </Button>
                </div>
              </form>
            </div>
            {!isFs && (
              <button className="mx-auto mt-4 flex items-center gap-2 text-xs text-amber-300/80 hover:text-amber-200" onClick={() => document.documentElement.requestFullscreen?.().catch(() => undefined)}>
                <Maximize className="size-3.5" /> Volver a pantalla completa
              </button>
            )}
          </motion.div>
        )}

        {phase === 'finished' && (
          <motion.div key="finished" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={PAGE_TRANSITION} className="max-w-md text-center">
            <ShieldCheck className="mx-auto size-12 text-sky-300" />
            <DecryptedText text="INTERVIEW COMPLETED" className="mt-5 block text-lg font-semibold tracking-[0.3em] text-sky-200" />
            <p className="mt-3 text-sm text-muted">Gracias por tu tiempo. El departamento te comunicará el resultado por los canales oficiales.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </Shell>
  )
}

export default function CandidatePortal() {
  const { code } = useParams()
  return code ? <Session code={code} /> : <CodeEntry />
}
