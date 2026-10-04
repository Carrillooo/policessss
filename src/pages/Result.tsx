/**
 * RESULTADO FINAL
 * Secuencia: ANALIZANDO RESULTADOS… → RESULTADO FINAL → número 0→N → etiqueta.
 * APTO: glow verde, check dibujado, barrido de luz, partículas muy sutiles.
 * NO APTO: rojo moderado, sin dramatismo. REVISIÓN: ámbar.
 */
import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, Gamepad2, ListChecks, TriangleAlert } from 'lucide-react'
import { Page } from '@/components/app/PageHeader'
import { Timeline } from '@/components/app/Timeline'
import { AnimatedContent, Aurora, CountUp, DecryptedText, LazyParticles } from '@/components/reactbits'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { EvaluationMark } from '@/components/feedback/EvaluationMark'
import { RadarLoader, SystemLoader } from '@/components/feedback/SystemLoader'
import { toast } from '@/components/feedback/toast-store'
import { DEFAULT_TRANSITION, DURATION, EASE, PAGE_TRANSITION, staggerContainer, cardVariants, STAGGER } from '@/lib/animations'
import { questionById } from '@/data/questions'
import { computeScore, PASS_MARK, RESULT_META } from '@/data/scoring'
import { INCIDENT_LABEL, type ResultLabel } from '@/data/types'
import { useCandidate, useInterview } from '@/store/app-store'
import { cn, formatDuration } from '@/lib/utils'

const LOOK: Record<ResultLabel, { text: string; glow: string; ring: string; aurora: [string, string, string] }> = {
  APTO: { text: 'text-emerald-300', glow: 'rgb(34 197 94 / 0.35)', ring: 'border-emerald-400/40', aurora: ['16 185 129', '34 197 94', '6 78 59'] },
  NO_APTO: { text: 'text-red-300/90', glow: 'rgb(239 68 68 / 0.18)', ring: 'border-red-400/30', aurora: ['127 29 29', '153 27 27', '30 41 59'] },
  REVISION: { text: 'text-amber-300', glow: 'rgb(245 158 11 / 0.25)', ring: 'border-amber-400/35', aurora: ['180 83 9', '245 158 11', '30 41 59'] },
}

function AnimatedCheck() {
  return (
    <svg viewBox="0 0 52 52" className="size-14" fill="none">
      <motion.circle cx="26" cy="26" r="24" stroke="#34d399" strokeWidth="2" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, ease: EASE.out }} />
      <motion.path d="M15 27l7 7 15-16" stroke="#6ee7b7" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.35, delay: 0.4, ease: EASE.out }} />
    </svg>
  )
}

