/**
 * Analítica: KPIs + gráficos SVG ligeros (sin librería de charts).
 * Cada gráfico se revela al entrar en el viewport (AnimatedContent) y
 * sus marcas crecen escalonadas una sola vez. Hover/focus muestra valores.
 */
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, type Variants } from 'motion/react'
import { Activity, ChartColumn, ChartLine, ChartPie, Gauge, Percent, Timer, TriangleAlert, Users } from 'lucide-react'
import { Page, PageHeader } from '@/components/app/PageHeader'
import { StatCard } from '@/components/app/StatCard'
import { EmptyState } from '@/components/app/EmptyState'
import { AnimatedContent, CountUp, SpotlightCard } from '@/components/reactbits'
import { LiveIndicator } from '@/components/feedback/LiveIndicator'
import { Tooltip } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { useApp } from '@/store/app-store'
import { questionById, QUESTION_CATEGORY_LABEL } from '@/data/questions'
import { PASS_MARK, REVIEW_MARK, RESULT_META } from '@/data/scoring'
import { INCIDENT_LABEL, type IncidentType, type Interview, type Question, type ResultLabel, type Verdict } from '@/data/types'
import { DEFAULT_TRANSITION, DURATION, EASE, PAGE_TRANSITION, STAGGER, cardVariants, staggerContainer } from '@/lib/animations'
import { cn } from '@/lib/utils'

/* ---------------------------------------------------------------- */
/* Paleta semántica (estado)                                         */
/* ---------------------------------------------------------------- */
const C = {
  ok: '#22c55e',
  warn: '#f59e0b',
  danger: '#ef4444',
  brand: '#3b82f6',
  cyan: '#38bdf8',
  grid: 'rgb(148 163 184 / 0.10)',
  axis: 'rgb(148 163 184 / 0.22)',
  label: '#8a97ad',
  surface: '#0c1222',
}
const RESULT_COLOR: Record<ResultLabel, string> = { APTO: C.ok, NO_APTO: C.danger, REVISION: C.warn }
const RESULT_ORDER: ResultLabel[] = ['APTO', 'REVISION', 'NO_APTO']
const scoreColor = (s: number) => (s >= PASS_MARK ? C.ok : s >= REVIEW_MARK ? C.warn : C.danger)

/* ---------------------------------------------------------------- */
/* Utilidades                                                        */
/* ---------------------------------------------------------------- */

/** Ancho del contenedor (los SVG se dibujan a píxel real: texto legible en móvil) */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [w, setW] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, w] as const
}

/** Variante de barra vertical/horizontal que crece desde su base, escalonada por índice */
const growVariants = (axis: 'x' | 'y'): Variants => ({
  hidden: axis === 'y' ? { scaleY: 0 } : { scaleX: 0 },
  show: (i: number = 0) => ({
    ...(axis === 'y' ? { scaleY: 1 } : { scaleX: 1 }),
    transition: { ...PAGE_TRANSITION, delay: Math.min(i, 10) * STAGGER.fast },
  }),
})
const growY = growVariants('y')
const growX = growVariants('x')

const fadeIn = (delay = 0): Variants => ({
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { ...DEFAULT_TRANSITION, delay } },
})

const inViewProps = { initial: 'hidden', whileInView: 'show', viewport: { once: true, margin: '-40px' } } as const

const shortDate = new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short' })

/* ---------------------------------------------------------------- */
/* Página                                                            */
/* ---------------------------------------------------------------- */

