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
  category text check (category in ('all', 'clubs', 'events', 'study')) default 'all',
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

-- Comments table
create table if not exists public.comments (
  id uuid default uuid_generate_v4() primary key,
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
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

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;
alter table public.events enable row level security;
alter table public.event_rsvps enable row level security;
alter table public.connections enable row level security;
alter table public.messages enable row level security;
alter table public.conversations enable row level security;

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
create policy "Connections are viewable by involved users"
  on public.connections for select
  using (auth.uid() = user_id or auth.uid() = connected_user_id);

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

-- Indexes for better performance
create index if not exists profiles_email_idx on public.profiles(email);
create index if not exists posts_user_id_idx on public.posts(user_id);
create index if not exists posts_created_at_idx on public.posts(created_at desc);
create index if not exists likes_post_id_idx on public.likes(post_id);
create index if not exists likes_user_id_idx on public.likes(user_id);
create index if not exists comments_post_id_idx on public.comments(post_id);
create index if not exists events_date_idx on public.events(date);
create index if not exists event_rsvps_event_id_idx on public.event_rsvps(event_id);
create index if not exists connections_user_id_idx on public.connections(user_id);
create index if not exists connections_connected_user_id_idx on public.connections(connected_user_id);
create index if not exists messages_conversation_id_idx on public.messages(conversation_id);
create index if not exists messages_created_at_idx on public.messages(created_at desc);
