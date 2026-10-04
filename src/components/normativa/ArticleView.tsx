/**
 * Renderizador de artículos de normativa.
 * Se usa a página completa en /normativa y en modo `compact` dentro del
 * Drawer "VER NORMATIVA" de la sala de entrevista (~560px).
 *
 * - Párrafos numerados con entrada escalonada rápida (STAGGER.fast).
 * - Referencias "ART. x.yy" dentro del texto → enlaces navegables.
 * - `highlight` resalta los términos buscados (sin acentos, por raíz).
 */
import { Fragment } from 'react'
import { motion } from 'motion/react'
import { ArrowUpRight, CalendarClock, Hash } from 'lucide-react'
import { articleById, categoryById } from '@/data/normativa'
import type { Article } from '@/data/types'
import { enterVariants, FAST_TRANSITION, STAGGER, staggerContainer } from '@/lib/animations'
import { cn, pad } from '@/lib/utils'
import { CATEGORY_ICON, findMarks, formatDay } from './meta'

interface ArticleViewProps {
  article: Article
  compact?: boolean
  onNavigateArticle?: (id: string) => void
  highlight?: string
  className?: string
}

const REF_RE = /ART\.\s?(\d+\.\d+)/g

/** Texto plano con los términos de `query` marcados */
function Marked({ text, query }: { text: string; query?: string }) {
  const marks = findMarks(text, query)
  if (!marks.length) return <>{text}</>
  const out: React.ReactNode[] = []
  let cursor = 0
  marks.forEach(([s, e], i) => {
    if (s > cursor) out.push(text.slice(cursor, s))
    out.push(
      <mark key={i} className="rounded-sm bg-blue-500/25 px-0.5 text-blue-100 shadow-[0_0_0_1px_rgb(96_165_250/0.25)]">
        {text.slice(s, e)}
      </mark>,
    )
    cursor = e
  })
  out.push(text.slice(cursor))
  return <>{out}</>
}

/** Párrafo con referencias cruzadas clicables */
function RichParagraph({ text, query, onNavigate }: { text: string; query?: string; onNavigate?: (id: string) => void }) {
  const parts: React.ReactNode[] = []
  let last = 0
  for (const m of text.matchAll(REF_RE)) {
    const start = m.index ?? 0
    if (start > last) parts.push(<Marked key={`t${last}`} text={text.slice(last, start)} query={query} />)
    const id = m[1]
    const target = articleById(id)
    parts.push(
      target && onNavigate ? (
        <button
          key={`r${start}`}
          type="button"
          onClick={() => onNavigate(id)}
          title={target.title}
          className="inline whitespace-nowrap rounded-[4px] border-b border-blue-400/40 bg-blue-500/[0.07] px-1 font-mono text-[0.92em] font-semibold text-blue-300 transition-colors hover:border-blue-300 hover:bg-blue-500/15 hover:text-blue-200"
        >
          {m[0]}
        </button>
      ) : (
        <span key={`r${start}`} className="whitespace-nowrap font-mono text-[0.92em] font-semibold text-blue-300">
          {m[0]}
        </span>
      ),
    )
    last = start + m[0].length
  }
  if (last < text.length) parts.push(<Marked key={`t${last}`} text={text.slice(last)} query={query} />)
  return <>{parts.map((p, i) => <Fragment key={i}>{p}</Fragment>)}</>
}

