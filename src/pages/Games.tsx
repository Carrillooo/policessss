import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, ArrowRight, Gauge, SearchX, Trophy } from 'lucide-react'
import { Page, PageHeader } from '@/components/app/PageHeader'
import { EmptyState } from '@/components/app/EmptyState'
import { SpotlightCard, TiltCard } from '@/components/reactbits'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FEEDBACK_COLOR, STAGGER, cardVariants, pageVariants, staggerContainer } from '@/lib/animations'
import { cn, pad } from '@/lib/utils'
import { GAMES, getGame, type GameDef } from '@/games'
import { GameFrame } from '@/games/GameFrame'
import { getBestScores } from '@/games/best-scores'
import { scoreTone } from '@/games/utils'

export default function Games() {
  const { game: gameId } = useParams()
  // Se relee al cambiar de vista para reflejar nuevos máximos
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const best = useMemo(() => getBestScores(), [gameId])
  const game = getGame(gameId)

  return (
    <Page>
      <AnimatePresence mode="wait" initial={false}>
        {gameId ? (
          <motion.div key={`game-${gameId}`} variants={pageVariants} initial="hidden" animate="show" exit="exit">
            {game ? <GameView game={game} best={best[game.id]} /> : <NotFound />}
          </motion.div>
        ) : (
          <motion.div key="gallery" variants={pageVariants} initial="hidden" animate="show" exit="exit">
            <Gallery best={best} />
          </motion.div>
        )}
      </AnimatePresence>
    </Page>
  )
}

/* ------------------------------------------------------------------ */
/* Galería                                                             */
/* ------------------------------------------------------------------ */
function Gallery({ best }: { best: Partial<Record<string, number>> }) {
  const scores = GAMES.map((g) => best[g.id]).filter((v): v is number => v != null)
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null

  return (
    <>
      <PageHeader
        eyebrow="MÓDULO PSICOTÉCNICO"
        title="Pruebas psicotécnicas"
        description="Batería de evaluación cognitiva para aspirantes: memoria, reacción, atención y retención visual. Los resultados pueden asignarse a una entrevista activa."
        actions={
          <>
            <Badge tone="brand">{GAMES.length} pruebas</Badge>
            <Badge tone={avg == null ? 'neutral' : 'gold'}>
              <Gauge className="size-3" />
              {avg == null ? 'Sin registros' : `Media local · ${avg}`}
            </Badge>
          </>
        }
      />

      <motion.ul
        variants={staggerContainer(STAGGER.slow, 0.1)}
        initial="hidden"
        animate="show"
        className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
      >
        {GAMES.map((g, i) => (
          <motion.li key={g.id} variants={cardVariants} className="min-w-0">
            <GameCard game={g} index={i} best={best[g.id]} />
          </motion.li>
        ))}
      </motion.ul>
    </>
  )
}

