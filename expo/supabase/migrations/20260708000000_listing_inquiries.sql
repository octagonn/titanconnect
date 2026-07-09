-- Tracks which buyers have messaged a seller about a specific marketplace
-- listing, so the seller can later pick who they "dealt with" from a
-- scoped candidate list (not just anyone they've ever DMed).
create table if not exists public.listing_inquiries (
  id uuid default extensions.uuid_generate_v4() primary key,
  post_id uuid references public.posts(id) on delete cascade not null,
  buyer_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(post_id, buyer_id)
);

alter table public.listing_inquiries enable row level security;

-- Only the listing owner and the inquirer themselves can see an inquiry
-- (it reveals buyer interest/contact intent, not public like/comment data).
create policy "Inquiries are viewable by the seller or the buyer"
  on public.listing_inquiries for select
  using (
    auth.uid() = buyer_id
    or auth.uid() in (select user_id from public.posts where posts.id = post_id)
  );

create policy "Users can record their own inquiry"
  on public.listing_inquiries for insert
  with check (auth.uid() = buyer_id);

create index if not exists listing_inquiries_post_id_idx on public.listing_inquiries(post_id);
create index if not exists listing_inquiries_buyer_id_idx on public.listing_inquiries(buyer_id);

-- Marks a listing as "dealt with" a specific buyer. Nullable; non-null =
-- sold. No status enum — badge display only, no payment/transaction data.
alter table public.posts add column if not exists dealt_with_user_id uuid references public.profiles(id) on delete set null;
