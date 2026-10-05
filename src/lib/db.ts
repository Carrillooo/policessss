/**
 * Capa de datos
 * ------------------------------------------------------------
 * Todo se guarda como registros { id, kind, data } en una única tabla.
 * Cada parte escribe SOLO sus propios registros (el entrevistador la
 * entrevista; el postulante sus respuestas, incidencias y conexión), así
 * nunca se pisan cambios simultáneos.
 *
 * Backends (se elige automáticamente):
 * 1. Supabase — si existen VITE_/NEXT_PUBLIC_SUPABASE_URL y _ANON_KEY.
 *    Tiempo real con postgres_changes. SQL en `supabase/schema.sql`.
 * 2. API (Vercel + Neon) — si responde `/api/records`. La función usa
 *    DATABASE_URL en el servidor; aquí se sincroniza por sondeo rápido.
 * 3. Local — localStorage + BroadcastChannel (sólo este navegador).
 */
export type RecordKind = 'cand' | 'iv' | 'ans' | 'inc' | 'join' | 'snap' | 'game'
export interface DbRecord<T = unknown> {
  id: string
  kind: RecordKind
  data: T
}

type UpsertHandler = (r: DbRecord) => void
type DeleteHandler = (id: string) => void

const env = import.meta.env as Record<string, string | undefined>
const supaUrl = env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL
const supaKey = env.VITE_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const TABLE = 'lspd_records'
const LS_KEY = 'lspd-db-v2'
const API = '/api/records'
/** Intervalo de sondeo (ms) con la pestaña visible / oculta */
const POLL_VISIBLE = 1200
const POLL_HIDDEN = 5000

export type Backend = 'local' | 'supabase' | 'api'
export type DbStatus = 'local' | 'connecting' | 'online' | 'error'

let backend: Backend = 'local'
let status: DbStatus = 'connecting'
const statusListeners = new Set<(s: DbStatus) => void>()
const setStatus = (s: DbStatus) => {
  if (s === status) return
  status = s
  statusListeners.forEach((l) => l(s))
}

const upsertHandlers = new Set<UpsertHandler>()
const deleteHandlers = new Set<DeleteHandler>()
const emitUpsert = (r: DbRecord) => upsertHandlers.forEach((h) => h(r))
const emitDelete = (id: string) => deleteHandlers.forEach((h) => h(id))

/* ---------------- Local (localStorage + pestañas) ---------------- */
const bc = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('lspd-db') : null

function readLocal(): Record<string, DbRecord> {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '{}')
  } catch {
    return {}
  }
}
function writeLocal(all: Record<string, DbRecord>) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(all))
  } catch {
    /* almacenamiento lleno o bloqueado */
  }
}

/* ---------------- Supabase (cargado bajo demanda) ---------------- */
type SupaClient = import('@supabase/supabase-js').SupabaseClient
let clientPromise: Promise<SupaClient> | null = null
function client() {
  clientPromise ??= import('@supabase/supabase-js').then(({ createClient }) => createClient(supaUrl!, supaKey!))
  return clientPromise
}

/* ---------------- API (Vercel Functions + Neon) ------------------ */
interface ApiRow extends DbRecord {
  deleted: boolean
  updated_at: number
}
/** Última versión conocida de cada registro (evita re-aplicar lo mismo) */
const seen = new Map<string, number>()
/** Registros escritos aquí: ignorar versiones del servidor más antiguas */
const writtenAt = new Map<string, number>()
let cursor = 0

/** La API existe pero ha devuelto un error (p. ej. falta DATABASE_URL) */
class ApiError extends Error {}
/** No hay API (desarrollo local / hosting estático) */
class NoApiError extends Error {}

async function api<T>(method: 'GET' | 'POST' | 'DELETE', body?: unknown, query = ''): Promise<T> {
  let res: Response
  try {
    res = await fetch(API + query, {
      method,
      headers: body ? { 'content-type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    })
  } catch {
    throw new ApiError('Sin conexión con el servidor')
  }
  if (!res.headers.get('content-type')?.includes('application/json')) throw new NoApiError(`API ${res.status}`)
  const json = (await res.json()) as T & { error?: string }
  if (!res.ok) throw new ApiError(json.error ?? `Error ${res.status}`)
  return json
}

/* Errores visibles para el usuario */
let lastError = ''
const errorListeners = new Set<(msg: string) => void>()
function reportError(msg: string) {
  lastError = msg
  errorListeners.forEach((l) => l(msg))
}

function ingest(rows: ApiRow[]) {
  for (const r of rows) {
    if ((seen.get(r.id) ?? -1) >= r.updated_at) continue
    if ((writtenAt.get(r.id) ?? -1) > r.updated_at) continue
    seen.set(r.id, r.updated_at)
    if (r.deleted) emitDelete(r.id)
    else emitUpsert({ id: r.id, kind: r.kind, data: r.data })
  }
}

function startPolling() {
  let timer: ReturnType<typeof setTimeout>
  const tick = async () => {
    try {
      // Pequeño solape para tolerar desfases de reloj entre instancias
      const { now, records } = await api<{ now: number; records: ApiRow[] }>('GET', undefined, `?since=${Math.max(1, cursor - 3000)}`)
      ingest(records)
      cursor = now
      setStatus('online')
    } catch (err) {
      setStatus('error')
      if (err instanceof Error && err.message !== lastError) reportError(err.message)
    }
    timer = setTimeout(tick, document.hidden ? POLL_HIDDEN : POLL_VISIBLE)
  }
  timer = setTimeout(tick, POLL_VISIBLE)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      clearTimeout(timer)
      void tick()
    }
  })
}

