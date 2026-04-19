-- Estado de publicação dos rascunhos (Studio → Publicar)
-- Executar no Supabase: SQL Editor → Run

alter table public.game_drafts add column if not exists published_at timestamptz null;

create index if not exists game_drafts_published_at_idx
  on public.game_drafts (published_at desc)
  where published_at is not null;
