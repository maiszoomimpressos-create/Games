-- =============================================================================
-- TRILHA — Setup completo do Studio (Supabase)
-- =============================================================================
-- Como usar: Supabase Dashboard → SQL Editor → New query → colar este ficheiro
-- → Run. Podes executar mais do que uma vez (políticas são recriadas).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Tabela game_drafts (rascunhos, config JSON, RLS)
-- ---------------------------------------------------------------------------

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

drop policy if exists "game_drafts_select_own" on public.game_drafts;
drop policy if exists "game_drafts_insert_own" on public.game_drafts;
drop policy if exists "game_drafts_update_own" on public.game_drafts;
drop policy if exists "game_drafts_delete_own" on public.game_drafts;

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

-- ---------------------------------------------------------------------------
-- 2) Coluna published_at (botão Publicar)
-- ---------------------------------------------------------------------------

alter table public.game_drafts add column if not exists published_at timestamptz null;

create index if not exists game_drafts_published_at_idx
  on public.game_drafts (published_at desc)
  where published_at is not null;

-- ---------------------------------------------------------------------------
-- 3) Storage: bucket studio-uploads (imagens de referência no Studio)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'studio-uploads',
  'studio-uploads',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "studio_uploads_insert_own" on storage.objects;
drop policy if exists "studio_uploads_update_own" on storage.objects;
drop policy if exists "studio_uploads_delete_own" on storage.objects;

create policy "studio_uploads_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'studio-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "studio_uploads_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'studio-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'studio-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "studio_uploads_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'studio-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- 4) Partidas de teste multiplayer (opcional — Studio → Testes → Ambiente real)
-- ---------------------------------------------------------------------------
-- Executa também: supabase/migrations/004_trilha_live_games.sql e
-- supabase/migrations/005_trilha_join_rpc_jsonb.sql (RPC com retorno jsonb para PostgREST).

-- =============================================================================
-- Fim. Recarrega a app (F5) no Studio e testa Guardar / upload / Publicar.
-- =============================================================================
