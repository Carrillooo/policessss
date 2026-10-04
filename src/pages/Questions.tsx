/**
 * Banco de preguntas: filtrable por categoría (tabs animadas) y búsqueda.
 * Cada pregunta muestra dificultad, puntos, artículos vinculados, puntos
 * clave desplegables y su precisión histórica en entrevistas finalizadas.
 * ?q=<questionId> abre, desplaza y destella esa pregunta.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import { BookOpen, ChevronDown, Library, Search, SearchX, X } from 'lucide-react'
import { Page, PageHeader } from '@/components/app/PageHeader'
import { EmptyState } from '@/components/app/EmptyState'
import { CountUp } from '@/components/reactbits'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Tooltip } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { QUESTIONS, QUESTION_CATEGORY_LABEL } from '@/data/questions'
import { articleById } from '@/data/normativa'
import { VERDICT_POINTS, type Question } from '@/data/types'
import { useApp } from '@/store/app-store'
import {
  DEFAULT_TRANSITION,
  EXIT_TRANSITION,
  FAST_TRANSITION,
  INDICATOR_SPRING,
  STAGGER,
  cardVariants,
  enterVariants,
  flashBorder,
  staggerContainer,
} from '@/lib/animations'
import { cn, normalize } from '@/lib/utils'

type Category = Question['category']
type Tab = 'all' | Category

const CATEGORIES = Object.keys(QUESTION_CATEGORY_LABEL) as Category[]
const MAX_STAGGERED = 10

interface Accuracy {
  pct: number
  n: number
}

export default function Questions() {
  const interviews = useApp((s) => s.interviews)
  const [params, setParams] = useSearchParams()
  const focusQ = params.get('q')

  const [tab, setTab] = useState<Tab>('all')
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<Set<string>>(() => new Set())
  const [flash, setFlash] = useState<{ id: string; n: number } | null>(null)
  const cardRefs = useRef(new Map<string, HTMLElement>())
  const firstRender = useRef(true)
  useEffect(() => {
    const t = window.setTimeout(() => (firstRender.current = false), 700)
    return () => window.clearTimeout(t)
  }, [])

  const counts = useMemo(() => {
    const c = Object.fromEntries(CATEGORIES.map((k) => [k, 0])) as Record<Category, number>
    for (const q of QUESTIONS) c[q.category]++
    return c
  }, [])

  /** Precisión histórica: media de VERDICT_POINTS en entrevistas finalizadas */
  const accuracy = useMemo(() => {
    const acc = new Map<string, { sum: number; n: number }>()
    for (const iv of interviews) {
      if (iv.status !== 'finished') continue
      for (const [qid, v] of Object.entries(iv.evaluations)) {
        const a = acc.get(qid) ?? { sum: 0, n: 0 }
        a.sum += VERDICT_POINTS[v]
        a.n++
        acc.set(qid, a)
      }
    }
    const out = new Map<string, Accuracy>()
    acc.forEach((a, id) => out.set(id, { pct: Math.round((a.sum / a.n) * 100), n: a.n }))
    return out
  }, [interviews])

  const visible = useMemo(() => {
    const q = normalize(query.trim())
    return QUESTIONS.filter((x) => {
      if (tab !== 'all' && x.category !== tab) return false
      if (!q) return true
      return normalize(`${x.id} ${x.text} ${x.expected.join(' ')} ${x.articles.join(' ')} ${QUESTION_CATEGORY_LABEL[x.category]}`).includes(q)
    })
  }, [tab, query])

  // ?q=<id>: limpia filtros, despliega, desplaza y destella
  useEffect(() => {
    if (!focusQ || !QUESTIONS.some((q) => q.id === focusQ)) return
    setTab('all')
    setQuery('')
    setOpen((o) => new Set(o).add(focusQ))
    window.setTimeout(() => {
      const el = cardRefs.current.get(focusQ)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el?.focus({ preventScroll: true })
      setFlash((f) => ({ id: focusQ, n: (f?.n ?? 0) + 1 }))
    }, 120)
    const next = new URLSearchParams(params)
    next.delete('q')
    // El destello sobrevive al borrado del parámetro (no se cancela en el cleanup)
    setParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusQ])

  const toggle = (id: string) =>
    setOpen((o) => {
      const n = new Set(o)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  const totalPoints = QUESTIONS.reduce((s, q) => s + q.points, 0)
  const evaluatedQs = accuracy.size

  return (
    <Page>
      <PageHeader
        eyebrow="Banco · Evaluación"
        title="Preguntas"
        description="Banco oficial de preguntas de entrevista con sus puntos clave, normativa vinculada y precisión histórica de los aspirantes."
      />

      {/* Cabecera de estadísticas */}
      <motion.div variants={staggerContainer(STAGGER.fast)} initial="hidden" animate="show" className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-[1.4fr_repeat(7,1fr)]">
        <motion.div variants={cardVariants} className="panel gradient-border col-span-2 flex items-end justify-between gap-4 p-4 sm:col-span-4 lg:col-span-1">
          <div>
            <div className="label-caps">Total preguntas</div>
            <div className="mt-2 font-display text-4xl font-bold leading-none">
              <CountUp value={QUESTIONS.length} />
            </div>
          </div>
          <div className="text-right font-mono text-[10.5px] leading-relaxed tracking-[0.12em] text-dim">
            <div>
              <CountUp value={totalPoints} className="text-muted" /> PTS
            </div>
            <div>
              <CountUp value={evaluatedQs} className="text-muted" /> CON HISTÓRICO
            </div>
          </div>
        </motion.div>
        {CATEGORIES.map((c) => (
          <motion.button
            key={c}
            variants={cardVariants}
            onClick={() => setTab((t) => (t === c ? 'all' : c))}
            aria-pressed={tab === c}
            className={cn(
              'panel group p-3 text-left transition-colors duration-150 hover:border-blue-400/30',
              tab === c && 'border-blue-400/40 bg-blue-500/[0.06]',
            )}
          >
            <div className="label-caps truncate !text-[9.5px] group-hover:text-fg">{QUESTION_CATEGORY_LABEL[c]}</div>
            <div className="mt-1.5 font-display text-2xl font-bold leading-none">
              <CountUp value={counts[c]} />
            </div>
          </motion.button>
        ))}
      </motion.div>

      {/* Tabs + búsqueda */}
      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <LayoutGroup id="q-tabs">
          <div role="tablist" aria-label="Categorías" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 lg:pb-0">
            {(['all', ...CATEGORIES] as Tab[]).map((t) => {
              const active = tab === t
              return (
                <button
                  key={t}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(t)}
                  className={cn(
                    'relative h-9 shrink-0 rounded-lg px-3 font-mono text-[11px] font-medium uppercase tracking-[0.12em] transition-colors duration-150',
                    active ? 'text-fg' : 'text-muted hover:bg-white/[0.03] hover:text-fg',
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="q-tab-pill"
                      transition={INDICATOR_SPRING}
                      className="absolute inset-0 rounded-lg border border-blue-400/35 bg-blue-500/[0.12] shadow-[0_0_18px_-6px_rgb(59_130_246/0.7)]"
                    />
                  )}
                  {active && (
                    <motion.span layoutId="q-tab-underline" transition={INDICATOR_SPRING} className="absolute inset-x-3 -bottom-px h-px bg-gradient-to-r from-transparent via-sky-300 to-transparent" />
                  )}
                  <span className="relative">{t === 'all' ? 'Todas' : QUESTION_CATEGORY_LABEL[t]}</span>
                </button>
              )
            })}
          </div>
        </LayoutGroup>
        <div className="relative w-full lg:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-dim" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar en preguntas, puntos clave, artículos…" aria-label="Buscar preguntas" className="pl-9 pr-9" />
          <AnimatePresence>
            {query && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={FAST_TRANSITION}
                onClick={() => setQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:bg-white/5 hover:text-fg"
                aria-label="Limpiar búsqueda"
              >
                <X className="size-3.5" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Listado */}
      {visible.length === 0 ? (
        <div className="panel mt-4">
          <EmptyState
            icon={SearchX}
            title="SIN COINCIDENCIAS"
            description="Ninguna pregunta coincide con la categoría o la búsqueda actual."
            action={
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setTab('all')
                  setQuery('')
                }}
              >
                Ver todas
              </Button>
            }
          />
        </div>
      ) : (
        <motion.ul layout className="mt-4 grid grid-cols-1 items-start gap-3 xl:grid-cols-2">
          <AnimatePresence initial>
            {visible.map((q, i) => (
              <QuestionCard
                key={q.id}
                q={q}
                index={i}
                stagger={firstRender.current}
                open={open.has(q.id)}
                onToggle={() => toggle(q.id)}
                accuracy={accuracy.get(q.id)}
                flashKey={flash?.id === q.id ? flash.n : 0}
                registerRef={(el) => {
                  if (el) cardRefs.current.set(q.id, el)
                  else cardRefs.current.delete(q.id)
                }}
              />
            ))}
          </AnimatePresence>
        </motion.ul>
      )}
    </Page>
  )
}

