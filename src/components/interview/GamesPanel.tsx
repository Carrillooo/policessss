/**
 * Lanzar pruebas psicotécnicas al postulante y ver su progreso en directo.
 */
import { motion } from 'motion/react'
import { Play, Square } from 'lucide-react'
import { GAMES } from '@/games'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { PulseDot } from '@/components/feedback/LiveIndicator'
import { CountUp } from '@/components/reactbits'
import { useApp } from '@/store/app-store'
import { cn } from '@/lib/utils'
import type { Interview } from '@/data/types'

export function GamesPanel({ iv }: { iv: Interview }) {
  const launchGame = useApp((s) => s.launchGame)
  const active = iv.activeGame?.id
  return (
    <div className="panel p-4">
      <h3 className="label-caps mb-1 !text-[11px] !text-fg">Pruebas psicotécnicas</h3>
      <p className="mb-3 text-xs text-muted">Se abren en la pantalla del postulante; su pantalla sigue monitorizada.</p>
      <ul className="space-y-2">
        {GAMES.map((g) => {
          const run = iv.gameRuns?.[g.id]
          const isActive = active === g.id
          const Icon = g.icon
          return (
            <li key={g.id} className={cn('rounded-lg border px-3 py-2.5', isActive ? 'border-blue-400/40 bg-blue-500/[0.06]' : 'border-line')}>
              <div className="flex items-center gap-2.5">
                <Icon className="size-4 shrink-0" style={{ color: `rgb(${g.accent})` }} />
                <span className="min-w-0 flex-1 truncate text-sm">{g.name}</span>
                {run?.status === 'done' && (
                  <span className={cn('font-display text-lg font-bold', run.score >= 70 ? 'text-emerald-300' : run.score >= 50 ? 'text-amber-300' : 'text-red-300')}>
                    <CountUp value={run.score} />
                  </span>
                )}
                {isActive && run?.status === 'playing' && <PulseDot tone="brand" />}
                {isActive ? (
                  <Button size="sm" variant="ghost" onClick={() => launchGame(iv.id, null)} aria-label={`Retirar ${g.name}`}>
                    <Square />
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => launchGame(iv.id, g.id)} disabled={iv.status !== 'live'}>
                    <Play /> {run?.status === 'done' ? 'Repetir' : 'Lanzar'}
                  </Button>
                )}
              </div>
              {isActive && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-2">
                  {run?.status === 'playing' ? (
                    <>
                      <div className="mb-1 flex justify-between font-mono text-[10px] text-muted">
                        <span>JUGANDO · RONDA {run.round}/{run.rounds}</span>
                        <span>{run.score}</span>
                      </div>
                      <Progress value={run.round} max={Math.max(1, run.rounds)} />
                    </>
                  ) : run?.status === 'done' ? (
                    <p className="font-mono text-[10px] tracking-wider text-emerald-300">COMPLETADA · NOTA GUARDADA</p>
                  ) : (
                    <p className="font-mono text-[10px] tracking-wider text-sky-300">LANZADA · ESPERANDO AL POSTULANTE</p>
                  )}
                </motion.div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
