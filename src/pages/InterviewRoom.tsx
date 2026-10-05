/**
 * Sala de entrevista (vista del entrevistador)
 * - QUESTION CHANGE: salida/entrada direccional con blur, rápida.
 * - Respuesta realtime: flash de borde azul + "NUEVA RESPUESTA RECIBIDA".
 * - Evaluación: ✓ • ✕ con marca que aterriza.
 * - Incidencias: entran desde arriba con destello rojo; pulso crítico en contador.
 * - Timeline viva y Drawer de normativa sin salir de la entrevista.
 */
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, LayoutGroup, motion, useAnimate } from 'motion/react'
import {
  ArrowLeft,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  Flag,
  MessageSquareDashed,
  Play,
  ShieldAlert,
  TriangleAlert,
  UserCheck,
} from 'lucide-react'
import { Page } from '@/components/app/PageHeader'
import { Timeline } from '@/components/app/Timeline'
import { InterviewStatusBadge } from '@/components/app/StatusBadge'
import { ArticleView } from '@/components/normativa/ArticleView'
import { CountUp, DecryptedText, RollingText, SpotlightCard } from '@/components/reactbits'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog } from '@/components/ui/dialog'
import { Drawer } from '@/components/ui/drawer'
import { Kbd } from '@/components/ui/kbd'
import { Progress } from '@/components/ui/progress'
import { Tooltip } from '@/components/ui/tooltip'
import { EvaluationMark } from '@/components/feedback/EvaluationMark'
import { LiveIndicator } from '@/components/feedback/LiveIndicator'
import { RadarLoader, SystemLoader } from '@/components/feedback/SystemLoader'
import { toast } from '@/components/feedback/toast-store'
import {
  DEFAULT_TRANSITION,
  FEEDBACK_COLOR,
  INDICATOR_SPRING,
  flashBorder,
  questionVariants,
  realtimeEnterVariants,
} from '@/lib/animations'
import { articleById } from '@/data/normativa'
import { questionById, QUESTION_CATEGORY_LABEL } from '@/data/questions'
import { computeScore } from '@/data/scoring'
import { INCIDENT_LABEL, type Incident, type Interview, type Verdict } from '@/data/types'
import { useApp, useCandidate, useInterview } from '@/store/app-store'
import { useNow } from '@/hooks/useNow'
import { cn, formatClockSeconds, formatDuration, portalLink } from '@/lib/utils'

/* ------------------------------------------------------------------ */

function ElapsedClock({ iv }: { iv: Interview }) {
  const now = useNow(1000)
  const end = iv.finishedAt ?? now
  const s = iv.startedAt ? (end - iv.startedAt) / 1000 : 0
  return <RollingText value={formatDuration(s)} className="font-display text-2xl font-bold" />
}

/** Contador de incidencias: CountUp + pulso rojo si hay crítica */
function IncidentCounter({ incidents }: { incidents: Incident[] }) {
  const critical = incidents.some((i) => i.critical)
  return (
    <motion.div
      key={incidents.length}
      initial={incidents.length ? { scale: 1.15 } : false}
      animate={{ scale: 1 }}
      transition={INDICATOR_SPRING}
      className={cn(
        'grid size-10 place-items-center rounded-xl font-display text-xl font-bold ring-1',
        incidents.length === 0 && 'bg-white/[0.03] text-muted ring-line',
        incidents.length > 0 && !critical && 'bg-amber-500/10 text-amber-300 ring-amber-400/30',
        critical && 'animate-critical bg-red-500/15 text-red-300 ring-red-400/50',
      )}
    >
      <CountUp value={incidents.length} duration={0.4} />
    </motion.div>
  )
}

function IncidentRow({ inc, fresh }: { inc: Incident; fresh: boolean }) {
  return (
    <motion.li
      layout="position"
      variants={realtimeEnterVariants}
      initial={fresh ? 'hidden' : false}
      animate="show"
      className={cn(
        'relative flex items-center gap-3 overflow-hidden rounded-lg border px-3 py-2.5',
        inc.critical ? 'border-red-500/40 bg-red-500/[0.08]' : 'border-amber-500/25 bg-amber-500/[0.05]',
      )}
    >
      {fresh && (
        <motion.span
          aria-hidden
          className="absolute inset-0 bg-red-500/30"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
        />
      )}
      {inc.critical ? <ShieldAlert className="relative size-4 shrink-0 text-red-400" /> : <TriangleAlert className="relative size-4 shrink-0 text-amber-400" />}
      <div className="relative min-w-0 flex-1">
        <div className={cn('truncate font-mono text-[11px] font-semibold tracking-wider', inc.critical ? 'text-red-200' : 'text-amber-200')}>{INCIDENT_LABEL[inc.type]}</div>
        <div className="tabular font-mono text-[10.5px] text-dim">{formatClockSeconds(inc.at)}</div>
      </div>
      {inc.critical && <Badge tone="danger">Crítica</Badge>}
    </motion.li>
  )
}

