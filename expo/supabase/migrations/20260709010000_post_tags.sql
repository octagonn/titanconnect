alter table public.posts add column if not exists tagged_event_id uuid references public.posts(id) on delete set null;

create table if not exists public.post_tagged_users (
  id uuid default extensions.uuid_generate_v4() primary key,
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(post_id, user_id)
);

alter table public.post_tagged_users enable row level security;

create policy "Tagged users are viewable by authenticated users"
  on public.post_tagged_users for select
  using (auth.role() = 'authenticated');

create policy "Post authors can tag people in their own posts"
  on public.post_tagged_users for insert
  with check (auth.uid() in (select user_id from public.posts where posts.id = post_id));

create index if not exists post_tagged_users_post_id_idx on public.post_tagged_users(post_id);
create index if not exists post_tagged_users_user_id_idx on public.post_tagged_users(user_id);
create index if not exists posts_tagged_event_id_idx on public.posts(tagged_event_id);
