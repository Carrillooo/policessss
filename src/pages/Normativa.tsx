/**
 * Normativa LSPD
 * ------------------------------------------------------------
 * Escritorio: índice por categorías · artículo · panel contextual.
 * Tablet: el panel contextual baja bajo el artículo.
 * Móvil: el índice se convierte en dos filas de chips desplazables.
 *
 * El cambio de artículo NO re-ejecuta la transición de página del
 * AppShell (misma sección), así que se anima aquí con `questionVariants`
 * y la dirección según la posición del artículo.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, LayoutGroup, motion, useScroll } from 'motion/react'
import {
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  ChevronDown,
  CircleHelp,
  FileSearch,
  Layers,
  Link2,
  Scale,
  Search,
  SearchX,
  X,
} from 'lucide-react'
import { Page, PageHeader } from '@/components/app/PageHeader'
import { EmptyState } from '@/components/app/EmptyState'
import { CountUp, GridBackground, SpotlightCard } from '@/components/reactbits'
import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/kbd'
import { ArticleView } from '@/components/normativa/ArticleView'
import { CATEGORY_ICON, LATEST_UPDATE, formatDay, matchesArticle, parseDay } from '@/components/normativa/meta'
import { ARTICLES, CATEGORIES, articleById, categoryById } from '@/data/normativa'
import { QUESTIONS, QUESTION_CATEGORY_LABEL } from '@/data/questions'
import type { Article, NormativaCategory } from '@/data/types'
import {
  DEFAULT_TRANSITION,
  FAST_TRANSITION,
  INDICATOR_SPRING,
  STAGGER,
  cardVariants,
  enterVariants,
  questionVariants,
  staggerContainer,
} from '@/lib/animations'
import { cn, isMac } from '@/lib/utils'
import { useUi } from '@/store/ui-store'

/* ---------------------------------------------------------------- */
/* Datos derivados (estáticos)                                       */
/* ---------------------------------------------------------------- */
const DAY_MS = 86_400_000
const DAYS_SINCE_UPDATE = Math.max(0, Math.round((Date.now() - parseDay(LATEST_UPDATE).getTime()) / DAY_MS))
const LINKED_QUESTIONS = QUESTIONS.filter((q) => q.articles.length > 0).length
const indexOf = (id: string) => ARTICLES.findIndex((a) => a.id === id)
const openSearch = () => useUi.getState().openPalette('normativa')

