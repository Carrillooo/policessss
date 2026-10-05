import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Answer, Candidate, GameRun, Incident, IncidentType, Interview, ScreenSnap, TimelineEvent, Verdict } from '@/data/types'
import { INCIDENT_LABEL } from '@/data/types'
import { QUESTIONS } from '@/data/questions'
import { computeScore } from '@/data/scoring'
import { db, type DbRecord } from '@/lib/db'
import { uid } from '@/lib/utils'

/** Nº de preguntas de cada entrevista */
export const QUESTIONS_PER_INTERVIEW = 30

/* ------------------------------------------------------------------ */
/* Registros crudos (lo que se guarda)                                 */
/* ------------------------------------------------------------------ */
/** Documento de entrevista: lo escribe sólo el entrevistador */
type InterviewDoc = Omit<Interview, 'answers' | 'incidents' | 'candidateJoinedAt' | 'screen' | 'gameRuns'>
/** Lo escribe sólo el postulante */
interface AnswerRec extends Answer {
  interviewId: string
  questionId: string
  firstAt: number
}
interface IncidentRec extends Incident {
  interviewId: string
}
interface JoinRec {
  interviewId: string
  at: number
}
interface SnapRec extends ScreenSnap {
  interviewId: string
}
interface GameRec extends GameRun {
  interviewId: string
}

interface Raw {
  cands: Record<string, Candidate>
  docs: Record<string, InterviewDoc>
  answers: Record<string, AnswerRec>
  incidents: Record<string, IncidentRec>
  joins: Record<string, JoinRec>
  snaps: Record<string, SnapRec>
  gameRecs: Record<string, GameRec>
}

interface Session {
  name: string
}

interface AppState extends Raw {
  /** true cuando la carga inicial ha terminado */
  loaded: boolean
  session: Session | null
  /** Derivados (listos para la UI) */
  candidates: Candidate[]
  interviews: Interview[]

  init: () => Promise<void>
  login: (name: string) => void
  logout: () => void

  /** Crea postulante + entrevista de 30 preguntas en un solo paso */
  createInterviewFor: (name: string, discord: string) => Interview
  createInterview: (candidateId: string) => Interview
  deleteInterview: (id: string) => void
  deleteCandidate: (id: string) => void

  /* Entrevistador */
  startInterview: (id: string) => void
  goToQuestion: (id: string, index: number) => void
  evaluate: (id: string, questionId: string, verdict: Verdict) => void
  setGameScore: (id: string, game: string, score: number) => void
  finishInterview: (id: string) => void

  /* Postulante */
  joinInterview: (id: string) => void
  submitAnswer: (id: string, questionId: string, text: string) => void
  reportIncident: (id: string, type: IncidentType) => void
  pushSnapshot: (id: string, snap: ScreenSnap) => void
  updateGameRun: (id: string, run: GameRun) => void
  /* Entrevistador: lanzar / retirar una prueba al postulante */
  launchGame: (id: string, gameId: string | null) => void
}

const ev = (kind: TimelineEvent['kind'], label: string, tone: TimelineEvent['tone'], at = Date.now()): TimelineEvent => ({
  id: uid('ev_'),
  at,
  kind,
  label,
  tone,
})

const newCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return 'LSPD-' + Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

