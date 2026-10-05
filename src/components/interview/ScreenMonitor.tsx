/**
 * Pantalla del postulante en (casi) directo: última captura de su
 * pantalla completa + estado de los requisitos de integridad.
 */
import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Maximize, Monitor, MonitorOff, MonitorX, ScreenShare } from 'lucide-react'
import { Dialog } from '@/components/ui/dialog'
import { LiveIndicator } from '@/components/feedback/LiveIndicator'
import { useNow } from '@/hooks/useNow'
import { SNAPSHOT_INTERVAL } from '@/hooks/useProctoring'
import { FAST_TRANSITION } from '@/lib/animations'
import { cn } from '@/lib/utils'
import type { ScreenSnap } from '@/data/types'

/** Más de 3 capturas sin recibir nada → señal perdida */
const STALE_MS = SNAPSHOT_INTERVAL * 3 + 2000

function Chip({ ok, icon: Icon, label }: { ok: boolean; icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[10px] tracking-wider', ok ? 'border-emerald-500/25 text-emerald-300' : 'border-red-500/40 bg-red-500/10 text-red-300')}>
      <Icon className="size-3" /> {label}
    </span>
  )
}

export function ScreenMonitor({ screen, className }: { screen?: ScreenSnap; className?: string }) {
  const now = useNow(1000)
  const [big, setBig] = useState(false)
  const age = screen ? now - screen.at : Infinity
  const stale = age > STALE_MS
  const healthy = !!screen && !stale && screen.sharing && !screen.extended && screen.fullscreen

  return (
    <div className={cn('panel p-4', !healthy && screen && 'border-red-500/30', className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="label-caps !text-[11px] !text-fg">Pantalla del postulante</h3>
        {screen && !stale && screen.sharing ? <LiveIndicator label="LIVE" /> : <LiveIndicator label={screen ? 'SIN SEÑAL' : 'ESPERANDO'} tone={screen ? 'danger' : 'idle'} pulse={!!screen} />}
      </div>
      <button
        onClick={() => screen?.image && setBig(true)}
        className="relative block aspect-video w-full overflow-hidden rounded-lg border border-line bg-black/50"
        aria-label="Ampliar pantalla del postulante"
      >
        <AnimatePresence initial={false}>
          {screen?.image ? (
            <motion.img
              key={screen.at}
              src={screen.image}
              alt="Captura de la pantalla del postulante"
              initial={{ opacity: 0.4 }}
              animate={{ opacity: 1 }}
              transition={FAST_TRANSITION}
              className={cn('absolute inset-0 h-full w-full object-contain', stale && 'grayscale opacity-50')}
            />
          ) : (
            <motion.span key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 grid place-items-center text-xs text-dim">
              <span className="flex flex-col items-center gap-2">
                <MonitorOff className="size-6" />
                {screen ? 'No está compartiendo pantalla' : 'Aún no ha compartido su pantalla'}
              </span>
            </motion.span>
          )}
        </AnimatePresence>
        {screen && (
          <span className="absolute bottom-1.5 right-1.5 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[10px] text-white/80">
            hace {Math.max(0, Math.round(age / 1000))}s
          </span>
        )}
      </button>
      {screen && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Chip ok={screen.sharing && !stale} icon={ScreenShare} label={screen.sharing ? 'COMPARTIENDO' : 'NO COMPARTE'} />
          <Chip ok={!screen.extended} icon={screen.extended ? MonitorX : Monitor} label={screen.extended ? 'VARIOS MONITORES' : '1 MONITOR'} />
          <Chip ok={screen.fullscreen} icon={Maximize} label={screen.fullscreen ? 'PANT. COMPLETA' : 'SIN PANT. COMPLETA'} />
        </div>
      )}
      <Dialog open={big} onOpenChange={setBig} title="Pantalla del postulante" className="max-w-5xl">
        {screen?.image && <img src={screen.image} alt="Captura ampliada" className="w-full rounded-lg border border-line" />}
      </Dialog>
    </div>
  )
}
