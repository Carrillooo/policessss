/**
 * API de registros (Vercel Function + Neon Postgres)
 * GET    /api/records?since=<ms>  → cambios desde `since` (incluye borrados)
 * POST   /api/records             → { records: [{ id, kind, data }] } upsert
 * DELETE /api/records             → { ids: string[] } borrado lógico
 * La tabla se crea sola en la primera llamada. DATABASE_URL la pone la
 * integración de Neon en Vercel y nunca llega al navegador.
 */
import { neon } from '@neondatabase/serverless'

type Req = { method?: string; query?: Record<string, string | string[]>; body?: unknown; url?: string }
type Res = { status: (n: number) => Res; setHeader: (k: string, v: string) => void; json: (b: unknown) => void }

const KINDS = new Set(['cand', 'iv', 'ans', 'inc', 'join', 'snap', 'game'])
const CONN = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL_UNPOOLED || ''
const sql = CONN ? neon(CONN) : null

let ready: Promise<unknown> | null = null
function ensureTable() {
  ready ??= sql!`
    create table if not exists lspd_records (
      id text primary key,
      kind text not null,
      data jsonb not null,
      deleted boolean not null default false,
      updated_at bigint not null
    )`
    .then(() => sql!`create index if not exists lspd_records_updated_idx on lspd_records (updated_at)`)
    .catch((e) => {
      ready = null
      throw e
    })
  return ready
}

function parseBody<T>(body: unknown): T | null {
  if (!body) return null
  if (typeof body === 'string') {
    try {
      return JSON.parse(body) as T
    } catch {
      return null
    }
  }
  return body as T
}

export default async function handler(req: Req, res: Res) {
  res.setHeader('cache-control', 'no-store')
  if (!sql) {
    return res.status(500).json({ error: 'Falta DATABASE_URL: conecta la integración de Neon al proyecto en Vercel y vuelve a desplegar.' })
  }
  try {
    await ensureTable()
    const now = Date.now()

    if (req.method === 'GET') {
      const raw = req.query?.since
      const since = Number(Array.isArray(raw) ? raw[0] : raw) || 0
      const rows = since
        ? await sql`select id, kind, data, deleted, updated_at from lspd_records where updated_at > ${since} order by updated_at`
        : await sql`select id, kind, data, deleted, updated_at from lspd_records where deleted = false`
      return res.status(200).json({ now, records: rows.map((r) => ({ ...r, updated_at: Number(r.updated_at) })) })
    }

    if (req.method === 'POST') {
      const body = parseBody<{ records?: { id: string; kind: string; data: unknown }[] }>(req.body)
      const records = (body?.records ?? []).filter((r) => r && typeof r.id === 'string' && r.id.length < 200 && KINDS.has(r.kind))
      if (!records.length) return res.status(400).json({ error: 'Sin registros válidos' })
      for (const r of records) {
        await sql`
          insert into lspd_records (id, kind, data, deleted, updated_at)
          values (${r.id}, ${r.kind}, ${JSON.stringify(r.data)}::jsonb, false, ${now})
          on conflict (id) do update set kind = excluded.kind, data = excluded.data, deleted = false, updated_at = excluded.updated_at`
      }
      return res.status(200).json({ ok: true, now })
    }

    if (req.method === 'DELETE') {
      const body = parseBody<{ ids?: string[] }>(req.body)
      const ids = (body?.ids ?? []).filter((x) => typeof x === 'string')
      if (ids.length) await sql`update lspd_records set deleted = true, updated_at = ${now} where id = any(${ids})`
      return res.status(200).json({ ok: true, now })
    }

    res.setHeader('allow', 'GET, POST, DELETE')
    return res.status(405).json({ error: 'Método no permitido' })
  } catch (err) {
    console.error('[api/records]', err)
    return res.status(500).json({ error: 'Error de base de datos: ' + (err instanceof Error ? err.message : String(err)) })
  }
}
