/**
 * API de registros (Vercel Function + Neon Postgres)
 * GET    /api/records?since=<ms>  → cambios desde `since` (incluye borrados)
 * POST   /api/records             → { records: [{ id, kind, data }] } upsert
 * DELETE /api/records             → { ids: string[] } borrado lógico
 * La tabla se crea sola en la primera llamada. DATABASE_URL la pone la
 * integración de Neon en Vercel y nunca llega al navegador.
 */
import { neon } from '@neondatabase/serverless'

const KINDS = new Set(['cand', 'iv', 'ans', 'inc', 'join'])
const sql = neon(process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? '')

let ready: Promise<unknown> | null = null
function ensureTable() {
  ready ??= sql`
    create table if not exists lspd_records (
      id text primary key,
      kind text not null,
      data jsonb not null,
      deleted boolean not null default false,
      updated_at bigint not null
    )`.then(() => sql`create index if not exists lspd_records_updated_idx on lspd_records (updated_at)`)
  return ready
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } })

export async function GET(req: Request) {
  await ensureTable()
  const since = Number(new URL(req.url).searchParams.get('since') ?? 0) || 0
  const now = Date.now()
  const rows = since
    ? await sql`select id, kind, data, deleted, updated_at from lspd_records where updated_at > ${since} order by updated_at`
    : await sql`select id, kind, data, deleted, updated_at from lspd_records where deleted = false`
  return json({ now, records: rows.map((r) => ({ ...r, updated_at: Number(r.updated_at) })) })
}

export async function POST(req: Request) {
  await ensureTable()
  const body = (await req.json().catch(() => null)) as { records?: { id: string; kind: string; data: unknown }[] } | null
  const records = (body?.records ?? []).filter((r) => r && typeof r.id === 'string' && r.id.length < 200 && KINDS.has(r.kind))
  if (!records.length) return json({ error: 'sin registros válidos' }, 400)
  const now = Date.now()
  for (const r of records) {
    await sql`
      insert into lspd_records (id, kind, data, deleted, updated_at)
      values (${r.id}, ${r.kind}, ${JSON.stringify(r.data)}::jsonb, false, ${now})
      on conflict (id) do update set kind = excluded.kind, data = excluded.data, deleted = false, updated_at = excluded.updated_at`
  }
  return json({ ok: true, now })
}

export async function DELETE(req: Request) {
  await ensureTable()
  const body = (await req.json().catch(() => null)) as { ids?: string[] } | null
  const ids = (body?.ids ?? []).filter((x) => typeof x === 'string')
  if (!ids.length) return json({ ok: true })
  const now = Date.now()
  await sql`update lspd_records set deleted = true, updated_at = ${now} where id = any(${ids})`
  return json({ ok: true, now })
}
