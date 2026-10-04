/**
 * Candidatos: registro filtrable con estado, última entrevista y acciones.
 * - Chips de estado con píldora activa compartida (layoutId).
 * - Filas escalonadas sólo en el primer montaje; al filtrar, re-layout suave.
 * - ?focus=<id> (desde la paleta de comandos) desplaza y destella la fila.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import { CalendarPlus, FileCheck, Search, SearchX, UserPlus, Users, X } from 'lucide-react'
import { Page, PageHeader } from '@/components/app/PageHeader'
import { CandidateStatusBadge, InterviewStatusBadge, ResultBadge } from '@/components/app/StatusBadge'
import { EmptyState } from '@/components/app/EmptyState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Kbd } from '@/components/ui/kbd'
import { toast } from '@/components/feedback/toast-store'
import { useApp } from '@/store/app-store'
import type { Candidate, CandidateStatus, Interview } from '@/data/types'
import {
  DEFAULT_TRANSITION,
  EXIT_TRANSITION,
  FAST_TRANSITION,
  INDICATOR_SPRING,
  STAGGER,
  enterVariants,
  flashBorder,
} from '@/lib/animations'
import { cn, normalize } from '@/lib/utils'

type Filter = 'all' | CandidateStatus

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'pendiente', label: 'Pendientes' },
  { id: 'en_entrevista', label: 'En entrevista' },
  { id: 'apto', label: 'Aptos' },
  { id: 'revision', label: 'Revisión' },
  { id: 'no_apto', label: 'No aptos' },
]

const MAX_STAGGERED = 10
const LOADING_MS = 300

const dateFmt = new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short' })
const relFmt = new Intl.RelativeTimeFormat('es-ES', { numeric: 'auto' })

function relative(t: number) {
  const diff = t - Date.now()
  const hours = Math.round(diff / 3_600_000)
  if (Math.abs(hours) < 24) return relFmt.format(hours, 'hour')
  return relFmt.format(Math.round(hours / 24), 'day')
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')

interface CandidateRowData {
  candidate: Candidate
  latest?: Interview
  lastFinished?: Interview
  active?: Interview
}

export default function Candidates() {
  const candidates = useApp((s) => s.candidates)
  const interviews = useApp((s) => s.interviews)
  const createInterview = useApp((s) => s.createInterview)
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const focusId = params.get('focus')

  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [flash, setFlash] = useState<{ id: string; n: number } | null>(null)
  const firstRender = useRef(true)
  const rowRefs = useRef(new Map<string, HTMLElement>())
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const t = window.setTimeout(() => setLoading(false), LOADING_MS)
    return () => window.clearTimeout(t)
  }, [])

  // Tras la primera tanda escalonada, las filas nuevas entran sin retardo
  useEffect(() => {
    if (loading) return
    const t = window.setTimeout(() => (firstRender.current = false), 800)
    return () => window.clearTimeout(t)
  }, [loading])

  // Atajo "/" para buscar
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(el.tagName) && !el.isContentEditable) {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const rows = useMemo<CandidateRowData[]>(() => {
    const byCandidate = new Map<string, Interview[]>()
    for (const iv of interviews) {
      const list = byCandidate.get(iv.candidateId) ?? []
      list.push(iv)
      byCandidate.set(iv.candidateId, list)
    }
    return [...candidates]
      .sort((a, b) => b.appliedAt - a.appliedAt)
      .map((candidate) => {
        const ivs = (byCandidate.get(candidate.id) ?? []).sort((a, b) => b.createdAt - a.createdAt)
        return {
          candidate,
          latest: ivs[0],
          lastFinished: ivs.find((i) => i.status === 'finished'),
          active: ivs.find((i) => i.status !== 'finished'),
        }
      })
  }, [candidates, interviews])

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: rows.length, pendiente: 0, en_entrevista: 0, apto: 0, no_apto: 0, revision: 0 }
    for (const r of rows) c[r.candidate.status]++
    return c
  }, [rows])

  const visible = useMemo(() => {
    const q = normalize(query.trim())
    return rows.filter(({ candidate: c }) => {
      if (filter !== 'all' && c.status !== filter) return false
      if (!q) return true
      return normalize(`${c.name} ${c.citizenId} ${c.discord}`).includes(q)
    })
  }, [rows, filter, query])

  // ?focus=<id>: limpia filtros, desplaza y destella la fila
  useEffect(() => {
    if (loading || !focusId) return
    if (!candidates.some((c) => c.id === focusId)) return
    setFilter('all')
    setQuery('')
    requestAnimationFrame(() => {
      const el = rowRefs.current.get(focusId)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setFlash((f) => ({ id: focusId, n: (f?.n ?? 0) + 1 }))
      el?.focus({ preventScroll: true })
    })
    const next = new URLSearchParams(params)
    next.delete('focus')
    setParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId, loading])

  const schedule = (c: Candidate) => {
    const iv = createInterview(c.id)
    toast.success('ENTREVISTA CREADA', `${c.name} · código ${iv.code}`)
    navigate(`/entrevistas/${iv.id}`)
  }

  return (
    <Page>
      <PageHeader
        eyebrow="Registro · Reclutamiento"
        title="Candidatos"
        description="Aspirantes registrados, su estado en el proceso y el resultado de su última entrevista."
        actions={
          <Button variant="primary" onClick={() => setDialogOpen(true)}>
            <UserPlus /> NUEVO CANDIDATO
          </Button>
        }
      />

      {/* Barra de filtros */}
      <div className="mt-7 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <LayoutGroup id="cand-filters">
          <div role="tablist" aria-label="Filtrar por estado" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 lg:pb-0">
            {FILTERS.map((f) => {
              const active = filter === f.id
              return (
                <button
                  key={f.id}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilter(f.id)}
                  className={cn(
                    'relative flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 font-mono text-[11px] font-medium uppercase tracking-[0.12em] transition-colors duration-150',
                    active ? 'text-fg' : 'text-muted hover:bg-white/[0.03] hover:text-fg',
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="cand-filter-pill"
                      transition={INDICATOR_SPRING}
                      className="absolute inset-0 rounded-lg border border-blue-400/35 bg-blue-500/[0.12] shadow-[0_0_18px_-6px_rgb(59_130_246/0.7)]"
                    />
                  )}
                  <span className="relative">{f.label}</span>
                  <span className={cn('tabular relative rounded px-1 text-[10px]', active ? 'bg-blue-400/20 text-blue-200' : 'bg-white/[0.05] text-dim')}>
                    {counts[f.id]}
                  </span>
                </button>
              )
            })}
          </div>
        </LayoutGroup>

        <div className="relative w-full lg:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-dim" />
          <Input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar nombre, DNI o Discord…"
            aria-label="Buscar candidatos"
            className="pl-9 pr-16"
          />
          <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
            <AnimatePresence initial={false} mode="popLayout">
              {query ? (
                <motion.button
                  key="clear"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={FAST_TRANSITION}
                  onClick={() => setQuery('')}
                  className="rounded p-1 text-muted hover:bg-white/5 hover:text-fg"
                  aria-label="Limpiar búsqueda"
                >
                  <X className="size-3.5" />
                </motion.button>
              ) : (
                <motion.span key="kbd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={FAST_TRANSITION}>
                  <Kbd>/</Kbd>
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Lista */}
      <section className="panel mt-4 overflow-hidden" aria-label="Listado de candidatos">
        <div className="hidden grid-cols-[minmax(0,2.2fr)_minmax(0,1.3fr)_70px_minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1.3fr)_auto] items-center gap-4 border-b border-line px-5 py-3 lg:grid">
          {['Candidato', 'Discord', 'Edad', 'Solicitud', 'Estado', 'Última entrevista', 'Acciones'].map((h, i) => (
            <span key={h} className={cn('label-caps !text-[10px]', i === 6 && 'text-right')}>
              {h}
            </span>
          ))}
        </div>

        {loading ? (
          <LoadingRows />
        ) : visible.length === 0 ? (
          rows.length === 0 ? (
            <EmptyState
              icon={Users}
              title="SIN CANDIDATOS"
              description="Todavía no hay aspirantes registrados. Registra el primero para programar su entrevista."
              action={
                <Button variant="primary" size="sm" onClick={() => setDialogOpen(true)}>
                  <UserPlus /> NUEVO CANDIDATO
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={SearchX}
              title="SIN RESULTADOS"
              description="Ningún candidato coincide con el filtro o la búsqueda actual."
              action={
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setFilter('all')
                    setQuery('')
                  }}
                >
                  Limpiar filtros
                </Button>
              }
            />
          )
        ) : (
          <motion.ul layout className="divide-y divide-line">
            <AnimatePresence initial>
              {visible.map((row, i) => (
                <CandidateRow
                  key={row.candidate.id}
                  row={row}
                  index={i}
                  stagger={firstRender.current}
                  flashKey={flash?.id === row.candidate.id ? flash.n : 0}
                  registerRef={(el) => {
                    if (el) rowRefs.current.set(row.candidate.id, el)
                    else rowRefs.current.delete(row.candidate.id)
                  }}
                  onSchedule={() => schedule(row.candidate)}
                  onOpen={(id) => navigate(`/entrevistas/${id}`)}
                  onResult={(id) => navigate(`/entrevistas/${id}/resultado`)}
                />
              ))}
            </AnimatePresence>
          </motion.ul>
        )}
      </section>

      {!loading && visible.length > 0 && (
        <p className="tabular mt-3 font-mono text-[10.5px] tracking-[0.14em] text-dim">
          MOSTRANDO {visible.length} DE {rows.length} CANDIDATOS
        </p>
      )}

      <NewCandidateDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </Page>
  )
}