/* ---------------------------------------------------------------- */

export const db = {
  get status() {
    return status
  },
  get backend() {
    return backend
  },
  get lastError() {
    return lastError
  },
  onError(l: (msg: string) => void) {
    errorListeners.add(l)
    return () => void errorListeners.delete(l)
  },
  onStatus(l: (s: DbStatus) => void) {
    statusListeners.add(l)
    return () => void statusListeners.delete(l)
  },

  /** Elige backend, hace la carga inicial y se suscribe a cambios */
  async start(): Promise<DbRecord[]> {
    // 1. Supabase
    if (supaUrl && supaKey) {
      backend = 'supabase'
      try {
        const sb = await client()
        sb.channel('lspd-records')
          .on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, (p) => {
            if (p.eventType === 'DELETE') emitDelete((p.old as { id: string }).id)
            else emitUpsert(p.new as DbRecord)
          })
          .subscribe((s) => {
            if (s === 'SUBSCRIBED') setStatus('online')
            else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') setStatus('error')
          })
        const all: DbRecord[] = []
        for (let from = 0; ; from += 1000) {
          const { data, error } = await sb.from(TABLE).select('id,kind,data').range(from, from + 999)
          if (error) throw error
          all.push(...(data as DbRecord[]))
          if (!data || data.length < 1000) break
        }
        return all
      } catch (err) {
        console.error('[db] Supabase', err)
        setStatus('error')
        return []
      }
    }

    // 2. API del servidor (Vercel + Neon)
    try {
      const { now, records } = await api<{ now: number; records: ApiRow[] }>('GET', undefined, '?since=0')
      backend = 'api'
      cursor = now
      records.forEach((r) => seen.set(r.id, r.updated_at))
      setStatus('online')
      startPolling()
      return records.map(({ id, kind, data }) => ({ id, kind, data }))
    } catch (err) {
      if (err instanceof ApiError) {
        // La API existe pero falla: NO caer a modo local (crearía datos invisibles para el postulante)
        backend = 'api'
        setStatus('error')
        reportError(err.message)
        startPolling()
        return []
      }
      /* no hay API: modo local */
    }

    // 3. Local
    backend = 'local'
    setStatus('local')
    bc?.addEventListener('message', (e) => {
      const m = e.data as { op: 'upsert'; rec: DbRecord } | { op: 'delete'; id: string }
      if (m.op === 'upsert') emitUpsert(m.rec)
      else emitDelete(m.id)
    })
    return Object.values(readLocal())
  },

  async upsert(rec: DbRecord) {
    if (backend === 'local') {
      const all = readLocal()
      all[rec.id] = rec
      writeLocal(all)
      bc?.postMessage({ op: 'upsert', rec })
      return
    }
    if (backend === 'api') {
      writtenAt.set(rec.id, Number.MAX_SAFE_INTEGER)
      try {
        const { now } = await api<{ now: number }>('POST', { records: [rec] })
        writtenAt.set(rec.id, now)
        seen.set(rec.id, now)
      } catch (err) {
        writtenAt.delete(rec.id)
        console.error('[db] upsert', err)
        setStatus('error')
        reportError('No se pudo guardar en el servidor: ' + (err instanceof Error ? err.message : String(err)))
      }
      return
    }
    const sb = await client()
    const { error } = await sb.from(TABLE).upsert({ id: rec.id, kind: rec.kind, data: rec.data, updated_at: new Date().toISOString() })
    if (error) {
      console.error('[db] upsert', error)
      setStatus('error')
    }
  },

  async remove(ids: string[]) {
    if (!ids.length) return
    if (backend === 'local') {
      const all = readLocal()
      ids.forEach((id) => delete all[id])
      writeLocal(all)
      ids.forEach((id) => bc?.postMessage({ op: 'delete', id }))
      return
    }
    if (backend === 'api') {
      try {
        const { now } = await api<{ now: number }>('DELETE', { ids })
        ids.forEach((id) => seen.set(id, now))
      } catch (err) {
        console.error('[db] delete', err)
      }
      return
    }
    const sb = await client()
    const { error } = await sb.from(TABLE).delete().in('id', ids)
    if (error) console.error('[db] delete', error)
  },

  onUpsert(h: UpsertHandler) {
    upsertHandlers.add(h)
    return () => void upsertHandlers.delete(h)
  },
  onDelete(h: DeleteHandler) {
    deleteHandlers.add(h)
    return () => void deleteHandlers.delete(h)
  },
}
