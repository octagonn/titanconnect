-- Storage Buckets Setup

-- Create 'posts' bucket for feed images
insert into storage.buckets (id, name, public)
values ('posts', 'posts', true)
on conflict (id) do nothing;

-- Create 'avatars' bucket for user profiles
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Policy: Public Read Access for 'posts'
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'Public Access Posts' and tablename = 'objects' and schemaname = 'storage') then
    create policy "Public Access Posts" on storage.objects for select using ( bucket_id = 'posts' );
  end if;
end $$;

-- Policy: Authenticated Upload Access for 'posts'
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'Authenticated Upload Posts' and tablename = 'objects' and schemaname = 'storage') then
    create policy "Authenticated Upload Posts" on storage.objects for insert to authenticated with check ( bucket_id = 'posts' );
  end if;
end $$;

-- Policy: Users can update/delete their own objects in 'posts'
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'Users Update Own Posts Images' and tablename = 'objects' and schemaname = 'storage') then
    create policy "Users Update Own Posts Images" on storage.objects for update to authenticated using ( bucket_id = 'posts' and auth.uid() = owner );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'Users Delete Own Posts Images' and tablename = 'objects' and schemaname = 'storage') then
    create policy "Users Delete Own Posts Images" on storage.objects for delete to authenticated using ( bucket_id = 'posts' and auth.uid() = owner );
  end if;
end $$;

-- Policy: Public Read Access for 'avatars'
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'Public Access Avatars' and tablename = 'objects' and schemaname = 'storage') then
    create policy "Public Access Avatars" on storage.objects for select using ( bucket_id = 'avatars' );
  end if;
end $$;

-- Policy: Authenticated Upload Access for 'avatars'
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'Authenticated Upload Avatars' and tablename = 'objects' and schemaname = 'storage') then
    create policy "Authenticated Upload Avatars" on storage.objects for insert to authenticated with check ( bucket_id = 'avatars' );
  end if;
end $$;

-- Policy: Users can update/delete their own objects in 'avatars'
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'Users Update Own Avatars' and tablename = 'objects' and schemaname = 'storage') then
    create policy "Users Update Own Avatars" on storage.objects for update to authenticated using ( bucket_id = 'avatars' and auth.uid() = owner );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'Users Delete Own Avatars' and tablename = 'objects' and schemaname = 'storage') then
    create policy "Users Delete Own Avatars" on storage.objects for delete to authenticated using ( bucket_id = 'avatars' and auth.uid() = owner );
  end if;
end $$;