/* Une el documento del entrevistador con lo escrito por el postulante */
function derive(raw: Raw): Pick<AppState, 'candidates' | 'interviews'> {
  const answersBy: Record<string, AnswerRec[]> = {}
  for (const a of Object.values(raw.answers)) (answersBy[a.interviewId] ??= []).push(a)
  const incBy: Record<string, IncidentRec[]> = {}
  for (const i of Object.values(raw.incidents)) (incBy[i.interviewId] ??= []).push(i)

  const runsBy: Record<string, Record<string, GameRun>> = {}
  for (const g of Object.values(raw.gameRecs)) (runsBy[g.interviewId] ??= {})[g.gameId] = g

  const interviews = Object.values(raw.docs)
    .map((doc): Interview => {
      const ans = answersBy[doc.id] ?? []
      const incs = (incBy[doc.id] ?? []).sort((a, b) => a.at - b.at)
      const join = raw.joins[`${doc.id}__join`]
      const timeline = [...doc.timeline]
      if (join) timeline.push({ id: 'join-' + doc.id, at: join.at, kind: 'join', label: 'CANDIDATO CONECTADO', tone: 'brand' })
      for (const a of ans) {
        const n = doc.questionIds.indexOf(a.questionId) + 1
        timeline.push({ id: 'ans-' + doc.id + a.questionId, at: a.firstAt, kind: 'answer', label: `RESPUESTA ${n} RECIBIDA`, tone: 'brand' })
      }
      for (const i of incs) timeline.push({ id: 'inc-' + i.id, at: i.at, kind: 'incident', label: INCIDENT_LABEL[i.type], tone: i.critical ? 'danger' : 'warn' })
      const runs = runsBy[doc.id] ?? {}
      const games = { ...doc.games }
      for (const r of Object.values(runs)) {
        if (r.status !== 'done') continue
        games[r.gameId] = r.score
        timeline.push({ id: 'game-' + doc.id + r.gameId, at: r.at, kind: 'game', label: `PRUEBA ${r.gameId.toUpperCase()} · ${r.score}`, tone: 'brand' })
      }
      const snap = raw.snaps[`${doc.id}__snap`]
      timeline.sort((a, b) => a.at - b.at)
      return {
        ...doc,
        status: doc.status === 'scheduled' && join ? 'waiting' : doc.status,
        candidateJoinedAt: join?.at,
        answers: Object.fromEntries(ans.map((a) => [a.questionId, { text: a.text, receivedAt: a.receivedAt }])),
        incidents: incs.map(({ interviewId: _, ...i }) => i),
        timeline,
        games,
        gameRuns: runs,
        screen: snap ? { image: snap.image, at: snap.at, sharing: snap.sharing, extended: snap.extended, fullscreen: snap.fullscreen } : undefined,
      }
    })
    .sort((a, b) => b.createdAt - a.createdAt)

  const candidates = Object.values(raw.cands).sort((a, b) => b.appliedAt - a.appliedAt)
  return { candidates, interviews }
}

const EMPTY_RAW: Raw = { cands: {}, docs: {}, answers: {}, incidents: {}, joins: {}, snaps: {}, gameRecs: {} }

function applyRecord(raw: Raw, r: DbRecord): Raw {
  switch (r.kind) {
    case 'cand':
      return { ...raw, cands: { ...raw.cands, [r.id]: r.data as Candidate } }
    case 'iv':
      return { ...raw, docs: { ...raw.docs, [r.id]: r.data as InterviewDoc } }
    case 'ans':
      return { ...raw, answers: { ...raw.answers, [r.id]: r.data as AnswerRec } }
    case 'inc':
      return { ...raw, incidents: { ...raw.incidents, [r.id]: r.data as IncidentRec } }
    case 'join':
      return { ...raw, joins: { ...raw.joins, [r.id]: r.data as JoinRec } }
    case 'snap':
      return { ...raw, snaps: { ...raw.snaps, [r.id]: r.data as SnapRec } }
    case 'game':
      return { ...raw, gameRecs: { ...raw.gameRecs, [r.id]: r.data as GameRec } }
    default:
      return raw
  }
}

function removeRecord(raw: Raw, id: string): Raw {
  const next = { ...raw }
  for (const k of ['cands', 'docs', 'answers', 'incidents', 'joins', 'snaps', 'gameRecs'] as const) {
    if (id in next[k]) {
      const copy = { ...next[k] } as Record<string, unknown>
      delete copy[id]
      ;(next as Record<string, unknown>)[k] = copy
    }
  }
  return next
}

/* Claves de registro: cand/iv usan el id de la entidad; ans/join derivan del de la entrevista */
const ansKey = (ivId: string, qid: string) => `${ivId}__${qid}`
const joinKey = (ivId: string) => `${ivId}__join`