function IncidentsPanel({ iv }: { iv: Interview }) {
  const seen = useRef(new Set(iv.incidents.map((i) => i.id)))
  const list = [...iv.incidents].reverse()
  useEffect(() => {
    const t = setTimeout(() => iv.incidents.forEach((i) => seen.current.add(i.id)), 900)
    return () => clearTimeout(t)
  }, [iv.incidents])
  return (
    <div className={cn('panel p-4', iv.incidents.some((i) => i.critical) && 'border-red-500/30')}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="label-caps !text-[11px] !text-fg">Incidencias</h3>
          <p className="mt-0.5 text-xs text-muted">Control de integridad del postulante</p>
        </div>
        <IncidentCounter incidents={iv.incidents} />
      </div>
      <ul className="mt-3 max-h-56 space-y-2 overflow-y-auto">
        <AnimatePresence initial={false}>
          {list.map((inc) => (
            <IncidentRow key={inc.id} inc={inc} fresh={!seen.current.has(inc.id)} />
          ))}
        </AnimatePresence>
        {list.length === 0 && <li className="rounded-lg border border-dashed border-line py-5 text-center text-xs text-muted">Sin incidencias registradas</li>}
      </ul>
    </div>
  )
}

/** Tarjeta de respuesta: destello azul cuando llega una respuesta nueva */
function AnswerCard({ iv, questionId }: { iv: Interview; questionId: string }) {
  const answer = iv.answers[questionId]
  const [scope, animate] = useAnimate()
  const prev = useRef<{ q: string; at?: number }>({ q: questionId, at: answer?.receivedAt })
  const [fresh, setFresh] = useState(false)

  useEffect(() => {
    const p = prev.current
    prev.current = { q: questionId, at: answer?.receivedAt }
    if (p.q !== questionId || !answer || p.at === answer.receivedAt) return
    animate(scope.current, flashBorder('realtime'))
    setFresh(true)
    const t = setTimeout(() => setFresh(false), 2200)
    return () => clearTimeout(t)
  }, [answer, questionId, animate, scope])

  return (
    <div ref={scope} className="relative rounded-xl border border-line bg-bg-elevated/70 p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="label-caps">Respuesta del postulante</span>
        <AnimatePresence>
          {fresh && (
            <motion.span initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="font-mono text-[10px] font-semibold tracking-[0.18em] text-sky-300">
              ● NUEVA RESPUESTA RECIBIDA
            </motion.span>
          )}
        </AnimatePresence>
        {!fresh && answer && <span className="tabular font-mono text-[10.5px] text-dim">{formatClockSeconds(answer.receivedAt)}</span>}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        {answer ? (
          <motion.p key={answer.receivedAt} initial={{ opacity: 0, filter: 'blur(4px)' }} animate={{ opacity: 1, filter: 'blur(0px)' }} transition={DEFAULT_TRANSITION} className="whitespace-pre-wrap text-[15px] leading-relaxed">
            {answer.text}
          </motion.p>
        ) : (
          <motion.div key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 py-2 text-sm text-muted">
            <MessageSquareDashed className="size-4" />
            Esperando respuesta
            <span className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.span key={i} className="size-1 rounded-full bg-muted" animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }} />
              ))}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const VERDICTS: { v: Verdict; label: string; key: string; cls: string; tone: keyof typeof FEEDBACK_COLOR }[] = [
  { v: 'correct', label: 'Correcta', key: '1', cls: 'data-[on=true]:border-emerald-400/60 data-[on=true]:bg-emerald-500/15 data-[on=true]:text-emerald-200 hover:border-emerald-400/40', tone: 'success' },
  { v: 'partial', label: 'Parcial', key: '2', cls: 'data-[on=true]:border-amber-400/60 data-[on=true]:bg-amber-500/15 data-[on=true]:text-amber-200 hover:border-amber-400/40', tone: 'warning' },
  { v: 'incorrect', label: 'Incorrecta', key: '3', cls: 'data-[on=true]:border-red-400/60 data-[on=true]:bg-red-500/15 data-[on=true]:text-red-200 hover:border-red-400/40', tone: 'error' },
]

/* ------------------------------------------------------------------ */