export default function Analytics() {
  const interviews = useApp((s) => s.interviews)
  const candidates = useApp((s) => s.candidates)
  const navigate = useNavigate()

  const data = useMemo(() => {
    const finished = interviews
      .filter((i): i is Interview & { score: number; result: ResultLabel } => i.status === 'finished' && i.score != null && i.result != null)
      .sort((a, b) => (a.finishedAt ?? a.createdAt) - (b.finishedAt ?? b.createdAt))
    const n = finished.length
    const apto = finished.filter((i) => i.result === 'APTO').length
    const avgScore = n ? finished.reduce((s, i) => s + i.score, 0) / n : 0
    const timed = finished.filter((i) => i.startedAt && i.finishedAt)
    const avgDur = timed.length ? timed.reduce((s, i) => s + (i.finishedAt! - i.startedAt!), 0) / timed.length / 1000 : 0
    const incidents = finished.reduce((s, i) => s + i.incidents.length, 0)
    return {
      finished,
      total: interviews.length,
      active: interviews.filter((i) => i.status === 'live' || i.status === 'waiting').length,
      approval: n ? (apto / n) * 100 : 0,
      avgScore,
      avgDur,
      incidentsPer: n ? incidents / n : 0,
    }
  }, [interviews])

  const nameOf = useMemo(() => {
    const m = new Map(candidates.map((c) => [c.id, c.name]))
    return (id: string) => m.get(id) ?? 'Candidato'
  }, [candidates])

  const mins = Math.floor(data.avgDur / 60)
  const secs = Math.round(data.avgDur % 60)

  return (
    <Page>
      <PageHeader
        eyebrow="Inteligencia · Reclutamiento"
        title="Analítica"
        description="Rendimiento agregado del proceso de selección: resultados, puntuaciones, precisión por área e incidencias de integridad."
        actions={<LiveIndicator label="DATOS EN TIEMPO REAL" />}
      />

      {/* KPIs */}
      <motion.div variants={staggerContainer(STAGGER.default)} initial="hidden" animate="show" className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Entrevistas" value={data.total} icon={Users} footer={`${data.finished.length} finalizadas · ${data.active} activas`} />
        <StatCard label="Tasa de aprobación" value={data.approval} decimals={1} suffix="%" icon={Percent} tone="ok" emphasis footer={`Nota de corte ${PASS_MARK}/100`} />
        <StatCard label="Puntuación media" value={data.avgScore} decimals={1} icon={Gauge} tone="cyan" footer="Sobre 100 puntos" />
        <motion.div variants={cardVariants} whileHover={{ y: -2 }} className="h-full">
          <SpotlightCard spotlightColor="245 158 11" className="h-full p-5">
            <div className="flex items-start justify-between gap-3">
              <span className="label-caps">Duración media</span>
              <span className="grid size-8 place-items-center rounded-lg bg-amber-500/10 text-amber-300 ring-1 ring-amber-400/20">
                <Timer className="size-4" />
              </span>
            </div>
            <div className="mt-3 font-display text-4xl font-bold leading-none tracking-wide" aria-label={`${mins} minutos ${secs} segundos`}>
              <CountUp value={mins} />
              <span className="text-dim">:</span>
              <CountUp value={secs} prefix={secs < 10 ? '0' : ''} />
            </div>
            <div className="mt-3 text-xs text-muted">mm:ss por entrevista</div>
          </SpotlightCard>
        </motion.div>
        <StatCard label="Incidencias / entrevista" value={data.incidentsPer} decimals={2} icon={TriangleAlert} tone="danger" className="col-span-2 md:col-span-1" footer="Integridad del candidato" />
      </motion.div>

      {data.finished.length === 0 ? (
        <div className="panel mt-6">
          <EmptyState
            icon={ChartColumn}
            title="SIN DATOS SUFICIENTES"
            description="Las gráficas aparecerán cuando haya al menos una entrevista finalizada."
            action={
              <Button size="sm" variant="outline" onClick={() => navigate('/entrevistas')}>
                Ir a entrevistas
              </Button>
            }
          />
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ChartCard className="lg:col-span-2" icon={ChartColumn} eyebrow="Distribución" title="Puntuaciones finales" meta={`${data.finished.length} entrevistas`}>
            <ScoreHistogram scores={data.finished.map((i) => i.score)} />
          </ChartCard>
          <ChartCard icon={ChartPie} eyebrow="Veredictos" title="Resultados" delay={0.05}>
            <ResultsDonut finished={data.finished} />
          </ChartCard>
          <ChartCard className="lg:col-span-3" icon={ChartLine} eyebrow="Evolución" title="Puntuación por entrevista" meta="Orden cronológico">
            <ScoreTrend finished={data.finished} nameOf={nameOf} />
          </ChartCard>
          <ChartCard className="lg:col-span-2" icon={Activity} eyebrow="Precisión" title="Acierto por categoría">
            <CategoryAccuracy finished={data.finished} />
          </ChartCard>
          <ChartCard icon={TriangleAlert} eyebrow="Integridad" title="Incidencias por tipo" delay={0.05}>
            <IncidentsByType interviews={interviews} />
          </ChartCard>
        </div>
      )}
    </Page>
  )
}