export function ArticleView({ article, compact = false, onNavigateArticle, highlight, className }: ArticleViewProps) {
  const category = categoryById(article.category)
  const CatIcon = category ? CATEGORY_ICON[category.icon] : Hash
  const related = article.related.map((id) => articleById(id)).filter((a): a is Article => !!a)
  const q = highlight?.trim() || undefined

  return (
    <article className={cn(compact ? 'p-5 sm:p-6' : 'p-6 sm:p-8', className)} aria-labelledby={`art-${article.id}-title`}>
      {/* Cabecera ----------------------------------------------------- */}
      <header>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex h-7 items-center rounded-md border border-blue-400/30 bg-blue-500/10 px-2.5 font-mono text-[12px] font-bold tracking-[0.14em] text-blue-300 shadow-[0_0_18px_-6px_rgb(59_130_246/0.7)]">
            ART. {article.id}
          </span>
          {category && (
            <span className="inline-flex h-7 min-w-0 items-center gap-1.5 rounded-md border border-line-strong bg-white/[0.03] px-2 text-xs text-muted">
              <CatIcon className="size-3.5 shrink-0 text-blue-300/80" />
              <span className="font-mono text-[10.5px] text-dim">{category.code}</span>
              <span className="truncate">{category.name}</span>
            </span>
          )}
          <span className="ml-auto inline-flex items-center gap-1.5 font-mono text-[10.5px] tracking-wider text-dim">
            <CalendarClock className="size-3.5" />
            <span className="hidden sm:inline">ACTUALIZADO</span>
            <span className="tabular uppercase text-muted">{formatDay(article.updatedAt)}</span>
          </span>
        </div>

        <h2
          id={`art-${article.id}-title`}
          className={cn('mt-4 font-display font-bold leading-tight tracking-wide text-fg', compact ? 'text-2xl' : 'text-[1.9rem] sm:text-[2.2rem]')}
        >
          <Marked text={article.title} query={q} />
        </h2>

        <p
          className={cn(
            'relative mt-3 border-l-2 border-blue-400/50 pl-4 text-muted',
            compact ? 'text-sm leading-relaxed' : 'text-[15px] leading-relaxed',
          )}
        >
          <Marked text={article.summary} query={q} />
        </p>
      </header>

      {/* Cuerpo ------------------------------------------------------- */}
      <motion.ol
        key={article.id}
        variants={staggerContainer(STAGGER.fast)}
        initial="hidden"
        animate="show"
        className={cn('mt-6 space-y-1', compact && 'mt-5')}
      >
        {article.body.map((p, i) => (
          <motion.li
            key={i}
            variants={enterVariants}
            className={cn(
              'group/par relative grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 rounded-lg py-2.5 pr-2 transition-colors hover:bg-white/[0.02]',
              compact ? 'gap-x-3' : 'sm:gap-x-5',
            )}
          >
            <span className="flex flex-col items-center pt-[3px]">
              <span className="tabular font-mono text-[11px] font-semibold text-dim transition-colors group-hover/par:text-blue-300">
                {article.id}.{pad(i + 1)}
              </span>
              {i < article.body.length - 1 && <span aria-hidden className="mt-2 w-px flex-1 bg-gradient-to-b from-line-strong to-transparent" />}
            </span>
            <p className={cn('text-fg/90', compact ? 'text-[14px] leading-[1.7]' : 'text-[15.5px] leading-[1.75]')}>
              <RichParagraph text={p} query={q} onNavigate={onNavigateArticle} />
            </p>
          </motion.li>
        ))}
      </motion.ol>

      {/* Tags --------------------------------------------------------- */}
      {article.tags.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-1.5">
          {article.tags.map((t) => {
            const hit = !!q && findMarks(t, q).length > 0
            return (
              <span
                key={t}
                className={cn(
                  'inline-flex h-6 items-center gap-1 rounded-md border px-2 font-mono text-[10.5px] tracking-wider transition-colors',
                  hit ? 'border-blue-400/40 bg-blue-500/15 text-blue-200' : 'border-line bg-white/[0.02] text-muted',
                )}
              >
                <Hash className="size-3 opacity-60" />
                {t}
              </span>
            )
          })}
        </div>
      )}

      {/* Relacionados ------------------------------------------------- */}
      {related.length > 0 && (
        <div className={cn('mt-6 border-t border-line pt-5')}>
          <div className="label-caps mb-2.5">Ver también</div>
          <div className="flex flex-wrap gap-2">
            {related.map((r) => (
              <motion.button
                key={r.id}
                type="button"
                disabled={!onNavigateArticle}
                onClick={() => onNavigateArticle?.(r.id)}
                whileHover={onNavigateArticle ? { y: -1 } : undefined}
                whileTap={onNavigateArticle ? { scale: 0.98 } : undefined}
                transition={FAST_TRANSITION}
                className="group/rel inline-flex h-8 max-w-full items-center gap-2 rounded-lg border border-line-strong bg-panel-2/70 pl-2 pr-2.5 text-left text-xs transition-[border-color,background-color] hover:border-blue-400/40 hover:bg-blue-500/[0.07] disabled:cursor-default"
              >
                <span className="shrink-0 font-mono text-[10.5px] font-semibold text-blue-300">ART. {r.id}</span>
                <span className={cn('truncate text-muted group-hover/rel:text-fg', compact ? 'max-w-[180px]' : 'max-w-[240px]')}>{r.title}</span>
                {onNavigateArticle && (
                  <ArrowUpRight className="size-3.5 shrink-0 text-dim transition-[color,transform] group-hover/rel:-translate-y-px group-hover/rel:translate-x-px group-hover/rel:text-blue-300" />
                )}
              </motion.button>
            ))}
          </div>
        </div>
      )}
    </article>
  )
}