function PreStart({ iv }: { iv: Interview }) {
  const start = useApp((s) => s.startInterview)
  const candidate = useCandidate(iv.candidateId)
  const joined = iv.status === 'waiting'
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(portalLink(iv.code))
    } catch {
      /* noop */
    }
    toast.info('LINK COPIADO', iv.code)
  }
  return (
    <SpotlightCard className="mx-auto mt-8 max-w-2xl p-8 text-center">
      <div className="mx-auto mb-5 grid place-items-center">
        {joined ? (
          <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={INDICATOR_SPRING} className="grid size-16 place-items-center rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-400/30">
            <UserCheck className="size-7 text-emerald-300" />
          </motion.div>
        ) : (
          <RadarLoader size={72} />
        )}
      </div>
      <DecryptedText
        key={iv.status}
        text={joined ? 'POSTULANTE EN SALA DE ESPERA' : 'ESPERANDO CONEXIÓN DEL POSTULANTE'}
        className="text-sm font-semibold tracking-[0.24em] text-sky-200"
      />
      <p className="mt-2 text-sm text-muted">
        {joined ? `${candidate?.name} está conectado y listo para comenzar.` : 'Comparte el enlace seguro. Verás aquí cuándo se conecta.'}
      </p>
      <div className="mx-auto mt-6 flex max-w-md items-center gap-2 rounded-xl border border-line bg-black/20 p-2">
        <code className="min-w-0 flex-1 truncate px-2 text-left font-mono text-xs text-muted">{portalLink(iv.code)}</code>
        <Button size="sm" onClick={copy}>
          <Copy /> Copiar
        </Button>
        <Tooltip content="Abrir portal en otra pestaña" side="top">
          <Button size="icon" variant="ghost" onClick={() => window.open(portalLink(iv.code), '_blank')} aria-label="Abrir portal">
            <ExternalLink />
          </Button>
        </Tooltip>
      </div>
      <div className="mt-8">
        <Button size="lg" variant="primary" disabled={!joined} onClick={() => start(iv.id)} className="min-w-56">
          <Play /> INICIAR ENTREVISTA
        </Button>
        {!joined && <p className="mt-2 text-xs text-dim">Se habilitará cuando el postulante entre a la sala.</p>}
      </div>
    </SpotlightCard>
  )
}

/* ------------------------------------------------------------------ */

