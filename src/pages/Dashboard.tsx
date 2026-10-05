import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import {
  ArrowUpRight,
  CircleCheck,
  CircleX,
  Gauge,
  Mic,
  Plus,
  Radio,
  ShieldAlert,
  TriangleAlert,
  UserRoundSearch,
  Users,
} from 'lucide-react'
import { Page } from '@/components/app/PageHeader'
import { StatCard } from '@/components/app/StatCard'
import { ScoreRing } from '@/components/app/ScoreRing'
import { Timeline } from '@/components/app/Timeline'
import { EmptyState } from '@/components/app/EmptyState'
import { ResultBadge } from '@/components/app/StatusBadge'
import { Aurora, BlurText, CountUp, GridBackground, RollingText, ShinyText, SpotlightCard } from '@/components/reactbits'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { LiveIndicator, PulseDot } from '@/components/feedback/LiveIndicator'
import { cardVariants, staggerContainer, STAGGER, DEFAULT_TRANSITION } from '@/lib/animations'
import { computeScore } from '@/data/scoring'
import { useApp } from '@/store/app-store'
import { db } from '@/lib/db'
import { useNow } from '@/hooks/useNow'
import { cn, formatClock, formatDuration } from '@/lib/utils'
import type { Interview } from '@/data/types'

function greeting(h: number) {
  if (h < 7) return 'Buenas noches'
  if (h < 14) return 'Buenos días'
  if (h < 21) return 'Buenas tardes'
  return 'Buenas noches'
}

function LiveInterviewCard({ iv }: { iv: Interview }) {
  const now = useNow(1000)
  const candidate = useApp((s) => s.candidates.find((c) => c.id === iv.candidateId))
  const navigate = useNavigate()
  const sc = computeScore(iv)
  const answered = Object.keys(iv.evaluations).length
  const critical = iv.incidents.some((i) => i.critical)
  const elapsed = iv.startedAt ? (now - iv.startedAt) / 1000 : 0

  return (
    <motion.div variants={cardVariants} layout>
      <SpotlightCard spotlightColor="34 197 94" className="gradient-border p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative grid size-11 place-items-center rounded-xl bg-gradient-to-br from-emerald-500/25 to-emerald-900/20 font-display text-base font-bold ring-1 ring-emerald-400/30">
              {candidate?.name.split(' ').map((p) => p[0]).join('').slice(0, 2)}
              <span className="absolute -right-1 -top-1">
                <PulseDot tone="live" />
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{candidate?.name}</span>
                <span className="font-mono text-[10.5px] tracking-wider text-dim">{iv.code}</span>
              </div>
              <div className="mt-0.5 text-xs text-muted">{iv.interviewer}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <LiveIndicator label="ENTREVISTA ACTIVA · LIVE" className="hidden sm:inline-flex" />
            <LiveIndicator label="LIVE" className="sm:hidden" />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <div className="label-caps">Tiempo</div>
            <RollingText value={formatDuration(elapsed)} className="mt-1 font-display text-2xl font-bold" />
          </div>
          <div>
            <div className="label-caps">Pregunta</div>
            <div className="mt-1 font-display text-2xl font-bold">
              <CountUp value={iv.currentIndex + 1} /> <span className="text-base text-dim">/ {iv.questionIds.length}</span>
            </div>
          </div>
          <div>
            <div className="label-caps">Acierto</div>
            <div className="mt-1 font-display text-2xl font-bold text-emerald-300">
              <CountUp value={sc.questions} suffix="%" />
            </div>
          </div>
          <div>
            <div className="label-caps">Incidencias</div>
            <div className="mt-1 flex items-center gap-2">
              <span
                className={cn(
                  'grid size-8 place-items-center rounded-lg font-display text-xl font-bold',
                  iv.incidents.length ? 'bg-amber-500/10 text-amber-300 ring-1 ring-amber-400/30' : 'text-muted',
                  critical && 'animate-critical bg-red-500/15 text-red-300 ring-red-400/40',
                )}
              >
                <CountUp value={iv.incidents.length} />
              </span>
            </div>
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-1.5 flex justify-between font-mono text-[10.5px] tracking-wider text-muted">
            <span>PROGRESO</span>
            <span className="tabular">
              {answered} / {iv.questionIds.length} evaluadas
            </span>
          </div>
          <Progress value={answered} max={iv.questionIds.length} tone="ok" label="Progreso entrevista" />
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button variant="primary" size="sm" onClick={() => navigate(`/entrevistas/${iv.id}`)}>
            <Radio /> Entrar a la sala
          </Button>
        </div>
      </SpotlightCard>
    </motion.div>
  )
}