/* ---------------------------------------------------------------- */
/* Página                                                            */
/* ---------------------------------------------------------------- */
export default function Normativa() {
  const { articleId } = useParams()
  const navigate = useNavigate()
  const notFound = !!articleId && !articleById(articleId)
  const article = (articleId ? articleById(articleId) : undefined) ?? ARTICLES[0]
  const index = indexOf(article.id)
  const prev = index > 0 ? ARTICLES[index - 1] : undefined
  const next = index < ARTICLES.length - 1 ? ARTICLES[index + 1] : undefined

  const [query, setQuery] = useState('')
  const filterRef = useRef<HTMLInputElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  // Dirección del cambio (patrón "estado previo" sin refs en render)
  const [nav, setNav] = useState({ id: article.id, dir: 1 })
  if (nav.id !== article.id) setNav({ id: article.id, dir: index >= indexOf(nav.id) ? 1 : -1 })

  const go = (id: string) => {
    if (id !== article.id) navigate(`/normativa/${id}`)
  }

  // Al cambiar de artículo: volver al inicio del contenido si se había bajado
  const firstRun = useRef(true)
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false
      return
    }
    const el = contentRef.current
    if (!el) return
    const top = el.getBoundingClientRect().top + window.scrollY - 84
    if (window.scrollY > top) {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      window.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' })
    }
  }, [article.id])

  // Teclado: ← / → navegan, "/" enfoca el filtro
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target as HTMLElement | null
      if (t?.closest('input, textarea, select, [contenteditable="true"], [role="dialog"]')) return
      if (useUi.getState().paletteOpen) return
      if (e.key === 'ArrowLeft' && prev) {
        e.preventDefault()
        navigate(`/normativa/${prev.id}`)
      } else if (e.key === 'ArrowRight' && next) {
        e.preventDefault()
        navigate(`/normativa/${next.id}`)
      } else if (e.key === '/') {
        e.preventDefault()
        const input = filterRef.current
        if (input && input.offsetParent !== null) input.focus()
        else openSearch()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [prev, next, navigate])

  return (
    <Page>
      {/* Cabecera -------------------------------------------------------- */}
      <div className="relative mb-6 lg:mb-8">
        <GridBackground fade="top" className="-top-6" cell={36} />
        <PageHeader
          eyebrow="Módulo · Reglamento interno"
          title="Normativa LSPD"
          description="Procedimientos, uso de la fuerza y marco legal. Consulta, cita y enlaza artículos durante la evaluación."
          actions={
            <Button variant="secondary" onClick={openSearch} className="group h-11 min-w-[15rem] justify-between gap-6 pl-3.5 pr-2.5">
              <span className="flex items-center gap-2 text-muted transition-colors group-hover:text-fg">
                <Search className="text-blue-300" />
                Buscar normativa
              </span>
              <span className="flex items-center gap-1">
                <Kbd>{isMac ? '⌘' : 'Ctrl'}</Kbd>
                <Kbd>K</Kbd>
              </span>
            </Button>
          }
        >
          <HeaderStats />
        </PageHeader>
      </div>

      {/* Índice móvil / tablet --------------------------------------------- */}
      <MobileIndex current={article} onSelect={go} />

      {/* Layout principal ------------------------------------------------- */}
      <div ref={contentRef} className="grid gap-6 lg:grid-cols-[264px_minmax(0,1fr)] xl:grid-cols-[264px_minmax(0,1fr)_300px]">
        <aside className="hidden lg:block">
          <div className="sticky top-20">
            <ArticleIndex current={article} onSelect={go} query={query} setQuery={setQuery} inputRef={filterRef} />
          </div>
        </aside>

        <div className="min-w-0">
          {notFound ? (
            <div className="panel">
              <EmptyState
                icon={FileSearch}
                title="ARTÍCULO NO ENCONTRADO"
                description={`No existe el ART. ${articleId} en la normativa vigente.`}
                action={
                  <Button variant="primary" onClick={() => navigate(`/normativa/${ARTICLES[0].id}`, { replace: true })}>
                    Ir al primer artículo
                  </Button>
                }
              />
            </div>
          ) : (
            <>
              <ArticlePanel article={article} dir={nav.dir} highlight={query} onNavigate={go} index={index} />
              <PrevNext prev={prev} next={next} onSelect={go} />
              {/* Tablet / móvil: el panel contextual baja aquí */}
              <div className="mt-8 grid gap-6 md:grid-cols-2 xl:hidden">
                <Insights article={article} onSelect={go} />
              </div>
            </>
          )}
        </div>

        <aside className="hidden xl:block">
          <div className="sticky top-20 space-y-6">{!notFound && <Insights article={article} onSelect={go} />}</div>
        </aside>
      </div>
    </Page>
  )
}

