import { BookOpen, ChartColumn, Gamepad2, LayoutDashboard, ListChecks, Mic, Users } from 'lucide-react'

export const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/entrevistas', label: 'Entrevistas', icon: Mic },
  { to: '/candidatos', label: 'Candidatos', icon: Users },
  { to: '/preguntas', label: 'Preguntas', icon: ListChecks },
  { to: '/normativa', label: 'Normativa', icon: BookOpen },
  { to: '/pruebas', label: 'Pruebas', icon: Gamepad2 },
  { to: '/analitica', label: 'Analítica', icon: ChartColumn },
] as const