export default function InterviewRoom() {
  const { id } = useParams()
  const iv = useInterview(id)
  const candidate = useCandidate(iv?.candidateId)
  const navigate = useNavigate()
  const { goToQuestion, evaluate, finishInterview } = useApp.getState()
  const [dir, setDir] = useState(1)
  const [drawer, setDrawer] = useState<string | null>(null)
  const [confirmFinish, setConfirmFinish] = useState(false)

  const go = (to: number) => {
    if (!iv) return
    setDir(to > iv.currentIndex ? 1 : -1)
    goToQuestion(iv.id, to)
  }

  // Atajos: ← → navegar · 1/2/3 evaluar · N normativa
  useEffect(() => {
    if (!iv || iv.status !== 'live') return
    const on = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t.closest('input, textarea, [role=dialog]') || e.ctrlKey || e.metaKey) return
      const qid = iv.questionIds[iv.currentIndex]
      if (e.key === 'ArrowRight') go(iv.currentIndex + 1)
      else if (e.key === 'ArrowLeft') go(iv.currentIndex - 1)
      else if (['1', '2', '3'].includes(e.key)) evaluate(iv.id, qid, VERDICTS[+e.key - 1].v)
      else if (e.key.toLowerCase() === 'n') setDrawer(questionById(qid)?.articles[0] ?? null)
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iv?.id, iv?.status, iv?.currentIndex])

  if (!iv) return <SystemLoader label="CARGANDO ENTREVISTA" sublabel="Si el problema persiste, la entrevista no existe." className="min-h-[60vh]" />
  if (iv.status === 'finished')
    return (
      <Page>
        <div className="py-20 text-center">
          <p className="font-mono text-sm tracking-[0.2em] text-muted">ENTREVISTA FINALIZADA</p>
          <Button className="mt-4" variant="primary" onClick={() => navigate(`/entrevistas/${iv.id}/resultado`)}>
            Ver resultado
          </Button>
        </div>
      </Page>
    )

  const qid = iv.questionIds[iv.currentIndex]
  const q = questionById(qid)!
  const verdict = iv.evaluations[qid]
  const sc = computeScore(iv)
  const evaluated = Object.keys(iv.evaluations).length
  const isLast = iv.currentIndex === iv.questionIds.length - 1

  return (
    <Page className="max-w-[1600px]">
      {/* Cabecera de sala */}
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <Link to="/entrevistas" className="grid size-9 place-items-center rounded-lg border border-line text-muted transition-colors hover:border-line-strong hover:text-fg" aria-label="Volver">
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-bold tracking-wide">{candidate?.name}</h1>
              <InterviewStatusBadge status={iv.status} />
            </div>
            <div className="font-mono text-[11px] tracking-wider text-dim">
              {iv.code} · Discord {candidate?.discord} · {iv.interviewer}
            </div>
          </div>
        </div>
        {iv.status === 'live' && (
          <div className="flex flex-wrap items-center gap-4">
            <LiveIndicator label="LIVE · SINCRONIZADO" />
            <div className="text-right">
              <div className="label-caps !text-[9px]">Duración</div>
              <ElapsedClock iv={iv} />
            </div>
            <div className="text-right">
              <div className="label-caps !text-[9px]">Nota parcial</div>
              <div className="font-display text-2xl font-bold text-blue-200">
                <CountUp value={sc.total} />
                <span className="text-sm text-dim"> /100</span>
              </div>
            </div>
            <Button variant="danger" onClick={() => setConfirmFinish(true)}>
              <Flag /> Finalizar
            </Button>
          </div>
        )}
      </div>

      {iv.status !== 'live' ? (
        <PreStart iv={iv} />
      ) : (
        <>
          {/* Progreso */}
          <div className="mb-5 panel px-5 py-3">
            <div className="mb-2 flex items-center justify-between font-mono text-[10.5px] tracking-wider text-muted">
              <span>PROGRESO DE ENTREVISTA</span>
              <span className="tabular text-fg">
                <CountUp value={evaluated} duration={0.4} /> / {iv.questionIds.length}
              </span>
            </div>
            <Progress value={evaluated} max={iv.questionIds.length} segments={iv.questionIds.length} label="Progreso" />
          </div>

          <div className="grid gap-5 lg:grid-cols-[220px_1fr] xl:grid-cols-[220px_1fr_340px]">
            {/* Navegador de preguntas */}
            <nav className="panel hidden h-fit p-2 lg:block" aria-label="Preguntas">
              <LayoutGroup id="qnav">
                <ol className="space-y-0.5">
                  {iv.questionIds.map((id, i) => {
                    const active = i === iv.currentIndex
                    return (
                      <li key={id}>
                        <button onClick={() => go(i)} className={cn('relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors', active ? 'text-fg' : 'text-muted hover:text-fg')}>
                          {active && <motion.span layoutId="q-active" transition={INDICATOR_SPRING} className="absolute inset-0 rounded-lg border border-blue-400/25 bg-blue-500/[0.12]" />}
                          <span className="tabular relative w-5 font-mono text-[10.5px] text-dim">{String(i + 1).padStart(2, '0')}</span>
                          <span className="relative flex-1 truncate">{QUESTION_CATEGORY_LABEL[questionById(id)!.category]}</span>
                          <span className="relative">
                            <EvaluationMark verdict={iv.evaluations[id]} size="sm" className="!size-5" />
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ol>
              </LayoutGroup>
            </nav>

            {/* Pregunta actual */}
            <section className="min-w-0 space-y-4">
              <div className="panel relative overflow-hidden p-6 sm:p-7">
                <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 size-60 rounded-full bg-blue-500/10 blur-3xl" />
                <AnimatePresence mode="wait" custom={dir} initial={false}>
                  <motion.div key={qid} custom={dir} variants={questionVariants} initial="hidden" animate="show" exit="exit" className="relative">
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                      <Badge tone="brand">
                        Pregunta {iv.currentIndex + 1} / {iv.questionIds.length}
                      </Badge>
                      <Badge>{QUESTION_CATEGORY_LABEL[q.category]}</Badge>
                      <span className="ml-auto flex items-center gap-1" aria-label={`Dificultad ${q.difficulty}`}>
                        {[1, 2, 3].map((d) => (
                          <span key={d} className={cn('h-1.5 w-4 rounded-full', d <= q.difficulty ? 'bg-blue-400' : 'bg-white/10')} />
                        ))}
                      </span>
                    </div>
                    <h2 className="text-xl font-semibold leading-snug sm:text-2xl">{q.text}</h2>

                    <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto]">
                      <div className="rounded-xl border border-line bg-white/[0.015] p-4">
                        <div className="label-caps mb-2">Puntos clave esperados</div>
                        <ul className="space-y-1.5">
                          {q.expected.map((e, i) => (
                            <motion.li key={e} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ ...DEFAULT_TRANSITION, delay: 0.08 + i * 0.04 }} className="flex items-start gap-2 text-sm text-muted">
                              <span className="mt-2 size-1 shrink-0 rounded-full bg-blue-400" /> {e}
                            </motion.li>
                          ))}
                        </ul>
                      </div>
                      <div className="flex flex-col gap-2">
                        {q.articles.map((a) => (
                          <Button key={a} variant="outline" size="sm" onClick={() => setDrawer(a)} className="justify-start">
                            <BookOpen /> VER ART. {a}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              <AnswerCard key={qid} iv={iv} questionId={qid} />

              {/* Evaluación + navegación */}
              <div className="panel space-y-3 p-4">
                <div className="flex items-center gap-3">
                  <EvaluationMark verdict={verdict} />
                  <span className="label-caps flex-1">Evaluación</span>
                  <Button variant="secondary" onClick={() => go(iv.currentIndex - 1)} disabled={iv.currentIndex === 0} aria-label="Pregunta anterior">
                    <ChevronLeft />
                  </Button>
                  {isLast ? (
                    <Button variant="primary" onClick={() => setConfirmFinish(true)}>
                      <Flag /> Finalizar
                    </Button>
                  ) : (
                    <Button variant="primary" onClick={() => go(iv.currentIndex + 1)}>
                      SIGUIENTE <ChevronRight />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {VERDICTS.map((v) => (
                    <motion.button
                      key={v.v}
                      data-on={verdict === v.v}
                      onClick={() => evaluate(iv.id, qid, v.v)}
                      whileTap={{ scale: 0.97 }}
                      className={cn('relative flex h-11 items-center justify-center gap-2 rounded-lg border border-line-strong text-sm font-medium text-muted transition-colors', v.cls)}
                    >
                      {v.label}
                      <Kbd className="hidden sm:inline-flex">{v.key}</Kbd>
                    </motion.button>
                  ))}
                </div>
              </div>
              <p className="hidden text-center font-mono text-[10.5px] tracking-wider text-dim md:block">
                <Kbd>←</Kbd> <Kbd>→</Kbd> navegar · <Kbd>1</Kbd> <Kbd>2</Kbd> <Kbd>3</Kbd> evaluar · <Kbd>N</Kbd> normativa
              </p>
            </section>

            {/* Columna derecha */}
            <aside className="space-y-4 lg:col-span-2 xl:col-span-1">
              <IncidentsPanel iv={iv} />
              <div className="panel p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="label-caps !text-[11px] !text-fg">Historial</h3>
                  <LiveIndicator label="RT" tone="brand" />
                </div>
                <Timeline events={iv.timeline} maxHeight={340} />
              </div>
            </aside>
          </div>
        </>
      )}

      {/* Normativa sin salir de la entrevista */}
      <Drawer open={!!drawer} onOpenChange={(v) => !v && setDrawer(null)} eyebrow="Normativa · consulta rápida" title={drawer ? `ART. ${drawer}` : ''}>
        {drawer && articleById(drawer) && (
          <AnimatePresence mode="wait">
            <motion.div key={drawer} variants={questionVariants} custom={1} initial="hidden" animate="show" exit="exit">
              <ArticleView article={articleById(drawer)!} compact onNavigateArticle={(a) => setDrawer(a)} />
            </motion.div>
          </AnimatePresence>
        )}
      </Drawer>

      <Dialog open={confirmFinish} onOpenChange={setConfirmFinish} title="¿Finalizar entrevista?" description="Se calculará el resultado final y se notificará al postulante.">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-lg border border-line p-3">
            <div className="font-display text-2xl font-bold">{evaluated}</div>
            <div className="label-caps !text-[9px]">evaluadas</div>
          </div>
          <div className="rounded-lg border border-line p-3">
            <div className="font-display text-2xl font-bold">{iv.questionIds.length - evaluated}</div>
            <div className="label-caps !text-[9px]">sin evaluar</div>
          </div>
          <div className="rounded-lg border border-line p-3">
            <div className="font-display text-2xl font-bold">{iv.incidents.length}</div>
            <div className="label-caps !text-[9px]">incidencias</div>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmFinish(false)}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              finishInterview(iv.id)
              setConfirmFinish(false)
              navigate(`/entrevistas/${iv.id}/resultado`, { state: { fresh: true } })
            }}
          >
            <Flag /> Generar resultado
          </Button>
        </div>
      </Dialog>
    </Page>
  )
}