/* ---------------------------------------------------------------- */

function QuestionCard({
  q,
  index,
  stagger,
  open,
  onToggle,
  accuracy,
  flashKey,
  registerRef,
}: {
  q: Question
  index: number
  stagger: boolean
  open: boolean
  onToggle: () => void
  accuracy?: Accuracy
  flashKey: number
  registerRef: (el: HTMLLIElement | null) => void
}) {
  const panelId = `q-${q.id}-expected`
  const delay = stagger ? Math.min(index, MAX_STAGGERED) * STAGGER.fast : 0
  const tone = !accuracy ? 'brand' : accuracy.pct >= 70 ? 'ok' : accuracy.pct >= 45 ? 'warn' : 'danger'
  const toneText = { brand: 'text-muted', ok: 'text-emerald-300', warn: 'text-amber-300', danger: 'text-red-300' }[tone]

  return (
    <motion.li
      ref={registerRef}
      tabIndex={-1}
      layout="position"
      variants={enterVariants}
      initial="hidden"
      animate="show"
      exit={{ opacity: 0, scale: 0.985, transition: EXIT_TRANSITION }}
      transition={{ ...DEFAULT_TRANSITION, delay }}
      className="panel relative scroll-mt-24 overflow-hidden outline-none"
    >
      {flashKey > 0 && (
        <motion.span
          key={flashKey}
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] bg-sky-400/[0.05]"
          initial={{ opacity: 1 }}
          animate={{ ...flashBorder('realtime'), opacity: 0 }}
          transition={{ ...flashBorder('realtime').transition, repeat: 1 }}
        />
      )}

      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="tabular rounded border border-line-strong bg-white/[0.03] px-1.5 py-0.5 font-mono text-[10.5px] font-semibold tracking-[0.12em] text-blue-200">
            {q.id.toUpperCase()}
          </span>
          <span className="label-caps !text-[10px]">{QUESTION_CATEGORY_LABEL[q.category]}</span>
          <div className="ml-auto flex items-center gap-3">
            <Difficulty level={q.difficulty} />
            <span className="tabular font-mono text-[11px] text-muted">
              <span className="font-semibold text-gold">{q.points}</span> PTS
            </span>
          </div>
        </div>

        <p className="mt-3 text-[15px] font-medium leading-relaxed text-fg">{q.text}</p>

        {/* Artículos vinculados */}
        {q.articles.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {q.articles.map((id) => {
              const a = articleById(id)
              return (
                <Tooltip key={id} side="top" content={a ? a.title : 'Artículo no encontrado'}>
                  <Link
                    to={`/normativa/${id}`}
                    className="inline-flex h-6 items-center gap-1.5 rounded-md border border-blue-500/25 bg-blue-500/[0.07] px-2 font-mono text-[10.5px] tracking-[0.08em] text-blue-200 transition-colors duration-150 hover:border-blue-400/50 hover:bg-blue-500/[0.14]"
                  >
                    <BookOpen className="size-3" />
                    ART. {id}
                  </Link>
                </Tooltip>
              )
            })}
          </div>
        )}

        {/* Precisión histórica */}
        <div className="mt-4 flex items-center gap-3">
          <span className="label-caps shrink-0 !text-[9.5px]">Precisión histórica</span>
          <Progress
            value={accuracy?.pct ?? 0}
            tone={tone}
            className={cn('flex-1', !accuracy && 'opacity-40')}
            label={`Precisión histórica ${accuracy ? accuracy.pct + '%' : 'sin datos'}`}
          />
          <span className={cn('tabular w-[86px] shrink-0 text-right font-mono text-[11px]', toneText)}>
            {accuracy ? (
              <>
                {accuracy.pct}% <span className="text-dim">· {accuracy.n}</span>
              </>
            ) : (
              <span className="text-dim">SIN DATOS</span>
            )}
          </span>
        </div>
      </div>

      {/* Puntos clave */}
      <button
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center justify-between gap-3 border-t border-line px-4 py-2.5 text-left transition-colors duration-150 hover:bg-white/[0.025] sm:px-5"
      >
        <span className="label-caps flex items-center gap-2 !text-[10px]">
          <Library className="size-3.5" />
          Puntos clave esperados
          <span className="tabular rounded bg-white/[0.05] px-1 text-dim">{q.expected.length}</span>
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={DEFAULT_TRANSITION} className="text-muted">
          <ChevronDown className="size-4" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            key="expected"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0, transition: EXIT_TRANSITION }}
            transition={DEFAULT_TRANSITION}
            className="overflow-hidden"
          >
            <motion.ol variants={staggerContainer(STAGGER.fast, 0.04)} initial="hidden" animate="show" className="space-y-1.5 bg-black/20 px-4 pb-4 pt-3 sm:px-5">
              {q.expected.map((e, i) => (
                <motion.li key={i} variants={enterVariants} className="flex items-start gap-2.5 text-sm text-muted">
                  <span className="tabular mt-0.5 grid size-5 shrink-0 place-items-center rounded border border-emerald-400/30 bg-emerald-500/10 font-mono text-[10px] text-emerald-300">
                    {i + 1}
                  </span>
                  <span className="text-fg/90">{e}</span>
                </motion.li>
              ))}
            </motion.ol>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  )
}

const DIFF_LABEL = { 1: 'Básica', 2: 'Media', 3: 'Avanzada' } as const
const DIFF_COLOR = { 1: 'bg-emerald-400', 2: 'bg-amber-400', 3: 'bg-red-400' } as const

function Difficulty({ level }: { level: 1 | 2 | 3 }) {
  return (
    <span className="flex items-center gap-1.5" aria-label={`Dificultad ${DIFF_LABEL[level]} (${level} de 3)`} title={`Dificultad ${DIFF_LABEL[level]}`}>
      <span className="flex items-end gap-[3px]" aria-hidden>
        {[1, 2, 3].map((p) => (
          <span
            key={p}
            className={cn('w-1 rounded-sm', p <= level ? DIFF_COLOR[level] : 'bg-white/10')}
            style={{ height: 4 + p * 3 }}
          />
        ))}
      </span>
      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-dim">{DIFF_LABEL[level]}</span>
    </span>
  )
}
