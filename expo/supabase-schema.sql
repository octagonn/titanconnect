-- TitanConnect Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  name text not null,
  role text check (role in ('student','faculty')) default 'student',
  major text,
  year text,
  bio text,
  avatar_url text,
  interests text[] default array[]::text[],
  instagram text,
  linkedin text,
  linktree text,
  website text,
  points integer not null default 0,
  is_profile_complete boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Posts table
create table if not exists public.posts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  image_url text,
  image_url_2 text,
  category text check (category in ('all', 'clubs', 'events', 'study', 'anon', 'market')) default 'all',
  subtype text check (subtype is null or subtype in ('thought', 'poll', 'wishbone')),
  poll_options jsonb,
  tags text[],
  title text,
  scheduled_at timestamp with time zone,
  location text,
  course text,
  price numeric,
  condition text,
  dealt_with_user_id uuid references public.profiles(id) on delete set null,
  join_policy text not null default 'open' check (join_policy in ('open', 'approval')),
  tagged_event_id uuid references public.posts(id) on delete set null,
  media_type text not null default 'image' check (media_type in ('image', 'video')),
  listing_status text not null default 'available' check (listing_status in ('available', 'pending', 'sold')),
  payment_methods text[] default array[]::text[],
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Likes table
create table if not exists public.likes (
  id uuid default uuid_generate_v4() primary key,
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(post_id, user_id)
);

-- Post votes table (backs poll options and wishbone side voting)
create table if not exists public.post_votes (
  id uuid default uuid_generate_v4() primary key,
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  option_index int not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(post_id, user_id)
);