/* ---------------------------------------------------------------- */
/* Estadísticas de cabecera                                          */
/* ---------------------------------------------------------------- */
function HeaderStats() {
  const items = [
    { icon: BookOpenText, label: 'Artículos', value: <CountUp value={ARTICLES.length} /> },
    { icon: Layers, label: 'Categorías', value: <CountUp value={CATEGORIES.length} /> },
    { icon: CircleHelp, label: 'Preguntas vinculadas', value: <CountUp value={LINKED_QUESTIONS} /> },
    {
      icon: Scale,
      label: 'Última revisión',
      value: (
        <span className="flex items-baseline gap-2">
          <span className="uppercase">{formatDay(LATEST_UPDATE)}</span>
          <span className="font-mono text-[10.5px] font-normal tracking-wider text-dim">
            HACE <CountUp value={DAYS_SINCE_UPDATE} /> D
          </span>
        </span>
      ),
    },
  ]
  return (
    <motion.ul variants={staggerContainer(STAGGER.default, 0.15)} initial="hidden" animate="show" className="mt-5 flex flex-wrap gap-2">
      {items.map(({ icon: Icon, label, value }) => (
        <motion.li
          key={label}
          variants={enterVariants}
          className="flex items-center gap-2.5 rounded-lg border border-line bg-panel/60 py-1.5 pl-2 pr-3 backdrop-blur-sm"
        >
          <span className="grid size-7 place-items-center rounded-md bg-blue-500/10 text-blue-300 ring-1 ring-blue-400/20">
            <Icon className="size-3.5" />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-dim">{label}</span>
            <span className="font-display text-base font-bold tracking-wide text-fg">{value}</span>
          </span>
        </motion.li>
      ))}
    </motion.ul>
  )
}

/* ---------------------------------------------------------------- */
/* Índice lateral (escritorio)                                       */
/* ---------------------------------------------------------------- */
interface IndexProps {
  current: Article
  onSelect: (id: string) => void
  query: string
  setQuery: (q: string) => void
  inputRef: React.RefObject<HTMLInputElement | null>
}

function ArticleIndex({ current, onSelect, query, setQuery, inputRef }: IndexProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set())
  const listRef = useRef<HTMLDivElement>(null)
  const filtering = query.trim().length > 0

  const groups = useMemo(
    () =>
      CATEGORIES.map((cat) => ({ cat, items: ARTICLES.filter((a) => a.category === cat.id && matchesArticle(a, query)) })).filter(
        (g) => g.items.length > 0,
      ),
    [query],
  )
  const total = groups.reduce((n, g) => n + g.items.length, 0)

  const toggle = (id: string) =>
    setCollapsed((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  // Mantener visible el artículo activo al navegar con teclado
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-article="${current.id}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [current.id])

  return (
    <nav aria-label="Índice de normativa" className="panel flex max-h-[calc(100vh-6.5rem)] flex-col overflow-hidden">
      <div className="border-b border-line p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-dim" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                if (query) setQuery('')
                else e.currentTarget.blur()
              } else if (e.key === 'Enter' && groups[0]) {
                onSelect(groups[0].items[0].id)
              }
            }}
            placeholder="Filtrar artículos…"
            aria-label="Filtrar artículos"
            className="h-9 w-full rounded-lg border border-line-strong bg-bg-elevated/80 pl-9 pr-9 text-[13px] text-fg placeholder:text-dim transition-[border-color,box-shadow] focus:border-blue-400/60 focus:shadow-[0_0_0_3px_rgb(59_130_246/0.15)] focus:outline-none"
          />
          <span className="absolute right-2 top-1/2 -translate-y-1/2">
            <AnimatePresence mode="wait" initial={false}>
              {query ? (
                <motion.button
                  key="clear"
                  type="button"
                  onClick={() => {
                    setQuery('')
                    inputRef.current?.focus()
                  }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={FAST_TRANSITION}
                  className="grid size-5 place-items-center rounded text-muted hover:bg-white/5 hover:text-fg"
                  aria-label="Limpiar filtro"
                >
                  <X className="size-3.5" />
                </motion.button>
              ) : (
                <motion.span key="kbd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={FAST_TRANSITION}>
                  <Kbd>/</Kbd>
                </motion.span>
              )}
            </AnimatePresence>
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between px-0.5 font-mono text-[10px] tracking-[0.14em] text-dim">
          <span>
            {filtering ? (
              <>
                <span className="tabular text-blue-300">{total}</span> COINCIDENCIAS
              </>
            ) : (
              <>
                <span className="tabular">{ARTICLES.length}</span> ARTÍCULOS
              </>
            )}
          </span>
          <span className="hidden items-center gap-1 xl:flex">
            <Kbd className="h-4 min-w-4 text-[9px]">←</Kbd>
            <Kbd className="h-4 min-w-4 text-[9px]">→</Kbd>
          </span>
        </div>
      </div>

      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-2">
        <LayoutGroup id="normativa-index">
          <AnimatePresence mode="popLayout" initial={false}>
            {groups.map(({ cat, items }) => {
              const open = filtering || !collapsed.has(cat.id)
              return (
                <motion.section
                  key={cat.id}
                  layout="position"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4, transition: FAST_TRANSITION }}
                  transition={DEFAULT_TRANSITION}
                  className="mb-1"
                >
                  <CategoryHeader cat={cat} count={items.length} open={open} active={cat.id === current.category} onToggle={() => toggle(cat.id)} disabled={filtering} />
                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.ul
                        key="items"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, transition: FAST_TRANSITION }}
                        transition={DEFAULT_TRANSITION}
                        className="relative ml-[17px] border-l border-line py-0.5 pl-2"
                      >
                        <AnimatePresence mode="popLayout" initial={false}>
                          {items.map((a) => (
                            <motion.li
                              key={a.id}
                              layout="position"
                              initial={{ opacity: 0, x: -6 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -6, transition: FAST_TRANSITION }}
                              transition={DEFAULT_TRANSITION}
                            >
                              <IndexItem article={a} selected={a.id === current.id} onSelect={onSelect} layoutId="norm-index-indicator" />
                            </motion.li>
                          ))}
                        </AnimatePresence>
                      </motion.ul>
                    )}
                  </AnimatePresence>
                </motion.section>
              )
            })}
          </AnimatePresence>
        </LayoutGroup>

        <AnimatePresence>
          {groups.length === 0 && (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={FAST_TRANSITION}>
              <EmptyState
                icon={SearchX}
                title="SIN COINCIDENCIAS"
                description={`Ningún artículo coincide con “${query.trim()}”.`}
                className="px-2 py-10"
                action={
                  <div className="flex flex-col gap-2">
                    <Button size="sm" variant="primary" onClick={openSearch}>
                      <Search /> Buscar en el texto completo
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setQuery('')}>
                      Limpiar filtro
                    </Button>
                  </div>
                }
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  )
}