export const useApp = create<AppState>()(
  persist(
    (set, get) => {
      const rawOf = (s: AppState): Raw => ({ cands: s.cands, docs: s.docs, answers: s.answers, incidents: s.incidents, joins: s.joins, snaps: s.snaps, gameRecs: s.gameRecs })
      const apply = (r: DbRecord) =>
        set((s) => {
          const raw = applyRecord(rawOf(s), r)
          return { ...raw, ...derive(raw) }
        })
      const drop = (id: string) =>
        set((s) => {
          const raw = removeRecord(rawOf(s), id)
          return { ...raw, ...derive(raw) }
        })
      /** Escribe localmente al instante y lo envía a la base de datos */
      const write = (r: DbRecord) => {
        apply(r)
        void db.upsert(r)
      }
      const writeDoc = (id: string, fn: (d: InterviewDoc) => InterviewDoc) => {
        const doc = get().docs[id]
        if (!doc) return undefined
        const next = fn(doc)
        write({ id, kind: 'iv', data: next })
        return next
      }
      const setCandidateStatus = (candidateId: string, status: Candidate['status']) => {
        const c = get().cands[candidateId]
        if (c) write({ id: c.id, kind: 'cand', data: { ...c, status } })
      }
      const merged = (id: string) => get().interviews.find((i) => i.id === id)

      return {
        ...EMPTY_RAW,
        loaded: false,
        session: null,
        candidates: [],
        interviews: [],

        init: async () => {
          db.onUpsert(apply)
          db.onDelete(drop)
          const recs = await db.start()
          const raw = recs.reduce(applyRecord, { ...EMPTY_RAW })
          set({ ...raw, ...derive(raw), loaded: true })
        },

        login: (name) => set({ session: { name: name.trim() } }),
        logout: () => set({ session: null }),

        createInterview: (candidateId) => {
          const pool = [...QUESTIONS].sort(() => Math.random() - 0.5).slice(0, QUESTIONS_PER_INTERVIEW)
          const doc: InterviewDoc = {
            id: uid('iv_'),
            code: newCode(),
            candidateId,
            interviewer: get().session?.name ?? 'Entrevistador',
            status: 'scheduled',
            createdAt: Date.now(),
            questionIds: pool.map((q) => q.id),
            currentIndex: 0,
            evaluations: {},
            timeline: [ev('start', 'ENTREVISTA CREADA', 'neutral')],
            games: {},
          }
          write({ id: doc.id, kind: 'iv', data: doc })
          return merged(doc.id)!
        },

        createInterviewFor: (name, discord) => {
          const cand: Candidate = { id: uid('c_'), name: name.trim(), discord: discord.trim(), appliedAt: Date.now(), status: 'pendiente' }
          write({ id: cand.id, kind: 'cand', data: cand })
          return get().createInterview(cand.id)
        },

        deleteInterview: (id) => {
          const s = get()
          const ids = [
            id,
            joinKey(id),
            `${id}__snap`,
            ...Object.keys(s.gameRecs).filter((k) => s.gameRecs[k].interviewId === id),
            ...Object.keys(s.answers).filter((k) => s.answers[k].interviewId === id),
            ...Object.keys(s.incidents).filter((k) => s.incidents[k].interviewId === id),
          ]
          ids.forEach(drop)
          void db.remove(ids)
        },

        deleteCandidate: (id) => {
          get()
            .interviews.filter((i) => i.candidateId === id)
            .forEach((i) => get().deleteInterview(i.id))
          drop(id)
          void db.remove([id])
        },

        startInterview: (id) => {
          const d = writeDoc(id, (x) => ({
            ...x,
            status: 'live',
            startedAt: Date.now(),
            currentIndex: 0,
            timeline: [...x.timeline, ev('start', 'ENTREVISTA INICIADA', 'brand'), ev('question', 'PREGUNTA 1', 'neutral')],
          }))
          if (d) setCandidateStatus(d.candidateId, 'en_entrevista')
        },

        goToQuestion: (id, index) =>
          void writeDoc(id, (x) => {
            const i = Math.max(0, Math.min(x.questionIds.length - 1, index))
            if (i === x.currentIndex) return x
            return { ...x, currentIndex: i, timeline: [...x.timeline, ev('question', `PREGUNTA ${i + 1}`, 'neutral')] }
          }),

        evaluate: (id, questionId, verdict) =>
          void writeDoc(id, (x) => {
            const n = x.questionIds.indexOf(questionId) + 1
            const label = { correct: 'CORRECTA', partial: 'PARCIAL', incorrect: 'INCORRECTA' }[verdict]
            const tone = ({ correct: 'ok', partial: 'warn', incorrect: 'danger' } as const)[verdict]
            return { ...x, evaluations: { ...x.evaluations, [questionId]: verdict }, timeline: [...x.timeline, ev('evaluation', `PREGUNTA ${n} · ${label}`, tone)] }
          }),

        setGameScore: (id, game, score) =>
          void writeDoc(id, (x) => ({
            ...x,
            games: { ...x.games, [game]: Math.round(score) },
            timeline: [...x.timeline, ev('game', `PRUEBA ${game.toUpperCase()} · ${Math.round(score)}`, 'brand')],
          })),

        finishInterview: (id) => {
          const iv = merged(id)
          if (!iv) return
          const sc = computeScore(iv)
          const d = writeDoc(id, (x) => ({
            ...x,
            status: 'finished',
            finishedAt: Date.now(),
            score: sc.total,
            result: sc.result,
            timeline: [...x.timeline, ev('finish', 'ENTREVISTA FINALIZADA', 'brand')],
          }))
          if (d) setCandidateStatus(d.candidateId, sc.result === 'APTO' ? 'apto' : sc.result === 'NO_APTO' ? 'no_apto' : 'revision')
        },

        joinInterview: (id) => {
          if (get().joins[joinKey(id)]) return
          write({ id: joinKey(id), kind: 'join', data: { interviewId: id, at: Date.now() } satisfies JoinRec })
        },

        submitAnswer: (id, questionId, text) => {
          const key = ansKey(id, questionId)
          const prev = get().answers[key]
          const now = Date.now()
          write({ id: key, kind: 'ans', data: { interviewId: id, questionId, text, receivedAt: now, firstAt: prev?.firstAt ?? now } satisfies AnswerRec })
        },

        reportIncident: (id, type) => {
          const iv = merged(id)
          if (!iv || iv.status !== 'live') return
          const sameType = iv.incidents.filter((i) => i.type === type).length
          // Pantalla completa, compartir pantalla, monitores o reincidencia (3ª vez) → crítica
          const critical = type === 'FULLSCREEN_EXIT' || type === 'SCREEN_SHARE_STOPPED' || type === 'MULTI_MONITOR' || sameType >= 2
          const incId = uid('inc_')
          write({ id: incId, kind: 'inc', data: { interviewId: id, id: incId, type, at: Date.now(), critical } satisfies IncidentRec })
        },

        pushSnapshot: (id, snap) => write({ id: `${id}__snap`, kind: 'snap', data: { interviewId: id, ...snap } satisfies SnapRec }),

        updateGameRun: (id, run) => write({ id: `${id}__game__${run.gameId}`, kind: 'game', data: { interviewId: id, ...run } satisfies GameRec }),

        launchGame: (id, gameId) =>
          void writeDoc(id, (x) => ({
            ...x,
            activeGame: gameId ? { id: gameId, launchedAt: Date.now() } : null,
            timeline: gameId ? [...x.timeline, ev('game', `PRUEBA ${gameId.toUpperCase()} LANZADA`, 'neutral')] : x.timeline,
          })),
      }
    },
    {
      name: 'lspd-session-v2',
      partialize: (s) => ({ session: s.session }),
    },
  ),
)

/* Selectores */
export const useInterview = (id?: string) => useApp((s) => s.interviews.find((i) => i.id === id))
export const useCandidate = (id?: string) => useApp((s) => s.candidates.find((c) => c.id === id))
