import { Badge } from '@/components/ui/badge'
import { PulseDot } from '@/components/feedback/LiveIndicator'
import type { CandidateStatus, InterviewStatus, ResultLabel } from '@/data/types'

export function InterviewStatusBadge({ status }: { status: InterviewStatus }) {
  switch (status) {
    case 'live':
      return (
        <Badge tone="ok">
          <PulseDot tone="live" /> En directo
        </Badge>
      )
    case 'waiting':
      return (
        <Badge tone="cyan">
          <PulseDot tone="brand" /> Sala de espera
        </Badge>
      )
    case 'scheduled':
      return <Badge tone="neutral">Programada</Badge>
    case 'finished':
      return <Badge tone="brand">Finalizada</Badge>
  }
}

export function ResultBadge({ result }: { result?: ResultLabel }) {
  if (!result) return null
  if (result === 'APTO') return <Badge tone="ok">Apto</Badge>
  if (result === 'NO_APTO') return <Badge tone="danger">No apto</Badge>
  return <Badge tone="warn">Revisión</Badge>
}

const CAND: Record<CandidateStatus, { label: string; tone: 'neutral' | 'ok' | 'danger' | 'warn' | 'cyan' }> = {
  pendiente: { label: 'Pendiente', tone: 'neutral' },
  en_entrevista: { label: 'En entrevista', tone: 'cyan' },
  apto: { label: 'Apto', tone: 'ok' },
  no_apto: { label: 'No apto', tone: 'danger' },
  revision: { label: 'Revisión', tone: 'warn' },
}

export function CandidateStatusBadge({ status }: { status: CandidateStatus }) {
  const c = CAND[status]
  return (
    <Badge tone={c.tone}>
      {status === 'en_entrevista' && <PulseDot tone="brand" />}
      {c.label}
    </Badge>
  )
}
