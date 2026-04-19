-- Executar no Supabase: SQL Editor → New query → Run
-- Tabela de rascunhos de jogos (Studio → Novo projeto)

create table if not exists public.game_drafts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists game_drafts_owner_id_idx on public.game_drafts (owner_id);
create index if not exists game_drafts_updated_at_idx on public.game_drafts (updated_at desc);

alter table public.game_drafts enable row level security;

create policy "game_drafts_select_own"
  on public.game_drafts for select
  to authenticated
  using (auth.uid() = owner_id);

create policy "game_drafts_insert_own"
  on public.game_drafts for insert
  to authenticated
  with check (auth.uid() = owner_id);

create policy "game_drafts_update_own"
  on public.game_drafts for update
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "game_drafts_delete_own"
  on public.game_drafts for delete
  to authenticated
  using (auth.uid() = owner_id);