-- Comments table
create table if not exists public.comments (
  id uuid default uuid_generate_v4() primary key,
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Listing inquiries table (tracks which buyers messaged a seller about a
-- specific marketplace listing, scoping the "mark as dealt with" picker)
create table if not exists public.listing_inquiries (
  id uuid default uuid_generate_v4() primary key,
  post_id uuid references public.posts(id) on delete cascade not null,
  buyer_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(post_id, buyer_id)
);

-- Marketplace offers table (structured price offers on a listing, replacing
-- freeform-DM-only negotiation). A partial unique index — not a hard unique
-- constraint — keeps only one *active* pending offer per buyer per listing,
-- while past declined/withdrawn/cancelled offers stay queryable as history.
create table if not exists public.marketplace_offers (
  id uuid default uuid_generate_v4() primary key,
  post_id uuid references public.posts(id) on delete cascade not null,
  buyer_id uuid references public.profiles(id) on delete cascade not null,
  amount numeric not null check (amount >= 0),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'withdrawn', 'cancelled')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Mutual deal-completion confirmation — both buyer and seller must confirm
-- independently before a listing's status flips to 'sold'.
create table if not exists public.marketplace_deal_confirmations (
  id uuid default uuid_generate_v4() primary key,
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(post_id, user_id)
);

-- Study join requests table (tracks who has asked to join a study group
-- that requires host approval, vs. the "anyone can join" default)
create table if not exists public.study_join_requests (
  id uuid default uuid_generate_v4() primary key,
  post_id uuid references public.posts(id) on delete cascade not null,
  requester_id uuid references public.profiles(id) on delete cascade not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(post_id, requester_id)
);

-- Post tagged users table (people tagged in a feed post by its author,
-- e.g. "with Alice, Bob" — tagging an event uses posts.tagged_event_id
-- instead, since a post can only reference one other post)
create table if not exists public.post_tagged_users (
  id uuid default uuid_generate_v4() primary key,
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(post_id, user_id)
);

-- Events table
create table if not exists public.events (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text not null,
  host_id uuid references public.profiles(id) on delete cascade not null,
  location text not null,
  date date not null,
  time time not null,
  image_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Event RSVPs table
create table if not exists public.event_rsvps (
  id uuid default uuid_generate_v4() primary key,
  event_id uuid references public.events(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  status text check (status in ('going', 'interested')) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(event_id, user_id)
);

-- Connections table
create table if not exists public.connections (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  connected_user_id uuid references public.profiles(id) on delete cascade not null,
  status text check (status in ('pending', 'accepted', 'blocked')) default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  check (user_id != connected_user_id),
  unique(user_id, connected_user_id)
);

-- Messages table
create table if not exists public.messages (
  id uuid default uuid_generate_v4() primary key,
  conversation_id uuid not null,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  receiver_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Conversations table
create table if not exists public.conversations (
  id uuid default uuid_generate_v4() primary key,
  participant_ids uuid[] not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Notifications table (in-app only). All inserts go through
-- create_notification() — see below — since a blanket RLS insert policy
-- would let any client spam-write into anyone's inbox.
create table if not exists public.notifications (
  id uuid default uuid_generate_v4() primary key,
  recipient_id uuid references public.profiles(id) on delete cascade not null,
  actor_id uuid references public.profiles(id) on delete cascade,
  type text not null check (type in (
    'message', 'connection_request', 'connection_accepted',
    'offer_new', 'offer_accepted', 'offer_declined', 'deal_confirmed',
    'post_like', 'post_comment', 'post_tag'
  )),
  post_id uuid references public.posts(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete cascade,
  connection_id uuid references public.connections(id) on delete cascade,
  offer_id uuid references public.marketplace_offers(id) on delete cascade,
  read boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.likes enable row level security;
alter table public.post_votes enable row level security;
alter table public.comments enable row level security;
alter table public.listing_inquiries enable row level security;
alter table public.marketplace_offers enable row level security;
alter table public.marketplace_deal_confirmations enable row level security;
alter table public.study_join_requests enable row level security;
alter table public.post_tagged_users enable row level security;
alter table public.events enable row level security;
alter table public.event_rsvps enable row level security;
alter table public.connections enable row level security;
alter table public.messages enable row level security;
alter table public.conversations enable row level security;
alter table public.notifications enable row level security;

-- Profiles RLS Policies
create policy "Public profiles are viewable by authenticated users"
  on public.profiles for select
  using (auth.role() = 'authenticated');

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Posts RLS Policies
create policy "Posts are viewable by authenticated users"
  on public.posts for select
  using (auth.role() = 'authenticated');

create policy "Users can create their own posts"
  on public.posts for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own posts"
  on public.posts for update
  using (auth.uid() = user_id);

create policy "Users can delete their own posts"
  on public.posts for delete
  using (auth.uid() = user_id);

-- Likes RLS Policies
create policy "Likes are viewable by authenticated users"
  on public.likes for select
  using (auth.role() = 'authenticated');

create policy "Users can create likes"
  on public.likes for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own likes"
  on public.likes for delete
  using (auth.uid() = user_id);

-- Post votes RLS Policies
create policy "Post votes are viewable by authenticated users"
  on public.post_votes for select
  using (auth.role() = 'authenticated');

create policy "Users can cast their own vote"
  on public.post_votes for insert
  with check (auth.uid() = user_id);

create policy "Users can change their own vote"
  on public.post_votes for update
  using (auth.uid() = user_id);

create policy "Users can remove their own vote"
  on public.post_votes for delete
  using (auth.uid() = user_id);

-- Comments RLS Policies
create policy "Comments are viewable by authenticated users"
  on public.comments for select
  using (auth.role() = 'authenticated');

create policy "Users can create comments"
  on public.comments for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own comments"
  on public.comments for update
  using (auth.uid() = user_id);

create policy "Users can delete their own comments"
  on public.comments for delete
  using (auth.uid() = user_id);

-- Listing inquiries RLS Policies
-- Only the listing owner and the inquirer can see an inquiry — it reveals
-- buyer interest/contact intent, not public like/comment data.
create policy "Inquiries are viewable by the seller or the buyer"
  on public.listing_inquiries for select
  using (
    auth.uid() = buyer_id
    or auth.uid() in (select user_id from public.posts where posts.id = post_id)
  );

create policy "Users can record their own inquiry"
  on public.listing_inquiries for insert
  with check (auth.uid() = buyer_id);

-- Marketplace offers RLS Policies
create policy "Offers are viewable by the buyer or the seller"
  on public.marketplace_offers for select
  using (
    auth.uid() = buyer_id
    or auth.uid() in (select user_id from public.posts where posts.id = post_id)
  );

create policy "Buyers can create their own offers"
  on public.marketplace_offers for insert
  with check (auth.uid() = buyer_id);

create policy "Buyers can update their own offers"
  on public.marketplace_offers for update
  using (auth.uid() = buyer_id);

create policy "Sellers can respond to offers on their own listings"
  on public.marketplace_offers for update
  using (auth.uid() in (select user_id from public.posts where posts.id = post_id));

-- Marketplace deal confirmations RLS Policies
-- Select-only — all writes go through confirm_marketplace_deal()/
-- cancel_marketplace_deal() (security definer), same reasoning as
-- approve_study_join(): a buyer needs to affect a posts row they don't own,
-- and a blanket RLS grant would let them touch unrelated columns too.
create policy "Deal confirmations are viewable by the two deal participants"
  on public.marketplace_deal_confirmations for select
  using (
    auth.uid() = user_id
    or auth.uid() in (select user_id from public.posts where posts.id = post_id)
    or auth.uid() in (select dealt_with_user_id from public.posts where posts.id = post_id)
  );

-- Study join requests RLS Policies
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

-- Post tagged users RLS Policies
create policy "Tagged users are viewable by authenticated users"
  on public.post_tagged_users for select
  using (auth.role() = 'authenticated');

create policy "Post authors can tag people in their own posts"
  on public.post_tagged_users for insert
  with check (auth.uid() in (select user_id from public.posts where posts.id = post_id));

-- Events RLS Policies
create policy "Events are viewable by authenticated users"
  on public.events for select
  using (auth.role() = 'authenticated');

create policy "Users can create events"
  on public.events for insert
  with check (auth.uid() = host_id);

create policy "Event hosts can update their events"
  on public.events for update
  using (auth.uid() = host_id);

create policy "Event hosts can delete their events"
  on public.events for delete
  using (auth.uid() = host_id);

-- Event RSVPs RLS Policies
create policy "RSVPs are viewable by authenticated users"
  on public.event_rsvps for select
  using (auth.role() = 'authenticated');

create policy "Users can create RSVPs"
  on public.event_rsvps for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own RSVPs"
  on public.event_rsvps for update
  using (auth.uid() = user_id);

create policy "Users can delete their own RSVPs"
  on public.event_rsvps for delete
  using (auth.uid() = user_id);

-- Connections RLS Policies
create policy "Connections are viewable by authenticated users"
  on public.connections for select
  using (auth.role() = 'authenticated');

create policy "Users can create connections"
  on public.connections for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own connections"
  on public.connections for update
  using (auth.uid() = user_id or auth.uid() = connected_user_id);

create policy "Users can delete their own connections"
  on public.connections for delete
  using (auth.uid() = user_id);

-- Messages RLS Policies
create policy "Messages are viewable by participants"
  on public.messages for select
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "Users can send messages"
  on public.messages for insert
  with check (auth.uid() = sender_id);

create policy "Users can update their received messages (mark as read)"
  on public.messages for update
  using (auth.uid() = receiver_id);

-- Conversations RLS Policies
create policy "Conversations are viewable by participants"
  on public.conversations for select
  using (auth.uid() = any(participant_ids));

create policy "Users can create conversations"
  on public.conversations for insert
  with check (auth.uid() = any(participant_ids));

-- Notifications RLS Policies
-- No insert policy: all inserts go through create_notification() (security
-- definer) below, so a client can't spam-write into someone else's inbox.
create policy "Notifications are viewable by their recipient"
  on public.notifications for select
  using (auth.uid() = recipient_id);

create policy "Recipients can mark their own notifications read"
  on public.notifications for update
  using (auth.uid() = recipient_id);

-- Functions

-- Function to handle new user profile creation
create or replace function public.handle_new_user()
returns trigger as $$
declare
  new_role text;
begin
  new_role := coalesce(new.raw_user_meta_data->>'role', 'student');

  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', ''),
    new_role
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to create profile on signup
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Triggers for updated_at
create trigger set_updated_at before update on public.profiles
  for each row execute procedure public.handle_updated_at();

create trigger set_updated_at before update on public.posts
  for each row execute procedure public.handle_updated_at();

create trigger set_updated_at before update on public.comments
  for each row execute procedure public.handle_updated_at();

create trigger set_updated_at before update on public.events
  for each row execute procedure public.handle_updated_at();

create trigger set_updated_at before update on public.connections
  for each row execute procedure public.handle_updated_at();

create trigger set_updated_at before update on public.conversations
  for each row execute procedure public.handle_updated_at();

create trigger set_updated_at before update on public.marketplace_offers
  for each row execute procedure public.handle_updated_at();

-- Indexes for better performance
create index if not exists profiles_email_idx on public.profiles(email);
create index if not exists posts_user_id_idx on public.posts(user_id);
create index if not exists posts_created_at_idx on public.posts(created_at desc);
create index if not exists likes_post_id_idx on public.likes(post_id);
create index if not exists likes_user_id_idx on public.likes(user_id);
create index if not exists post_votes_post_id_idx on public.post_votes(post_id);
create index if not exists post_votes_user_id_idx on public.post_votes(user_id);
create index if not exists comments_post_id_idx on public.comments(post_id);
create index if not exists listing_inquiries_post_id_idx on public.listing_inquiries(post_id);
create index if not exists listing_inquiries_buyer_id_idx on public.listing_inquiries(buyer_id);
-- Only one *active* pending offer per buyer per listing (see the
-- marketplace_offers table comment above for why this is partial, not a
-- hard unique constraint).
create unique index if not exists marketplace_offers_active_buyer_idx
  on public.marketplace_offers (post_id, buyer_id) where (status = 'pending');
create index if not exists marketplace_offers_post_id_idx on public.marketplace_offers(post_id);
create index if not exists marketplace_offers_buyer_id_idx on public.marketplace_offers(buyer_id);
create index if not exists marketplace_offers_status_idx on public.marketplace_offers(status);
create index if not exists marketplace_deal_confirmations_post_id_idx on public.marketplace_deal_confirmations(post_id);
create index if not exists study_join_requests_post_id_idx on public.study_join_requests(post_id);
create index if not exists study_join_requests_requester_id_idx on public.study_join_requests(requester_id);
create index if not exists post_tagged_users_post_id_idx on public.post_tagged_users(post_id);
create index if not exists post_tagged_users_user_id_idx on public.post_tagged_users(user_id);
create index if not exists posts_tagged_event_id_idx on public.posts(tagged_event_id);
create index if not exists events_date_idx on public.events(date);
create index if not exists event_rsvps_event_id_idx on public.event_rsvps(event_id);
create index if not exists connections_user_id_idx on public.connections(user_id);
create index if not exists connections_connected_user_id_idx on public.connections(connected_user_id);
create index if not exists messages_conversation_id_idx on public.messages(conversation_id);
create index if not exists messages_created_at_idx on public.messages(created_at desc);
create index if not exists notifications_recipient_created_idx on public.notifications(recipient_id, created_at desc);
create index if not exists notifications_recipient_unread_idx on public.notifications(recipient_id, read);

-- Notifications and points both need one user's action to write into
-- another user's row (their inbox, or their points total). A blanket RLS
-- insert/update policy would let any client spam-write into anyone's
-- inbox/points, so both go through these two small security definer RPCs.
create or replace function public.create_notification(
  p_recipient_id uuid,
  p_actor_id uuid,
  p_type text,
  p_post_id uuid default null,
  p_conversation_id uuid default null,
  p_connection_id uuid default null,
  p_offer_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_actor_id is not null and p_actor_id = p_recipient_id then
    return;
  end if;
  insert into public.notifications (recipient_id, actor_id, type, post_id, conversation_id, connection_id, offer_id)
    values (p_recipient_id, p_actor_id, p_type, p_post_id, p_conversation_id, p_connection_id, p_offer_id);
end;
$$;

grant execute on function public.create_notification(uuid, uuid, text, uuid, uuid, uuid, uuid) to authenticated;

create or replace function public.award_points(p_user_id uuid, p_amount int)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles set points = points + p_amount where id = p_user_id;
end;
$$;

grant execute on function public.award_points(uuid, int) to authenticated;

-- Approving a join request means the host records someone else (the
-- requester) as having joined, which the normal "likes are inserted by
-- their own user_id" RLS policy would reject. This function runs as the
-- table owner so the host can perform that one specific insert, but only
-- after verifying (via auth.uid()) that the caller actually owns the post.
-- Also awards the requester points for the social/community action of
-- joining a study group.
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
  perform public.award_points(p_requester_id, 2);
end;
$$;

grant execute on function public.approve_study_join(uuid, uuid) to authenticated;

-- Marketplace deal lifecycle: accepting an offer, and mutual completion
-- confirmation/cancellation, all need to write posts.listing_status /
-- dealt_with_user_id from the buyer's side too (not just the seller's), so
-- these run as security definer with an explicit auth.uid() participant
-- check, same pattern as approve_study_join() above.
create or replace function public.accept_marketplace_offer(p_offer_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_post_id uuid;
  v_buyer_id uuid;
  v_status text;
  v_listing_status text;
  v_seller_id uuid;
begin
  select mo.post_id, mo.buyer_id, mo.status, p.listing_status, p.user_id
    into v_post_id, v_buyer_id, v_status, v_listing_status, v_seller_id
    from public.marketplace_offers mo
    join public.posts p on p.id = mo.post_id
    where mo.id = p_offer_id;

  if v_seller_id is null or v_seller_id <> auth.uid() then
    raise exception 'Only the seller can accept an offer';
  end if;
  if v_status <> 'pending' or v_listing_status <> 'available' then
    raise exception 'This offer can no longer be accepted';
  end if;

  update public.marketplace_offers set status = 'accepted' where id = p_offer_id;
  update public.posts set listing_status = 'pending', dealt_with_user_id = v_buyer_id where id = v_post_id;

  perform public.create_notification(v_buyer_id, v_seller_id, 'offer_accepted', v_post_id, null, null, p_offer_id);
end;
$$;

create or replace function public.confirm_marketplace_deal(p_post_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seller_id uuid;
  v_buyer_id uuid;
  v_listing_status text;
  v_count int;
  v_other_id uuid;
begin
  select user_id, dealt_with_user_id, listing_status
    into v_seller_id, v_buyer_id, v_listing_status
    from public.posts where id = p_post_id;

  if v_listing_status <> 'pending' or auth.uid() not in (v_seller_id, v_buyer_id) then
    raise exception 'No pending deal to confirm for this listing';
  end if;

  insert into public.marketplace_deal_confirmations (post_id, user_id)
    values (p_post_id, auth.uid())
    on conflict (post_id, user_id) do nothing;

  v_other_id := case when auth.uid() = v_seller_id then v_buyer_id else v_seller_id end;
  perform public.create_notification(v_other_id, auth.uid(), 'deal_confirmed', p_post_id);

  select count(*) into v_count
    from public.marketplace_deal_confirmations
    where post_id = p_post_id and user_id in (v_seller_id, v_buyer_id);

  if v_count = 2 then
    update public.posts set listing_status = 'sold' where id = p_post_id;
    perform public.award_points(v_seller_id, 5);
    perform public.award_points(v_buyer_id, 5);
  end if;
end;
$$;

create or replace function public.cancel_marketplace_deal(p_post_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seller_id uuid;
  v_buyer_id uuid;
  v_listing_status text;
begin
  select user_id, dealt_with_user_id, listing_status
    into v_seller_id, v_buyer_id, v_listing_status
    from public.posts where id = p_post_id;

  if v_listing_status <> 'pending' or auth.uid() not in (v_seller_id, v_buyer_id) then
    raise exception 'No pending deal to cancel for this listing';
  end if;

  update public.marketplace_offers set status = 'cancelled'
    where post_id = p_post_id and buyer_id = v_buyer_id and status = 'accepted';
  delete from public.marketplace_deal_confirmations where post_id = p_post_id;
  update public.posts set listing_status = 'available', dealt_with_user_id = null where id = p_post_id;
end;
$$;

grant execute on function public.accept_marketplace_offer(uuid) to authenticated;
grant execute on function public.confirm_marketplace_deal(uuid) to authenticated;
grant execute on function public.cancel_marketplace_deal(uuid) to authenticated;

-- Returns post ids ranked by a recency-decayed engagement score ("hot" feed sort).
-- Score fades as a post ages, so a fresh unliked post still surfaces near the top,
-- while a highly-liked older post can outrank a very fresh, unengaged one.
create or replace function public.get_hot_post_ids(p_category text, p_limit int, p_offset int)
returns table(id uuid) as $$
  select p.id
  from public.posts p
  left join (select post_id, count(*) c from public.likes group by post_id) l on l.post_id = p.id
  left join (select post_id, count(*) c from public.comments group by post_id) c on c.post_id = p.id
  where p.category = p_category
  order by (coalesce(l.c, 0) * 2 + coalesce(c.c, 0) * 3 + 1)
    / power(extract(epoch from (now() - p.created_at)) / 3600 + 2, 1.5) desc
  limit p_limit offset p_offset;
$$ language sql stable;
