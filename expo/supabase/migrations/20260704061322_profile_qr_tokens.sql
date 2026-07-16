-- QR "tap-in" tokens: an opaque, unguessable token per user that resolves to
-- their profile when scanned by another user. Possession of the token is the
-- authorization model (same as a share link), so select is open to anyone —
-- only the owner may create their own row.
create table if not exists public.profile_qr_tokens (
  id uuid default extensions.uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null unique,
  token text not null unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profile_qr_tokens enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where policyname = 'Anyone can resolve a QR token' and tablename = 'profile_qr_tokens'
  ) then
    create policy "Anyone can resolve a QR token"
      on public.profile_qr_tokens for select
      using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where policyname = 'Users can create their own QR token' and tablename = 'profile_qr_tokens'
  ) then
    create policy "Users can create their own QR token"
      on public.profile_qr_tokens for insert
      to authenticated
      with check (auth.uid() = user_id);
  end if;
end $$;
