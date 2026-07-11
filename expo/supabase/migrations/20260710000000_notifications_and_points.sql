-- In-app notifications and a lightweight points/reward system.
--
-- Both features need one user's action to write into *another* user's row
-- (their notification inbox, or their points total). A blanket RLS insert
-- policy would let any client spam-write into anyone's inbox/points, so both
-- writes go through small SECURITY DEFINER RPCs, same pattern as
-- approve_study_join / the marketplace offer RPCs.

create table if not exists public.notifications (
  id uuid default extensions.uuid_generate_v4() primary key,
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

create index if not exists notifications_recipient_created_idx
  on public.notifications (recipient_id, created_at desc);
create index if not exists notifications_recipient_unread_idx
  on public.notifications (recipient_id, read);

alter table public.notifications enable row level security;

create policy "Notifications are viewable by their recipient"
  on public.notifications for select
  using (auth.uid() = recipient_id);

create policy "Recipients can mark their own notifications read"
  on public.notifications for update
  using (auth.uid() = recipient_id);

-- No insert policy: all inserts go through create_notification() below.

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

alter table public.profiles add column if not exists points integer not null default 0;

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

-- Extend approve_study_join to also award the requester points for a
-- social/community action (joining a study group).
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

-- Extend accept_marketplace_offer to notify the buyer their offer was accepted.
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

-- Extend confirm_marketplace_deal to notify the other participant on each
-- confirmation, and award both sides points once the deal is fully sold.
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
