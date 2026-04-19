-- Partidas Trilha para testes reais (dois jogadores autenticados, estado em JSONB, Realtime).
-- Executar no Supabase após as migrações anteriores.

create table if not exists public.trilha_live_games (
  id uuid primary key default gen_random_uuid(),
  invite_code text not null,
  host_id uuid not null references auth.users (id) on delete cascade,
  guest_id uuid references auth.users (id) on delete set null,
  status text not null default 'waiting'
    check (status in ('waiting', 'active', 'finished')),
  state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trilha_live_games_invite_code_unique unique (invite_code)
);

create index if not exists trilha_live_games_host_id_idx on public.trilha_live_games (host_id);
create index if not exists trilha_live_games_guest_id_idx on public.trilha_live_games (guest_id);
create index if not exists trilha_live_games_invite_code_idx on public.trilha_live_games (invite_code);

alter table public.trilha_live_games enable row level security;

drop policy if exists "trilha_live_games_select_participants" on public.trilha_live_games;
drop policy if exists "trilha_live_games_insert_host" on public.trilha_live_games;
drop policy if exists "trilha_live_games_update_participants" on public.trilha_live_games;
drop policy if exists "trilha_live_games_join_guest" on public.trilha_live_games;

create policy "trilha_live_games_select_participants"
  on public.trilha_live_games for select
  to authenticated
  using (auth.uid() = host_id or auth.uid() = guest_id);

create policy "trilha_live_games_insert_host"
  on public.trilha_live_games for insert
  to authenticated
  with check (auth.uid() = host_id);

create policy "trilha_live_games_update_participants"
  on public.trilha_live_games for update
  to authenticated
  using (auth.uid() = host_id or auth.uid() = guest_id)
  with check (auth.uid() = host_id or auth.uid() = guest_id);

-- Join via RPC (RLS impede SELECT por código antes de ser convidado).
-- Retorno jsonb: PostgREST expõe a RPC de forma fiável (tipo linha composto falha no schema cache).
drop function if exists public.join_trilha_live_game(text);

-- Sem UUIDs em WHERE (evita “relation … does not exist” no editor). UPDATE … FROM (subselect) + ROW_COUNT.
create or replace function public.join_trilha_live_game(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  inv text;
  n integer;
begin
  inv := upper(trim(p_code));
  if inv is null or length(inv) < 4 then
    raise exception 'invalid_code';
  end if;

  update public.trilha_live_games t
  set guest_id = auth.uid(), status = 'active', updated_at = now()
  from (
    select g.id
    from public.trilha_live_games g
    where g.invite_code = inv
      and g.status = 'waiting'
      and g.guest_id is null
      and g.host_id is distinct from auth.uid()
    limit 1
  ) pick
  where t.id = pick.id;

  get diagnostics n = row_count;

  if n >= 1 then
    return (
      select row_to_json(t)::jsonb
      from public.trilha_live_games t
      where t.invite_code = inv
        and t.guest_id = auth.uid()
        and t.status = 'active'
      order by t.updated_at desc
      limit 1
    );
  end if;

  if not exists (
    select 1
    from public.trilha_live_games g
    where g.invite_code = inv
      and g.status = 'waiting'
      and g.guest_id is null
  ) then
    raise exception 'game_not_found';
  end if;

  raise exception 'cannot_join_own_game';
end;
$$;

grant execute on function public.join_trilha_live_game(text) to authenticated;

notify pgrst, 'reload schema';

-- Realtime (ignorar erro se a tabela já estiver na publicação)
do $$
begin
  alter publication supabase_realtime add table public.trilha_live_games;
exception
  when duplicate_object then null;
end $$;

create or replace function public.trilha_live_games_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trilha_live_games_set_updated_at on public.trilha_live_games;
create trigger trilha_live_games_set_updated_at
  before update on public.trilha_live_games
  for each row
  execute function public.trilha_live_games_touch_updated_at();
