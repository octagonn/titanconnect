alter table public.posts add column if not exists join_policy text not null default 'open' check (join_policy in ('open', 'approval'));

create table if not exists public.study_join_requests (
  id uuid default extensions.uuid_generate_v4() primary key,
  post_id uuid references public.posts(id) on delete cascade not null,
  requester_id uuid references public.profiles(id) on delete cascade not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(post_id, requester_id)
);

alter table public.study_join_requests enable row level security;

create policy "Join requests are viewable by the requester or the host"
  on public.study_join_requests for select
  using (
    auth.uid() = requester_id
    or auth.uid() in (select user_id from public.posts where posts.id = post_id)
  );

create policy "Users can create their own join request"
  on public.study_join_requests for insert
  with check (auth.uid() = requester_id);

create policy "Users can update their own pending join request"
  on public.study_join_requests for update
  using (auth.uid() = requester_id);

create policy "Hosts can respond to join requests on their posts"
  on public.study_join_requests for update
  using (auth.uid() in (select user_id from public.posts where posts.id = post_id));

create index if not exists study_join_requests_post_id_idx on public.study_join_requests(post_id);
create index if not exists study_join_requests_requester_id_idx on public.study_join_requests(requester_id);

-- Approving a join request means the host records someone else (the
-- requester) as having joined, which the normal "likes are inserted by
-- their own user_id" RLS policy would reject. This function runs as the
-- table owner so the host can perform that one specific insert, but only
-- after verifying (via auth.uid()) that the caller actually owns the post.
create or replace function public.approve_study_join(p_post_id uuid, p_requester_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.posts where id = p_post_id and user_id = auth.uid()) then
    raise exception 'Only the host can approve join requests';
  end if;
  insert into public.likes (post_id, user_id) values (p_post_id, p_requester_id)
    on conflict (post_id, user_id) do nothing;
end;
$$;

grant execute on function public.approve_study_join(uuid, uuid) to authenticated;