/* ---------------------------------------------------------------- */
/* Contenedor de gráfico                                             */
/* ---------------------------------------------------------------- */

function ChartCard({
  icon: Icon,
  eyebrow,
  title,
  meta,
  className,
  delay = 0,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  eyebrow: string
  title: string
  meta?: string
  className?: string
  delay?: number
  children: React.ReactNode
}) {
  return (
    <AnimatedContent className={className} delay={delay}>
      <section className="panel h-full p-4 sm:p-5">
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="label-caps flex items-center gap-2">
              <Icon className="size-3.5 text-blue-300" />
              {eyebrow}
            </div>
            <h2 className="mt-1 font-display text-lg font-semibold tracking-wide">{title}</h2>
          </div>
          {meta && <span className="tabular pt-1 font-mono text-[10.5px] tracking-[0.12em] text-dim">{meta.toUpperCase()}</span>}
        </header>
        {children}
      </section>
    </AnimatedContent>
  )
}

function Tip({ title, rows }: { title: string; rows: [string, React.ReactNode][] }) {
  return (
    <div className="min-w-32">
      <div className="mb-1 font-mono text-[10.5px] tracking-[0.12em] text-muted">{title}</div>
      {rows.map(([k, v]) => (
        <div key={k} className="flex items-center justify-between gap-4 text-xs">
          <span className="text-muted">{k}</span>
          <span className="tabular font-semibold text-fg">{v}</span>
        </div>
      ))}
    </div>
  )
}

function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
      {items.map((it) => (
        <li key={it.label} className="flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.1em] text-muted">
          <span className="size-2 rounded-sm" style={{ background: it.color }} />
          {it.label}
        </li>
      ))}
    </ul>
  )
}

/* ---------------------------------------------------------------- */
/* 1 · Histograma de puntuaciones                                    */
/* ---------------------------------------------------------------- */

