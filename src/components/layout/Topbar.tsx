import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Bell, Menu, Search } from 'lucide-react'
import { Kbd } from '@/components/ui/kbd'
import { LiveIndicator } from '@/components/feedback/LiveIndicator'
import { useApp } from '@/store/app-store'
import { useUi } from '@/store/ui-store'
import { db, type DbStatus } from '@/lib/db'
import { modalVariants, SPRING_TRANSITION } from '@/lib/animations'
import { cn, formatClock, isMac } from '@/lib/utils'
import { useNow } from '@/hooks/useNow'

function SystemStatus() {
  const [t, setT] = useState<DbStatus>(db.status)
  useEffect(() => db.onStatus(setT), [])
  const now = useNow(15_000)
  const label = { online: 'SYSTEM ONLINE', connecting: 'CONNECTING', error: 'SIN CONEXIÓN', local: 'MODO LOCAL' }[t]
  const tone = t === 'online' ? 'live' : t === 'error' ? 'danger' : 'warn'
  return (
    <div className="hidden items-center gap-3 rounded-lg border border-line bg-white/[0.02] px-3 py-1.5 md:flex">
      <LiveIndicator label={label} tone={tone} />
      <span className="h-3 w-px bg-line-strong" />
      <span className="font-mono text-[10.5px] tracking-widest text-muted" title={t === 'local' ? 'Los datos sólo existen en este navegador' : 'Supabase Realtime'}>
        {t === 'local' ? 'RT·LOCAL' : 'RT·SUPABASE'}
      </span>
      <span className="h-3 w-px bg-line-strong" />
      <span className="tabular font-mono text-[10.5px] tracking-widest text-muted">{formatClock(now)}</span>
    </div>
  )
}

function Notifications() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const interviews = useApp((s) => s.interviews)
  const items = useMemo(
    () =>
      interviews
        .filter((i) => i.status === 'live' || i.status === 'waiting')
        .flatMap((i) => i.timeline.filter((e) => e.kind === 'incident' || e.kind === 'answer' || e.kind === 'join').map((e) => ({ ...e, interviewId: i.id })))
        .sort((a, b) => b.at - a.at)
        .slice(0, 8),
    [interviews],
  )
  const [seen, setSeen] = useState(() => Date.now() - 10 * 60_000)
  const unread = items.filter((i) => i.at > seen).length

  useEffect(() => {
    if (!open) return
    const on = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    window.addEventListener('mousedown', on)
    return () => window.removeEventListener('mousedown', on)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => {
          setOpen((v) => !v)
          setSeen(Date.now())
        }}
        className="relative grid size-9 place-items-center rounded-lg text-muted transition-colors hover:bg-white/5 hover:text-fg"
        aria-label={`Notificaciones${unread ? `: ${unread} sin leer` : ''}`}
        aria-expanded={open}
      >
        <motion.span key={unread} animate={unread ? { rotate: [0, -14, 12, -8, 0] } : {}} transition={{ duration: 0.5 }}>
          <Bell className="size-[18px]" />
        </motion.span>
        <AnimatePresence>
          {unread > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={SPRING_TRANSITION}
              className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-red-500 px-1 font-mono text-[9px] font-bold text-white shadow-[0_0_10px_rgb(239_68_68/0.8)]"
            >
              {unread}
            </motion.span>
          )}
        </AnimatePresence>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            style={{ transformOrigin: 'top right' }}
            className="panel absolute right-0 top-11 z-50 w-80 overflow-hidden !bg-panel/95 shadow-2xl shadow-black/60"
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <span className="label-caps">Notificaciones</span>
              <LiveIndicator label="RT" tone="brand" />
            </div>
            <ul className="max-h-80 overflow-y-auto py-1">
              {items.length === 0 && <li className="px-4 py-8 text-center text-sm text-muted">Sin actividad reciente</li>}
              {items.map((n, i) => (
                <motion.li key={n.id} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                  <button
                    onClick={() => {
                      setOpen(false)
                      navigate(`/entrevistas/${n.interviewId}`)
                    }}
                    className="flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/[0.03]"
                  >
                    <span
                      className={cn(
                        'mt-1.5 size-1.5 shrink-0 rounded-full',
                        n.tone === 'danger' ? 'bg-red-400' : n.tone === 'warn' ? 'bg-amber-400' : 'bg-sky-400',
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-mono text-[11px] font-semibold tracking-wider">{n.label}</span>
                      <span className="text-xs text-muted">{formatClock(n.at)}</span>
                    </span>
                  </button>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function Topbar() {
  const openPalette = useUi((s) => s.openPalette)
  const setMobileNav = useUi((s) => s.setMobileNav)
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-line bg-bg/70 px-4 backdrop-blur-xl sm:px-6">
      <button
        onClick={() => setMobileNav(true)}
        className="grid size-9 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-fg lg:hidden"
        aria-label="Abrir menú"
      >
        <Menu className="size-5" />
      </button>
      <button
        onClick={() => openPalette()}
        className="group flex h-9 w-full max-w-md items-center gap-2.5 rounded-lg border border-line bg-white/[0.02] px-3 text-sm text-dim transition-[border-color,background,box-shadow] duration-150 hover:border-blue-400/30 hover:bg-blue-500/[0.04] hover:shadow-[0_0_0_3px_rgb(59_130_246/0.06)]"
      >
        <Search className="size-4 transition-colors group-hover:text-blue-300" />
        <span className="min-w-0 flex-1 truncate text-left">Buscar normativa, candidatos, acciones…</span>
        <span className="hidden items-center gap-1 sm:flex">
          <Kbd>{isMac ? '⌘' : 'Ctrl'}</Kbd>
          <Kbd>K</Kbd>
        </span>
      </button>
      <div className="ml-auto flex items-center gap-2">
        <SystemStatus />
        <Notifications />
      </div>
    </header>
  )
}