function GameCard({ game, index, best }: { game: GameDef; index: number; best?: number }) {
  const Icon = game.icon
  const tone = best != null ? scoreTone(best) : null
  return (
    <TiltCard className="h-full">
      <Link
        to={`/pruebas/${game.id}`}
        className="group/card block h-full rounded-[var(--radius-card)] focus-visible:outline-offset-4"
        aria-label={`${game.name}: ${game.tagline}`}
      >
        <SpotlightCard spotlightColor={game.accent} className="flex h-full flex-col p-5">
          {/* acento */}
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-16 size-44 rounded-full opacity-60 transition-opacity duration-300 group-hover/card:opacity-100"
            style={{ background: `radial-gradient(circle, rgb(${game.accent} / 0.22), transparent 70%)` }}
          />
          <div
            aria-hidden
            className="absolute inset-x-5 top-0 h-px"
            style={{ background: `linear-gradient(90deg, rgb(${game.accent} / 0.7), transparent)` }}
          />

          <div className="flex items-start justify-between gap-3">
            <span
              className="grid size-12 place-items-center rounded-xl transition-transform duration-200 group-hover/card:scale-105"
              style={{
                color: `rgb(${game.accent})`,
                background: `rgb(${game.accent} / 0.1)`,
                boxShadow: `inset 0 0 0 1px rgb(${game.accent} / 0.3), 0 0 30px -10px rgb(${game.accent} / 0.6)`,
              }}
            >
              <Icon className="size-6" strokeWidth={1.75} />
            </span>
            <div className="flex flex-col items-end gap-1.5">
              <span className="font-mono text-[11px] tabular text-dim">{pad(index + 1)}</span>
              <Badge>{game.durationLabel}</Badge>
            </div>
          </div>

          <p className="label-caps mt-5" style={{ color: `rgb(${game.accent} / 0.9)` }}>
            {game.tagline}
          </p>
          <h2 className="mt-1 font-display text-2xl font-bold tracking-wide">{game.name}</h2>
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted">{game.description}</p>

          <div className="mt-auto flex items-end justify-between gap-3 pt-6">
            <div className="min-w-0 flex-1">
              <span className="label-caps flex items-center gap-1.5">
                <Trophy className="size-3" /> Mejor local
              </span>
              {best != null && tone ? (
                <div className="mt-1.5 flex items-center gap-2.5">
                  <span className="font-display text-xl font-bold tabular" style={{ color: `rgb(${FEEDBACK_COLOR[tone]})` }}>
                    {best}
                  </span>
                  <span className="relative h-1 w-full max-w-24 overflow-hidden rounded-full bg-white/[0.06]">
                    <span
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{ width: `${best}%`, background: `rgb(${FEEDBACK_COLOR[tone]})` }}
                    />
                  </span>
                </div>
              ) : (
                <span className="mt-1.5 block font-mono text-xs tracking-[0.14em] text-dim">SIN REGISTRO</span>
              )}
            </div>
            <span
              className="inline-flex shrink-0 items-center gap-1.5 font-mono text-[11px] font-semibold tracking-[0.16em] transition-colors duration-150"
              style={{ color: `rgb(${game.accent})` }}
            >
              INICIAR
              <ArrowRight className="size-3.5 transition-transform duration-200 group-hover/card:translate-x-0.5" />
            </span>
          </div>
        </SpotlightCard>
      </Link>
    </TiltCard>
  )
}

/* ------------------------------------------------------------------ */
/* Vista de prueba                                                     */
/* ------------------------------------------------------------------ */
function GameView({ game, best }: { game: GameDef; best?: number }) {
  return (
    <>
      <Link
        to="/pruebas"
        className="label-caps mb-4 inline-flex items-center gap-2 rounded-md px-1 py-0.5 transition-colors duration-150 hover:text-fg"
      >
        <ArrowLeft className="size-3.5" /> Volver a pruebas
      </Link>
      <PageHeader
        eyebrow="PRUEBAS PSICOTÉCNICAS"
        title={game.name}
        description={game.tagline}
        actions={
          <>
            <nav aria-label="Otras pruebas" className="flex flex-wrap gap-1.5">
              {GAMES.map((g) => {
                const Icon = g.icon
                const active = g.id === game.id
                return (
                  <Link
                    key={g.id}
                    to={`/pruebas/${g.id}`}
                    aria-current={active ? 'page' : undefined}
                    title={g.name}
                    className={cn(
                      'grid size-9 place-items-center rounded-lg border transition-colors duration-150',
                      active ? 'border-transparent' : 'border-line text-muted hover:border-line-strong hover:text-fg',
                    )}
                    style={active ? { color: `rgb(${g.accent})`, background: `rgb(${g.accent} / 0.12)`, boxShadow: `inset 0 0 0 1px rgb(${g.accent} / 0.4)` } : undefined}
                  >
                    <Icon className="size-4" />
                    <span className="sr-only">{g.name}</span>
                  </Link>
                )
              })}
            </nav>
            {best != null && (
              <Badge tone="gold">
                <Trophy className="size-3" /> Mejor · {best}
              </Badge>
            )}
          </>
        }
      />
      <div className="mt-6">
        <GameFrame key={game.id} game={game} />
      </div>
    </>
  )
}

function NotFound() {
  return (
    <div className="panel">
      <EmptyState
        icon={SearchX}
        title="PRUEBA NO ENCONTRADA"
        description="El identificador de la prueba no existe en el registro."
        action={
          <Link to="/pruebas">
            <Button variant="outline" tabIndex={-1}>
              <ArrowLeft /> Volver a pruebas
            </Button>
          </Link>
        }
      />
    </div>
  )
}