function CategoryHeader({
  cat,
  count,
  open,
  active,
  onToggle,
  disabled,
}: {
  cat: NormativaCategory
  count: number
  open: boolean
  active: boolean
  onToggle: () => void
  disabled?: boolean
}) {
  const Icon = CATEGORY_ICON[cat.icon]
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-expanded={open}
      className="group/cat flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/[0.03] disabled:cursor-default disabled:hover:bg-transparent"
    >
      <span
        className={cn(
          'grid size-[18px] shrink-0 place-items-center rounded transition-colors',
          active ? 'text-blue-300' : 'text-dim group-hover/cat:text-muted',
        )}
      >
        <Icon className="size-3.5" />
      </span>
      <span className={cn('min-w-0 flex-1 truncate text-[12.5px] font-medium transition-colors', active ? 'text-fg' : 'text-muted group-hover/cat:text-fg')}>
        <span className="mr-1.5 font-mono text-[10.5px] text-dim">{cat.code}</span>
        {cat.name}
      </span>
      <span className="tabular font-mono text-[10px] text-dim">{count}</span>
      <motion.span animate={{ rotate: open ? 0 : -90 }} transition={FAST_TRANSITION} className={cn('text-dim', disabled && 'opacity-0')}>
        <ChevronDown className="size-3.5" />
      </motion.span>
    </button>
  )
}

