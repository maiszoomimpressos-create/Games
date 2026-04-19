-- Corrige join_trilha_live_game: versões antigas da 004 devolviam tipo linha e o PostgREST
-- não encontrava a função no schema cache. Recria com retorno jsonb.
--
-- PRÉ-REQUISITO: a tabela public.trilha_live_games tem de existir.
-- Se ainda não existe, executa primeiro supabase/migrations/004_trilha_live_games.sql (completo).
-- Executa no SQL Editor do Supabase e recarrega o schema da API.

drop function if exists public.join_trilha_live_game(text);

-- Igual à 004: sem variáveis uuid no SQL; ROW_COUNT após UPDATE.
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
