-- Bucket Storage para imagens de referência do Studio (upload pelo criador do jogo)
-- Executar no Supabase: SQL Editor → Run
-- Depois confirma em Storage → studio-uploads que as políticas foram aplicadas.

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

-- Escrita apenas na pasta do próprio utilizador: {auth.uid()}/...
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