function IndexItem({ article, selected, onSelect, layoutId }: { article: Article; selected: boolean; onSelect: (id: string) => void; layoutId: string }) {
  return (
    <button
      type="button"
      data-article={article.id}
      onClick={() => onSelect(article.id)}
      aria-current={selected ? 'page' : undefined}
      className="group/item relative flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left"
    >
      {selected && (
        <motion.span
          layoutId={layoutId}
          transition={INDICATOR_SPRING}
          className="absolute inset-0 rounded-lg bg-blue-500/10 shadow-[inset_0_0_0_1px_rgb(96_165_250/0.22)]"
        >
          <span className="absolute -left-[9px] top-1.5 bottom-1.5 w-[2px] rounded-full bg-blue-400 shadow-[0_0_10px_rgb(59_130_246/0.9)]" />
        </motion.span>
      )}
      {!selected && <span className="absolute inset-0 rounded-lg bg-white/[0.03] opacity-0 transition-opacity group-hover/item:opacity-100" />}
      <span
        className={cn(
          'relative w-9 shrink-0 font-mono text-[11px] font-semibold tabular transition-colors',
          selected ? 'text-blue-300' : 'text-dim group-hover/item:text-blue-300/80',
        )}
      >
        {article.id}
      </span>
      <span
        className={cn(
          'relative min-w-0 flex-1 truncate text-[13px] transition-[color,transform] duration-150',
          selected ? 'text-fg' : 'text-muted group-hover/item:translate-x-0.5 group-hover/item:text-fg',
        )}
      >
        {article.title}
      </span>
    </button>
  )
}

/* ---------------------------------------------------------------- */
/* Índice móvil / tablet: chips desplazables                          */
/* ---------------------------------------------------------------- */
function MobileIndex({ current, onSelect }: { current: Article; onSelect: (id: string) => void }) {
  const [cat, setCat] = useState(current.category)
  const [synced, setSynced] = useState(current.id)
  if (synced !== current.id) {
    setSynced(current.id)
    setCat(current.category)
  }
  const items = ARTICLES.filter((a) => a.category === cat)
  const rowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = rowRef.current?.querySelector<HTMLElement>(`[data-article="${current.id}"]`)
    el?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [current.id, cat])

  return (
    <div className="mb-5 min-w-0 space-y-2 lg:hidden">
      <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 [scrollbar-width:none]">
        <LayoutGroup id="normativa-mobile-cats">
          <div className="flex w-max gap-1.5">
            {CATEGORIES.map((c) => {
              const Icon = CATEGORY_ICON[c.icon]
              const active = c.id === cat
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCat(c.id)}
                  aria-pressed={active}
                  className={cn(
                    'relative flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-medium transition-colors',
                    active ? 'border-blue-400/40 text-fg' : 'border-line bg-panel/60 text-muted hover:text-fg',
                  )}
                >
                  {active && <motion.span layoutId="m-cat" transition={INDICATOR_SPRING} className="absolute inset-0 rounded-[inherit] bg-blue-500/12" />}
                  <Icon className={cn('relative size-3.5', active ? 'text-blue-300' : 'text-dim')} />
                  <span className="relative whitespace-nowrap">{c.name}</span>
                </button>
              )
            })}
          </div>
        </LayoutGroup>
      </div>

      <div ref={rowRef} className="-mx-4 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 [scrollbar-width:none]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={cat}
            variants={staggerContainer(STAGGER.fast)}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, transition: FAST_TRANSITION }}
            className="flex w-max gap-1.5"
          >
            {items.map((a) => {
              const selected = a.id === current.id
              return (
                <motion.button
                  key={a.id}
                  type="button"
                  data-article={a.id}
                  variants={enterVariants}
                  onClick={() => onSelect(a.id)}
                  aria-current={selected ? 'page' : undefined}
                  className={cn(
                    'flex h-8 max-w-[220px] items-center gap-2 rounded-md border px-2.5 text-xs transition-colors',
                    selected
                      ? 'border-blue-400/50 bg-blue-500/15 text-fg shadow-[0_0_16px_-6px_rgb(59_130_246/0.8)]'
                      : 'border-line bg-white/[0.02] text-muted hover:text-fg',
                  )}
                >
                  <span className={cn('font-mono text-[10.5px] font-semibold', selected ? 'text-blue-300' : 'text-dim')}>{a.id}</span>
                  <span className="truncate">{a.title}</span>
                </motion.button>
              )
            })}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- */