function ScoreHistogram({ scores }: { scores: number[] }) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const titleId = useId()
  const H = 220
  const m = { t: 16, r: 8, b: 26, l: 28 }
  const bins = useMemo(() => {
    const b = Array.from({ length: 10 }, (_, i) => ({ from: i * 10, to: i * 10 + 10, n: 0 }))
    for (const s of scores) b[Math.min(9, Math.floor(s / 10))].n++
    return b
  }, [scores])
  const max = Math.max(1, ...bins.map((b) => b.n))
  const yMax = Math.max(2, Math.ceil(max))
  const iw = Math.max(0, w - m.l - m.r)
  const ih = H - m.t - m.b
  const bw = iw / bins.length
  const y = (v: number) => m.t + ih - (v / yMax) * ih
  const ticks = Array.from({ length: yMax + 1 }, (_, i) => i).filter((t) => yMax <= 5 || t % Math.ceil(yMax / 4) === 0)
  const passX = m.l + (PASS_MARK / 100) * iw

  return (
    <div ref={ref} className="relative">
      {w > 0 && (
        <motion.svg width={w} height={H} role="img" aria-labelledby={titleId} {...inViewProps} className="block overflow-visible">
          <title id={titleId}>
            {`Histograma de puntuaciones finales en tramos de 10 puntos. ${bins
              .filter((b) => b.n)
              .map((b) => `${b.from}–${b.to}: ${b.n}`)
              .join('; ')}`}
          </title>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={m.l} x2={w - m.r} y1={y(t)} y2={y(t)} stroke={t === 0 ? C.axis : C.grid} />
              <text x={m.l - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={10} fill={C.label} className="tabular font-mono">
                {t}
              </text>
            </g>
          ))}
          {bins.map((b, i) => {
            const x = m.l + i * bw
            const h = (b.n / yMax) * ih
            const color = scoreColor(b.from)
            return (
              <g key={b.from}>
                {b.n > 0 && (
                  <motion.path
                    custom={i}
                    variants={growY}
                    style={{ transformBox: 'fill-box', transformOrigin: 'bottom' }}
                    d={roundedTopBar(x + 2, y(b.n), Math.max(1, bw - 4), h, Math.min(4, (bw - 4) / 2))}
                    fill={color}
                    fillOpacity={0.85}
                  />
                )}
                {b.n > 0 && (
                  <motion.text custom={i} variants={fadeIn(0.25 + i * STAGGER.fast)} x={x + bw / 2} y={y(b.n) - 6} textAnchor="middle" fontSize={11} fill="#e6ecf5" className="tabular font-mono">
                    {b.n}
                  </motion.text>
                )}
                {(w > 420 || i % 2 === 0) && (
                  <text x={x + bw / 2} y={H - 8} textAnchor="middle" fontSize={10} fill={C.label} className="tabular font-mono">
                    {b.from}
                  </text>
                )}
                <Tooltip
                  side="top"
                  content={<Tip title={`TRAMO ${b.from}–${b.to}`} rows={[['Entrevistas', b.n], ['Proporción', `${scores.length ? Math.round((b.n / scores.length) * 100) : 0}%`]]} />}
                >
                  <rect
                    x={x}
                    y={m.t}
                    width={bw}
                    height={ih}
                    fill="transparent"
                    tabIndex={0}
                    aria-label={`Tramo ${b.from} a ${b.to}: ${b.n} entrevistas`}
                    className="cursor-default outline-none hover:fill-white/[0.03] focus-visible:fill-white/[0.05]"
                  />
                </Tooltip>
              </g>
            )
          })}
          {/* Nota de corte */}
          <motion.g variants={fadeIn(0.35)} pointerEvents="none">
            <line x1={passX} x2={passX} y1={m.t - 6} y2={m.t + ih} stroke={C.ok} strokeDasharray="3 4" strokeOpacity={0.7} />
            <text x={passX + 5} y={m.t - 2} fontSize={9.5} fill={C.label} className="font-mono tracking-wider">
              CORTE {PASS_MARK}
            </text>
          </motion.g>
        </motion.svg>
      )}
      {w === 0 && <div style={{ height: H }} />}
      <Legend
        items={[
          { label: `APTO ≥ ${PASS_MARK}`, color: C.ok },
          { label: `REVISIÓN ${REVIEW_MARK}–${PASS_MARK - 1}`, color: C.warn },
          { label: `NO APTO < ${REVIEW_MARK}`, color: C.danger },
        ]}
      />
    </div>
  )
}

/** Barra con esquinas superiores redondeadas anclada a la base */
function roundedTopBar(x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, h, w / 2))
  return `M${x},${y + h} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h} Z`
}

/* ---------------------------------------------------------------- */
/* 2 · Donut de resultados                                           */
/* ---------------------------------------------------------------- */

