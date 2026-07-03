-- Public RPC used by the auth flow to check whether an email already has an
-- account, so the UI can route straight to sign-in vs sign-up. Supabase's
-- own auth endpoints (signInWithPassword, resetPasswordForEmail) deliberately
-- return identical responses for existing vs nonexistent emails to prevent
-- enumeration, so there's no other client-safe way to get this signal.
-- Returns only a boolean — no other account details are exposed. User
-- explicitly opted into this tradeoff (single-email probing becomes
-- possible) in exchange for a streamlined sign-in/sign-up flow.
create or replace function public.email_is_registered(check_email text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from auth.users where lower(email) = lower(check_email)
  );
$$;

grant execute on function public.email_is_registered(text) to anon, authenticated;