/* Artículo + progreso de lectura                                    */
/* ---------------------------------------------------------------- */
function ArticlePanel({
  article,
  dir,
  highlight,
  onNavigate,
  index,
}: {
  article: Article
  dir: number
  highlight: string
  onNavigate: (id: string) => void
  index: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 80px', 'end end'] })
  const category = categoryById(article.category)

  return (
    <div ref={ref} className="panel relative overflow-x-clip">
      {/* Barra de progreso de lectura: fija bajo la topbar */}
      <div className="sticky top-16 z-20 -mb-[2px] h-[2px] overflow-hidden rounded-t-[var(--radius-card)]">
        <motion.div
          style={{ scaleX: scrollYProgress }}
          className="h-full origin-left bg-gradient-to-r from-blue-500 via-sky-400 to-blue-300 shadow-[0_0_12px_rgb(56_189_248/0.8)]"
        />
      </div>

      {/* Barra de contexto */}
      <div className="flex items-center justify-between gap-3 border-b border-line px-6 py-2.5 sm:px-8">
        <div className="flex min-w-0 items-center gap-1.5 font-mono text-[10.5px] tracking-[0.14em] text-dim">
          <span>NORMATIVA</span>
          <span>/</span>
          <span className="truncate uppercase">{category?.name}</span>
        </div>
        <span className="tabular shrink-0 font-mono text-[10.5px] tracking-wider text-dim">
          <span className="text-muted">{String(index + 1).padStart(2, '0')}</span> / {ARTICLES.length}
        </span>
      </div>

      <AnimatePresence mode="wait" initial={false} custom={dir}>
        <motion.div key={article.id} custom={dir} variants={questionVariants} initial="hidden" animate="show" exit="exit">
          <ArticleView article={article} onNavigateArticle={onNavigate} highlight={highlight} />
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function PrevNext({ prev, next, onSelect }: { prev?: Article; next?: Article; onSelect: (id: string) => void }) {
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      {[
        { a: prev, label: 'Anterior', key: '←', side: 'left' as const },
        { a: next, label: 'Siguiente', key: '→', side: 'right' as const },
      ].map(({ a, label, key, side }) =>
        a ? (
          <motion.button
            key={side}
            type="button"
            onClick={() => onSelect(a.id)}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.985 }}
            transition={FAST_TRANSITION}
            className={cn(
              'panel group/pn flex min-w-0 items-center gap-3 px-4 py-3.5 text-left transition-[border-color] hover:border-blue-400/35',
              side === 'right' && 'flex-row-reverse text-right',
            )}
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-line-strong text-muted transition-colors group-hover/pn:border-blue-400/40 group-hover/pn:text-blue-300">
              {side === 'left' ? (
                <ArrowLeft className="size-4 transition-transform group-hover/pn:-translate-x-0.5" />
              ) : (
                <ArrowRight className="size-4 transition-transform group-hover/pn:translate-x-0.5" />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className={cn('flex items-center gap-2 font-mono text-[10px] tracking-[0.16em] text-dim', side === 'right' && 'justify-end')}>
                {label.toUpperCase()} <Kbd className="hidden h-4 min-w-4 text-[9px] lg:inline-flex">{key}</Kbd>
              </span>
              <span className="mt-0.5 block truncate text-sm text-fg">
                <span className="mr-1.5 font-mono text-xs text-blue-300">{a.id}</span>
                {a.title}
              </span>
            </span>
          </motion.button>
        ) : (
          <div key={side} className="hidden rounded-[var(--radius-card)] border border-dashed border-line px-4 py-3.5 font-mono text-[10px] tracking-[0.16em] text-dim sm:grid sm:place-items-center">
            {side === 'left' ? 'INICIO DE LA NORMATIVA' : 'FIN DE LA NORMATIVA'}
          </div>
        ),
      )}
    </div>
  )
}

/* ---------------------------------------------------------------- */
/* Panel contextual: relacionados + preguntas                        */
/* ---------------------------------------------------------------- */
function Insights({ article, onSelect }: { article: Article; onSelect: (id: string) => void }) {
  const related = article.related.map((id) => articleById(id)).filter((a): a is Article => !!a)
  const questions = QUESTIONS.filter((q) => q.articles.includes(article.id))

  return (
    <>
      <section>
        <SectionTitle icon={Link2} title="Artículos relacionados" count={related.length} />
        <motion.div key={article.id} variants={staggerContainer(STAGGER.fast)} initial="hidden" animate="show" className="space-y-2">
          {related.length === 0 && <p className="text-xs text-dim">Este artículo no tiene referencias cruzadas.</p>}
          {related.map((r) => {
            const cat = categoryById(r.category)
            const Icon = cat ? CATEGORY_ICON[cat.icon] : Link2
            return (
              <motion.div key={r.id} variants={cardVariants}>
                <SpotlightCard
                  borderGlow={false}
                  size={260}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelect(r.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onSelect(r.id)
                    }
                  }}
                  className="group/rc cursor-pointer p-3.5 transition-[border-color] hover:border-blue-400/30"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-bold tracking-wider text-blue-300">ART. {r.id}</span>
                    <Icon className="size-3 text-dim" />
                    <ArrowRight className="ml-auto size-3.5 text-dim transition-[color,transform] group-hover/rc:translate-x-0.5 group-hover/rc:text-blue-300" />
                  </div>
                  <div className="mt-1 text-[13.5px] font-medium text-fg">{r.title}</div>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">{r.summary}</p>
                </SpotlightCard>
              </motion.div>
            )
          })}
        </motion.div>
      </section>

      <section>
        <SectionTitle icon={CircleHelp} title="Preguntas que lo evalúan" count={questions.length} />
        <motion.ul key={article.id} variants={staggerContainer(STAGGER.fast)} initial="hidden" animate="show" className="space-y-2">
          {questions.length === 0 && (
            <li className="rounded-lg border border-dashed border-line px-3 py-4 text-center text-xs text-dim">Ninguna pregunta del banco cita este artículo.</li>
          )}
          {questions.map((q) => (
            <motion.li key={q.id} variants={enterVariants} className="rounded-lg border border-line bg-white/[0.02] p-3">
              <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.14em] text-dim">
                <span className="uppercase">{QUESTION_CATEGORY_LABEL[q.category]}</span>
                <span className="ml-auto flex items-center gap-0.5" aria-label={`Dificultad ${q.difficulty} de 3`}>
                  {[1, 2, 3].map((d) => (
                    <span key={d} className={cn('h-1.5 w-2.5 rounded-sm', d <= q.difficulty ? 'bg-blue-400/80' : 'bg-line-strong')} />
                  ))}
                </span>
                <span className="tabular text-muted">{q.points} PTS</span>
              </div>
              <p className="mt-1.5 text-[13px] leading-snug text-fg/90">{q.text}</p>
            </motion.li>
          ))}
        </motion.ul>
      </section>
    </>
  )
}

function SectionTitle({ icon: Icon, title, count }: { icon: React.ComponentType<{ className?: string }>; title: string; count: number }) {
  return (
    <div className="mb-2.5 flex items-center gap-2">
      <Icon className="size-3.5 text-blue-300/80" />
      <span className="label-caps">{title}</span>
      <span className="tabular ml-auto font-mono text-[10.5px] text-dim">{String(count).padStart(2, '0')}</span>
    </div>
  )
}
