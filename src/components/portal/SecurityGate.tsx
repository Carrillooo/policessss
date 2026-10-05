/**
 * Control de seguridad del postulante. Se muestra antes de entrar a la
 * sala y, como bloqueo, cada vez que se incumple un requisito.
 */
import { motion } from 'motion/react'
import { Check, Maximize, Monitor, MonitorSmartphone, MonitorX, ScreenShare, ShieldAlert, X } from 'lucide-react'
import { DecryptedText } from '@/components/reactbits'
import { Button } from '@/components/ui/button'
import { DEFAULT_TRANSITION } from '@/lib/animations'
import { cn } from '@/lib/utils'
import type { ProctorState } from '@/hooks/useProctoring'

interface Props {
  state: ProctorState
  locked: boolean
  onShare: () => void
  onFullscreen: () => void
}

function Row({ ok, icon: Icon, title, desc, action }: { ok: boolean; icon: React.ComponentType<{ className?: string }>; title: string; desc: string; action?: React.ReactNode }) {
  return (
    <li className={cn('flex items-center gap-4 rounded-xl border px-4 py-3.5 transition-colors', ok ? 'border-emerald-500/30 bg-emerald-500/[0.05]' : 'border-line-strong bg-white/[0.02]')}>
      <span className={cn('grid size-10 shrink-0 place-items-center rounded-lg', ok ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/[0.04] text-muted')}>
        <Icon className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted">{desc}</p>
      </div>
      {ok ? (
        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="grid size-7 place-items-center rounded-full bg-emerald-500/20 text-emerald-300">
          <Check className="size-4" />
        </motion.span>
      ) : (
        (action ?? (
          <span className="grid size-7 place-items-center rounded-full bg-red-500/15 text-red-300">
            <X className="size-4" />
          </span>
        ))
      )}
    </li>
  )
}

export function SecurityGate({ state, locked, onShare, onFullscreen }: Props) {
  if (state.mobile)
    return (
      <Blocker
        icon={MonitorSmartphone}
        title="DISPOSITIVO NO PERMITIDO"
        text="La entrevista sólo puede realizarse desde un ordenador (no móvil ni tablet). Abre este mismo enlace en tu PC con Google Chrome o Microsoft Edge."
      />
    )
  if (!state.supported)
    return (
      <Blocker
        icon={ShieldAlert}
        title="NAVEGADOR NO COMPATIBLE"
        text="Este navegador no permite verificar tus pantallas. Abre el enlace en un ordenador con Google Chrome o Microsoft Edge actualizado."
      />
    )

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={DEFAULT_TRANSITION} className="w-full max-w-lg">
      <div className="mb-6 text-center">
        <DecryptedText
          text={locked ? 'SESIÓN BLOQUEADA' : 'CONTROL DE SEGURIDAD'}
          className={cn('text-base font-semibold tracking-[0.3em]', locked ? 'text-red-300' : 'text-sky-200')}
        />
        <p className="mt-2 text-sm text-muted">
          {locked
            ? 'Se ha incumplido un requisito y el entrevistador ha sido notificado. Corrígelo para continuar.'
            : 'Para garantizar la integridad del proceso, el entrevistador verá tu pantalla completa durante toda la sesión.'}
        </p>
      </div>
      <ul className="space-y-2.5">
        <Row ok={!state.extended} icon={state.extended ? MonitorX : Monitor} title="Un único monitor" desc={state.extended ? 'Desconecta las pantallas adicionales (o ponlas en modo duplicar).' : 'Sólo hay una pantalla conectada.'} />
        <Row
          ok={state.sharing}
          icon={ScreenShare}
          title="Compartir pantalla completa"
          desc={state.shareError || 'Elige «Pantalla completa» / «Toda la pantalla» en el diálogo del navegador.'}
          action={
            <Button size="sm" variant="primary" onClick={onShare}>
              Compartir
            </Button>
          }
        />
        <Row
          ok={state.fullscreen}
          icon={Maximize}
          title="Modo pantalla completa"
          desc="La ventana debe ocupar toda la pantalla."
          action={
            <Button size="sm" variant="primary" onClick={onFullscreen}>
              Activar
            </Button>
          }
        />
      </ul>
      <p className="mt-5 text-center text-[11px] leading-relaxed text-dim">
        No cambies de pestaña ni de ventana, no uses el móvil y no salgas de pantalla completa: todo queda registrado como incidencia.
      </p>
    </motion.div>
  )
}

function Blocker({ icon: Icon, title, text }: { icon: React.ComponentType<{ className?: string }>; title: string; text: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-md text-center">
      <span className="mx-auto mb-5 grid size-16 place-items-center rounded-2xl bg-red-500/10 text-red-300 ring-1 ring-red-400/30">
        <Icon className="size-8" />
      </span>
      <DecryptedText text={title} className="text-base font-semibold tracking-[0.3em] text-red-300" />
      <p className="mt-3 text-sm text-muted">{text}</p>
    </motion.div>
  )
}
