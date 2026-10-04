/**
 * Command Palette (Ctrl/⌘ + K)
 * Busca en normativa, preguntas, candidatos, entrevistas, usuarios y acciones.
 * Filtrado propio (instantáneo, sin acentos) y resultados con entrada rápida.
 */
import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Command } from 'cmdk'
import * as D from '@radix-ui/react-dialog'
import { AnimatePresence, motion } from 'motion/react'
import {
  ArrowRight,
  BookOpen,
  CornerDownLeft,
  FileText,
  Gamepad2,
  ListChecks,
  Mic,
  Plus,
  Radio,
  Search,
  Shield,
  User,
  UserPlus,
  Users,
} from 'lucide-react'
import { modalVariants, overlayVariants, FAST_TRANSITION } from '@/lib/animations'
import { searchArticles } from '@/lib/search'
import { cn, normalize } from '@/lib/utils'
import { QUESTIONS, QUESTION_CATEGORY_LABEL } from '@/data/questions'
import { ARTICLES } from '@/data/normativa'
import { STAFF } from '@/data/staff'
import { useApp } from '@/store/app-store'
import { useUi } from '@/store/ui-store'
import { Kbd } from '@/components/ui/kbd'
import { PulseDot } from '@/components/feedback/LiveIndicator'
import { Highlight } from './Highlight'

type Item = {
  id: string
  group: string
  icon: React.ComponentType<{ className?: string }>
  title: React.ReactNode
  hint?: React.ReactNode
  meta?: React.ReactNode
  run: () => void
}

const matches = (q: string, ...fields: string[]) => {
  const n = normalize(q)
  return n.split(/\s+/).every((t) => fields.some((f) => normalize(f).includes(t)))
}

function ItemRow({ item, index }: { item: Item; index: number }) {
  const Icon = item.icon
  return (
    <Command.Item
      value={item.id}
      onSelect={item.run}
      className="group relative block cursor-pointer rounded-lg px-3 py-2.5 text-sm outline-none transition-colors duration-100 data-[selected=true]:bg-blue-500/[0.1]"
    >
      <motion.div
        className="flex items-start gap-3"
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...FAST_TRANSITION, delay: Math.min(index, 10) * 0.015 }}
      >
        <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-blue-400 opacity-0 transition-opacity group-data-[selected=true]:opacity-100" />
        <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-md border border-line bg-white/[0.03] text-muted group-data-[selected=true]:border-blue-400/30 group-data-[selected=true]:text-blue-300">
          <Icon className="size-3.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate font-medium text-fg">{item.title}</span>
            {item.meta}
          </span>
          {item.hint && <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-muted">{item.hint}</span>}
        </span>
        <ArrowRight className="mt-1.5 size-3.5 shrink-0 text-blue-300 opacity-0 transition-opacity group-data-[selected=true]:opacity-100" />
      </motion.div>
    </Command.Item>
  )
}