/* ---------------------------------------------------------------- */
/* Fila                                                              */
/* ---------------------------------------------------------------- */

function CandidateRow({
  row,
  index,
  stagger,
  flashKey,
  registerRef,
  onSchedule,
  onOpen,
  onResult,
}: {
  row: CandidateRowData
  index: number
  stagger: boolean
  flashKey: number
  registerRef: (el: HTMLLIElement | null) => void
  onSchedule: () => void
  onOpen: (id: string) => void
  onResult: (id: string) => void
}) {
  const { candidate: c, latest, lastFinished, active } = row
  const delay = stagger ? Math.min(index, MAX_STAGGERED) * STAGGER.fast : 0

  return (
    <motion.li
      ref={registerRef}
      tabIndex={-1}
      layout
      variants={enterVariants}
      initial="hidden"
      animate="show"
      exit={{ opacity: 0, scale: 0.985, transition: EXIT_TRANSITION }}
      transition={{ ...DEFAULT_TRANSITION, delay }}
      className="relative scroll-mt-24 outline-none focus-visible:bg-white/[0.02]"
    >
      {flashKey > 0 && (
        <motion.span
          key={flashKey}
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10 bg-sky-400/[0.06]"
          initial={{ opacity: 1 }}
          animate={{ ...flashBorder('realtime'), opacity: 0 }}
          transition={{ ...flashBorder('realtime').transition, repeat: 1 }}
        />
      )}

      <div className="group grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-3 px-4 py-4 transition-colors duration-150 hover:bg-white/[0.02] sm:px-5 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1.3fr)_70px_minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1.3fr)_auto] lg:items-center lg:gap-4 lg:py-3">
        {/* Identidad */}
        <div className="col-span-2 flex min-w-0 items-center gap-3 lg:col-span-1">
          <Avatar name={c.name} status={c.status} />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-fg">{c.name}</div>
            <div className="tabular font-mono text-[11px] text-dim">{c.citizenId}</div>
          </div>
          <div className="ml-auto lg:hidden">
            <CandidateStatusBadge status={c.status} />
          </div>
        </div>

        {/* Metadatos: en móvil, una rejilla compacta */}
        <dl className="col-span-2 grid grid-cols-3 gap-3 text-xs lg:contents">
          <Meta label="Discord" className="truncate font-mono text-[12px] text-muted">
            @{c.discord}
          </Meta>
          <Meta label="Edad" className="tabular text-muted">
            {c.age}
          </Meta>
          <Meta label="Solicitud" className="text-muted">
            <span className="tabular">{dateFmt.format(c.appliedAt)}</span>
            <span className="block text-[11px] text-dim">{relative(c.appliedAt)}</span>
          </Meta>
        </dl>

        <div className="hidden lg:block">
          <CandidateStatusBadge status={c.status} />
        </div>

        {/* Última entrevista */}
        <div className="col-span-2 flex min-w-0 items-center gap-2 lg:col-span-1">
          <span className="label-caps !text-[9.5px] lg:hidden">Última entrevista</span>
          <LatestInterview iv={latest} />
        </div>

        {/* Acciones */}
        <div className="col-span-2 flex flex-wrap items-center gap-2 lg:col-span-1 lg:justify-end">
          {lastFinished && (
            <Button size="sm" variant="ghost" onClick={() => onResult(lastFinished.id)} className="flex-1 sm:flex-none">
              <FileCheck /> Ver resultado
            </Button>
          )}
          {active ? (
            <Button size="sm" variant="outline" onClick={() => onOpen(active.id)} className="flex-1 sm:flex-none">
              <CalendarPlus /> Abrir entrevista
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={onSchedule} className="flex-1 sm:flex-none">
              <CalendarPlus /> Programar entrevista
            </Button>
          )}
        </div>
      </div>
    </motion.li>
  )
}