function Hero({ score, result, animateIn }: { score: number; result: ResultLabel; animateIn: boolean }) {
  const look = LOOK[result]
  const [showLabel, setShowLabel] = useState(!animateIn)
  return (
    <section className={cn('relative overflow-hidden rounded-3xl border bg-panel/70 px-6 py-12 text-center sm:py-16', look.ring)} style={{ boxShadow: `0 40px 120px -40px ${look.glow}` }}>
      <Aurora colors={look.aurora} intensity={result === 'APTO' ? 0.3 : 0.18} />
      {result === 'APTO' && <LazyParticles count={28} color="110 231 183" speed={0.12} linkDistance={0} />}
      {/* Barrido de luz (sólo APTO) */}
      {result === 'APTO' && showLabel && (
        <motion.div
          aria-hidden
          data-decorative="true"
          className="pointer-events-none absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-emerald-200/10 to-transparent"
          initial={{ x: '-120%' }}
          animate={{ x: '420%' }}
          transition={{ duration: 1.4, ease: EASE.inOut, delay: 0.2 }}
        />
      )}
      <div className="relative">
        <DecryptedText text="RESULTADO FINAL" className="text-xs font-semibold tracking-[0.4em] text-muted" />
        <div className="mt-6 flex items-end justify-center gap-2 font-display font-bold leading-none">
          <span className={cn('text-8xl sm:text-9xl', look.text)} style={{ textShadow: `0 0 50px ${look.glow}` }}>
            <CountUp value={score} duration={animateIn ? 1.4 : DURATION.counter} delay={animateIn ? 0.3 : 0} onSettled={() => setShowLabel(true)} />
          </span>
          <span className="pb-3 text-3xl text-dim">/ 100</span>
        </div>
        <div className="mt-8 flex min-h-20 flex-col items-center justify-center">
          <AnimatePresence>
            {showLabel && (
              <motion.div
                initial={{ opacity: 0, y: 10, filter: 'blur(8px)', scale: 0.96 }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)', scale: 1 }}
                transition={PAGE_TRANSITION}
                className="flex flex-col items-center gap-3"
              >
                {result === 'APTO' && <AnimatedCheck />}
                <span className={cn('font-display text-4xl font-bold tracking-[0.3em] sm:text-5xl', look.text)}>{RESULT_META[result].label}</span>
                <span className="text-sm text-muted">
                  {result === 'APTO' && 'El postulante supera el proceso de selección.'}
                  {result === 'NO_APTO' && `No alcanza la puntuación mínima (${PASS_MARK}). Puede volver a presentarse en el próximo periodo.`}
                  {result === 'REVISION' && 'Resultado en el umbral: requiere revisión por un supervisor.'}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}

export default function Result() {
  const { id } = useParams()
  const loc = useLocation()
  const iv = useInterview(id)
  const candidate = useCandidate(iv?.candidateId)
  const fresh = (loc.state as { fresh?: boolean } | null)?.fresh ?? false
  const [analyzing, setAnalyzing] = useState(fresh)

  useEffect(() => {
    if (!analyzing) return
    const t = setTimeout(() => setAnalyzing(false), 1700)
    return () => clearTimeout(t)
  }, [analyzing])

  useEffect(() => {
    if (fresh && !analyzing && iv?.result === 'APTO') toast.success('CANDIDATO APROBADO', candidate?.name)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analyzing])

  if (!iv) return <SystemLoader label="CARGANDO RESULTADO" className="min-h-[60vh]" />
  const sc = computeScore(iv)
  const score = iv.score ?? sc.total
  const result = iv.result ?? sc.result
  const duration = iv.startedAt && iv.finishedAt ? (iv.finishedAt - iv.startedAt) / 1000 : 0

  return (
    <Page className="max-w-6xl">
      <div className="mb-5 flex items-center justify-between gap-3">
        <Link to="/entrevistas" className="flex items-center gap-2 text-sm text-muted transition-colors hover:text-fg">
          <ArrowLeft className="size-4" /> Entrevistas
        </Link>
        <span className="font-mono text-[11px] tracking-wider text-dim">
          {iv.code} · {candidate?.name}
        </span>
      </div>

      <AnimatePresence mode="wait">
        {analyzing ? (
          <motion.div key="analyzing" exit={{ opacity: 0, scale: 0.98, filter: 'blur(6px)' }} transition={DEFAULT_TRANSITION} className="grid min-h-[60vh] place-items-center">
            <div className="flex flex-col items-center gap-6">
              <RadarLoader size={96} />
              <DecryptedText text="ANALIZANDO RESULTADOS..." className="text-sm font-semibold tracking-[0.3em] text-sky-200" />
              <div className="w-64">
                <motion.div className="h-0.5 origin-left rounded-full bg-gradient-to-r from-blue-600 to-sky-400" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 1.5, ease: EASE.inOut }} />
              </div>
              <div className="font-mono text-[10.5px] tracking-widest text-dim">GENERANDO RESULTADO</div>
            </div>
          </motion.div>
        ) : (
          <motion.div key="result" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={PAGE_TRANSITION}>
            <Hero score={score} result={result} animateIn={fresh} />

            {/* Desglose */}
            <motion.div variants={staggerContainer(STAGGER.default, 0.3)} initial="hidden" animate="show" className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: 'Correctas', value: sc.correct, cls: 'text-emerald-300' },
                { label: 'Parciales', value: sc.partial, cls: 'text-amber-300' },
                { label: 'Incorrectas', value: sc.incorrect, cls: 'text-red-300' },
                { label: 'Duración', value: -1, cls: 'text-fg' },
              ].map((k) => (
                <motion.div key={k.label} variants={cardVariants} className="panel p-5">
                  <div className="label-caps">{k.label}</div>
                  <div className={cn('mt-2 font-display text-4xl font-bold', k.cls)}>{k.value < 0 ? formatDuration(duration) : <CountUp value={k.value} />}</div>
                </motion.div>
              ))}
            </motion.div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
              <AnimatedContent className="panel p-5">
                <h2 className="label-caps mb-4 flex items-center gap-2 !text-[11px] !text-fg">
                  <ListChecks className="size-4 text-blue-300" /> Preguntas
                </h2>
                <ol className="divide-y divide-line">
                  {iv.questionIds.map((qid, i) => (
                    <li key={qid} className="flex items-start gap-3 py-3">
                      <span className="tabular w-6 pt-1 font-mono text-[11px] text-dim">{String(i + 1).padStart(2, '0')}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">{questionById(qid)?.text}</p>
                        {iv.answers[qid] && <p className="mt-1 line-clamp-2 text-xs text-muted">“{iv.answers[qid].text}”</p>}
                      </div>
                      <EvaluationMark verdict={iv.evaluations[qid]} size="sm" />
                    </li>
                  ))}
                </ol>
              </AnimatedContent>

              <div className="space-y-6">
                <AnimatedContent className="panel p-5" delay={0.05}>
                  <h2 className="label-caps mb-4 flex items-center gap-2 !text-[11px] !text-fg">
                    <Gamepad2 className="size-4 text-blue-300" /> Pruebas psicotécnicas
                  </h2>
                  {Object.keys(iv.games).length === 0 && <p className="text-sm text-muted">Sin pruebas registradas.</p>}
                  <ul className="space-y-3">
                    {Object.entries(iv.games).map(([g, v]) => (
                      <li key={g}>
                        <div className="mb-1 flex justify-between text-xs">
                          <span className="capitalize text-muted">{g}</span>
                          <span className="tabular font-mono">{v}</span>
                        </div>
                        <Progress value={v} tone={v >= 70 ? 'ok' : v >= 50 ? 'warn' : 'danger'} />
                      </li>
                    ))}
                  </ul>
                </AnimatedContent>

                <AnimatedContent className="panel p-5" delay={0.1}>
                  <h2 className="label-caps mb-3 flex items-center gap-2 !text-[11px] !text-fg">
                    <TriangleAlert className="size-4 text-amber-300" /> Incidencias · −{sc.penalty} pts
                  </h2>
                  {iv.incidents.length === 0 ? (
                    <p className="text-sm text-muted">Sin incidencias.</p>
                  ) : (
                    <ul className="space-y-1.5 text-sm">
                      {iv.incidents.map((i) => (
                        <li key={i.id} className={cn('flex justify-between font-mono text-[11px] tracking-wider', i.critical ? 'text-red-300' : 'text-amber-300')}>
                          {INCIDENT_LABEL[i.type]}
                          <span>{i.critical ? '−5' : '−2'}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </AnimatedContent>

                {iv.timeline.length > 0 && (
                  <AnimatedContent className="panel p-5" delay={0.15}>
                    <h2 className="label-caps mb-3 !text-[11px] !text-fg">Historial</h2>
                    <Timeline events={iv.timeline} maxHeight={320} />
                  </AnimatedContent>
                )}
              </div>
            </div>

            <div className="mt-8 flex justify-center">
              <Button variant="outline" onClick={() => window.print()}>
                Imprimir informe
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Page>
  )
}