export default function Dashboard() {
  const session = useApp((s) => s.session)
  const interviews = useApp((s) => s.interviews)
  const candidates = useApp((s) => s.candidates)
  const navigate = useNavigate()
  const now = useNow(60_000)

  const stats = useMemo(() => {
    const finished = interviews.filter((i) => i.status === 'finished')
    const live = interviews.filter((i) => i.status === 'live')
    const waiting = interviews.filter((i) => i.status === 'waiting')
    const approved = finished.filter((i) => i.result === 'APTO').length
    const failed = finished.filter((i) => i.result === 'NO_APTO').length
    const avg = finished.length ? finished.reduce((s, i) => s + (i.score ?? 0), 0) / finished.length : 0
    const activeIncidents = [...live, ...waiting].reduce((s, i) => s + i.incidents.length, 0)
    const criticalIncidents = [...live, ...waiting].some((i) => i.incidents.some((x) => x.critical))
    const rate = finished.length ? (approved / finished.length) * 100 : 0
    const activity = [...live, ...waiting]
      .flatMap((i) => i.timeline)
      .sort((a, b) => a.at - b.at)
      .slice(-9)
    const recent = [...finished].sort((a, b) => (b.finishedAt ?? 0) - (a.finishedAt ?? 0)).slice(0, 5)
    return { finished, live, waiting, approved, failed, avg, activeIncidents, criticalIncidents, rate, activity, recent }
  }, [interviews])

  const candidateName = (id: string) => candidates.find((c) => c.id === id)?.name ?? '—'
  const date = new Date(now)

  return (
    <Page>
      {db.backend !== 'local' && db.status === 'error' && db.lastError && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/[0.06] px-4 py-3 text-sm text-red-100/90">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-red-300" />
          <p>
            <b className="font-semibold">Error de servidor:</b> {db.lastError}
          </p>
        </div>
      )}
      {db.backend === 'local' && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/[0.06] px-4 py-3 text-sm text-amber-100/90">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-300" />
          <p>
            <b className="font-semibold">Modo local:</b> los datos sólo existen en este navegador, así que el enlace del postulante no funcionará en otro dispositivo. Conecta Supabase
            (ver README) para usarlo en producción.
          </p>
        </div>
      )}
      {/* Cabecera con fondo vivo (único fondo animado de la página) */}
      <section className="relative mb-6 overflow-hidden rounded-2xl border border-line bg-panel/60 px-6 py-7 sm:px-8">
        <Aurora intensity={0.22} />
        <GridBackground fade="top" cell={36} />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="label-caps mb-2 flex items-center gap-2">
              <span className="h-px w-5 bg-blue-400/60" />
              CENTRO DE MANDO · RECLUTAMIENTO
            </motion.div>
            <BlurText
              as="h1"
              text={`${greeting(date.getHours())}, ${session?.name ?? ''}`}
              className="font-display text-3xl font-bold tracking-wide sm:text-4xl"
            />
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ ...DEFAULT_TRANSITION, delay: 0.25 }} className="mt-2 text-sm text-muted">
              {date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })} ·{' '}
              <ShinyText>
                {stats.live.length} entrevista{stats.live.length === 1 ? '' : 's'} en directo, {stats.waiting.length} en sala de espera
              </ShinyText>
            </motion.p>
          </div>
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DEFAULT_TRANSITION, delay: 0.15 }} className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => window.open('/portal', '_blank')}>
              <UserRoundSearch /> Portal postulante
            </Button>
            <Button variant="primary" onClick={() => navigate('/entrevistas?nueva=1')}>
              <Plus /> Nueva entrevista
            </Button>
          </motion.div>
        </div>
      </section>

      {/* KPIs con entrada escalonada y CountUp */}
      <motion.div
        variants={staggerContainer(STAGGER.default, 0.1)}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-6"
      >
        <StatCard label="Entrevistas activas" value={stats.live.length} icon={Mic} tone="ok" emphasis footer={<LiveIndicator label="LIVE SYNC" />} />
        <StatCard label="Postulantes" value={candidates.length} icon={Users} tone="brand" footer={`${candidates.filter((c) => c.status === 'pendiente').length} pendientes`} />
        <StatCard label="Aprobados" value={stats.approved} icon={CircleCheck} tone="ok" footer={`${stats.rate.toFixed(0)}% de aprobación`} />
        <StatCard label="No aptos" value={stats.failed} icon={CircleX} tone="danger" footer={`${stats.finished.length} evaluaciones cerradas`} />
        <StatCard label="Nota media" value={stats.avg} decimals={1} icon={Gauge} tone="cyan" footer="sobre 100 puntos" />
        <motion.div variants={cardVariants} className={cn('h-full rounded-[14px]', stats.criticalIncidents && 'animate-critical')}>
          <StatCard
            label="Incidencias"
            value={stats.activeIncidents}
            icon={stats.criticalIncidents ? ShieldAlert : TriangleAlert}
            tone={stats.criticalIncidents ? 'danger' : 'warn'}
            footer={stats.criticalIncidents ? <span className="text-red-300">Incidencia crítica activa</span> : 'en sesiones abiertas'}
          />
        </motion.div>
      </motion.div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_380px]">
        {/* Columna principal */}
        <div className="space-y-6">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="label-caps !text-[11px] !text-fg">En directo</h2>
              <Link to="/entrevistas" className="flex items-center gap-1 text-xs text-muted transition-colors hover:text-blue-300">
                Todas <ArrowUpRight className="size-3.5" />
              </Link>
            </div>
            <motion.div variants={staggerContainer(STAGGER.slow, 0.3)} initial="hidden" animate="show" className="space-y-4">
              {stats.live.length === 0 ? (
                <div className="panel">
                  <EmptyState icon={Radio} title="SIN ENTREVISTAS EN DIRECTO" description="Cuando un entrevistador inicie una sesión aparecerá aquí con su estado en tiempo real." />
                </div>
              ) : (
                stats.live.map((iv) => <LiveInterviewCard key={iv.id} iv={iv} />)
              )}
            </motion.div>
          </section>

          {/* Sala de espera */}
          <section>
            <h2 className="label-caps mb-3 !text-[11px] !text-fg">Sala de espera</h2>
            <div className="panel divide-y divide-line">
              {stats.waiting.length === 0 && <p className="px-5 py-6 text-sm text-muted">Ningún postulante esperando.</p>}
              {stats.waiting.map((iv, i) => (
                <motion.div
                  key={iv.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ ...DEFAULT_TRANSITION, delay: 0.4 + i * 0.05 }}
                  className="flex flex-wrap items-center gap-4 px-5 py-4"
                >
                  <LiveIndicator label="EN ESPERA" tone="brand" />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{candidateName(iv.candidateId)}</div>
                    <div className="font-mono text-[11px] text-dim">
                      {iv.code} · conectado {iv.candidateJoinedAt ? formatClock(iv.candidateJoinedAt) : '—'}
                    </div>
                  </div>
                  <Button size="sm" variant="success" onClick={() => navigate(`/entrevistas/${iv.id}`)}>
                    Abrir sala
                  </Button>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Resultados recientes */}
          <section>
            <h2 className="label-caps mb-3 !text-[11px] !text-fg">Resultados recientes</h2>
            {stats.recent.length === 0 && <p className="panel px-5 py-6 text-sm text-muted">Aún no hay entrevistas finalizadas.</p>}
            <motion.div variants={staggerContainer(STAGGER.fast, 0.45)} initial="hidden" animate="show" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {stats.recent.map((iv) => {
                const tone = iv.result === 'APTO' ? 'ok' : iv.result === 'NO_APTO' ? 'danger' : 'warn'
                return (
                  <motion.button
                    key={iv.id}
                    variants={cardVariants}
                    whileHover={{ y: -2 }}
                    onClick={() => navigate(`/entrevistas/${iv.id}/resultado`)}
                    className="panel flex items-center gap-4 p-4 text-left transition-colors hover:border-line-strong"
                  >
                    <ScoreRing value={iv.score ?? 0} size={58} stroke={5} tone={tone}>
                      <span className="font-display text-base font-bold">
                        <CountUp value={iv.score ?? 0} />
                      </span>
                    </ScoreRing>
                    <div className="min-w-0">
                      <div className="truncate font-medium">{candidateName(iv.candidateId)}</div>
                      <div className="mt-1">
                        <ResultBadge result={iv.result} />
                      </div>
                    </div>
                  </motion.button>
                )
              })}
            </motion.div>
          </section>
        </div>

        {/* Columna lateral */}
        <aside className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DEFAULT_TRANSITION, delay: 0.35 }} className="panel p-5">
            <div className="flex items-center justify-between">
              <h2 className="label-caps !text-[11px] !text-fg">Tasa de aprobación</h2>
              <span className="font-mono text-[10.5px] text-dim">{stats.finished.length} cerradas</span>
            </div>
            <div className="mt-4 flex items-center gap-5">
              <ScoreRing value={Math.round(stats.rate)} suffix="%" size={112} tone="ok" label="aptos" delay={0.4} />
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-emerald-400" /> Aptos <b className="tabular ml-auto pl-4">{stats.approved}</b>
                </li>
                <li className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-amber-400" /> Revisión
                  <b className="tabular ml-auto pl-4">{stats.finished.filter((i) => i.result === 'REVISION').length}</b>
                </li>
                <li className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-red-400" /> No aptos <b className="tabular ml-auto pl-4">{stats.failed}</b>
                </li>
              </ul>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DEFAULT_TRANSITION, delay: 0.45 }} className="panel p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="label-caps !text-[11px] !text-fg">Actividad en tiempo real</h2>
              <LiveIndicator label="RT" tone="brand" />
            </div>
            {stats.activity.length ? (
              <Timeline events={stats.activity} newestFirst maxHeight={420} />
            ) : (
              <p className="py-6 text-center text-sm text-muted">Sin actividad.</p>
            )}
          </motion.div>
        </aside>
      </div>
    </Page>
  )
}
