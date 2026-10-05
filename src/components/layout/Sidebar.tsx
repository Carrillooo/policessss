import { NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import { ChevronsLeft, LogOut } from 'lucide-react'
import { LspdBadge } from '@/components/brand/LspdBadge'
import { Tooltip } from '@/components/ui/tooltip'
import { INDICATOR_SPRING, SPRING_TRANSITION, FAST_TRANSITION } from '@/lib/animations'
import { cn } from '@/lib/utils'
import { useApp } from '@/store/app-store'
import { useUi } from '@/store/ui-store'
import { NAV } from './nav'

function isActive(pathname: string, to: string, end?: boolean) {
  return end ? pathname === to : pathname === to || pathname.startsWith(to + '/')
}

export function SidebarContent({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const { pathname } = useLocation()
  const liveCount = useApp((s) => s.interviews.filter((i) => i.status === 'live').length)
  const session = useApp((s) => s.session)
  const logout = useApp((s) => s.logout)
  const toggle = useUi((s) => s.toggleSidebar)

  return (
    <div className="flex h-full flex-col">
      {/* Marca */}
      <div className={cn('flex h-16 items-center gap-3 border-b border-line', collapsed ? 'justify-center px-0' : 'px-5')}>
        <LspdBadge size={28} />
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              transition={FAST_TRANSITION}
              className="leading-none"
            >
              <div className="font-display text-lg font-bold tracking-[0.18em]">LSPD</div>
              <div className="mt-1 font-mono text-[9px] tracking-[0.26em] text-muted">RECRUITMENT SYS</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navegación */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Principal">
        {!collapsed && <div className="label-caps mb-2 px-3 !text-[9.5px] text-dim">Operaciones</div>}
        <LayoutGroup id="sidebar">
          {NAV.map((item) => {
            const active = isActive(pathname, item.to, 'end' in item ? item.end : false)
            const Icon = item.icon
            const badge = item.to === '/entrevistas' && liveCount > 0 ? liveCount : null
            return (
              <Tooltip key={item.to} content={item.label} disabled={!collapsed}>
                <NavLink
                  to={item.to}
                  end={'end' in item ? item.end : false}
                  onClick={onNavigate}
                  className={cn(
                    'group relative flex h-10 items-center gap-3 rounded-lg text-sm font-medium transition-colors duration-150',
                    collapsed ? 'justify-center' : 'px-3',
                    active ? 'text-fg' : 'text-muted hover:text-fg',
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-active"
                      transition={INDICATOR_SPRING}
                      className="absolute inset-0 rounded-lg border border-blue-400/20 bg-gradient-to-r from-blue-500/[0.16] to-blue-500/[0.03] shadow-[inset_0_1px_0_rgb(255_255_255/0.04)]"
                    >
                      <span className="absolute -left-3 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-blue-400 shadow-[0_0_12px_rgb(96_165_250)]" />
                    </motion.span>
                  )}
                  <span className="absolute inset-0 rounded-lg bg-white/0 transition-colors duration-150 group-hover:bg-white/[0.03]" />
                  <motion.span className="relative" whileHover={{ scale: 1.08 }} transition={FAST_TRANSITION}>
                    <Icon className={cn('size-[18px]', active && 'text-blue-300')} />
                  </motion.span>
                  {!collapsed && <span className="relative flex-1">{item.label}</span>}
                  {badge && (
                    <span
                      className={cn(
                        'relative grid min-w-5 place-items-center rounded-full bg-emerald-500/15 px-1.5 font-mono text-[10px] font-semibold text-emerald-300 ring-1 ring-emerald-400/30',
                        collapsed && 'absolute -right-1 -top-1 min-w-4 px-1 text-[9px]',
                      )}
                    >
                      {badge}
                    </span>
                  )}
                </NavLink>
              </Tooltip>
            )
          })}
        </LayoutGroup>
      </nav>

      {/* Perfil */}
      <div className="border-t border-line p-3">
        <div className={cn('flex items-center gap-3 rounded-lg p-2', collapsed && 'justify-center')}>
          <div className="relative grid size-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-blue-500/30 to-blue-900/30 font-display text-sm font-bold ring-1 ring-blue-400/30">
            {session?.name.split(' ').map((p) => p[0]).join('').slice(0, 2) ?? 'AC'}
            <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-bg-elevated bg-emerald-400" />
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{session?.name}</div>
              <div className="truncate font-mono text-[10px] tracking-wider text-muted">
                ENTREVISTADOR
              </div>
            </div>
          )}
          {!collapsed && (
            <Tooltip content="Cerrar sesión" side="top">
              <button onClick={logout} className="rounded-md p-1.5 text-muted transition-colors hover:bg-white/5 hover:text-red-300" aria-label="Cerrar sesión">
                <LogOut className="size-4" />
              </button>
            </Tooltip>
          )}
        </div>
        <button
          onClick={toggle}
          className="mt-1 hidden h-8 w-full items-center justify-center gap-2 rounded-lg text-xs text-dim transition-colors hover:bg-white/[0.03] hover:text-muted lg:flex"
          aria-label={collapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
        >
          <motion.span animate={{ rotate: collapsed ? 180 : 0 }} transition={SPRING_TRANSITION}>
            <ChevronsLeft className="size-4" />
          </motion.span>
          {!collapsed && <span>Colapsar</span>}
        </button>
      </div>
    </div>
  )
}

export function Sidebar() {
  const collapsed = useUi((s) => s.sidebarCollapsed)
  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 76 : 248 }}
      transition={SPRING_TRANSITION}
      className="sticky top-0 hidden h-screen shrink-0 border-r border-line bg-bg-elevated/70 backdrop-blur-xl lg:block"
    >
      <SidebarContent collapsed={collapsed} />
    </motion.aside>
  )
}
