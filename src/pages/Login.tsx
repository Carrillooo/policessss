/**
 * HOME / LOGIN
 * Fondo: grid técnico + light rays + partículas discretas (lazy) + spotlight
 * que sigue al cursor. Escudo que se dibuja, título con blur reveal y
 * subtítulo descifrándose. CTA magnético con borde animado.
 */
import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, Fingerprint, Lock, ShieldCheck } from 'lucide-react'
import { LspdBadge } from '@/components/brand/LspdBadge'
import { BlurText, CursorSpotlight, DecryptedText, GridBackground, LazyParticles, LightRays, Magnet } from '@/components/reactbits'
import { LiveIndicator } from '@/components/feedback/LiveIndicator'
import { BarsLoader } from '@/components/feedback/SystemLoader'
import { DEFAULT_TRANSITION, EASE, MODAL_TRANSITION } from '@/lib/animations'
import { useApp } from '@/store/app-store'
import { useNow } from '@/hooks/useNow'
import { formatClockSeconds } from '@/lib/utils'

export default function Login() {
  const login = useApp((s) => s.login)
  const navigate = useNavigate()
  const location = useLocation()
  const [phase, setPhase] = useState<'idle' | 'verifying' | 'granted'>('idle')
  const now = useNow(1000)
  const session = useApp((s) => s.session)

  const access = () => {
    if (phase !== 'idle') return
    setPhase('verifying')
    setTimeout(() => setPhase('granted'), 900)
    setTimeout(() => {
      login()
      navigate((location.state as { from?: string } | null)?.from ?? '/', { replace: true })
    }, 1500)
  }

  if (session && phase === 'idle') return <Navigate to="/" replace />

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-bg">
      {/* Fondo */}
      <GridBackground scan fade="center" />
      <LightRays />
      <LazyParticles count={45} />
      <CursorSpotlight />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-bg to-transparent" />

      {/* Barra superior tipo terminal */}
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...DEFAULT_TRANSITION, delay: 0.2 }}
        className="relative z-10 flex items-center justify-between px-5 py-4 font-mono text-[10.5px] tracking-[0.2em] text-dim sm:px-8"
      >
        <span>LOS SANTOS POLICE DEPARTMENT</span>
        <span className="hidden sm:inline">NODE LS-HQ-01 · {formatClockSeconds(now)}</span>
        <LiveIndicator label="SYSTEM ONLINE" />
      </motion.header>

      {/* Bloque central */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-16 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.85, filter: 'blur(8px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          transition={{ duration: 0.7, ease: EASE.out }}
          className="relative mb-7"
        >
          <div aria-hidden className="absolute inset-0 -z-10 scale-150 rounded-full bg-blue-500/20 blur-3xl" />
          <LspdBadge size={96} animate />
        </motion.div>

        <BlurText
          as="h1"
          text="LSPD"
          by="letters"
          delay={0.35}
          stagger={0.08}
          className="font-display text-6xl font-bold leading-none tracking-[0.32em] text-white sm:text-7xl"
        />
        <BlurText
          as="p"
          text="RECRUITMENT SYSTEM"
          delay={0.7}
          className="mt-3 font-display text-lg font-semibold tracking-[0.42em] text-blue-200/90 sm:text-xl"
        />

        <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.6, delay: 1.05, ease: EASE.out }} className="my-7 h-px w-48 bg-gradient-to-r from-transparent via-blue-400/70 to-transparent" />

        <div className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.34em] text-muted">
          <Lock className="size-3.5 text-blue-300" />
          <DecryptedText text="SECURE PERSONNEL ACCESS" delay={1150} speed={32} />
        </div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DEFAULT_TRANSITION, delay: 1.5 }} className="mt-10">
          <Magnet strength={0.18}>
            <button
              onClick={access}
              disabled={phase !== 'idle'}
              className="gradient-border group relative h-14 overflow-hidden rounded-xl bg-gradient-to-b from-blue-600/90 to-blue-800/90 px-8 font-mono text-sm font-semibold tracking-[0.24em] text-white shadow-[0_0_0_1px_rgb(96_165_250/0.4),0_20px_60px_-15px_rgb(59_130_246/0.8)] transition-shadow duration-200 hover:shadow-[0_0_0_1px_rgb(147_197_253/0.6),0_24px_70px_-10px_rgb(59_130_246/1)] disabled:cursor-wait"
            >
              {/* barrido de luz al hover */}
              <span aria-hidden className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" />
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={phase}
                  initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
                  transition={MODAL_TRANSITION}
                  className="relative flex items-center gap-3"
                >
                  {phase === 'idle' && (
                    <>
                      <Fingerprint className="size-5" />
                      ACCEDER AL SISTEMA
                      <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-1" />
                    </>
                  )}
                  {phase === 'verifying' && (
                    <>
                      <BarsLoader />
                      VERIFICANDO CREDENCIALES
                    </>
                  )}
                  {phase === 'granted' && (
                    <>
                      <ShieldCheck className="size-5 text-emerald-300" />
                      ACCESO CONCEDIDO
                    </>
                  )}
                </motion.span>
              </AnimatePresence>
            </button>
          </Magnet>
        </motion.div>

        <motion.a
          href="/portal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.9 }}
          className="mt-6 text-xs text-dim underline-offset-4 transition-colors hover:text-blue-300 hover:underline"
        >
          ¿Eres postulante? Accede al portal del candidato
        </motion.a>
      </main>

      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8 }}
        className="relative z-10 px-6 pb-5 text-center font-mono text-[10px] tracking-[0.18em] text-dim"
      >
        ACCESO RESTRINGIDO · TODA ACTIVIDAD QUEDA REGISTRADA · LSPD-IT © 2026
      </motion.footer>
    </div>
  )
}
