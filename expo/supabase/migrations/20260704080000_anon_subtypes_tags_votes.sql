-- Anonymous post subtypes (poll / wishbone), cross-category tags, and a
-- generic per-user vote table backing poll options and wishbone sides.
alter table public.posts add column if not exists subtype text;
alter table public.posts drop constraint if exists posts_subtype_check;
alter table public.posts add constraint posts_subtype_check
  check (subtype is null or subtype in ('thought', 'poll', 'wishbone'));

alter table public.posts add column if not exists poll_options jsonb;
alter table public.posts add column if not exists image_url_2 text;
alter table public.posts add column if not exists tags text[];

create table if not exists public.post_votes (
  id uuid default uuid_generate_v4() primary key,
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  option_index int not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(post_id, user_id)
);

alter table public.post_votes enable row level security;

drop policy if exists "Post votes are viewable by authenticated users" on public.post_votes;
create policy "Post votes are viewable by authenticated users"
  on public.post_votes for select
  using (auth.role() = 'authenticated');

drop policy if exists "Users can cast their own vote" on public.post_votes;
create policy "Users can cast their own vote"
  on public.post_votes for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can change their own vote" on public.post_votes;
create policy "Users can change their own vote"
  on public.post_votes for update
  using (auth.uid() = user_id);

drop policy if exists "Users can remove their own vote" on public.post_votes;
create policy "Users can remove their own vote"
  on public.post_votes for delete
  using (auth.uid() = user_id);

create index if not exists post_votes_post_id_idx on public.post_votes(post_id);
create index if not exists post_votes_user_id_idx on public.post_votes(user_id);
