-- Let any authenticated user view another student's accepted connections,
-- matching the existing profiles/likes visibility model. Needed so a
-- profile page can show "who they're connected with" — the previous
-- policy only let the two parties on a connection see it, so this query
-- silently came back empty for anyone viewing someone else's profile.
drop policy if exists "Connections are viewable by involved users" on public.connections;
create policy "Connections are viewable by authenticated users"
  on public.connections for select
  using (auth.role() = 'authenticated');
