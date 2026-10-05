-- LSPD Recruitment System · tabla única de registros
-- Ejecutar en Supabase → SQL Editor

create table if not exists public.lspd_records (
  id         text primary key,
  kind       text not null check (kind in ('cand', 'iv', 'ans', 'inc', 'join')),
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.lspd_records enable row level security;

-- Acceso con la clave anónima (panel y portal del postulante)
drop policy if exists "lspd read" on public.lspd_records;
drop policy if exists "lspd write" on public.lspd_records;
drop policy if exists "lspd update" on public.lspd_records;
drop policy if exists "lspd delete" on public.lspd_records;
create policy "lspd read"   on public.lspd_records for select using (true);
create policy "lspd write"  on public.lspd_records for insert with check (true);
create policy "lspd update" on public.lspd_records for update using (true) with check (true);
create policy "lspd delete" on public.lspd_records for delete using (true);

-- Realtime
alter table public.lspd_records replica identity full;
do $$
begin
  alter publication supabase_realtime add table public.lspd_records;
exception when duplicate_object then null;
end $$;