export function CommandPalette() {
  const open = useUi((s) => s.paletteOpen)
  const scope = useUi((s) => s.paletteScope)
  const setOpen = useUi((s) => s.setPaletteOpen)
  const navigate = useNavigate()
  const candidates = useApp((s) => s.candidates)
  const interviews = useApp((s) => s.interviews)
  const [query, setQuery] = useState('')
  const q = useDeferredValue(query)

  useEffect(() => {
    if (open) setQuery('')
  }, [open])

  const go = (to: string) => {
    setOpen(false)
    navigate(to)
  }

  const groups = useMemo(() => {
    const out: Record<string, Item[]> = {}
    const add = (i: Item) => (out[i.group] ??= []).push(i)
    const query = q.trim()

    // Acciones
    if (scope === 'all') {
      const actions: Item[] = [
        { id: 'a-new', group: 'Acciones', icon: Plus, title: 'Nueva entrevista', hint: 'Crear entrevista y generar enlace seguro', run: () => go('/entrevistas?nueva=1') },
        { id: 'a-live', group: 'Acciones', icon: Radio, title: 'Ver entrevistas activas', run: () => go('/entrevistas?estado=live') },
        { id: 'a-cand', group: 'Acciones', icon: UserPlus, title: 'Buscar candidato', run: () => go('/candidatos') },
        { id: 'a-norm', group: 'Acciones', icon: BookOpen, title: 'Consultar normativa', run: () => go('/normativa') },
        { id: 'a-games', group: 'Acciones', icon: Gamepad2, title: 'Abrir pruebas psicotécnicas', run: () => go('/pruebas') },
        { id: 'a-portal', group: 'Acciones', icon: Shield, title: 'Abrir portal del postulante', hint: 'Vista del candidato en una pestaña nueva', run: () => (setOpen(false), window.open('/portal', '_blank')) },
      ]
      actions.filter((a) => !query || matches(query, String(a.title), String(a.hint ?? ''))).forEach(add)
    }

    // Normativa
    if (query) {
      searchArticles(query, scope === 'normativa' ? 12 : 5).forEach((h) =>
        add({
          id: 'n-' + h.article.id,
          group: 'Normativa',
          icon: FileText,
          title: (
            <>
              <span className="mr-2 font-mono text-xs text-blue-300">ART. {h.article.id}</span>
              {h.article.title}
            </>
          ),
          hint: <Highlight text={h.snippet} marks={h.marks} />,
          run: () => go(`/normativa/${h.article.id}`),
        }),
      )
    } else if (scope === 'normativa') {
      ARTICLES.slice(0, 8).forEach((a) =>
        add({
          id: 'n-' + a.id,
          group: 'Normativa',
          icon: FileText,
          title: (
            <>
              <span className="mr-2 font-mono text-xs text-blue-300">ART. {a.id}</span>
              {a.title}
            </>
          ),
          hint: a.summary,
          run: () => go(`/normativa/${a.id}`),
        }),
      )
    }

    if (scope === 'all' && query) {
      // Preguntas
      QUESTIONS.filter((x) => matches(query, x.text, QUESTION_CATEGORY_LABEL[x.category]))
        .slice(0, 4)
        .forEach((x) =>
          add({
            id: 'q-' + x.id,
            group: 'Preguntas',
            icon: ListChecks,
            title: x.text,
            meta: <span className="font-mono text-[10px] uppercase tracking-wider text-dim">{QUESTION_CATEGORY_LABEL[x.category]}</span>,
            run: () => go(`/preguntas?q=${x.id}`),
          }),
        )
      // Candidatos
      candidates
        .filter((c) => matches(query, c.name, c.citizenId, c.discord))
        .slice(0, 4)
        .forEach((c) =>
          add({ id: 'c-' + c.id, group: 'Candidatos', icon: User, title: c.name, hint: `${c.citizenId} · ${c.discord}`, run: () => go(`/candidatos?focus=${c.id}`) }),
        )
      // Entrevistas
      interviews
        .filter((i) => {
          const c = candidates.find((x) => x.id === i.candidateId)
          return matches(query, i.code, c?.name ?? '', i.interviewer, i.status)
        })
        .slice(0, 4)
        .forEach((i) => {
          const c = candidates.find((x) => x.id === i.candidateId)
          add({
            id: 'i-' + i.id,
            group: 'Entrevistas',
            icon: Mic,
            title: `${i.code} · ${c?.name ?? 'Candidato'}`,
            meta: i.status === 'live' ? <PulseDot /> : undefined,
            hint: i.interviewer,
            run: () => go(i.status === 'finished' ? `/entrevistas/${i.id}/resultado` : `/entrevistas/${i.id}`),
          })
        })
      // Usuarios
      STAFF.filter((u) => matches(query, u.name, u.rank, u.role))
        .slice(0, 3)
        .forEach((u) => add({ id: 'u-' + u.id, group: 'Usuarios', icon: Users, title: u.name, hint: `${u.rank} · ${u.badge} · ${u.role}`, run: () => setOpen(false) }))
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, scope, candidates, interviews])

  const total = Object.values(groups).reduce((s, g) => s + g.length, 0)
  let idx = 0

  return (
    <D.Root open={open} onOpenChange={setOpen}>
      <AnimatePresence>
        {open && (
          <D.Portal forceMount>
            <D.Overlay asChild forceMount>
              <motion.div variants={overlayVariants} initial="hidden" animate="show" exit="exit" className="fixed inset-0 z-[70] bg-[#02040a]/70 backdrop-blur-sm" />
            </D.Overlay>
            <D.Content asChild forceMount aria-describedby={undefined}>
              <motion.div
                variants={modalVariants}
                initial="hidden"
                animate="show"
                exit="exit"
                className="fixed left-1/2 top-[12vh] z-[71] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2"
              >
                <D.Title className="sr-only">Buscador del sistema</D.Title>
                <Command shouldFilter={false} loop className="gradient-border overflow-hidden rounded-2xl border border-line-strong bg-panel/95 shadow-[0_40px_120px_-20px_rgb(0_0_0/0.9),0_0_80px_-30px_rgb(59_130_246/0.5)] backdrop-blur-xl">
                  <div className="flex items-center gap-3 border-b border-line px-4">
                    <Search className="size-4 text-blue-300" />
                    <Command.Input
                      autoFocus
                      value={query}
                      onValueChange={setQuery}
                      placeholder={scope === 'normativa' ? 'Buscar normativa… p. ej. "pinchar ruedas"' : 'Buscar normativa, preguntas, candidatos, acciones…'}
                      className="h-14 flex-1 bg-transparent text-[15px] text-fg placeholder:text-dim focus:outline-none"
                    />
                    {scope === 'normativa' && <span className="rounded-md border border-blue-400/30 bg-blue-500/10 px-2 py-0.5 font-mono text-[10px] tracking-widest text-blue-300">NORMATIVA</span>}
                    <Kbd>ESC</Kbd>
                  </div>
                  <Command.List className="max-h-[min(60vh,480px)] overflow-y-auto overscroll-contain p-2">
                    {total === 0 && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-4 py-12 text-center">
                        <p className="font-mono text-xs tracking-[0.2em] text-muted">SIN RESULTADOS</p>
                        <p className="mt-1 text-sm text-dim">Prueba con otro término o un número de artículo (p. ej. 1.28)</p>
                      </motion.div>
                    )}
                    {Object.entries(groups).map(([name, items]) => (
                      <Command.Group
                        key={name}
                        heading={name}
                        className="mb-1 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:pt-2.5 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.18em] [&_[cmdk-group-heading]]:text-dim"
                      >
                        {items.map((it) => (
                          <ItemRow key={it.id} item={it} index={idx++} />
                        ))}
                      </Command.Group>
                    ))}
                  </Command.List>
                  <div className={cn('flex items-center gap-4 border-t border-line px-4 py-2.5 font-mono text-[10px] tracking-wider text-dim')}>
                    <span className="flex items-center gap-1.5">
                      <Kbd>↑</Kbd>
                      <Kbd>↓</Kbd> navegar
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Kbd>
                        <CornerDownLeft className="size-3" />
                      </Kbd>
                      abrir
                    </span>
                    <span className="ml-auto">{total} resultados</span>
                  </div>
                </Command>
              </motion.div>
            </D.Content>
          </D.Portal>
        )}
      </AnimatePresence>
    </D.Root>
  )
}