function Meta({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="label-caps mb-0.5 !text-[9.5px] lg:sr-only">{label}</dt>
      <dd className={className}>{children}</dd>
    </div>
  )
}

const AVATAR_TONE: Record<CandidateStatus, string> = {
  pendiente: 'from-slate-500/30 to-slate-700/20 text-slate-200 ring-slate-400/25',
  en_entrevista: 'from-sky-500/30 to-blue-700/20 text-sky-100 ring-sky-400/40',
  apto: 'from-emerald-500/30 to-emerald-800/20 text-emerald-100 ring-emerald-400/35',
  no_apto: 'from-red-500/30 to-red-800/20 text-red-100 ring-red-400/35',
  revision: 'from-amber-500/30 to-amber-800/20 text-amber-100 ring-amber-400/35',
}

function Avatar({ name, status }: { name: string; status: CandidateStatus }) {
  return (
    <span
      aria-hidden
      className={cn(
        'grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br font-display text-sm font-bold tracking-wider ring-1',
        AVATAR_TONE[status],
      )}
    >
      {initials(name)}
    </span>
  )
}

function LatestInterview({ iv }: { iv?: Interview }) {
  if (!iv) return <span className="font-mono text-[11px] tracking-[0.12em] text-dim">— SIN ENTREVISTAS</span>
  if (iv.status !== 'finished') return <InterviewStatusBadge status={iv.status} />
  const score = iv.score ?? 0
  const tone = iv.result === 'APTO' ? 'text-emerald-300' : iv.result === 'NO_APTO' ? 'text-red-300' : 'text-amber-300'
  return (
    <span className="flex items-center gap-2">
      <span className={cn('tabular font-display text-lg font-bold leading-none', tone)}>
        {score}
        <span className="ml-0.5 text-[11px] font-medium text-dim">/100</span>
      </span>
      <ResultBadge result={iv.result} />
    </span>
  )
}

