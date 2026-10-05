import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { MotionConfig } from 'motion/react'
import { AppShell } from '@/components/layout/AppShell'
import { Toaster } from '@/components/feedback/Toaster'
import { SystemLoader } from '@/components/feedback/SystemLoader'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useApp } from '@/store/app-store'
import { db } from '@/lib/db'
import { toast } from '@/components/feedback/toast-store'

const Login = lazy(() => import('@/pages/Login'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Interviews = lazy(() => import('@/pages/Interviews'))
const InterviewRoom = lazy(() => import('@/pages/InterviewRoom'))
const Result = lazy(() => import('@/pages/Result'))
const Candidates = lazy(() => import('@/pages/Candidates'))
const Questions = lazy(() => import('@/pages/Questions'))
const Normativa = lazy(() => import('@/pages/Normativa'))
const Games = lazy(() => import('@/pages/Games'))
const Analytics = lazy(() => import('@/pages/Analytics'))
const CandidatePortal = lazy(() => import('@/pages/CandidatePortal'))

function RequireAuth({ children }: { children: React.ReactNode }) {
  const session = useApp((s) => s.session)
  const loc = useLocation()
  if (!session) return <Navigate to="/login" replace state={{ from: loc.pathname }} />
  return <>{children}</>
}

const fullscreenFallback = (
  <div className="grid min-h-screen place-items-center">
    <SystemLoader label="CARGANDO MÓDULO" />
  </div>
)
const pageFallback = <SystemLoader label="CARGANDO" className="min-h-[60vh]" />

export default function App() {
  const loaded = useApp((s) => s.loaded)
  useEffect(() => {
    void useApp.getState().init()
    return db.onError((msg) => toast.error('ERROR DE SERVIDOR', msg))
  }, [])

  if (!loaded)
    return (
      <MotionConfig reducedMotion="user">
        <div className="grid min-h-screen place-items-center">
          <SystemLoader label="SINCRONIZANDO" />
        </div>
      </MotionConfig>
    )

  return (
    <MotionConfig reducedMotion="user">
      <TooltipProvider>
        <BrowserRouter>
          <Suspense fallback={fullscreenFallback}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/portal" element={<CandidatePortal />} />
              <Route path="/portal/:code" element={<CandidatePortal />} />
              <Route
                element={
                  <RequireAuth>
                    <AppShell />
                  </RequireAuth>
                }
              >
                <Route path="/" element={<Suspense fallback={pageFallback}><Dashboard /></Suspense>} />
                <Route path="/entrevistas" element={<Suspense fallback={pageFallback}><Interviews /></Suspense>} />
                <Route path="/entrevistas/:id" element={<Suspense fallback={pageFallback}><InterviewRoom /></Suspense>} />
                <Route path="/entrevistas/:id/resultado" element={<Suspense fallback={pageFallback}><Result /></Suspense>} />
                <Route path="/candidatos" element={<Suspense fallback={pageFallback}><Candidates /></Suspense>} />
                <Route path="/preguntas" element={<Suspense fallback={pageFallback}><Questions /></Suspense>} />
                <Route path="/normativa" element={<Suspense fallback={pageFallback}><Normativa /></Suspense>} />
                <Route path="/normativa/:articleId" element={<Suspense fallback={pageFallback}><Normativa /></Suspense>} />
                <Route path="/pruebas" element={<Suspense fallback={pageFallback}><Games /></Suspense>} />
                <Route path="/pruebas/:game" element={<Suspense fallback={pageFallback}><Games /></Suspense>} />
                <Route path="/analitica" element={<Suspense fallback={pageFallback}><Analytics /></Suspense>} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
        <Toaster />
      </TooltipProvider>
    </MotionConfig>
  )
}
