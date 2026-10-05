/**
 * Capa de datos
 * ------------------------------------------------------------
 * Todo se guarda como registros { id, kind, data } en una única tabla.
 * Cada parte escribe SOLO sus propios registros (el entrevistador la
 * entrevista; el postulante sus respuestas, incidencias y conexión), así
 * nunca se pisan cambios simultáneos.
 *
 * - Con VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY: tabla `lspd_records`
 *   en Supabase + Realtime (postgres_changes) → funciona entre dispositivos.
 *   SQL de creación en `supabase/schema.sql`.
 * - Sin Supabase: localStorage + BroadcastChannel → sólo este navegador.
 */
export type RecordKind = 'cand' | 'iv' | 'ans' | 'inc' | 'join'
export interface DbRecord<T = unknown> {
  id: string
  kind: RecordKind
  data: T
}

type UpsertHandler = (r: DbRecord) => void
type DeleteHandler = (id: string) => void

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
const TABLE = 'lspd_records'
const LS_KEY = 'lspd-db-v2'

export const remoteEnabled = Boolean(url && key)

export type DbStatus = 'local' | 'connecting' | 'online' | 'error'
let status: DbStatus = remoteEnabled ? 'connecting' : 'local'
const statusListeners = new Set<(s: DbStatus) => void>()
const setStatus = (s: DbStatus) => {
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
  clientPromise ??= import('@supabase/supabase-js').then(({ createClient }) => createClient(url!, key!))
  return clientPromise
}

export const db = {
  get status() {
    return status
  },
  onStatus(l: (s: DbStatus) => void) {
    statusListeners.add(l)
    return () => void statusListeners.delete(l)
  },

  /** Carga inicial de todos los registros y suscripción a cambios */
  async start(): Promise<DbRecord[]> {
    if (!remoteEnabled) {
      bc?.addEventListener('message', (e) => {
        const m = e.data as { op: 'upsert'; rec: DbRecord } | { op: 'delete'; id: string }
        if (m.op === 'upsert') emitUpsert(m.rec)
        else emitDelete(m.id)
      })
      return Object.values(readLocal())
    }
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
      // Paginación por si hay muchos registros
      for (let from = 0; ; from += 1000) {
        const { data, error } = await sb.from(TABLE).select('id,kind,data').range(from, from + 999)
        if (error) throw error
        all.push(...(data as DbRecord[]))
        if (!data || data.length < 1000) break
      }
      return all
    } catch (err) {
      console.error('[db] No se pudo conectar con Supabase', err)
      setStatus('error')
      return []
    }
  },

  async upsert(rec: DbRecord) {
    if (!remoteEnabled) {
      const all = readLocal()
      all[rec.id] = rec
      writeLocal(all)
      bc?.postMessage({ op: 'upsert', rec })
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
    if (!remoteEnabled) {
      const all = readLocal()
      ids.forEach((id) => delete all[id])
      writeLocal(all)
      ids.forEach((id) => bc?.postMessage({ op: 'delete', id }))
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