function LoadingRows() {
  return (
    <ul className="divide-y divide-line" aria-busy="true" aria-label="Cargando candidatos">
      {Array.from({ length: 6 }).map((_, i) => (
        <li key={i} className="flex items-center gap-3 px-5 py-4 lg:py-3">
          <Skeleton className="size-10 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-40 max-w-[60%]" />
            <Skeleton className="h-2.5 w-20" />
          </div>
          <Skeleton className="hidden h-3 w-24 lg:block" />
          <Skeleton className="hidden h-6 w-24 lg:block" />
          <Skeleton className="h-8 w-28 rounded-lg" />
        </li>
      ))}
    </ul>
  )
}

/* ---------------------------------------------------------------- */
/* Alta de candidato                                                 */
/* ---------------------------------------------------------------- */

interface FormState {
  name: string
  citizenId: string
  age: string
  discord: string
}
type FormErrors = Partial<Record<keyof FormState, string>>

const EMPTY_FORM: FormState = { name: '', citizenId: '', age: '', discord: '' }

function validate(f: FormState, existingIds: string[]): FormErrors {
  const e: FormErrors = {}
  const name = f.name.trim()
  if (!name) e.name = 'El nombre es obligatorio.'
  else if (name.split(/\s+/).length < 2) e.name = 'Indica nombre y apellido.'
  else if (name.length > 48) e.name = 'Máximo 48 caracteres.'

  const id = f.citizenId.trim().toUpperCase()
  if (!id) e.citizenId = 'El DNI es obligatorio.'
  else if (!/^LS-\d{5}$/.test(id)) e.citizenId = 'Formato esperado: LS-12345.'
  else if (existingIds.includes(id)) e.citizenId = 'Ya existe un candidato con este DNI.'

  const age = Number(f.age)
  if (!f.age.trim()) e.age = 'La edad es obligatoria.'
  else if (!Number.isInteger(age)) e.age = 'Introduce un número entero.'
  else if (age < 18) e.age = 'Edad mínima: 18 años.'
  else if (age > 65) e.age = 'Edad máxima: 65 años.'

  const discord = f.discord.trim().replace(/^@/, '')
  if (!discord) e.discord = 'El usuario de Discord es obligatorio.'
  else if (!/^[\w.#]{2,32}$/.test(discord)) e.discord = 'Entre 2 y 32 caracteres, sin espacios.'
  return e
}

function NewCandidateDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const createCandidate = useApp((s) => s.createCandidate)
  const candidates = useApp((s) => s.candidates)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [touched, setTouched] = useState<Partial<Record<keyof FormState, boolean>>>({})
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)

  const existingIds = useMemo(() => candidates.map((c) => c.citizenId.toUpperCase()), [candidates])
  const errors = validate(form, existingIds)
  const valid = Object.keys(errors).length === 0
  const show = (k: keyof FormState) => (submitted || touched[k] ? errors[k] : undefined)

  useEffect(() => {
    if (!open) return
    setForm(EMPTY_FORM)
    setTouched({})
    setSubmitted(false)
    setSaving(false)
  }, [open])

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const blur = (k: keyof FormState) => () => setTouched((t) => ({ ...t, [k]: true }))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    if (!valid || saving) return
    setSaving(true)
    const c = createCandidate({
      name: form.name.trim().replace(/\s+/g, ' '),
      citizenId: form.citizenId.trim().toUpperCase(),
      age: Number(form.age),
      discord: form.discord.trim().replace(/^@/, ''),
    })
    toast.success('CANDIDATO REGISTRADO', `${c.name} · ${c.citizenId}`)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Nuevo candidato" description="Registra al aspirante para poder programar su entrevista.">
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field id="nc-name" label="Nombre y apellido" error={show('name')}>
          <Input id="nc-name" autoFocus autoComplete="off" placeholder="p. ej. Lucía Moreno" value={form.name} onChange={set('name')} onBlur={blur('name')} aria-invalid={!!show('name')} aria-describedby="nc-name-err" />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_120px]">
          <Field id="nc-cid" label="DNI ciudadano" error={show('citizenId')}>
            <Input id="nc-cid" autoComplete="off" placeholder="LS-12345" className="font-mono uppercase" value={form.citizenId} onChange={set('citizenId')} onBlur={blur('citizenId')} aria-invalid={!!show('citizenId')} aria-describedby="nc-cid-err" />
          </Field>
          <Field id="nc-age" label="Edad" error={show('age')}>
            <Input id="nc-age" inputMode="numeric" placeholder="18–65" className="tabular" value={form.age} onChange={set('age')} onBlur={blur('age')} aria-invalid={!!show('age')} aria-describedby="nc-age-err" />
          </Field>
        </div>
        <Field id="nc-discord" label="Discord" error={show('discord')}>
          <Input id="nc-discord" autoComplete="off" placeholder="usuario" className="font-mono" value={form.discord} onChange={set('discord')} onBlur={blur('discord')} aria-invalid={!!show('discord')} aria-describedby="nc-discord-err" />
        </Field>

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" loading={saving} disabled={submitted && !valid}>
            <UserPlus /> REGISTRAR CANDIDATO
          </Button>
        </div>
      </form>
    </Dialog>
  )
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className={cn('[&_input]:transition-[border-color,box-shadow]', error && '[&_input]:border-red-400/60 [&_input]:focus:shadow-[0_0_0_3px_rgb(239_68_68/0.15)]')}>
      <label htmlFor={id} className="label-caps mb-1.5 block">
        {label}
      </label>
      {children}
      <AnimatePresence initial={false}>
        {error && (
          <motion.p
            key="err"
            id={`${id}-err`}
            role="alert"
            initial={{ opacity: 0, height: 0, y: -4 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, transition: EXIT_TRANSITION }}
            transition={DEFAULT_TRANSITION}
            className="overflow-hidden"
          >
            <span className="block pt-1.5 text-xs text-red-300">{error}</span>
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}
