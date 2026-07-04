-- Add category values + metadata columns needed for Events, Study Buddy,
-- Anonymous, and Marketplace post creation from the Discover "+" menu.
alter table public.posts drop constraint if exists posts_category_check;
alter table public.posts add constraint posts_category_check
  check (category in ('all', 'clubs', 'events', 'study', 'anon', 'market'));

alter table public.posts add column if not exists title text;
alter table public.posts add column if not exists scheduled_at timestamp with time zone;
alter table public.posts add column if not exists location text;
alter table public.posts add column if not exists course text;
alter table public.posts add column if not exists price numeric;
alter table public.posts add column if not exists condition text;
