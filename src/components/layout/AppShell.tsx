import { useEffect } from 'react'
import { useLocation, useOutlet } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Sidebar, SidebarContent } from './Sidebar'
import { Topbar } from './Topbar'
import { CommandPalette } from '@/components/command/CommandPalette'
import { overlayVariants, pageVariants, SPRING_TRANSITION } from '@/lib/animations'
import { useUi } from '@/store/ui-store'

function MobileNav() {
  const open = useUi((s) => s.mobileNavOpen)
  const set = useUi((s) => s.setMobileNav)
  const { pathname } = useLocation()
  useEffect(() => set(false), [pathname, set])
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div variants={overlayVariants} initial="hidden" animate="show" exit="exit" onClick={() => set(false)} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden" />
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={SPRING_TRANSITION}
            className="fixed inset-y-0 left-0 z-50 w-72 border-r border-line-strong bg-bg-elevated lg:hidden"
          >
            <SidebarContent collapsed={false} onNavigate={() => set(false)} />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

/** PAGE CHANGE: sólo anima el área de contenido con la clave de sección */
export function AppShell() {
  const { pathname } = useLocation()
  const section = pathname.split('/')[1] ?? ''
  const outlet = useOutlet()
  const openPalette = useUi((s) => s.openPalette)

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        openPalette()
      }
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [openPalette])

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <MobileNav />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="relative flex-1">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={section} variants={pageVariants} initial="hidden" animate="show" exit="exit" className="min-h-full">
              {outlet}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <CommandPalette />
    </div>
  )
}