function ResultsDonut({ finished }: { finished: Interview[] }) {
  const titleId = useId()
  const [hover, setHover] = useState<ResultLabel | null>(null)
  const total = finished.length
  const segs = useMemo(() => {
    let acc = 0
    return RESULT_ORDER.map((r) => {
      const n = finished.filter((i) => i.result === r).length
      const frac = total ? n / total : 0
      const s = { r, n, frac, start: acc }
      acc += frac
      return s
    })
  }, [finished, total])

  const size = 200
  const R = 76
  const stroke = 18
  const gap = segs.filter((s) => s.n > 0).length > 1 ? 0.012 : 0
  const active = hover ? segs.find((s) => s.r === hover)! : null

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <motion.svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-labelledby={titleId} {...inViewProps}>
          <title id={titleId}>{`Resultados: ${segs.map((s) => `${RESULT_META[s.r].label} ${s.n}`).join(', ')} de ${total} entrevistas finalizadas.`}</title>
          <circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke="rgb(148 163 184 / 0.08)" strokeWidth={stroke} />
          {segs.map((s, i) =>
            s.n > 0 ? (
              <motion.circle
                key={s.r}
                cx={size / 2}
                cy={size / 2}
                r={R}
                fill="none"
                stroke={RESULT_COLOR[s.r]}
                strokeWidth={hover === s.r ? stroke + 4 : stroke}
                strokeLinecap="butt"
                transform={`rotate(${-90 + s.start * 360} ${size / 2} ${size / 2})`}
                variants={{
                  hidden: { pathLength: 0 },
                  show: {
                    pathLength: Math.max(0.001, s.frac - gap),
                    transition: { duration: DURATION.counter, ease: EASE.out, delay: i * 0.15 },
                  },
                }}
                strokeOpacity={hover && hover !== s.r ? 0.35 : 1}
                style={{ transition: 'stroke-width 140ms ease-out, stroke-opacity 140ms ease-out' }}
                onPointerEnter={() => setHover(s.r)}
                onPointerLeave={() => setHover(null)}
                className="cursor-default"
              />
            ) : null,
          )}
        </motion.svg>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center" aria-live="polite">
          <div>
            <div className="font-display text-4xl font-bold leading-none">
              <CountUp value={active ? active.n : total} />
            </div>
            <div className="label-caps mt-1.5 !text-[9.5px]">{active ? RESULT_META[active.r].label : 'Finalizadas'}</div>
            {active && <div className="tabular mt-0.5 font-mono text-[11px] text-muted">{Math.round(active.frac * 100)}%</div>}
          </div>
        </div>
      </div>

      <ul className="mt-4 w-full space-y-1">
        {segs.map((s) => (
          <li key={s.r}>
            <button
              type="button"
              onPointerEnter={() => setHover(s.r)}
              onPointerLeave={() => setHover(null)}
              onFocus={() => setHover(s.r)}
              onBlur={() => setHover(null)}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left transition-colors duration-150',
                hover === s.r ? 'bg-white/[0.05]' : 'hover:bg-white/[0.03]',
              )}
            >
              <span className="size-2.5 rounded-sm" style={{ background: RESULT_COLOR[s.r] }} />
              <span className="font-mono text-[11px] tracking-[0.12em] text-fg">{RESULT_META[s.r].label}</span>
              <span className="tabular ml-auto font-mono text-[11px] text-muted">
                {s.n} <span className="text-dim">· {Math.round(s.frac * 100)}%</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ---------------------------------------------------------------- */
/* 3 · Tendencia de puntuaciones (línea + área)                      */
/* ---------------------------------------------------------------- */

function ScoreTrend({ finished, nameOf }: { finished: (Interview & { score: number; result: ResultLabel })[]; nameOf: (id: string) => string }) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const titleId = useId()
  const gradId = useId()
  const [hi, setHi] = useState<number | null>(null)
  const H = 240
  const m = { t: 18, r: 16, b: 28, l: 32 }
  const iw = Math.max(0, w - m.l - m.r)
  const ih = H - m.t - m.b
  const n = finished.length
  const x = (i: number) => m.l + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw)
  const y = (v: number) => m.t + ih - (v / 100) * ih
  const pts = finished.map((iv, i) => [x(i), y(iv.score)] as const)
  const line = pts.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)},${py.toFixed(1)}`).join(' ')
  const area = n ? `${line} L${pts[n - 1][0].toFixed(1)},${m.t + ih} L${pts[0][0].toFixed(1)},${m.t + ih} Z` : ''
  const labelEvery = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(iw / 70))))
  const band = n <= 1 ? iw : iw / (n - 1)

  return (
    <div ref={ref} className="relative">
      {w > 0 && (
        <motion.svg width={w} height={H} role="img" aria-labelledby={titleId} {...inViewProps} className="block overflow-visible" onPointerLeave={() => setHi(null)}>
          <title id={titleId}>{`Puntuación de las ${n} entrevistas finalizadas en orden cronológico: ${finished.map((iv) => `${nameOf(iv.candidateId)} ${iv.score}`).join(', ')}.`}</title>
          <defs>
            <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={C.cyan} stopOpacity={0.28} />
              <stop offset="100%" stopColor={C.cyan} stopOpacity={0} />
            </linearGradient>
          </defs>
          {[0, 25, 50, 75, 100].map((t) => (
            <g key={t}>
              <line x1={m.l} x2={w - m.r} y1={y(t)} y2={y(t)} stroke={t === 0 ? C.axis : C.grid} />
              <text x={m.l - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={10} fill={C.label} className="tabular font-mono">
                {t}
              </text>
            </g>
          ))}
          {/* Umbrales */}
          {[
            { v: PASS_MARK, c: C.ok, l: 'APTO' },
            { v: REVIEW_MARK, c: C.warn, l: 'REVISIÓN' },
          ].map((t) => (
            <motion.g key={t.v} variants={fadeIn(0.2)} pointerEvents="none">
              <line x1={m.l} x2={w - m.r} y1={y(t.v)} y2={y(t.v)} stroke={t.c} strokeOpacity={0.55} strokeDasharray="3 4" />
              <text x={w - m.r} y={y(t.v) - 5} textAnchor="end" fontSize={9.5} fill={C.label} className="font-mono tracking-wider">
                {t.l} {t.v}
              </text>
            </motion.g>
          ))}
          <motion.path d={area} fill={`url(#${gradId})`} variants={fadeIn(0.5)} />
          <motion.path
            d={line}
            fill="none"
            stroke={C.cyan}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            variants={{ hidden: { pathLength: 0 }, show: { pathLength: 1, transition: { duration: DURATION.counter * 1.4, ease: EASE.inOut } } }}
          />
          {hi != null && (
            <line x1={pts[hi][0]} x2={pts[hi][0]} y1={m.t} y2={m.t + ih} stroke="rgb(148 163 184 / 0.35)" pointerEvents="none" />
          )}
          {finished.map((iv, i) => {
            const [px, py] = pts[i]
            return (
              <g key={iv.id}>
                <motion.circle
                  cx={px}
                  cy={py}
                  r={hi === i ? 6 : 4.5}
                  fill={scoreColor(iv.score)}
                  stroke={C.surface}
                  strokeWidth={2}
                  style={{ transformBox: 'fill-box', transformOrigin: 'center', transition: 'r 140ms ease-out' }}
                  variants={{
                    hidden: { scale: 0, opacity: 0 },
                    show: { scale: 1, opacity: 1, transition: { ...DEFAULT_TRANSITION, delay: 0.3 + (i / Math.max(1, n)) * DURATION.counter * 1.2 } },
                  }}
                  pointerEvents="none"
                />
                {i % labelEvery === 0 && (
                  <text x={px} y={H - 8} textAnchor="middle" fontSize={10} fill={C.label} className="tabular font-mono">
                    {shortDate.format(iv.finishedAt ?? iv.createdAt)}
                  </text>
                )}
                <Tooltip
                  side="top"
                  content={
                    <Tip
                      title={nameOf(iv.candidateId).toUpperCase()}
                      rows={[
                        ['Puntuación', `${iv.score}/100`],
                        ['Resultado', RESULT_META[iv.result].label],
                        ['Fecha', shortDate.format(iv.finishedAt ?? iv.createdAt)],
                      ]}
                    />
                  }
                >
                  <rect
                    x={px - band / 2}
                    y={m.t}
                    width={band}
                    height={ih}
                    fill="transparent"
                    tabIndex={0}
                    aria-label={`${nameOf(iv.candidateId)}: ${iv.score} puntos, ${RESULT_META[iv.result].label}`}
                    onPointerEnter={() => setHi(i)}
                    onFocus={() => setHi(i)}
                    onBlur={() => setHi(null)}
                    className="cursor-default outline-none"
                  />
                </Tooltip>
              </g>
            )
          })}
        </motion.svg>
      )}
      {w === 0 && <div style={{ height: H }} />}
      {/* Acceso directo al detalle */}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {finished.slice(-6).map((iv) => (
          <Link
            key={iv.id}
            to={`/entrevistas/${iv.id}/resultado`}
            className="inline-flex h-6 items-center gap-1.5 rounded-md border border-line-strong px-2 font-mono text-[10.5px] text-muted transition-colors duration-150 hover:border-blue-400/40 hover:text-fg"
          >
            <span className="size-1.5 rounded-full" style={{ background: scoreColor(iv.score) }} />
            {nameOf(iv.candidateId)} · <span className="tabular text-fg">{iv.score}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- */
/* 4 · Acierto por categoría (barras horizontales apiladas)          */
/* ---------------------------------------------------------------- */

function CategoryAccuracy({ finished }: { finished: Interview[] }) {
  const titleId = useId()
  const rows = useMemo(() => {
    const acc = new Map<Question['category'], Record<Verdict, number>>()
    for (const iv of finished) {
      for (const [qid, v] of Object.entries(iv.evaluations)) {
        const q = questionById(qid)
        if (!q) continue
        const r = acc.get(q.category) ?? { correct: 0, partial: 0, incorrect: 0 }
        r[v]++
        acc.set(q.category, r)
      }
    }
    return [...acc.entries()]
      .map(([cat, r]) => {
        const n = r.correct + r.partial + r.incorrect
        return { cat, ...r, n, pct: n ? ((r.correct + r.partial * 0.5) / n) * 100 : 0 }
      })
      .sort((a, b) => b.pct - a.pct)
  }, [finished])

  if (!rows.length) return <p className="py-8 text-center font-mono text-xs text-dim">SIN EVALUACIONES REGISTRADAS</p>

  return (
    <motion.div role="img" aria-labelledby={titleId} {...inViewProps}>
      <span id={titleId} className="sr-only">
        {`Precisión por categoría: ${rows.map((r) => `${QUESTION_CATEGORY_LABEL[r.cat]} ${Math.round(r.pct)}%`).join(', ')}.`}
      </span>
      <ul className="space-y-3">
        {rows.map((r, i) => (
          <li key={r.cat}>
            <Tooltip
              side="top"
              content={
                <Tip
                  title={QUESTION_CATEGORY_LABEL[r.cat].toUpperCase()}
                  rows={[
                    ['Correctas', r.correct],
                    ['Parciales', r.partial],
                    ['Incorrectas', r.incorrect],
                    ['Precisión', `${Math.round(r.pct)}%`],
                  ]}
                />
              }
            >
              <div tabIndex={0} className="group grid grid-cols-[minmax(0,120px)_1fr_48px] items-center gap-3 rounded-md outline-none sm:grid-cols-[150px_1fr_52px]">
                <span className="truncate text-[13px] text-muted transition-colors group-hover:text-fg">{QUESTION_CATEGORY_LABEL[r.cat]}</span>
                <div className="flex h-3 gap-[2px] overflow-hidden rounded-[4px] bg-white/[0.04]">
                  {(['correct', 'partial', 'incorrect'] as Verdict[]).map((v) =>
                    r[v] ? (
                      <motion.span
                        key={v}
                        custom={i}
                        variants={growX}
                        style={{ flexGrow: r[v], transformOrigin: 'left', background: v === 'correct' ? C.ok : v === 'partial' ? C.warn : C.danger }}
                        className="h-full basis-0 opacity-85 transition-opacity group-hover:opacity-100"
                      />
                    ) : null,
                  )}
                </div>
                <span className="tabular text-right font-mono text-[12px] font-semibold text-fg">{Math.round(r.pct)}%</span>
              </div>
            </Tooltip>
          </li>
        ))}
      </ul>
      <Legend
        items={[
          { label: 'CORRECTA', color: C.ok },
          { label: 'PARCIAL', color: C.warn },
          { label: 'INCORRECTA', color: C.danger },
        ]}
      />
    </motion.div>
  )
}

/* ---------------------------------------------------------------- */
/* 5 · Incidencias por tipo                                          */
/* ---------------------------------------------------------------- */

function IncidentsByType({ interviews }: { interviews: Interview[] }) {
  const titleId = useId()
  const rows = useMemo(() => {
    const types = Object.keys(INCIDENT_LABEL) as IncidentType[]
    const m = new Map(types.map((t) => [t, { n: 0, critical: 0 }]))
    for (const iv of interviews)
      for (const inc of iv.incidents) {
        const r = m.get(inc.type)!
        r.n++
        if (inc.critical) r.critical++
      }
    return types.map((t) => ({ type: t, ...m.get(t)! })).sort((a, b) => b.n - a.n)
  }, [interviews])
  const total = rows.reduce((s, r) => s + r.n, 0)
  const max = Math.max(1, ...rows.map((r) => r.n))

  return (
    <motion.div role="img" aria-labelledby={titleId} {...inViewProps}>
      <span id={titleId} className="sr-only">{`Incidencias por tipo: ${rows.map((r) => `${INCIDENT_LABEL[r.type]} ${r.n}`).join(', ')}.`}</span>
      <div className="mb-4 flex items-baseline gap-2">
        <span className="font-display text-3xl font-bold leading-none">
          <CountUp value={total} />
        </span>
        <span className="label-caps !text-[10px]">incidencias totales</span>
      </div>
      <ul className="space-y-3.5">
        {rows.map((r, i) => (
          <li key={r.type}>
            <Tooltip side="top" content={<Tip title={INCIDENT_LABEL[r.type]} rows={[['Total', r.n], ['Críticas', r.critical], ['Leves', r.n - r.critical]]} />}>
              <div tabIndex={0} className="group rounded-md outline-none">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="truncate font-mono text-[10.5px] tracking-[0.1em] text-muted group-hover:text-fg">{INCIDENT_LABEL[r.type]}</span>
                  <span className="tabular font-mono text-[12px] font-semibold text-fg">{r.n}</span>
                </div>
                <div className="flex h-2 overflow-hidden rounded-[4px] bg-white/[0.04]">
                  <motion.span custom={i} variants={growX} className="flex h-full gap-[2px]" style={{ width: `${(r.n / max) * 100}%`, transformOrigin: 'left' }}>
                    {r.n - r.critical > 0 && <span className="h-full rounded-[2px]" style={{ flexGrow: r.n - r.critical, background: C.warn }} />}
                    {r.critical > 0 && <span className="h-full rounded-[2px]" style={{ flexGrow: r.critical, background: C.danger }} />}
                  </motion.span>
                </div>
              </div>
            </Tooltip>
          </li>
        ))}
      </ul>
      <Legend
        items={[
          { label: 'LEVE', color: C.warn },
          { label: 'CRÍTICA', color: C.danger },
        ]}
      />
      <p className="mt-3 text-[11px] leading-relaxed text-dim">
        Las incidencias penalizan la nota final: <span className="text-muted">−2</span> leve, <span className="text-muted">−5</span> crítica.
      </p>
    </motion.div>
  )
}
