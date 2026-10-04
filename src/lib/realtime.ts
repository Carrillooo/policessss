/**
 * Capa realtime
 * ------------------------------------------------------------
 * - Siempre: BroadcastChannel → sincroniza pestañas del mismo navegador
 *   (entrevistador y candidato pueden probarse en dos pestañas).
 * - Si existen VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY: además usa
 *   Supabase Realtime (broadcast) para sincronizar entre dispositivos.
 *
 * Los mensajes son "upserts" de entidades pequeñas: el receptor sustituye
 * sólo la entidad afectada y cada componente anima únicamente su trozo.
 */
import type { Candidate, Interview } from '@/data/types'

export type RealtimeMessage =
  | { type: 'interview:upsert'; interview: Interview }
  | { type: 'candidate:upsert'; candidate: Candidate }

type Handler = (msg: RealtimeMessage) => void
type SupabaseChannel = { send: (p: unknown) => Promise<unknown> }

const handlers = new Set<Handler>()
const bc = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('lspd-realtime') : null
bc?.addEventListener('message', (e) => handlers.forEach((h) => h(e.data as RealtimeMessage)))

let supaChannel: SupabaseChannel | null = null
export type RealtimeTransport = 'local' | 'supabase' | 'connecting'
let transport: RealtimeTransport = 'local'
const transportListeners = new Set<(t: RealtimeTransport) => void>()
const setTransport = (t: RealtimeTransport) => {
  transport = t
  transportListeners.forEach((l) => l(t))
}

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
if (url && key) {
  setTransport('connecting')
  // Carga perezosa: el bundle de Supabase sólo se descarga si está configurado
  import('@supabase/supabase-js').then(({ createClient }) => {
    const client = createClient(url, key)
    const ch = client.channel('lspd-recruitment', { config: { broadcast: { self: false } } })
    ch.on('broadcast', { event: 'rt' }, ({ payload }) => handlers.forEach((h) => h(payload as RealtimeMessage)))
    ch.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        supaChannel = ch as unknown as SupabaseChannel
        setTransport('supabase')
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        setTransport('local')
      }
    })
  })
}

export const realtime = {
  publish(msg: RealtimeMessage) {
    bc?.postMessage(msg)
    supaChannel?.send({ type: 'broadcast', event: 'rt', payload: msg })
  },
  subscribe(h: Handler) {
    handlers.add(h)
    return () => void handlers.delete(h)
  },
  get transport() {
    return transport
  },
  onTransport(l: (t: RealtimeTransport) => void) {
    transportListeners.add(l)
    return () => void transportListeners.delete(l)
  },
}
