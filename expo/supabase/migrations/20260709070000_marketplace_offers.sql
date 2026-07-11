-- Structured marketplace deal-closing: price offers, a real listing status
-- lifecycle, and mutual buyer/seller completion confirmation, replacing the
-- old "seller manually picks a name from a list" flow.

alter table public.posts add column if not exists listing_status text not null default 'available'
  check (listing_status in ('available', 'pending', 'sold'));
alter table public.posts add column if not exists payment_methods text[] default array[]::text[];

-- Backfill: listings the old boolean "dealt_with_user_id is set = sold" flow
-- already closed should read as sold under the new lifecycle too.
update public.posts set listing_status = 'sold' where dealt_with_user_id is not null;

create table if not exists public.marketplace_offers (
  id uuid default extensions.uuid_generate_v4() primary key,
  post_id uuid references public.posts(id) on delete cascade not null,
  buyer_id uuid references public.profiles(id) on delete cascade not null,
  amount numeric not null check (amount >= 0),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'withdrawn', 'cancelled')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Only one *active* pending offer per buyer per listing. A partial index
-- (rather than a hard unique constraint) lets a buyer's re-offer after a
-- decline/withdrawal insert a fresh row instead of overwriting history —
-- past offers stay queryable as an audit trail.
create unique index if not exists marketplace_offers_active_buyer_idx
  on public.marketplace_offers (post_id, buyer_id) where (status = 'pending');

create index if not exists marketplace_offers_post_id_idx on public.marketplace_offers(post_id);
create index if not exists marketplace_offers_buyer_id_idx on public.marketplace_offers(buyer_id);
create index if not exists marketplace_offers_status_idx on public.marketplace_offers(status);

create trigger set_updated_at before update on public.marketplace_offers
  for each row execute procedure public.handle_updated_at();

alter table public.marketplace_offers enable row level security;

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

-- Mutual completion confirmation. Select-only via RLS — all writes go
-- through confirm_marketplace_deal()/cancel_marketplace_deal() below, same
-- reasoning as approve_study_join(): a buyer needs to affect a posts row
-- they don't own, and a blanket RLS grant would let them touch unrelated
-- columns too, not just the deal-lifecycle ones.
create table if not exists public.marketplace_deal_confirmations (
  id uuid default extensions.uuid_generate_v4() primary key,
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(post_id, user_id)
);

create index if not exists marketplace_deal_confirmations_post_id_idx
  on public.marketplace_deal_confirmations(post_id);

alter table public.marketplace_deal_confirmations enable row level security;

create policy "Deal confirmations are viewable by the two deal participants"
  on public.marketplace_deal_confirmations for select
  using (
    auth.uid() = user_id
    or auth.uid() in (select user_id from public.posts where posts.id = post_id)
    or auth.uid() in (select dealt_with_user_id from public.posts where posts.id = post_id)
  );

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

  select count(*) into v_count
    from public.marketplace_deal_confirmations
    where post_id = p_post_id and user_id in (v_seller_id, v_buyer_id);

  if v_count = 2 then
    update public.posts set listing_status = 'sold' where id = p_post_id;
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
