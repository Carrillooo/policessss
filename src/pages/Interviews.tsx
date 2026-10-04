import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import { Check, Copy, ExternalLink, Mic, Plus, Radio, Search } from 'lucide-react'
import { Page, PageHeader } from '@/components/app/PageHeader'
import { InterviewStatusBadge, ResultBadge } from '@/components/app/StatusBadge'
import { EmptyState } from '@/components/app/EmptyState'
import { CountUp, SpotlightCard } from '@/components/reactbits'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { toast } from '@/components/feedback/toast-store'
import { INDICATOR_SPRING, DEFAULT_TRANSITION, EXIT_TRANSITION, FAST_TRANSITION } from '@/lib/animations'
import { useApp } from '@/store/app-store'
import { cn, formatClock, normalize, portalLink } from '@/lib/utils'
import type { InterviewStatus } from '@/data/types'

const FILTERS: { id: 'all' | InterviewStatus; label: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: 'live', label: 'En directo' },
  { id: 'waiting', label: 'En espera' },
  { id: 'scheduled', label: 'Programadas' },
  { id: 'finished', label: 'Finalizadas' },
]

function NewInterviewDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const candidates = useApp((s) => s.candidates)
  const createInterview = useApp((s) => s.createInterview)
  const navigate = useNavigate()
  const [candidateId, setCandidateId] = useState('')
  const [count, setCount] = useState(12)
  const [created, setCreated] = useState<{ id: string; code: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const eligible = candidates.filter((c) => c.status === 'pendiente' || c.status === 'revision')

  useEffect(() => {
    if (open) {
      setCreated(null)
      setCopied(false)
      setCandidateId(eligible[0]?.id ?? '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const create = () => {
    if (!candidateId) return
    const iv = createInterview(candidateId, count)
    setCreated({ id: iv.id, code: iv.code })
    toast.success('ENTREVISTA CREADA', `Código ${iv.code}`)
  }

  const copy = async () => {
    if (!created) return
    try {
      await navigator.clipboard.writeText(portalLink(created.code))
    } catch {
      /* el portapapeles puede no estar disponible */
    }
    setCopied(true)
    toast.info('LINK COPIADO', 'Envíalo al postulante')
    setTimeout(() => setCopied(false), 1600)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={created ? 'Entrevista creada' : 'Nueva entrevista'} description={created ? 'Comparte el enlace seguro con el postulante.' : 'Selecciona al postulante y el número de preguntas.'}>
      <AnimatePresence mode="wait" initial={false}>
        {!created ? (
          <motion.div key="form" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10, transition: EXIT_TRANSITION }} transition={DEFAULT_TRANSITION} className="space-y-5">
            <div>
              <label className="label-caps mb-2 block">Postulante</label>
              <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
                {eligible.length === 0 && <p className="text-sm text-muted">No hay postulantes pendientes.</p>}
                {eligible.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCandidateId(c.id)}
                    className={cn(
                      'relative flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors',
                      candidateId === c.id ? 'border-blue-400/50 bg-blue-500/10' : 'border-line hover:border-line-strong hover:bg-white/[0.02]',
                    )}
                  >
                    <span className="grid size-8 place-items-center rounded-md bg-white/[0.04] font-display font-bold">{c.name.split(' ').map((p) => p[0]).join('').slice(0, 2)}</span>
                    <span className="flex-1">
                      <span className="block font-medium">{c.name}</span>
                      <span className="font-mono text-[11px] text-dim">{c.citizenId}</span>
                    </span>
                    <AnimatePresence>
                      {candidateId === c.id && (
                        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={FAST_TRANSITION}>
                          <Check className="size-4 text-blue-300" />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-2 flex justify-between">
                <label className="label-caps" htmlFor="qcount">
                  Preguntas
                </label>
                <span className="font-display text-lg font-bold">
                  <CountUp value={count} duration={0.25} />
                </span>
              </div>
              <input id="qcount" type="range" min={6} max={18} value={count} onChange={(e) => setCount(+e.target.value)} className="w-full accent-blue-500" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button variant="primary" onClick={create} disabled={!candidateId}>
                <Plus /> Crear entrevista
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div key="done" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={DEFAULT_TRANSITION} className="space-y-5">
            <div className="rounded-xl border border-blue-400/25 bg-blue-500/[0.06] p-4">
              <div className="label-caps">Código de acceso</div>
              <div className="mt-1 font-mono text-2xl font-bold tracking-[0.2em] text-blue-200">{created.code}</div>
              <div className="mt-3 flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-md bg-black/30 px-2.5 py-1.5 font-mono text-xs text-muted">{portalLink(created.code)}</code>
                <Button size="sm" variant={copied ? 'success' : 'secondary'} onClick={copy}>
                  {copied ? <Check /> : <Copy />} {copied ? 'Copiado' : 'Copiar'}
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={() => window.open(portalLink(created.code), '_blank')}>
                <ExternalLink /> Abrir portal
              </Button>
              <Button variant="primary" onClick={() => navigate(`/entrevistas/${created.id}`)}>
                <Radio /> Ir a la sala
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Dialog>
  )
}

export default function Interviews() {
  const [params, setParams] = useSearchParams()
  const interviews = useApp((s) => s.interviews)
  const candidates = useApp((s) => s.candidates)
  const navigate = useNavigate()
  const filter = (params.get('estado') as (typeof FILTERS)[number]['id']) ?? 'all'
  const [query, setQuery] = useState('')
  const dialogOpen = params.get('nueva') === '1'

  const setDialog = (v: boolean) => {
    const p = new URLSearchParams(params)
    if (v) p.set('nueva', '1')
    else p.delete('nueva')
    setParams(p, { replace: true })
  }
  const setFilter = (f: string) => {
    const p = new URLSearchParams(params)
    if (f === 'all') p.delete('estado')
    else p.set('estado', f)
    setParams(p, { replace: true })
  }

  const order: Record<InterviewStatus, number> = { live: 0, waiting: 1, scheduled: 2, finished: 3 }
  const list = useMemo(
    () =>
      interviews
        .filter((i) => filter === 'all' || i.status === filter)
        .filter((i) => {
          if (!query) return true
          const c = candidates.find((x) => x.id === i.candidateId)
          return normalize(`${i.code} ${c?.name} ${i.interviewer}`).includes(normalize(query))
        })
        .sort((a, b) => order[a.status] - order[b.status] || b.createdAt - a.createdAt),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [interviews, candidates, filter, query],
  )
  const counts = useMemo(() => Object.fromEntries(FILTERS.map((f) => [f.id, f.id === 'all' ? interviews.length : interviews.filter((i) => i.status === f.id).length])), [interviews])

  return (
    <Page>
      <PageHeader
        eyebrow="Operaciones"
        title="Entrevistas"
        description="Programa, supervisa y evalúa entrevistas en tiempo real."
        actions={
          <Button variant="primary" onClick={() => setDialog(true)}>
            <Plus /> Nueva entrevista
          </Button>
        }
      />

      <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <LayoutGroup id="iv-filters">
          <div className="flex gap-1 overflow-x-auto rounded-xl border border-line bg-white/[0.02] p-1">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={cn('relative flex h-8 shrink-0 items-center gap-2 rounded-lg px-3 text-xs font-medium transition-colors', filter === f.id ? 'text-fg' : 'text-muted hover:text-fg')}
              >
                {filter === f.id && <motion.span layoutId="iv-filter" transition={INDICATOR_SPRING} className="absolute inset-0 rounded-lg border border-blue-400/25 bg-blue-500/[0.12]" />}
                <span className="relative">{f.label}</span>
                <span className="tabular relative font-mono text-[10px] text-dim">{counts[f.id]}</span>
              </button>
            ))}
          </div>
        </LayoutGroup>
        <div className="relative md:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-dim" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar código, candidato…" className="pl-9" />
        </div>
      </div>

      <motion.div layout className="mt-5 grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {list.map((iv, i) => {
            const c = candidates.find((x) => x.id === iv.candidateId)
            const evaluated = Object.keys(iv.evaluations).length
            return (
              <motion.div
                key={iv.id}
                layout
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97, transition: EXIT_TRANSITION }}
                transition={{ ...DEFAULT_TRANSITION, delay: Math.min(i, 8) * 0.035 }}
              >
                <SpotlightCard
                  spotlightColor={iv.status === 'live' ? '34 197 94' : '59 130 246'}
                  className={cn('h-full cursor-pointer p-5 transition-colors hover:border-line-strong', iv.status === 'live' && 'gradient-border')}
                  onClick={() => navigate(iv.status === 'finished' ? `/entrevistas/${iv.id}/resultado` : `/entrevistas/${iv.id}`)}
                  role="link"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(iv.status === 'finished' ? `/entrevistas/${iv.id}/resultado` : `/entrevistas/${iv.id}`)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{c?.name ?? 'Candidato'}</div>
                      <div className="mt-0.5 font-mono text-[11px] tracking-wider text-dim">
                        {iv.code} · {formatClock(iv.createdAt)}
                      </div>
                    </div>
                    <InterviewStatusBadge status={iv.status} />
                  </div>
                  <div className="mt-4 flex items-center justify-between text-xs text-muted">
                    <span>{iv.interviewer}</span>
                    {iv.status === 'finished' ? (
                      <span className="flex items-center gap-2">
                        <b className="font-display text-lg text-fg">{iv.score}</b>
                        <ResultBadge result={iv.result} />
                      </span>
                    ) : (
                      <span className="tabular font-mono">
                        {evaluated}/{iv.questionIds.length}
                      </span>
                    )}
                  </div>
                  {iv.status !== 'finished' && <Progress className="mt-3" value={evaluated} max={iv.questionIds.length} tone={iv.status === 'live' ? 'ok' : 'brand'} />}
                </SpotlightCard>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </motion.div>
      {list.length === 0 && <EmptyState icon={Mic} title="SIN ENTREVISTAS" description="No hay entrevistas que coincidan con el filtro." action={<Button variant="primary" onClick={() => setDialog(true)}><Plus /> Nueva entrevista</Button>} />}

      <NewInterviewDialog open={dialogOpen} onOpenChange={setDialog} />
    </Page>
  )
}
